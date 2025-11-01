/**
 * Authentication Controller
 * Handles user registration, login, logout, and token management
 */

import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import crypto from 'crypto';

/**
 * User Registration
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { message: 'User with this email already exists' }
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true
      }
    });

    // Generate access token
    const accessToken = generateAccessToken(user.id, user.email);
    
    // Create session first (temporary tokenHash, will update after generating refreshToken)
    const tempTokenHash = crypto.randomBytes(32).toString('hex');
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: tempTokenHash,
        deviceName: req.headers['user-agent']?.substring(0, 255) || null,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Generate refresh token with sessionId
    const refreshToken = generateRefreshToken(user.id, session.id);
    
    // Update session with actual token hash
    await prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex')
      }
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken // Also send in response (for mobile apps)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * User Login
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password' }
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate access token
    const accessToken = generateAccessToken(user.id, user.email);
    
    // Create session first (temporary tokenHash, will update after generating refreshToken)
    const tempTokenHash = crypto.randomBytes(32).toString('hex');
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: tempTokenHash,
        deviceName: req.headers['user-agent']?.substring(0, 255) || null,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Generate refresh token with sessionId
    const refreshToken = generateRefreshToken(user.id, session.id);
    
    // Update session with actual token hash
    await prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex')
      }
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        },
        accessToken,
        refreshToken // Also send in response (for mobile apps)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * User Logout
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Hash token and delete session
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      await prisma.session.deleteMany({
        where: { tokenHash }
      });
    }

    // Clear cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 */
export const refresh = async (req, res, next) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token required' }
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check session exists and is valid
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token' }
      });
    }

    // Update session last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() }
    });

    // Generate new access token
    const accessToken = generateAccessToken(session.user.id, session.user.email);

    res.json({
      success: true,
      data: { accessToken }
    });

  } catch (error) {
    if (error.message.includes('expired') || error.message.includes('Invalid')) {
      return res.status(401).json({
        success: false,
        error: { message: error.message }
      });
    }
    next(error);
  }
};

/**
 * Get Current User
 * GET /api/auth/me
 * Requires authentication middleware
 */
export const getMe = async (req, res, next) => {
  try {
    // User is already attached to request by authenticate middleware
    res.json({
      success: true,
      data: { user: req.user }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify Email (Placeholder - implement later)
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  res.status(501).json({
    success: false,
    error: { message: 'Email verification not implemented yet' }
  });
};

/**
 * Forgot Password (Placeholder - implement later)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  res.status(501).json({
    success: false,
    error: { message: 'Password reset not implemented yet' }
  });
};

/**
 * Reset Password (Placeholder - implement later)
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  res.status(501).json({
    success: false,
    error: { message: 'Password reset not implemented yet' }
  });
};


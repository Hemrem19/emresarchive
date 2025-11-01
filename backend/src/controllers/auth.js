/**
 * Authentication Controller
 * Handles user registration, login, logout, and token management
 */

import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { generateVerificationToken, getVerificationTokenExpiry, sendVerificationEmail } from '../lib/email.js';
import crypto from 'crypto';

/**
 * User Registration
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Input validation (already done by validation middleware, but double-check for safety)
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Email is required',
          details: [{ field: 'email', message: 'Email is required' }]
        }
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Password must be at least 8 characters long',
          details: [{ field: 'password', message: 'Password must be at least 8 characters long' }]
        }
      });
    }

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
    } catch (prismaError) {
      // Handle Prisma schema errors (missing columns, etc.)
      if (prismaError.code === 'P2022' || prismaError.meta?.column || prismaError.message?.includes('does not exist')) {
        console.error('[Auth] Database schema error:', prismaError.message);
        return res.status(503).json({
          success: false,
          error: { 
            message: 'Database configuration error. Please contact support.',
            details: []
          }
        });
      }
      throw prismaError;
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { 
          message: 'An account with this email already exists. Please log in instead.',
          details: [{ field: 'email', message: 'This email is already registered' }]
        }
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getVerificationTokenExpiry();

    // Create user - handle optional verification fields gracefully
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name: name || null,
          verificationToken,
          verificationTokenExpiry
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true
        }
      });
    } catch (prismaError) {
      // Handle Prisma schema errors (missing columns, etc.)
      if (prismaError.code === 'P2022' || prismaError.meta?.column || prismaError.message?.includes('does not exist')) {
        console.error('[Auth] Database schema error during user creation:', prismaError.message);
        
        // Try creating user without verification fields (fallback)
        try {
          user = await prisma.user.create({
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
          // Set emailVerified to false if field doesn't exist
          if (user) {
            user.emailVerified = false;
          }
        } catch (fallbackError) {
          return res.status(503).json({
            success: false,
            error: { 
              message: 'Database configuration error. Please contact support.',
              details: []
            }
          });
        }
      } else {
        throw prismaError;
      }
    }

    // Send verification email (don't wait for it to complete)
    // Only send if verification fields were successfully set
    if (verificationToken && verificationTokenExpiry) {
      sendVerificationEmail(user.email, verificationToken, user.name).catch(error => {
        console.error('[Auth] Failed to send verification email:', error);
        // Don't throw - user is created, email can be resent later
      });
    } else {
      console.warn('[Auth] Skipping verification email - verification fields not available');
    }

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
    // For cross-site cookies (different domains), use SameSite=None with Secure
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction, // Required for SameSite=None
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      partitioned: false // Explicitly set (default, but clear for compatibility)
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

    // Input validation (already done by validation middleware, but double-check for safety)
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Email is required',
          details: [{ field: 'email', message: 'Email is required' }]
        }
      });
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Password is required',
          details: [{ field: 'password', message: 'Password is required' }]
        }
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return res.status(401).json({
        success: false,
        error: { 
          message: 'Invalid email or password. Please check your credentials and try again.',
          details: [] // Don't provide field-specific errors for auth failures
        }
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Don't reveal if email exists or not (security best practice)
      return res.status(401).json({
        success: false,
        error: { 
          message: 'Invalid email or password. Please check your credentials and try again.',
          details: [] // Don't provide field-specific errors for auth failures
        }
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
    // For cross-site cookies (different domains), use SameSite=None with Secure
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction, // Required for SameSite=None
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      partitioned: false // Explicitly set (default, but clear for compatibility)
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

    if (refreshToken && typeof refreshToken === 'string' && refreshToken.trim().length > 0) {
      try {
        // Hash token and delete session
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        await prisma.session.deleteMany({
          where: { tokenHash }
        });
      } catch (sessionError) {
        // Log but don't fail logout - session might already be deleted
        console.warn('[Auth] Failed to delete session during logout:', sessionError.message);
      }
    }

    // Clear cookie (use same options as when setting)
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    // Logout should always succeed - clear cookie even on error
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax'
    });
    
    // Return success even if session deletion failed
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
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

    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
      return res.status(401).json({
        success: false,
        error: { 
          message: 'Refresh token required. Please log in again.',
          details: []
        }
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: { 
          message: tokenError.name === 'TokenExpiredError' 
            ? 'Session expired. Please log in again.'
            : 'Invalid refresh token. Please log in again.',
          details: []
        }
      });
    }

    // Check session exists and is valid
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: { 
          message: 'Session not found. Please log in again.',
          details: []
        }
      });
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({
        success: false,
        error: { 
          message: 'Session expired. Please log in again.',
          details: []
        }
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
 * Verify Email
 * POST /api/auth/verify-email
 * Body: { token: string }
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Verification token is required',
          details: [{ field: 'token', message: 'Verification token is required' }]
        }
      });
    }

    // Find user with this token
    const user = await prisma.user.findUnique({
      where: { verificationToken: token.trim() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Invalid verification token. Please check your email for the correct link or request a new verification email.',
          details: []
        }
      });
    }

    // Check if token is expired
    if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Verification token has expired. Please request a new verification email.',
          details: []
        }
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified'
      });
    }

    // Verify email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      }
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Resend Verification Email
 * POST /api/auth/resend-verification
 * Requires authentication
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    // User is already attached to request by authenticate middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { 
          message: 'Authentication required. Please log in to resend verification email.',
          details: []
        }
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Email is already verified',
          details: []
        }
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = getVerificationTokenExpiry();

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry
      }
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, user.name);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    next(error);
  }
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


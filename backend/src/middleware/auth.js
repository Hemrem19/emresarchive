/**
 * Authentication Middleware
 * Verifies JWT access tokens
 */

import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export const authenticate = async (req, res, next) => {
  try {
    console.log('[Auth] Request received:', {
      method: req.method,
      path: req.path,
      hasAuthHeader: !!req.headers.authorization
    });
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Auth] Missing or invalid authorization header');
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Attach user to request
    req.user = user;
    console.log('[Auth] Authentication successful for user:', user.id);
    next();

  } catch (error) {
    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired' }
      });
    }

    if (error.message.includes('Invalid')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token' }
      });
    }

    next(error);
  }
};


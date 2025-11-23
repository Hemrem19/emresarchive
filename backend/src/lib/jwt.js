/**
 * JWT Token Utilities
 * Generate and verify JWT tokens
 */

import jwt from 'jsonwebtoken';

/**
 * Generate access token (short-lived)
 */
export const generateAccessToken = (userId, email) => {
  if (!process.env.JWT_ACCESS_SECRET) console.error('❌ JWT_ACCESS_SECRET is missing!');
  return jwt.sign(
    {
      userId,
      email,
      type: 'access'
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
    }
  );
};

/**
 * Generate refresh token (long-lived)
 */
export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign(
    {
      userId,
      sessionId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  try {
    if (!process.env.JWT_ACCESS_SECRET) console.error('❌ JWT_ACCESS_SECRET is missing during verify!');
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};


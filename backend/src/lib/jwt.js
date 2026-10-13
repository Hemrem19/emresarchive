/**
 * JWT Token Utilities
 * Generate and verify JWT tokens
 */

import jwt from 'jsonwebtoken';

/**
 * Generate access token (short-lived). `sid` names the login it belongs to,
 * so ending that login rejects the token at once instead of at expiry.
 */
export const generateAccessToken = (userId, email, env, sessionId) => {
  if (!env.JWT_ACCESS_SECRET) console.error('❌ JWT_ACCESS_SECRET is missing!');
  return jwt.sign(
    {
      userId,
      email,
      ...(sessionId ? { sid: sessionId } : {}),
      type: 'access'
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN || '15m'
    }
  );
};

/**
 * Generate refresh token (long-lived)
 */
export const generateRefreshToken = (userId, sessionId, env) => {
  return jwt.sign(
    {
      userId,
      sessionId,
      type: 'refresh'
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token, env) => {
  try {
    if (!env?.JWT_ACCESS_SECRET) console.error('❌ JWT_ACCESS_SECRET is missing during verify!');
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
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
export const verifyRefreshToken = (token, env) => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
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


/**
 * Short-lived token that lets a plain link download one paper's PDF.
 * Signed with the access secret, so every verifier must check `type`.
 */
export const generateFileToken = (userId, paperId, env) =>
  jwt.sign({ userId, paperId, type: 'file' }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });

/** Returns { userId, paperId } for a valid file token, otherwise null. */
export const verifyFileToken = (token, env) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    return decoded.type === 'file' ? { userId: decoded.userId, paperId: decoded.paperId } : null;
  } catch {
    return null;
  }
};

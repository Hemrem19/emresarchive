/**
 * Password Utilities
 * Hash and verify passwords using bcryptjs
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a password
 */
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verify a password against a hash
 */
export const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};



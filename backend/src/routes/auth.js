/**
 * Authentication Routes
 * Handles user registration, login, logout, and token refresh
 */

import express from 'express';
import { register, login, logout, refresh, verifyEmail, forgotPassword, resetPassword, getMe } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema } from '../lib/validation.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;


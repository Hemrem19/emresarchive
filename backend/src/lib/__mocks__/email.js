import { vi } from 'vitest';

export const generateVerificationToken = vi.fn();
export const getVerificationTokenExpiry = vi.fn();
export const sendVerificationEmail = vi.fn().mockResolvedValue(true);

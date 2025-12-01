/**
 * Unit Tests for Password Utilities
 */

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';

describe('Password Utilities', () => {
    const testPassword = 'TestPassword123!';
    const wrongPassword = 'WrongPassword456!';

    describe('hashPassword', () => {
        it('should hash a password', async () => {
            const hash = await hashPassword(testPassword);

            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
            expect(hash).not.toBe(testPassword);
        });

        it('should generate different hashes for the same password', async () => {
            const hash1 = await hashPassword(testPassword);
            const hash2 = await hashPassword(testPassword);

            // Bcrypt generates a unique salt each time, so hashes should be different
            expect(hash1).not.toBe(hash2);
        });

        it('should generate hash starting with $2b$ (bcrypt identifier)', async () => {
            const hash = await hashPassword(testPassword);

            expect(hash.startsWith('$2b$')).toBe(true);
        });

        it('should handle empty password', async () => {
            const hash = await hashPassword('');

            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
        });

        it('should handle very long passwords', async () => {
            const longPassword = 'a'.repeat(200);
            const hash = await hashPassword(longPassword);

            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
        });

        it('should handle special characters', async () => {
            const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            const hash = await hashPassword(specialPassword);

            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
        });
    });

    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const hash = await hashPassword(testPassword);
            const isValid = await verifyPassword(testPassword, hash);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const hash = await hashPassword(testPassword);
            const isValid = await verifyPassword(wrongPassword, hash);

            expect(isValid).toBe(false);
        });

        it('should reject empty password when hash is not empty', async () => {
            const hash = await hashPassword(testPassword);
            const isValid = await verifyPassword('', hash);

            expect(isValid).toBe(false);
        });

        it('should be case-sensitive', async () => {
            const hash = await hashPassword('Password123');
            const isValid = await verifyPassword('password123', hash);

            expect(isValid).toBe(false);
        });

        it('should handle whitespace correctly', async () => {
            const passwordWithSpace = '  Password123  ';
            const hash = await hashPassword(passwordWithSpace);

            // Exact match should work
            const isValid1 = await verifyPassword(passwordWithSpace, hash);
            expect(isValid1).toBe(true);

            // Trimmed version should not work
            const isValid2 = await verifyPassword('Password123', hash);
            expect(isValid2).toBe(false);
        });

        it('should reject completely different password', async () => {
            const hash = await hashPassword(testPassword);
            const isValid = await verifyPassword('CompletelyDifferent', hash);

            expect(isValid).toBe(false);
        });

        it('should handle unicode characters', async () => {
            const unicodePassword = '密码123!@#';
            const hash = await hashPassword(unicodePassword);
            const isValid = await verifyPassword(unicodePassword, hash);

            expect(isValid).toBe(true);
        });

        it('should reject if password is slightly different', async () => {
            const hash = await hashPassword('Password123');
            const isValid = await verifyPassword('Password124', hash); // Last char different

            expect(isValid).toBe(false);
        });
    });

    describe('Integration tests', () => {
        it('should work correctly for multiple passwords', async () => {
            const passwords = [
                'Password1!',
                'Password2@',
                'Password3#',
                'Password4$',
                'Password5%'
            ];

            for (const password of passwords) {
                const hash = await hashPassword(password);
                const isValid = await verifyPassword(password, hash);
                expect(isValid).toBe(true);

                // Verify other passwords don't match
                for (const otherPassword of passwords) {
                    if (otherPassword !== password) {
                        const isOtherValid = await verifyPassword(otherPassword, hash);
                        expect(isOtherValid).toBe(false);
                    }
                }
            }
        });
    });
});

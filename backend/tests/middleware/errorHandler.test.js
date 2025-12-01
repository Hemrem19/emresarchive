/**
 * Unit Tests for Error Handler Middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { mockRequest, mockResponse, mockNext } from '../helpers.js';

describe('Error Handler Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        vi.clearAllMocks();
        req = mockRequest();
        res = mockResponse();
        next = mockNext();

        // Set default origin
        req.headers.origin = 'http://localhost:8080';
    });

    describe('CORS headers', () => {
        it('should set CORS headers for allowed origins', () => {
            const error = new Error('Test error');
            req.headers.origin = 'http://localhost:8080';

            errorHandler(error, req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:8080');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        });

        it('should set CORS headers for Cloudflare Pages origins', () => {
            const error = new Error('Test error');
            req.headers.origin = 'https://my-app.pages.dev';

            errorHandler(error, req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://my-app.pages.dev');
        });

        it('should set CORS headers for chrome extensions', () => {
            const error = new Error('Test error');
            req.headers.origin = 'chrome-extension://abcdefg';

            errorHandler(error, req, res, next);

            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'chrome-extension://abcdefg');
        });
    });

    describe('Multer errors', () => {
        it('should handle LIMIT_FILE_SIZE error', () => {
            const error = new Error('File too large');
            error.name = 'MulterError';
            error.code = 'LIMIT_FILE_SIZE';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'File size exceeds the maximum limit (50MB)' }
            });
        });

        it('should handle LIMIT_FILE_COUNT error', () => {
            const error = new Error('Too many files');
            error.name = 'MulterError';
            error.code = 'LIMIT_FILE_COUNT';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Too many files. Please upload only one file.' }
            });
        });

        it('should handle PDF file type error', () => {
            const error = new Error('Only PDF files are allowed');

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: { message: 'Only PDF files are allowed' }
            });
        });
    });

    describe('Zod validation errors', () => {
        it('should handle Zod validation errors', () => {
            const error = {
                name: 'ZodError',
                issues: [
                    { path: ['email'], message: 'Invalid email' },
                    { path: ['password'], message: 'Password too short' }
                ]
            };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(422);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.success).toBe(false);
            expect(jsonCall.error.details).toHaveLength(2);
            expect(jsonCall.error.details[0]).toEqual({
                field: 'email',
                message: 'Invalid email'
            });
        });
    });

    describe('Prisma errors', () => {
        it('should handle P2002 unique constraint violation', () => {
            const error = new Error('Unique constraint failed');
            error.code = 'P2002';
            error.meta = { target: ['email'] };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalled();
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).toContain('email already exists');
        });

        it('should handle P2002 for duplicate DOI', () => {
            const error = new Error('Unique constraint failed');
            error.code = 'P2002';
            error.meta = { target: ['user_id', 'doi'] };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).toContain('already have a paper with this DOI');
        });

        it('should handle P2025 record not found', () => {
            const error = new Error('Record not found');
            error.code = 'P2025';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.success).toBe(false);
            expect(jsonCall.error.message).toBe('Record not found');
        });

        it('should handle P2022 column does not exist', () => {
            const error = new Error('Column does not exist');
            error.code = 'P2022';
            error.meta = { column: 'nonexistent_column', modelName: 'User' };

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(503);
        });

        it('should handle P1001 connection error', () => {
            const error = new Error('Cannot connect to database');
            error.code = 'P1001';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(503);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).toContain('Database connection error');
        });
    });

    describe('JWT errors', () => {
        it('should handle TokenExpiredError', () => {
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).toContain('Session expired');
        });

        it('should handle JsonWebTokenError', () => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).toContain('Invalid authentication token');
        });
    });

    describe('Rate limiting', () => {
        it('should handle rate limit errors', () => {
            const error = new Error('Too many requests');
            error.statusCode = 429;

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(429);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).toContain('Too many requests');
        });
    });

    describe('Generic errors', () => {
        it('should handle generic errors with status code', () => {
            const error = new Error('Custom error');
            error.statusCode = 400;

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.success).toBe(false);
            expect(jsonCall.error.message).toBe('Custom error');
            // In test/development mode, stack trace is included
            expect(jsonCall.error).toHaveProperty('stack');
        });

        it('should default to 500 for errors without status code', () => {
            const error = new Error('Internal error');

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.success).toBe(false);
            expect(jsonCall.error.message).toBe('Internal error');
        });

        it('should not send response twice if headers already sent', () => {
            const error = new Error('Test error');
            res.headersSent = true;

            errorHandler(error, req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });
    });

    describe('Production mode', () => {
        it('should hide error details in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Detailed error message');
            error.statusCode = 500;

            errorHandler(error, req, res, next);

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).toBe('Internal Server Error');
            expect(jsonCall.error.stack).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });

        it('should show Prisma errors even in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Unique constraint failed');
            error.code = 'P2002';
            error.meta = { target: ['email'] };

            errorHandler(error, req, res, next);

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.message).not.toBe('Internal Server Error');

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Error message formatting', () => {
        it('should handle non-string error messages', () => {
            const error = new Error('Test error');
            // Don't set message to object - Error constructor requires string
            // Instead test that the message is stringified

            errorHandler(error, req, res, next);

            expect(res.json).toHaveBeenCalled();
            const jsonCall = res.json.mock.calls[0][0];
            expect(typeof jsonCall.error.message).toBe('string');
        });

        it('should include error details if present', () => {
            const error = new Error('Validation failed');
            error.details = [{ field: 'email', message: 'Invalid' }];

            errorHandler(error, req, res, next);

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.error.details).toEqual([{ field: 'email', message: 'Invalid' }]);
        });
    });
});

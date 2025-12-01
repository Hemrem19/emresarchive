/**
 * Unit Tests for Validation Schemas
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
    registerSchema,
    loginSchema,
    refreshSchema,
    verifyEmailSchema,
    paperSchema,
    paperUpdateSchema,
    collectionSchema,
    collectionUpdateSchema,
    annotationSchema,
    annotationUpdateSchema,
    incrementalSyncSchema,
    validate
} from '../../src/lib/validation.js';
import { mockRequest, mockResponse, mockNext } from '../helpers.js';

describe('Validation Schemas', () => {
    describe('registerSchema', () => {
        it('should validate correct registration data', () => {
            const validData = {
                email: 'test@example.com',
                password: 'Password123!',
                name: 'Test User'
            };

            const result = registerSchema.parse(validData);
            expect(result).toEqual({
                email: 'test@example.com', // Should be lowercased
                password: 'Password123!',
                name: 'Test User'
            });
        });

        it('should lowercase and trim email', () => {
            const data = {
                email: 'TEST@EXAMPLE.COM',
                password: 'Password123!',
                name: 'Test'
            };

            const result = registerSchema.parse(data);
            expect(result.email).toBe('test@example.com');
        });

        it('should reject invalid email', () => {
            const invalidData = {
                email: 'not-an-email',
                password: 'Password123!',
                name: 'Test'
            };

            expect(() => registerSchema.parse(invalidData)).toThrow();
        });

        it('should reject password shorter than 8 characters', () => {
            const invalidData = {
                email: 'test@example.com',
                password: 'Pass1',
                name: 'Test'
            };

            expect(() => registerSchema.parse(invalidData)).toThrow();
        });

        it('should reject password without letters', () => {
            const invalidData = {
                email: 'test@example.com',
                password: '12345678',
                name: 'Test'
            };

            expect(() => registerSchema.parse(invalidData)).toThrow();
        });

        it('should reject password without numbers', () => {
            const invalidData = {
                email: 'test@example.com',
                password: 'Password',
                name: 'Test'
            };

            expect(() => registerSchema.parse(invalidData)).toThrow();
        });

        it('should allow registration without name (optional)', () => {
            const validData = {
                email: 'test@example.com',
                password: 'Password123!'
            };

            const result = registerSchema.parse(validData);
            expect(result.name).toBeUndefined();
        });
    });

    describe('loginSchema', () => {
        it('should validate correct login data', () => {
            const validData = {
                email: 'test@example.com',
                password: 'Password123!'
            };

            const result = loginSchema.parse(validData);
            expect(result.email).toBe('test@example.com');
            expect(result.password).toBe('Password123!');
        });

        it('should reject missing email', () => {
            const invalidData = {
                password: 'Password123!'
            };

            expect(() => loginSchema.parse(invalidData)).toThrow();
        });

        it('should reject missing password', () => {
            const invalidData = {
                email: 'test@example.com'
            };

            expect(() => loginSchema.parse(invalidData)).toThrow();
        });
    });

    describe('paperSchema', () => {
        it('should validate correct paper data', () => {
            const validData = {
                title: 'Test Paper',
                authors: ['Author 1', 'Author 2'],
                year: 2024,
                journal: 'Test Journal',
                doi: '10.1234/test',
                abstract: 'Test abstract',
                tags: ['tag1', 'tag2'],
                status: 'To Read',
                notes: 'Test notes'
            };

            const result = paperSchema.parse(validData);
            expect(result.title).toBe('Test Paper');
            expect(result.authors).toEqual(['Author 1', 'Author 2']);
        });

        it('should require title', () => {
            const invalidData = {
                authors: ['Author 1']
            };

            expect(() => paperSchema.parse(invalidData)).toThrow();
        });

        it('should default authors to empty array', () => {
            const data = {
                title: 'Test Paper'
            };

            const result = paperSchema.parse(data);
            expect(result.authors).toEqual([]);
        });

        it('should default tags to empty array', () => {
            const data = {
                title: 'Test Paper'
            };

            const result = paperSchema.parse(data);
            expect(result.tags).toEqual([]);
        });

        it('should default status to "To Read"', () => {
            const data = {
                title: 'Test Paper'
            };

            const result = paperSchema.parse(data);
            expect(result.status).toBe('To Read');
        });

        it('should validate year range', () => {
            const invalidData1 = {
                title: 'Test Paper',
                year: 1800 // Too old
            };

            expect(() => paperSchema.parse(invalidData1)).toThrow();

            const invalidData2 = {
                title: 'Test Paper',
                year: 2200 // Too far in future
            };

            expect(() => paperSchema.parse(invalidData2)).toThrow();
        });

        it('should validate rating range', () => {
            const invalidData1 = {
                title: 'Test Paper',
                rating: 0 // Below min
            };

            expect(() => paperSchema.parse(invalidData1)).toThrow();

            const invalidData2 = {
                title: 'Test Paper',
                rating: 11 // Above max
            };

            expect(() => paperSchema.parse(invalidData2)).toThrow();
        });

        it('should accept nullable optional fields', () => {
            const data = {
                title: 'Test Paper',
                journal: null,
                doi: null,
                abstract: null,
                year: null,
                summary: null,
                rating: null
            };

            const result = paperSchema.parse(data);
            expect(result.journal).toBeNull();
            expect(result.doi).toBeNull();
        });
    });

    describe('collectionSchema', () => {
        it('should validate correct collection data', () => {
            const validData = {
                name: 'My Collection',
                icon: 'folder',
                color: 'blue',
                filters: {
                    status: 'Reading',
                    tags: ['ai', 'ml'],
                    searchTerm: 'test'
                }
            };

            const result = collectionSchema.parse(validData);
            expect(result.name).toBe('My Collection');
            expect(result.filters.tags).toEqual(['ai', 'ml']);
        });

        it('should require collection name', () => {
            const invalidData = {
                icon: 'folder'
            };

            expect(() => collectionSchema.parse(invalidData)).toThrow();
        });

        it('should default icon to "folder"', () => {
            const data = {
                name: 'Test Collection'
            };

            const result = collectionSchema.parse(data);
            expect(result.icon).toBe('folder');
        });

        it('should default color to "text-primary"', () => {
            const data = {
                name: 'Test Collection'
            };

            const result = collectionSchema.parse(data);
            expect(result.color).toBe('text-primary');
        });

        it('should reject name longer than 255 characters', () => {
            const invalidData = {
                name: 'a'.repeat(256)
            };

            expect(() => collectionSchema.parse(invalidData)).toThrow();
        });
    });

    describe('annotationSchema', () => {
        it('should validate correct annotation data', () => {
            const validData = {
                type: 'highlight',
                pageNumber: 1,
                position: { x: 100, y: 200, width: 300, height: 50 },
                content: 'Test content',
                color: '#ffff00'
            };

            const result = annotationSchema.parse(validData);
            expect(result.type).toBe('highlight');
            expect(result.pageNumber).toBe(1);
        });

        it('should only accept valid annotation types', () => {
            const validTypes = ['highlight', 'note', 'bookmark'];

            validTypes.forEach(type => {
                const data = { type };
                const result = annotationSchema.parse(data);
                expect(result.type).toBe(type);
            });

            const invalidData = {
                type: 'invalid-type'
            };

            expect(() => annotationSchema.parse(invalidData)).toThrow();
        });

        it('should validate pageNumber is positive', () => {
            const invalidData = {
                type: 'highlight',
                pageNumber: 0
            };

            expect(() => annotationSchema.parse(invalidData)).toThrow();
        });

        it('should accept nullable optional fields', () => {
            const data = {
                type: 'note',
                pageNumber: null,
                position: null,
                content: null,
                color: null
            };

            const result = annotationSchema.parse(data);
            expect(result.pageNumber).toBeNull();
        });
    });

    describe('validate middleware factory', () => {
        it('should pass validation for valid data', () => {
            const middleware = validate(loginSchema);
            const req = mockRequest({
                body: {
                    email: 'test@example.com',
                    password: 'Password123!'
                }
            });
            const res = mockResponse();
            const next = mockNext();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return 422 for validation errors', () => {
            const middleware = validate(loginSchema);
            const req = mockRequest({
                body: {
                    email: 'invalid-email', // Invalid format
                    password: 'Password123!'
                }
            });
            const res = mockResponse();
            const next = mockNext();

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(422);
            expect(res.json).toHaveBeenCalled();

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.success).toBe(false);
            expect(jsonCall.error).toBeDefined();
            expect(jsonCall.error.details).toBeDefined();
            expect(Array.isArray(jsonCall.error.details)).toBe(true);
        });

        it('should include field names in validation errors', () => {
            const middleware = validate(registerSchema);
            const req = mockRequest({
                body: {
                    email: 'test@example.com',
                    password: '123' // Too short
                }
            });
            const res = mockResponse();
            const next = mockNext();

            middleware(req, res, next);

            const jsonCall = res.json.mock.calls[0][0];
            const passwordError = jsonCall.error.details.find(d => d.field === 'password');
            expect(passwordError).toBeDefined();
        });

        it('should pass non-Zod errors to next middleware', () => {
            const schema = {
                parse: () => {
                    throw new Error('Some other error');
                }
            };

            const middleware = validate(schema);
            const req = mockRequest({ body: {} });
            const res = mockResponse();
            const next = mockNext();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledOnce();
            expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
        });
    });
});

/**
 * Tests for api/utils.js - API Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    isRateLimited,
    setRateLimit,
    clearRateLimit,
    getRateLimitRemainingTime,
    parseJsonResponse,
    withRateLimitCheck,
    createApiError
} from '../api/utils.js';

describe('api/utils.js - Rate Limiting', () => {
    beforeEach(() => {
        clearRateLimit();
    });

    describe('isRateLimited', () => {
        it('should return false when not rate limited', () => {
            expect(isRateLimited()).toBe(false);
        });

        it('should return true when rate limited', () => {
            setRateLimit();
            expect(isRateLimited()).toBe(true);
        });

        it('should return false when rate limit expires', async () => {
            setRateLimit(0.1); // 100ms
            expect(isRateLimited()).toBe(true);
            
            // Wait for rate limit to expire
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(isRateLimited()).toBe(false);
        });
    });

    describe('setRateLimit', () => {
        it('should set rate limit state', () => {
            setRateLimit();
            expect(isRateLimited()).toBe(true);
        });

        it('should use retry-after header value when provided', async () => {
            setRateLimit(2); // 2 seconds
            expect(isRateLimited()).toBe(true);
            
            // Should still be rate limited after 1 second
            await new Promise(resolve => setTimeout(resolve, 1100));
            expect(isRateLimited()).toBe(true);
            
            // Should be cleared after 2 seconds
            await new Promise(resolve => setTimeout(resolve, 1000));
            expect(isRateLimited()).toBe(false);
        });

        it('should increment consecutive failures', () => {
            setRateLimit();
            expect(isRateLimited()).toBe(true);
            
            clearRateLimit();
            setRateLimit();
            // Should still work after clearing
            expect(isRateLimited()).toBe(true);
        });
    });

    describe('clearRateLimit', () => {
        it('should clear rate limit state', () => {
            setRateLimit();
            expect(isRateLimited()).toBe(true);
            
            clearRateLimit();
            expect(isRateLimited()).toBe(false);
        });
    });

    describe('getRateLimitRemainingTime', () => {
        it('should return 0 when not rate limited', () => {
            expect(getRateLimitRemainingTime()).toBe(0);
        });

        it('should return remaining time when rate limited', () => {
            setRateLimit(1); // 1 second
            const remaining = getRateLimitRemainingTime();
            expect(remaining).toBeGreaterThan(0);
            expect(remaining).toBeLessThanOrEqual(1100); // Allow some margin
        });
    });
});

describe('api/utils.js - parseJsonResponse', () => {
    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();
        // Clear any event listeners
        vi.clearAllMocks();
    });

    it('should parse successful JSON response', async () => {
        const mockData = { success: true, data: { id: 1 } };
        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue(mockData)
        };

        const result = await parseJsonResponse(mockResponse);
        expect(result).toEqual(mockData);
        expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle rate limiting (429)', async () => {
        const mockResponse = {
            ok: false,
            status: 429,
            headers: {
                get: vi.fn((header) => {
                    if (header === 'retry-after') return '5';
                    return null;
                })
            },
            text: vi.fn().mockResolvedValue('Too many requests')
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Rate Limited');
        expect(isRateLimited()).toBe(true);
    });

    it('should handle rate limiting without retry-after header', async () => {
        const mockResponse = {
            ok: false,
            status: 429,
            headers: {
                get: vi.fn(() => null)
            },
            text: vi.fn().mockResolvedValue('Rate limited')
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Rate Limited');
        expect(isRateLimited()).toBe(true);
    });

    it('should handle session expiration (401)', async () => {
        const mockResponse = {
            ok: false,
            status: 401,
            headers: {
                get: vi.fn(() => null)
            }
        };

        // Mock localStorage
        const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Session expired');
        expect(removeItemSpy).toHaveBeenCalledWith('accessToken');
        expect(dispatchEventSpy).toHaveBeenCalled();
    });

    it('should handle non-JSON error responses', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
                get: vi.fn((header) => {
                    if (header === 'content-type') return 'text/html';
                    return null;
                })
            },
            text: vi.fn().mockResolvedValue('Server error')
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Server error');
    });

    it('should handle JSON error responses', async () => {
        const mockResponse = {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            headers: {
                get: vi.fn((header) => {
                    if (header === 'content-type') return 'application/json';
                    return null;
                })
            },
            json: vi.fn().mockResolvedValue({ message: 'Validation error' })
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Validation error');
    });

    it('should handle error responses with error object', async () => {
        const mockResponse = {
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            headers: {
                get: vi.fn((header) => {
                    if (header === 'content-type') return 'application/json';
                    return null;
                })
            },
            json: vi.fn().mockResolvedValue({ error: { message: 'Error message' } })
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Error message');
    });

    it('should handle long error text (truncate)', async () => {
        const longText = 'a'.repeat(600); // Longer than 500 chars
        const mockResponse = {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: {
                get: vi.fn((header) => {
                    if (header === 'content-type') return 'text/plain';
                    return null;
                })
            },
            text: vi.fn().mockResolvedValue(longText)
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Server error (500)');
    });

    it('should handle JSON parsing errors', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Invalid JSON response from server');
    });

    it('should handle response text parsing errors in rate limit', async () => {
        const mockResponse = {
            ok: false,
            status: 429,
            headers: {
                get: vi.fn(() => null)
            },
            text: vi.fn().mockRejectedValue(new Error('Parse error'))
        };

        await expect(parseJsonResponse(mockResponse)).rejects.toThrow('Rate Limited');
    });
});

describe('api/utils.js - withRateLimitCheck', () => {
    beforeEach(() => {
        clearRateLimit();
    });

    it('should execute API function when not rate limited', async () => {
        const apiFunc = vi.fn().mockResolvedValue({ success: true });
        const result = await withRateLimitCheck(apiFunc);
        
        expect(result).toEqual({ success: true });
        expect(apiFunc).toHaveBeenCalled();
    });

    it('should throw error when rate limited', async () => {
        setRateLimit(1);
        
        const apiFunc = vi.fn();
        await expect(withRateLimitCheck(apiFunc)).rejects.toThrow('Rate limited');
        expect(apiFunc).not.toHaveBeenCalled();
    });

    it('should clear rate limit on successful API call', async () => {
        // Set rate limit with a very short duration to ensure it's cleared
        setRateLimit(0.01); // 10ms
        // Wait for rate limit to expire first
        await new Promise(resolve => setTimeout(resolve, 20));
        
        const apiFunc = vi.fn().mockResolvedValue({ success: true });
        await withRateLimitCheck(apiFunc);
        
        // Rate limit should be cleared after successful call
        expect(isRateLimited()).toBe(false);
    });

    it('should not clear rate limit on rate limit error', async () => {
        const apiFunc = vi.fn().mockRejectedValue(new Error('Rate Limited: Too many requests'));
        
        await expect(withRateLimitCheck(apiFunc)).rejects.toThrow('Rate Limited');
    });

    it('should re-throw non-rate-limit errors', async () => {
        const apiFunc = vi.fn().mockRejectedValue(new Error('Network error'));
        
        await expect(withRateLimitCheck(apiFunc)).rejects.toThrow('Network error');
    });
});

describe('api/utils.js - createApiError', () => {
    it('should create error with message', () => {
        const error = createApiError('Test error');
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
    });

    it('should create error with status code', () => {
        const error = createApiError('Test error', 400);
        expect(error.status).toBe(400);
    });

    it('should create error with details', () => {
        const details = { field: 'title', reason: 'required' };
        const error = createApiError('Test error', 400, details);
        expect(error.details).toEqual(details);
    });

    it('should create error with all properties', () => {
        const details = { field: 'title' };
        const error = createApiError('Test error', 400, details);
        expect(error.message).toBe('Test error');
        expect(error.status).toBe(400);
        expect(error.details).toEqual(details);
    });
});


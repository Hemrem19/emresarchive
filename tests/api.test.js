/**
 * Tests for api.js - DOI Metadata Fetching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchDoiMetadata, normalizePaperIdentifier } from '../api.js';

describe('api.js - URL Normalization', () => {
    describe('normalizePaperIdentifier', () => {
        it('should extract DOI from plain DOI string', () => {
            const result = normalizePaperIdentifier('10.1234/example');
            expect(result.type).toBe('doi');
            expect(result.value).toBe('10.1234/example');
        });

        it('should extract DOI from doi.org URLs', () => {
            expect(normalizePaperIdentifier('https://doi.org/10.1234/example')).toEqual({
                type: 'doi',
                value: '10.1234/example',
                original: 'https://doi.org/10.1234/example'
            });
            expect(normalizePaperIdentifier('http://doi.org/10.1234/example')).toEqual({
                type: 'doi',
                value: '10.1234/example',
                original: 'http://doi.org/10.1234/example'
            });
            expect(normalizePaperIdentifier('https://dx.doi.org/10.1234/example')).toEqual({
                type: 'doi',
                value: '10.1234/example',
                original: 'https://dx.doi.org/10.1234/example'
            });
        });

        it('should extract DOI from publisher URLs', () => {
            const result = normalizePaperIdentifier('https://publisher.com/article/doi/10.1234/example');
            expect(result.type).toBe('doi');
            expect(result.value).toBe('10.1234/example');
        });

        it('should detect arXiv URLs but return unsupported type', () => {
            const result = normalizePaperIdentifier('https://arxiv.org/abs/1234.5678');
            expect(result.type).toBe('arxiv');
            expect(result.value).toBe('1234.5678');
            expect(result.error).toContain('arXiv');
        });

        it('should handle arXiv URLs with version numbers', () => {
            const result = normalizePaperIdentifier('https://arxiv.org/pdf/1234.5678v1.pdf');
            expect(result.type).toBe('arxiv');
            expect(result.value).toBe('1234.5678v1');
        });

        it('should reject unsupported URL formats', () => {
            const result = normalizePaperIdentifier('https://example.com/paper');
            expect(result.type).toBe('unsupported');
            expect(result.error).toBeDefined();
        });

        it('should handle empty or invalid input', () => {
            expect(normalizePaperIdentifier('')).toEqual({
                type: 'unsupported',
                value: null,
                original: '',
                error: expect.stringContaining('empty')
            });
            expect(normalizePaperIdentifier('   ')).toEqual({
                type: 'unsupported',
                value: null,
                original: '   ',
                error: expect.stringContaining('empty')
            });
            expect(normalizePaperIdentifier(null)).toEqual({
                type: 'unsupported',
                value: null,
                original: null,
                error: expect.stringContaining('string')
            });
        });

        it('should trim whitespace from input', () => {
            const result = normalizePaperIdentifier('  10.1234/example  ');
            expect(result.type).toBe('doi');
            expect(result.value).toBe('10.1234/example');
        });
    });
});

describe('api.js - DOI Metadata Fetching', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    describe('DOI Validation', () => {
        it('should throw error for null/undefined DOI', async () => {
            await expect(fetchDoiMetadata(null)).rejects.toThrow('Input must be a non-empty string');
            await expect(fetchDoiMetadata(undefined)).rejects.toThrow('Input must be a non-empty string');
        });

        it('should throw error for non-string DOI', async () => {
            await expect(fetchDoiMetadata(12345)).rejects.toThrow('Input must be a non-empty string');
            await expect(fetchDoiMetadata({})).rejects.toThrow('Input must be a non-empty string');
        });

        it('should throw error for empty DOI', async () => {
            // Empty string fails the non-empty string check first
            await expect(fetchDoiMetadata('')).rejects.toThrow(/Input (must be a non-empty string|cannot be empty)/);
            await expect(fetchDoiMetadata('   ')).rejects.toThrow(/Input (must be a non-empty string|cannot be empty)/);
        });

        it('should throw error for invalid DOI format', async () => {
            await expect(fetchDoiMetadata('not-a-doi')).rejects.toThrow('Could not detect a DOI');
            await expect(fetchDoiMetadata('10.abc/test')).rejects.toThrow('Could not detect a DOI');
            await expect(fetchDoiMetadata('invalid')).rejects.toThrow('Could not detect a DOI');
        });

        it('should accept valid DOI formats', async () => {
            const mockResponse = {
                title: 'Test Paper',
                author: [{ given: 'John', family: 'Doe' }],
                'container-title': 'Test Journal',
                issued: { 'date-parts': [[2024]] },
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            // Valid DOI formats
            await expect(fetchDoiMetadata('10.1234/test')).resolves.toBeDefined();
            await expect(fetchDoiMetadata('10.1000/xyz123')).resolves.toBeDefined();
            await expect(fetchDoiMetadata('https://doi.org/10.1234/test')).resolves.toBeDefined();
        });
    });

    describe('Successful DOI Fetching', () => {
        it('should fetch and parse complete metadata', async () => {
            const mockResponse = {
                title: 'Machine Learning Paper',
                author: [
                    { given: 'John', family: 'Doe' },
                    { given: 'Jane', family: 'Smith' }
                ],
                'container-title': 'Nature Machine Intelligence',
                issued: { 'date-parts': [[2024]] },
                DOI: '10.1234/ml2024'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/ml2024');

            expect(result).toEqual({
                title: 'Machine Learning Paper',
                authors: ['John Doe', 'Jane Smith'],
                journal: 'Nature Machine Intelligence',
                year: 2024,
                doi: '10.1234/ml2024'
            });

            expect(fetch).toHaveBeenCalledWith(
                'https://doi.org/10.1234/ml2024',
                expect.objectContaining({
                    headers: { 'Accept': 'application/vnd.citationstyles.csl+json' }
                })
            );
        });

        it('should handle missing title with default', async () => {
            const mockResponse = {
                author: [{ given: 'John', family: 'Doe' }],
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/test');
            expect(result.title).toBe('Untitled Paper');
        });

        it('should handle missing authors with default', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/test');
            expect(result.authors).toEqual(['Unknown Author']);
        });

        it('should handle empty authors array', async () => {
            const mockResponse = {
                title: 'Test Paper',
                author: [],
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/test');
            expect(result.authors).toEqual(['Unknown Author']);
        });

        it('should parse author names correctly', async () => {
            const mockResponse = {
                title: 'Test Paper',
                author: [
                    { given: 'John', family: 'Doe' },
                    { family: 'Smith' }, // Missing given name
                    { given: 'Alice' }, // Missing family name
                    'Bob Johnson' // String format
                ],
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/test');
            expect(result.authors).toEqual(['John Doe', 'Smith', 'Alice', 'Bob Johnson']);
        });

        it('should handle missing journal', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/test');
            expect(result.journal).toBe('');
        });

        it('should handle missing year', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/test');
            expect(result.year).toBeNull();
        });

        it('should validate year is reasonable', async () => {
            const mockResponse = {
                title: 'Test Paper',
                issued: { 'date-parts': [[999]] }, // Too old
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            const result = await fetchDoiMetadata('10.1234/test');
            expect(result.year).toBeNull();
        });
    });

    describe('HTTP Error Responses', () => {
        it('should handle 404 Not Found', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 404
                })
            );

            await expect(fetchDoiMetadata('10.1234/notfound'))
                .rejects.toThrow('DOI not found');
        });

        it('should handle 400 Bad Request', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 400
                })
            );

            await expect(fetchDoiMetadata('10.1234/bad'))
                .rejects.toThrow('Invalid DOI format: The DOI service rejected this DOI');
        });

        it('should handle 429 Rate Limit', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 429
                })
            );

            await expect(fetchDoiMetadata('10.1234/ratelimit'))
                .rejects.toThrow('Rate limit exceeded');
        });

        it('should handle 500 Server Error', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 500
                })
            );

            await expect(fetchDoiMetadata('10.1234/error'))
                .rejects.toThrow('DOI service error: The DOI service is temporarily unavailable');
        });

        it('should handle 502 Bad Gateway', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 502
                })
            );

            await expect(fetchDoiMetadata('10.1234/error'))
                .rejects.toThrow('DOI service is temporarily unavailable');
        });

        it('should handle other HTTP errors', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 418
                })
            );

            await expect(fetchDoiMetadata('10.1234/teapot'))
                .rejects.toThrow('DOI service error (418)');
        });
    });

    describe('Network Errors', () => {
        it('should handle network fetch errors', async () => {
            global.fetch = vi.fn(() =>
                Promise.reject(new Error('Network failure'))
            );

            // Mock navigator.onLine as true to avoid offline error
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: true
            });

            await expect(fetchDoiMetadata('10.1234/network'))
                .rejects.toThrow('Network error: Unable to reach DOI service');
        });

        it('should handle offline state', async () => {
            global.fetch = vi.fn(() =>
                Promise.reject(new Error('Network failure'))
            );

            // Mock navigator.onLine as false
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: false
            });

            await expect(fetchDoiMetadata('10.1234/offline'))
                .rejects.toThrow('No internet connection');
        });

        it('should handle timeout', async () => {
            // Mock fetch to simulate AbortError
            global.fetch = vi.fn((url, options) => {
                return new Promise((resolve, reject) => {
                    // Listen for abort signal
                    if (options.signal) {
                        options.signal.addEventListener('abort', () => {
                            const abortError = new Error('The operation was aborted');
                            abortError.name = 'AbortError';
                            reject(abortError);
                        });
                    }
                    // Never resolve (simulates slow request)
                });
            });

            await expect(fetchDoiMetadata('10.1234/slow', { timeout: 100 }))
                .rejects.toThrow('Request timed out');
        });
    });

    describe('Invalid Response Handling', () => {
        it('should handle invalid JSON response', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.reject(new Error('Invalid JSON'))
                })
            );

            await expect(fetchDoiMetadata('10.1234/invalid'))
                .rejects.toThrow('Invalid response: DOI service returned invalid data');
        });

        it('should handle non-object response', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve('not an object')
                })
            );

            await expect(fetchDoiMetadata('10.1234/invalid'))
                .rejects.toThrow('Invalid response: DOI service returned unexpected data format');
        });

        it('should handle null response', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(null)
                })
            );

            await expect(fetchDoiMetadata('10.1234/null'))
                .rejects.toThrow('Invalid response: DOI service returned unexpected data format');
        });
    });

    describe('Edge Cases', () => {
        it('should trim whitespace from DOI', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            await fetchDoiMetadata('  10.1234/test  ');

            expect(fetch).toHaveBeenCalledWith(
                'https://doi.org/10.1234/test',
                expect.any(Object)
            );
        });

        it('should handle DOI with doi.org prefix', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            await fetchDoiMetadata('https://doi.org/10.1234/test');

            expect(fetch).toHaveBeenCalledWith(
                'https://doi.org/10.1234/test',
                expect.any(Object)
            );
        });

        it('should use default timeout if not specified', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
            );

            await fetchDoiMetadata('10.1234/test');

            // Default timeout is 10000ms - verify it doesn't throw timeout error
            expect(fetch).toHaveBeenCalled();
        });
    });
});


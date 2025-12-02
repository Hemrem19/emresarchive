/**
 * Tests for api/import.js - Batch Import API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { batchImport } from '../api/import.js';
import * as authApi from '../api/auth.js';
import * as utilsApi from '../api/utils.js';

// Mock dependencies
vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'mock-token'),
    refreshAccessToken: vi.fn(() => Promise.resolve('new-token'))
}));

vi.mock('../config.js', () => ({
    getApiBaseUrl: vi.fn(() => 'https://api.example.com')
}));

describe('api/import.js - Batch Import', () => {
    let mockFetch;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        
        // Mock fetch
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    describe('batchImport', () => {
        it('should successfully batch import papers, collections, and annotations', async () => {
            const importData = {
                papers: [{ title: 'Paper 1', authors: ['Author 1'] }],
                collections: [{ name: 'Collection 1' }],
                annotations: [{ paperId: 1, type: 'highlight' }]
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn(() => Promise.resolve({
                    success: true,
                    data: {
                        papers: { created: 1, updated: 0 },
                        collections: { created: 1, updated: 0 },
                        annotations: { created: 1, updated: 0 }
                    }
                }))
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            const result = await batchImport(importData);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/api/import/batch-import',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock-token'
                    },
                    body: JSON.stringify(importData)
                })
            );
            expect(result.success).toBe(true);
            expect(result.data.papers.created).toBe(1);
        });

        it('should throw error when not authenticated', async () => {
            authApi.getAccessToken.mockReturnValueOnce(null);

            await expect(batchImport({ papers: [] })).rejects.toThrow('Not authenticated. Please log in.');
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should refresh token and retry on 401 error', async () => {
            const importData = { papers: [{ title: 'Paper 1' }] };
            const firstResponse = {
                ok: false,
                status: 401
            };
            const secondResponse = {
                ok: true,
                status: 200,
                json: vi.fn(() => Promise.resolve({ success: true, data: {} }))
            };

            mockFetch
                .mockResolvedValueOnce(firstResponse)
                .mockResolvedValueOnce(secondResponse);

            const result = await batchImport(importData);

            expect(authApi.refreshAccessToken).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledTimes(2);
            // Second call should use new token
            expect(mockFetch.mock.calls[1][1].headers['Authorization']).toBe('Bearer new-token');
            expect(result.success).toBe(true);
        });

        it('should throw error when token refresh fails on 401', async () => {
            const importData = { papers: [{ title: 'Paper 1' }] };
            const firstResponse = {
                ok: false,
                status: 401
            };

            mockFetch.mockResolvedValueOnce(firstResponse);
            authApi.refreshAccessToken.mockResolvedValueOnce(null);

            await expect(batchImport(importData)).rejects.toThrow('Session expired. Please log in again.');
            expect(authApi.refreshAccessToken).toHaveBeenCalled();
        });

        it('should handle API errors with error message', async () => {
            const importData = { papers: [{ title: 'Paper 1' }] };
            const mockResponse = {
                ok: false,
                status: 400,
                json: vi.fn(() => Promise.resolve({
                    error: { message: 'Invalid data format' }
                }))
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            await expect(batchImport(importData)).rejects.toThrow('Invalid data format');
        });

        it('should handle API errors without error message', async () => {
            const importData = { papers: [{ title: 'Paper 1' }] };
            const mockResponse = {
                ok: false,
                status: 500,
                json: vi.fn(() => Promise.resolve({}))
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            await expect(batchImport(importData)).rejects.toThrow('Batch import failed: 500');
        });

        it('should handle JSON parsing errors in error response', async () => {
            const importData = { papers: [{ title: 'Paper 1' }] };
            const mockResponse = {
                ok: false,
                status: 500,
                json: vi.fn(() => Promise.reject(new Error('Invalid JSON')))
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            await expect(batchImport(importData)).rejects.toThrow('Batch import failed: 500');
        });

        it('should handle network errors', async () => {
            const importData = { papers: [{ title: 'Paper 1' }] };
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(batchImport(importData)).rejects.toThrow('Network error');
        });

        it('should properly format request payload', async () => {
            const importData = {
                papers: [{ title: 'Paper 1', authors: ['Author 1'], year: 2024 }],
                collections: [{ name: 'Collection 1', icon: 'folder' }],
                annotations: [{ paperId: 1, type: 'highlight', pageNumber: 1 }]
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn(() => Promise.resolve({ success: true, data: {} }))
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            await batchImport(importData);

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody).toEqual(importData);
            expect(callBody.papers).toHaveLength(1);
            expect(callBody.collections).toHaveLength(1);
            expect(callBody.annotations).toHaveLength(1);
        });

        it('should handle empty import data', async () => {
            const importData = {
                papers: [],
                collections: [],
                annotations: []
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn(() => Promise.resolve({
                    success: true,
                    data: {
                        papers: { created: 0, updated: 0 },
                        collections: { created: 0, updated: 0 },
                        annotations: { created: 0, updated: 0 }
                    }
                }))
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            const result = await batchImport(importData);

            expect(result.data.papers.created).toBe(0);
            expect(result.data.collections.created).toBe(0);
            expect(result.data.annotations.created).toBe(0);
        });
    });
});


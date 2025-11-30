/**
 * Tests for api/papers.js - Papers API Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as papersApi from '../api/papers.js';
import * as authApi from '../api/auth.js';
import * as utilsApi from '../api/utils.js';
import * as configModule from '../config.js';

// Mock dependencies
vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'mock-token'),
    refreshToken: vi.fn(() => Promise.resolve('new-token'))
}));

vi.mock('../api/utils.js', () => ({
    parseJsonResponse: vi.fn(),
    withRateLimitCheck: vi.fn((fn) => fn())
}));

vi.mock('../config.js', () => ({
    getApiBaseUrl: vi.fn(() => 'https://api.example.com')
}));

describe('api/papers.js - Papers API', () => {
    let mockFetch;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        
        // Mock fetch
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    describe('getAllPapers', () => {
        it('should fetch all papers with default options', async () => {
            const mockResponse = {
                ok: true,
                status: 200
            };
            const mockData = {
                success: true,
                data: {
                    papers: [{ id: 1, title: 'Paper 1' }],
                    pagination: { page: 1, limit: 25, total: 1, totalPages: 1 }
                }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await papersApi.getAllPapers();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers'),
                expect.objectContaining({ method: 'GET' })
            );
            expect(result.papers).toEqual([{ id: 1, title: 'Paper 1' }]);
            expect(result.pagination.page).toBe(1);
        });

        it('should include query parameters', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: { papers: [], pagination: {} } };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await papersApi.getAllPapers({
                page: 2,
                limit: 50,
                status: 'Reading',
                tag: 'ml',
                sortBy: 'title',
                sortOrder: 'asc'
            });

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toContain('page=2');
            expect(callUrl).toContain('limit=50');
            expect(callUrl).toContain('status=Reading');
            expect(callUrl).toContain('tag=ml');
            expect(callUrl).toContain('sortBy=title');
            expect(callUrl).toContain('sortOrder=asc');
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(papersApi.getAllPapers()).rejects.toThrow('Invalid response from server');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(papersApi.getAllPapers()).rejects.toThrow('Network error');
        });
    });

    describe('getPaper', () => {
        it('should fetch a single paper by ID', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: { paper: { id: 1, title: 'Test Paper' } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await papersApi.getPaper(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers/1'),
                expect.objectContaining({ method: 'GET' })
            );
            expect(result).toEqual({ id: 1, title: 'Test Paper' });
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: {} };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(papersApi.getPaper(1)).rejects.toThrow('Invalid response from server');
        });
    });

    describe('createPaper', () => {
        it('should create a new paper', async () => {
            const paperData = {
                title: 'New Paper',
                authors: ['Author 1'],
                year: 2024
            };
            const mockResponse = { ok: true, status: 201 };
            const mockData = {
                success: true,
                data: { paper: { id: 1, ...paperData } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await papersApi.createPaper(paperData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(paperData)
                })
            );
            expect(result.id).toBe(1);
            expect(result.title).toBe('New Paper');
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 201 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(papersApi.createPaper({ title: 'Test' })).rejects.toThrow('Invalid response from server');
        });
    });

    describe('updatePaper', () => {
        it('should update an existing paper', async () => {
            const updateData = { title: 'Updated Title' };
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: { paper: { id: 1, title: 'Updated Title' } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await papersApi.updatePaper(1, updateData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers/1'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                })
            );
            expect(result.title).toBe('Updated Title');
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(papersApi.updatePaper(1, { title: 'Test' })).rejects.toThrow('Invalid response from server');
        });
    });

    describe('deletePaper', () => {
        it('should delete a paper', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await papersApi.deletePaper(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers/1'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(papersApi.deletePaper(1)).rejects.toThrow('Invalid response from server');
        });
    });

    describe('searchPapers', () => {
        it('should search papers with query', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: {
                    papers: [{ id: 1, title: 'Search Result' }],
                    pagination: { page: 1, limit: 25, total: 1, totalPages: 1 }
                }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await papersApi.searchPapers('test query');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers/search'),
                expect.objectContaining({ method: 'GET' })
            );
            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toContain('q=test+query');
            expect(result.papers).toEqual([{ id: 1, title: 'Search Result' }]);
        });

        it('should include pagination options', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: { papers: [], pagination: {} } };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await papersApi.searchPapers('query', { page: 2, limit: 50 });

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toContain('page=2');
            expect(callUrl).toContain('limit=50');
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(papersApi.searchPapers('query')).rejects.toThrow('Invalid response from server');
        });
    });

    describe('Authentication and Token Refresh', () => {
        it('should include authorization header', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: { papers: [], pagination: {} } };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await papersApi.getAllPapers();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    })
                })
            );
        });

        it('should refresh token on 401 and retry', async () => {
            const firstResponse = { ok: false, status: 401 };
            const secondResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: { papers: [], pagination: {} } };

            mockFetch
                .mockResolvedValueOnce(firstResponse)
                .mockResolvedValueOnce(secondResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await papersApi.getAllPapers();

            expect(authApi.refreshToken).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledTimes(2);
            // Second call should use new token
            expect(mockFetch.mock.calls[1][1].headers['Authorization']).toBe('Bearer new-token');
        });

        it('should throw error when not authenticated', async () => {
            authApi.getAccessToken.mockReturnValueOnce(null);

            await expect(papersApi.getAllPapers()).rejects.toThrow('Not authenticated');
        });
    });

    describe('Error Handling', () => {
        it('should handle network fetch errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

            await expect(papersApi.getAllPapers()).rejects.toThrow('Network error');
        });

        it('should handle parseJsonResponse errors', async () => {
            const mockResponse = { ok: true, status: 200 };
            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockRejectedValueOnce(new Error('Parse error'));

            await expect(papersApi.getAllPapers()).rejects.toThrow('Parse error');
        });
    });
});


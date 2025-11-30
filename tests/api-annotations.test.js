/**
 * Tests for api/annotations.js - Annotations API Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as annotationsApi from '../api/annotations.js';
import * as authApi from '../api/auth.js';
import * as utilsApi from '../api/utils.js';

// Mock dependencies
vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'mock-token'),
    refreshToken: vi.fn(() => Promise.resolve('new-token'))
}));

vi.mock('../api/utils.js', () => ({
    parseJsonResponse: vi.fn()
}));

vi.mock('../config.js', () => ({
    getApiBaseUrl: vi.fn(() => 'https://api.example.com')
}));

describe('api/annotations.js - Annotations API', () => {
    let mockFetch;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    describe('getAnnotations', () => {
        it('should fetch annotations for a paper', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: {
                    annotations: [
                        { id: 1, paperId: 1, type: 'highlight' },
                        { id: 2, paperId: 1, type: 'note' }
                    ]
                }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await annotationsApi.getAnnotations(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers/1/annotations'),
                expect.objectContaining({ method: 'GET' })
            );
            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('highlight');
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(annotationsApi.getAnnotations(1)).rejects.toThrow('Invalid response from server');
        });
    });

    describe('createAnnotation', () => {
        it('should create a new annotation', async () => {
            const annotationData = {
                type: 'highlight',
                pageNumber: 1,
                color: 'yellow',
                textContent: 'Highlighted text'
            };
            const mockResponse = { ok: true, status: 201 };
            const mockData = {
                success: true,
                data: { annotation: { id: 1, paperId: 1, ...annotationData } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await annotationsApi.createAnnotation(1, annotationData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/papers/1/annotations'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(annotationData)
                })
            );
            expect(result.id).toBe(1);
            expect(result.type).toBe('highlight');
        });
    });

    describe('updateAnnotation', () => {
        it('should update an existing annotation', async () => {
            const updateData = { color: 'blue' };
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: { annotation: { id: 1, color: 'blue' } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await annotationsApi.updateAnnotation(1, updateData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/annotations/1'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                })
            );
            expect(result.color).toBe('blue');
        });
    });

    describe('deleteAnnotation', () => {
        it('should delete an annotation', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await annotationsApi.deleteAnnotation(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/annotations/1'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(annotationsApi.deleteAnnotation(1)).rejects.toThrow('Invalid response from server');
        });
    });

    describe('Authentication', () => {
        it('should include authorization header', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: { annotations: [] } };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await annotationsApi.getAnnotations(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-token'
                    })
                })
            );
        });

        it('should refresh token on 401', async () => {
            const firstResponse = { ok: false, status: 401 };
            const secondResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: { annotations: [] } };

            mockFetch
                .mockResolvedValueOnce(firstResponse)
                .mockResolvedValueOnce(secondResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await annotationsApi.getAnnotations(1);

            expect(authApi.refreshToken).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });
});


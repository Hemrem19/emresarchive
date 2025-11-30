/**
 * Tests for api/collections.js - Collections API Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as collectionsApi from '../api/collections.js';
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

describe('api/collections.js - Collections API', () => {
    let mockFetch;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    describe('getAllCollections', () => {
        it('should fetch all collections', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: { collections: [{ id: 1, name: 'Collection 1' }] }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await collectionsApi.getAllCollections();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/collections'),
                expect.objectContaining({ method: 'GET' })
            );
            expect(result).toEqual([{ id: 1, name: 'Collection 1' }]);
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(collectionsApi.getAllCollections()).rejects.toThrow('Invalid response from server');
        });
    });

    describe('getCollection', () => {
        it('should fetch a single collection by ID', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: { collection: { id: 1, name: 'Test Collection' } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await collectionsApi.getCollection(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/collections/1'),
                expect.objectContaining({ method: 'GET' })
            );
            expect(result).toEqual({ id: 1, name: 'Test Collection' });
        });
    });

    describe('createCollection', () => {
        it('should create a new collection', async () => {
            const collectionData = {
                name: 'New Collection',
                icon: 'folder',
                color: '#FF0000'
            };
            const mockResponse = { ok: true, status: 201 };
            const mockData = {
                success: true,
                data: { collection: { id: 1, ...collectionData } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await collectionsApi.createCollection(collectionData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/collections'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(collectionData)
                })
            );
            expect(result.id).toBe(1);
            expect(result.name).toBe('New Collection');
        });
    });

    describe('updateCollection', () => {
        it('should update an existing collection', async () => {
            const updateData = { name: 'Updated Collection' };
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: { collection: { id: 1, name: 'Updated Collection' } }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await collectionsApi.updateCollection(1, updateData);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/collections/1'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                })
            );
            expect(result.name).toBe('Updated Collection');
        });
    });

    describe('deleteCollection', () => {
        it('should delete a collection', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await collectionsApi.deleteCollection(1);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/collections/1'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        it('should throw error on invalid response', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: false };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(collectionsApi.deleteCollection(1)).rejects.toThrow('Invalid response from server');
        });
    });

    describe('Authentication', () => {
        it('should include authorization header', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: { collections: [] } };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await collectionsApi.getAllCollections();

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
            const mockData = { success: true, data: { collections: [] } };

            mockFetch
                .mockResolvedValueOnce(firstResponse)
                .mockResolvedValueOnce(secondResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await collectionsApi.getAllCollections();

            expect(authApi.refreshToken).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });
});


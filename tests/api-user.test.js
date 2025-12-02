/**
 * Tests for api/user.js - User API Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as userApi from '../api/user.js';
import * as authApi from '../api/auth.js';
import * as utilsApi from '../api/utils.js';
import * as configModule from '../config.js';

// Mock dependencies
vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'mock-token'),
    refreshToken: vi.fn(() => Promise.resolve('new-token'))
}));

vi.mock('../api/utils.js', () => ({
    parseJsonResponse: vi.fn()
}));

vi.mock('../api/sync.js', () => ({
    apiRequest: vi.fn(() => Promise.resolve({ ok: true, status: 200 }))
}));

vi.mock('../config.js', () => ({
    API_CONFIG: {
        BASE_URL: 'https://api.example.com'
    }
}));

describe('api/user.js - User API', () => {
    let mockApiRequest;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('clearAllUserData', () => {
        it('should successfully clear all user data', async () => {
            const syncModule = await import('../api/sync.js');
            mockApiRequest = syncModule.apiRequest;
            
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: {
                    papersDeleted: 10,
                    collectionsDeleted: 5,
                    annotationsDeleted: 20
                }
            };

            mockApiRequest.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await userApi.clearAllUserData();

            expect(mockApiRequest).toHaveBeenCalledWith(
                'https://api.example.com/api/user/data',
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
            expect(result.papersDeleted).toBe(10);
            expect(result.collectionsDeleted).toBe(5);
            expect(result.annotationsDeleted).toBe(20);
        });

        it('should throw error on API failure', async () => {
            const syncModule = await import('../api/sync.js');
            mockApiRequest = syncModule.apiRequest;
            
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: false,
                error: { message: 'Failed to clear user data' }
            };

            mockApiRequest.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(userApi.clearAllUserData()).rejects.toThrow('Failed to clear user data');
        });

        it('should handle network errors', async () => {
            const syncModule = await import('../api/sync.js');
            mockApiRequest = syncModule.apiRequest;
            mockApiRequest.mockRejectedValueOnce(new Error('Network error'));

            await expect(userApi.clearAllUserData()).rejects.toThrow('Failed to clear user data: Network error');
        });

        it('should handle parseJsonResponse errors', async () => {
            const syncModule = await import('../api/sync.js');
            mockApiRequest = syncModule.apiRequest;
            
            const mockResponse = { ok: true, status: 200 };
            mockApiRequest.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockRejectedValueOnce(new Error('Parse error'));

            await expect(userApi.clearAllUserData()).rejects.toThrow('Failed to clear user data: Parse error');
        });

        it('should handle errors without message', async () => {
            const syncModule = await import('../api/sync.js');
            mockApiRequest = syncModule.apiRequest;
            
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: false
            };

            mockApiRequest.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(userApi.clearAllUserData()).rejects.toThrow('Failed to clear user data');
        });

        it('should return deletion counts in response', async () => {
            const syncModule = await import('../api/sync.js');
            mockApiRequest = syncModule.apiRequest;
            
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: {
                    papersDeleted: 0,
                    collectionsDeleted: 0,
                    annotationsDeleted: 0
                }
            };

            mockApiRequest.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await userApi.clearAllUserData();

            expect(result).toHaveProperty('papersDeleted');
            expect(result).toHaveProperty('collectionsDeleted');
            expect(result).toHaveProperty('annotationsDeleted');
        });
    });
});


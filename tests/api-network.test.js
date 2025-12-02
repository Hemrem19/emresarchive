/**
 * Tests for api/network.js - Network API Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as networkApi from '../api/network.js';
import * as authApi from '../api/auth.js';
import * as utilsApi from '../api/utils.js';
import * as configModule from '../config.js';

// Mock dependencies
vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'mock-token')
}));

vi.mock('../api/utils.js', () => ({
    parseJsonResponse: vi.fn(),
    withRateLimitCheck: vi.fn((fn) => fn())
}));

vi.mock('../config.js', () => ({
    API_CONFIG: {
        BASE_URL: 'https://api.example.com'
    }
}));

describe('api/network.js - Network API', () => {
    let mockFetch;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        
        // Mock fetch
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    describe('generateNetwork', () => {
        it('should successfully generate a network', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: {
                    nodes: [{ id: 1, label: 'Paper 1' }],
                    edges: [{ from: 1, to: 2 }]
                }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await networkApi.generateNetwork();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/api/networks/auto-generate',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer mock-token',
                        'Content-Type': 'application/json'
                    }
                })
            );
            expect(result.nodes).toHaveLength(1);
            expect(result.edges).toHaveLength(1);
        });

        it('should throw error when not authenticated', async () => {
            authApi.getAccessToken.mockReturnValueOnce(null);

            await expect(networkApi.generateNetwork()).rejects.toThrow('Authentication required');
        });

        it('should handle API errors', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: false,
                error: { message: 'Failed to generate network' }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(networkApi.generateNetwork()).rejects.toThrow('Failed to generate network');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(networkApi.generateNetwork()).rejects.toThrow('Network error');
        });

        it('should use rate limit check wrapper', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: {} };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await networkApi.generateNetwork();

            expect(utilsApi.withRateLimitCheck).toHaveBeenCalled();
        });
    });

    describe('getNetwork', () => {
        it('should fetch a network by ID', async () => {
            const networkId = 'network-123';
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: {
                    id: networkId,
                    nodes: [{ id: 1, label: 'Paper 1' }],
                    edges: []
                }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await networkApi.getNetwork(networkId);

            expect(mockFetch).toHaveBeenCalledWith(
                `https://api.example.com/api/networks/${networkId}`,
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer mock-token'
                    }
                })
            );
            expect(result.id).toBe(networkId);
        });

        it('should throw error when not authenticated', async () => {
            authApi.getAccessToken.mockReturnValueOnce(null);

            await expect(networkApi.getNetwork('network-123')).rejects.toThrow('Authentication required');
        });

        it('should handle invalid network ID', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: false,
                error: { message: 'Network not found' }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(networkApi.getNetwork('invalid-id')).rejects.toThrow('Network not found');
        });

        it('should use rate limit check wrapper', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: {} };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await networkApi.getNetwork('network-123');

            expect(utilsApi.withRateLimitCheck).toHaveBeenCalled();
        });
    });

    describe('getUserNetworks', () => {
        it('should fetch all user networks', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: [
                    { id: 'network-1', name: 'Network 1' },
                    { id: 'network-2', name: 'Network 2' }
                ]
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await networkApi.getUserNetworks();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/api/networks',
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer mock-token'
                    }
                })
            );
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('network-1');
        });

        it('should handle empty results', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: true,
                data: []
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            const result = await networkApi.getUserNetworks();

            expect(result).toEqual([]);
        });

        it('should throw error when not authenticated', async () => {
            authApi.getAccessToken.mockReturnValueOnce(null);

            await expect(networkApi.getUserNetworks()).rejects.toThrow('Authentication required');
        });

        it('should handle API errors', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = {
                success: false,
                error: { message: 'Failed to fetch networks' }
            };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await expect(networkApi.getUserNetworks()).rejects.toThrow('Failed to fetch networks');
        });

        it('should use rate limit check wrapper', async () => {
            const mockResponse = { ok: true, status: 200 };
            const mockData = { success: true, data: [] };

            mockFetch.mockResolvedValueOnce(mockResponse);
            utilsApi.parseJsonResponse.mockResolvedValueOnce(mockData);

            await networkApi.getUserNetworks();

            expect(utilsApi.withRateLimitCheck).toHaveBeenCalled();
        });
    });
});


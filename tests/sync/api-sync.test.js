/**
 * Tests for api/sync.js
 * Sync API client: client ID, timestamps, data mapping, API calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getClientId,
    getLastSyncedAt,
    setLastSyncedAt,
    fullSync,
    incrementalSync,
    getSyncStatus,
    mapPaperToApi,
    mapPaperFromApi,
    mapCollectionToApi,
    mapCollectionFromApi,
    mapAnnotationToApi,
    mapAnnotationFromApi
} from '../../api/sync.js';
import { resetAllMocks, setMockAuth, clearMockAuth, createMockFetchResponse } from '../helpers.js';

// Mock auth module
vi.mock('../../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'mock-access-token'),
    refreshToken: vi.fn(() => Promise.resolve('new-access-token'))
}));

// Mock config module
vi.mock('../../config.js', () => ({
    getApiBaseUrl: vi.fn(() => 'https://api.example.com')
}));

// Mock global fetch
global.fetch = vi.fn();

describe('api/sync.js - Client ID Management', () => {
    beforeEach(() => {
        resetAllMocks();
        localStorage.clear();
    });

    describe('getClientId', () => {
        it('should generate a new client ID when none exists', () => {
            const clientId = getClientId();
            
            expect(clientId).toMatch(/^client_\d+_[a-z0-9]+$/);
            expect(localStorage.getItem('citavers_client_id')).toBe(clientId);
        });

        it('should return existing client ID from localStorage', () => {
            const existingId = 'client_1234567890_abc123';
            localStorage.setItem('citavers_client_id', existingId);
            
            const clientId = getClientId();
            
            expect(clientId).toBe(existingId);
        });

        it('should persist client ID for subsequent calls', () => {
            const firstId = getClientId();
            const secondId = getClientId();
            
            expect(firstId).toBe(secondId);
            expect(localStorage.getItem('citaversa_client_id')).toBe(firstId);
        });
    });
});

describe('api/sync.js - Last Sync Timestamp', () => {
    beforeEach(() => {
        resetAllMocks();
        localStorage.clear();
    });

    describe('getLastSyncedAt', () => {
        it('should return null when never synced', () => {
            expect(getLastSyncedAt()).toBeNull();
        });

        it('should return stored timestamp', () => {
            const timestamp = new Date().toISOString();
            localStorage.setItem('citavers_last_synced_at', timestamp);
            
            expect(getLastSyncedAt()).toBe(timestamp);
        });
    });

    describe('setLastSyncedAt', () => {
        it('should store timestamp in localStorage', () => {
            const timestamp = new Date().toISOString();
            setLastSyncedAt(timestamp);
            
            expect(localStorage.getItem('citavers_last_synced_at')).toBe(timestamp);
        });

        it('should update existing timestamp', () => {
            const timestamp1 = new Date().toISOString();
            const timestamp2 = new Date(Date.now() + 1000).toISOString();
            
            setLastSyncedAt(timestamp1);
            setLastSyncedAt(timestamp2);
            
            expect(localStorage.getItem('citaversa_last_synced_at')).toBe(timestamp2);
        });
    });
});

describe('api/sync.js - Data Mapping', () => {
    describe('mapPaperToApi', () => {
        it('should map readingStatus to status', () => {
            const localPaper = {
                title: 'Test Paper',
                readingStatus: 'Reading',
                authors: ['Author']
            };
            
            const apiPaper = mapPaperToApi(localPaper);
            
            expect(apiPaper.status).toBe('Reading');
            expect(apiPaper.readingStatus).toBeUndefined();
        });

        it('should map s3Key to pdfUrl', () => {
            const localPaper = {
                title: 'Test Paper',
                s3Key: 'papers/1/test.pdf',
                authors: ['Author']
            };
            
            const apiPaper = mapPaperToApi(localPaper);
            
            expect(apiPaper.pdfUrl).toBe('papers/1/test.pdf');
            expect(apiPaper.s3Key).toBeUndefined();
        });

        it('should remove local-only fields', () => {
            const localPaper = {
                title: 'Test Paper',
                pdfData: new ArrayBuffer(100),
                pdfFile: new File([], 'test.pdf'),
                hasPdf: true,
                id: 123,
                createdAt: new Date(),
                updatedAt: new Date(),
                authors: ['Author']
            };
            
            const apiPaper = mapPaperToApi(localPaper);
            
            expect(apiPaper.pdfData).toBeUndefined();
            expect(apiPaper.pdfFile).toBeUndefined();
            expect(apiPaper.hasPdf).toBeUndefined();
            expect(apiPaper.id).toBeUndefined();
            expect(apiPaper.createdAt).toBeUndefined();
            expect(apiPaper.updatedAt).toBeUndefined();
        });

        it('should ensure authors is an array', () => {
            const localPaper1 = { title: 'Paper 1', authors: 'Single Author' };
            const localPaper2 = { title: 'Paper 2', authors: ['Array Author'] };
            const localPaper3 = { title: 'Paper 3' };
            
            expect(mapPaperToApi(localPaper1).authors).toEqual(['Single Author']);
            expect(mapPaperToApi(localPaper2).authors).toEqual(['Array Author']);
            expect(Array.isArray(mapPaperToApi(localPaper3).authors)).toBe(true);
        });

        it('should ensure tags is an array', () => {
            const localPaper1 = { title: 'Paper 1', tags: 'single-tag', authors: [] };
            const localPaper2 = { title: 'Paper 2', tags: ['tag1'], authors: [] };
            const localPaper3 = { title: 'Paper 3', authors: [] };
            
            expect(mapPaperToApi(localPaper1).tags).toEqual(['single-tag']);
            expect(mapPaperToApi(localPaper2).tags).toEqual(['tag1']);
            expect(Array.isArray(mapPaperToApi(localPaper3).tags)).toBe(true);
        });

        it('should remove invalid readingProgress', () => {
            const localPaper1 = { title: 'Paper 1', authors: [], readingProgress: { totalPages: 0 } };
            const localPaper2 = { title: 'Paper 2', authors: [], readingProgress: { totalPages: 10 } };
            
            expect(mapPaperToApi(localPaper1).readingProgress).toBeUndefined();
            expect(mapPaperToApi(localPaper2).readingProgress.totalPages).toBe(10);
        });
    });

    describe('mapPaperFromApi', () => {
        it('should map status to readingStatus', () => {
            const apiPaper = {
                id: 1,
                title: 'Test Paper',
                status: 'Reading',
                authors: ['Author']
            };
            
            const localPaper = mapPaperFromApi(apiPaper);
            
            expect(localPaper.readingStatus).toBe('Reading');
        });

        it('should map pdfUrl to s3Key and set hasPdf', () => {
            const apiPaper = {
                id: 1,
                title: 'Test Paper',
                pdfUrl: 'papers/1/test.pdf',
                authors: ['Author']
            };
            
            const localPaper = mapPaperFromApi(apiPaper);
            
            expect(localPaper.s3Key).toBe('papers/1/test.pdf');
            expect(localPaper.hasPdf).toBe(true);
        });

        it('should preserve all other fields', () => {
            const apiPaper = {
                id: 1,
                title: 'Test Paper',
                authors: ['Author'],
                year: 2024,
                doi: '10.1234/test'
            };
            
            const localPaper = mapPaperFromApi(apiPaper);
            
            expect(localPaper.id).toBe(1);
            expect(localPaper.title).toBe('Test Paper');
            expect(localPaper.year).toBe(2024);
            expect(localPaper.doi).toBe('10.1234/test');
        });
    });

    describe('mapCollectionToApi', () => {
        it('should remove id, createdAt, updatedAt', () => {
            const localCollection = {
                id: 1,
                name: 'Test Collection',
                createdAt: new Date(),
                updatedAt: new Date(),
                filters: { status: 'Reading' }
            };
            
            const apiCollection = mapCollectionToApi(localCollection);
            
            expect(apiCollection.id).toBeUndefined();
            expect(apiCollection.createdAt).toBeUndefined();
            expect(apiCollection.updatedAt).toBeUndefined();
            expect(apiCollection.name).toBe('Test Collection');
            expect(apiCollection.filters).toEqual({ status: 'Reading' });
        });
    });

    describe('mapCollectionFromApi', () => {
        it('should return collection as-is', () => {
            const apiCollection = {
                id: 1,
                name: 'Test Collection',
                filters: { status: 'Reading' }
            };
            
            const localCollection = mapCollectionFromApi(apiCollection);
            
            expect(localCollection).toEqual(apiCollection);
        });
    });

    describe('mapAnnotationToApi', () => {
        it('should remove id, createdAt, updatedAt', () => {
            const localAnnotation = {
                id: 1,
                paperId: 1,
                type: 'highlight',
                pageNumber: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                color: 'yellow'
            };
            
            const apiAnnotation = mapAnnotationToApi(localAnnotation);
            
            expect(apiAnnotation.id).toBeUndefined();
            expect(apiAnnotation.createdAt).toBeUndefined();
            expect(apiAnnotation.updatedAt).toBeUndefined();
            expect(apiAnnotation.paperId).toBe(1);
            expect(apiAnnotation.type).toBe('highlight');
        });
    });

    describe('mapAnnotationFromApi', () => {
        it('should return annotation as-is', () => {
            const apiAnnotation = {
                id: 1,
                paperId: 1,
                type: 'highlight',
                pageNumber: 1
            };
            
            const localAnnotation = mapAnnotationFromApi(apiAnnotation);
            
            expect(localAnnotation).toEqual(apiAnnotation);
        });
    });
});

describe('api/sync.js - API Calls', () => {
    beforeEach(() => {
        resetAllMocks();
        setMockAuth(true);
        localStorage.clear();
        global.fetch.mockClear();
    });

    describe('fullSync', () => {
        it('should fetch all data from server and update timestamp', async () => {
            const mockResponse = {
                success: true,
                data: {
                    papers: [{ id: 1, title: 'Paper 1', status: 'Reading' }],
                    collections: [{ id: 1, name: 'Collection 1' }],
                    annotations: [{ id: 1, paperId: 1, type: 'highlight' }],
                    syncedAt: '2024-01-01T00:00:00.000Z'
                }
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse)
            );

            const result = await fullSync();

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.example.com/api/sync/full',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-access-token'
                    })
                })
            );

            expect(result.papers).toHaveLength(1);
            expect(result.collections).toHaveLength(1);
            expect(result.annotations).toHaveLength(1);
            expect(result.syncedAt).toBe('2024-01-01T00:00:00.000Z');
            expect(getLastSyncedAt()).toBe('2024-01-01T00:00:00.000Z');
        });

        it('should handle empty server data', async () => {
            const mockResponse = {
                success: true,
                data: {
                    papers: [],
                    collections: [],
                    annotations: [],
                    syncedAt: '2024-01-01T00:00:00.000Z'
                }
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse)
            );

            const result = await fullSync();

            expect(result.papers).toEqual([]);
            expect(result.collections).toEqual([]);
            expect(result.annotations).toEqual([]);
        });

        it('should throw error on API failure', async () => {
            const mockResponse = {
                success: false,
                message: 'Server error'
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse, false, 500)
            );

            await expect(fullSync()).rejects.toThrow('Server error');
        });

        it('should throw error when not authenticated', async () => {
            clearMockAuth();
            const { getAccessToken } = await import('../../api/auth.js');
            getAccessToken.mockReturnValueOnce(null);

            await expect(fullSync()).rejects.toThrow('Not authenticated');
        });

        it('should refresh token on 401 and retry', async () => {
            const { refreshToken } = await import('../../api/auth.js');
            
            // First call returns 401
            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse({}, false, 401)
            );

            // Second call succeeds after refresh
            const mockResponse = {
                success: true,
                data: {
                    papers: [],
                    collections: [],
                    annotations: [],
                    syncedAt: '2024-01-01T00:00:00.000Z'
                }
            };
            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse)
            );

            await fullSync();

            expect(refreshToken).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(global.fetch).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer new-access-token'
                    })
                })
            );
        });
    });

    describe('incrementalSync', () => {
        it('should send local changes and receive server changes', async () => {
            const localChanges = {
                papers: {
                    created: [{ title: 'New Paper', status: 'Reading' }],
                    updated: [{ id: 1, title: 'Updated Paper' }],
                    deleted: [2]
                },
                collections: { created: [], updated: [], deleted: [] },
                annotations: { created: [], updated: [], deleted: [] }
            };

            const mockResponse = {
                success: true,
                data: {
                    appliedChanges: {
                        papers: [{ id: 1 }]
                    },
                    serverChanges: {
                        papers: [{ id: 3, title: 'Server Paper', status: 'Reading' }]
                    },
                    syncedAt: '2024-01-01T00:00:00.000Z'
                }
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse)
            );

            const result = await incrementalSync(localChanges);

            const fetchCall = global.fetch.mock.calls[0];
            expect(fetchCall[0]).toBe('https://api.example.com/api/sync/incremental');
            expect(fetchCall[1].method).toBe('POST');
            
            const requestBody = JSON.parse(fetchCall[1].body);
            expect(requestBody.lastSyncedAt).toBeNull();
            expect(requestBody.changes).toEqual(localChanges);
            expect(requestBody.clientId).toMatch(/^client_/);

            expect(result.appliedChanges.papers).toHaveLength(1);
            expect(result.serverChanges.papers).toHaveLength(1);
            expect(result.syncedAt).toBe('2024-01-01T00:00:00.000Z');
            expect(getLastSyncedAt()).toBe('2024-01-01T00:00:00.000Z');
        });

        it('should include lastSyncedAt in request when available', async () => {
            const timestamp = '2024-01-01T00:00:00.000Z';
            setLastSyncedAt(timestamp);

            const mockResponse = {
                success: true,
                data: {
                    appliedChanges: {},
                    serverChanges: {},
                    syncedAt: timestamp
                }
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse)
            );

            await incrementalSync({ papers: { created: [], updated: [], deleted: [] }, collections: { created: [], updated: [], deleted: [] }, annotations: { created: [], updated: [], deleted: [] } });

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.lastSyncedAt).toBe(timestamp);
        });

        it('should throw error on API failure', async () => {
            const mockResponse = {
                success: false,
                message: 'Sync failed'
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse, false, 400)
            );

            await expect(incrementalSync({ 
                papers: { created: [], updated: [], deleted: [] },
                collections: { created: [], updated: [], deleted: [] },
                annotations: { created: [], updated: [], deleted: [] }
            })).rejects.toThrow('Sync failed');
        });
    });

    describe('getSyncStatus', () => {
        it('should fetch sync status from server', async () => {
            const mockResponse = {
                success: true,
                data: {
                    lastSyncedAt: '2024-01-01T00:00:00.000Z',
                    lastSyncAction: 'incremental',
                    lastClientId: 'client_123',
                    counts: {
                        papers: 10,
                        collections: 2,
                        annotations: 5
                    }
                }
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse)
            );

            const result = await getSyncStatus();

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.example.com/api/sync/status',
                expect.objectContaining({
                    method: 'GET'
                })
            );

            expect(result.lastSyncedAt).toBe('2024-01-01T00:00:00.000Z');
            expect(result.counts.papers).toBe(10);
            expect(result.counts.collections).toBe(2);
            expect(result.counts.annotations).toBe(5);
        });

        it('should handle empty counts', async () => {
            const mockResponse = {
                success: true,
                data: {
                    lastSyncedAt: null,
                    counts: {}
                }
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse)
            );

            const result = await getSyncStatus();

            expect(result.counts).toEqual({});
        });

        it('should throw error on API failure', async () => {
            const mockResponse = {
                success: false,
                message: 'Status check failed'
            };

            global.fetch.mockResolvedValueOnce(
                createMockFetchResponse(mockResponse, false, 500)
            );

            await expect(getSyncStatus()).rejects.toThrow('Status check failed');
        });
    });
});


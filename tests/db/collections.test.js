/**
 * Unit Tests for Collections DB Module
 * @module tests/db/collections
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as collectionsDb from '../../db/collections.js';
import { openDB, STORE_NAME_COLLECTIONS } from '../../db/core.js';

// Mock the core DB module
vi.mock('../../db/core.js', () => ({
    openDB: vi.fn(),
    STORE_NAME_COLLECTIONS: 'collections'
}));

describe('DB Collections Module', () => {
    let mockTransaction;
    let mockStore;
    let mockRequest;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup common mock objects
        mockRequest = {
            onsuccess: null,
            onerror: null
        };

        mockStore = {
            add: vi.fn().mockReturnValue(mockRequest),
            getAll: vi.fn().mockReturnValue(mockRequest),
            get: vi.fn().mockReturnValue(mockRequest),
            put: vi.fn().mockReturnValue(mockRequest),
            delete: vi.fn().mockReturnValue(mockRequest)
        };

        mockTransaction = {
            objectStore: vi.fn().mockReturnValue(mockStore)
        };

        openDB.mockResolvedValue({
            transaction: vi.fn().mockReturnValue(mockTransaction)
        });
    });

    describe('addCollection', () => {
        it('should throw error for invalid collection data', async () => {
            await expect(collectionsDb.addCollection(null)).rejects.toThrow('Invalid collection data');
            await expect(collectionsDb.addCollection('string')).rejects.toThrow('Invalid collection data');
        });

        it('should throw error if name is missing', async () => {
            await expect(collectionsDb.addCollection({})).rejects.toThrow('Name is required');
            await expect(collectionsDb.addCollection({ name: '' })).rejects.toThrow('Name is required');
            await expect(collectionsDb.addCollection({ name: '   ' })).rejects.toThrow('Name is required');
        });

        it('should add collection with default values', async () => {
            const collectionData = { name: 'My Collection' };

            // Setup success callback
            mockStore.add.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: 1 } });
                }, 0);
                return mockRequest;
            });

            const id = await collectionsDb.addCollection(collectionData);

            expect(id).toBe(1);
            expect(mockStore.add).toHaveBeenCalledWith(expect.objectContaining({
                name: 'My Collection',
                icon: 'folder',
                color: '#3B82F6',
                createdAt: expect.any(Date)
            }));
        });

        it('should handle QuotaExceededError', async () => {
            const collectionData = { name: 'My Collection' };

            // Setup error callback
            mockStore.add.mockImplementation(() => {
                setTimeout(() => {
                    const error = new Error('Quota exceeded');
                    error.name = 'QuotaExceededError';
                    mockRequest.onerror({ target: { error } });
                }, 0);
                return mockRequest;
            });

            await expect(collectionsDb.addCollection(collectionData)).rejects.toThrow('Storage quota exceeded');
        });

        it('should handle generic database errors', async () => {
            const collectionData = { name: 'My Collection' };

            // Setup error callback
            mockStore.add.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onerror({ target: { error: new Error('DB Error') } });
                }, 0);
                return mockRequest;
            });

            await expect(collectionsDb.addCollection(collectionData)).rejects.toThrow('Failed to add collection: DB Error');
        });
    });

    describe('getAllCollections', () => {
        it('should return all collections sorted by date', async () => {
            const date1 = new Date('2023-01-01');
            const date2 = new Date('2023-01-02');

            const collections = [
                { id: 1, name: 'Old', createdAt: date1 },
                { id: 2, name: 'New', createdAt: date2 }
            ];

            mockStore.getAll.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: collections } });
                }, 0);
                return mockRequest;
            });

            const result = await collectionsDb.getAllCollections();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('New'); // Newest first
            expect(result[1].name).toBe('Old');
        });

        it('should return empty array if no collections found', async () => {
            mockStore.getAll.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: null } });
                }, 0);
                return mockRequest;
            });

            const result = await collectionsDb.getAllCollections();
            expect(result).toEqual([]);
        });

        it('should handle sorting errors gracefully', async () => {
            const collections = [
                { id: 1, name: 'A' }, // Missing createdAt
                { id: 2, name: 'B' }
            ];

            mockStore.getAll.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: collections } });
                }, 0);
                return mockRequest;
            });

            // Should not throw, just return unsorted/partially sorted
            const result = await collectionsDb.getAllCollections();
            expect(result).toHaveLength(2);
        });

        it('should handle database errors', async () => {
            mockStore.getAll.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onerror({ target: { error: new Error('Read Error') } });
                }, 0);
                return mockRequest;
            });

            await expect(collectionsDb.getAllCollections()).rejects.toThrow('Failed to retrieve collections');
        });
    });

    describe('getCollectionById', () => {
        it('should throw error for invalid ID', async () => {
            await expect(collectionsDb.getCollectionById(null)).rejects.toThrow('Invalid collection ID');
            await expect(collectionsDb.getCollectionById({})).rejects.toThrow('Invalid collection ID');
        });

        it('should return collection if found', async () => {
            const collection = { id: 1, name: 'Test' };

            mockStore.get.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: collection } });
                }, 0);
                return mockRequest;
            });

            const result = await collectionsDb.getCollectionById(1);
            expect(result).toEqual(collection);
        });

        it('should return undefined if not found', async () => {
            mockStore.get.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: undefined } });
                }, 0);
                return mockRequest;
            });

            const result = await collectionsDb.getCollectionById(999);
            expect(result).toBeUndefined();
        });

        it('should handle database errors', async () => {
            mockStore.get.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onerror({ target: { error: new Error('Read Error') } });
                }, 0);
                return mockRequest;
            });

            await expect(collectionsDb.getCollectionById(1)).rejects.toThrow('Failed to retrieve collection');
        });
    });

    describe('updateCollection', () => {
        it('should throw error for invalid inputs', async () => {
            await expect(collectionsDb.updateCollection(null, {})).rejects.toThrow('Invalid collection ID');
            await expect(collectionsDb.updateCollection(1, null)).rejects.toThrow('Invalid update data');
        });

        it('should update existing collection', async () => {
            const existing = { id: 1, name: 'Old Name', icon: 'folder' };

            // Mock get success
            mockStore.get.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: existing } });
                }, 0);
                return mockRequest;
            });

            // Mock put success
            mockStore.put.mockImplementation(() => {
                const putRequest = { onsuccess: null, onerror: null };
                setTimeout(() => {
                    putRequest.onsuccess({ target: { result: 1 } });
                }, 0);
                return putRequest;
            });

            const result = await collectionsDb.updateCollection(1, { name: 'New Name' });

            expect(result).toBe(1);
            expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
                id: 1,
                name: 'New Name',
                icon: 'folder'
            }));
        });

        it('should throw error if collection not found', async () => {
            mockStore.get.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: undefined } });
                }, 0);
                return mockRequest;
            });

            await expect(collectionsDb.updateCollection(999, { name: 'New' })).rejects.toThrow('Collection not found');
        });

        it('should handle get error during update', async () => {
            mockStore.get.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onerror({ target: { error: new Error('Read Error') } });
                }, 0);
                return mockRequest;
            });

            await expect(collectionsDb.updateCollection(1, { name: 'New' })).rejects.toThrow('Failed to update');
        });

        it('should handle put error during update', async () => {
            const existing = { id: 1, name: 'Old' };

            mockStore.get.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess({ target: { result: existing } });
                }, 0);
                return mockRequest;
            });

            mockStore.put.mockImplementation(() => {
                const putRequest = { onsuccess: null, onerror: null };
                setTimeout(() => {
                    putRequest.onerror({ target: { error: new Error('Write Error') } });
                }, 0);
                return putRequest;
            });

            await expect(collectionsDb.updateCollection(1, { name: 'New' })).rejects.toThrow('Failed to update collection: Write Error');
        });
    });

    describe('deleteCollection', () => {
        it('should throw error for invalid ID', async () => {
            await expect(collectionsDb.deleteCollection(null)).rejects.toThrow('Invalid collection ID');
        });

        it('should delete collection successfully', async () => {
            mockStore.delete.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onsuccess();
                }, 0);
                return mockRequest;
            });

            await collectionsDb.deleteCollection(1);
            expect(mockStore.delete).toHaveBeenCalledWith(1);
        });

        it('should handle database errors', async () => {
            mockStore.delete.mockImplementation(() => {
                setTimeout(() => {
                    mockRequest.onerror({ target: { error: new Error('Delete Error') } });
                }, 0);
                return mockRequest;
            });

            await expect(collectionsDb.deleteCollection(1)).rejects.toThrow('Failed to delete collection');
        });
    });
});

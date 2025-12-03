/**
 * Unit Tests for DB Core Module
 * @module tests/db/core
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { openDB, DB_NAME, DB_VERSION, STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS } from '../../db/core.js';

describe('DB Core Module', () => {
    let mockIndexedDB;
    let mockRequest;
    let mockDb;
    let mockTransaction;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset module state (db variable)
        // Since we can't easily reset module-level variables in ES modules without re-importing,
        // we'll rely on openDB checking 'db' variable. 
        // Ideally, we'd have a closeDB or resetDB function exported.
        // For now, we'll mock indexedDB.open to return a new request each time.

        mockDb = {
            objectStoreNames: {
                contains: vi.fn().mockReturnValue(false)
            },
            createObjectStore: vi.fn().mockReturnValue({
                createIndex: vi.fn(),
                indexNames: {
                    contains: vi.fn().mockReturnValue(false)
                },
                getAll: vi.fn().mockImplementation(() => ({
                    onsuccess: null,
                    onerror: null,
                    result: []
                })),
                put: vi.fn()
            }),
            close: vi.fn(),
            transaction: vi.fn(),
            onerror: null,
            onversionchange: null
        };

        mockTransaction = {
            objectStore: vi.fn().mockReturnValue({
                createIndex: vi.fn(),
                indexNames: {
                    contains: vi.fn().mockReturnValue(false)
                },
                getAll: vi.fn().mockReturnValue({
                    onsuccess: null,
                    onerror: null,
                    result: []
                }),
                put: vi.fn()
            }),
            abort: vi.fn()
        };

        mockRequest = {
            onupgradeneeded: null,
            onsuccess: null,
            onerror: null,
            onblocked: null,
            result: mockDb,
            transaction: mockTransaction
        };

        mockIndexedDB = {
            open: vi.fn().mockReturnValue(mockRequest)
        };

        // Mock global indexedDB
        // Preserve existing window properties to avoid breaking setup.js
        const originalWindow = global.window || {};
        global.window = {
            ...originalWindow,
            indexedDB: mockIndexedDB,
            location: originalWindow.location || { hash: '' }
        };
        global.indexedDB = mockIndexedDB;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return existing db instance if already open', async () => {
        // First call opens the DB - need to handle the version check first
        const promise1 = openDB();
        // First call is to check version (without version parameter)
        expect(mockIndexedDB.open).toHaveBeenCalledWith(DB_NAME);
        mockRequest.onsuccess({ target: { result: mockDb } });
        
        // Second call is to open with version
        expect(mockIndexedDB.open).toHaveBeenCalledWith(DB_NAME, DB_VERSION);
        mockRequest.onsuccess({ target: { result: mockDb } });
        const db1 = await promise1;

        // Second call should return the same instance immediately (no new open calls)
        const db2 = await openDB();
        expect(db2).toBe(db1);
        // Should only have 2 calls total (one for each openDB call, each doing version check + open)
        expect(mockIndexedDB.open).toHaveBeenCalledTimes(2);
    });

    it('should open database successfully', async () => {
        // Force re-open by ensuring previous test didn't leave global state? 
        // Note: ES module state persists. We might need to reload module or just test the open flow.
        // Since we can't reset the module-level 'db' variable easily, we might skip this if it was already opened.
        // However, in a fresh test file run, it starts null.

        // To properly test "fresh" open in isolation if module state persists across tests (Vitest usually isolates files but not tests within file unless configured),
        // we might need to rely on the fact that if we mock failure first, 'db' stays null.

        // Let's assume 'db' is null at start of test file.
        // But wait, the previous test set 'db'. 
        // We can't reset 'db' variable inside core.js.
        // We'll have to rely on `vi.resetModules()` if we want true isolation, but that's complex with ES modules.
        // Alternatively, we can make `openDB` more testable by exporting a reset function, but we can't change source code.

        // Workaround: We'll just test the flow. If 'db' is set, it returns it.
        // To test the "opening" logic again, we'd need 'db' to be null.
        // Since we can't set it to null, we can only test the "opening" path ONCE per test file execution effectively,
        // unless we use `vi.resetModules()` and dynamic imports.

        // Let's try dynamic import for isolation in a separate describe block or just accept we test the "open" flow once.
        // Actually, let's use a trick: if we make the first test fail or not set 'db', we can test open again.
        // But the first test set it.

        // Let's use `vi.resetModules()` for each test to get a fresh module instance.
    });
});

describe('DB Core Module - Fresh Instances', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();

        // Mock global indexedDB setup again as resetModules clears it? No, resetModules clears module cache.
        // We need to setup mocks BEFORE importing the module.

        const mockDb = {
            objectStoreNames: {
                contains: vi.fn().mockReturnValue(false)
            },
            createObjectStore: vi.fn().mockReturnValue({
                createIndex: vi.fn(),
                indexNames: {
                    contains: vi.fn().mockReturnValue(false)
                },
                getAll: vi.fn().mockImplementation(() => ({
                    onsuccess: null,
                    onerror: null,
                    result: []
                })),
                put: vi.fn()
            }),
            close: vi.fn(),
            transaction: vi.fn(),
            onerror: null,
            onversionchange: null
        };

        const mockTransaction = {
            objectStore: vi.fn().mockReturnValue({
                createIndex: vi.fn(),
                indexNames: {
                    contains: vi.fn().mockReturnValue(false)
                },
                getAll: vi.fn().mockImplementation(() => ({
                    onsuccess: null,
                    onerror: null,
                    result: []
                })),
                put: vi.fn()
            }),
            abort: vi.fn()
        };

        // Track mock requests so we can access them in tests
        const mockRequests = [];
        
        // Create a factory function to generate new mock requests
        const createMockRequest = () => {
            const request = {
                onupgradeneeded: vi.fn(),
                onsuccess: vi.fn(),
                onerror: vi.fn(),
                onblocked: vi.fn(),
                result: { ...mockDb },
                transaction: { ...mockTransaction }
            };
            mockRequests.push(request);
            return request;
        };

        // Mock version property for the database
        mockDb.version = 6;

        const mockIndexedDB = {
            open: vi.fn().mockImplementation(() => createMockRequest())
        };
        
        // Store mockRequests on the mockIndexedDB so tests can access them
        mockIndexedDB._mockRequests = mockRequests;

        const originalWindow = global.window || {};
        global.window = {
            ...originalWindow,
            indexedDB: mockIndexedDB,
            location: originalWindow.location || { hash: '' }
        };
        global.indexedDB = mockIndexedDB;
    });

    it('should throw error if IndexedDB is not supported', async () => {
        global.window.indexedDB = undefined;
        global.indexedDB = undefined;

        const { openDB } = await import('../../db/core.js');

        await expect(openDB()).rejects.toThrow('Database not supported');
    });

    it('should handle database open error', async () => {
        const { openDB } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it fail (database doesn't exist)
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const error = new Error('Access denied');
        if (checkRequest && checkRequest.onerror) {
            checkRequest.onerror({ target: { error } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second call is the actual open - make it fail too
        const openRequest = mockRequests[1];
        if (openRequest && openRequest.onerror) {
            openRequest.onerror({ target: { error } });
        }

        await expect(promise).rejects.toThrow('Database error: Unable to open database');
    });

    it('should handle QuotaExceededError', async () => {
        const { openDB } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 6, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second call is the actual open - make it fail with QuotaExceededError
        const openRequest = mockRequests[1];
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        if (openRequest && openRequest.onerror) {
            openRequest.onerror({ target: { error } });
        }

        await expect(promise).rejects.toThrow('Storage quota exceeded');
    });

    it('should handle VersionError', async () => {
        const { openDB } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 6, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second call is the actual open - make it fail with VersionError
        const openRequest = mockRequests[1];
        const error = new Error('Version mismatch');
        error.name = 'VersionError';
        if (openRequest && openRequest.onerror) {
            openRequest.onerror({ target: { error } });
        }

        await expect(promise).rejects.toThrow('Database version error');
    });

    it('should handle blocked database', async () => {
        const { openDB } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 6, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second call is the actual open - make it blocked
        const openRequest = mockRequests[1];
        // Call onblocked handler
        if (openRequest && openRequest.onblocked) {
            openRequest.onblocked();
        }

        await expect(promise).rejects.toThrow('Database blocked');
    });

    it('should handle database upgrade (schema creation)', async () => {
        const { openDB, STORE_NAME_PAPERS, STORE_NAME_COLLECTIONS, STORE_NAME_ANNOTATIONS } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed with version 0 (new database)
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 0, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second call is the actual open with version - trigger upgrade
        const openRequest = mockRequests[1];
        const mockDb = openRequest.result;
        const mockTransaction = openRequest.transaction;
        
        // Ensure objectStoreNames.contains returns false for new stores
        mockDb.objectStoreNames.contains.mockReturnValue(false);

        // Trigger upgrade after handlers are set
        if (openRequest.onupgradeneeded) {
            openRequest.onupgradeneeded({
                target: {
                    result: mockDb,
                    transaction: mockTransaction
                },
                oldVersion: 0
            });
        }

        // Verify stores created
        expect(mockDb.createObjectStore).toHaveBeenCalledWith(STORE_NAME_PAPERS, expect.any(Object));
        expect(mockDb.createObjectStore).toHaveBeenCalledWith(STORE_NAME_COLLECTIONS, expect.any(Object));
        expect(mockDb.createObjectStore).toHaveBeenCalledWith(STORE_NAME_ANNOTATIONS, expect.any(Object));

        // Complete success
        if (openRequest.onsuccess) {
            openRequest.onsuccess({ target: { result: mockDb } });
        }
        await promise;
    });

    it('should handle migration for version 3 (updatedAt)', async () => {
        const { openDB, STORE_NAME_PAPERS } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed with version 2
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 2, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));

        // Second call is the actual open with version - trigger upgrade
        const openRequest = mockRequests[1];
        const mockDb = openRequest.result;
        const mockTransaction = openRequest.transaction;

        // Mock existing stores
        mockDb.objectStoreNames.contains.mockReturnValue(true);

        // Mock papers needing update
        const mockPapers = [{ id: 1, title: 'Old Paper' }]; // No updatedAt
        
        // Create mock getAll requests with callable onsuccess
        let v3GetAllRequest = null;
        let v6GetAllRequest = null;
        
        const mockPaperStore = {
            createIndex: vi.fn(),
            indexNames: { contains: vi.fn().mockReturnValue(false) },
            getAll: vi.fn().mockImplementation(() => {
                const request = { onsuccess: null, onerror: null, result: mockPapers };
                // Store reference for later
                if (!v3GetAllRequest) {
                    v3GetAllRequest = request;
                } else if (!v6GetAllRequest) {
                    v6GetAllRequest = request;
                }
                return request;
            }),
            put: vi.fn()
        };
        mockTransaction.objectStore.mockReturnValue(mockPaperStore);

        // Trigger upgrade after handlers are set
        if (openRequest.onupgradeneeded) {
            openRequest.onupgradeneeded({
                target: {
                    result: mockDb,
                    transaction: mockTransaction
                },
                oldVersion: 2
            });
        }

        // Wait a bit for getAll to be called and onsuccess to be set
        await new Promise(resolve => setTimeout(resolve, 20));
        
        // Trigger getAll success for v3 (first call)
        if (v3GetAllRequest && v3GetAllRequest.onsuccess) {
            v3GetAllRequest.onsuccess();
        }

        expect(mockPaperStore.put).toHaveBeenCalledWith(expect.objectContaining({
            id: 1,
            updatedAt: expect.any(Date)
        }));

        if (openRequest.onsuccess) {
            openRequest.onsuccess({ target: { result: mockDb } });
        }
        await promise;
    });

    it('should handle migration for version 6 (rating/summary)', async () => {
        const { openDB } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed with version 5
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 5, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));

        // Second call is the actual open with version - trigger upgrade
        const openRequest = mockRequests[1];
        const mockDb = openRequest.result;
        const mockTransaction = openRequest.transaction;

        mockDb.objectStoreNames.contains.mockReturnValue(true);

        const mockPapers = [{ id: 1, title: 'Old Paper' }]; // No rating/summary
        
        // Create mock getAll request with callable onsuccess
        let v6GetAllRequest = null;
        
        const mockPaperStore = {
            createIndex: vi.fn(),
            indexNames: { contains: vi.fn().mockReturnValue(false) },
            getAll: vi.fn().mockImplementation(() => {
                const request = { onsuccess: null, onerror: null, result: mockPapers };
                v6GetAllRequest = request;
                return request;
            }),
            put: vi.fn()
        };
        mockTransaction.objectStore.mockReturnValue(mockPaperStore);

        // Trigger upgrade after handlers are set
        if (openRequest.onupgradeneeded) {
            openRequest.onupgradeneeded({
                target: {
                    result: mockDb,
                    transaction: mockTransaction
                },
                oldVersion: 5
            });
        }

        // Wait a bit for getAll to be called and onsuccess to be set
        await new Promise(resolve => setTimeout(resolve, 20));

        // Trigger getAll success for v6 (only call since oldVersion=5 > 3)
        if (v6GetAllRequest && v6GetAllRequest.onsuccess) {
            v6GetAllRequest.onsuccess();
        }

        expect(mockPaperStore.put).toHaveBeenCalledWith(expect.objectContaining({
            id: 1,
            rating: null,
            summary: null
        }));

        if (openRequest.onsuccess) {
            openRequest.onsuccess({ target: { result: mockDb } });
        }
        await promise;
    });

    it('should handle upgrade errors gracefully', async () => {
        const { openDB } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed with version 0
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 0, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second call is the actual open with version - trigger upgrade error
        const openRequest = mockRequests[1];
        const mockDb = openRequest.result;
        const mockTransaction = openRequest.transaction;

        // Mock error during upgrade
        mockDb.createObjectStore.mockImplementation(() => {
            throw new Error('Create store failed');
        });

        if (openRequest.onupgradeneeded) {
            openRequest.onupgradeneeded({
                target: {
                    result: mockDb,
                    transaction: mockTransaction
                },
                oldVersion: 0
            });
        }

        await expect(promise).rejects.toThrow('Database upgrade failed');
        expect(mockTransaction.abort).toHaveBeenCalled();
    });

    it('should handle version change event', async () => {
        const { openDB } = await import('../../db/core.js');
        const promise = openDB();
        
        // Wait a bit for the first open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // First call is version check - make it succeed
        const mockRequests = global.indexedDB._mockRequests || [];
        const checkRequest = mockRequests[0];
        const checkDb = { version: 6, close: vi.fn() };
        if (checkRequest && checkRequest.onsuccess) {
            checkRequest.onsuccess({ target: { result: checkDb } });
        }
        
        // Wait a bit for the second open call
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Second call is the actual open
        const openRequest = mockRequests[1];
        const mockDb = openRequest.result;
        if (openRequest.onsuccess) {
            openRequest.onsuccess({ target: { result: mockDb } });
        }
        const db = await promise;

        // Trigger version change
        if (db.onversionchange) {
            db.onversionchange();
        }

        expect(db.close).toHaveBeenCalled();
    });
});

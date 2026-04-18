/**
 * Coverage Tests for DB Data Module
 * Focuses on cloud sync integration and error handling
 * @module tests/db/data-coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { importData, exportAllData, clearAllData } from '../../db/data.js';
import * as configModule from '../../config.js';
import * as authModule from '../../api/auth.js';
import * as userApiModule from '../../api/user.js';
import * as importApiModule from '../../api/import.js';
import * as papersModule from '../../db/papers.js';
import * as foldersModule from '../../db/folders.js';
import * as paperFoldersModule from '../../db/paperFolders.js';
import * as annotationsModule from '../../db/annotations.js';
import * as coreModule from '../../db/core.js';

// Mock dependencies
vi.mock('../../config.js');
vi.mock('../../api/auth.js');
vi.mock('../../api/user.js');
vi.mock('../../api/import.js');
vi.mock('../../db/papers.js');
vi.mock('../../db/folders.js');
vi.mock('../../db/paperFolders.js');
vi.mock('../../db/annotations.js');
vi.mock('../../db/core.js');

describe('DB Data Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        configModule.isCloudSyncEnabled.mockReturnValue(false);
        authModule.isAuthenticated.mockReturnValue(false);

        // Mock DB transaction for clearAllData
        const mockTransaction = {
            objectStore: vi.fn().mockReturnValue({
                clear: vi.fn().mockReturnValue({
                    onsuccess: null,
                    onerror: null
                })
            }),
            oncomplete: null,
            onerror: null
        };

        coreModule.openDB.mockResolvedValue({
            transaction: vi.fn().mockReturnValue(mockTransaction),
            objectStoreNames: {
                contains: vi.fn().mockReturnValue(true)
            }
        });

        // Mock add functions
        papersModule.addPaper.mockResolvedValue(1);
        foldersModule.addFolder.mockResolvedValue(1);
        annotationsModule.addAnnotation.mockResolvedValue(1);

        // Mock get functions
        papersModule.getAllPapers.mockResolvedValue([]);
        foldersModule.getAllFolders.mockResolvedValue([]);
        paperFoldersModule.getAllPaperFolders.mockResolvedValue([]);
        annotationsModule.getAnnotationsByPaperId.mockResolvedValue([]);
    });

    describe('importData with Cloud Sync', () => {
        it('should trigger cloud batch import when sync is enabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            importApiModule.batchImport.mockResolvedValue({ data: { summary: 'success' } });

            // Mock transaction for clearing existing data
            const mockTransaction = {
                objectStore: vi.fn().mockReturnValue({ clear: vi.fn() }),
                oncomplete: null
            };
            coreModule.openDB.mockResolvedValue({
                transaction: vi.fn().mockReturnValue(mockTransaction),
                objectStoreNames: { contains: vi.fn().mockReturnValue(true) }
            });

            const dataToImport = {
                papers: [{ title: 'Paper 1', authors: ['Author 1'] }],
                folders: [{ name: 'Folder 1' }],
                annotations: [{ content: 'Note 1', paperId: 1 }]
            };

            // Trigger transaction complete manually
            setTimeout(() => {
                if (mockTransaction.oncomplete) mockTransaction.oncomplete();
            }, 0);

            await importData(dataToImport);

            expect(importApiModule.batchImport).toHaveBeenCalled();
            const callArgs = importApiModule.batchImport.mock.calls[0][0];
            expect(callArgs.papers).toHaveLength(1);
            expect(callArgs.folders).toHaveLength(1);
            expect(callArgs.annotations).toHaveLength(1);
        });

        it('should handle cloud batch import failure gracefully', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            importApiModule.batchImport.mockRejectedValue(new Error('Network error'));

            // Mock transaction
            const mockTransaction = {
                objectStore: vi.fn().mockReturnValue({ clear: vi.fn() }),
                oncomplete: null
            };
            coreModule.openDB.mockResolvedValue({
                transaction: vi.fn().mockReturnValue(mockTransaction),
                objectStoreNames: { contains: vi.fn().mockReturnValue(true) }
            });

            setTimeout(() => {
                if (mockTransaction.oncomplete) mockTransaction.oncomplete();
            }, 0);

            const dataToImport = {
                papers: [{ title: 'Paper 1' }]
            };

            // Should not throw
            await expect(importData(dataToImport)).resolves.not.toThrow();
            expect(papersModule.addPaper).toHaveBeenCalled(); // Local import still succeeds
        });

        it('should strip PDF data from cloud import payload', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            importApiModule.batchImport.mockResolvedValue({ data: { summary: 'success' } });

            const mockTransaction = {
                objectStore: vi.fn().mockReturnValue({ clear: vi.fn() }),
                oncomplete: null
            };
            coreModule.openDB.mockResolvedValue({
                transaction: vi.fn().mockReturnValue(mockTransaction),
                objectStoreNames: { contains: vi.fn().mockReturnValue(true) }
            });

            setTimeout(() => {
                if (mockTransaction.oncomplete) mockTransaction.oncomplete();
            }, 0);

            const dataToImport = {
                papers: [{
                    title: 'Paper with PDF',
                    pdfFile: 'data:application/pdf;base64,JVBERi0xLjQK...'
                }]
            };

            await importData(dataToImport);

            const callArgs = importApiModule.batchImport.mock.calls[0][0];
            expect(callArgs.papers[0].pdfData).toBeUndefined();
            expect(callArgs.papers[0].pdfFile).toBeUndefined();
        });
    });

    describe('clearAllData with Cloud Sync', () => {
        it('should clear cloud data when sync is enabled', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            userApiModule.clearAllUserData.mockResolvedValue({ deleted: { papers: 1 } });

            const mockTransaction = {
                objectStore: vi.fn().mockReturnValue({ clear: vi.fn() }),
                oncomplete: null,
                onerror: null
            };
            coreModule.openDB.mockResolvedValue({
                transaction: vi.fn().mockReturnValue(mockTransaction),
                objectStoreNames: { contains: vi.fn().mockReturnValue(true) }
            });

            // Trigger transaction complete manually
            setTimeout(() => {
                if (mockTransaction.oncomplete) mockTransaction.oncomplete();
            }, 0);

            await clearAllData();

            expect(userApiModule.clearAllUserData).toHaveBeenCalled();
        });

        it('should throw if cloud clear fails', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            userApiModule.clearAllUserData.mockRejectedValue(new Error('API Error'));

            await expect(clearAllData()).rejects.toThrow('Failed to clear cloud data');
        });
    });

    describe('exportAllData Error Handling', () => {
        it('should handle PDF conversion errors gracefully', async () => {
            const mockBlob = new Blob(['test'], { type: 'application/pdf' });
            papersModule.getAllPapers.mockResolvedValue([{
                title: 'Paper 1',
                pdfData: mockBlob
            }]);

            // Mock FileReader error
            global.FileReader = class {
                readAsDataURL() {
                    this.onerror();
                }
            };

            const result = await exportAllData();

            expect(result.papers[0].pdfFile).toBeNull();
            expect(result.papers[0]._pdfExportError).toBe(true);
        });

        it('should handle annotation retrieval errors', async () => {
            papersModule.getAllPapers.mockResolvedValue([{ id: 1, title: 'Paper 1' }]);
            annotationsModule.getAnnotationsByPaperId.mockRejectedValue(new Error('DB Error'));

            const result = await exportAllData();

            expect(result.annotations).toHaveLength(0); // Should continue without annotations
        });
    });
});

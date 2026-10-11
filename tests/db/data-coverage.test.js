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
        // A transaction stub that completes every transaction it is handed,
        // including the second one importData opens to re-key local records.
        const mockAutoCompletingDB = () => {
            const makeTransaction = () => {
                const tx = { objectStore: vi.fn().mockReturnValue({ clear: vi.fn() }), onerror: null };
                Object.defineProperty(tx, 'oncomplete', { set(fn) { setTimeout(fn, 0); } });
                return tx;
            };
            coreModule.openDB.mockResolvedValue({
                transaction: vi.fn().mockImplementation(makeTransaction),
                objectStoreNames: { contains: vi.fn().mockReturnValue(true) }
            });
        };

        it('should replace the cloud library and re-key local records to server ids', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            papersModule.addPaper.mockImplementation(async (p) => p.id ?? 1);
            foldersModule.addFolder.mockImplementation(async (f) => f.id ?? 5);
            paperFoldersModule.addPaperToFolder.mockResolvedValue(1);
            annotationsModule.addAnnotation.mockResolvedValue(1);
            importApiModule.batchImport.mockResolvedValue({
                data: { summary: {}, idMap: { papers: { 1: 101 }, folders: { 5: 205 } }, droppedPdfRefs: [], warnings: [] }
            });
            mockAutoCompletingDB();

            const result = await importData({
                papers: [{ id: 1, title: 'Paper 1', authors: ['Author 1'] }],
                folders: [{ id: 5, name: 'Folder 1' }],
                paperFolders: [{ paperId: 1, folderId: 5 }],
                annotations: [{ content: 'Note 1', paperId: 1, type: 'note', pageNumber: 1 }]
            });

            const callArgs = importApiModule.batchImport.mock.calls[0][0];
            expect(callArgs.mode).toBe('replace');
            expect(callArgs.papers).toEqual([expect.objectContaining({ title: 'Paper 1', ref: 1 })]);
            expect(callArgs.folders).toEqual([expect.objectContaining({ name: 'Folder 1', ref: 5 })]);
            expect(callArgs.paperFolders).toEqual([{ paperRef: 1, folderRef: 5 }]);
            expect(callArgs.annotations).toEqual([expect.objectContaining({ paperRef: 1 })]);

            // Local records rewritten under the server ids
            expect(papersModule.addPaper).toHaveBeenLastCalledWith(expect.objectContaining({ id: 101, title: 'Paper 1' }));
            expect(foldersModule.addFolder).toHaveBeenLastCalledWith(expect.objectContaining({ id: 205 }));
            expect(paperFoldersModule.addPaperToFolder).toHaveBeenLastCalledWith(101, 205);
            expect(annotationsModule.addAnnotation).toHaveBeenLastCalledWith(expect.objectContaining({ paperId: 101 }));
            expect(result.cloud).toBe('synced');
        });

        it('should report a failed cloud import without re-keying', async () => {
            configModule.isCloudSyncEnabled.mockReturnValue(true);
            authModule.isAuthenticated.mockReturnValue(true);
            papersModule.addPaper.mockImplementation(async (p) => p.id ?? 1);
            importApiModule.batchImport.mockRejectedValue(new Error('Network error'));
            mockAutoCompletingDB();

            const result = await importData({ papers: [{ id: 1, title: 'Paper 1' }] });

            expect(result.cloud).toBe('failed');
            expect(papersModule.addPaper).toHaveBeenCalledTimes(1);
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
            papersModule.addPaper.mockImplementation(async (p) => p.id ?? 1);
            importApiModule.batchImport.mockResolvedValue({ data: { summary: {}, idMap: { papers: { 1: 101 } } } });
            mockAutoCompletingDB();

            await importData({
                papers: [{ id: 1, title: 'Paper with PDF', pdfFile: 'data:application/pdf;base64,JVBERi0xLjQK' }]
            });

            const callArgs = importApiModule.batchImport.mock.calls[0][0];
            expect(callArgs.papers[0].pdfData).toBeUndefined();
            expect(callArgs.papers[0].pdfFile).toBeUndefined();
            // The embedded PDF stays on the re-keyed local record
            expect(papersModule.addPaper).toHaveBeenLastCalledWith(expect.objectContaining({ id: 101, pdfData: expect.any(Blob) }));
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

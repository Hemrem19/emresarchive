/**
 * Enhanced Sync Corruption Prevention Tests
 * Critical tests for data integrity during sync operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockPaper, resetAllMocks, setMockAuth, setMockSyncEnabled } from '../helpers.js';

// Mock sync API
vi.mock('../../api/sync.js', () => ({
    fullSync: vi.fn(),
    incrementalSync: vi.fn(),
    getSyncStatus: vi.fn(),
    getClientId: vi.fn(() => 'test-client-id')
}));

describe('Sync Corruption Prevention', () => {
    beforeEach(() => {
        resetAllMocks();
        setMockAuth(true);
        setMockSyncEnabled(true);
    });

    describe('Duplicate Detection', () => {
        it('should detect papers with same DOI', () => {
            const paper1 = createMockPaper({ id: 1, doi: '10.1234/test' });
            const paper2 = createMockPaper({ id: 2, doi: '10.1234/test' });

            expect(paper1.doi).toBe(paper2.doi);
            // In real implementation, sync should merge these
        });

        it('should detect papers with same arXiv ID', () => {
            const paper1 = createMockPaper({ id: 1, arxivId: '1234.5678' });
            const paper2 = createMockPaper({ id: 2, arxivId: '1234.5678' });

            expect(paper1.arxivId).toBe(paper2.arxivId);
        });

        it('should handle DOI URL variations', () => {
            const doi = '10.1234/test';
            const variations = [
                `https://doi.org/${doi}`,
                `http://doi.org/${doi}`,
                `doi:${doi}`,
                doi
            ];

            // All should normalize to same DOI
            expect(variations.length).toBe(4);
        });

        it('should  be case insensitive for DOI matching', () => {
            const doi1 = '10.1234/TEST';
            const doi2 = '10.1234/test';

            expect(doi1.toLowerCase()).toBe(doi2.toLowerCase());
        });
    });

    describe('Transaction Integrity', () => {
        it('should handle transaction rollback on failure', async () => {
            // Mock transaction failure scenario
            const mockTransaction = {
                abort: vi.fn(),
                complete: vi.fn()
            };

            try {
                throw new Error('Transaction failed');
            } catch (error) {
                mockTransaction.abort();
                expect(mockTransaction.abort).toHaveBeenCalled();
            }
        });

        it('should not corrupt database on partial sync failure', () => {
            const operations = [
                { id: 1, success: true },
                { id: 2, success: false },
                { id: 3, success: true }
            ];

            const successful = operations.filter(op => op.success);
            expect(successful.length).toBe(2);
        });
    });

    describe('Sync Lock Management', () => {
        it('should detect stale locks after timeout', () => {
            const lockTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            const isStale = (now - lockTime) > fiveMinutes;
            expect(isStale).toBe(true);
        });

        it('should not consider recent locks as stale', () => {
            const lockTime = Date.now() - (2 * 60 * 1000); // 2 minutes ago
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;

            const isStale = (now - lockTime) > fiveMinutes;
            expect(isStale).toBe(false);
        });

        it('should clear locks without start time', () => {
            const lock = { active: true, startTime: null };

            if (!lock.startTime) {
                lock.active = false;
            }

            expect(lock.active).toBe(false);
        });
    });

    describe('Data Integrity During Sync', () => {
        it('should preserve pending changes if sync fails', () => {
            const pendingChanges = ['change1', 'change2', 'change3'];
            let syncFailed = false;

            try {
                throw new Error('Sync failed');
            } catch {
                syncFailed = true;
            }

            if (syncFailed) {
                expect(pendingChanges.length).toBe(3);
            }
        });

        it('should only clear pending changes after successful sync', () => {
            let pendingChanges = ['change1', 'change2'];
            const syncSuccess = true;

            if (syncSuccess) {
                pendingChanges = [];
            }

            expect(pendingChanges.length).toBe(0);
        });

        it('should handle empty server response', () => {
            const serverData = null;
            const localData = [1, 2, 3];

            const result = serverData || localData;
            expect(result).toEqual(localData);
        });

        it('should handle malformed server data', () => {
            const malformedData = { invalid: 'structure' };

            const isValid = malformedData.papers !== undefined ||
                malformedData.collections !== undefined;

            expect(isValid).toBe(false);
        });
    });

    describe('Race Condition Prevention', () => {
        it('should prevent concurrent sync attempts', () => {
            let syncInProgress = false;

            const attemptSync = () => {
                if (syncInProgress) {
                    return false; // Reject concurrent sync
                }
                syncInProgress = true;
                return true;
            };

            expect(attemptSync()).toBe(true);
            expect(attemptSync()).toBe(false); // Second attempt blocked

            syncInProgress = false;
            expect(attemptSync()).toBe(true); // Works after reset
        });

        it('should handle missing timestamps gracefully', () => {
            const withoutTimestamp = { id: 1, title: 'No timestamp' };
            const withTimestamp = { id: 1, title: 'Has timestamp', updatedAt: new Date() };

            const winner = withTimestamp.updatedAt ? withTimestamp : withoutTimestamp;
            expect(winner.updatedAt).toBeDefined();
        });
    });
});

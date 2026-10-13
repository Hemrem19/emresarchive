import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    currentLibrary, currentGroupId, inGroupLibrary, dbName, lastSyncedKey, libraryHeaders,
    syncRoom, openLibrary, rememberOpened, clearGroupData, PERSONAL_DB_NAME,
} from '../core/library.js';

beforeEach(() => {
    localStorage.clear();
});

describe('core/library', () => {
    it('defaults to the personal library with the existing database and keys', () => {
        expect(currentLibrary()).toBe('personal');
        expect(currentGroupId()).toBeNull();
        expect(inGroupLibrary()).toBe(false);
        expect(dbName()).toBe(PERSONAL_DB_NAME);
        expect(dbName()).toBe('CitaversDB');
        expect(lastSyncedKey()).toBe('citavers:lastSyncedAt');
        expect(libraryHeaders()).toEqual({});
        expect(syncRoom()).toBe('personal');
    });

    it('gives a group its own database, sync marker, header and room', () => {
        openLibrary(12, { reload: false });
        expect(currentLibrary()).toBe('group:12');
        expect(currentGroupId()).toBe(12);
        expect(dbName()).toBe('CitaversDB-group-12');
        expect(lastSyncedKey()).toBe('citavers:lastSyncedAt:group:12');
        expect(libraryHeaders()).toEqual({ 'X-Library': 'group:12' });
        expect(syncRoom()).toBe('group:12');
    });

    it('ignores a malformed stored value', () => {
        localStorage.setItem('citavers:library', 'group:abc');
        expect(currentLibrary()).toBe('personal');
    });

    it('returns to the personal library', () => {
        openLibrary(3, { reload: false });
        openLibrary('personal', { reload: false });
        expect(currentLibrary()).toBe('personal');
        expect(localStorage.getItem('citavers:library')).toBeNull();
    });

    it('clearGroupData removes group copies and markers, and keeps personal ones', async () => {
        localStorage.setItem('citavers:lastSyncedAt', 'personal-time');
        localStorage.setItem('citavers:lastSyncedAt:group:4', 'group-time');
        openLibrary(4, { reload: false });
        rememberOpened('CitaversDB-group-4');
        rememberOpened('CitaversDB'); // never recorded

        const deleted = [];
        const original = indexedDB.deleteDatabase.bind(indexedDB);
        const spy = vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation((name) => {
            deleted.push(name);
            return original(name);
        });
        await clearGroupData();
        spy.mockRestore();

        expect(deleted).toContain('CitaversDB-group-4');
        expect(deleted).not.toContain('CitaversDB');
        expect(localStorage.getItem('citavers:lastSyncedAt:group:4')).toBeNull();
        expect(localStorage.getItem('citavers:lastSyncedAt')).toBe('personal-time');
        expect(currentLibrary()).toBe('personal');
    });
});

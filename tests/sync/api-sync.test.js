/**
 * Tests for api/sync.js
 * Sync API client: data mapping
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
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

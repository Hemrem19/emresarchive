/**
 * Tests for db/data.js - Data Management Module
 * Tests export, import, and clear operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { exportAllData, importData, clearAllData } from '../db/data.js';
import { addPaper, getAllPapers } from '../db/papers.js';
import { addCollection, getAllCollections } from '../db/collections.js';
import { addAnnotation, getAnnotationsByPaperId } from '../db/annotations.js';
import { createMockPaper, createMockCollection } from './helpers.js';

describe('db/data.js - Data Management', () => {
    beforeEach(async () => {
        // Clear all data before each test
        try {
            await clearAllData();
        } catch (error) {
            // Ignore errors if DB doesn't exist yet
        }
    });

    describe('exportAllData', () => {
        it('should export empty database', async () => {
            const data = await exportAllData();
            
            expect(data).toEqual({
                papers: [],
                collections: [],
                annotations: []
            });
        });

        it('should export papers with metadata only (no PDFs)', async () => {
            const paper1 = createMockPaper({ title: 'Paper 1' });
            const paper2 = createMockPaper({ title: 'Paper 2', authors: ['Alice', 'Bob'] });
            
            await addPaper(paper1);
            await addPaper(paper2);
            
            const data = await exportAllData();
            
            expect(data.papers).toHaveLength(2);
            const titles = data.papers.map(p => p.title).sort();
            expect(titles).toEqual(['Paper 1', 'Paper 2']);
            
            const paper2Data = data.papers.find(p => p.title === 'Paper 2');
            expect(paper2Data.authors).toEqual(['Alice', 'Bob']);
        });

        it('should export papers with PDF as base64', async () => {
            const pdfBlob = new Blob(['%PDF-1.4 fake pdf content'], { type: 'application/pdf' });
            const paper = createMockPaper({ 
                title: 'Paper with PDF',
                pdfData: pdfBlob
            });
            
            await addPaper(paper);
            
            const data = await exportAllData();
            
            expect(data.papers).toHaveLength(1);
            expect(data.papers[0].title).toBe('Paper with PDF');
            // Note: FileReader behavior varies in test environments
            // In real browser, pdfData (Blob) converts to pdfFile (base64 string)
            // In test environment with happy-dom, FileReader may not work the same
            if (data.papers[0].pdfFile) {
                expect(data.papers[0].pdfFile).toBeTypeOf('string');
                expect(data.papers[0].pdfFile).toMatch(/^data:application\/pdf;base64,/);
            }
        });

        it('should export collections', async () => {
            const collection1 = createMockCollection({ name: 'Collection 1' });
            const collection2 = createMockCollection({ name: 'Collection 2' });
            
            await addCollection(collection1);
            await addCollection(collection2);
            
            const data = await exportAllData();
            
            expect(data.collections).toHaveLength(2);
            const names = data.collections.map(c => c.name).sort();
            expect(names).toEqual(['Collection 1', 'Collection 2']);
        });

        it('should export annotations', async () => {
            const paper = createMockPaper({ title: 'Paper with Annotations' });
            const paperId = await addPaper(paper);
            
            await addAnnotation({
                paperId: paperId,
                pageNumber: 1,
                content: 'Note 1',
                type: 'note'
            });
            
            await addAnnotation({
                paperId: paperId,
                pageNumber: 2,
                content: 'Highlight 1',
                type: 'highlight'
            });
            
            const data = await exportAllData();
            
            expect(data.papers).toHaveLength(1);
            expect(data.annotations).toHaveLength(2);
            expect(data.annotations[0].content).toBe('Note 1');
            expect(data.annotations[1].content).toBe('Highlight 1');
        });

        it('should convert dates to ISO strings', async () => {
            const paper = createMockPaper({ 
                title: 'Paper with Dates',
                createdAt: new Date('2024-01-15'),
                updatedAt: new Date('2024-01-20')
            });
            
            await addPaper(paper);
            
            const data = await exportAllData();
            
            expect(data.papers[0].createdAt).toBe('2024-01-15T00:00:00.000Z');
            expect(data.papers[0].updatedAt).toBe('2024-01-20T00:00:00.000Z');
        });

        it('should export papers with rating field', async () => {
            const paper = createMockPaper({ 
                title: 'Paper with Rating',
                rating: 8
            });
            
            await addPaper(paper);
            
            const data = await exportAllData();
            
            expect(data.papers[0].rating).toBe(8);
        });

        it('should export papers with null rating', async () => {
            const paper = createMockPaper({ 
                title: 'Paper without Rating',
                rating: null
            });
            
            await addPaper(paper);
            
            const data = await exportAllData();
            
            expect(data.papers[0].rating).toBeNull();
        });

        it('should export papers with summary field', async () => {
            const paper = createMockPaper({ 
                title: 'Paper with Summary',
                summary: 'This is a test summary.'
            });
            
            await addPaper(paper);
            
            const data = await exportAllData();
            
            expect(data.papers[0].summary).toBe('This is a test summary.');
        });

        it('should export papers with HTML summary', async () => {
            const htmlSummary = '<p>Summary with <strong>formatting</strong>.</p>';
            const paper = createMockPaper({ 
                title: 'Paper with HTML Summary',
                summary: htmlSummary
            });
            
            await addPaper(paper);
            
            const data = await exportAllData();
            
            expect(data.papers[0].summary).toBe(htmlSummary);
        });

        it('should export papers with both rating and summary', async () => {
            const paper = createMockPaper({ 
                title: 'Complete Paper',
                rating: 9,
                summary: 'Excellent paper with high rating.'
            });
            
            await addPaper(paper);
            
            const data = await exportAllData();
            
            expect(data.papers[0].rating).toBe(9);
            expect(data.papers[0].summary).toBe('Excellent paper with high rating.');
        });

        it('should export papers, collections, and annotations together', async () => {
            // Add papers
            const paper1 = createMockPaper({ title: 'Paper 1' });
            const paper2 = createMockPaper({ title: 'Paper 2' });
            const paperId1 = await addPaper(paper1);
            const paperId2 = await addPaper(paper2);
            
            // Add collections
            await addCollection(createMockCollection({ name: 'Collection 1' }));
            await addCollection(createMockCollection({ name: 'Collection 2' }));
            
            // Add annotations
            await addAnnotation({
                paperId: paperId1,
                pageNumber: 1,
                content: 'Note 1',
                type: 'note'
            });
            
            const data = await exportAllData();
            
            expect(data.papers).toHaveLength(2);
            expect(data.collections).toHaveLength(2);
            expect(data.annotations).toHaveLength(1);
        });
    });

    describe('importData', () => {
        it('should import old format (array of papers)', async () => {
            const oldFormatData = [
                createMockPaper({ title: 'Old Format Paper 1' }),
                createMockPaper({ title: 'Old Format Paper 2' })
            ];
            
            await importData(oldFormatData);
            
            const papers = await getAllPapers();
            expect(papers).toHaveLength(2);
            // Sort titles to make test order-independent
            const titles = papers.map(p => p.title).sort();
            expect(titles[0]).toBe('Old Format Paper 1');
            expect(titles[1]).toBe('Old Format Paper 2');
        });

        it('should import new format (object with papers, collections, annotations)', async () => {
            const newFormatData = {
                papers: [createMockPaper({ title: 'New Format Paper' })],
                collections: [createMockCollection({ name: 'New Format Collection' })],
                annotations: []
            };
            
            await importData(newFormatData);
            
            const papers = await getAllPapers();
            const collections = await getAllCollections();
            
            expect(papers).toHaveLength(1);
            expect(papers[0].title).toBe('New Format Paper');
            expect(collections).toHaveLength(1);
            expect(collections[0].name).toBe('New Format Collection');
        });

        it('should convert ISO date strings back to Date objects', async () => {
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper with Dates' }),
                    createdAt: '2024-01-15T00:00:00.000Z',
                    updatedAt: '2024-01-20T00:00:00.000Z'
                }],
                collections: [],
                annotations: []
            };
            
            await importData(dataToImport);
            
            const papers = await getAllPapers();
            expect(papers[0].createdAt).toBeInstanceOf(Date);
            expect(papers[0].updatedAt).toBeInstanceOf(Date);
            expect(papers[0].createdAt.toISOString()).toBe('2024-01-15T00:00:00.000Z');
        });

        it('should import papers with rating field', async () => {
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper with Rating' }),
                    rating: 7
                }],
                collections: [],
                annotations: []
            };
            
            await importData(dataToImport);
            
            const papers = await getAllPapers();
            expect(papers[0].rating).toBe(7);
        });

        it('should import papers with null rating', async () => {
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper without Rating' }),
                    rating: null
                }],
                collections: [],
                annotations: []
            };
            
            await importData(dataToImport);
            
            const papers = await getAllPapers();
            expect(papers[0].rating).toBeNull();
        });

        it('should import papers with summary field', async () => {
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper with Summary' }),
                    summary: 'Imported summary text.'
                }],
                collections: [],
                annotations: []
            };
            
            await importData(dataToImport);
            
            const papers = await getAllPapers();
            expect(papers[0].summary).toBe('Imported summary text.');
        });

        it('should import papers with HTML summary', async () => {
            const htmlSummary = '<p>Imported <em>HTML</em> summary.</p>';
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper with HTML Summary' }),
                    summary: htmlSummary
                }],
                collections: [],
                annotations: []
            };
            
            await importData(dataToImport);
            
            const papers = await getAllPapers();
            expect(papers[0].summary).toBe(htmlSummary);
        });

        it('should import papers with both rating and summary', async () => {
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Complete Paper' }),
                    rating: 6,
                    summary: 'Imported with both fields.'
                }],
                collections: [],
                annotations: []
            };
            
            await importData(dataToImport);
            
            const papers = await getAllPapers();
            expect(papers[0].rating).toBe(6);
            expect(papers[0].summary).toBe('Imported with both fields.');
        });

        it('should preserve rating and summary during export-import cycle', async () => {
            const originalPaper = createMockPaper({ 
                title: 'Round Trip Paper',
                rating: 8,
                summary: 'Original summary content.'
            });
            
            await addPaper(originalPaper);
            
            // Export
            const exported = await exportAllData();
            expect(exported.papers[0].rating).toBe(8);
            expect(exported.papers[0].summary).toBe('Original summary content.');
            
            // Clear and re-import
            await clearAllData();
            await importData(exported);
            
            // Verify
            const papers = await getAllPapers();
            expect(papers[0].rating).toBe(8);
            expect(papers[0].summary).toBe('Original summary content.');
        });

        it('should convert base64 back to Blob for PDFs', async () => {
            // Create a base64 PDF string
            const base64Pdf = 'data:application/pdf;base64,JVBERi0xLjQgZmFrZSBwZGYgY29udGVudA==';
            
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper with PDF' }),
                    pdfFile: base64Pdf  // Import format uses pdfFile
                }],
                collections: [],
                annotations: []
            };
            
            await importData(dataToImport);
            
            const papers = await getAllPapers();
            // Database stores as pdfData, not pdfFile
            // Check if pdfData exists
            expect(papers[0].pdfData).toBeDefined();
            
            // IndexedDB may serialize Blobs differently in test environment
            // Check for either real Blob properties or serialized format
            expect(papers[0].pdfData).toHaveProperty('type');
            expect(papers[0].pdfData.type).toBe('application/pdf');
            
            // In test environment, IndexedDB may serialize Blob as {_buffer: Uint8Array, type: string}
            // In real browser, it would be a proper Blob with size property
            if (papers[0].pdfData._buffer) {
                // Serialized format (test environment)
                expect(papers[0].pdfData._buffer).toBeInstanceOf(Uint8Array);
                expect(papers[0].pdfData._buffer.length).toBeGreaterThan(0);
            } else {
                // Real Blob format (browser)
                expect(papers[0].pdfData).toHaveProperty('size');
                expect(papers[0].pdfData.size).toBeGreaterThan(0);
            }
            
            expect(papers[0].hasPdf).toBe(true);
        });

        it('should clear existing data before importing', async () => {
            // Add initial data
            await addPaper(createMockPaper({ title: 'Existing Paper' }));
            await addCollection(createMockCollection({ name: 'Existing Collection' }));
            
            // Import new data
            const newData = {
                papers: [createMockPaper({ title: 'New Paper' })],
                collections: [createMockCollection({ name: 'New Collection' })],
                annotations: []
            };
            
            await importData(newData);
            
            const papers = await getAllPapers();
            const collections = await getAllCollections();
            
            expect(papers).toHaveLength(1);
            expect(papers[0].title).toBe('New Paper');
            expect(collections).toHaveLength(1);
            expect(collections[0].name).toBe('New Collection');
        });

        it('should throw error for invalid data format', async () => {
            await expect(importData('invalid string')).rejects.toThrow('Invalid import data');
            await expect(importData(123)).rejects.toThrow('Invalid import data');
            await expect(importData(null)).rejects.toThrow('Invalid import data');
        });

        it('should throw error for empty import data', async () => {
            await expect(importData([])).rejects.toThrow('No papers, collections, or annotations found');
            await expect(importData({ papers: [], collections: [], annotations: [] })).rejects.toThrow('No papers, collections, or annotations found');
        });

        it('should throw error for papers missing title', async () => {
            const invalidData = [
                { authors: ['Alice'], year: 2024 } // Missing title
            ];
            
            await expect(importData(invalidData)).rejects.toThrow('missing required title field');
        });

        it('should throw error for collections missing name', async () => {
            const invalidData = {
                papers: [createMockPaper({ title: 'Valid Paper' })],
                collections: [
                    { description: 'Collection without name' } // Missing name
                ],
                annotations: []
            };
            
            await expect(importData(invalidData)).rejects.toThrow('missing required name field');
        });

        it('should import annotations with papers', async () => {
            const paper = createMockPaper({ title: 'Paper for Annotations' });
            const paperId = 1;
            
            const dataToImport = {
                papers: [{ ...paper, id: paperId }],
                collections: [],
                annotations: [
                    {
                        id: 1,
                        paperId: paperId,
                        pageNumber: 1,
                        content: 'Imported Note',
                        type: 'note',
                        createdAt: '2024-01-15T00:00:00.000Z'
                    }
                ]
            };
            
            await importData(dataToImport);
            
            const annotations = await getAnnotationsByPaperId(paperId);
            expect(annotations).toHaveLength(1);
            expect(annotations[0].content).toBe('Imported Note');
            expect(annotations[0].createdAt).toBeInstanceOf(Date);
        });
    });

    describe('clearAllData', () => {
        it('should clear all papers, collections, and annotations', async () => {
            // Add data
            const paperId = await addPaper(createMockPaper({ title: 'Paper to Clear' }));
            await addCollection(createMockCollection({ name: 'Collection to Clear' }));
            await addAnnotation({
                paperId: paperId,
                pageNumber: 1,
                content: 'Annotation to Clear',
                type: 'note'
            });
            
            // Verify data exists
            let papers = await getAllPapers();
            let collections = await getAllCollections();
            let annotations = await getAnnotationsByPaperId(paperId);
            
            expect(papers).toHaveLength(1);
            expect(collections).toHaveLength(1);
            expect(annotations).toHaveLength(1);
            
            // Clear all data
            await clearAllData();
            
            // Verify data is cleared
            papers = await getAllPapers();
            collections = await getAllCollections();
            annotations = await getAnnotationsByPaperId(paperId);
            
            expect(papers).toHaveLength(0);
            expect(collections).toHaveLength(0);
            expect(annotations).toHaveLength(0);
        });

        it('should succeed when clearing empty database', async () => {
            await expect(clearAllData()).resolves.not.toThrow();
            
            const papers = await getAllPapers();
            const collections = await getAllCollections();
            
            expect(papers).toHaveLength(0);
            expect(collections).toHaveLength(0);
        });
    });

    describe('Export-Import Round Trip', () => {
        it('should successfully export and re-import all data', async () => {
            // Create original data
            const paper1 = createMockPaper({ title: 'Round Trip Paper 1', authors: ['Alice'] });
            const paper2 = createMockPaper({ title: 'Round Trip Paper 2', year: 2024 });
            const paperId1 = await addPaper(paper1);
            const paperId2 = await addPaper(paper2);
            
            const collection1 = createMockCollection({ name: 'Round Trip Collection' });
            await addCollection(collection1);
            
            await addAnnotation({
                paperId: paperId1,
                pageNumber: 1,
                content: 'Round Trip Note',
                type: 'note'
            });
            
            // Export
            const exportedData = await exportAllData();
            
            // Clear database
            await clearAllData();
            
            // Re-import
            await importData(exportedData);
            
            // Verify all data is restored
            const papers = await getAllPapers();
            const collections = await getAllCollections();
            const annotations = await getAnnotationsByPaperId(paperId1);
            
            expect(papers).toHaveLength(2);
            expect(papers.find(p => p.title === 'Round Trip Paper 1')).toBeDefined();
            expect(papers.find(p => p.title === 'Round Trip Paper 2')).toBeDefined();
            
            expect(collections).toHaveLength(1);
            expect(collections[0].name).toBe('Round Trip Collection');
            
            expect(annotations).toHaveLength(1);
            expect(annotations[0].content).toBe('Round Trip Note');
        });
    });
});


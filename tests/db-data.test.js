/**
 * Tests for db/data.js - Data Management Module
 * Tests export, import, and clear operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { exportAllData, importData, clearAllData } from '../db/data.js';
import { addPaper, getAllPapers } from '../db/papers.js';
import { addFolder, getAllFolders } from '../db/folders.js';
import { addAnnotation, getAnnotationsByPaperId } from '../db/annotations.js';
import { createMockPaper, createMockFolder } from './helpers.js';

describe('db/data.js - Data Management', () => {
    beforeEach(async () => {
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
                folders: [],
                paperFolders: [],
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
            if (data.papers[0].pdfFile) {
                expect(data.papers[0].pdfFile).toBeTypeOf('string');
                expect(data.papers[0].pdfFile).toMatch(/^data:application\/pdf;base64,/);
            }
        });

        it('should export folders', async () => {
            const folder1 = createMockFolder({ name: 'Folder 1' });
            const folder2 = createMockFolder({ name: 'Folder 2' });

            await addFolder(folder1);
            await addFolder(folder2);

            const data = await exportAllData();

            expect(data.folders).toHaveLength(2);
            const names = data.folders.map(f => f.name).sort();
            expect(names).toEqual(['Folder 1', 'Folder 2']);
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

        it('should export papers, folders, and annotations together', async () => {
            const paper1 = createMockPaper({ title: 'Paper 1' });
            const paper2 = createMockPaper({ title: 'Paper 2' });
            const paperId1 = await addPaper(paper1);
            await addPaper(paper2);

            await addFolder(createMockFolder({ name: 'Folder 1' }));
            await addFolder(createMockFolder({ name: 'Folder 2' }));

            await addAnnotation({
                paperId: paperId1,
                pageNumber: 1,
                content: 'Note 1',
                type: 'note'
            });

            const data = await exportAllData();

            expect(data.papers).toHaveLength(2);
            expect(data.folders).toHaveLength(2);
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
            const titles = papers.map(p => p.title).sort();
            expect(titles[0]).toBe('Old Format Paper 1');
            expect(titles[1]).toBe('Old Format Paper 2');
        });

        it('should import new format (object with papers, folders, annotations)', async () => {
            const newFormatData = {
                papers: [createMockPaper({ title: 'New Format Paper' })],
                folders: [createMockFolder({ name: 'New Format Folder' })],
                annotations: []
            };

            await importData(newFormatData);

            const papers = await getAllPapers();
            const foldersResult = await getAllFolders();

            expect(papers).toHaveLength(1);
            expect(papers[0].title).toBe('New Format Paper');
            expect(foldersResult).toHaveLength(1);
            expect(foldersResult[0].name).toBe('New Format Folder');
        });

        it('should convert ISO date strings back to Date objects', async () => {
            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper with Dates' }),
                    createdAt: '2024-01-15T00:00:00.000Z',
                    updatedAt: '2024-01-20T00:00:00.000Z'
                }],
                folders: [],
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
                folders: [],
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
                folders: [],
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
                folders: [],
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
                folders: [],
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
                folders: [],
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

            const exported = await exportAllData();
            expect(exported.papers[0].rating).toBe(8);
            expect(exported.papers[0].summary).toBe('Original summary content.');

            await clearAllData();
            await importData(exported);

            const papers = await getAllPapers();
            expect(papers[0].rating).toBe(8);
            expect(papers[0].summary).toBe('Original summary content.');
        });

        it('should convert base64 back to Blob for PDFs', async () => {
            const base64Pdf = 'data:application/pdf;base64,JVBERi0xLjQgZmFrZSBwZGYgY29udGVudA==';

            const dataToImport = {
                papers: [{
                    ...createMockPaper({ title: 'Paper with PDF' }),
                    pdfFile: base64Pdf
                }],
                folders: [],
                annotations: []
            };

            await importData(dataToImport);

            const papers = await getAllPapers();
            expect(papers[0].pdfData).toBeDefined();
            expect(papers[0].pdfData).toHaveProperty('type');
            expect(papers[0].pdfData.type).toBe('application/pdf');

            if (papers[0].pdfData._buffer) {
                expect(papers[0].pdfData._buffer).toBeInstanceOf(Uint8Array);
                expect(papers[0].pdfData._buffer.length).toBeGreaterThan(0);
            } else {
                expect(papers[0].pdfData).toHaveProperty('size');
                expect(papers[0].pdfData.size).toBeGreaterThan(0);
            }

            expect(papers[0].hasPdf).toBe(true);
        });

        it('should clear existing data before importing', async () => {
            await addPaper(createMockPaper({ title: 'Existing Paper' }));
            await addFolder(createMockFolder({ name: 'Existing Folder' }));

            const newData = {
                papers: [createMockPaper({ title: 'New Paper' })],
                folders: [createMockFolder({ name: 'New Folder' })],
                annotations: []
            };

            await importData(newData);

            const papers = await getAllPapers();
            const foldersResult = await getAllFolders();

            expect(papers).toHaveLength(1);
            expect(papers[0].title).toBe('New Paper');
            expect(foldersResult).toHaveLength(1);
            expect(foldersResult[0].name).toBe('New Folder');
        });

        it('should throw error for invalid data format', async () => {
            await expect(importData('invalid string')).rejects.toThrow('Invalid import data');
            await expect(importData(123)).rejects.toThrow('Invalid import data');
            await expect(importData(null)).rejects.toThrow('Invalid import data');
        });

        it('should throw error for empty import data', async () => {
            await expect(importData([])).rejects.toThrow('No papers');
            await expect(importData({ papers: [], folders: [], annotations: [] })).rejects.toThrow('No papers');
        });

        it('should throw error for papers missing title', async () => {
            const invalidData = [
                { authors: ['Alice'], year: 2024 }
            ];

            await expect(importData(invalidData)).rejects.toThrow('missing required title field');
        });

        it('should throw error for folders missing name', async () => {
            const invalidData = {
                papers: [createMockPaper({ title: 'Valid Paper' })],
                folders: [
                    { color: 'red' } // Missing name
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
                folders: [],
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
        it('should clear all papers, folders, and annotations', async () => {
            const paperId = await addPaper(createMockPaper({ title: 'Paper to Clear' }));
            await addFolder(createMockFolder({ name: 'Folder to Clear' }));
            await addAnnotation({
                paperId: paperId,
                pageNumber: 1,
                content: 'Annotation to Clear',
                type: 'note'
            });

            let papers = await getAllPapers();
            let foldersResult = await getAllFolders();
            let annotations = await getAnnotationsByPaperId(paperId);

            expect(papers).toHaveLength(1);
            expect(foldersResult).toHaveLength(1);
            expect(annotations).toHaveLength(1);

            await clearAllData();

            papers = await getAllPapers();
            foldersResult = await getAllFolders();
            annotations = await getAnnotationsByPaperId(paperId);

            expect(papers).toHaveLength(0);
            expect(foldersResult).toHaveLength(0);
            expect(annotations).toHaveLength(0);
        });

        it('should succeed when clearing empty database', async () => {
            await expect(clearAllData()).resolves.not.toThrow();

            const papers = await getAllPapers();
            const foldersResult = await getAllFolders();

            expect(papers).toHaveLength(0);
            expect(foldersResult).toHaveLength(0);
        });
    });

    describe('Export-Import Round Trip', () => {
        it('should successfully export and re-import all data', async () => {
            const paper1 = createMockPaper({ title: 'Round Trip Paper 1', authors: ['Alice'] });
            const paper2 = createMockPaper({ title: 'Round Trip Paper 2', year: 2024 });
            const paperId1 = await addPaper(paper1);
            await addPaper(paper2);

            const folder1 = createMockFolder({ name: 'Round Trip Folder' });
            await addFolder(folder1);

            await addAnnotation({
                paperId: paperId1,
                pageNumber: 1,
                content: 'Round Trip Note',
                type: 'note'
            });

            const exportedData = await exportAllData();

            await clearAllData();

            await importData(exportedData);

            const papers = await getAllPapers();
            const foldersResult = await getAllFolders();
            const annotations = await getAnnotationsByPaperId(paperId1);

            expect(papers).toHaveLength(2);
            expect(papers.find(p => p.title === 'Round Trip Paper 1')).toBeDefined();
            expect(papers.find(p => p.title === 'Round Trip Paper 2')).toBeDefined();

            expect(foldersResult).toHaveLength(1);
            expect(foldersResult[0].name).toBe('Round Trip Folder');

            expect(annotations).toHaveLength(1);
            expect(annotations[0].content).toBe('Round Trip Note');
        });
    });
});

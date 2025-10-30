// Tests for db/papers.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDB } from '../db/core.js';
import { addPaper, getAllPapers, getPaperById, getPaperByDoi, updatePaper, deletePaper } from '../db/papers.js';
import { createMockPaper } from './helpers.js';

describe('db/papers.js', () => {
  beforeEach(async () => {
    // Initialize database before each test
    await openDB();
  });

  afterEach(async () => {
    // Clean up after each test
    const db = await openDB();
    const tx = db.transaction('papers', 'readwrite');
    await tx.objectStore('papers').clear();
    await tx.done;
  });

  describe('addPaper', () => {
    it('should add a new paper to the database', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id; // Remove id to let DB generate it

      const paperId = await addPaper(paper);

      expect(paperId).toBeDefined();
      expect(typeof paperId).toBe('number');
    });

    it('should auto-generate createdAt timestamp', async () => {
      const paper = createMockPaper({ id: undefined, createdAt: undefined });
      delete paper.id;
      delete paper.createdAt;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.createdAt).toBeDefined();
      expect(savedPaper.createdAt).toBeInstanceOf(Date);
    });

    it('should initialize readingProgress if not provided', async () => {
      const paper = createMockPaper({ id: undefined, readingProgress: undefined });
      delete paper.id;
      delete paper.readingProgress;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.readingProgress).toEqual({ currentPage: 0, totalPages: 0 });
    });

    it('should save paper with all fields', async () => {
      const paper = {
        title: 'Test Paper',
        authors: ['John Doe'],
        year: 2024,
        doi: '10.1234/test',
        tags: ['machine-learning'],
        readingStatus: 'Reading',
        notes: 'Test notes',
        pdfFile: null,
        relatedPaperIds: [2, 3]
      };

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.title).toBe('Test Paper');
      expect(savedPaper.authors).toEqual(['John Doe']);
      expect(savedPaper.year).toBe(2024);
      expect(savedPaper.doi).toBe('10.1234/test');
      expect(savedPaper.tags).toEqual(['machine-learning']);
      expect(savedPaper.readingStatus).toBe('Reading');
      expect(savedPaper.notes).toBe('Test notes');
      expect(savedPaper.relatedPaperIds).toEqual([2, 3]);
    });
  });

  describe('getAllPapers', () => {
    it('should return empty array when no papers exist', async () => {
      const papers = await getAllPapers();

      expect(papers).toEqual([]);
    });

    it('should return all papers from database', async () => {
      const paper1 = createMockPaper({ id: undefined, title: 'Paper 1' });
      const paper2 = createMockPaper({ id: undefined, title: 'Paper 2' });
      delete paper1.id;
      delete paper2.id;

      await addPaper(paper1);
      await addPaper(paper2);

      const papers = await getAllPapers();

      expect(papers).toHaveLength(2);
      expect(papers.map(p => p.title)).toContain('Paper 1');
      expect(papers.map(p => p.title)).toContain('Paper 2');
    });

    it('should include hasPdf flag', async () => {
      const paperWithPdf = createMockPaper({ id: undefined, pdfData: 'data:application/pdf;base64,test' });
      const paperWithoutPdf = createMockPaper({ id: undefined, pdfData: null });
      delete paperWithPdf.id;
      delete paperWithoutPdf.id;

      await addPaper(paperWithPdf);
      await addPaper(paperWithoutPdf);

      const papers = await getAllPapers();

      expect(papers[0].hasPdf).toBe(true);
      expect(papers[1].hasPdf).toBe(false);
    });
  });

  describe('getPaperById', () => {
    it('should return paper by id', async () => {
      const paper = createMockPaper({ id: undefined, title: 'Specific Paper' });
      delete paper.id;

      const paperId = await addPaper(paper);
      const retrievedPaper = await getPaperById(paperId);

      expect(retrievedPaper.title).toBe('Specific Paper');
      expect(retrievedPaper.id).toBe(paperId);
    });

    it('should return undefined for non-existent id', async () => {
      const paper = await getPaperById(99999);

      expect(paper).toBeUndefined();
    });

    it('should include hasPdf flag', async () => {
      const paper = createMockPaper({ id: undefined, pdfData: 'data:application/pdf;base64,test' });
      delete paper.id;

      const paperId = await addPaper(paper);
      const retrievedPaper = await getPaperById(paperId);

      expect(retrievedPaper.hasPdf).toBe(true);
    });
  });

  describe('getPaperByDoi', () => {
    it('should return paper by DOI', async () => {
      const paper = createMockPaper({ id: undefined, doi: '10.1234/unique' });
      delete paper.id;

      await addPaper(paper);
      const retrievedPaper = await getPaperByDoi('10.1234/unique');

      expect(retrievedPaper.doi).toBe('10.1234/unique');
    });

    it('should return undefined for non-existent DOI', async () => {
      const paper = await getPaperByDoi('10.9999/nonexistent');

      expect(paper).toBeUndefined();
    });

    it('should be case-sensitive', async () => {
      const paper = createMockPaper({ id: undefined, doi: '10.1234/Test' });
      delete paper.id;

      await addPaper(paper);
      
      const found = await getPaperByDoi('10.1234/Test');
      const notFound = await getPaperByDoi('10.1234/test');

      expect(found).toBeDefined();
      expect(notFound).toBeUndefined();
    });
  });

  describe('updatePaper', () => {
    it('should update existing paper', async () => {
      const paper = createMockPaper({ id: undefined, title: 'Original Title' });
      delete paper.id;

      const paperId = await addPaper(paper);
      await updatePaper(paperId, { title: 'Updated Title' });

      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.title).toBe('Updated Title');
    });

    it('should auto-update updatedAt timestamp', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;

      const paperId = await addPaper(paper);
      const originalPaper = await getPaperById(paperId);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await updatePaper(paperId, { notes: 'New notes' });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.updatedAt).toBeDefined();
      expect(updatedPaper.updatedAt.getTime()).toBeGreaterThan(originalPaper.createdAt.getTime());
    });

    it('should preserve fields not being updated', async () => {
      const paper = createMockPaper({ 
        id: undefined,
        title: 'Original Title',
        year: 2024,
        tags: ['ml', 'ai']
      });
      delete paper.id;

      const paperId = await addPaper(paper);
      await updatePaper(paperId, { title: 'New Title' });

      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.title).toBe('New Title');
      expect(updatedPaper.year).toBe(2024);
      expect(updatedPaper.tags).toEqual(['ml', 'ai']);
    });

    it('should reject update of non-existent paper', async () => {
      await expect(updatePaper(99999, { title: 'New Title' })).rejects.toThrow();
    });
  });

  describe('deletePaper', () => {
    it('should delete existing paper', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;

      const paperId = await addPaper(paper);
      await deletePaper(paperId);

      const deletedPaper = await getPaperById(paperId);

      expect(deletedPaper).toBeUndefined();
    });

    it('should not throw when deleting non-existent paper', async () => {
      await expect(deletePaper(99999)).resolves.not.toThrow();
    });

    it('should not affect other papers', async () => {
      const paper1 = createMockPaper({ id: undefined, title: 'Paper 1' });
      const paper2 = createMockPaper({ id: undefined, title: 'Paper 2' });
      delete paper1.id;
      delete paper2.id;

      const id1 = await addPaper(paper1);
      const id2 = await addPaper(paper2);

      await deletePaper(id1);

      const papers = await getAllPapers();

      expect(papers).toHaveLength(1);
      expect(papers[0].id).toBe(id2);
    });
  });
});


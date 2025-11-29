// Tests for rating and summary fields in db/papers.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDB } from '../db/core.js';
import { addPaper, getAllPapers, getPaperById, updatePaper } from '../db/papers.js';
import { createMockPaper } from './helpers.js';

describe('db/papers.js - Rating and Summary Fields', () => {
  beforeEach(async () => {
    await openDB();
  });

  afterEach(async () => {
    const db = await openDB();
    const tx = db.transaction('papers', 'readwrite');
    await tx.objectStore('papers').clear();
    await tx.done;
  });

  describe('addPaper with rating', () => {
    it('should save paper with rating field', async () => {
      const paper = createMockPaper({
        id: undefined,
        rating: 8
      });
      delete paper.id;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.rating).toBe(8);
    });

    it('should save paper with null rating', async () => {
      const paper = createMockPaper({
        id: undefined,
        rating: null
      });
      delete paper.id;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.rating).toBeNull();
    });

    it('should save paper without rating field (undefined)', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;
      delete paper.rating;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      // Should be null after migration
      expect(savedPaper.rating).toBeNull();
    });

    it('should validate rating range (1-10)', async () => {
      const paper1 = createMockPaper({ id: undefined, rating: 1 });
      const paper2 = createMockPaper({ id: undefined, rating: 10 });
      delete paper1.id;
      delete paper2.id;

      const id1 = await addPaper(paper1);
      const id2 = await addPaper(paper2);

      const saved1 = await getPaperById(id1);
      const saved2 = await getPaperById(id2);

      expect(saved1.rating).toBe(1);
      expect(saved2.rating).toBe(10);
    });
  });

  describe('addPaper with summary', () => {
    it('should save paper with summary field', async () => {
      const paper = createMockPaper({
        id: undefined,
        summary: 'This is a test summary of the paper.'
      });
      delete paper.id;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.summary).toBe('This is a test summary of the paper.');
    });

    it('should save paper with null summary', async () => {
      const paper = createMockPaper({
        id: undefined,
        summary: null
      });
      delete paper.id;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.summary).toBeNull();
    });

    it('should save paper with HTML summary', async () => {
      const htmlSummary = '<p>This is a <strong>rich text</strong> summary.</p>';
      const paper = createMockPaper({
        id: undefined,
        summary: htmlSummary
      });
      delete paper.id;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.summary).toBe(htmlSummary);
    });

    it('should save paper without summary field (undefined)', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;
      delete paper.summary;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      // Should be null after migration
      expect(savedPaper.summary).toBeNull();
    });
  });

  describe('addPaper with both rating and summary', () => {
    it('should save paper with both rating and summary', async () => {
      const paper = createMockPaper({
        id: undefined,
        rating: 9,
        summary: 'Excellent paper with groundbreaking research.'
      });
      delete paper.id;

      const paperId = await addPaper(paper);
      const savedPaper = await getPaperById(paperId);

      expect(savedPaper.rating).toBe(9);
      expect(savedPaper.summary).toBe('Excellent paper with groundbreaking research.');
    });
  });

  describe('updatePaper with rating', () => {
    it('should update rating field', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { rating: 7 });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.rating).toBe(7);
    });

    it('should update rating from null to value', async () => {
      const paper = createMockPaper({ id: undefined, rating: null });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { rating: 5 });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.rating).toBe(5);
    });

    it('should update rating from value to null', async () => {
      const paper = createMockPaper({ id: undefined, rating: 8 });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { rating: null });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.rating).toBeNull();
    });

    it('should update rating multiple times', async () => {
      const paper = createMockPaper({ id: undefined, rating: 5 });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { rating: 7 });
      await updatePaper(paperId, { rating: 9 });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.rating).toBe(9);
    });
  });

  describe('updatePaper with summary', () => {
    it('should update summary field', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { summary: 'Updated summary text.' });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.summary).toBe('Updated summary text.');
    });

    it('should update summary from null to value', async () => {
      const paper = createMockPaper({ id: undefined, summary: null });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { summary: 'New summary content.' });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.summary).toBe('New summary content.');
    });

    it('should update summary from value to null', async () => {
      const paper = createMockPaper({ id: undefined, summary: 'Original summary.' });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { summary: null });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.summary).toBeNull();
    });

    it('should update summary with HTML content', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;
      const paperId = await addPaper(paper);

      const htmlSummary = '<p>Summary with <em>formatting</em>.</p>';
      await updatePaper(paperId, { summary: htmlSummary });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.summary).toBe(htmlSummary);
    });
  });

  describe('updatePaper with both rating and summary', () => {
    it('should update both rating and summary together', async () => {
      const paper = createMockPaper({ id: undefined });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, {
        rating: 6,
        summary: 'Updated with both fields.'
      });
      const updatedPaper = await getPaperById(paperId);

      expect(updatedPaper.rating).toBe(6);
      expect(updatedPaper.summary).toBe('Updated with both fields.');
    });

    it('should update rating and summary independently', async () => {
      const paper = createMockPaper({
        id: undefined,
        rating: 5,
        summary: 'Original summary'
      });
      delete paper.id;
      const paperId = await addPaper(paper);

      await updatePaper(paperId, { rating: 8 });
      const afterRating = await getPaperById(paperId);
      expect(afterRating.rating).toBe(8);
      expect(afterRating.summary).toBe('Original summary');

      await updatePaper(paperId, { summary: 'New summary' });
      const afterSummary = await getPaperById(paperId);
      expect(afterSummary.rating).toBe(8);
      expect(afterSummary.summary).toBe('New summary');
    });
  });

  describe('getAllPapers with rating and summary', () => {
    it('should return papers with rating and summary fields', async () => {
      const paper1 = createMockPaper({ id: undefined, rating: 7, summary: 'Summary 1' });
      const paper2 = createMockPaper({ id: undefined, rating: null, summary: null });
      delete paper1.id;
      delete paper2.id;

      await addPaper(paper1);
      await addPaper(paper2);

      const papers = await getAllPapers();

      expect(papers).toHaveLength(2);
      expect(papers.find(p => p.rating === 7)).toBeTruthy();
      expect(papers.find(p => p.rating === null)).toBeTruthy();
      expect(papers.find(p => p.summary === 'Summary 1')).toBeTruthy();
    });
  });
});


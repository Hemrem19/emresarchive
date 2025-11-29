// Tests for rating display in paper cards (ui.js renderPaperList)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderPaperList } from '../ui.js';
import { createMockPaper } from './helpers.js';

describe('Rating Display in Paper Cards', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'paper-list';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should display rating badge when paper has rating', () => {
    const papers = [
      createMockPaper({ id: 1, rating: 8, title: 'Paper with Rating' })
    ];

    renderPaperList(papers, '', new Set());

    const paperCard = container.querySelector('.paper-card');
    expect(paperCard).toBeTruthy();
    expect(paperCard.innerHTML).toContain('8');
    expect(paperCard.innerHTML).toContain('star');
  });

  it('should not display rating badge when paper has null rating', () => {
    const papers = [
      createMockPaper({ id: 1, rating: null, title: 'Paper without Rating' })
    ];

    renderPaperList(papers, '', new Set());

    const paperCard = container.querySelector('.paper-card');
    expect(paperCard).toBeTruthy();
    // Should not contain rating badge
    const ratingBadge = paperCard.querySelector('[title*="Rating"]');
    expect(ratingBadge).toBeFalsy();
  });

  it('should not display rating badge when paper has undefined rating', () => {
    const papers = [
      createMockPaper({ id: 1, title: 'Paper without Rating' })
    ];
    delete papers[0].rating;

    renderPaperList(papers, '', new Set());

    const paperCard = container.querySelector('.paper-card');
    expect(paperCard).toBeTruthy();
    const ratingBadge = paperCard.querySelector('[title*="Rating"]');
    expect(ratingBadge).toBeFalsy();
  });

  it('should display rating badge with correct format', () => {
    const papers = [
      createMockPaper({ id: 1, rating: 9, title: 'High Rated Paper' })
    ];

    renderPaperList(papers, '', new Set());

    const paperCard = container.querySelector('.paper-card');
    const ratingBadge = paperCard.querySelector('[title*="Rating"]');
    expect(ratingBadge).toBeTruthy();
    expect(ratingBadge.textContent).toContain('9');
    expect(ratingBadge.getAttribute('title')).toContain('9/10');
  });

  it('should display rating badge for all rating values (1-10)', () => {
    for (let rating = 1; rating <= 10; rating++) {
      const papers = [createMockPaper({ id: 1, rating, title: `Paper ${rating}` })];
      container.innerHTML = '';
      renderPaperList(papers, '', new Set());

      const paperCard = container.querySelector('.paper-card');
      expect(paperCard.innerHTML).toContain(rating.toString());
    }
  });

  it('should display rating badge with correct CSS classes', () => {
    const papers = [
      createMockPaper({ id: 1, rating: 7, title: 'Styled Paper' })
    ];

    renderPaperList(papers, '', new Set());

    const paperCard = container.querySelector('.paper-card');
    const ratingBadge = paperCard.querySelector('[title*="Rating"]');
    expect(ratingBadge).toBeTruthy();
    expect(ratingBadge.className).toContain('inline-flex');
    expect(ratingBadge.className).toContain('items-center');
  });

  it('should display rating badge alongside other paper info', () => {
    const papers = [
      createMockPaper({
        id: 1,
        rating: 6,
        title: 'Complete Paper',
        authors: ['Author 1', 'Author 2'],
        year: 2024,
        tags: ['tag1', 'tag2']
      })
    ];

    renderPaperList(papers, '', new Set());

    const paperCard = container.querySelector('.paper-card');
    expect(paperCard.innerHTML).toContain('Complete Paper');
    expect(paperCard.innerHTML).toContain('6');
    expect(paperCard.innerHTML).toContain('2024');
  });

  it('should handle multiple papers with different ratings', () => {
    const papers = [
      createMockPaper({ id: 1, rating: 10, title: 'Perfect Paper' }),
      createMockPaper({ id: 2, rating: 5, title: 'Average Paper' }),
      createMockPaper({ id: 3, rating: null, title: 'Unrated Paper' }),
      createMockPaper({ id: 4, rating: 1, title: 'Low Rated Paper' })
    ];

    renderPaperList(papers, '', new Set());

    const paperCards = container.querySelectorAll('.paper-card');
    expect(paperCards).toHaveLength(4);

    // Check first paper has rating 10
    expect(paperCards[0].innerHTML).toContain('10');
    // Check second paper has rating 5
    expect(paperCards[1].innerHTML).toContain('5');
    // Check third paper has no rating badge
    expect(paperCards[2].querySelector('[title*="Rating"]')).toBeFalsy();
    // Check fourth paper has rating 1
    expect(paperCards[3].innerHTML).toContain('1');
  });
});


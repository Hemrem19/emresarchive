// Tests for details/summary.manager.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { summaryManager } from '../../details/summary.manager.js';
import { updatePaper } from '../../db/papers.js';
import { openDB } from '../../db/core.js';

// Mock updatePaper
vi.mock('../../db/papers.js', () => ({
  updatePaper: vi.fn()
}));

describe('details/summary.manager.js', () => {
  let summaryEditor;
  let toolbar;

  beforeEach(() => {
    // Create DOM elements
    summaryEditor = document.createElement('div');
    summaryEditor.id = 'summary-editor';
    summaryEditor.contentEditable = 'true';
    summaryEditor.innerHTML = '';

    toolbar = document.createElement('div');
    toolbar.id = 'summary-toolbar';
    toolbar.innerHTML = `
      <button data-command="bold">
        <span class="material-symbols-outlined">format_bold</span>
      </button>
      <button data-command="italic">
        <span class="material-symbols-outlined">format_italic</span>
      </button>
      <button data-command="insertUnorderedList">
        <span class="material-symbols-outlined">format_list_bulleted</span>
      </button>
      <button data-command="insertOrderedList">
        <span class="material-symbols-outlined">format_list_numbered</span>
      </button>
    `;

    document.body.appendChild(summaryEditor);
    document.body.appendChild(toolbar);

    // Mock document.execCommand
    global.document.execCommand = vi.fn(() => true);
  });

  afterEach(() => {
    summaryManager.cleanup(summaryEditor);
    if (summaryEditor.parentNode) {
      summaryEditor.parentNode.removeChild(summaryEditor);
    }
    if (toolbar.parentNode) {
      toolbar.parentNode.removeChild(toolbar);
    }
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize summary manager with paper ID and editor', () => {
      summaryManager.initialize(1, summaryEditor, 'Initial summary');

      expect(summaryEditor.innerHTML).toBe('Initial summary');
    });

    it('should initialize with empty string if no initial summary', () => {
      summaryManager.initialize(1, summaryEditor, null);

      expect(summaryEditor.innerHTML).toBe('');
    });

    it('should initialize with empty string if initial summary is undefined', () => {
      summaryManager.initialize(1, summaryEditor, undefined);

      expect(summaryEditor.innerHTML).toBe('');
    });

    it('should set up toolbar button handlers', () => {
      summaryManager.initialize(1, summaryEditor, '');

      const boldButton = toolbar.querySelector('button[data-command="bold"]');
      boldButton.click();

      expect(global.document.execCommand).toHaveBeenCalledWith('bold', false, null);
    });

    it('should handle all toolbar commands', () => {
      summaryManager.initialize(1, summaryEditor, '');

      const commands = ['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'];
      commands.forEach(command => {
        const button = toolbar.querySelector(`button[data-command="${command}"]`);
        button.click();
        expect(global.document.execCommand).toHaveBeenCalledWith(command, false, null);
      });
    });

    it('should focus editor after toolbar command', () => {
      summaryManager.initialize(1, summaryEditor, '');
      const focusSpy = vi.spyOn(summaryEditor, 'focus');

      const boldButton = toolbar.querySelector('button[data-command="bold"]');
      boldButton.click();

      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('save on blur', () => {
    it('should save summary when editor loses focus', async () => {
      summaryManager.initialize(1, summaryEditor, 'Initial');
      updatePaper.mockResolvedValue(1);

      summaryEditor.innerHTML = 'Updated summary';
      summaryEditor.dispatchEvent(new Event('blur'));

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updatePaper).toHaveBeenCalledWith(1, { summary: 'Updated summary' });
    });

    it('should not save if content has not changed', async () => {
      const initialSummary = 'Initial summary';
      summaryManager.initialize(1, summaryEditor, initialSummary);
      updatePaper.mockResolvedValue(1);

      summaryEditor.innerHTML = initialSummary;
      summaryEditor.dispatchEvent(new Event('blur'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updatePaper).not.toHaveBeenCalled();
    });

    it('should save HTML content', async () => {
      summaryManager.initialize(1, summaryEditor, '');
      updatePaper.mockResolvedValue(1);

      summaryEditor.innerHTML = '<p>Summary with <strong>formatting</strong>.</p>';
      summaryEditor.dispatchEvent(new Event('blur'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updatePaper).toHaveBeenCalledWith(1, {
        summary: '<p>Summary with <strong>formatting</strong>.</p>'
      });
    });

    it('should handle multiple blur events', async () => {
      summaryManager.initialize(1, summaryEditor, 'Initial');
      updatePaper.mockResolvedValue(1);

      summaryEditor.innerHTML = 'First update';
      summaryEditor.dispatchEvent(new Event('blur'));
      await new Promise(resolve => setTimeout(resolve, 0));

      summaryEditor.innerHTML = 'Second update';
      summaryEditor.dispatchEvent(new Event('blur'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updatePaper).toHaveBeenCalledTimes(2);
      expect(updatePaper).toHaveBeenNthCalledWith(1, 1, { summary: 'First update' });
      expect(updatePaper).toHaveBeenNthCalledWith(2, 1, { summary: 'Second update' });
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on cleanup', async () => {
      summaryManager.initialize(1, summaryEditor, 'Initial');
      updatePaper.mockResolvedValue(1);

      summaryManager.cleanup(summaryEditor);

      summaryEditor.innerHTML = 'Should not save';
      summaryEditor.dispatchEvent(new Event('blur'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updatePaper).not.toHaveBeenCalled();
    });

    it('should reset paper ID on cleanup', () => {
      summaryManager.initialize(1, summaryEditor, '');
      expect(summaryManager.paperId).toBe(1);

      summaryManager.cleanup(summaryEditor);
      expect(summaryManager.paperId).toBeNull();
    });

    it('should handle cleanup when not initialized', () => {
      expect(() => {
        summaryManager.cleanup(summaryEditor);
      }).not.toThrow();
    });

    it('should handle cleanup with null editor', () => {
      summaryManager.initialize(1, summaryEditor, '');
      expect(() => {
        summaryManager.cleanup(null);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty HTML content', async () => {
      summaryManager.initialize(1, summaryEditor, 'Initial');
      updatePaper.mockResolvedValue(1);

      summaryEditor.innerHTML = '';
      summaryEditor.dispatchEvent(new Event('blur'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updatePaper).toHaveBeenCalledWith(1, { summary: '' });
    });

    it('should handle whitespace-only content', async () => {
      summaryManager.initialize(1, summaryEditor, 'Initial');
      updatePaper.mockResolvedValue(1);

      summaryEditor.innerHTML = '   \n\t  ';
      summaryEditor.dispatchEvent(new Event('blur'));

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should save whitespace content
      expect(updatePaper).toHaveBeenCalled();
    });

    it('should handle very long summary content', async () => {
      summaryManager.initialize(1, summaryEditor, '');
      updatePaper.mockResolvedValue(1);

      const longSummary = 'A'.repeat(10000);
      summaryEditor.innerHTML = longSummary;
      summaryEditor.dispatchEvent(new Event('blur'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updatePaper).toHaveBeenCalledWith(1, { summary: longSummary });
    });
  });
});


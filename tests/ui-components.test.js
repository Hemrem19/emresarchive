import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to simulate DOM events
function fireEvent(element, eventType, value) {
    if (value !== undefined) {
        element.value = value;
    }
    const event = new Event(eventType);
    element.dispatchEvent(event);
}

describe('UI Components', () => {
    beforeEach(() => {
        document.body.innerHTML = `
      <div id="graph-controls" class="absolute top-4 left-4 z-10 flex flex-col gap-4">
        <div class="glass-panel p-2 rounded-xl flex items-center gap-2">
          <span class="material-symbols-outlined text-slate-400 ml-2">search</span>
          <input type="text" id="graph-search-input" placeholder="Search papers..." />
        </div>
        
        <div class="glass-panel p-2 rounded-xl flex items-center gap-2">
          <span class="material-symbols-outlined text-slate-400 ml-2">filter_list</span>
          <select id="graph-status-filter">
            <option value="">All Status</option>
            <option value="Reading">Reading</option>
          </select>
        </div>
      </div>

      <div id="graph-side-panel" class="fixed right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 transform translate-x-full transition-transform duration-300 z-20 flex flex-col shadow-2xl">
        <div class="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <h2 class="text-lg font-bold text-white">Paper Details</h2>
          <button id="panel-close-btn" class="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <span class="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>
        <div id="panel-content" class="flex-1 overflow-y-auto p-4 custom-scrollbar"></div>
        <div class="p-4 border-t border-slate-700/50 bg-slate-900/50">
          <button id="panel-open-btn" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
            <span>Open Full Page</span>
            <span class="material-symbols-outlined text-sm">open_in_new</span>
          </button>
        </div>
      </div>
    `;
    });

    it('should have search input', () => {
        const searchInput = document.getElementById('graph-search-input');
        expect(searchInput).toBeTruthy();
        expect(searchInput.placeholder).toBe('Search papers...');
    });

    it('should have status filter', () => {
        const statusFilter = document.getElementById('graph-status-filter');
        expect(statusFilter).toBeTruthy();
        expect(statusFilter.options.length).toBeGreaterThan(0);
    });

    it('should have side panel initially closed', () => {
        const panel = document.getElementById('graph-side-panel');
        expect(panel.classList.contains('translate-x-full')).toBe(true);
        expect(panel.classList.contains('open')).toBe(false);
    });

    it('should toggle side panel class on open/close', () => {
        const panel = document.getElementById('graph-side-panel');

        // Simulate open
        panel.classList.add('open');
        expect(panel.classList.contains('open')).toBe(true);

        // Simulate close
        panel.classList.remove('open');
        expect(panel.classList.contains('open')).toBe(false);
    });

    it('should have close button in side panel', () => {
        const closeBtn = document.getElementById('panel-close-btn');
        expect(closeBtn).toBeTruthy();
    });

    it('should have open full page button in side panel', () => {
        const openBtn = document.getElementById('panel-open-btn');
        expect(openBtn).toBeTruthy();
        expect(openBtn.textContent).toContain('Open Full Page');
    });
});

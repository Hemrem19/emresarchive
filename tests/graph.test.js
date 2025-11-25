import { describe, it, expect, vi, beforeEach } from 'vitest';
import { graphView } from '../graph.view.js';

// Mock dependencies
vi.mock('../api/network.js', () => ({
    getNetwork: vi.fn(),
    getUserNetworks: vi.fn(),
    generateNetwork: vi.fn()
}));

vi.mock('../db.js', () => ({
    getAllPapers: vi.fn()
}));

vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn(() => 'fake-token')
}));

// Mock vis-network
const mockNetworkInstance = {
    destroy: vi.fn(),
    on: vi.fn(),
    body: {
        data: {
            nodes: {
                get: vi.fn(),
                update: vi.fn()
            }
        }
    }
};

global.vis = {
    DataSet: vi.fn((data) => data),
    Network: vi.fn(() => mockNetworkInstance)
};

describe('Graph View', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = `
      <div id="graph-network"></div>
      <div id="graph-empty-state" class="hidden"></div>
      <div id="panel-content"></div>
      <div id="graph-side-panel"></div>
      <input id="graph-search-input" />
      <select id="graph-status-filter"></select>
      <select id="graph-tag-filter"></select>
    `;
    });

    it('should get correct node color based on status', () => {
        expect(graphView.getNodeColor('Reading').background).toBe('#3b82f6');
        expect(graphView.getNodeColor('To Read').background).toBe('#eab308');
        expect(graphView.getNodeColor('Completed').background).toBe('#22c55e');
        expect(graphView.getNodeColor('Unknown').background).toBe('#64748b');
    });

    it('should truncate long titles', () => {
        const longTitle = 'This is a very long title that should be truncated';
        expect(graphView.truncateTitle(longTitle, 10)).toBe('This is...');
        expect(graphView.truncateTitle('Short', 10)).toBe('Short');
    });

    it('should update side panel content', () => {
        const paper = {
            title: 'Test Paper',
            authors: ['Author A'],
            year: 2024,
            publication: 'Journal',
            readingStatus: 'Reading',
            tags: ['AI'],
            abstract: 'Test abstract'
        };

        graphView.updateSidePanel(paper);
        const content = document.getElementById('panel-content').innerHTML;

        expect(content).toContain('Test Paper');
        expect(content).toContain('Author A');
        expect(content).toContain('Reading');
        expect(content).toContain('#AI');
    });

    it('should open and close side panel', () => {
        const panel = document.getElementById('graph-side-panel');

        graphView.openSidePanel();
        expect(panel.classList.contains('open')).toBe(true);

        graphView.closeSidePanel();
        expect(panel.classList.contains('open')).toBe(false);
    });

    it('should configure physics correctly', async () => {
        const mockData = {
            nodes: [{ id: '1', label: 'Node 1', data: { status: 'Reading' } }],
            edges: []
        };

        // Manually trigger render to check options passed to vis.Network
        await graphView.renderGraph(mockData);

        expect(global.vis.Network).toHaveBeenCalled();
        const options = global.vis.Network.mock.calls[0][2];

        expect(options.physics.solver).toBe('forceAtlas2Based');
        expect(options.physics.forceAtlas2Based.gravitationalConstant).toBe(-50);
    });
});

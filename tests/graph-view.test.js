/**
 * Tests for graph.view.js - Network Graph Visualization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { graphView } from '../graph.view.js';

// Mock dependencies
vi.mock('../db.js', () => ({
    getAllPapers: vi.fn()
}));

vi.mock('../ui.js', () => ({
    showToast: vi.fn()
}));

vi.mock('../api/network.js', () => ({
    getNetwork: vi.fn(),
    generateNetwork: vi.fn()
}));

vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn()
}));

// Mock vis-network
const mockNetworkInstance = {
    destroy: vi.fn(),
    on: vi.fn(),
    body: {
        data: {
            nodes: {
                get: vi.fn(),
                update: vi.fn(),
                forEach: vi.fn((callback) => {
                    const items = mockNetworkInstance.body.data.nodes.get();
                    if (Array.isArray(items)) {
                        items.forEach(callback);
                    }
                })
            }
        }
    },
    getScale: vi.fn(() => 1),
    moveTo: vi.fn(),
    fit: vi.fn()
};

global.vis = {
    DataSet: vi.fn((data) => ({
        get: () => data || [],
        add: vi.fn(),
        update: vi.fn()
    })),
    Network: vi.fn(() => mockNetworkInstance)
};

describe('graph.view.js - Network Graph Visualization', () => {
    let appState;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup DOM
        document.body.innerHTML = `
            <div id="graph-network"></div>
            <div id="graph-empty-state" class="hidden"></div>
            <div id="graph-side-panel">
                <div id="panel-content"></div>
                <button id="panel-close-btn"></button>
                <button id="panel-open-btn"></button>
            </div>
            <input id="graph-search-input" />
            <select id="graph-status-filter"></select>
            <select id="graph-tag-filter"></select>
            <button id="graph-generate-btn"></button>
            <button id="graph-zoom-in"></button>
            <button id="graph-zoom-out"></button>
            <button id="graph-fit"></button>
        `;

        appState = {};
    });

    afterEach(() => {
        graphView.unmount();
        document.body.innerHTML = '';
    });

    describe('mount', () => {
        it('should load papers and render graph', async () => {
            const { getAllPapers } = await import('../db.js');
            const papers = [
                { id: 1, title: 'Paper 1', readingStatus: 'To Read', relatedPaperIds: [2] },
                { id: 2, title: 'Paper 2', readingStatus: 'Reading' }
            ];
            getAllPapers.mockResolvedValue(papers);

            await graphView.mount(appState);

            expect(getAllPapers).toHaveBeenCalled();
            expect(global.vis.Network).toHaveBeenCalled();
            expect(document.getElementById('graph-empty-state').classList.contains('hidden')).toBe(true);
        });

        it('should show empty state if no edges', async () => {
            const { getAllPapers } = await import('../db.js');
            getAllPapers.mockResolvedValue([
                { id: 1, title: 'Paper 1', relatedPaperIds: [] }
            ]);

            await graphView.mount(appState);

            expect(document.getElementById('graph-empty-state').classList.contains('hidden')).toBe(false);
        });
    });

    describe('prepareLocalGraphData', () => {
        it('should transform papers into nodes and edges', () => {
            const papers = [
                { id: 1, title: 'P1', readingStatus: 'To Read', relatedPaperIds: [2] },
                { id: 2, title: 'P2', readingStatus: 'Reading' }
            ];

            const data = graphView.prepareLocalGraphData(papers);

            expect(data.nodes).toHaveLength(2);
            expect(data.edges).toHaveLength(1);
            expect(data.nodes[0].id).toBe(1);
            expect(data.edges[0].from).toBe(1);
            expect(data.edges[0].to).toBe(2);
        });
    });

    describe('Filtering', () => {
        it('should filter nodes based on search query', async () => {
            // Setup graph with data
            const { getAllPapers } = await import('../db.js');
            getAllPapers.mockResolvedValue([
                { id: 1, title: 'Machine Learning', readingStatus: 'To Read', relatedPaperIds: [2] },
                { id: 2, title: 'Deep Learning', readingStatus: 'Reading', relatedPaperIds: [1] }
            ]);
            await graphView.mount(appState);

            // Mock nodes.get() to return our data
            const nodes = [
                { id: 1, fullTitle: 'Machine Learning', status: 'To Read' },
                { id: 2, fullTitle: 'Deep Learning', status: 'Reading' }
            ];
            mockNetworkInstance.body.data.nodes.get.mockReturnValue(nodes);

            // Apply filter
            const searchInput = document.getElementById('graph-search-input');
            searchInput.value = 'Machine';
            graphView.applyFilters();

            expect(mockNetworkInstance.body.data.nodes.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, hidden: false })
            );
            expect(mockNetworkInstance.body.data.nodes.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 2, hidden: true })
            );
        });

        it('should filter nodes based on status', async () => {
            const { getAllPapers } = await import('../db.js');
            getAllPapers.mockResolvedValue([
                { id: 1, title: 'P1', readingStatus: 'To Read', relatedPaperIds: [2] },
                { id: 2, title: 'P2', readingStatus: 'Reading', relatedPaperIds: [1] }
            ]);
            await graphView.mount(appState);

            const nodes = [
                { id: 1, fullTitle: 'P1', status: 'To Read' },
                { id: 2, fullTitle: 'P2', status: 'Reading' }
            ];
            mockNetworkInstance.body.data.nodes.get.mockReturnValue(nodes);

            const statusFilter = document.getElementById('graph-status-filter');
            // Add options so value assignment works
            statusFilter.innerHTML = `
                <option value="">All</option>
                <option value="To Read">To Read</option>
                <option value="Reading">Reading</option>
            `;
            statusFilter.value = 'Reading';
            graphView.applyFilters();

            expect(mockNetworkInstance.body.data.nodes.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, hidden: true })
            );
            expect(mockNetworkInstance.body.data.nodes.update).toHaveBeenCalledWith(
                expect.objectContaining({ id: 2, hidden: false })
            );
        });
    });

    describe('Interactions', () => {
        it('should handle node click and open side panel', async () => {
            const { getAllPapers } = await import('../db.js');
            getAllPapers.mockResolvedValue([
                { id: 1, title: 'Paper 1', authors: ['Author'], year: 2023, relatedPaperIds: [2] },
                { id: 2, title: 'Paper 2', relatedPaperIds: [1] }
            ]);
            await graphView.mount(appState);

            graphView.handleNodeClick(1);

            const panel = document.getElementById('graph-side-panel');
            expect(panel.classList.contains('open')).toBe(true);
            expect(document.getElementById('panel-content').textContent).toContain('Paper 1');
        });

        it('should close side panel', () => {
            const panel = document.getElementById('graph-side-panel');
            panel.classList.add('open');

            graphView.closeSidePanel();

            expect(panel.classList.contains('open')).toBe(false);
            expect(graphView.selectedPaperId).toBeNull();
        });

        it('should handle zoom interactions', async () => {
            const { getAllPapers } = await import('../db.js');
            getAllPapers.mockResolvedValue([
                { id: 1, title: 'P1', relatedPaperIds: [2] },
                { id: 2, title: 'P2', relatedPaperIds: [1] }
            ]);
            await graphView.mount(appState);

            // Trigger zoom in
            const zoomInBtn = document.getElementById('graph-zoom-in');
            zoomInBtn.click();
            expect(mockNetworkInstance.moveTo).toHaveBeenCalled();

            // Trigger zoom out
            const zoomOutBtn = document.getElementById('graph-zoom-out');
            zoomOutBtn.click();
            expect(mockNetworkInstance.moveTo).toHaveBeenCalled();

            // Trigger fit
            const fitBtn = document.getElementById('graph-fit');
            fitBtn.click();
            expect(mockNetworkInstance.fit).toHaveBeenCalled();
        });
    });

    describe('Network Generation', () => {
        it('should call generate API and reload network', async () => {
            const { generateNetwork, getNetwork } = await import('../api/network.js');
            generateNetwork.mockResolvedValue({
                stats: { nodeCount: 10 },
                graph: { id: 'new-graph' }
            });
            getNetwork.mockResolvedValue({ nodes: [], edges: [] });

            await graphView.handleGenerate();

            expect(generateNetwork).toHaveBeenCalled();
            expect(getNetwork).toHaveBeenCalledWith('new-graph');
        });

        it('should handle generation errors', async () => {
            const { generateNetwork } = await import('../api/network.js');
            const { showToast } = await import('../ui.js');
            generateNetwork.mockRejectedValue(new Error('Gen failed'));

            await graphView.handleGenerate();

            expect(showToast).toHaveBeenCalledWith('Gen failed', 'error');
        });
    });
});

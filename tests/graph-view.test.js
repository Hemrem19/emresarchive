/**
 * Tests for graph.view.js - Network Graph Visualization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { graphView } from '../graph.view.js';

// Mock dependencies
vi.mock('../db.js', () => ({
    getAllPapers: vi.fn(),
    addPaper: vi.fn(async () => 99),
    getPaperByDoi: vi.fn(async () => null)
}));

vi.mock('../api.js', () => ({
    fetchDoiMetadata: vi.fn(async (doi) => ({ title: 'Classic', doi }))
}));

vi.mock('../ui.js', () => ({
    showToast: vi.fn(),
    escapeHtml: (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}));

vi.mock('../api/network.js', () => ({
    getNetwork: vi.fn(),
    generateNetwork: vi.fn(),
    getUserNetworks: vi.fn(async () => [])
}));

vi.mock('../api/auth.js', () => ({
    getAccessToken: vi.fn()
}));

// Mock vis-network
const mockNetworkInstance = {
    destroy: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
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
            <div id="graph-status" class="hidden"></div>
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

    describe('Server network', () => {
        const network = (extra = {}) => ({
            graph: { id: 'g1', stale: false },
            nodes: [
                { id: '1', label: 'Paper 1', data: { status: 'Reading', doi: '10.1/a', tags: [] } },
                { id: '2', label: 'Paper 2', data: { status: 'To Read', doi: null, tags: [] } },
            ],
            edges: [
                { id: 'e1', source: '1', target: '2', type: 'cites' },
                { id: 'e2', source: '1', target: '2', type: 'common_author' },
            ],
            suggestions: [{ openAlexId: 'https://openalex.org/W9', doi: '10.1/z', title: 'Classic', year: 1999, citedByCount: 500, citedBy: ['1', '2'] }],
            ...extra,
        });
        const drawn = () => {
            const [, data] = global.vis.Network.mock.calls.at(-1);
            return { nodes: data.nodes.get(), edges: data.edges.get() };
        };

        beforeEach(async () => {
            const { getAllPapers } = await import('../db.js');
            const { getAccessToken } = await import('../api/auth.js');
            const { getUserNetworks, getNetwork } = await import('../api/network.js');
            getAllPapers.mockResolvedValue([{ id: 1, title: 'Paper 1', readingStatus: 'Reading', relatedPaperIds: [3] }, { id: 3, title: 'Not in network' }]);
            getAccessToken.mockReturnValue('token');
            getUserNetworks.mockResolvedValue([{ id: 'g1' }]);
            getNetwork.mockResolvedValue(network());
        });

        it('draws citations as arrows, shared authors dashed, and suggestions as hollow nodes', async () => {
            await graphView.mount(appState);

            const { nodes, edges } = drawn();
            expect(edges.find(e => e.type === 'cites').arrows.to.enabled).toBe(true);
            expect(edges.find(e => e.type === 'common_author').dashes).toBeTruthy();
            const suggested = nodes.find(n => n.suggested);
            expect(suggested).toMatchObject({ id: 'suggested:https://openalex.org/W9', borderWidth: 2 });
            expect(edges.filter(e => e.to === suggested.id).map(e => e.from)).toEqual([1, 2]);
            // A Related Papers link to a paper outside the network is not drawn
            expect(edges.some(e => e.type === 'related')).toBe(false);
        });

        it('says what the network holds', async () => {
            await graphView.mount(appState);
            const status = document.getElementById('graph-status');
            expect(status.classList.contains('hidden')).toBe(false);
            expect(status.textContent).toBe('1 citation link · 1 suggested paper · 1 paper without a DOI');
        });

        it('refreshes a stale network by itself, without a toast', async () => {
            const { getNetwork, generateNetwork } = await import('../api/network.js');
            const { showToast } = await import('../ui.js');
            getNetwork.mockResolvedValueOnce(network({ graph: { id: 'g1', stale: true } }));
            generateNetwork.mockResolvedValue({ graph: { id: 'g1' }, stats: { nodeCount: 2, pendingLookups: 0 } });

            await graphView.mount(appState);
            await vi.waitFor(() => expect(getNetwork).toHaveBeenCalledTimes(2));

            expect(generateNetwork).toHaveBeenCalledTimes(1);
            expect(showToast).not.toHaveBeenCalled();
        });

        it('builds the network of a library that has none yet', async () => {
            const { getUserNetworks, generateNetwork } = await import('../api/network.js');
            getUserNetworks.mockResolvedValue([]);
            generateNetwork.mockResolvedValue({ graph: { id: 'g1' }, stats: { nodeCount: 2 } });

            await graphView.mount(appState);

            await vi.waitFor(() => expect(generateNetwork).toHaveBeenCalled());
        });

        it('tells how many lookups are left and tries again later', async () => {
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
            try {
                const { generateNetwork } = await import('../api/network.js');
                generateNetwork.mockResolvedValue({ graph: { id: 'g1' }, stats: { nodeCount: 2, pendingLookups: 40 } });

                const run = graphView.handleGenerate();
                await run;
                expect(document.getElementById('graph-status').textContent).toMatch(/^Finding links for 40 more papers…/);

                await vi.advanceTimersByTimeAsync(30000);
                expect(generateNetwork).toHaveBeenCalledTimes(2);
            } finally {
                vi.useRealTimers();
            }
        });

        it('shows a suggested paper and adds it to the open library', async () => {
            const { addPaper, getPaperByDoi } = await import('../db.js');
            await graphView.mount(appState);

            graphView.handleNodeClick('suggested:https://openalex.org/W9');
            const panel = document.getElementById('panel-content').textContent;
            expect(panel).toContain('Classic');
            expect(panel).toContain('Cited by 2 of your papers');
            const button = document.getElementById('panel-open-btn');
            expect(button.textContent).toBe('Add to library');

            button.click();
            await vi.waitFor(() => expect(button.textContent).toBe('Added to library'));
            expect(getPaperByDoi).toHaveBeenCalledWith('10.1/z');
            expect(addPaper).toHaveBeenCalledWith(expect.objectContaining({ title: 'Classic', doi: '10.1/z', readingStatus: 'To Read' }));
            expect(mockNetworkInstance.body.data.nodes.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'suggested:https://openalex.org/W9', suggested: false }));
        });

        it('does not add a paper the library already has', async () => {
            const { addPaper, getPaperByDoi } = await import('../db.js');
            getPaperByDoi.mockResolvedValueOnce({ id: 5, title: 'Classic' });
            await graphView.mount(appState);

            graphView.handleNodeClick('suggested:https://openalex.org/W9');
            await graphView.addSuggestion(graphView.selectedSuggestion);

            expect(addPaper).not.toHaveBeenCalled();
        });

        it('opens a paper\'s panel from the server\'s copy when this device lacks it', async () => {
            await graphView.mount(appState);
            graphView.handleNodeClick(2);
            expect(document.getElementById('panel-content').textContent).toContain('Paper 2');
            expect(document.getElementById('panel-open-btn').textContent).toBe('Open Full Details');
        });
    });
});

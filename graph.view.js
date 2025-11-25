import { getAllPapers } from './db.js';
import { showToast } from './ui.js';
import { generateNetwork, getNetwork, getUserNetworks } from './api/network.js';
import { getAccessToken } from './api/auth.js';

export const graphView = {
    network: null,
    allPapers: [],
    filteredPapers: [],
    currentGraphId: null,
    searchHandler: null,
    statusFilterHandler: null,
    tagFilterHandler: null,
    resetHandler: null,
    zoomInHandler: null,
    zoomOutHandler: null,
    fitHandler: null,
    generateHandler: null,

    async mount(appState) {
        try {
            // Check authentication
            const token = getAccessToken();
            if (!token) {
                // Fallback to local view if not logged in
                console.log('Graph View: Not logged in, using local data');
                this.mountLocal();
                return;
            }

            // Load all papers (for details lookup)
            this.allPapers = await getAllPapers();

            // Fetch user's networks
            const networks = await getUserNetworks();

            if (networks && networks.length > 0) {
                // Load the most recent network
                const latestNetwork = networks[0]; // Assumes sorted by desc
                await this.loadNetwork(latestNetwork.id);
            } else {
                // No network found, show empty state with generate button
                console.log('Graph View: No network found');
                document.getElementById('graph-empty-state').classList.remove('hidden');

                // Update stats to 0
                this.updateStats(0, 0, 0);
            }

            // Setup event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Error mounting graph view:', error);
            showToast('Failed to load paper network', 'error');
            // Fallback to local
            this.mountLocal();
        }
    },

    async mountLocal() {
        // Original local logic
        this.allPapers = await getAllPapers();
        this.populateTagFilter();
        const graphData = this.prepareLocalGraphData(this.allPapers);

        if (graphData.edges.length === 0) {
            document.getElementById('graph-empty-state').classList.remove('hidden');
        } else {
            document.getElementById('graph-empty-state').classList.add('hidden');
            this.renderGraph(graphData);
            this.updateStats(graphData.nodes.length, graphData.edges.length, graphData.nodes.length);
        }
        this.setupEventListeners();
    },

    async loadNetwork(networkId) {
        try {
            document.getElementById('graph-empty-state').classList.add('hidden');

            // Show loading indicator?

            const data = await getNetwork(networkId);
            this.currentGraphId = networkId;

            // Map backend data to vis-network format
            const nodes = data.nodes.map(n => ({
                id: parseInt(n.id), // Ensure ID is number if vis expects it, or string
                label: this.truncateTitle(n.label, 30),
                title: this.createTooltipHTML(n.data),
                fullTitle: n.label,
                status: n.data.status,
                tags: n.data.tags || [], // Backend might not return tags in data yet, check schema
                shape: 'dot',
                size: 20, // Default size, maybe calculate based on connections
                color: this.getNodeColor(n.data.status)
            }));

            const edges = data.edges.map(e => ({
                id: e.id,
                from: parseInt(e.source),
                to: parseInt(e.target),
                width: 2,
                color: {
                    color: '#d6d3d1',
                    highlight: '#137fec',
                    hover: '#137fec'
                }
            }));

            const graphData = { nodes, edges };

            // Calculate node sizes based on degree
            const degreeMap = new Map();
            edges.forEach(e => {
                degreeMap.set(e.from, (degreeMap.get(e.from) || 0) + 1);
                degreeMap.set(e.to, (degreeMap.get(e.to) || 0) + 1);
            });

            nodes.forEach(n => {
                const degree = degreeMap.get(n.id) || 0;
                n.size = Math.max(15, Math.min(40, 15 + degree * 5));
            });

            this.renderGraph(graphData);
            this.updateStats(nodes.length, edges.length, nodes.length);
            this.populateTagFilterFromNodes(nodes);

        } catch (error) {
            console.error('Failed to load network:', error);
            showToast('Failed to load network data', 'error');
        }
    },

    async handleGenerate() {
        const btn = document.getElementById('graph-generate-btn');
        const originalText = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Generating...';

            const result = await generateNetwork();
            showToast(`Network generated with ${result.stats.nodeCount} papers and ${result.stats.edgeCount} connections`, 'success');

            // Reload
            await this.loadNetwork(result.graph.id);

        } catch (error) {
            console.error('Generation failed:', error);
            showToast(error.message || 'Failed to generate network', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    },

    unmount() {
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }

        // Remove event listeners
        const searchInput = document.getElementById('graph-search-input');
        const statusFilter = document.getElementById('graph-status-filter');
        const tagFilter = document.getElementById('graph-tag-filter');
        const resetBtn = document.getElementById('graph-reset-btn');
        const generateBtn = document.getElementById('graph-generate-btn');
        const zoomInBtn = document.getElementById('graph-zoom-in');
        const zoomOutBtn = document.getElementById('graph-zoom-out');
        const fitBtn = document.getElementById('graph-fit');

        if (searchInput && this.searchHandler) searchInput.removeEventListener('input', this.searchHandler);
        if (statusFilter && this.statusFilterHandler) statusFilter.removeEventListener('change', this.statusFilterHandler);
        if (tagFilter && this.tagFilterHandler) tagFilter.removeEventListener('change', this.tagFilterHandler);
        if (resetBtn && this.resetHandler) resetBtn.removeEventListener('click', this.resetHandler);
        if (generateBtn && this.generateHandler) generateBtn.removeEventListener('click', this.generateHandler);
        if (zoomInBtn && this.zoomInHandler) zoomInBtn.removeEventListener('click', this.zoomInHandler);
        if (zoomOutBtn && this.zoomOutHandler) zoomOutBtn.removeEventListener('click', this.zoomOutHandler);
        if (fitBtn && this.fitHandler) fitBtn.removeEventListener('click', this.fitHandler);

        this.allPapers = [];
        this.filteredPapers = [];
    },

    prepareLocalGraphData(papers) {
        // ... (Keep original logic for fallback)
        const nodes = [];
        const edges = [];
        const paperIdSet = new Set(papers.map(p => p.id));
        const edgeSet = new Set();

        papers.forEach(paper => {
            const connectionCount = (paper.relatedPaperIds || []).filter(id => paperIdSet.has(id)).length;
            nodes.push({
                id: paper.id,
                label: this.truncateTitle(paper.title, 30),
                title: this.createTooltipHTML(paper),
                fullTitle: paper.title,
                status: paper.readingStatus,
                tags: paper.tags || [],
                shape: 'dot',
                size: Math.max(15, Math.min(40, 15 + connectionCount * 5)),
                color: this.getNodeColor(paper.readingStatus)
            });

            if (paper.relatedPaperIds) {
                paper.relatedPaperIds.forEach(relatedId => {
                    if (paperIdSet.has(relatedId)) {
                        const edgeKey = [Math.min(paper.id, relatedId), Math.max(paper.id, relatedId)].join('-');
                        if (!edgeSet.has(edgeKey)) {
                            edgeSet.add(edgeKey);
                            edges.push({
                                from: paper.id,
                                to: relatedId,
                                width: 2,
                                color: { color: '#d6d3d1', highlight: '#137fec', hover: '#137fec' }
                            });
                        }
                    }
                });
            }
        });
        return { nodes, edges };
    },

    renderGraph(graphData) {
        const container = document.getElementById('graph-network');
        if (!container || !window.vis) return;

        const isDarkMode = document.documentElement.classList.contains('dark');

        const data = {
            nodes: new vis.DataSet(graphData.nodes),
            edges: new vis.DataSet(graphData.edges)
        };

        const options = {
            nodes: {
                borderWidth: 2,
                borderWidthSelected: 3,
                color: {
                    border: isDarkMode ? '#44403c' : '#78716c',
                    highlight: { border: '#137fec', background: '#137fec' },
                    hover: { border: '#137fec', background: '#60a5fa' }
                },
                font: {
                    color: isDarkMode ? '#f5f5f4' : '#1c1917',
                    size: 14,
                    face: 'Manrope'
                },
                shadow: {
                    enabled: true,
                    color: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                    size: 8,
                    x: 0, y: 2
                }
            },
            edges: {
                width: 2,
                selectionWidth: 3,
                color: {
                    color: isDarkMode ? '#78716c' : '#44403c',
                    highlight: '#137fec',
                    hover: '#60a5fa',
                    inherit: false
                },
                smooth: { enabled: true, type: 'continuous', roundness: 0.5 }
            },
            physics: {
                enabled: true,
                stabilization: { enabled: true, iterations: 200, updateInterval: 25 },
                barnesHut: {
                    gravitationalConstant: -4000,
                    centralGravity: 0.1,
                    springLength: 250,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.5
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                hideEdgesOnDrag: true,
                hideEdgesOnZoom: true,
                navigationButtons: false,
                keyboard: { enabled: true, bindToWindow: false, speed: { x: 10, y: 10, zoom: 0.04 } },
                multiselect: false,
                zoomView: true,
                dragView: true,
                zoomSpeed: 0.3
            },
            layout: { improvedLayout: true, randomSeed: 42 }
        };

        this.network = new vis.Network(container, data, options);

        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const paperId = params.nodes[0];
                window.location.hash = `#/details/${paperId}`;
            }
        });

        this.network.on('hoverNode', () => document.body.style.cursor = 'pointer');
        this.network.on('blurNode', () => document.body.style.cursor = 'default');
        this.network.on('stabilizationIterationsDone', () => this.network.setOptions({ physics: false }));
    },

    getNodeColor(status) {
        const colors = {
            'Reading': '#3b82f6',
            'To Read': '#eab308',
            'Finished': '#22c55e',
            'default': '#78716c'
        };
        return colors[status] || colors.default;
    },

    truncateTitle(title, maxLength) {
        if (!title) return 'Untitled';
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    },

    createTooltipHTML(paper) {
        const authors = paper.authors && paper.authors.length > 0
            ? (Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors)
            : 'No authors';

        // Truncate authors if too long
        const displayAuthors = authors.length > 50 ? authors.substring(0, 50) + '...' : authors;

        const tags = paper.tags && paper.tags.length > 0
            ? paper.tags.map(tag => `<span style="background-color: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 99px; font-size: 10px;">#${tag}</span>`).join(' ')
            : 'No tags';

        const container = document.createElement('div');
        container.innerHTML = `
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; white-space: normal;">${paper.title || 'Untitled'}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; white-space: normal;">${displayAuthors}</div>
            <div style="font-size: 12px; margin-bottom: 8px;">
                <strong>Status:</strong> 
                <span style="color: ${this.getNodeColor(paper.readingStatus || paper.status)}; font-weight: 500;">${paper.readingStatus || paper.status || 'Unknown'}</span>
            </div>
            <div style="font-size: 12px;">
                <strong>Tags:</strong> ${tags}
            </div>
        `;
        return container;
    },

    populateTagFilter() {
        // Local population
        const tagFilter = document.getElementById('graph-tag-filter');
        if (!tagFilter) return;

        const allTags = new Set();
        this.allPapers.forEach(paper => {
            if (paper.tags && paper.tags.length > 0) {
                paper.tags.forEach(tag => allTags.add(tag));
            }
        });

        this.updateTagFilterOptions(tagFilter, allTags);
    },

    populateTagFilterFromNodes(nodes) {
        const tagFilter = document.getElementById('graph-tag-filter');
        if (!tagFilter) return;

        const allTags = new Set();
        nodes.forEach(node => {
            if (node.tags && node.tags.length > 0) {
                node.tags.forEach(tag => allTags.add(tag));
            }
        });

        this.updateTagFilterOptions(tagFilter, allTags);
    },

    updateTagFilterOptions(selectElement, tagsSet) {
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        Array.from(tagsSet).sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            selectElement.appendChild(option);
        });
    },

    setupEventListeners() {
        const searchInput = document.getElementById('graph-search-input');
        const statusFilter = document.getElementById('graph-status-filter');
        const tagFilter = document.getElementById('graph-tag-filter');
        const resetBtn = document.getElementById('graph-reset-btn');
        const generateBtn = document.getElementById('graph-generate-btn');
        const zoomInBtn = document.getElementById('graph-zoom-in');
        const zoomOutBtn = document.getElementById('graph-zoom-out');
        const fitBtn = document.getElementById('graph-fit');

        this.searchHandler = () => this.applyFilters();
        if (searchInput) searchInput.addEventListener('input', this.searchHandler);

        this.statusFilterHandler = () => this.applyFilters();
        if (statusFilter) statusFilter.addEventListener('change', this.statusFilterHandler);

        this.tagFilterHandler = () => this.applyFilters();
        if (tagFilter) tagFilter.addEventListener('change', this.tagFilterHandler);

        this.resetHandler = () => {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (tagFilter) tagFilter.value = '';
            this.applyFilters();
            if (this.network) this.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        };
        if (resetBtn) resetBtn.addEventListener('click', this.resetHandler);

        this.generateHandler = () => this.handleGenerate();
        if (generateBtn) generateBtn.addEventListener('click', this.generateHandler);

        this.zoomInHandler = () => {
            if (this.network) {
                const scale = this.network.getScale();
                this.network.moveTo({ scale: scale * 1.2, animation: { duration: 300 } });
            }
        };
        if (zoomInBtn) zoomInBtn.addEventListener('click', this.zoomInHandler);

        this.zoomOutHandler = () => {
            if (this.network) {
                const scale = this.network.getScale();
                this.network.moveTo({ scale: scale / 1.2, animation: { duration: 300 } });
            }
        };
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', this.zoomOutHandler);

        this.fitHandler = () => {
            if (this.network) this.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        };
        if (fitBtn) fitBtn.addEventListener('click', this.fitHandler);
    },

    applyFilters() {
        if (!this.network) return;

        const searchQuery = document.getElementById('graph-search-input')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('graph-status-filter')?.value || '';
        const tagFilter = document.getElementById('graph-tag-filter')?.value || '';

        const nodes = this.network.body.data.nodes;
        const edges = this.network.body.data.edges;

        const allNodes = nodes.get();
        const visibleNodeIds = new Set();

        allNodes.forEach(node => {
            let visible = true;

            // Search
            if (searchQuery) {
                const titleMatch = node.fullTitle?.toLowerCase().includes(searchQuery);
                // Check authors if available in title/tooltip
                if (!titleMatch) visible = false;
            }

            // Status
            if (visible && statusFilter) {
                if (node.status !== statusFilter) visible = false;
            }

            // Tag
            if (visible && tagFilter) {
                if (!node.tags || !node.tags.includes(tagFilter)) visible = false;
            }

            if (visible) visibleNodeIds.add(node.id);
        });

        // Update visibility
        nodes.forEach(node => {
            nodes.update({ id: node.id, hidden: !visibleNodeIds.has(node.id) });
        });

        // Edges are hidden automatically if nodes are hidden? No, vis-network hides edges if connected nodes are hidden.
        // But we might want to hide edges if one end is hidden.
        // Vis-network usually handles this.

        // Update stats
        this.updateStats(allNodes.length, edges.length, visibleNodeIds.size);
    },

    updateStats(totalNodes, totalEdges, visibleNodes) {
        const nodeCount = document.getElementById('graph-node-count');
        const edgeCount = document.getElementById('graph-edge-count');
        const visibleCount = document.getElementById('graph-visible-count');

        if (nodeCount) nodeCount.textContent = totalNodes;
        if (edgeCount) edgeCount.textContent = totalEdges;
        if (visibleCount) visibleCount.textContent = visibleNodes;
    }
};

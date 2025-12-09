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
    generateHandler: null,
    zoomInHandler: null,
    zoomOutHandler: null,
    fitHandler: null,
    panelCloseHandler: null,
    panelOpenHandler: null,
    selectedPaperId: null,

    async mount(appState) {
        try {
            // Wait for DOM to be ready (renderView uses setTimeout, so we need to wait longer)
            // Also wait for vis-network library to load
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if vis-network is loaded
            if (!window.vis) {
                console.error('vis-network library not loaded');
                showToast('Graph library not loaded. Please refresh the page.', 'error');
                return;
            }

            // Check if elements exist before accessing them
            const emptyState = document.getElementById('graph-empty-state');
            const networkContainer = document.getElementById('graph-network');
            
            if (!networkContainer) {
                console.error('Graph network container not found');
                showToast('Failed to initialize graph view', 'error');
                return;
            }

            // Try to load the latest saved network first (if authenticated)
            const token = getAccessToken();
            if (token) {
                try {
                    const networks = await getUserNetworks();
                    if (networks && networks.length > 0) {
                        // Sort by updatedAt descending to get the most recent
                        const latestNetwork = networks.sort((a, b) => 
                            new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
                        )[0];
                        
                        if (latestNetwork && latestNetwork.id) {
                            await this.loadNetwork(latestNetwork.id);
                            this.setupEventListeners();
                            return; // Successfully loaded saved network
                        }
                    }
                } catch (networkError) {
                    console.warn('Failed to load saved network, falling back to local data:', networkError);
                    // Continue to local data fallback
                }
            }

            // Fallback: Load local papers and use local graph data
            try {
                this.allPapers = await getAllPapers();
            } catch (dbError) {
                console.error('Error loading papers for graph:', dbError);
                // Show empty state if database error
                if (emptyState) {
                    emptyState.classList.remove('hidden');
                    // Update empty state message for database error
                    const emptyStateText = emptyState.querySelector('p');
                    if (emptyStateText) {
                        emptyStateText.textContent = 'Unable to load papers. Database error: ' + (dbError.message || 'Unknown error');
                    }
                }
                showToast('Failed to load papers for graph view: ' + (dbError.message || 'Database error'), 'error', { duration: 5000 });
                // Don't return - still try to set up event listeners so UI is functional
                this.setupEventListeners();
                return;
            }

            this.populateTagFilter();
            const graphData = this.prepareLocalGraphData(this.allPapers);

            if (graphData.edges.length === 0) {
                if (emptyState) emptyState.classList.remove('hidden');
            } else {
                if (emptyState) emptyState.classList.add('hidden');
                this.renderGraph(graphData);
            }

            this.setupEventListeners();

        } catch (error) {
            console.error('Error mounting graph view:', error);
            showToast('Failed to load paper network', 'error');
            
            // Show empty state on error
            const emptyState = document.getElementById('graph-empty-state');
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
        }
    },

    async mountLocal() {
        this.allPapers = await getAllPapers();
        this.populateTagFilter();
        const graphData = this.prepareLocalGraphData(this.allPapers);

        if (graphData.edges.length === 0) {
            document.getElementById('graph-empty-state').classList.remove('hidden');
        } else {
            document.getElementById('graph-empty-state').classList.add('hidden');
            this.renderGraph(graphData);
        }
        this.setupEventListeners();
    },

    async loadNetwork(networkId) {
        try {
            document.getElementById('graph-empty-state').classList.add('hidden');

            const data = await getNetwork(networkId);
            this.currentGraphId = networkId;

            // Map backend data to vis-network format
            const nodes = data.nodes.map(n => ({
                id: parseInt(n.id),
                label: this.truncateTitle(n.label, 20),
                fullTitle: n.label,
                status: n.data.status,
                tags: n.data.tags || [],
                shape: 'dot',
                size: 25,
                color: this.getNodeColor(n.data.status),
                font: { color: '#ffffff', strokeWidth: 0, size: 14, face: 'Manrope' },
                shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10, x: 0, y: 0 }
            }));

            const edges = data.edges.map(e => ({
                id: e.id,
                from: parseInt(e.source),
                to: parseInt(e.target),
                width: 1,
                color: { color: 'rgba(255,255,255,0.15)', highlight: '#3b82f6', hover: '#3b82f6' },
                smooth: { type: 'curvedCW', roundness: 0.2 }
            }));

            // Calculate node sizes based on degree
            const degreeMap = new Map();
            edges.forEach(e => {
                degreeMap.set(e.from, (degreeMap.get(e.from) || 0) + 1);
                degreeMap.set(e.to, (degreeMap.get(e.to) || 0) + 1);
            });

            nodes.forEach(n => {
                const degree = degreeMap.get(n.id) || 0;
                n.size = Math.max(20, Math.min(50, 20 + degree * 3));
                n.value = degree; // For physics
            });

            this.renderGraph({ nodes, edges });
            this.populateTagFilterFromNodes(nodes);

        } catch (error) {
            console.error('Failed to load network:', error);
            showToast('Failed to load network data', 'error');
        }
    },

    async handleGenerate() {
        const btn = document.getElementById('graph-generate-btn');
        const originalHTML = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">refresh</span> <span class="hidden sm:inline">Generating...</span>';

            const result = await generateNetwork();
            showToast(`Network generated with ${result.stats.nodeCount} papers`, 'success');

            await this.loadNetwork(result.graph.id);

        } catch (error) {
            console.error('Generation failed:', error);
            showToast(error.message || 'Failed to generate network', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
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
        const generateBtn = document.getElementById('graph-generate-btn');
        const zoomInBtn = document.getElementById('graph-zoom-in');
        const zoomOutBtn = document.getElementById('graph-zoom-out');
        const fitBtn = document.getElementById('graph-fit');
        const panelCloseBtn = document.getElementById('panel-close-btn');
        const panelOpenBtn = document.getElementById('panel-open-btn');

        if (searchInput && this.searchHandler) searchInput.removeEventListener('input', this.searchHandler);
        if (statusFilter && this.statusFilterHandler) statusFilter.removeEventListener('change', this.statusFilterHandler);
        if (tagFilter && this.tagFilterHandler) tagFilter.removeEventListener('change', this.tagFilterHandler);
        if (generateBtn && this.generateHandler) generateBtn.removeEventListener('click', this.generateHandler);
        if (zoomInBtn && this.zoomInHandler) zoomInBtn.removeEventListener('click', this.zoomInHandler);
        if (zoomOutBtn && this.zoomOutHandler) zoomOutBtn.removeEventListener('click', this.zoomOutHandler);
        if (fitBtn && this.fitHandler) fitBtn.removeEventListener('click', this.fitHandler);
        if (panelCloseBtn && this.panelCloseHandler) panelCloseBtn.removeEventListener('click', this.panelCloseHandler);
        if (panelOpenBtn && this.panelOpenHandler) panelOpenBtn.removeEventListener('click', this.panelOpenHandler);

        this.allPapers = [];
        this.filteredPapers = [];
    },

    prepareLocalGraphData(papers) {
        const nodes = [];
        const edges = [];
        const paperIdSet = new Set(papers.map(p => p.id));
        const edgeSet = new Set();

        papers.forEach(paper => {
            const connectionCount = (paper.relatedPaperIds || []).filter(id => paperIdSet.has(id)).length;
            nodes.push({
                id: paper.id,
                label: this.truncateTitle(paper.title, 20),
                fullTitle: paper.title,
                status: paper.readingStatus,
                tags: paper.tags || [],
                shape: 'dot',
                size: Math.max(20, Math.min(50, 20 + connectionCount * 3)),
                color: this.getNodeColor(paper.readingStatus),
                font: { color: '#ffffff', strokeWidth: 0, size: 14, face: 'Manrope' },
                shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10, x: 0, y: 0 }
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
                                width: 1,
                                color: { color: 'rgba(255,255,255,0.15)', highlight: '#3b82f6', hover: '#3b82f6' },
                                smooth: { type: 'curvedCW', roundness: 0.2 }
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
        if (!container) {
            console.error('Graph network container not found in renderGraph');
            return;
        }
        
        // Ensure container has dimensions
        const containerRect = container.getBoundingClientRect();
        if (containerRect.width === 0 || containerRect.height === 0) {
            console.warn('Graph container has zero dimensions:', containerRect);
            // Force container to have dimensions
            if (containerRect.width === 0) {
                container.style.width = '100%';
            }
            if (containerRect.height === 0) {
                container.style.height = '100vh';
            }
        }
        
        if (!window.vis) {
            console.error('vis-network library not available');
            showToast('Graph library not loaded. Please refresh the page.', 'error');
            return;
        }

        // Destroy existing network if it exists
        if (this.network) {
            try {
                this.network.destroy();
            } catch (e) {
                console.warn('Error destroying existing network:', e);
            }
            this.network = null;
        }

        // Validate graph data
        if (!graphData || !graphData.nodes || !graphData.edges) {
            console.error('Invalid graph data:', graphData);
            showToast('Invalid graph data', 'error');
            return;
        }

        console.log('Rendering graph with', graphData.nodes.length, 'nodes and', graphData.edges.length, 'edges');

        const data = {
            nodes: new vis.DataSet(graphData.nodes),
            edges: new vis.DataSet(graphData.edges)
        };

        const options = {
            nodes: {
                borderWidth: 0,
                borderWidthSelected: 2,
                color: {
                    border: '#ffffff',
                    highlight: { border: '#ffffff', background: '#3b82f6' },
                    hover: { border: '#ffffff', background: '#3b82f6' }
                },
                font: {
                    color: '#ffffff',
                    size: 14,
                    face: 'Manrope',
                    strokeWidth: 0,
                    multi: 'html'
                },
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.5)',
                    size: 10,
                    x: 0, y: 0
                }
            },
            edges: {
                width: 1,
                selectionWidth: 2,
                color: {
                    color: 'rgba(255,255,255,0.15)',
                    highlight: '#3b82f6',
                    hover: '#3b82f6',
                    inherit: false
                },
                smooth: {
                    enabled: true,
                    type: 'curvedCW',
                    roundness: 0.2
                }
            },
            physics: {
                enabled: true,
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springConstant: 0.08,
                    springLength: 100,
                    damping: 0.4,
                    avoidOverlap: 0
                },
                maxVelocity: 50,
                minVelocity: 0.1,
                solver: 'forceAtlas2Based',
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 100,
                    onlyDynamicEdges: false,
                    fit: true
                },
                timestep: 0.5,
                adaptiveTimestep: true
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                hideEdgesOnDrag: false,
                hideEdgesOnZoom: false,
                navigationButtons: false,
                keyboard: true,
                multiselect: false,
                zoomView: true,
                dragView: true,
                zoomSpeed: 0.5
            }
        };

        try {
            this.network = new vis.Network(container, data, options);
        } catch (error) {
            console.error('Error creating vis-network:', error);
            showToast('Failed to render graph. Please refresh the page.', 'error');
            // Show empty state on render error
            const emptyState = document.getElementById('graph-empty-state');
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
            return;
        }

        // Events
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                this.handleNodeClick(params.nodes[0]);
            } else {
                this.closeSidePanel();
            }
        });

        this.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0) {
                window.location.hash = `#/details/${params.nodes[0]}`;
            }
        });

        this.network.on('hoverNode', (params) => {
            document.body.style.cursor = 'pointer';
            this.highlightConnected(params.node);
        });

        this.network.on('blurNode', () => {
            document.body.style.cursor = 'default';
            this.resetHighlight();
        });
    },

    handleNodeClick(nodeId) {
        this.selectedPaperId = nodeId;
        const paper = this.allPapers.find(p => p.id == nodeId);
        if (!paper) return;

        this.updateSidePanel(paper);
        this.openSidePanel();
    },

    updateSidePanel(paper) {
        const panelContent = document.getElementById('panel-content');
        if (!panelContent) return;

        const authors = paper.authors && paper.authors.length > 0
            ? (Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors)
            : 'Unknown Authors';

        const tags = paper.tags && paper.tags.length > 0
            ? paper.tags.map(tag => `<span class="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">#${tag}</span>`).join('')
            : '';

        const abstract = paper.abstract
            ? (paper.abstract.length > 300 ? paper.abstract.substring(0, 300) + '...' : paper.abstract)
            : 'No abstract available.';

        panelContent.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                <div>
                    <h3 class="text-xl font-bold text-white leading-tight mb-2">${paper.title}</h3>
                    <p class="text-sm text-slate-400">${authors}</p>
                    <p class="text-xs text-slate-500 mt-1">${paper.year || 'Unknown Year'} • ${paper.publication || 'Unknown Publication'}</p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClass(paper.readingStatus)}">
                        ${paper.readingStatus || 'To Read'}
                    </span>
                    ${tags}
                </div>

                <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Abstract</h4>
                    <p class="text-sm text-slate-300 leading-relaxed">${abstract}</p>
                </div>
            </div>
        `;
    },

    getStatusBadgeClass(status) {
        const s = (status || '').toLowerCase().trim();
        if (s === 'reading') return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        if (s === 'finished' || s === 'completed') return 'bg-green-500/20 text-green-400 border border-green-500/30';
        if (s === 'to read') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
        return 'bg-slate-700 text-slate-300';
    },

    openSidePanel() {
        const panel = document.getElementById('graph-side-panel');
        if (panel) panel.classList.add('open');
    },

    closeSidePanel() {
        const panel = document.getElementById('graph-side-panel');
        if (panel) panel.classList.remove('open');
        this.selectedPaperId = null;
    },

    highlightConnected(nodeId) {
        // Simple highlight logic: dim all non-connected nodes/edges
        // Vis-network doesn't support easy "dimming" without updating dataset
        // For now, we'll rely on hover styling defined in options
    },

    resetHighlight() {
        // Reset logic
    },

    getNodeColor(status) {
        const s = (status || '').toLowerCase().trim();
        const colors = {
            'reading': { background: '#3b82f6', border: '#60a5fa' }, // Blue
            'to read': { background: '#eab308', border: '#facc15' }, // Yellow
            'finished': { background: '#22c55e', border: '#4ade80' }, // Green
            'completed': { background: '#22c55e', border: '#4ade80' }, // Green (Legacy support)
            'default': { background: '#64748b', border: '#94a3b8' }  // Slate
        };
        return colors[s] || colors.default;
    },

    truncateTitle(title, maxLength) {
        if (!title) return 'Untitled';
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    },

    populateTagFilter() {
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
        const generateBtn = document.getElementById('graph-generate-btn');
        const zoomInBtn = document.getElementById('graph-zoom-in');
        const zoomOutBtn = document.getElementById('graph-zoom-out');
        const fitBtn = document.getElementById('graph-fit');
        const panelCloseBtn = document.getElementById('panel-close-btn');
        const panelOpenBtn = document.getElementById('panel-open-btn');

        this.searchHandler = () => this.applyFilters();
        if (searchInput) searchInput.addEventListener('input', this.searchHandler);

        this.statusFilterHandler = () => this.applyFilters();
        if (statusFilter) statusFilter.addEventListener('change', this.statusFilterHandler);

        this.tagFilterHandler = () => this.applyFilters();
        if (tagFilter) tagFilter.addEventListener('change', this.tagFilterHandler);

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

        this.panelCloseHandler = () => this.closeSidePanel();
        if (panelCloseBtn) panelCloseBtn.addEventListener('click', this.panelCloseHandler);

        this.panelOpenHandler = () => {
            if (this.selectedPaperId) {
                window.location.hash = `#/details/${this.selectedPaperId}`;
            }
        };
        if (panelOpenBtn) panelOpenBtn.addEventListener('click', this.panelOpenHandler);
    },

    applyFilters() {
        if (!this.network) return;

        const searchQuery = document.getElementById('graph-search-input')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('graph-status-filter')?.value || '';
        const tagFilter = document.getElementById('graph-tag-filter')?.value || '';

        const nodes = this.network.body.data.nodes;
        const allNodes = nodes.get();
        const visibleNodeIds = new Set();

        allNodes.forEach(node => {
            let visible = true;

            if (searchQuery) {
                const titleMatch = node.fullTitle?.toLowerCase().includes(searchQuery);
                if (!titleMatch) visible = false;
            }

            if (visible && statusFilter) {
                if (node.status !== statusFilter) visible = false;
            }

            if (visible && tagFilter) {
                if (!node.tags || !node.tags.includes(tagFilter)) visible = false;
            }

            if (visible) visibleNodeIds.add(node.id);
        });

        nodes.forEach(node => {
            nodes.update({ id: node.id, hidden: !visibleNodeIds.has(node.id) });
        });
    }
};

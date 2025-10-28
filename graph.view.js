import { getAllPapers } from './db.js';
import { showToast } from './ui.js';

export const graphView = {
    network: null,
    allPapers: [],
    filteredPapers: [],
    searchHandler: null,
    statusFilterHandler: null,
    tagFilterHandler: null,
    resetHandler: null,
    zoomInHandler: null,
    zoomOutHandler: null,
    fitHandler: null,

    async mount(appState) {
        try {
            // Load all papers
            this.allPapers = await getAllPapers();
            
            // Populate tag filter dropdown
            this.populateTagFilter();
            
            // Transform papers to graph data
            const graphData = this.prepareGraphData(this.allPapers);
            
            // Check if there are any connections
            if (graphData.edges.length === 0) {
                document.getElementById('graph-empty-state').classList.remove('hidden');
                return;
            }
            
            // Hide empty state
            document.getElementById('graph-empty-state').classList.add('hidden');
            
            // Render graph
            this.renderGraph(graphData);
            
            // Update stats
            this.updateStats(graphData.nodes.length, graphData.edges.length, graphData.nodes.length);
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error mounting graph view:', error);
            showToast('Failed to load paper network', 'error');
        }
    },

    unmount() {
        // Destroy network instance
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }
        
        // Remove event listeners
        const searchInput = document.getElementById('graph-search-input');
        const statusFilter = document.getElementById('graph-status-filter');
        const tagFilter = document.getElementById('graph-tag-filter');
        const resetBtn = document.getElementById('graph-reset-btn');
        const zoomInBtn = document.getElementById('graph-zoom-in');
        const zoomOutBtn = document.getElementById('graph-zoom-out');
        const fitBtn = document.getElementById('graph-fit');
        
        if (searchInput && this.searchHandler) searchInput.removeEventListener('input', this.searchHandler);
        if (statusFilter && this.statusFilterHandler) statusFilter.removeEventListener('change', this.statusFilterHandler);
        if (tagFilter && this.tagFilterHandler) tagFilter.removeEventListener('change', this.tagFilterHandler);
        if (resetBtn && this.resetHandler) resetBtn.removeEventListener('click', this.resetHandler);
        if (zoomInBtn && this.zoomInHandler) zoomInBtn.removeEventListener('click', this.zoomInHandler);
        if (zoomOutBtn && this.zoomOutHandler) zoomOutBtn.removeEventListener('click', this.zoomOutHandler);
        if (fitBtn && this.fitHandler) fitBtn.removeEventListener('click', this.fitHandler);
        
        // Reset state
        this.allPapers = [];
        this.filteredPapers = [];
    },

    prepareGraphData(papers) {
        const nodes = [];
        const edges = [];
        const paperIdSet = new Set(papers.map(p => p.id));
        
        papers.forEach(paper => {
            // Create node for each paper
            const connectionCount = (paper.relatedPapers || []).filter(id => paperIdSet.has(id)).length;
            
            nodes.push({
                id: paper.id,
                label: this.truncateTitle(paper.title, 30),
                title: this.createTooltipHTML(paper), // Tooltip content
                fullTitle: paper.title,
                status: paper.readingStatus,
                tags: paper.tags || [],
                shape: 'dot',
                size: Math.max(15, Math.min(40, 15 + connectionCount * 5)), // Size based on connections
                color: this.getNodeColor(paper.readingStatus),
                font: {
                    size: 14,
                    color: '#1c1917', // stone-900
                    face: 'Manrope'
                }
            });
            
            // Create edges for related papers
            if (paper.relatedPapers && paper.relatedPapers.length > 0) {
                paper.relatedPapers.forEach(relatedId => {
                    // Only create edge if related paper exists and avoid duplicates
                    if (paperIdSet.has(relatedId) && paper.id < relatedId) {
                        edges.push({
                            from: paper.id,
                            to: relatedId,
                            width: 2,
                            color: {
                                color: '#d6d3d1', // stone-300
                                highlight: '#137fec', // primary
                                hover: '#137fec'
                            },
                            smooth: {
                                enabled: true,
                                type: 'continuous'
                            }
                        });
                    }
                });
            }
        });
        
        return { nodes, edges };
    },

    renderGraph(graphData) {
        const container = document.getElementById('graph-network');
        if (!container || !window.vis) {
            console.error('Graph container or vis.js not available');
            return;
        }
        
        // Determine if dark mode is active
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
                    border: isDarkMode ? '#44403c' : '#78716c', // stone-700 : stone-500
                    highlight: {
                        border: '#137fec', // primary
                        background: '#137fec'
                    },
                    hover: {
                        border: '#137fec',
                        background: '#60a5fa' // blue-400
                    }
                },
                font: {
                    color: isDarkMode ? '#f5f5f4' : '#1c1917', // stone-100 : stone-900
                    size: 14,
                    face: 'Manrope'
                },
                shadow: {
                    enabled: true,
                    color: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                    size: 8,
                    x: 0,
                    y: 2
                }
            },
            edges: {
                width: 2,
                selectionWidth: 3,
                smooth: {
                    enabled: true,
                    type: 'continuous',
                    roundness: 0.5
                }
            },
            physics: {
                enabled: true,
                stabilization: {
                    enabled: true,
                    iterations: 200,
                    updateInterval: 25
                },
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 150,
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
                keyboard: {
                    enabled: true,
                    bindToWindow: false
                },
                multiselect: false,
                zoomView: true,
                dragView: true
            },
            layout: {
                improvedLayout: true,
                randomSeed: 42 // Consistent layout on refresh
            }
        };
        
        this.network = new vis.Network(container, data, options);
        
        // Event handlers
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const paperId = params.nodes[0];
                window.location.hash = `#/paper/${paperId}`;
            }
        });
        
        this.network.on('hoverNode', (params) => {
            document.body.style.cursor = 'pointer';
        });
        
        this.network.on('blurNode', () => {
            document.body.style.cursor = 'default';
        });
        
        // Physics stabilization complete
        this.network.on('stabilizationIterationsDone', () => {
            this.network.setOptions({ physics: false }); // Disable physics after stabilization
        });
    },

    getNodeColor(status) {
        const colors = {
            'Reading': '#3b82f6',     // blue-500
            'To Read': '#eab308',     // yellow-500
            'Finished': '#22c55e',    // green-500
            'default': '#78716c'      // stone-500
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
            ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? '...' : '')
            : 'No authors';
        const tags = paper.tags && paper.tags.length > 0
            ? paper.tags.join(', ')
            : 'No tags';
        
        return `
            <strong>${paper.title || 'Untitled'}</strong><br/>
            <em>${authors}</em><br/>
            Status: ${paper.readingStatus || 'Unknown'}<br/>
            Tags: ${tags}
        `;
    },

    populateTagFilter() {
        const tagFilter = document.getElementById('graph-tag-filter');
        if (!tagFilter) return;
        
        // Get all unique tags from papers
        const allTags = new Set();
        this.allPapers.forEach(paper => {
            if (paper.tags && paper.tags.length > 0) {
                paper.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        // Clear existing options (except "All Tags")
        while (tagFilter.options.length > 1) {
            tagFilter.remove(1);
        }
        
        // Add tag options
        Array.from(allTags).sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    },

    setupEventListeners() {
        const searchInput = document.getElementById('graph-search-input');
        const statusFilter = document.getElementById('graph-status-filter');
        const tagFilter = document.getElementById('graph-tag-filter');
        const resetBtn = document.getElementById('graph-reset-btn');
        const zoomInBtn = document.getElementById('graph-zoom-in');
        const zoomOutBtn = document.getElementById('graph-zoom-out');
        const fitBtn = document.getElementById('graph-fit');
        
        // Search
        this.searchHandler = () => {
            this.applyFilters();
        };
        if (searchInput) {
            searchInput.addEventListener('input', this.searchHandler);
        }
        
        // Status filter
        this.statusFilterHandler = () => {
            this.applyFilters();
        };
        if (statusFilter) {
            statusFilter.addEventListener('change', this.statusFilterHandler);
        }
        
        // Tag filter
        this.tagFilterHandler = () => {
            this.applyFilters();
        };
        if (tagFilter) {
            tagFilter.addEventListener('change', this.tagFilterHandler);
        }
        
        // Reset button
        this.resetHandler = () => {
            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = '';
            if (tagFilter) tagFilter.value = '';
            this.applyFilters();
            if (this.network) {
                this.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
            }
        };
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetHandler);
        }
        
        // Zoom controls
        this.zoomInHandler = () => {
            if (this.network) {
                const scale = this.network.getScale();
                this.network.moveTo({ scale: scale * 1.2, animation: { duration: 300 } });
            }
        };
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', this.zoomInHandler);
        }
        
        this.zoomOutHandler = () => {
            if (this.network) {
                const scale = this.network.getScale();
                this.network.moveTo({ scale: scale / 1.2, animation: { duration: 300 } });
            }
        };
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', this.zoomOutHandler);
        }
        
        this.fitHandler = () => {
            if (this.network) {
                this.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
            }
        };
        if (fitBtn) {
            fitBtn.addEventListener('click', this.fitHandler);
        }
    },

    applyFilters() {
        if (!this.network) return;
        
        const searchQuery = document.getElementById('graph-search-input')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('graph-status-filter')?.value || '';
        const tagFilter = document.getElementById('graph-tag-filter')?.value || '';
        
        // Filter papers
        const filtered = this.allPapers.filter(paper => {
            // Search filter
            if (searchQuery) {
                const titleMatch = paper.title?.toLowerCase().includes(searchQuery);
                const authorsMatch = paper.authors?.some(a => a.toLowerCase().includes(searchQuery));
                if (!titleMatch && !authorsMatch) return false;
            }
            
            // Status filter
            if (statusFilter && paper.readingStatus !== statusFilter) {
                return false;
            }
            
            // Tag filter
            if (tagFilter && (!paper.tags || !paper.tags.includes(tagFilter))) {
                return false;
            }
            
            return true;
        });
        
        // Update graph data
        const graphData = this.prepareGraphData(filtered);
        const nodes = this.network.body.data.nodes;
        const edges = this.network.body.data.edges;
        
        // Update nodes visibility
        const visibleNodeIds = new Set(graphData.nodes.map(n => n.id));
        nodes.forEach(node => {
            if (visibleNodeIds.has(node.id)) {
                nodes.update({ id: node.id, hidden: false });
            } else {
                nodes.update({ id: node.id, hidden: true });
            }
        });
        
        // Update edges visibility
        const visibleEdgeIds = new Set();
        graphData.edges.forEach(edge => {
            visibleEdgeIds.add(`${edge.from}-${edge.to}`);
            visibleEdgeIds.add(`${edge.to}-${edge.from}`);
        });
        
        edges.forEach(edge => {
            const edgeId = `${edge.from}-${edge.to}`;
            if (visibleEdgeIds.has(edgeId)) {
                edges.update({ id: edge.id, hidden: false });
            } else {
                edges.update({ id: edge.id, hidden: true });
            }
        });
        
        // Update stats
        this.updateStats(this.allPapers.length, this.network.body.data.edges.length, filtered.length);
        
        // Fit to visible nodes if filters are active
        if (searchQuery || statusFilter || tagFilter) {
            setTimeout(() => {
                if (this.network) {
                    this.network.fit({ 
                        nodes: Array.from(visibleNodeIds),
                        animation: { duration: 500, easingFunction: 'easeInOutQuad' }
                    });
                }
            }, 100);
        }
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


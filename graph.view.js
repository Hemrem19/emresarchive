import { addPaper, getAllPapers, getPaperByDoi } from './db.js';
import { escapeHtml, showToast } from './ui.js';
import { fetchDoiMetadata } from './api.js';
import { generateNetwork, getNetwork, getUserNetworks } from './api/network.js';
import { getAccessToken } from './api/auth.js';
import { forgetConnections } from './components/connectedPapers.js';

// How each kind of link is drawn (the legend in views/pages/graph.js matches)
const EDGE_STYLES = {
    cites: { width: 1.5, arrows: { to: { enabled: true, scaleFactor: 0.5 } }, color: { color: 'rgba(147,197,253,0.6)', highlight: '#3b82f6', hover: '#3b82f6' } },
    common_author: { width: 1, dashes: [4, 4], color: { color: 'rgba(255,255,255,0.15)', highlight: '#3b82f6', hover: '#3b82f6' } },
    related: { width: 1.5, color: { color: 'rgba(167,139,250,0.7)', highlight: '#a78bfa', hover: '#a78bfa' } },
    suggestion: { width: 1, dashes: [2, 4], arrows: { to: { enabled: true, scaleFactor: 0.4 } }, color: { color: 'rgba(148,163,184,0.3)', highlight: '#94a3b8', hover: '#94a3b8' } },
};
const SUGGESTION_PREFIX = 'suggested:';
// Lookups a rate limit left over are retried while the page stays open
const RETRY_DELAY_MS = 30000;
const MAX_RETRIES = 3;

export const graphView = {
    network: null,
    allPapers: [],
    filteredPapers: [],
    currentGraphId: null,
    nodePapers: new Map(),
    suggestions: new Map(),
    refreshing: false,
    retries: 0,
    retryTimer: null,
    searchHandler: null,
    statusFilterHandler: null,
    tagFilterHandler: null,
    generateHandler: null,
    zoomInHandler: null,
    zoomOutHandler: null,
    fitHandler: null,
    panelCloseHandler: null,
    panelOpenHandler: null,
    legendToggleHandler: null,
    selectedPaperId: null,
    selectedSuggestion: null,

    async mount(appState) {
        try {
            // Wait for DOM to be ready (renderView uses setTimeout, so we need to wait longer)
            // Also wait for vis-network library to load
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!window.vis) {
                console.error('vis-network library not loaded');
                showToast('Graph library not loaded. Please refresh the page.', 'error');
                return;
            }
            if (!document.getElementById('graph-network')) {
                console.error('Graph network container not found');
                showToast('Failed to initialize graph view', 'error');
                return;
            }

            this.retries = 0;
            this.setupEventListeners();
            try {
                // The side panel shows these papers when a node is clicked
                this.allPapers = await getAllPapers();
            } catch (dbError) {
                console.error('Error loading papers for graph:', dbError);
                this.showEmptyState('Unable to load papers. Database error: ' + (dbError.message || 'Unknown error'));
                return;
            }
            this.populateTagFilter();

            // Signed out: the links the user made by hand are all there is
            if (!getAccessToken()) {
                this.showLocal();
                return;
            }

            try {
                const [latest] = await getUserNetworks();
                if (latest?.id) {
                    const data = await getNetwork(latest.id);
                    this.showNetwork(data);
                    if (data.graph?.stale) this.refresh({ quiet: true });
                } else {
                    // First visit to this library: build its network without being asked
                    this.showLocal();
                    this.refresh({ quiet: true });
                }
            } catch (networkError) {
                console.warn('Failed to load saved network, showing local links:', networkError);
                this.showLocal();
                this.setStatus('Could not load the network. Showing the links you added yourself.');
            }
        } catch (error) {
            console.error('Error mounting graph view:', error);
            showToast('Failed to load paper network', 'error');
            this.showEmptyState();
        }
    },

    /** Links the user added under Related Papers, from this device's data. */
    showLocal() {
        const graphData = this.prepareLocalGraphData(this.allPapers);
        this.nodePapers = new Map(this.allPapers.map(p => [p.id, p]));
        this.suggestions = new Map();
        if (graphData.edges.length === 0) {
            this.showEmptyState();
        } else {
            this.hideEmptyState();
            this.renderGraph(graphData);
        }
    },

    async loadNetwork(networkId, stats) {
        const data = await getNetwork(networkId);
        this.showNetwork(data, stats);
    },

    /**
     * Draws a server network: the library's papers, their links, and the
     * papers it cites but lacks (hollow nodes).
     * @param {{ graph, nodes, edges, suggestions }} data
     * @param {Object} [stats] - from a run just made (pending lookups and misses)
     */
    showNetwork(data, stats) {
        this.currentGraphId = data.graph?.id ?? null;
        const localById = new Map(this.allPapers.map(p => [p.id, p]));
        this.nodePapers = new Map();

        const nodes = data.nodes.map(n => {
            const id = parseInt(n.id);
            // Prefer this device's copy (abstract, reading status); the server's otherwise
            this.nodePapers.set(id, localById.get(id) || { title: n.label, ...n.data, id, readingStatus: n.data.status });
            return {
                id,
                label: this.truncateTitle(n.label, 20),
                fullTitle: n.label,
                status: n.data.status,
                tags: n.data.tags || [],
                shape: 'dot',
                size: 25,
                color: this.getNodeColor(n.data.status),
                font: { color: '#ffffff', strokeWidth: 0, size: 14, face: 'Manrope' },
                shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10, x: 0, y: 0 }
            };
        });
        const ids = new Set(nodes.map(n => n.id));

        const edges = data.edges.map(e => this.edge(parseInt(e.source), parseInt(e.target), e.type, e.id));
        // Related Papers links live on this device only; draw the ones the server lacks
        const linked = new Set(edges.map(e => [Math.min(e.from, e.to), Math.max(e.from, e.to)].join('-')));
        for (const edge of this.prepareLocalGraphData(this.allPapers.filter(p => ids.has(p.id))).edges) {
            const key = [Math.min(edge.from, edge.to), Math.max(edge.from, edge.to)].join('-');
            if (!linked.has(key)) edges.push(this.edge(edge.from, edge.to, 'related'));
        }

        // Size by degree before the suggestions add their own links
        const degree = new Map();
        edges.forEach(e => {
            degree.set(e.from, (degree.get(e.from) || 0) + 1);
            degree.set(e.to, (degree.get(e.to) || 0) + 1);
        });
        nodes.forEach(n => {
            const d = degree.get(n.id) || 0;
            n.size = Math.max(20, Math.min(50, 20 + d * 3));
            n.value = d;
        });

        this.suggestions = new Map();
        for (const s of data.suggestions || []) {
            const id = SUGGESTION_PREFIX + s.openAlexId;
            this.suggestions.set(id, s);
            nodes.push(this.suggestionNode(id, s));
            for (const from of s.citedBy) {
                if (ids.has(parseInt(from))) edges.push(this.edge(parseInt(from), id, 'suggestion'));
            }
        }

        if (nodes.length === 0) this.showEmptyState();
        else this.hideEmptyState();
        this.renderGraph({ nodes, edges });
        this.populateTagFilterFromNodes(nodes);
        this.setStatus(this.describe(data, stats));
    },

    edge(from, to, type, id) {
        const style = EDGE_STYLES[type] || EDGE_STYLES.common_author;
        return { ...(id ? { id } : {}), from, to, type, smooth: { type: 'curvedCW', roundness: 0.2 }, ...style };
    },

    suggestionNode(id, s) {
        return {
            id,
            label: this.truncateTitle(s.title, 20),
            fullTitle: s.title,
            suggested: true,
            tags: [],
            shape: 'dot',
            size: 12,
            borderWidth: 2,
            color: { background: '#0f172a', border: '#94a3b8', highlight: { background: '#1e293b', border: '#ffffff' }, hover: { background: '#1e293b', border: '#ffffff' } },
            font: { color: '#94a3b8', strokeWidth: 0, size: 11, face: 'Manrope' },
            shadow: false,
        };
    },

    /** One line on what the network holds and what it is still missing. */
    describe(data, stats) {
        const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
        const cites = data.edges.filter(e => e.type === 'cites').length;
        const parts = [count(cites, 'citation link')];
        if (data.suggestions?.length) parts.push(count(data.suggestions.length, 'suggested paper'));
        const withoutDoi = data.nodes.filter(n => !n.data?.doi).length;
        if (withoutDoi) parts.push(`${count(withoutDoi, 'paper')} without a DOI`);
        if (stats?.notFound) parts.push(`${count(stats.notFound, 'paper')} not found in OpenAlex or Semantic Scholar`);
        if (stats?.pendingLookups) parts.unshift(`Finding links for ${count(stats.pendingLookups, 'more paper')}…`);
        return parts.join(' · ');
    },

    setStatus(text) {
        const el = document.getElementById('graph-status');
        if (!el) return;
        el.textContent = text || '';
        el.classList.toggle('hidden', !text);
    },

    showEmptyState(message) {
        const emptyState = document.getElementById('graph-empty-state');
        if (!emptyState) return;
        emptyState.classList.remove('hidden');
        const text = emptyState.querySelector('p');
        if (text && message) text.textContent = message;
    },

    hideEmptyState() {
        document.getElementById('graph-empty-state')?.classList.add('hidden');
    },

    /**
     * Rebuilds the open library's network on the server and redraws it.
     * quiet: started by the page itself, so only the status line reports.
     */
    async refresh({ quiet = false } = {}) {
        if (this.refreshing) return;
        this.refreshing = true;
        clearTimeout(this.retryTimer);
        const btn = document.getElementById('graph-generate-btn');
        const icon = btn?.querySelector('.material-symbols-outlined');
        if (btn) btn.disabled = true;
        icon?.classList.add('animate-spin');
        this.setStatus('Finding citation links…');

        try {
            const result = await generateNetwork();
            forgetConnections();
            if (!this.network && !document.getElementById('graph-network')) return; // left the page
            await this.loadNetwork(result.graph.id, result.stats);
            if (!quiet) showToast(`Network updated: ${result.stats.nodeCount} papers`, 'success');
            if (result.stats.pendingLookups > 0 && this.retries < MAX_RETRIES) {
                this.retries += 1;
                this.retryTimer = setTimeout(() => this.refresh({ quiet: true }), RETRY_DELAY_MS);
            }
        } catch (error) {
            console.error('Generation failed:', error);
            this.setStatus('Could not update the network. Try Refresh in a moment.');
            if (!quiet) showToast(error.message || 'Failed to generate network', 'error');
        } finally {
            this.refreshing = false;
            if (btn) btn.disabled = false;
            icon?.classList.remove('animate-spin');
        }
    },

    handleGenerate() {
        this.retries = 0;
        return this.refresh();
    },

    unmount() {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
        if (this.network) {
            this.network.destroy();
            this.network = null;
        }

        // Remove event listeners
        const listeners = [
            ['graph-search-input', 'input', this.searchHandler],
            ['graph-status-filter', 'change', this.statusFilterHandler],
            ['graph-tag-filter', 'change', this.tagFilterHandler],
            ['graph-generate-btn', 'click', this.generateHandler],
            ['graph-zoom-in', 'click', this.zoomInHandler],
            ['graph-zoom-out', 'click', this.zoomOutHandler],
            ['graph-fit', 'click', this.fitHandler],
            ['panel-close-btn', 'click', this.panelCloseHandler],
            ['panel-open-btn', 'click', this.panelOpenHandler],
            ['graph-legend-toggle', 'click', this.legendToggleHandler],
        ];
        for (const [id, event, handler] of listeners) {
            if (handler) document.getElementById(id)?.removeEventListener(event, handler);
        }

        this.allPapers = [];
        this.filteredPapers = [];
        this.nodePapers = new Map();
        this.suggestions = new Map();
        this.selectedSuggestion = null;
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
                            edges.push(this.edge(paper.id, relatedId, 'related'));
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

        // Settle once, then hold still: clicking or dragging a node must not
        // send the whole layout moving again
        this.network.once('stabilizationIterationsDone', () => {
            this.network?.setOptions({ physics: { enabled: false } });
        });

        // Events
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                this.handleNodeClick(params.nodes[0]);
            } else {
                this.closeSidePanel();
            }
        });

        this.network.on('doubleClick', (params) => {
            const id = params.nodes[0];
            if (id !== undefined && !this.suggestions.has(id)) {
                window.location.hash = `#/details/${id}`;
            }
        });

        this.network.on('hoverNode', () => {
            document.body.style.cursor = 'pointer';
        });

        this.network.on('blurNode', () => {
            document.body.style.cursor = 'default';
        });
    },

    handleNodeClick(nodeId) {
        const suggestion = this.suggestions.get(nodeId);
        if (suggestion) {
            this.selectedPaperId = null;
            this.selectedSuggestion = suggestion;
            this.updateSuggestionPanel(suggestion);
            this.openSidePanel();
            return;
        }
        this.selectedSuggestion = null;
        this.selectedPaperId = nodeId;
        const paper = this.nodePapers.get(nodeId) || this.allPapers.find(p => p.id == nodeId);
        if (!paper) return;

        this.updateSidePanel(paper);
        this.setPanelAction('Open Full Details');
        this.openSidePanel();
    },

    setPanelAction(label, { disabled = false, hidden = false } = {}) {
        const btn = document.getElementById('panel-open-btn');
        if (!btn) return;
        btn.textContent = label;
        btn.disabled = disabled;
        btn.classList.toggle('hidden', hidden);
    },

    /** A paper the library cites but lacks: who cites it, and adding it. */
    updateSuggestionPanel(s) {
        const panelContent = document.getElementById('panel-content');
        if (!panelContent) return;
        const citing = s.citedBy
            .map(id => this.nodePapers.get(parseInt(id)))
            .filter(Boolean)
            .map(p => `<li><a href="#/details/${encodeURIComponent(p.id)}" class="text-primary hover:underline">${escapeHtml(p.title || 'Untitled')}</a></li>`)
            .join('');
        const facts = [s.year, s.citedByCount ? `cited ${s.citedByCount.toLocaleString()} times` : null].filter(Boolean).map(v => escapeHtml(String(v))).join(' • ');

        panelContent.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                <div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Suggested paper</p>
                    <h3 class="text-xl font-bold text-white leading-tight mb-2">${escapeHtml(s.title || 'Untitled')}</h3>
                    ${facts ? `<p class="text-xs text-slate-500">${facts}</p>` : ''}
                </div>
                <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cited by ${s.citedBy.length} of your papers</h4>
                    <ul class="text-sm space-y-1.5 list-disc pl-4 text-slate-300">${citing}</ul>
                </div>
                ${s.doi ? '' : '<p class="text-sm text-slate-400">No DOI is known for it, so it has to be added by hand.</p>'}
            </div>
        `;
        if (s.added) this.setPanelAction('Added to library', { disabled: true });
        else this.setPanelAction('Add to library', { hidden: !s.doi });
    },

    /** Adds a suggested paper to the open library, as Quick Add does with a DOI. */
    async addSuggestion(s) {
        this.setPanelAction('Adding…', { disabled: true });
        try {
            const existing = await getPaperByDoi(s.doi);
            if (existing) {
                showToast(`Already in your library: "${existing.title}"`, 'info');
            } else {
                const metadata = await fetchDoiMetadata(s.doi);
                await addPaper({
                    ...metadata,
                    tags: [], createdAt: new Date(), readingStatus: 'To Read',
                    hasPdf: false, pdfFile: null, notes: '',
                });
                showToast('Paper added to your library', 'success');
            }
            s.added = true;
            // Drawn as a library paper now; the next network run links it for real
            this.network?.body.data.nodes.update({
                id: SUGGESTION_PREFIX + s.openAlexId,
                suggested: false, status: 'To Read', size: 20, borderWidth: 0, shadow: true,
                color: this.getNodeColor('To Read'),
                font: { color: '#ffffff', strokeWidth: 0, size: 14, face: 'Manrope' },
            });
            if (this.selectedSuggestion === s) this.updateSuggestionPanel(s);
        } catch (error) {
            console.error('Adding suggested paper failed:', error);
            showToast(error.message || 'Could not add the paper', 'error');
            if (this.selectedSuggestion === s) this.setPanelAction('Add to library');
        }
    },

    updateSidePanel(paper) {
        const panelContent = document.getElementById('panel-content');
        if (!panelContent) return;

        const authors = paper.authors && paper.authors.length > 0
            ? escapeHtml(Array.isArray(paper.authors) ? paper.authors.join(', ') : String(paper.authors))
            : 'Unknown Authors';

        const tags = paper.tags && paper.tags.length > 0
            ? paper.tags.map(tag => `<span class="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">#${escapeHtml(String(tag))}</span>`).join('')
            : '';

        const abstract = paper.abstract
            ? escapeHtml(paper.abstract.length > 300 ? paper.abstract.substring(0, 300) + '...' : paper.abstract)
            : 'No abstract available.';

        panelContent.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                <div>
                    <h3 class="text-xl font-bold text-white leading-tight mb-2">${escapeHtml(paper.title || 'Untitled')}</h3>
                    <p class="text-sm text-slate-400">${authors}</p>
                    <p class="text-xs text-slate-500 mt-1">${escapeHtml(String(paper.year || 'Unknown Year'))} • ${escapeHtml(paper.journal || paper.publication || 'Unknown Publication')}</p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClass(paper.readingStatus)}">
                        ${escapeHtml(paper.readingStatus || 'To Read')}
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
        this.selectedSuggestion = null;
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
            if (this.selectedSuggestion) {
                if (!this.selectedSuggestion.added) this.addSuggestion(this.selectedSuggestion);
            } else if (this.selectedPaperId) {
                window.location.hash = `#/details/${this.selectedPaperId}`;
            }
        };
        if (panelOpenBtn) panelOpenBtn.addEventListener('click', this.panelOpenHandler);

        // Phones: the legend stays folded until asked for
        this.legendToggleHandler = () => document.getElementById('graph-legend-body')?.classList.toggle('hidden');
        document.getElementById('graph-legend-toggle')?.addEventListener('click', this.legendToggleHandler);
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

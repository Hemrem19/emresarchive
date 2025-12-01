import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/lib/prisma.js';
import { citationService } from '../../src/services/citation.js';

// Mock dependencies
vi.mock('../../src/lib/prisma.js');
vi.mock('../../src/services/citation.js');

// Mock authentication middleware BEFORE importing app
vi.mock('../../src/middleware/auth.js', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    }
}));

// Import app after mocks
import app from '../../src/server.js';

describe('Network Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/networks', () => {
        it('should return a list of networks', async () => {
            const mockNetworks = [
                { id: 1, name: 'Auto Network', isAuto: true, userId: 1 }
            ];

            prisma.networkGraph.findMany.mockResolvedValue(mockNetworks);

            const res = await request(app)
                .get('/api/networks')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].name).toBe('Auto Network');
        });
    });

    describe('POST /api/networks/auto-generate', () => {
        it('should trigger network generation', async () => {
            const mockResult = { nodeCount: 10, edgeCount: 5 };
            const mockGraph = { id: 1, name: 'Auto-Generated Network', nodeCount: 10, edgeCount: 5 };

            citationService.generateNetwork.mockResolvedValue(mockResult);
            prisma.networkGraph.findFirst.mockResolvedValue(null);
            prisma.networkGraph.create.mockResolvedValue(mockGraph);

            const res = await request(app)
                .post('/api/networks/auto-generate')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.stats).toEqual(mockResult);
            expect(citationService.generateNetwork).toHaveBeenCalledWith(1);
        });
    });

    describe('GET /api/networks/:id', () => {
        it('should return graph data with nodes and edges', async () => {
            const mockGraph = { id: '1', name: 'My Network', userId: 1 };
            const mockPapers = [
                { id: 1, title: 'Paper A', doi: '10.1/a', status: 'read', year: 2023, authors: [], tags: [] },
                { id: 2, title: 'Paper B', doi: '10.1/b', status: 'unread', year: 2024, authors: [], tags: [] }
            ];
            const mockConnections = [
                { id: 1, fromPaperId: 1, toPaperId: 2, connectionType: 'cites' }
            ];

            prisma.networkGraph.findFirst.mockResolvedValue(mockGraph);
            prisma.paper.findMany.mockResolvedValue(mockPapers);
            prisma.paperConnection.findMany.mockResolvedValue(mockConnections);

            const res = await request(app)
                .get('/api/networks/1')
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.nodes).toHaveLength(2);
            expect(res.body.data.edges).toHaveLength(1);
            expect(res.body.data.nodes[0].label).toBe('Paper A');
            expect(res.body.data.edges[0].source).toBe('1');
            expect(res.body.data.edges[0].target).toBe('2');
        });

        it('should return 404 if network not found', async () => {
            prisma.networkGraph.findFirst.mockResolvedValue(null);

            await request(app)
                .get('/api/networks/999')
                .expect(404);
        });
    });
});

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { citationService } from '../services/citation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

console.log('✅ Network routes loaded');

// Generate auto-network for user
router.post('/auto-generate', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await citationService.generateNetwork(userId);

        // Find or create the auto-network graph record
        let graph = await prisma.networkGraph.findFirst({
            where: { userId, isAuto: true }
        });

        if (graph) {
            graph = await prisma.networkGraph.update({
                where: { id: graph.id },
                data: {
                    nodeCount: result.nodeCount,
                    edgeCount: result.edgeCount,
                    updatedAt: new Date()
                }
            });
        } else {
            graph = await prisma.networkGraph.create({
                data: {
                    userId,
                    name: 'Auto-Generated Network',
                    isAuto: true,
                    nodeCount: result.nodeCount,
                    edgeCount: result.edgeCount
                }
            });
        }

        res.json({ success: true, data: { graph, stats: result } });
    } catch (error) {
        next(error);
    }
});

// Get network data (nodes and edges)
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const graph = await prisma.networkGraph.findFirst({
            where: { id, userId }
        });

        if (!graph) {
            return res.status(404).json({ success: false, error: 'Network not found' });
        }

        // Fetch all papers (nodes)
        const papers = await prisma.paper.findMany({
            where: { userId, deletedAt: null },
            select: { id: true, title: true, doi: true, status: true, year: true, authors: true, tags: true }
        });

        // Fetch all connections (edges)
        // For now, we return ALL connections. In future, filter by graph if we support multiple.
        const connections = await prisma.paperConnection.findMany({
            where: {
                fromPaper: { userId },
                toPaper: { userId }
            }
        });

        res.json({
            success: true,
            data: {
                graph,
                nodes: papers.map(p => ({
                    id: p.id.toString(),
                    label: p.title,
                    data: p
                })),
                edges: connections.map(c => ({
                    id: c.id,
                    source: c.fromPaperId.toString(),
                    target: c.toPaperId.toString(),
                    type: c.connectionType
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get user's networks list
router.get('/', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const networks = await prisma.networkGraph.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ success: true, data: networks });
    } catch (error) {
        next(error);
    }
});

export default router;

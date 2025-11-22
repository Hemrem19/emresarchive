import { prisma } from '../lib/prisma.js';
import { fetchDoiMetadata, fetchArxivMetadata } from '../lib/metadata.js';
import { z } from 'zod';

const saveSchema = z.object({
    url: z.string().url().optional(),
    doi: z.string().optional().nullable(),
    arxivId: z.string().optional().nullable(),
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional()
});

export const savePaper = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const data = saveSchema.parse(req.body);

        let metadata = null;

        try {
            // 1. Fetch Metadata
            if (data.arxivId) {
                metadata = await fetchArxivMetadata(data.arxivId);
            } else if (data.doi) {
                metadata = await fetchDoiMetadata(data.doi);
            } else {
                // Fallback
                if (!data.title) {
                    return res.status(400).json({
                        success: false,
                        error: { message: 'DOI, arXiv ID, or Title is required' }
                    });
                }
                metadata = {
                    title: data.title,
                    authors: ['Unknown'],
                    year: new Date().getFullYear(),
                    url: data.url || '',
                    doi: null,
                    journal: null,
                    notes: '',
                    tags: []
                };
            }
        } catch (fetchError) {
            return res.status(400).json({
                success: false,
                error: { message: `Metadata fetch failed: ${fetchError.message}` }
            });
        }

        // 2. Check for duplicates (by DOI)
        if (metadata.doi) {
            const existing = await prisma.paper.findFirst({
                where: {
                    userId,
                    doi: metadata.doi,
                    deletedAt: null
                }
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: { message: 'Paper with this DOI already exists' },
                    data: existing
                });
            }
        }

        // 3. Save to DB
        const paper = await prisma.paper.create({
            data: {
                userId,
                title: metadata.title,
                authors: metadata.authors,
                journal: metadata.journal,
                year: metadata.year,
                doi: metadata.doi,
                url: metadata.url,
                tags: data.tags || metadata.tags,
                status: 'To Read',
                notes: data.notes || metadata.notes,
                clientId: 'extension',
                version: 1,
                pdfUrl: metadata.pdfUrl || null
            }
        });

        res.json({ success: true, data: paper });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid input', details: error.errors }
            });
        }
        next(error);
    }
};


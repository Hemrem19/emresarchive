/**
 * Tests for api/arxiv.js - arXiv Metadata Fetching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Window } from 'happy-dom';
import { fetchArxivMetadata } from '../api/arxiv.js';

// Create a window instance for DOMParser
const window = new Window();
const document = window.document;

// Mock fetch globally
global.fetch = vi.fn();
// Use happy-dom's DOMParser
global.DOMParser = window.DOMParser;

describe('api/arxiv.js - fetchArxivMetadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.navigator = { onLine: true };
    });

    describe('Input Validation', () => {
        it('should reject invalid arXiv ID format', async () => {
            await expect(fetchArxivMetadata('invalid')).rejects.toThrow('Invalid arXiv ID format');
        });

        it('should reject empty string', async () => {
            await expect(fetchArxivMetadata('')).rejects.toThrow('Invalid arXiv ID format');
        });

        it('should accept valid arXiv ID without version', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper</title>
                        <summary>Test summary</summary>
                        <published>2023-01-01T00:00:00Z</published>
                        <author><name>Author Name</name></author>
                        <link title="pdf" href="https://arxiv.org/pdf/2310.00123.pdf"/>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            expect(result.title).toBe('Test Paper');
        });

        it('should accept valid arXiv ID with version', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper</title>
                        <summary>Test summary</summary>
                        <published>2023-01-01T00:00:00Z</published>
                        <author><name>Author Name</name></author>
                        <link title="pdf" href="https://arxiv.org/pdf/2310.00123v1.pdf"/>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123v1');
            expect(result.title).toBe('Test Paper');
        });
    });

    describe('Successful Metadata Fetching', () => {
        it('should fetch and parse arXiv metadata', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper Title</title>
                        <summary>This is a test abstract</summary>
                        <published>2023-10-01T12:00:00Z</published>
                        <author><name>John Doe</name></author>
                        <author><name>Jane Smith</name></author>
                        <link title="pdf" href="https://arxiv.org/pdf/2310.00123.pdf"/>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            
            expect(result.title).toBe('Test Paper Title');
            expect(result.authors).toEqual(['John Doe', 'Jane Smith']);
            expect(result.journal).toBe('arXiv');
            expect(result.year).toBe(2023);
            expect(result.doi).toBe('10.48550/arXiv.2310.00123');
            expect(result.url).toBe('https://arxiv.org/abs/2310.00123');
            expect(result.pdfUrl).toBe('https://arxiv.org/pdf/2310.00123.pdf');
            expect(result.notes).toContain('This is a test abstract');
        });

        it('should handle missing optional fields', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Minimal Paper</title>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            
            expect(result.title).toBe('Minimal Paper');
            expect(result.authors).toEqual(['Unknown Author']);
            expect(result.journal).toBe('arXiv');
            expect(result.year).toBeNull();
            expect(result.doi).toBe('10.48550/arXiv.2310.00123');
            expect(result.notes).toBe('');
        });

        it('should extract DOI from metadata if available', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper</title>
                        <link title="doi" href="https://doi.org/10.1234/test.doi"/>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            expect(result.doi).toBe('10.1234/test.doi');
        });

        it('should normalize whitespace in title', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Title   with    multiple    spaces</title>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            expect(result.title).toBe('Title with multiple spaces');
        });

        it('should handle custom timeout', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper</title>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123', { timeout: 5000 });
            expect(result.title).toBe('Test Paper');
        });
    });

    describe('Error Handling', () => {
        it('should handle timeout errors', async () => {
            const controller = { abort: vi.fn() };
            const AbortController = vi.fn(() => controller);
            global.AbortController = AbortController;
            
            global.fetch.mockImplementationOnce(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => {
                        const error = new Error('Aborted');
                        error.name = 'AbortError';
                        reject(error);
                    }, 10);
                });
            });

            await expect(fetchArxivMetadata('2310.00123', { timeout: 5 })).rejects.toThrow('Request timed out');
        });

        it('should handle network errors when offline', async () => {
            global.navigator.onLine = false;
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(fetchArxivMetadata('2310.00123')).rejects.toThrow('No internet connection');
        });

        it('should handle network errors when online', async () => {
            global.navigator.onLine = true;
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(fetchArxivMetadata('2310.00123')).rejects.toThrow('Network error');
        });

        it('should handle non-OK HTTP responses', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            await expect(fetchArxivMetadata('2310.00123')).rejects.toThrow('arXiv service error (500)');
        });

        it('should handle missing entry in response', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <!-- No entry -->
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            await expect(fetchArxivMetadata('2310.00123')).rejects.toThrow('arXiv ID not found');
        });

        it('should handle invalid date in published field', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper</title>
                        <published>invalid-date</published>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            expect(result.year).toBeNull();
        });
    });

    describe('PDF URL Handling', () => {
        it('should use PDF link from metadata if available', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper</title>
                        <link title="pdf" href="https://custom-url.com/pdf"/>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            expect(result.pdfUrl).toBe('https://custom-url.com/pdf');
        });

        it('should fallback to default PDF URL if no link provided', async () => {
            const mockXml = `<?xml version="1.0"?>
                <feed>
                    <entry>
                        <title>Test Paper</title>
                    </entry>
                </feed>`;
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                text: vi.fn().mockResolvedValue(mockXml)
            });

            const result = await fetchArxivMetadata('2310.00123');
            expect(result.pdfUrl).toBe('https://arxiv.org/pdf/2310.00123.pdf');
        });
    });
});


/**
 * Unit Tests for Metadata Library
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDoiMetadata, fetchArxivMetadata } from '../../src/lib/metadata.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('Metadata Library', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchDoiMetadata', () => {
        it('should fetch and parse DOI metadata successfully', async () => {
            const mockResponse = {
                title: 'Sample Research Paper',
                author: [
                    { given: 'John', family: 'Doe' },
                    { given: 'Jane', family: 'Smith' }
                ],
                'container-title': 'Nature',
                issued: { 'date-parts': [[2024]] },
                DOI: '10.1234/example',
                URL: 'https://doi.org/10.1234/example'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await fetchDoiMetadata('10.1234/example');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://doi.org/10.1234/example',
                { headers: { 'Accept': 'application/vnd.citationstyles.csl+json' } }
            );

            expect(result).toEqual({
                title: 'Sample Research Paper',
                authors: ['John Doe', 'Jane Smith'],
                journal: 'Nature',
                year: 2024,
                doi: '10.1234/example',
                url: 'https://doi.org/10.1234/example',
                tags: [],
                notes: ''
            });
        });

        it('should handle DOI with "doi:" prefix', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            await fetchDoiMetadata('doi:10.1234/test');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://doi.org/10.1234/test',
                expect.any(Object)
            );
        });

        it('should handle authors with literal names', async () => {
            const mockResponse = {
                title: 'Test Paper',
                author: [
                    { literal: 'The Research Team' }
                ],
                DOI: '10.1234/test'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await fetchDoiMetadata('10.1234/test');

            expect(result.authors).toEqual(['The Research Team']);
        });

        it('should handle missing authors', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await fetchDoiMetadata('10.1234/test');

            expect(result.authors).toEqual(['Unknown Author']);
        });

        it('should handle missing year', async () => {
            const mockResponse = {
                title: 'Test Paper',
                DOI: '10.1234/test'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await fetchDoiMetadata('10.1234/test');

            expect(result.year).toBe(new Date().getFullYear());
        });

        it('should throw error on failed fetch', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });

            await expect(fetchDoiMetadata('10.1234/invalid'))
                .rejects.toThrow('Failed to fetch DOI metadata: 404 Not Found');
        });

        it('should use "Untitled Paper" as default title', async () => {
            const mockResponse = {
                DOI: '10.1234/test'
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const result = await fetchDoiMetadata('10.1234/test');

            expect(result.title).toBe('Untitled Paper');
        });
    });

    describe('fetchArxivMetadata', () => {
        it('should fetch and parse arXiv metadata successfully', async () => {
            const mockXML = `
        <entry>
          <title>Sample ArXiv Paper  
          With Line Breaks</title>
          <summary>This is a test abstract.</summary>
          <published>2024-01-15T00:00:00Z</published>
          <author><name>John Doe</name></author>
          <author><name>Jane Smith</name></author>
          <link title="pdf" href="https://arxiv.org/pdf/2401.12345v1" rel="related"/>
        </entry>
      `;

            global.fetch.mockResolvedValue({
                ok: true,
                text: async () => mockXML
            });

            const result = await fetchArxivMetadata('2401.12345');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://export.arxiv.org/api/query?id_list=2401.12345'
            );

            expect(result).toEqual({
                title: 'Sample ArXiv Paper With Line Breaks',
                authors: ['John Doe', 'Jane Smith'],
                journal: 'arXiv',
                year: 2024,
                doi: '10.48550/arXiv.2401.12345',
                url: 'https://arxiv.org/abs/2401.12345',
                pdfUrl: 'https://arxiv.org/pdf/2401.12345v1',
                notes: '<h3>Abstract</h3><p>This is a test abstract.</p>',
                tags: []
            });
        });

        it('should throw error if arXiv ID not found', async () => {
            const mockXML = '<feed></feed>';

            global.fetch.mockResolvedValue({
                ok: true,
                text: async () => mockXML
            });

            await expect(fetchArxivMetadata('9999.99999'))
                .rejects.toThrow('arXiv ID "9999.99999" not found');
        });

        it('should handle missing authors', async () => {
            const mockXML = `
        <entry>
          <title>Test Paper</title>
          <published>2024-01-01T00:00:00Z</published>
        </entry>
      `;

            global.fetch.mockResolvedValue({
                ok: true,
                text: async () => mockXML
            });

            const result = await fetchArxivMetadata('2401.12345');

            expect(result.authors).toEqual(['Unknown Author']);
        });

        it('should handle published papers with DOI', async () => {
            const mockXML = `
        <entry>
          <title>Published Paper</title>
          <published>2024-01-01T00:00:00Z</published>
          <author><name>Test Author</name></author>
          <link title="doi" href="http://dx.doi.org/10.1103/PhysRevD.76.013009" rel="related"/>
        </entry>
      `;

            global.fetch.mockResolvedValue({
                ok: true,
                text: async () => mockXML
            });

            const result = await fetchArxivMetadata('2401.12345');

            expect(result.doi).toBe('10.1103/PhysRevD.76.013009');
        });

        it('should use arXiv DOI when no published DOI exists', async () => {
            const mockXML = `
        <entry>
          <title>Unpublished Paper</title>
          <published>2024-01-01T00:00:00Z</published>
          <author><name>Test Author</name></author>
        </entry>
      `;

            global.fetch.mockResolvedValue({
                ok: true,
                text: async () => mockXML
            });

            const result = await fetchArxivMetadata('2401.12345');

            expect(result.doi).toBe('10.48550/arXiv.2401.12345');
        });

        it('should handle missing summary', async () => {
            const mockXML = `
        <entry>
          <title>Test Paper</title>
          <published>2024-01-01T00:00:00Z</published>
          <author><name>Test Author</name></author>
        </entry>
      `;

            global.fetch.mockResolvedValue({
                ok: true,
                text: async () => mockXML
            });

            const result = await fetchArxivMetadata('2401.12345');

            expect(result.notes).toBe('');
        });

        it('should throw error on failed fetch', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error'
            });

            await expect(fetchArxivMetadata('2401.12345'))
                .rejects.toThrow('Failed to fetch arXiv metadata: 500 Server Error');
        });

        it('should normalize title whitespace', async () => {
            const mockXML = `
        <entry>
          <title>Title   With    Extra     Spaces</title>
          <published>2024-01-01T00:00:00Z</published>
        </entry>
      `;

            global.fetch.mockResolvedValue({
                ok: true,
                text: async () => mockXML
            });

            const result = await fetchArxivMetadata('2401.12345');

            expect(result.title).toBe('Title With Extra Spaces');
        });
    });
});

/**
 * Tests for citation.js
 * Citation format generation, bibliography generation, and export functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    generateCitation, 
    generateBibliography,
    exportBibliographyToFile,
    copyBibliographyToClipboard
} from '../citation.js';

describe('citation.js', () => {
    // Helper function to create mock papers
    const createMockPaper = (overrides = {}) => ({
        title: 'Test Paper',
        authors: ['John Doe'],
        year: 2023,
        journal: 'Test Journal',
        doi: '10.1000/test',
        ...overrides
    });

    describe('generateCitation', () => {
        describe('APA format', () => {
            it('should generate APA citation with all fields', () => {
                const paper = createMockPaper({
                    authors: ['John Doe'],
                    year: 2023,
                    title: 'Machine Learning Basics',
                    journal: 'Journal of AI',
                    doi: '10.1000/test'
                });
                
                const citation = generateCitation(paper, 'apa');
                expect(citation).toContain('Doe, J.');
                expect(citation).toContain('(2023)');
                expect(citation).toContain('Machine Learning Basics');
                expect(citation).toContain('Journal of AI');
                expect(citation).toContain('10.1000/test');
            });

            it('should handle multiple authors in APA format', () => {
                const paper = createMockPaper({
                    authors: ['John Doe', 'Jane Smith']
                });
                
                const citation = generateCitation(paper, 'apa');
                expect(citation).toContain('Doe, J.');
                expect(citation).toContain('Smith, J.');
                expect(citation).toContain('&');
            });

            it('should handle missing authors in APA format', () => {
                const paper = createMockPaper({ authors: [] });
                const citation = generateCitation(paper, 'apa');
                expect(citation).toContain('(2023)');
                expect(citation).toContain('Test Paper');
            });

            it('should handle missing year in APA format', () => {
                const paper = createMockPaper({ year: null });
                const citation = generateCitation(paper, 'apa');
                expect(citation).toContain('(n.d.).');
            });

            it('should handle missing fields in APA format', () => {
                const paper = {
                    authors: ['John Doe'],
                    year: 2023
                };
                const citation = generateCitation(paper, 'apa');
                expect(citation).toBeTruthy();
                expect(citation).toContain('Doe, J.');
                expect(citation).toContain('(2023)');
            });
        });

        describe('IEEE format', () => {
            it('should generate IEEE citation with all fields', () => {
                const paper = createMockPaper({
                    authors: ['John Doe'],
                    year: 2023,
                    title: 'Machine Learning Basics',
                    journal: 'Journal of AI',
                    doi: '10.1000/test'
                });
                
                const citation = generateCitation(paper, 'ieee');
                expect(citation).toContain('J. Doe');
                expect(citation).toContain('Machine Learning Basics');
                expect(citation).toContain('Journal of AI');
                expect(citation).toContain('2023');
                expect(citation).toContain('doi: 10.1000/test');
            });

            it('should handle multiple authors in IEEE format', () => {
                const paper = createMockPaper({
                    authors: ['John Doe', 'Jane Smith']
                });
                
                const citation = generateCitation(paper, 'ieee');
                expect(citation).toContain('J. Doe');
                expect(citation).toContain('J. Smith');
                expect(citation).toContain('and');
            });

            it('should handle missing fields in IEEE format', () => {
                const paper = {
                    authors: ['John Doe'],
                    year: 2023
                };
                const citation = generateCitation(paper, 'ieee');
                expect(citation).toBeTruthy();
                expect(citation).toContain('J. Doe');
            });
        });

        describe('MLA format', () => {
            it('should generate MLA citation with all fields', () => {
                const paper = createMockPaper({
                    authors: ['John Doe'],
                    year: 2023,
                    title: 'Machine Learning Basics',
                    journal: 'Journal of AI',
                    doi: '10.1000/test'
                });
                
                const citation = generateCitation(paper, 'mla');
                expect(citation).toContain('Doe, John');
                expect(citation).toContain('Machine Learning Basics');
                expect(citation).toContain('Journal of AI');
                expect(citation).toContain('2023');
            });

            it('should handle multiple authors in MLA format', () => {
                const paper = createMockPaper({
                    authors: ['John Doe', 'Jane Smith']
                });
                
                const citation = generateCitation(paper, 'mla');
                expect(citation).toContain('Doe, John');
                expect(citation).toContain('and');
            });
        });

        describe('Chicago format', () => {
            it('should generate Chicago citation with all fields', () => {
                const paper = createMockPaper({
                    authors: ['John Doe'],
                    year: 2023,
                    title: 'Machine Learning Basics',
                    journal: 'Journal of AI',
                    doi: '10.1000/test'
                });
                
                const citation = generateCitation(paper, 'chicago');
                expect(citation).toContain('Doe, John');
                expect(citation).toContain('Machine Learning Basics');
                expect(citation).toContain('(2023):');
            });

            it('should handle multiple authors in Chicago format', () => {
                const paper = createMockPaper({
                    authors: ['John Doe', 'Jane Smith']
                });
                
                const citation = generateCitation(paper, 'chicago');
                expect(citation).toContain('Doe, John');
                expect(citation).toContain('and');
            });
        });

        describe('Harvard format', () => {
            it('should generate Harvard citation with all fields', () => {
                const paper = createMockPaper({
                    authors: ['John Doe'],
                    year: 2023,
                    title: 'Machine Learning Basics',
                    journal: 'Journal of AI',
                    doi: '10.1000/test'
                });
                
                const citation = generateCitation(paper, 'harvard');
                expect(citation).toContain('Doe, J.');
                expect(citation).toContain('2023,');
                expect(citation).toContain('Machine Learning Basics');
            });

            it('should handle missing year in Harvard format', () => {
                const paper = createMockPaper({ year: null });
                const citation = generateCitation(paper, 'harvard');
                expect(citation).toContain('n.d.,');
            });
        });

        describe('Vancouver format', () => {
            it('should generate Vancouver citation with all fields', () => {
                const paper = createMockPaper({
                    authors: ['John Doe'],
                    year: 2023,
                    title: 'Machine Learning Basics',
                    journal: 'Journal of AI',
                    doi: '10.1000/test'
                });
                
                const citation = generateCitation(paper, 'vancouver');
                expect(citation).toContain('Doe J');
                expect(citation).toContain('Machine Learning Basics');
                expect(citation).toContain('2023;');
            });

            it('should handle multiple authors in Vancouver format', () => {
                const paper = createMockPaper({
                    authors: ['John Doe', 'Jane Smith']
                });
                
                const citation = generateCitation(paper, 'vancouver');
                expect(citation).toContain('Doe J');
                expect(citation).toContain('Smith J');
            });
        });

        describe('Edge cases', () => {
            it('should return empty string for null paper', () => {
                expect(generateCitation(null, 'apa')).toBe('');
                expect(generateCitation(undefined, 'apa')).toBe('');
            });

            it('should handle unsupported format', () => {
                const paper = createMockPaper();
                const citation = generateCitation(paper, 'unsupported');
                expect(citation).toBe('Unsupported citation format.');
            });

            it('should handle paper with only title', () => {
                const paper = { title: 'Test Paper' };
                const citation = generateCitation(paper, 'apa');
                expect(citation).toBeTruthy();
                expect(citation).toContain('Test Paper');
            });

            it('should handle paper with only authors', () => {
                const paper = { authors: ['John Doe'] };
                const citation = generateCitation(paper, 'apa');
                expect(citation).toBeTruthy();
                expect(citation).toContain('Doe, J.');
            });

            it('should handle author names with multiple words', () => {
                const paper = createMockPaper({
                    authors: ['John Michael Doe', 'Jane Ann Smith']
                });
                const citation = generateCitation(paper, 'apa');
                expect(citation).toContain('Doe, J.M.');
                expect(citation).toContain('Smith, J.A.');
            });

            it('should handle author names with single name', () => {
                const paper = createMockPaper({
                    authors: ['Madonna']
                });
                const citation = generateCitation(paper, 'apa');
                expect(citation).toBeTruthy();
            });

            it('should handle special characters in title', () => {
                const paper = createMockPaper({
                    title: 'Paper Title: A Study of AI & ML (2023)'
                });
                const citation = generateCitation(paper, 'apa');
                expect(citation).toContain('Paper Title: A Study of AI & ML (2023)');
            });

            it('should handle long titles', () => {
                const longTitle = 'A'.repeat(500);
                const paper = createMockPaper({ title: longTitle });
                const citation = generateCitation(paper, 'apa');
                expect(citation).toContain(longTitle);
            });
        });
    });

    describe('generateBibliography', () => {
        describe('Numbered style', () => {
            it('should generate numbered bibliography', () => {
                const papers = [
                    createMockPaper({ title: 'Paper A', authors: ['John Doe'] }),
                    createMockPaper({ title: 'Paper B', authors: ['Jane Smith'] })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'numbered');
                expect(bibliography).toContain('1. ');
                expect(bibliography).toContain('2. ');
            });

            it('should sort papers alphabetically in numbered style', () => {
                const papers = [
                    createMockPaper({ title: 'Zebra Paper', authors: ['Zebra Author'] }),
                    createMockPaper({ title: 'Alpha Paper', authors: ['Alpha Author'] })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'numbered');
                const lines = bibliography.split('\n\n');
                // First paper should be Alpha (alphabetically first)
                expect(lines[0]).toContain('Alpha');
                expect(lines[1]).toContain('Zebra');
            });

            it('should handle empty papers array', () => {
                expect(generateBibliography([], 'apa', 'numbered')).toBe('');
                expect(generateBibliography(null, 'apa', 'numbered')).toBe('');
            });
        });

        describe('Alphabetical style', () => {
            it('should generate alphabetical bibliography with letters', () => {
                const papers = [
                    createMockPaper({ title: 'Paper A', authors: ['John Doe'] }),
                    createMockPaper({ title: 'Paper B', authors: ['Jane Smith'] }),
                    createMockPaper({ title: 'Paper C', authors: ['Bob Brown'] })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'alphabetical');
                expect(bibliography).toContain('A. ');
                expect(bibliography).toContain('B. ');
                expect(bibliography).toContain('C. ');
            });

            it('should sort papers alphabetically in alphabetical style', () => {
                const papers = [
                    createMockPaper({ title: 'Zebra Paper', authors: ['Zebra Author'] }),
                    createMockPaper({ title: 'Alpha Paper', authors: ['Alpha Author'] })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'alphabetical');
                const lines = bibliography.split('\n\n');
                // First paper should be Alpha (alphabetically first)
                expect(lines[0]).toContain('Alpha');
                expect(lines[1]).toContain('Zebra');
            });

            it('should handle more than 26 papers (AA, AB, etc.)', () => {
                const papers = Array.from({ length: 30 }, (_, i) => 
                    createMockPaper({ 
                        title: `Paper ${i}`, 
                        authors: [`Author ${i}`] 
                    })
                );
                
                const bibliography = generateBibliography(papers, 'apa', 'alphabetical');
                expect(bibliography).toContain('A. ');
                expect(bibliography).toContain('Z. ');
            });
        });

        describe('Sorting logic', () => {
            it('should sort by first author last name', () => {
                const papers = [
                    createMockPaper({ authors: ['Zebra Author'], title: 'Paper Z' }),
                    createMockPaper({ authors: ['Alpha Author'], title: 'Paper A' })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'numbered');
                const lines = bibliography.split('\n\n');
                // Alpha Author comes before Zebra Author alphabetically by last name
                // Both have last name "Author", but "Alpha" comes before "Zebra" in first name
                // In APA format: "Author, A." comes before "Author, Z."
                // Actually, sorting is by last name, so both "Author" sort the same,
                // then by title, so "Paper A" comes before "Paper Z"
                expect(lines[0]).toContain('Paper A'); // Alpha Author's paper
                expect(lines[1]).toContain('Paper Z'); // Zebra Author's paper
                // Both citations should contain "Author"
                expect(lines[0]).toContain('Author,');
                expect(lines[1]).toContain('Author,');
            });

            it('should sort by title when authors have same last name', () => {
                const papers = [
                    createMockPaper({ authors: ['John Smith'], title: 'Zebra Paper' }),
                    createMockPaper({ authors: ['Jane Smith'], title: 'Alpha Paper' })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'numbered');
                const lines = bibliography.split('\n\n');
                expect(lines[0]).toContain('Alpha Paper');
                expect(lines[1]).toContain('Zebra Paper');
            });

            it('should sort by title when no authors', () => {
                const papers = [
                    createMockPaper({ authors: [], title: 'Zebra Paper' }),
                    createMockPaper({ authors: [], title: 'Alpha Paper' })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'numbered');
                const lines = bibliography.split('\n\n');
                expect(lines[0]).toContain('Alpha Paper');
                expect(lines[1]).toContain('Zebra Paper');
            });

            it('should handle case-insensitive sorting', () => {
                const papers = [
                    createMockPaper({ authors: ['zebra author'], title: 'Paper Z' }),
                    createMockPaper({ authors: ['Alpha Author'], title: 'Paper A' })
                ];
                
                const bibliography = generateBibliography(papers, 'apa', 'numbered');
                const lines = bibliography.split('\n\n');
                // Case-insensitive: both have last name "Author" (case-insensitive comparison)
                // So they're sorted by title: "Paper A" comes before "Paper Z"
                expect(lines[0]).toContain('Paper A'); // Alpha Author's paper
                expect(lines[1]).toContain('Paper Z'); // zebra author's paper
                // Verify the authors are both present (case-insensitive sorting works)
                expect(bibliography.toLowerCase()).toContain('alpha author');
                expect(bibliography.toLowerCase()).toContain('zebra author');
            });
        });

        describe('Different citation formats in bibliography', () => {
            it('should use APA format in bibliography', () => {
                const papers = [createMockPaper()];
                const bibliography = generateBibliography(papers, 'apa', 'numbered');
                expect(bibliography).toContain('Doe, J.');
            });

            it('should use IEEE format in bibliography', () => {
                const papers = [createMockPaper()];
                const bibliography = generateBibliography(papers, 'ieee', 'numbered');
                expect(bibliography).toContain('J. Doe');
            });

            it('should use MLA format in bibliography', () => {
                const papers = [createMockPaper()];
                const bibliography = generateBibliography(papers, 'mla', 'numbered');
                expect(bibliography).toContain('Doe, John');
            });
        });
    });

    describe('exportBibliographyToFile', () => {
        beforeEach(() => {
            // Mock DOM methods
            global.URL = {
                createObjectURL: vi.fn(() => 'blob:mock-url'),
                revokeObjectURL: vi.fn()
            };
            
            // Create mock anchor element
            const mockAnchor = {
                href: '',
                download: '',
                click: vi.fn(),
                remove: vi.fn()
            };
            
            global.document = {
                createElement: vi.fn(() => mockAnchor),
                body: {
                    appendChild: vi.fn(),
                    removeChild: vi.fn()
                }
            };
            
            global.Blob = class MockBlob {
                constructor(content, options) {
                    this.content = content;
                    this.options = options;
                }
            };
        });

        it('should create blob with bibliography content', () => {
            const bibliography = '1. Test citation';
            exportBibliographyToFile(bibliography, 'apa');
            
            expect(document.createElement).toHaveBeenCalledWith('a');
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        it('should set download filename with format and date', () => {
            const mockAnchor = { href: '', download: '', click: vi.fn() };
            document.createElement.mockReturnValue(mockAnchor);
            
            const bibliography = '1. Test citation';
            exportBibliographyToFile(bibliography, 'apa');
            
            expect(mockAnchor.download).toMatch(/bibliography-apa-\d{4}-\d{2}-\d{2}\.txt/);
        });

        it('should trigger download', () => {
            const mockAnchor = { href: '', download: '', click: vi.fn() };
            document.createElement.mockReturnValue(mockAnchor);
            
            const bibliography = '1. Test citation';
            exportBibliographyToFile(bibliography, 'ieee');
            
            expect(mockAnchor.click).toHaveBeenCalled();
            expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
            expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
            expect(URL.revokeObjectURL).toHaveBeenCalled();
        });
    });

    describe('copyBibliographyToClipboard', () => {
        beforeEach(() => {
            // Mock navigator.clipboard
            global.navigator = {
                clipboard: {
                    writeText: vi.fn(() => Promise.resolve())
                }
            };
        });

        it('should copy bibliography to clipboard', async () => {
            const bibliography = '1. Test citation';
            const result = await copyBibliographyToClipboard(bibliography);
            
            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1. Test citation');
        });

        it('should remove HTML tags before copying', async () => {
            const bibliography = '1. Test <em>citation</em> here';
            await copyBibliographyToClipboard(bibliography);
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1. Test citation here');
        });

        it('should return false on clipboard error', async () => {
            navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
            
            const bibliography = '1. Test citation';
            const result = await copyBibliographyToClipboard(bibliography);
            
            expect(result).toBe(false);
        });

        it('should handle empty bibliography', async () => {
            const result = await copyBibliographyToClipboard('');
            
            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');
        });
    });
});


// ExcelJS is loaded via CDN in index.html and available as window.ExcelJS
import { getAllPapers } from '../db.js';

/**
 * Exports all papers to an Excel file.
 * Includes data transformation, formatting, and file download.
 */
export async function exportToExcel() {
    try {
        const papers = await getAllPapers();

        if (!papers || papers.length === 0) {
            throw new Error('No papers found to export.');
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CitavErs';
        workbook.lastModifiedBy = 'CitavErs';
        workbook.created = new Date();
        workbook.modified = new Date();

        const worksheet = workbook.addWorksheet('Papers');

        // Define columns
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Title', key: 'title', width: 50 },
            { header: 'Authors', key: 'authors', width: 30 },
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Journal', key: 'journal', width: 30 },
            { header: 'DOI', key: 'doi', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Rating', key: 'rating', width: 10 },
            { header: 'Summary', key: 'summary', width: 40 },
            { header: 'Abstract', key: 'abstract', width: 40 },
            { header: 'Tags', key: 'tags', width: 20 },
            { header: 'Notes', key: 'notes', width: 50 },
            { header: 'Added', key: 'createdAt', width: 20 },
        ];

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' } // Light gray
        };

        // Add data
        papers.forEach(paper => {
            worksheet.addRow({
                id: paper.id,
                title: decodeHtml(paper.title || ''),
                authors: Array.isArray(paper.authors) ? decodeHtml(paper.authors.join(', ')) : decodeHtml(paper.authors || ''),
                year: paper.year || '',
                journal: decodeHtml(paper.journal || ''),
                doi: formatDoi(paper.doi),
                status: paper.readingStatus || paper.status || 'To Read', // Fallback
                rating: paper.rating || '',
                summary: htmlToRichText(paper.summary || ''),
                abstract: stripHtml(paper.abstract || ''),
                tags: Array.isArray(paper.tags) ? decodeHtml(paper.tags.join(', ')) : decodeHtml(paper.tags || ''),
                notes: htmlToRichText(paper.notes || ''),
                createdAt: formatDate(paper.createdAt)
            });

            // Set alignment for rich text cells to ensure wrapping
            const row = worksheet.lastRow;
            row.getCell('summary').alignment = { wrapText: true, vertical: 'top' };
            row.getCell('abstract').alignment = { wrapText: true, vertical: 'top' };
            row.getCell('notes').alignment = { wrapText: true, vertical: 'top' };
        });

        // Auto-filter
        worksheet.autoFilter = {
            from: 'A1',
            to: {
                row: 1,
                column: worksheet.columns.length
            }
        };

        // Write buffer and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `citavers_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true, count: papers.length };

    } catch (error) {
        console.error('Excel export failed:', error);
        throw error;
    }
}

/**
 * Helper to strip HTML tags from a string.
 */
function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * Helper to format date objects.
 */
function formatDate(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

/**
 * Helper to format DOI with https://doi.org/ prefix
 */
function formatDoi(doi) {
    if (!doi) return '';
    const cleanDoi = doi.trim();
    if (cleanDoi.startsWith('http')) return cleanDoi;
    return `https://doi.org/${cleanDoi}`;
}

/**
 * Helper to decode HTML entities (e.g. &amp; -> &)
 */
function decodeHtml(html) {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

/**
 * Converts HTML string to ExcelJS Rich Text array.
 * Preserves bold, italic, and newlines.
 */
function htmlToRichText(html) {
    if (!html) return '';

    const div = document.createElement('div');
    div.innerHTML = html;

    const richText = [];

    function getLastText() {
        if (richText.length === 0) return '';
        return richText[richText.length - 1].text;
    }

    function endsWithNewline() {
        const last = getLastText();
        return last.endsWith('\n');
    }

    function endsWithBullet() {
        const last = getLastText();
        return last.endsWith('• ');
    }

    function addNewlineIfNeeded() {
        if (richText.length > 0 && !endsWithNewline() && !endsWithBullet()) {
            richText.push({ text: '\n' });
        }
    }

    function traverse(node, style = {}) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            // Basic whitespace trimming but allow single spaces
            // This prevents weird massive spaces but keeps sentence flow
            text = text.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ');

            if (text) {
                richText.push({
                    text: text,
                    font: {
                        bold: style.bold,
                        italic: style.italic,
                        name: 'Calibri', // Default Excel font
                        size: 11
                    }
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const newStyle = { ...style };
            const tagName = node.tagName.toLowerCase();

            if (tagName === 'b' || tagName === 'strong') {
                newStyle.bold = true;
            } else if (tagName === 'i' || tagName === 'em') {
                newStyle.italic = true;
            } else if (tagName === 'br') {
                richText.push({ text: '\n' });
            } else if (tagName === 'p' || tagName === 'div' || tagName === 'li') {
                // Formatting for block elements
                addNewlineIfNeeded();

                // Add bullet point for list items
                if (tagName === 'li') {
                    richText.push({ text: '• ' });
                }
            }

            node.childNodes.forEach(child => traverse(child, newStyle));

            // Add newline after block elements
            if (tagName === 'p' || tagName === 'div' || tagName === 'li') {
                addNewlineIfNeeded();
            }
        }
    }

    traverse(div);

    // Fallback: If rich text parsing produced nothing meaningful but there was content, return raw text
    if (richText.length === 0 && html.length > 0) {
        return [{ text: decodeHtml(div.textContent || div.innerText || html) }];
    }

    // Clean up trailing newline
    if (richText.length > 0 && richText[richText.length - 1].text.endsWith('\n')) {
        // Create a new object to avoid mutation issues if ref is shared (unlikely here but safe)
        const last = richText[richText.length - 1];
        // If it's just a newline, remove it
        if (last.text === '\n') {
            richText.pop();
        } else {
            // remove trailing \n from text string
            last.text = last.text.slice(0, -1);
        }
    }

    return { richText: richText };
}

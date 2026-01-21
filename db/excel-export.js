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
                summary: stripHtml(paper.summary || ''),
                tags: Array.isArray(paper.tags) ? decodeHtml(paper.tags.join(', ')) : decodeHtml(paper.tags || ''),
                notes: stripHtml(paper.notes || ''), // Helper to strip HTML
                createdAt: formatDate(paper.createdAt)
            });
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

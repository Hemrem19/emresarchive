/**
 * Reading what a PDF says about itself: identifiers (DOI, arXiv id), a title
 * guess, and its built-in properties. Uses pdf.js (global `pdfjsLib`, loaded
 * by index.html) for text only; nothing is rendered.
 *
 * Everything except readPdf is a pure function, so it can be tested without
 * a browser or real files.
 */

const PAGES_TO_READ = 2;

/**
 * Text and properties of a PDF, or null when pdf.js is missing or the file
 * cannot be parsed (broken, encrypted).
 * @returns {Promise<{info: object, xmp: object, text: string, firstPageItems: Array<{str: string, size: number, y: number}>} | null>}
 */
export async function readPdf(file) {
    const pdfjs = globalThis.pdfjsLib;
    if (!pdfjs) return null;
    let pdf;
    try {
        pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    } catch (error) {
        console.warn('[PDF import] Could not open', file.name, error?.message);
        return null;
    }
    try {
        const meta = await pdf.getMetadata().catch(() => ({}));
        const xmp = meta?.metadata?.getAll ? meta.metadata.getAll() : {};
        let text = '';
        let firstPageItems = [];
        for (let n = 1; n <= Math.min(PAGES_TO_READ, pdf.numPages); n++) {
            const page = await pdf.getPage(n);
            const content = await page.getTextContent();
            text += `${content.items.map((item) => item.str).join(' ')}\n`;
            if (n === 1) {
                firstPageItems = content.items
                    .filter((item) => item.str && item.str.trim())
                    .map((item) => ({
                        str: item.str,
                        size: Math.abs(item.transform?.[3] || item.height || 0),
                        y: item.transform?.[5] || 0,
                    }));
            }
        }
        return { info: meta?.info || {}, xmp: xmp || {}, text, firstPageItems };
    } finally {
        pdf.destroy?.();
    }
}

// DOI: 10.<registrant>/<suffix>; the suffix ends at whitespace or quote marks
const DOI_RE = /\b(10\.\d{4,9}\/[^\s"'<>]+)/i;

/** Cleans a DOI found in running text: trailing punctuation and closing brackets are not part of it. */
export function cleanDoi(raw) {
    let doi = raw.replace(/[.,;:]+$/, '');
    // Drop a closing bracket only when the DOI has no matching opening one
    for (const [open, close] of [['(', ')'], ['[', ']']]) {
        while (doi.endsWith(close) && doi.split(open).length <= doi.split(close).length - 1) {
            doi = doi.slice(0, -1).replace(/[.,;:]+$/, '');
        }
    }
    return doi;
}

/**
 * The paper's own DOI: its XMP field first, then the first DOI in the text.
 * The text of the first pages comes before the references, so the first DOI
 * there is almost always the paper's own.
 */
export function findDoi(text, xmp = {}) {
    for (const value of [xmp['prism:doi'], xmp['dc:identifier'], text]) {
        if (!value || typeof value !== 'string') continue;
        const match = DOI_RE.exec(value);
        if (match) return cleanDoi(match[1]);
    }
    return null;
}

/**
 * The arXiv id printed on a preprint: "arXiv:2310.00123v2" or an arxiv.org link.
 * Returns { id, modern } where modern ids (YYMM.NNNNN) can be looked up directly.
 */
export function findArxivId(text) {
    if (!text) return null;
    const modern = /(?:arxiv:\s*|arxiv\.org\/(?:abs|pdf)\/)(\d{4}\.\d{4,5})(v\d+)?/i.exec(text);
    if (modern) return { id: modern[1], modern: true };
    const old = /(?:arxiv:\s*|arxiv\.org\/(?:abs|pdf)\/)([a-z-]+(?:\.[A-Z]{2})?\/\d{7})/i.exec(text);
    return old ? { id: old[1], modern: false } : null;
}

const JUNK_TITLE = /^(untitled|microsoft word|document\d*|title|paper|article|manuscript)\b|\.(docx?|pdf|tex|dvi)$/i;

const words = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Whether a file's Title property looks like a real paper title. */
export function isUsefulTitle(title) {
    const value = String(title || '').trim();
    // At least three real words: rules out typesetting names like "pone.0000308 1..5"
    const realWords = words(value).filter((w) => /[a-z]{3,}/.test(w));
    return realWords.length >= 3 && !JUNK_TITLE.test(value) && !/^[\w.-]+$/.test(value);
}

/** A readable title from a file name: "Smith_2021_deep-learning.pdf" → "Smith 2021 deep learning". */
export function titleFromFileName(fileName) {
    return String(fileName || 'Untitled').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
}

/**
 * The paper's title: the file's Title property when useful, else the
 * largest text in the top part of page 1, else the file name.
 */
export function guessTitle(info = {}, items = [], fileName = '', xmp = {}) {
    for (const candidate of [xmp['dc:title'], info.Title]) {
        const value = typeof candidate === 'string' ? candidate : candidate?.['x-default'];
        if (isUsefulTitle(value)) return value.trim().replace(/\s+/g, ' ');
    }
    if (items.length) {
        const maxSize = Math.max(...items.map((i) => i.size));
        // Text within 10% of the largest size, in reading order (top to bottom)
        const big = items.filter((i) => i.size >= maxSize * 0.9 && i.size > 0)
            .sort((a, b) => b.y - a.y);
        const title = big.map((i) => i.str.trim()).join(' ').replace(/\s+/g, ' ').trim();
        if (isUsefulTitle(title) && title.length <= 300) return title;
    }
    return titleFromFileName(fileName);
}

/** Overlap of two titles' words, 0..1 (Dice coefficient over word sets). */
export function titleSimilarity(a, b) {
    const x = new Set(words(a));
    const y = new Set(words(b));
    if (!x.size || !y.size) return 0;
    let shared = 0;
    for (const w of x) if (y.has(w)) shared++;
    return (2 * shared) / (x.size + y.size);
}

/** A title reduced for exact comparisons (case, accents and punctuation ignored). */
export const normalizeTitle = (title) => words(title).join(' ');

/** Authors from a PDF's Author property ("A. Smith; B. Jones" or "A. Smith, B. Jones and C. Lee"). */
export function authorsFromInfo(info = {}) {
    const raw = typeof info.Author === 'string' ? info.Author.trim() : '';
    if (!raw) return [];
    // "Smith, John" is one name; lists use semicolons, several commas, "and" or "&"
    const separator = raw.includes(';') ? /\s*;\s*/
        : (raw.match(/,/g) || []).length >= 2 || /\band\b|&/i.test(raw) ? /\s*(?:,|\band\b|&)\s*/i
        : null;
    const names = separator ? raw.split(separator) : [raw];
    return names.map((a) => a.trim()).filter((a) => a.length > 1);
}

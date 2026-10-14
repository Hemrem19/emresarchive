/**
 * Working out which paper a PDF is, and fetching its metadata.
 *
 * In order: the DOI printed in (or stored with) the file, its arXiv id, a
 * title search on Crossref accepted only for a near-exact title match, and
 * finally what the file itself says (title guess, Author property). A
 * lookup that fails on the network falls through to the next step.
 */
import { fetchDoiMetadata } from '../api.js';
import {
    readPdf, findDoi, findArxivId, guessTitle, titleSimilarity, authorsFromInfo, titleFromFileName,
} from './pdf-metadata.js';

/** Minimum title similarity for accepting a Crossref search hit. */
export const TITLE_MATCH = 0.9;

const CROSSREF = 'https://api.crossref.org/works';
const PUBLISHED_TYPES = new Set(['journal-article', 'proceedings-article', 'book-chapter', 'book', 'monograph', 'report']);

/**
 * Crossref hits for a title, best first: [{ doi, title, score }]. Hits with
 * equal scores keep Crossref's order, published versions first.
 */
export async function searchCrossrefByTitle(title, { fetchImpl = fetch } = {}) {
    const url = `${CROSSREF}?query.bibliographic=${encodeURIComponent(title)}&rows=5&select=DOI,title,type`;
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Crossref search failed (${res.status})`);
    const items = (await res.json())?.message?.items || [];
    return items
        .filter((item) => item.DOI)
        .map((item, order) => {
            const candidate = Array.isArray(item.title) ? item.title[0] : item.title;
            return { doi: item.DOI, title: candidate, score: titleSimilarity(title, candidate), published: PUBLISHED_TYPES.has(item.type), order };
        })
        .sort((a, b) => b.score - a.score || Number(b.published) - Number(a.published) || a.order - b.order)
        .map(({ doi, title: t, score }) => ({ doi, title: t, score }));
}

/** Lowercased letters and digits only, for finding a journal name in page text. */
const squash = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Among records with the same title (a preprint and its article, say), the
 * one whose journal is printed in the PDF; otherwise the first.
 */
export function pickByJournal(records, text) {
    const page = squash(text);
    return records.find((r) => r.journal && squash(r.journal).length >= 4 && page.includes(squash(r.journal))) || records[0];
}

const MAX_TIED_LOOKUPS = 3;

/**
 * Identifies a PDF file.
 * @returns {Promise<{metadata: object, matchedBy: 'doi'|'arxiv'|'title'|'none'}>}
 */
export async function identify(file, deps = {}) {
    const read = deps.readPdf || readPdf;
    const lookup = deps.fetchDoiMetadata || fetchDoiMetadata;
    const search = deps.searchByTitle || searchCrossrefByTitle;

    const parsed = await read(file);
    const text = parsed?.text || '';
    const tryLookup = async (identifier) => {
        try {
            return await lookup(identifier);
        } catch (error) {
            console.warn('[PDF import] Lookup failed for', identifier, error?.message);
            return null;
        }
    };

    const doi = findDoi(text, parsed?.xmp);
    if (doi) {
        const metadata = await tryLookup(doi);
        if (metadata) return { metadata, matchedBy: 'doi' };
    }

    // arXiv's own API sends no CORS headers, so browsers cannot call it; every
    // modern arXiv paper has a DataCite DOI that doi.org serves instead
    const arxiv = findArxivId(text);
    if (arxiv?.modern) {
        const metadata = await tryLookup(`10.48550/arXiv.${arxiv.id}`);
        if (metadata) {
            return {
                metadata: { journal: 'arXiv', url: `https://arxiv.org/abs/${arxiv.id}`, ...metadata, ...(metadata.journal ? {} : { journal: 'arXiv' }) },
                matchedBy: 'arxiv',
            };
        }
    }

    const title = parsed ? guessTitle(parsed.info, parsed.firstPageItems, file.name, parsed.xmp) : titleFromFileName(file.name);
    // File names often carry the title too; the similarity threshold keeps wrong hits out
    if (title.split(/\s+/).length >= 4) {
        try {
            const hits = (await search(title)).filter((h) => h.score >= TITLE_MATCH);
            const tied = hits.filter((h) => h.score === hits[0]?.score).slice(0, MAX_TIED_LOOKUPS);
            const records = (await Promise.all(tied.map((h) => tryLookup(h.doi)))).filter(Boolean);
            if (records.length) return { metadata: pickByJournal(records, text), matchedBy: 'title' };
        } catch (error) {
            console.warn('[PDF import] Title search failed:', error?.message);
        }
    }

    return {
        metadata: { title, authors: authorsFromInfo(parsed?.info), ...(doi ? { doi } : {}) },
        matchedBy: 'none',
    };
}

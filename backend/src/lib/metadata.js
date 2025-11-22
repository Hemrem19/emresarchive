/**
 * Metadata Fetching Service
 * Handles fetching paper metadata from external APIs (DOI, arXiv)
 */

/**
 * Fetches metadata for a given DOI.
 * @param {string} doi 
 * @returns {Promise<Object>}
 */
export async function fetchDoiMetadata(doi) {
  const cleanDoi = doi.replace(/^doi:/, '').trim();
  
  // Use CrossRef API
  const response = await fetch(`https://doi.org/${cleanDoi}`, {
      headers: { 'Accept': 'application/vnd.citationstyles.csl+json' }
  });
  
  if (!response.ok) {
      throw new Error(`Failed to fetch DOI metadata: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Extract authors
  const authors = data.author ? data.author.map(a => {
      if (a.literal) return a.literal;
      return `${a.given || ''} ${a.family || ''}`.trim();
  }).filter(n => n) : [];
  
  // Extract year
  let year = null;
  if (data.issued && data.issued['date-parts'] && data.issued['date-parts'][0]) {
      year = data.issued['date-parts'][0][0];
  }

  return {
      title: data.title || 'Untitled Paper',
      authors: authors.length > 0 ? authors : ['Unknown Author'],
      journal: data['container-title'] || null,
      year: year || new Date().getFullYear(),
      doi: data.DOI || cleanDoi,
      url: data.URL || `https://doi.org/${cleanDoi}`,
      tags: [],
      notes: '',
  };
}

/**
 * Fetches metadata for a given arXiv ID.
 * @param {string} arxivId 
 * @returns {Promise<Object>}
 */
export async function fetchArxivMetadata(arxivId) {
    const response = await fetch(`https://export.arxiv.org/api/query?id_list=${arxivId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch arXiv metadata: ${response.status} ${response.statusText}`);
    }
    
    const xml = await response.text();
    
    // Isolate the entry
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) {
        throw new Error(`arXiv ID "${arxivId}" not found`);
    }
    const entry = entryMatch[1];
    
    // Extract fields using regex
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\s+/g, ' ') || 'Untitled Paper';
    const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || '';
    const published = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1];
    
    const authorMatches = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)];
    const authors = authorMatches.map(m => m[1].trim());
    
    // Prefer PDF link
    // Robust link extraction handling attribute order
    const linkMatches = [...entry.matchAll(/<link\s+([\s\S]*?)\/?>/g)];
    let pdfLink = null;
    for (const match of linkMatches) {
        const attrs = match[1];
        if (attrs.includes('title="pdf"')) {
            const hrefMatch = attrs.match(/href="([^"]+)"/);
            if (hrefMatch) {
                pdfLink = hrefMatch[1];
                break;
            }
        }
    }
    
    const year = published ? new Date(published).getFullYear() : new Date().getFullYear();
    
    // Check if arXiv record has a DOI (e.g. already published)
    // <link title="doi" href="http://dx.doi.org/10.1103/PhysRevD.76.013009" rel="related"/>
    const doiLink = entry.match(/<link\s+title="doi"\s+href="([^"]+)"/)?.[1];
    let doi = null;
    if (doiLink) {
        const doiMatch = doiLink.match(/10\.\d{4,}[\w\-.;()\/:]+/);
        if (doiMatch) doi = doiMatch[0];
    }
    
    // Fallback to arXiv DOI if not published elsewhere
    if (!doi) {
        doi = `10.48550/arXiv.${arxivId}`;
    }
    
    return {
        title,
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        journal: 'arXiv',
        year,
        doi: doi,
        url: `https://arxiv.org/abs/${arxivId}`,
        pdfUrl: pdfLink,
        notes: summary ? `<h3>Abstract</h3><p>${summary}</p>` : '',
        tags: []
    };
}


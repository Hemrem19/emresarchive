/**
 * Fetches metadata for a given DOI.
 * @param {string} doi - The DOI to fetch.
 * @returns {Promise<Object>} A promise that resolves with the structured paper data.
 */
export const fetchDoiMetadata = async (doi) => {
    const response = await fetch(`https://doi.org/${doi}`, {
        headers: { 'Accept': 'application/vnd.citationstyles.csl+json' }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    const authors = (data.author && data.author.length > 0)
        ? data.author.map(a => `${a.given || ''} ${a.family || ''}`.trim())
        : [];

    const year = (data.issued && data.issued['date-parts'])
        ? data.issued['date-parts'][0][0]
        : null;

    return {
        title: data.title || 'Untitled',
        authors: authors,
        journal: data['container-title'] || '',
        year: year ? parseInt(year, 10) : null,
        doi: data.DOI || doi,
    };
};
function getPaperIdentifier() {
    const url = window.location.href;
    
    // 1. Check URL for arXiv
    const arxivMatch = url.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
    if (arxivMatch) {
        return { type: 'arxiv', value: arxivMatch[1], url };
    }
    
    // 2. Check URL for DOI
    const doiMatch = url.match(/(10\.\d{4,}[\w\-.;()\/:]+)/i);
    if (doiMatch && !url.includes('arxiv')) {
         return { type: 'doi', value: doiMatch[1], url };
    }
    
    // 3. Check Meta Tags
    const metaDoi = document.querySelector('meta[name="citation_doi"]')?.content || 
                    document.querySelector('meta[name="dc.identifier"]')?.content ||
                    document.querySelector('meta[name="prism.doi"]')?.content;
                    
    if (metaDoi) {
        return { type: 'doi', value: metaDoi, url };
    }
    
    return null;
}

// Listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPaperDetails') {
        const id = getPaperIdentifier();
        const title = document.querySelector('meta[name="citation_title"]')?.content || 
                      document.querySelector('meta[name="dc.title"]')?.content ||
                      document.title;
                      
        sendResponse({ 
            identifier: id,
            title: title,
            url: window.location.href
        });
    }
});


document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status');
    const actionBtn = document.getElementById('action-btn');
    
    // Check Auth
    const auth = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    
    if (!auth.isAuthenticated) {
        statusDiv.textContent = 'Please log in to citavErs.';
        actionBtn.textContent = 'Log In';
        actionBtn.style.display = 'block';
        actionBtn.onclick = () => {
            chrome.tabs.create({ url: 'https://emresarchive-production.up.railway.app' });
        };
        return;
    }
    
    // Get Tab Data
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.startsWith('http')) {
        statusDiv.textContent = 'Cannot access this page.';
        return;
    }

    // Inject content script if not already there
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPaperDetails' });
        handlePaperDetails(response);
    } catch (e) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPaperDetails' });
            handlePaperDetails(response);
        } catch (scriptError) {
            console.error('Script injection error:', scriptError);
            statusDiv.textContent = 'Cannot access this page. Try refreshing.';
        }
    }
});

function handlePaperDetails(details) {
    const statusDiv = document.getElementById('status');
    const actionBtn = document.getElementById('action-btn');
    
    if (!details || !details.identifier) {
        statusDiv.textContent = 'No paper detected on this page.';
        actionBtn.style.display = 'none';
        return;
    }
    
    statusDiv.textContent = `Found: ${details.title.substring(0, 50)}${details.title.length > 50 ? '...' : ''}`;
    actionBtn.textContent = 'Save to Library';
    actionBtn.style.display = 'block';
    
    // Clear previous listeners
    const newBtn = actionBtn.cloneNode(true);
    actionBtn.parentNode.replaceChild(newBtn, actionBtn);
    
    newBtn.onclick = async () => {
        newBtn.disabled = true;
        newBtn.textContent = 'Saving...';
        
        const result = await chrome.runtime.sendMessage({
            action: 'savePaper',
            data: {
                url: details.url,
                title: details.title,
                doi: details.identifier.type === 'doi' ? details.identifier.value : null,
                arxivId: details.identifier.type === 'arxiv' ? details.identifier.value : null
            }
        });
        
        if (result.success) {
            statusDiv.textContent = 'Saved successfully!';
            newBtn.textContent = 'Open Library';
            newBtn.onclick = () => chrome.tabs.create({ url: 'https://emresarchive-production.up.railway.app' });
            newBtn.disabled = false;
        } else {
            statusDiv.textContent = `Error: ${result.error}`;
            newBtn.textContent = 'Retry';
            newBtn.disabled = false;
            newBtn.onclick = () => window.location.reload();
        }
    };
}


const API_BASE_URL = 'https://emresarchive-production.up.railway.app';

document.addEventListener('DOMContentLoaded', async () => {
    // Views
    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');
    
    // Check stored token
    const token = await getStoredToken();
    
    if (token) {
        showMainView();
    } else {
        showLoginView();
    }
    
    // Login Logic
    document.getElementById('login-btn').onclick = handleLogin;
    document.getElementById('logout-btn').onclick = handleLogout;
    document.getElementById('open-lib-btn').onclick = () => chrome.tabs.create({ url: API_BASE_URL });
    
    // Enter key for login
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
});

async function getStoredToken() {
    const data = await chrome.storage.local.get(['accessToken']);
    return data.accessToken;
}

function showLoginView() {
    document.getElementById('login-view').classList.add('active');
    document.getElementById('main-view').classList.remove('active');
}

function showMainView() {
    document.getElementById('login-view').classList.remove('active');
    document.getElementById('main-view').classList.add('active');
    initializeMainView();
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    
    if (!email || !password) {
        errorMsg.textContent = 'Please fill in all fields';
        errorMsg.style.display = 'block';
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Logging in...';
    errorMsg.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Save token
            await chrome.storage.local.set({ 
                accessToken: result.data.accessToken,
                user: result.data.user
            });
            showMainView();
        } else {
            throw new Error(result.error?.message || 'Login failed');
        }
    } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Log In';
    }
}

async function handleLogout() {
    await chrome.storage.local.remove(['accessToken', 'user']);
    showLoginView();
}

async function initializeMainView() {
    const statusDiv = document.getElementById('status');
    const saveBtn = document.getElementById('save-btn');
    const paperPreview = document.getElementById('paper-preview');
    
    statusDiv.textContent = 'Scanning page...';
    statusDiv.classList.add('visible');
    
    // Get Tab Data
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.startsWith('http')) {
        statusDiv.textContent = 'Cannot access this page.';
        return;
    }

    // Inject content script
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
            statusDiv.textContent = 'No paper detected on this page.';
        }
    }
}

function handlePaperDetails(details) {
    const statusDiv = document.getElementById('status');
    const saveBtn = document.getElementById('save-btn');
    const paperPreview = document.getElementById('paper-preview');
    const paperTitle = document.getElementById('paper-title');
    const paperMeta = document.getElementById('paper-meta');
    
    if (!details || !details.identifier) {
        statusDiv.textContent = 'No paper detected on this page.';
        paperPreview.style.display = 'none';
        saveBtn.style.display = 'none';
        return;
    }
    
    // Show preview
    statusDiv.style.display = 'none';
    paperPreview.style.display = 'block';
    paperTitle.textContent = details.title;
    
    let metaText = '';
    if (details.identifier.type === 'doi') metaText = `DOI: ${details.identifier.value}`;
    if (details.identifier.type === 'arxiv') metaText = `arXiv: ${details.identifier.value}`;
    paperMeta.textContent = metaText;
    
    saveBtn.style.display = 'block';
    saveBtn.textContent = 'Save to Library';
    
    // Clone button to clear listeners
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    
    newBtn.onclick = async () => {
        newBtn.disabled = true;
        newBtn.textContent = 'Saving...';
        
        try {
            const token = await getStoredToken();
            const response = await fetch(`${API_BASE_URL}/api/extension/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: details.url,
                    title: details.title,
                    doi: details.identifier.type === 'doi' ? details.identifier.value : null,
                    arxivId: details.identifier.type === 'arxiv' ? details.identifier.value : null
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                newBtn.textContent = 'Saved!';
                newBtn.style.background = '#10b981'; // Green
                setTimeout(() => {
                    window.close();
                }, 1500);
            } else {
                // Handle Auth Error
                if (response.status === 401) {
                    await handleLogout();
                    return;
                }
                throw new Error(result.error?.message || 'Save failed');
            }
        } catch (error) {
            statusDiv.style.display = 'block';
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.style.color = '#dc2626';
            newBtn.disabled = false;
            newBtn.textContent = 'Retry';
        }
    };
}

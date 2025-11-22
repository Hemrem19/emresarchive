const API_BASE_URL = 'https://emresarchive-production.up.railway.app';

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'savePaper') {
    handleSavePaper(request.data).then(sendResponse);
    return true; // Will respond asynchronously
  }
  if (request.action === 'checkAuth') {
    checkAuth().then(sendResponse);
    return true;
  }
});

async function checkAuth() {
  try {
    const cookie = await chrome.cookies.get({
      url: API_BASE_URL,
      name: 'refreshToken'
    });
    return { isAuthenticated: !!cookie };
  } catch (error) {
    console.error('Check auth error:', error);
    return { isAuthenticated: false, error: error.message };
  }
}

async function handleSavePaper(data) {
  // 1. Get access token using refresh token cookie
  const authCheck = await checkAuth();
  if (!authCheck.isAuthenticated) {
    return { success: false, error: 'Not authenticated. Please log in to citavErs.' };
  }
  
  try {
      // Call refresh endpoint to get access token
      // Cookies are automatically included if host permissions are set and credentials: 'include' is used
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include' 
      });
      
      if (!refreshResponse.ok) {
          return { success: false, error: 'Session expired. Please log in again.' };
      }
      
      const refreshResult = await refreshResponse.json();
      const accessToken = refreshResult.data?.accessToken;
      
      if (!accessToken) {
         return { success: false, error: 'Failed to retrieve access token.' };
      }
      
      // 2. Call save endpoint
      const saveResponse = await fetch(`${API_BASE_URL}/api/extension/save`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(data)
      });
      
      const saveResult = await saveResponse.json();
      if (!saveResponse.ok) {
          return { success: false, error: saveResult.error?.message || 'Failed to save paper.' };
      }
      
      return { success: true, data: saveResult.data };
      
  } catch (error) {
      console.error('Save paper error:', error);
      return { success: false, error: 'Network error: ' + error.message };
  }
}


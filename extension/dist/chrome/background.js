// Background script is now simplified as popup handles logic directly
// We keep this listener for potential future background tasks or context menus

chrome.runtime.onInstalled.addListener(() => {
    console.log('citavErs Web Clipper installed');
});

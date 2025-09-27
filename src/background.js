let popupWindowId = null;

// --- Video History Management ---
/**
 * Initialize video history storage
 */
async function initializeVideoHistory() {
    try {
        const result = await chrome.storage.local.get('videoHistory');
        console.log('Video history initialized:', result);
        if (!result.videoHistory) {
            await chrome.storage.local.set({ videoHistory: [] });
            console.log('Video history storage created.');
        }
    } catch (error) {
        console.error('Failed to initialize video history:', error);
    }
}

/**
 * Get video history from storage
 * @returns {Promise<Array>} Array of video history objects
 */
async function getVideoHistory() {
    try {
        const result = await chrome.storage.local.get('videoHistory');
        return result.videoHistory || [];
    } catch (error) {
        console.error('Failed to get video history:', error);
        return [];
    }
}

/**
 * Add a video to history
 * @param {Object} videoData - Video data object
 * @param {string} videoData.videoId - YouTube video ID
 * @param {string} videoData.title - Video title
 * @param {string} videoData.url - Full YouTube URL
 */
async function addVideoToHistory(videoData) {
    try {
        const history = await getVideoHistory();
        
        // Check if video already exists in history
        const existingIndex = history.findIndex(item => item.videoId === videoData.videoId);
        
        const historyEntry = {
            videoId: videoData.videoId,
            title: videoData.title,
            url: videoData.url,
            timestamp: Date.now(),
            dateAdded: new Date().toISOString()
        };
        
        if (existingIndex !== -1) {
            // Update existing entry timestamp
            history[existingIndex] = historyEntry;
        } else {
            // Add new entry at the beginning
            history.unshift(historyEntry);
        }
        
        // Keep only last 50 videos to prevent storage bloat
        const trimmedHistory = history.slice(0, 50);
        
        await chrome.storage.local.set({ videoHistory: trimmedHistory });
        console.log('Video added to history:', historyEntry);
    } catch (error) {
        console.error('Failed to add video to history:', error);
    }
}

/**
 * Get video title from YouTube page
 * @param {number} tabId - Tab ID to extract title from
 * @returns {Promise<string>} Video title or default fallback
 */
async function getVideoTitle(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                // Try multiple selectors for video title
                const selectors = [
                    'h1.ytd-watch-metadata yt-formatted-string',
                    'h1.ytd-video-primary-info-renderer',
                    'h1[data-test-selector="video-title"]',
                    'meta[name="title"]'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent || element.getAttribute('content') || '';
                    }
                }
                
                // Fallback to document title
                return document.title.replace(' - YouTube', '');
            }
        });
        
        return results[0]?.result?.trim() || 'Unknown Video';
    } catch (error) {
        console.error('Failed to get video title:', error);
        return 'Unknown Video';
    }
}

// Initialize storage when extension starts
initializeVideoHistory();

/**
 * A reusable function to either create a new pop-up window or update the existing one.
 * @param {string} url The URL to load in the pop-up.
 * @param {number} sourceTabId Optional tab ID to extract video title from
 */
async function openOrUpdatePopup(url, sourceTabId = null) {
    const windowWidth = 854;
    const windowHeight = 480;

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    
    // Get video title and save to history
    if (videoId) {
        let title = 'Unknown Video';
        if (sourceTabId) {
            title = await getVideoTitle(sourceTabId);
        }
        
        await addVideoToHistory({
            videoId: videoId,
            title: title,
            url: url
        });
    }

    // Check if the popup window already exists.
    if (popupWindowId !== null) {
        chrome.windows.get(popupWindowId, {}, (existingWindow) => {
            // chrome.runtime.lastError is set if the window is not found (e.g., it was closed by the user).
            if (chrome.runtime.lastError || !existingWindow) {
                // If the window was closed, clear the old ID and create a new one.
                popupWindowId = null;
                createPopupWindow(url, windowWidth, windowHeight);
            } else {
                // If the window exists, just update its URL and bring it to the front.
                chrome.windows.update(popupWindowId, {
                    url: url,
                    focused: true
                });
            }
        });
    } else {
        // If no window ID is stored, create a new one.
        createPopupWindow(url, windowWidth, windowHeight);
    }
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null if not found
 */
function extractVideoId(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v');
    } catch (error) {
        console.error('Failed to extract video ID from URL:', url, error);
        return null;
    }
}

// Listen for when the user clicks the extension's icon in the toolbar.
chrome.action.onClicked.addListener(async (tab) => {
    // Check if the current tab is a YouTube video page.
    if (tab.url && tab.url.includes("youtube.com/watch")) {
        await openOrUpdatePopup(tab.url, tab.id);
    }
    // If it's not a YouTube video page, clicking the icon will do nothing.
});

// This listener handles messages from the content script (for the in-video button and the badge).
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'openPopup') {
        const popupUrl = `https://www.youtube.com/watch?v=${request.videoId}`;
        await openOrUpdatePopup(popupUrl, sender.tab?.id);
    } else if (request.action === 'updateBadge') {
         // Set badge text from content script message
        chrome.action.setBadgeText({ text: request.count.toString(), tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else if (request.action === 'getVideoHistory') {
        // Handle history requests from popup
        const history = await getVideoHistory();
        sendResponse({ history });
    }
    
    // Return true to indicate we will send a response asynchronously
    return true;
});

const css = `
    /* For the popup.html */
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }

    /* For the injected button on YouTube */
    .popup-player-btn {
        display: hidden !important;
        opacity: 0!important;
    }

    html {
        overflow: hidden !important;
    }

    ytd-page-manager {
        margin: 0 !important;
    }

    div#full-bleed-container {
        height: 100vh !important;
        max-height: 100vh !important;
    }

    div.video-stream.html5-main-video {
        width: 100vw !important;
        height: 100vh !important;
    }

    div#masthead-container {
        display: none !important;
    }

    button.ytp-fullscreen-button {
        display: none !important;
    }
`;

/**
 * Creates a new pop-up window and stores its ID.
 * @param {string} url The URL to open.
 * @param {number} width The width of the new window.
 * @param {number} height The height of the new window.
 */
function createPopupWindow(url, width, height) {
    chrome.windows.getLastFocused((lastWindow) => {
        // Calculate the position to center the new window relative to the last focused window.
        const top = lastWindow.top + Math.round((lastWindow.height - height) / 2);
        const left = lastWindow.left + Math.round((lastWindow.width - width) / 2);

        chrome.windows.create({
            url: url,
            type: 'popup',
            width: width,
            height: height,
            top: top,
            left: left
        }, (newWindow) => {
            popupWindowId = newWindow.id;

            // Get the tabId of the first tab in the new popup window
            const tabId = newWindow.tabs && newWindow.tabs.length > 0 ? newWindow.tabs[0].id : null;
            
            if (tabId) {
                // Wait for the tab to finish loading before injecting CSS
                chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo, tab) {
                    if (updatedTabId === tabId && changeInfo.status === 'complete') {
                        // Remove the listener to avoid multiple calls
                        chrome.tabs.onUpdated.removeListener(listener);
                        
                        // Inject CSS into the created popup window tab
                        chrome.scripting.insertCSS({
                            target: { tabId: tabId },
                            css: css
                        })
                        .then(() => {
                            console.log('CSS injected successfully into popup window.');
                        })
                        .catch((error) => {
                            console.error('Failed to inject CSS into popup window:', error);
                        });
                    }
                });
            }
        });
    });
}


// Clear the stored window ID when the pop-up window is closed by the user.
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === popupWindowId) {
        popupWindowId = null;
    }
});


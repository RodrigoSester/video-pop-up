let popupWindowId = null;

// Default configuration settings (shared with options.js)
const DEFAULT_SETTINGS = {
    // Window settings
    windowWidth: 854,
    windowHeight: 480,
    // History settings
    historyLimit: 50,
    historyDuration: 30, // days, 0 = forever
    
    // Theme settings
    themeMode: 'auto', // 'auto', 'light', 'dark'
    
    // Advanced settings
    autoFocus: true,
    rememberWindowState: true
};

let currentSettings = { ...DEFAULT_SETTINGS };

// --- Settings Management ---
/**
 * Load settings from chrome storage
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get('extensionSettings');
        if (result.extensionSettings) {
            currentSettings = { ...DEFAULT_SETTINGS, ...result.extensionSettings };
        }
        console.log('Settings loaded:', currentSettings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        currentSettings = { ...DEFAULT_SETTINGS };
    }
}

/**
 * Get current settings
 */
function getSettings() {
    return currentSettings;
}

/**
 * Clean up old history entries based on settings
 */
async function cleanupOldHistory() {
    if (currentSettings.historyDuration === 0) {
        return; // Keep forever
    }
    
    try {
        const history = await getVideoHistory();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - currentSettings.historyDuration);
        
        const filteredHistory = history.filter(item => {
            const itemDate = new Date(item.dateAdded || item.timestamp || 0);
            return itemDate > cutoffDate;
        });
        
        if (filteredHistory.length !== history.length) {
            await chrome.storage.local.set({ videoHistory: filteredHistory });
            console.log(`Cleaned up ${history.length - filteredHistory.length} old history entries`);
        }
    } catch (error) {
        console.error('Failed to cleanup old history:', error);
    }
}

// --- Video History Management ---
/**
 * Initialize video history storage
 */
function initializeVideoHistory() {
    chrome.storage.local.get('videoHistory').then(result => {
        console.log('Video history initialized:', result);
        if (!result.videoHistory) {
            return chrome.storage.local.set({ videoHistory: [] });
        }
    }).then(() => {
        console.log('Video history storage ready.');
    }).catch(error => {
        console.error('Failed to initialize video history:', error);
    });
}

/**
 * Get video history from storage
 * @returns {Promise<Array>} Array of video history objects ordered by dateAdded (most recent first)
 */
function getVideoHistory() {
    return chrome.storage.local.get('videoHistory').then(result => {
        const history = result.videoHistory || [];
        // Sort by dateAdded in descending order (most recent first)
        return history.sort((a, b) => {
            const dateA = new Date(a.dateAdded || a.timestamp || 0);
            const dateB = new Date(b.dateAdded || b.timestamp || 0);
            return dateB - dateA;
        });
    }).catch(error => {
        console.error('Failed to get video history:', error);
        return [];
    });
}

/**
 * Add a video to history
 * @param {Object} videoData - Video data object
 * @param {string} videoData.videoId - YouTube video ID
 * @param {string} videoData.title - Video title
 * @param {string} videoData.url - Full YouTube URL
 * @param {string} videoData.channel - Channel name (optional)
 * @param {string} videoData.thumbnail - Thumbnail URL (optional)
 */
function addVideoToHistory(videoData) {
    getVideoHistory().then(history => {
        // Check if video already exists in history
        const existingIndex = history.findIndex(item => item.videoId === videoData.videoId);
        
        const historyEntry = {
            videoId: videoData.videoId,
            title: videoData.title,
            url: videoData.url,
            channel: videoData.channel || 'Unknown Channel',
            thumbnail: videoData.thumbnail || `https://i.ytimg.com/vi/${videoData.videoId}/default.jpg`,
            timestamp: Date.now(),
            dateAdded: new Date().toISOString()
        };
        
        if (existingIndex !== -1) {
            // Update existing entry timestamp and metadata
            history[existingIndex] = historyEntry;
        } else {
            // Add new entry at the beginning
            history.unshift(historyEntry);
        }
        
        // Keep only last N videos based on settings
        const trimmedHistory = history.slice(0, currentSettings.historyLimit);
        
        return chrome.storage.local.set({ videoHistory: trimmedHistory });
    }).then(() => {
        console.log('Video added to history:', videoData);
    }).catch(error => {
        console.error('Failed to add video to history:', error);
    });
}

/**
 * Delete a video from history
 * @param {string} videoId - YouTube video ID to delete
 */
function deleteVideoFromHistory(videoId) {
    getVideoHistory().then(history => {
        // Filter out the video with matching videoId
        const updatedHistory = history.filter(item => item.videoId !== videoId);
        
        return chrome.storage.local.set({ videoHistory: updatedHistory });
    }).then(() => {
        console.log('Video deleted from history:', videoId);
    }).catch(error => {
        console.error('Failed to delete video from history:', error);
    });
}

/**
 * Get video title from YouTube page
 * @param {number} tabId - Tab ID to extract title from
 * @returns {Promise<string>} Video title or default fallback
 */
function getVideoTitle(tabId) {
    return chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            const element = document.querySelector('h1 yt-formatted-string.ytd-watch-metadata');
            console.log('Extracted title element:', element);
            if (element) {
                return element.textContent || element.getAttribute('content') || '';
            }
            
            // Fallback to document title
            return document.title.replace(' - YouTube', '');
        }
    }).then(results => {
        console.log('Video title extraction results:', results);
        return results[0]?.result?.trim() || 'Unknown Video';
    }).catch(error => {
        console.error('Failed to get video title:', error);
        return error.message || '';
    });
}

// Initialize storage when extension starts
initializeVideoHistory();
loadSettings();

/**
 * A reusable function to either create a new pop-up window or update the existing one.
 * @param {string} url The URL to load in the pop-up.
 */
function openOrUpdatePopup(url) {
    const windowWidth = currentSettings.windowWidth;
    const windowHeight = currentSettings.windowHeight;

    // Check if the popup window already exists.
    if (popupWindowId !== null) {
        chrome.windows.get(popupWindowId, {}, (existingWindow) => {
            // chrome.runtime.lastError is set if the window is not found (e.g., it was closed by the user).
            if (chrome.runtime.lastError || !existingWindow) {
                // If the window was closed, clear the old ID and create a new one.
                popupWindowId = null;
                createPopupWindow(url, windowWidth, windowHeight);
            } else {
                // If the window exists, update the tab URL and bring window to the front.
                chrome.windows.update(popupWindowId, {
                    focused: true
                });
                
                // Update the URL of the first tab in the window
                if (existingWindow.tabs && existingWindow.tabs.length > 0) {
                    const tabId = existingWindow.tabs[0].id;
                    chrome.tabs.update(tabId, { url: url });
                }
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
chrome.action.onClicked.addListener((tab) => {
    // Check if the current tab is a YouTube video page.
    if (tab.url && tab.url.includes("youtube.com/watch")) {
        const videoId = extractVideoId(tab.url);
        if (videoId) {
            // Add video to history directly since we're in the background script
            const videoData = {
                videoId: videoId,
                title: 'Unknown Video',
                url: tab.url
            };
            
            // Try to get the video title from the current tab
            getVideoTitle(tab.id).then(title => {
                videoData.title = title;
                addVideoToHistory(videoData);
            }).catch(error => {
                console.error('Error getting video title:', error);
                addVideoToHistory(videoData);
            });
            
            // Open the popup
            openOrUpdatePopup(tab.url);
        }
    }
    // If it's not a YouTube video page, clicking the icon will do nothing.
});

// This listener handles messages from the content script (for the in-video button and the badge).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPopup') {
        const popupUrl = `https://www.youtube.com/watch?v=${request.videoId}`;
        openOrUpdatePopup(popupUrl);
    } else if (request.action === 'addVideoToHistory') {
        // Handle video history tracking
        const videoData = {
            videoId: request.videoId,
            title: request.title || 'Unknown Video',
            url: `https://www.youtube.com/watch?v=${request.videoId}`
        };
        
        // If we have a source tab, try to get the video title
        if (sender.tab?.id && (!request.title || request.title === 'Unknown Video')) {
            getVideoTitle(sender.tab.id).then(title => {
                videoData.title = title;
                addVideoToHistory(videoData);
            }).catch(error => {
                console.error('Error getting video title:', error);
                addVideoToHistory(videoData);
            });
        } else {
            addVideoToHistory(videoData);
        }
    } else if (request.action === 'updateBadge') {
         // Set badge text from content script message
        chrome.action.setBadgeText({ text: request.count.toString(), tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else if (request.action === 'deleteVideoFromHistory') {
        // Handle video deletion from history
        if (request.videoId) {
            deleteVideoFromHistory(request.videoId);
        }
    } else if (request.action === 'getVideoHistory') {
        // Handle history requests from popup
        getVideoHistory().then(history => {
            sendResponse({ history });
        }).catch(error => {
            console.error('Error getting video history:', error);
            sendResponse({ history: [], error: error.message });
        });
        
        // Return true to indicate we will send a response asynchronously
        return true;
    }
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

    /* Hide fullscreen and theater mode buttons in popup */
    button.ytp-fullscreen-button,
    button.ytp-size-button {
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
        // Calculate centered position
        const top = lastWindow.top + Math.round((lastWindow.height - height) / 2);
        const left = lastWindow.left + Math.round((lastWindow.width - width) / 2);

        const windowOptions = {
            url: url,
            type: 'popup',
            width: width,
            height: height,
            top: top,
            left: left,
            focused: currentSettings.autoFocus
        };

        chrome.windows.create(windowOptions, (newWindow) => {
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

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.extensionSettings) {
        console.log('Settings changed, reloading...');
        loadSettings();
    }
});

// Periodic cleanup of old history entries (run every hour)
setInterval(() => {
    cleanupOldHistory();
}, 60 * 60 * 1000); // 1 hour in milliseconds

// Initial cleanup on startup
setTimeout(() => {
    cleanupOldHistory();
}, 5000); // Wait 5 seconds after startup


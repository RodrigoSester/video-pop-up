let popupWindowId = null;

/**
 * A reusable function to either create a new pop-up window or update the existing one.
 * @param {string} url The URL to load in the pop-up.
 */
function openOrUpdatePopup(url) {
    const windowWidth = 854;
    const windowHeight = 480;

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

// Listen for when the user clicks the extension's icon in the toolbar.
chrome.action.onClicked.addListener((tab) => {
    // Check if the current tab is a YouTube video page.
    if (tab.url && tab.url.includes("youtube.com/watch")) {
        openOrUpdatePopup(tab.url);
    }
    // If it's not a YouTube video page, clicking the icon will do nothing.
});

// This listener handles messages from the content script (for the in-video button and the badge).
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPopup') {
        const popupUrl = `https://www.youtube.com/watch?v=${request.videoId}`;
        openOrUpdatePopup(popupUrl);
    } else if (request.action === 'updateBadge') {
         // Set badge text from content script message
        chrome.action.setBadgeText({ text: request.count.toString(), tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
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


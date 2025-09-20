let popupWindowId = null;

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPopup') {
        const videoId = request.videoId;
        const popupUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const windowWidth = 854;
        const windowHeight = 480;

        // Check if the popup window already exists and is open
        if (popupWindowId !== null) {
            chrome.windows.get(popupWindowId, {}, (existingWindow) => {
                // The 'get' call will throw an error if the window is not found.
                if (chrome.runtime.lastError || !existingWindow) {
                    // Window was likely closed by the user, so we create a new one.
                    popupWindowId = null; // Clear the old ID
                    createPopupWindow(popupUrl, windowWidth, windowHeight);
                } else {
                    // Window exists, so we update it and bring it to the front.
                    chrome.windows.update(popupWindowId, {
                        url: popupUrl,
                        focused: true
                    });
                }
            });
        } else {
            // No window ID is stored, so we create a new one.
            createPopupWindow(popupUrl, windowWidth, windowHeight);
        }

    } else if (request.action === 'updateBadge') {
         // Set badge text from content script message
        chrome.action.setBadgeText({ text: request.count.toString(), tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    }
});

/**
 * Creates a new pop-up window and stores its ID.
 * @param {string} url The URL to open.
 * @param {number} width The width of the new window.
 * @param {number} height The height of the new window.
 */
function createPopupWindow(url, width, height) {
    chrome.windows.getLastFocused((lastWindow) => {
        const top = lastWindow.top + Math.round((lastWindow.height - height) / 2);
        const left = lastWindow.left + Math.round((lastWindow.width - width) / 2);

        chrome.windows.create({
            url: url,
            type: 'popup',
            width: width,
            height: height,
            top: top,
            left: left,
            focused: true
        }, (newWindow) => {
            popupWindowId = newWindow.id;
            console.log(`Created new popup window with ID: ${newWindow}`);
        });
    });
}


// Clear popupWindowId when a window is closed by the user
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === popupWindowId) {
        popupWindowId = null;
    }
});


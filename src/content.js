// --- Picture-in-Picture functionality ---
function isPiPSupported() {
    return 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
}

function getVideoElement() {
    return document.querySelector('video.html5-main-video');
}

async function togglePictureInPicture() {
    const video = getVideoElement();
    if (!video || !isPiPSupported()) {
        console.log('Picture-in-Picture not supported or video not found');
        return false;
    }

    try {
        if (document.pictureInPictureElement) {
            // Exit PiP mode
            await document.exitPictureInPicture();
            console.log('Exited Picture-in-Picture mode');
            return false;
        } else {
            // Enter PiP mode
            await video.requestPictureInPicture();
            console.log('Entered Picture-in-Picture mode');
            return true;
        }
    } catch (error) {
        console.error('Picture-in-Picture error:', error);
        return false;
    }
}

// --- Settings Management ---
let extensionSettings = {
    enablePiP: true,
    pipDefaultMode: 'popup'
};

// Load settings from background script
function loadExtensionSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (response && response.settings) {
            extensionSettings = response.settings;
            console.log('Extension settings loaded:', extensionSettings);
        }
    });
}

// --- Add Buttons to Video Player ---
function addButtonsToPlayer() {
    const playerControls = document.querySelector('.ytp-right-controls');
    if (!playerControls) return;

    // Load current settings
    loadExtensionSettings();

    // Add Pop-up Window Button
    if (!playerControls.querySelector('.popup-player-btn')) {
        const popupButton = document.createElement('button');
        popupButton.className = 'ytp-button popup-player-btn';
        popupButton.title = chrome.i18n.getMessage('popupButtonTitle') || 'Open in Pop-up Window';

        const popupIcon = document.createElement('img');
        popupIcon.src = chrome.runtime.getURL('images/icon48.png');
        popupIcon.style.width = '28px';
        popupIcon.style.height = '28px';
        popupIcon.style.filter = 'grayscale(1) invert(1)';
        
        popupButton.appendChild(popupIcon);

        popupButton.addEventListener('click', async () => {
            const videoId = new URLSearchParams(window.location.search).get('v');
            if (videoId) {
                // Send addVideoToHistory message first
                chrome.runtime.sendMessage({ 
                    action: 'addVideoToHistory', 
                    videoId: videoId 
                });
                
                // Handle different modes based on settings
                if (extensionSettings.pipDefaultMode === 'pip' && isPiPSupported()) {
                    // Use Picture-in-Picture
                    await togglePictureInPicture();
                } else if (extensionSettings.pipDefaultMode === 'ask' && isPiPSupported()) {
                    // Ask user which mode to use
                    const usePiP = confirm('Choose viewing mode:\n\nOK = Picture-in-Picture\nCancel = Pop-up Window');
                    if (usePiP) {
                        await togglePictureInPicture();
                    } else {
                        chrome.runtime.sendMessage({ action: 'openPopup', videoId: videoId });
                    }
                } else {
                    // Default to popup window
                    chrome.runtime.sendMessage({ action: 'openPopup', videoId: videoId });
                }
            }
        });
        playerControls.prepend(popupButton);
    }

    // Add Picture-in-Picture Button (only if enabled in settings)
    if (extensionSettings.enablePiP && isPiPSupported() && !playerControls.querySelector('.pip-player-btn')) {
        const pipButton = document.createElement('button');
        pipButton.className = 'ytp-button pip-player-btn';
        pipButton.title = chrome.i18n.getMessage('pipButtonTitle') || 'Picture-in-Picture';

        // Create PiP icon (using CSS for a simple icon)
        const pipIcon = document.createElement('div');
        pipIcon.style.cssText = `
            width: 24px;
            height: 24px;
            border: 2px solid currentColor;
            border-radius: 2px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Inner rectangle for PiP icon
        const pipInner = document.createElement('div');
        pipInner.style.cssText = `
            width: 8px;
            height: 6px;
            border: 1px solid currentColor;
            background: currentColor;
            position: absolute;
            top: 2px;
            right: 2px;
        `;
        
        pipIcon.appendChild(pipInner);
        pipButton.appendChild(pipIcon);

        pipButton.addEventListener('click', async () => {
            const videoId = new URLSearchParams(window.location.search).get('v');
            if (videoId) {
                // Add to history
                chrome.runtime.sendMessage({ 
                    action: 'addVideoToHistory', 
                    videoId: videoId 
                });
            }

            // Toggle Picture-in-Picture
            const pipActive = await togglePictureInPicture();
            updatePiPButtonState(pipButton, pipActive);
        });

        // Insert before the pop-up button
        const popupButton = playerControls.querySelector('.popup-player-btn');
        if (popupButton) {
            playerControls.insertBefore(pipButton, popupButton);
        } else {
            playerControls.prepend(pipButton);
        }

        // Set up PiP event listeners
        setupPiPEventListeners(pipButton);
    }
}

function updatePiPButtonState(button, isActive) {
    if (isActive) {
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        button.title = 'Exit Picture-in-Picture';
    } else {
        button.style.backgroundColor = '';
        button.title = 'Picture-in-Picture';
    }
}

function setupPiPEventListeners(pipButton) {
    // Listen for PiP events to update button state
    document.addEventListener('enterpictureinpicture', () => {
        updatePiPButtonState(pipButton, true);
    });

    document.addEventListener('leavepictureinpicture', () => {
        updatePiPButtonState(pipButton, false);
    });
}

// Legacy function name for compatibility
function addPopupButtonToPlayer() {
    addButtonsToPlayer();
}


// --- Observe for dynamic changes and add buttons ---
// YouTube navigates dynamically, so we need to observe changes
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        // Give the page a moment to load the new video player
        setTimeout(addButtonsToPlayer, 1000);
    }
}).observe(document.body, { subtree: true, childList: true });

// Initial setup
setTimeout(() => {
    loadExtensionSettings();
    addButtonsToPlayer();
}, 2000); // Wait for initial page load

// --- Badge Management ---
function updateBadge() {
    const videoCount = document.querySelectorAll('ytd-thumbnail a#thumbnail').length;
    chrome.runtime.sendMessage({ action: 'updateBadge', count: videoCount > 0 ? 'ON' : '' });
}

// Run badge update on load and when the page content changes
updateBadge();
const observer = new MutationObserver(updateBadge);
observer.observe(document.body, { childList: true, subtree: true });

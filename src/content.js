// --- Add Button to Video Player ---
function addPopupButtonToPlayer() {
    // Use a more specific selector for the player controls
    const playerControls = document.querySelector('.ytp-right-controls');
    if (playerControls && !playerControls.querySelector('.popup-player-btn')) {
        const button = document.createElement('button');
        button.className = 'ytp-button popup-player-btn';
        button.title = 'Open in Pop-up Player';

        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('images/icon48.png');
        icon.style.width = '28px';
        icon.style.height = '28px';
        icon.style.filter = 'grayscale(1) invert(1)';
        
        button.appendChild(icon);

        button.addEventListener('click', () => {
            const videoId = new URLSearchParams(window.location.search).get('v');
            if (videoId) {
                // Send addVideoToHistory message first
                chrome.runtime.sendMessage({ 
                    action: 'addVideoToHistory', 
                    videoId: videoId 
                });
                
                // Then open the popup
                chrome.runtime.sendMessage({ action: 'openPopup', videoId: videoId });
            }
        });
        playerControls.prepend(button);
    }
}


// --- Observe for dynamic changes and add button ---
// YouTube navigates dynamically, so we need to observe changes
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        // Give the page a moment to load the new video player
        setTimeout(addPopupButtonToPlayer, 1000);
    }
}).observe(document.body, { subtree: true, childList: true });

// Initial check
setTimeout(addPopupButtonToPlayer, 2000); // Wait for initial page load

// --- Badge Management ---
function updateBadge() {
    const videoCount = document.querySelectorAll('ytd-thumbnail a#thumbnail').length;
    chrome.runtime.sendMessage({ action: 'updateBadge', count: videoCount > 0 ? 'ON' : '' });
}

// Run badge update on load and when the page content changes
updateBadge();
const observer = new MutationObserver(updateBadge);
observer.observe(document.body, { childList: true, subtree: true });

// --- Add Button to YouTube Music Player ---
function addPopupButtonToPlayer() {
    // YouTube Music has a different player structure
    const playerControls = document.querySelector('.middle-controls');
    if (playerControls && !playerControls.querySelector('.popup-player-btn-music')) {
        const button = document.createElement('button');
        button.className = 'popup-player-btn-music';
        button.title = chrome.i18n.getMessage('popupButtonTitle');
        button.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 8px;
            opacity: 0.7;
            transition: opacity 0.2s;
        `;

        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('images/icon48.png');
        icon.style.cssText = `
            width: 24px;
            height: 24px;
            filter: brightness(0) invert(1);
        `;
        
        button.appendChild(icon);

        button.addEventListener('mouseover', () => {
            button.style.opacity = '1';
        });

        button.addEventListener('mouseout', () => {
            button.style.opacity = '0.7';
        });

        button.addEventListener('click', () => {
            const musicId = new URLSearchParams(window.location.search).get('v');
            console.log('Music ID:', musicId);
            chrome.runtime.sendMessage({ action: 'openMusicPopup', musicId });
        });
        
        playerControls.appendChild(button);
    }
}

// --- Observe for dynamic changes and add button ---
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        // Give the page a moment to load the new player
        setTimeout(addPopupButtonToPlayer, 1000);
    }
}).observe(document.body, { subtree: true, childList: true });

// Initial check
setTimeout(addPopupButtonToPlayer, 2000); // Wait for initial page load

// --- Badge Management ---
function updateBadge() {
    const isOnMusicPage = window.location.hostname === 'music.youtube.com';
    chrome.runtime.sendMessage({ 
        action: 'updateBadge', 
        count: isOnMusicPage ? 'ON' : '' 
    });
}

// Run badge update on load and when the page content changes
updateBadge();
const observer = new MutationObserver(updateBadge);
observer.observe(document.body, { childList: true, subtree: true });

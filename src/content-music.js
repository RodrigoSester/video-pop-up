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

// --- Extract Track Information ---
function getTrackInfo() {
    const trackInfo = {
        title: '',
        artist: '',
        thumbnail: '',
        isPlaying: false,
        currentTime: 0,
        duration: 0
    };

    // Get title
    const titleElement = document.querySelector('.title.style-scope.ytmusic-player-bar');
    if (titleElement) {
        trackInfo.title = titleElement.textContent.trim();
    }

    // Get artist
    const artistElement = document.querySelector('.byline.style-scope.ytmusic-player-bar');
    if (artistElement) {
        trackInfo.artist = artistElement.textContent.trim();
    }

    // Get thumbnail
    const thumbnailElement = document.querySelector('img.image.style-scope.ytmusic-player-bar');
    if (thumbnailElement) {
        trackInfo.thumbnail = thumbnailElement.src;
    }

    // Get video element for playback info
    const videoElement = document.querySelector('video');
    if (videoElement) {
        trackInfo.isPlaying = !videoElement.paused;
        trackInfo.currentTime = videoElement.currentTime;
        trackInfo.duration = videoElement.duration;
    }

    return trackInfo;
}

// --- Playback Controls ---
function togglePlayPause() {
    const playButton = document.querySelector('#play-pause-button');
    if (playButton) {
        playButton.click();
        
        // Wait a bit and return the new state
        setTimeout(() => {
            const videoElement = document.querySelector('video');
            return {
                isPlaying: videoElement ? !videoElement.paused : false
            };
        }, 100);
    }
    
    const videoElement = document.querySelector('video');
    return {
        isPlaying: videoElement ? !videoElement.paused : false
    };
}

function previousTrack() {
    const prevButton = document.querySelector('.previous-button');
    if (prevButton) {
        prevButton.click();
    }
}

function nextTrack() {
    const nextButton = document.querySelector('.next-button');
    if (nextButton) {
        nextButton.click();
    }
}

function seekTo(time) {
    const videoElement = document.querySelector('video');
    if (videoElement) {
        videoElement.currentTime = time;
    }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTrackInfo') {
        sendResponse(getTrackInfo());
    } else if (request.action === 'togglePlayPause') {
        const result = togglePlayPause();
        sendResponse(result);
    } else if (request.action === 'previousTrack') {
        previousTrack();
        sendResponse({ success: true });
    } else if (request.action === 'nextTrack') {
        nextTrack();
        sendResponse({ success: true });
    } else if (request.action === 'seekTo') {
        seekTo(request.time);
        sendResponse({ success: true });
    }
    
    return true; // Keep message channel open for async response
});

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

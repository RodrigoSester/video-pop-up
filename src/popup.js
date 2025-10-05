document.addEventListener('DOMContentLoaded', () => {
    // Initialize i18n texts
    initializeI18n();
    
    const videoList = document.getElementById('video-list');
    const message = document.getElementById('message');
    const historyList = document.getElementById('history-list');
    const historyMessage = document.getElementById('history-message');
    
    // Tab navigation elements
    const currentTab = document.getElementById('current-tab');
    const historyTab = document.getElementById('history-tab');
    const currentSection = document.getElementById('current-section');
    const historySection = document.getElementById('history-section');

    // Initialize tabs
    initializeTabs();
    
    // Load current page videos
    loadCurrentPageVideos();
    
    // Load video history
    loadVideoHistory();

    function initializeI18n() {
        // Set static text elements
        document.getElementById('popup-title').textContent = chrome.i18n.getMessage('popupTitle');
        document.getElementById('current-tab').textContent = chrome.i18n.getMessage('currentPageTab');
        document.getElementById('history-tab').textContent = chrome.i18n.getMessage('historyTab');
        document.getElementById('message').textContent = chrome.i18n.getMessage('clickVideoMessage');
        document.getElementById('history-message').textContent = chrome.i18n.getMessage('historyMessage');
    }

    function initializeTabs() {
        currentTab.addEventListener('click', () => switchTab('current'));
        historyTab.addEventListener('click', () => switchTab('history'));
    }

    function switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tab === 'current') {
            currentTab.classList.add('active');
            currentSection.classList.add('active');
        } else {
            historyTab.classList.add('active');
            historySection.classList.add('active');
        }
    }

    function loadCurrentPageVideos() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab && activeTab.url.includes("youtube.com")) {
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    func: getVideoData,
                }, (injectionResults) => {
                    if (chrome.runtime.lastError || !injectionResults || !injectionResults[0] || !injectionResults[0].result) {
                        message.textContent = chrome.i18n.getMessage('noVideosFound');
                        console.error("Script injection failed or no result:", chrome.runtime.lastError);
                        return;
                    }
                    
                    const videos = injectionResults[0].result;
                    displayCurrentVideos(videos);
                });
            } else {
                message.textContent = chrome.i18n.getMessage('navigateToYouTube');
            }
        });
    }

    function displayCurrentVideos(videos) {
        if (videos.length === 0) {
            message.textContent = chrome.i18n.getMessage('noVideosOnPage');
        } else {
            message.textContent = chrome.i18n.getMessage('clickToOpenPopup');
            videos.forEach((video) => {
                const listItem = createVideoListItem(video, 'current');
                videoList.appendChild(listItem);
            });
        }
    }

    function loadVideoHistory() {
        chrome.runtime.sendMessage({ action: 'getVideoHistory' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error getting video history:', JSON.stringify(chrome.runtime.lastError));
                historyMessage.textContent = chrome.i18n.getMessage('errorGettingHistory');
                return;
            }
            
            const history = response?.history || [];
            displayVideoHistory(history);
        });
    }

    function displayVideoHistory(history) {
        historyList.innerHTML = ''; // Clear existing items
        
        if (history.length === 0) {
            historyMessage.textContent = chrome.i18n.getMessage('noHistoryYet');
        } else {
            historyMessage.textContent = chrome.i18n.getMessage('historyCount', [history.length.toString()]);
            history.forEach((video) => {
                const listItem = createVideoListItem(video, 'history');
                historyList.appendChild(listItem);
            });
        }
    }

    function createVideoListItem(video, type) {
        const listItem = document.createElement('li');
        listItem.className = 'video-item';
        listItem.dataset.videoId = video.videoId;
        
        const videoContent = document.createElement('div');
        videoContent.className = 'video-content';
        
        const videoTitle = document.createElement('div');
        videoTitle.className = 'video-title';
        videoTitle.textContent = video.title;
        
        const videoMeta = document.createElement('div');
        videoMeta.className = 'video-meta';
        
        if (type === 'current') {
            videoMeta.textContent = video.minutes 
                ? chrome.i18n.getMessage('duration', [video.minutes])
                : chrome.i18n.getMessage('durationUnknown');
        } else {
            const date = new Date(video.timestamp || video.dateAdded);
            const dateString = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            videoMeta.textContent = chrome.i18n.getMessage('opened', [dateString]);
        }
        
        videoContent.appendChild(videoTitle);
        videoContent.appendChild(videoMeta);
        listItem.appendChild(videoContent);

        // Add delete button for history items only
        if (type === 'history') {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.title = chrome.i18n.getMessage('deleteFromHistory');
            deleteButton.innerHTML = '🗑️'; // Trash can emoji
            
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the video click
                
                // Send delete message to background script
                chrome.runtime.sendMessage({ 
                    action: 'deleteVideoFromHistory', 
                    videoId: video.videoId
                });
                
                // Remove the item from UI immediately
                listItem.remove();
                
                // Update the history message if no items left
                const remainingItems = historyList.querySelectorAll('.video-item').length;
                if (remainingItems === 0) {
                    historyMessage.textContent = chrome.i18n.getMessage('noHistoryYet');
                } else {
                    historyMessage.textContent = chrome.i18n.getMessage('historyCount', [remainingItems.toString()]);
                }
            });
            
            listItem.appendChild(deleteButton);
        }

        videoContent.addEventListener('click', (e) => {
            // Send addVideoToHistory message first with video title if available
            chrome.runtime.sendMessage({ 
                action: 'addVideoToHistory', 
                videoId: video.videoId,
                title: video.title
            });
            
            // Then open the popup
            chrome.runtime.sendMessage({ action: 'openPopup', videoId: video.videoId });
            e.preventDefault();
            window.close();
        });

        return listItem;
    }
});

function getVideoData() {
    const videos = [];
    document.querySelectorAll('ytd-rich-item-renderer').forEach(renderer => {
        renderer.querySelectorAll('a[href*="watch?v="]').forEach(anchor => {
            const videoUrl = new URL(anchor.href, location.origin);
            const videoId = videoUrl.searchParams.get('v');
            if (videoId) {
                const titleElement = renderer.querySelector('h3.yt-lockup-metadata-view-model__heading-reset');
                const title = titleElement ? titleElement.textContent.trim() : 'Untitled Video';

                // Try to get the duration (minutes) from the renderer
                let minutes = '';
                const durationElement = renderer.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
                if (durationElement) {
                    minutes = durationElement.textContent.trim();
                }

                if (!videos.some(v => v.videoId === videoId)) {
                    videos.push({
                        videoId,
                        title,
                        minutes
                    });
                }
            }
        });
    });
    return videos;
}

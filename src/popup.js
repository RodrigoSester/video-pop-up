document.addEventListener('DOMContentLoaded', () => {
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
                        message.textContent = "Couldn't find any videos on this page. Navigate to a YouTube page with videos.";
                        console.error("Script injection failed or no result:", chrome.runtime.lastError);
                        return;
                    }
                    
                    const videos = injectionResults[0].result;
                    displayCurrentVideos(videos);
                });
            } else {
                message.textContent = "Please navigate to YouTube to use this extension.";
            }
        });
    }

    function displayCurrentVideos(videos) {
        if (videos.length === 0) {
            message.textContent = "No videos found on this page.";
        } else {
            message.textContent = "Click a video to open it in a pop-up.";
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
                historyMessage.textContent = chrome.runtime.lastError.message;;
                return;
            }
            
            const history = response?.history || [];
            displayVideoHistory(history);
        });
    }

    function displayVideoHistory(history) {
        historyList.innerHTML = ''; // Clear existing items
        
        if (history.length === 0) {
            historyMessage.textContent = "No videos in history yet. Open some videos in pop-up to see them here!";
        } else {
            historyMessage.textContent = `${history.length} video(s) in your history. Click to reopen in pop-up.`;
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
        
        const videoTitle = document.createElement('div');
        videoTitle.className = 'video-title';
        videoTitle.textContent = video.title;
        
        const videoMeta = document.createElement('div');
        videoMeta.className = 'video-meta';
        
        if (type === 'current') {
            videoMeta.textContent = video.minutes ? `Duration: ${video.minutes}` : 'Duration: Unknown';
        } else {
            const date = new Date(video.timestamp || video.dateAdded);
            videoMeta.textContent = `Opened: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        }
        
        listItem.appendChild(videoTitle);
        listItem.appendChild(videoMeta);

        listItem.addEventListener('click', (e) => {
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

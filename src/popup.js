document.addEventListener('DOMContentLoaded', () => {
    const videoList = document.getElementById('video-list');
    const message = document.getElementById('message');

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
                if (videos.length === 0) {
                    message.textContent = "No videos found on this page.";
                } else {
                    message.textContent = "Click a video to open it in a pop-up.";
                    videos.forEach((video, index) => {
                        const listItem = document.createElement('li');
                        listItem.className = 'flex items-center p-2 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors';
                        listItem.dataset.videoId = video.videoId;
                        
                        const titleLink = document.createElement('a');
                        titleLink.textContent = `${video.title} (${video.minutes})`;
                        titleLink.className = 'text-sm flex-grow text-blue-400 underline';
                        titleLink.href = `https://www.youtube.com/watch?v=${video.videoId}`;
                        titleLink.target = '_blank';
                        listItem.appendChild(titleLink);

                        listItem.addEventListener('click', (e) => {
                            chrome.runtime.sendMessage({ action: 'openPopup', videoId: video.videoId });
                            e.preventDefault();
                            window.close();
                        });

                        videoList.appendChild(listItem);
                    });
                }
            });
        } else {
            message.textContent = "Please navigate to YouTube to use this extension.";
        }
    });
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

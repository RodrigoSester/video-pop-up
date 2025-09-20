document.addEventListener('DOMContentLoaded', () => {
    const videoList = document.getElementById('video-list');
    const message = document.getElementById('message');

    // Query for the active tab to send a message to the content script
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

                        const img = document.createElement('img');
                        img.src = video.thumbnail;
                        img.className = 'w-16 h-9 rounded mr-3 object-cover';

                        const titleSpan = document.createElement('span');
                        titleSpan.textContent = video.title;
                        titleSpan.className = 'text-sm flex-grow';

                        listItem.appendChild(img);
                        listItem.appendChild(titleSpan);

                        listItem.addEventListener('click', () => {
                            chrome.runtime.sendMessage({ action: 'openPopup', videoId: video.videoId });
                            window.close(); // Close the popup after clicking
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

// This function will be injected into the content page
function getVideoData() {
    const videos = [];
    document.querySelectorAll('ytd-thumbnail a#thumbnail').forEach(thumb => {
        const videoUrl = new URL(thumb.href);
        const videoId = videoUrl.searchParams.get('v');
        if (videoId) {
            const videoTitleElement = thumb.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer')?.querySelector('#video-title');
            const title = videoTitleElement ? videoTitleElement.textContent.trim() : 'Untitled Video';
            const thumbnailElement = thumb.querySelector('yt-image img');
            const thumbnail = thumbnailElement ? thumbnailElement.src : '';

            // Avoid duplicates
            if (!videos.some(v => v.videoId === videoId)) {
                videos.push({
                    videoId,
                    title,
                    thumbnail
                });
            }
        }
    });
    return videos;
}

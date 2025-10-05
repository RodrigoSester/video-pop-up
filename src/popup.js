document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme and i18n texts
    initializeTheme();
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

    // Extension settings for PiP functionality
    let extensionSettings = {
        enablePiP: true,
        pipDefaultMode: 'popup'
    };

    // Initialize tabs
    initializeTabs();
    
    // Initialize buttons
    initializeButtons();
    
    // Load current page videos
    loadCurrentPageVideos();
    
    // Load video history
    loadVideoHistory();

    // Load extension settings
    loadExtensionSettings();

    async function loadExtensionSettings() {
        try {
            const result = await chrome.storage.local.get('extensionSettings');
            if (result.extensionSettings) {
                extensionSettings = result.extensionSettings;
            }
        } catch (error) {
            console.error('Failed to load extension settings:', error);
        }
    }

    // Picture-in-Picture helper functions
    function isPiPSupported() {
        return 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
    }

    async function openVideoWithSettings(videoId, title) {
        // Send addVideoToHistory message first
        chrome.runtime.sendMessage({ 
            action: 'addVideoToHistory', 
            videoId: videoId,
            title: title
        });

        // Handle different modes based on settings
        if (extensionSettings.pipDefaultMode === 'pip' && isPiPSupported()) {
            // Request PiP from background script
            chrome.runtime.sendMessage({ 
                action: 'openPiP', 
                videoId: videoId 
            }, (response) => {
                if (!response || !response.success) {
                    // Fallback to popup if PiP fails
                    chrome.runtime.sendMessage({ action: 'openPopup', videoId: videoId });
                }
            });
        } else if (extensionSettings.pipDefaultMode === 'ask' && isPiPSupported()) {
            // Ask user which mode to use
            const usePiP = confirm('Choose viewing mode:\n\nOK = Picture-in-Picture\nCancel = Pop-up Window');
            if (usePiP) {
                chrome.runtime.sendMessage({ 
                    action: 'openPiP', 
                    videoId: videoId 
                }, (response) => {
                    if (!response || !response.success) {
                        // Fallback to popup if PiP fails
                        chrome.runtime.sendMessage({ action: 'openPopup', videoId: videoId });
                    }
                });
            } else {
                chrome.runtime.sendMessage({ action: 'openPopup', videoId: videoId });
            }
        } else {
            // Default to popup window
            chrome.runtime.sendMessage({ action: 'openPopup', videoId: videoId });
        }
    }

    async function initializeTheme() {
        try {
            // Load theme settings from storage
            const result = await chrome.storage.local.get('extensionSettings');
            const settings = result.extensionSettings || {};
            const themeMode = settings.themeMode || 'auto';
            
            applyTheme(themeMode);
        } catch (error) {
            console.error('Failed to load theme settings:', error);
            // Default to auto theme if loading fails
            applyTheme('auto');
        }
    }

    function applyTheme(themeMode) {
        const body = document.body;
        
        // Remove existing theme classes
        body.classList.remove('light-theme', 'dark-theme');
        
        if (themeMode === 'auto') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
        } else {
            // Use explicit theme
            body.classList.add(`${themeMode}-theme`);
        }
    }

    function initializeI18n() {
        // Set static text elements
        document.getElementById('popup-title').textContent = chrome.i18n.getMessage('popupTitle');
        document.getElementById('current-tab').textContent = chrome.i18n.getMessage('currentPageTab');
        document.getElementById('history-tab').textContent = chrome.i18n.getMessage('historyTab');
        document.getElementById('message').textContent = chrome.i18n.getMessage('clickVideoMessage');
        document.getElementById('history-message').textContent = chrome.i18n.getMessage('historyMessage');
        
        // Update clear history button text and tooltip
        const clearHistoryPopupText = document.getElementById('clearHistoryPopupText');
        const clearHistoryPopupBtn = document.getElementById('clearHistoryPopupBtn');
        if (clearHistoryPopupText) {
            clearHistoryPopupText.textContent = (chrome.i18n.getMessage('clearHistoryText') || 'Clear All');
        }
        if (clearHistoryPopupBtn) {
            clearHistoryPopupBtn.title = chrome.i18n.getMessage('clearHistoryHelp') || 'Clear All History';
        }
        
        // Update options button tooltip
        const optionsBtn = document.getElementById('optionsBtn');
        if (optionsBtn) {
            optionsBtn.title = chrome.i18n.getMessage('optionsPageTitle') || 'Settings';
        }

        // Update theme toggle tooltip
        const themeSwitch = document.querySelector('.switch');
        if (themeSwitch) {
            themeSwitch.title = chrome.i18n.getMessage('themeToggleLabel') || 'Toggle Theme';
        }
    }

    function initializeTabs() {
        currentTab.addEventListener('click', () => switchTab('current'));
        historyTab.addEventListener('click', () => switchTab('history'));
    }

    // Initialize button event listeners
    function initializeButtons() {
        // Options button
        const optionsBtn = document.getElementById('optionsBtn');
        if (optionsBtn) {
            optionsBtn.addEventListener('click', openOptionsPage);
        }

        // Clear history button in popup
        const clearHistoryBtn = document.getElementById('clearHistoryPopupBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', handleClearHistoryPopup);
        }

        // Theme toggle switch
        const themeSwitch = document.getElementById('popupThemeSwitch');
        if (themeSwitch) {
            themeSwitch.addEventListener('change', handleThemeToggle);
            // Initialize switch state based on current theme
            initializeThemeSwitch();
        }
    }

    // Open options page
    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
        window.close(); // Close the popup
    }

    // Handle clear history from popup
    async function handleClearHistoryPopup() {
        const confirmMessage = chrome.i18n.getMessage('confirmClearHistory') || 
            'Are you sure you want to clear all video history? This cannot be undone.';
        
        if (confirm(confirmMessage)) {
            try {
                await chrome.storage.local.set({ videoHistory: [] });
                // Reload the history display
                loadVideoHistory();
                
                // Show success message briefly
                const historyMessage = document.getElementById('history-message');
                const originalText = historyMessage.textContent;
                historyMessage.textContent = chrome.i18n.getMessage('historyClearedSuccess') || 'History cleared successfully';
                historyMessage.style.color = '#4caf50';
                
                setTimeout(() => {
                    historyMessage.textContent = originalText;
                    historyMessage.style.color = '';
                }, 2000);
            } catch (error) {
                console.error('Failed to clear history:', error);
                alert(chrome.i18n.getMessage('errorClearingHistory') || 'Error clearing history');
            }
        }
    }

    // Initialize theme switch state
    async function initializeThemeSwitch() {
        try {
            const result = await chrome.storage.local.get('extensionSettings');
            const settings = result.extensionSettings || {};
            const themeMode = settings.themeMode || 'auto';
            
            const themeSwitch = document.getElementById('popupThemeSwitch');
            
            if (themeSwitch) {
                // Set switch state based on current theme
                if (themeMode === 'dark') {
                    themeSwitch.checked = true;
                } else if (themeMode === 'light') {
                    themeSwitch.checked = false;
                } else {
                    // Auto mode - follow system preference
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    themeSwitch.checked = prefersDark;
                }
            }
        } catch (error) {
            console.error('Failed to initialize theme switch:', error);
        }
    }

    // Handle theme toggle
    async function handleThemeToggle(event) {
        try {
            const isDark = event.target.checked;
            const newThemeMode = isDark ? 'dark' : 'light';
            
            // Update settings
            const result = await chrome.storage.local.get('extensionSettings');
            const settings = result.extensionSettings || {};
            settings.themeMode = newThemeMode;
            
            await chrome.storage.local.set({ extensionSettings: settings });
            
            // Apply theme immediately
            applyTheme(newThemeMode);
            
        } catch (error) {
            console.error('Failed to toggle theme:', error);
        }
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
            if (video.minutes && video.minutes.trim()) {
                videoMeta.textContent = chrome.i18n.getMessage('duration', [video.minutes]);
            } else {
                videoMeta.textContent = chrome.i18n.getMessage('durationUnknown');
            }
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
            // Open video with user's preferred settings
            openVideoWithSettings(video.videoId, video.title);
            e.preventDefault();
            window.close();
        });

        return listItem;
    }
});

function getVideoData() {
    const videos = [];
    
    // Helper function to extract duration from a renderer element
    function extractDuration(renderer) {
        let duration = '';
        
        // Strategy 1: New YouTube badge-shape structure (primary target)
        const durationBadge = renderer.querySelector('.badge-shape div.yt-badge-shape__text');
        if (durationBadge) {
            duration = durationBadge.textContent.trim();
        }
        
        // Strategy 2: Alternative badge selectors with more specific paths
        if (!duration) {
            const alternativeBadge = renderer.querySelector('div.yt-badge-shape__text, .ytd-badge-supported-renderer .yt-badge-shape__text, .badge-shape__text');
            if (alternativeBadge) {
                duration = alternativeBadge.textContent.trim();
            }
        }
        
        // Strategy 3: Thumbnail overlay time status (common fallback)
        if (!duration) {
            const overlayDuration = renderer.querySelector('span.ytd-thumbnail-overlay-time-status-renderer, .ytd-thumbnail-overlay-time-status-renderer span, .ytd-thumbnail-overlay-time-status-renderer__text');
            if (overlayDuration) {
                duration = overlayDuration.textContent.trim();
            }
        }
        
        // Strategy 4: More generic time/duration indicators
        if (!duration) {
            const genericTimeBadge = renderer.querySelector('[aria-label*="minutes"], [aria-label*="seconds"], [title*="duration"], .ytd-thumbnail-overlay-time-status-renderer[aria-label]');
            if (genericTimeBadge) {
                duration = genericTimeBadge.textContent.trim() || 
                          genericTimeBadge.getAttribute('aria-label') || 
                          genericTimeBadge.getAttribute('title');
            }
        }
        
        // Strategy 5: Look for any time-like patterns in badges
        if (!duration) {
            const timePatternElement = renderer.querySelector('[class*="time"], [class*="duration"], [class*="badge"]');
            if (timePatternElement) {
                const text = timePatternElement.textContent.trim();
                // Check if it looks like a time format (e.g., "10:30", "1:23:45")
                if (text.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
                    duration = text;
                }
            }
        }
        
        return duration;
    }

    // Helper function to extract video title with fallbacks
    function extractTitle(renderer) {
        // Try multiple title selectors
        const titleSelectors = [
            'h3.yt-lockup-metadata-view-model__heading-reset',
            '#video-title',
            '.ytd-rich-grid-media #video-title',
            'a#video-title',
            '.ytd-video-meta-block h3',
            'h3 a[title]'
        ];
        
        for (const selector of titleSelectors) {
            const titleElement = renderer.querySelector(selector);
            if (titleElement) {
                return titleElement.textContent.trim() || titleElement.getAttribute('title') || '';
            }
        }
        
        return 'Untitled Video';
    }

    // Process different types of video renderers on YouTube
    const rendererSelectors = [
        'ytd-rich-item-renderer',           // Home page grid
        'ytd-video-renderer',               // Search results, sidebar
        'ytd-grid-video-renderer',          // Channel videos grid
        'ytd-compact-video-renderer',       // Sidebar recommendations
        'ytd-movie-renderer'                // Movie/premium content
    ];

    rendererSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(renderer => {
            renderer.querySelectorAll('a[href*="watch?v="]').forEach(anchor => {
                try {
                    const videoUrl = new URL(anchor.href, location.origin);
                    const videoId = videoUrl.searchParams.get('v');
                    
                    if (videoId && !videos.some(v => v.videoId === videoId)) {
                        const title = extractTitle(renderer);
                        const minutes = extractDuration(renderer);
                        
                        videos.push({
                            videoId,
                            title,
                            minutes: minutes || '', // Ensure minutes is always a string
                            url: anchor.href
                        });
                        
                        // Debug logging for duration extraction
                        if (console && console.log) {
                            console.log(`Video found: ${title}, Duration: ${minutes || 'Not found'}, ID: ${videoId}`);
                        }
                    }
                } catch (error) {
                    console.warn('Error processing video link:', error);
                }
            });
        });
    });

    return videos;
}

// Listen for settings changes (including theme changes)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.extensionSettings) {
        const newSettings = changes.extensionSettings.newValue;
        if (newSettings && newSettings.themeMode) {
            // Apply theme function needs to be accessible globally
            applyThemeGlobally(newSettings.themeMode);
        }
    }
});

// Global theme application function
function applyThemeGlobally(themeMode) {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');
    
    if (themeMode === 'auto') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
        // Use explicit theme
        body.classList.add(`${themeMode}-theme`);
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addListener(async (e) => {
    try {
        const result = await chrome.storage.local.get('extensionSettings');
        const settings = result.extensionSettings || {};
        if (settings.themeMode === 'auto') {
            applyThemeGlobally('auto');
        }
    } catch (error) {
        console.error('Failed to handle system theme change:', error);
    }
});

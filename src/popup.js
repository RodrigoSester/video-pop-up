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

    // Store videos arrays for reactive filtering
    let currentVideos = [];
    let historyVideos = [];

    // Initialize tabs
    initializeTabs();
    
    // Initialize buttons
    initializeButtons();
    
    // Load current page videos
    loadCurrentPageVideos();
    
    // Load video history
    loadVideoHistory();

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
        
        // Update AI Assistant button tooltip
        const aiAssistantBtn = document.getElementById('aiAssistantBtn');
        if (aiAssistantBtn) {
            aiAssistantBtn.title = chrome.i18n.getMessage('aiAssistantTitle') || 'AI Assistant';
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

        // Update search input placeholders
        const currentSearchInput = document.getElementById('current-search');
        const historySearchInput = document.getElementById('history-search');
        if (currentSearchInput) {
            currentSearchInput.placeholder = chrome.i18n.getMessage('searchPlaceholder') || 'Search videos...';
        }
        if (historySearchInput) {
            historySearchInput.placeholder = chrome.i18n.getMessage('searchPlaceholder') || 'Search videos...';
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

        // AI Assistant button
        const aiAssistantBtn = document.getElementById('aiAssistantBtn');
        if (aiAssistantBtn) {
            aiAssistantBtn.addEventListener('click', openSidePanel);
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
            initializeThemeSwitch();
        }

                // Search filters
        const currentSearchInput = document.getElementById('current-search');
        const historySearchInput = document.getElementById('history-search');
        
        if (currentSearchInput) {
            currentSearchInput.addEventListener('input', (e) => {
                filterCurrentVideos(e.target.value);
            });
        }
        
        if (historySearchInput) {
            historySearchInput.addEventListener('input', (e) => {
                filterHistoryVideos(e.target.value);
            });
        }
    }

    function filterCurrentVideos(query) {
        const searchLower = query.toLowerCase().trim();
        
        if (searchLower === '') {
            renderCurrentVideos(currentVideos);
            message.textContent = currentVideos.length > 0 
                ? chrome.i18n.getMessage('clickToOpenPopup') 
                : chrome.i18n.getMessage('noVideosOnPage');
            return;
        }

        showLoadingState('current');

        setTimeout(() => {
            const filteredVideos = currentVideos.filter(video => {
                const title = video.title.toLowerCase();
                const channel = (video.channel || '').toLowerCase();
                
                return title.includes(searchLower) || channel.includes(searchLower);
            });
            
            renderCurrentVideos(filteredVideos);
            
            if (filteredVideos.length === 0) {
                message.textContent = chrome.i18n.getMessage('noSearchResults') || 'No videos match your search.';
            } else {
                message.textContent = chrome.i18n.getMessage('clickToOpenPopup');
            }
            
            hideLoadingState('current');
        }, 500);
    }

    // Filter history videos with loading state
    function filterHistoryVideos(query) {
        const searchLower = query.toLowerCase().trim();
        
        if (searchLower === '') {
            // Show all videos
            renderHistoryVideos(historyVideos);
            historyMessage.textContent = historyVideos.length > 0
                ? chrome.i18n.getMessage('historyCount', [historyVideos.length.toString()])
                : chrome.i18n.getMessage('noHistoryYet');
            return;
        }

        // Show loading state
        showLoadingState('history');
        
        // Use setTimeout to allow UI to update with loading state
        setTimeout(() => {
            const filteredVideos = historyVideos.filter(video => {
                const title = video.title.toLowerCase();
                const channel = (video.channel || '').toLowerCase();
                
                return title.includes(searchLower) || channel.includes(searchLower);
            });
            
            renderHistoryVideos(filteredVideos);
            
            if (filteredVideos.length === 0) {
                historyMessage.textContent = chrome.i18n.getMessage('noSearchResults') || 'No videos match your search.';
            } else {
                historyMessage.textContent = chrome.i18n.getMessage('historyCount', [filteredVideos.length.toString()]);
            }
            
            hideLoadingState('history');
        }, 500);
    }

    // Show loading state
    function showLoadingState(type) {
        const loadingId = type === 'current' ? 'current-loading' : 'history-loading';
        const listId = type === 'current' ? 'video-list' : 'history-list';
        
        let loadingEl = document.getElementById(loadingId);
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = loadingId;
            loadingEl.className = 'loading-state';
            const loadingText = chrome.i18n.getMessage('searching') || 'Searching...';
            loadingEl.innerHTML = `<span class="loading-spinner"></span><span class="loading-text">${loadingText}</span>`;
            
            const list = document.getElementById(listId);
            list.parentNode.insertBefore(loadingEl, list);
        }
        loadingEl.style.display = 'flex';
    }

    // Hide loading state
    function hideLoadingState(type) {
        const loadingId = type === 'current' ? 'current-loading' : 'history-loading';
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    // Render current videos
    function renderCurrentVideos(videos) {
        videoList.innerHTML = '';
        videos.forEach(video => {
            const listItem = createVideoListItem(video, 'current');
            videoList.appendChild(listItem);
        });
    }

    // Render history videos
    function renderHistoryVideos(videos) {
        historyList.innerHTML = '';
        videos.forEach(video => {
            const listItem = createVideoListItem(video, 'history');
            historyList.appendChild(listItem);
        });
    }

    // Open options page
    function openOptionsPage() {
        chrome.runtime.openOptionsPage();
        window.close(); // Close the popup
    }

    // Open side panel (AI Assistant)
    function openSidePanel() {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
            .then(() => {
                window.close(); // Close the popup
            })
            .catch(error => {
                console.error('Failed to open side panel:', error);
                // Fallback: try opening via chrome.sidePanel.setOptions
                chrome.sidePanel.setOptions({ 
                    enabled: true 
                }).then(() => {
                    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
                    window.close();
                }).catch(err => {
                    console.error('Failed to open side panel (fallback):', err);
                });
            });
    }

    // Handle clear history from popup
    async function handleClearHistoryPopup() {
        const confirmMessage = chrome.i18n.getMessage('confirmClearHistory') || 
            'Are you sure you want to clear all video history? This cannot be undone.';
        
        if (confirm(confirmMessage)) {
            try {
                await chrome.storage.local.set({ videoHistory: [] });
                // Clear the array
                historyVideos = [];
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
            // Store videos in array for reactive filtering
            currentVideos = videos;
            renderCurrentVideos(videos);
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
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyMessage.textContent = chrome.i18n.getMessage('noHistoryYet');
        } else {
            historyMessage.textContent = chrome.i18n.getMessage('historyCount', [history.length.toString()]);
            // Store videos in array for reactive filtering
            historyVideos = history;
            renderHistoryVideos(history);
        }
    }

    function createVideoListItem(video, type) {
        const listItem = document.createElement('li');
        listItem.className = 'video-item';
        listItem.dataset.videoId = video.videoId;
        listItem.dataset.title = video.title.toLowerCase();
        listItem.dataset.channel = video.channel?.toLowerCase();
        listItem.dataset.duration = video.minutes?.toLowerCase();

        const thumbnail = document.createElement('img');
        thumbnail.className = 'video-thumbnail';
        thumbnail.src = video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/default.jpg`;
        thumbnail.alt = video.title;
        thumbnail.onerror = function() {
            this.src = `https://i.ytimg.com/vi/${video.videoId}/default.jpg`;
        };
        listItem.appendChild(thumbnail);
        
        const videoContent = document.createElement('div');
        videoContent.className = 'video-content';
        
        const videoTitle = document.createElement('div');
        videoTitle.className = 'video-title';
        videoTitle.textContent = video.title;
        
        const videoMeta = document.createElement('div');
        videoMeta.className = 'video-meta';
        
        const metaParts = [];
        
        if (video.channel && video.channel !== 'Unknown Channel') {
            metaParts.push(video.channel);
        }
        
        if (type === 'current') {
            if (video.minutes && video.minutes.trim()) {
                metaParts.push(video.minutes);
            }
        } else {
            const date = new Date(video.timestamp || video.dateAdded);
            const locale = chrome.i18n.getUILanguage();
            let dateOptions = { month: '2-digit', day: '2-digit' };
            let timeOptions;
            
            if (locale.startsWith('pt') || locale.startsWith('es')) {
                timeOptions = { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
            } else {
                timeOptions = { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' };
            }
            
            const dateString = `${date.toLocaleDateString(locale, dateOptions)} ${date.toLocaleTimeString(locale, timeOptions)}`;
            metaParts.push(chrome.i18n.getMessage('opened', [dateString]));
        }
        
        videoMeta.textContent = metaParts.join(' • ');
        
        videoContent.appendChild(videoTitle);
        videoContent.appendChild(videoMeta);
        listItem.appendChild(videoContent);

        if (type === 'history') {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.title = chrome.i18n.getMessage('deleteFromHistory');
            deleteButton.innerHTML = '🗑️';
            
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();

                chrome.runtime.sendMessage({ 
                    action: 'deleteVideoFromHistory', 
                    videoId: video.videoId
                });
                
                listItem.remove();
                
                const remainingItems = historyList.querySelectorAll('.video-item').length;
                if (remainingItems === 0) {
                    historyMessage.textContent = chrome.i18n.getMessage('noHistoryYet');
                } else {
                    historyMessage.textContent = chrome.i18n.getMessage('historyCount', [remainingItems.toString()]);
                }
            });
            
            listItem.appendChild(deleteButton);
        }

        listItem.addEventListener('click', (e) => {
            chrome.runtime.sendMessage({ 
                action: 'addVideoToHistory', 
                videoId: video.videoId,
                title: video.title,
                channel: video.channel,
                thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/default.jpg`
            });
            
            chrome.runtime.sendMessage({ action: 'openPopup', videoId: video.videoId });
            e.preventDefault();
            window.close();
        });

        return listItem;
    }
});

function getVideoData() {
    const videos = [];
    
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

    function extractThumbnail(renderer) {
        const imgElement = renderer.querySelector('ytd-thumbnail img');
        if (imgElement && imgElement.src) {
            return imgElement.src;
        }
        
        return '';
    }

    function extractChannel(renderer) {
        const channelElement = renderer.querySelector("#content > yt-lockup-view-model > div > div > yt-lockup-metadata-view-model > div.yt-lockup-metadata-view-model__text-container > div > yt-content-metadata-view-model > div > span > span > a");
        if (channelElement) {
            return channelElement.textContent.trim();
        }
        
        return 'Unknown Channel';
    }

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
                        const thumbnail = extractThumbnail(renderer);
                        const channel = extractChannel(renderer);
                        
                        videos.push({
                            videoId,
                            title,
                            minutes: minutes || '',
                            thumbnail: thumbnail || '',
                            channel: channel || '',
                            url: anchor.href
                        });
                    }
                } catch (error) {
                    console.warn('Error processing video link:', error);
                }
            });
        });
    });

    return videos;
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.extensionSettings) {
        const newSettings = changes.extensionSettings.newValue;
        if (newSettings && newSettings.themeMode) {
            applyThemeGlobally(newSettings.themeMode);
        }
    }
});

function applyThemeGlobally(themeMode) {
    const body = document.body;
    
    body.classList.remove('light-theme', 'dark-theme');
    
    if (themeMode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
        body.classList.add(`${themeMode}-theme`);
    }
}

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

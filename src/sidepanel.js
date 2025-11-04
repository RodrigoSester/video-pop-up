// Import Google Generative AI SDK
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuration
const AI_CONFIG = {
    temperature: 0.7,
    model: 'gemini-pro'
};

// State Management
let genAI = null;
let model = null;
let chat = null;
let apiKey = null;
let chatHistory = [];

// Video state
let currentVideos = [];
let historyVideos = [];

/**
 * Initialize the side panel
 */
async function initializeSidePanel() {
    try {
        // Initialize internationalization and theme
        initializeI18n();
        initializeTheme();
        
        // Initialize tabs
        initializeTabs();
        
        // Load API key from storage
        const settings = await chrome.storage.local.get('extensionSettings');
        apiKey = settings.extensionSettings?.geminiApiKey;

        // Check API key and show appropriate UI for AI chat
        if (!apiKey || apiKey.trim() === '') {
            showNoApiKeyState();
        } else {
            initializeAI();
            showChatState();
        }

        // Load videos for current page and history
        loadCurrentPageVideos();
        loadVideoHistory();

        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize side panel:', error);
        showError('Failed to initialize. Please refresh the page.');
    }
}

/**
 * Initialize internationalization for the side panel
 */
function initializeI18n() {
    // Set page title
    document.title = chrome.i18n.getMessage('aiAssistantTitle');
    
    // Translate all text elements
    const translations = {
        'headerTitle': 'aiAssistantTitle',
        'noApiKeyTitle': 'aiAssistantTitle',
        'noApiKeyDescription': 'noApiKeyMessage',
        'goToSettingsBtnText': 'goToSettings',
        'welcomeMessageText': 'aiWelcomeMessage',
        'loadingText': 'thinkingMessage',
        'clearChatBtnText': 'clearChatButton',
        'sendBtnText': 'sendButton',
        'message': 'clickVideoMessage',
        'history-message': 'historyMessage',
        'clearHistoryText': 'clearHistoryText'
    };

    Object.entries(translations).forEach(([elementId, messageKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = chrome.i18n.getMessage(messageKey);
        }
    });

    // Set tab labels
    document.getElementById('current-tab').textContent = chrome.i18n.getMessage('currentPageTab');
    document.getElementById('history-tab').textContent = chrome.i18n.getMessage('historyTab');
    document.getElementById('ai-chat-tab').textContent = chrome.i18n.getMessage('aiAssistantTitle');

    // Set placeholders and titles
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.placeholder = chrome.i18n.getMessage('promptPlaceholder');
    }

    const currentSearchInput = document.getElementById('current-search');
    if (currentSearchInput) {
        currentSearchInput.placeholder = chrome.i18n.getMessage('searchCurrentVideos');
    }

    const historySearchInput = document.getElementById('history-search');
    if (historySearchInput) {
        historySearchInput.placeholder = chrome.i18n.getMessage('searchHistoryVideos');
    }

    const settingsBtn = document.getElementById('openSettingsBtn');
    if (settingsBtn) {
        settingsBtn.title = chrome.i18n.getMessage('settingsButton');
    }

    const clearBtn = document.getElementById('clearChatBtn');
    if (clearBtn) {
        clearBtn.title = chrome.i18n.getMessage('clearChatButton');
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.title = chrome.i18n.getMessage('clearHistoryHelp');
    }
}

/**
 * Initialize theme
 */
async function initializeTheme() {
    try {
        const result = await chrome.storage.local.get('extensionSettings');
        const settings = result.extensionSettings || {};
        const themeMode = settings.themeMode || 'auto';
        applyTheme(themeMode);
    } catch (error) {
        console.error('Failed to load theme settings:', error);
        applyTheme('auto');
    }
}

/**
 * Apply theme
 */
function applyTheme(themeMode) {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme');
    
    if (themeMode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
        body.classList.add(`${themeMode}-theme`);
    }
}

/**
 * Initialize tabs
 */
function initializeTabs() {
    const currentTab = document.getElementById('current-tab');
    const historyTab = document.getElementById('history-tab');
    const aiChatTab = document.getElementById('ai-chat-tab');

    currentTab.addEventListener('click', () => switchTab('current'));
    historyTab.addEventListener('click', () => switchTab('history'));
    aiChatTab.addEventListener('click', () => switchTab('ai-chat'));
}

/**
 * Switch between tabs
 */
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activate selected tab
    document.getElementById(`${tab}-tab`).classList.add('active');
    document.getElementById(`${tab}-section`).classList.add('active');
}

/**
 * Load current page videos
 */
function loadCurrentPageVideos() {
    chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
        if (tabs[0] && (tabs[0].url.includes('youtube.com') || tabs[0].url.includes('youtu.be'))) {
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                func: getVideoData
            }).then(results => {
                if (results && results[0] && results[0].result) {
                    currentVideos = results[0].result;
                    displayCurrentVideos(currentVideos);
                } else {
                    displayCurrentVideos([]);
                }
            }).catch(error => {
                console.error('Error loading current page videos:', error);
                displayCurrentVideos([]);
            });
        } else {
            displayCurrentVideos([]);
        }
    }).catch(error => {
        console.error('Error querying tabs:', error);
        displayCurrentVideos([]);
    });
}

/**
 * Load video history
 */
function loadVideoHistory() {
    chrome.runtime.sendMessage({action: 'getVideoHistory'}).then(response => {
        historyVideos = response || [];
        displayVideoHistory(historyVideos);
    }).catch(error => {
        console.error('Error loading video history:', error);
        displayVideoHistory([]);
    });
}

/**
 * Display current videos
 */
function displayCurrentVideos(videos) {
    const videoList = document.getElementById('video-list');
    const message = document.getElementById('message');
    
    videoList.innerHTML = '';
    
    if (videos.length === 0) {
        message.textContent = chrome.i18n.getMessage('noVideosOnPage');
    } else {
        message.textContent = chrome.i18n.getMessage('clickToOpenPopup');
        videos.forEach(video => {
            const listItem = createVideoListItem(video, 'current');
            videoList.appendChild(listItem);
        });
    }
}

/**
 * Display video history
 */
function displayVideoHistory(history) {
    const historyList = document.getElementById('history-list');
    const historyMessage = document.getElementById('history-message');
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyMessage.textContent = chrome.i18n.getMessage('noHistoryYet');
    } else {
        historyMessage.textContent = chrome.i18n.getMessage('historyMessage');
        history.forEach(video => {
            const listItem = createVideoListItem(video, 'history');
            historyList.appendChild(listItem);
        });
    }
}

/**
 * Create video list item
 */
function createVideoListItem(video, type) {
    const listItem = document.createElement('li');
    listItem.className = 'video-item';
    
    const thumbnail = document.createElement('img');
    thumbnail.className = 'video-thumbnail';
    thumbnail.src = video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/default.jpg`;
    thumbnail.alt = 'Video thumbnail';
    
    const videoContent = document.createElement('div');
    videoContent.className = 'video-content';
    
    const title = document.createElement('div');
    title.className = 'video-title';
    title.textContent = video.title;
    
    const meta = document.createElement('div');
    meta.className = 'video-meta';
    meta.textContent = video.channel || 'Unknown Channel';
    
    videoContent.appendChild(title);
    videoContent.appendChild(meta);
    
    videoContent.addEventListener('click', () => {
        if (type === 'current') {
            chrome.runtime.sendMessage({
                action: 'addVideoToHistory',
                videoId: video.videoId
            });
        }
        chrome.runtime.sendMessage({
            action: 'openPopup',
            videoId: video.videoId
        });
    });
    
    listItem.appendChild(thumbnail);
    listItem.appendChild(videoContent);
    
    if (type === 'history') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete from history';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({
                action: 'deleteVideoFromHistory',
                videoId: video.videoId
            });
            listItem.remove();
        });
        listItem.appendChild(deleteBtn);
    }
    
    return listItem;
}

/**
 * Initialize AI Model
 */
function initializeAI() {
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ 
            model: AI_CONFIG.model,
            generationConfig: {
                temperature: AI_CONFIG.temperature
            }
        });
        chat = model.startChat({
            history: chatHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }))
        });
        console.log('AI initialized successfully');
    } catch (error) {
        console.error('Failed to initialize AI:', error);
        showError(chrome.i18n.getMessage('aiErrorMessage'));
    }
}

/**
 * Send Message to AI
 */
async function sendMessage(prompt) {
    if (!prompt || prompt.trim() === '') return;

    const trimmedPrompt = prompt.trim();
    
    showLoading(true);
    addMessage('user', trimmedPrompt);
    clearInput();

    try {
        const result = await chat.sendMessage(trimmedPrompt);
        const response = await result.response;
        const text = response.text();
        
        addMessage('ai', text);
        
        // Save to history
        chatHistory.push({ role: 'user', text: trimmedPrompt });
        chatHistory.push({ role: 'model', text: text });
    } catch (error) {
        console.error('AI Error:', error);
        const errorMessage = chrome.i18n.getMessage('aiErrorMessage');
        addMessage('error', errorMessage);
    } finally {
        showLoading(false);
    }
}

/**
 * Add message to chat
 */
function addMessage(sender, text) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="user-avatar">👤</div>
                <span class="message-label">${chrome.i18n.getMessage('youLabel')}</span>
            </div>
            <div class="message-content">
                <p>${escapeHtml(text)}</p>
            </div>
        `;
    } else if (sender === 'ai') {
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="ai-avatar">🤖</div>
                <span class="message-label">${chrome.i18n.getMessage('aiLabel')}</span>
            </div>
            <div class="message-content">
                ${formatAIResponse(text)}
            </div>
        `;
    } else if (sender === 'error') {
        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="error-icon">⚠️</div>
                <span class="message-label">Error</span>
            </div>
            <div class="message-content error-content">
                <p>${escapeHtml(text)}</p>
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

/**
 * Format AI response (basic markdown support)
 */
function formatAIResponse(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);
    
    // Convert code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Convert inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return `<div>${formatted}</div>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (show) {
        loadingIndicator.classList.remove('hidden');
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('promptInput').disabled = true;
    } else {
        loadingIndicator.classList.add('hidden');
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('promptInput').disabled = false;
        document.getElementById('promptInput').focus();
    }
}

/**
 * Show no API key state
 */
function showNoApiKeyState() {
    document.getElementById('noApiKeyState').classList.remove('hidden');
    document.getElementById('chatState').classList.add('hidden');
}

/**
 * Show chat state
 */
function showChatState() {
    document.getElementById('noApiKeyState').classList.add('hidden');
    document.getElementById('chatState').classList.remove('hidden');
    document.getElementById('promptInput').focus();
}

/**
 * Show error message
 */
function showError(message) {
    addMessage('error', message);
}

/**
 * Clear input field
 */
function clearInput() {
    document.getElementById('promptInput').value = '';
    autoResize();
}

/**
 * Clear chat history
 */
function clearChat() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = `
        <div class="welcome-message">
            <div class="ai-avatar">🤖</div>
            <div class="message-content">
                <p>${chrome.i18n.getMessage('aiWelcomeMessage')}</p>
            </div>
        </div>
    `;
    
    chatHistory = [];
    
    // Reinitialize chat
    if (model) {
        chat = model.startChat({ history: [] });
    }
}

/**
 * Scroll to bottom of messages
 */
function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Auto-resize textarea
 */
function autoResize() {
    const textarea = document.getElementById('promptInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const promptInput = document.getElementById('promptInput');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const goToSettingsBtn = document.getElementById('goToSettingsBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const currentSearchInput = document.getElementById('current-search');
    const historySearchInput = document.getElementById('history-search');

    // AI Chat event listeners
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const prompt = promptInput.value;
            sendMessage(prompt);
        });
    }

    if (promptInput) {
        // Enter key to send (Shift+Enter for new line)
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(promptInput.value);
            }
        });

        // Auto-resize textarea
        promptInput.addEventListener('input', autoResize);
    }

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (confirm('Clear all chat messages?')) {
                clearChat();
            }
        });
    }

    // Settings buttons
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    if (goToSettingsBtn) {
        goToSettingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Clear history button
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            const confirmMessage = chrome.i18n.getMessage('confirmClearHistory') || 
                'Are you sure you want to clear all video history? This cannot be undone.';
            
            if (confirm(confirmMessage)) {
                chrome.storage.local.set({ videoHistory: [] });
                displayVideoHistory([]);
            }
        });
    }

    // Search filters
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

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            if (changes.extensionSettings) {
                const newSettings = changes.extensionSettings.newValue;
                const newApiKey = newSettings?.geminiApiKey;
                
                if (newApiKey !== apiKey) {
                    apiKey = newApiKey;
                    if (apiKey && apiKey.trim() !== '') {
                        initializeAI();
                        showChatState();
                    } else {
                        showNoApiKeyState();
                    }
                }

                // Update theme
                const themeMode = newSettings?.themeMode || 'auto';
                applyTheme(themeMode);
            }

            if (changes.videoHistory) {
                historyVideos = changes.videoHistory.newValue || [];
                displayVideoHistory(historyVideos);
            }
        }
    });
}

/**
 * Filter current videos
 */
function filterCurrentVideos(query) {
    const searchLower = query.toLowerCase().trim();
    
    if (searchLower === '') {
        displayCurrentVideos(currentVideos);
        return;
    }

    const filteredVideos = currentVideos.filter(video =>
        video.title.toLowerCase().includes(searchLower) ||
        (video.channel && video.channel.toLowerCase().includes(searchLower))
    );
    
    displayCurrentVideos(filteredVideos);
}

/**
 * Filter history videos
 */
function filterHistoryVideos(query) {
    const searchLower = query.toLowerCase().trim();
    
    if (searchLower === '') {
        displayVideoHistory(historyVideos);
        return;
    }

    const filteredVideos = historyVideos.filter(video =>
        video.title.toLowerCase().includes(searchLower) ||
        (video.channel && video.channel.toLowerCase().includes(searchLower))
    );
    
    displayVideoHistory(filteredVideos);
}

/**
 * Get video data from current page (executed in content script context)
 */
function getVideoData() {
    const videos = [];
    
    function extractDuration(renderer) {
        try {
            const durationElement = renderer.querySelector('ytd-thumbnail-overlay-time-status-renderer span');
            if (durationElement && durationElement.textContent) {
                return durationElement.textContent.trim();
            }
            
            const overlayElement = renderer.querySelector('.ytd-thumbnail-overlay-time-status-renderer');
            if (overlayElement && overlayElement.textContent) {
                return overlayElement.textContent.trim();
            }
            
            const timeElement = renderer.querySelector('[class*="time"], [class*="duration"]');
            if (timeElement && timeElement.textContent) {
                return timeElement.textContent.trim();
            }
        } catch (error) {
            console.warn('Error extracting duration:', error);
        }
        
        return null;
    }

    function extractTitle(renderer) {
        try {
            const titleSelectors = [
                'h3 a[id="video-title"]',
                'h3 a',
                '[id="video-title"]',
                '.ytd-video-meta-block h3 a',
                'a[aria-label][title]'
            ];
            
            for (const selector of titleSelectors) {
                const titleElement = renderer.querySelector(selector);
                if (titleElement) {
                    return titleElement.getAttribute('title') || titleElement.textContent || titleElement.getAttribute('aria-label') || '';
                }
            }
        } catch (error) {
            console.warn('Error extracting title:', error);
        }
        return 'Unknown Title';
    }

    function extractThumbnail(renderer) {
        try {
            const thumbnailElement = renderer.querySelector('img[src*="i.ytimg.com"], img[src*="ggpht.com"]');
            if (thumbnailElement) {
                return thumbnailElement.src;
            }
        } catch (error) {
            console.warn('Error extracting thumbnail:', error);
        }
        return null;
    }

    function extractChannel(renderer) {
        try {
            const channelElement = renderer.querySelector('[class*="channel"] a, ytd-channel-name a');
            if (channelElement && channelElement.textContent) {
                return channelElement.textContent.trim();
            }
        } catch (error) {
            console.warn('Error extracting channel:', error);
        }
        return 'Unknown Channel';
    }

    const rendererSelectors = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-movie-renderer'
    ];

    rendererSelectors.forEach(selector => {
        const renderers = document.querySelectorAll(selector);
        
        renderers.forEach(renderer => {
            try {
                const linkElement = renderer.querySelector('a[href*="/watch?v="]');
                if (linkElement && linkElement.href) {
                    const url = new URL(linkElement.href);
                    const videoId = url.searchParams.get('v');
                    
                    if (videoId) {
                        const video = {
                            videoId: videoId,
                            title: extractTitle(renderer),
                            url: linkElement.href,
                            thumbnail: extractThumbnail(renderer),
                            channel: extractChannel(renderer),
                            duration: extractDuration(renderer)
                        };
                        
                        if (!videos.find(v => v.videoId === videoId)) {
                            videos.push(video);
                        }
                    }
                }
            } catch (error) {
                console.warn('Error processing video renderer:', error);
            }
        });
    });

    return videos;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSidePanel);

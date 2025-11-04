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

/**
 * Initialize the side panel
 */
async function initializeSidePanel() {
    try {
        // Initialize internationalization
        initializeI18n();
        
        // Load API key from storage
        const settings = await chrome.storage.local.get('extensionSettings');
        apiKey = settings.extensionSettings?.geminiApiKey;

        // Check API key and show appropriate UI
        if (!apiKey || apiKey.trim() === '') {
            showNoApiKeyState();
        } else {
            initializeAI();
            showChatState();
        }

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
        'sendBtnText': 'sendButton'
    };

    Object.entries(translations).forEach(([elementId, messageKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = chrome.i18n.getMessage(messageKey);
        }
    });

    // Set placeholders and titles
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.placeholder = chrome.i18n.getMessage('promptPlaceholder');
    }

    const settingsBtn = document.getElementById('openSettingsBtn');
    if (settingsBtn) {
        settingsBtn.title = chrome.i18n.getMessage('settingsButton');
    }

    const clearBtn = document.getElementById('clearChatBtn');
    if (clearBtn) {
        clearBtn.title = chrome.i18n.getMessage('clearChatButton');
    }
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

    // Send button click
    sendBtn.addEventListener('click', () => {
        const prompt = promptInput.value;
        sendMessage(prompt);
    });

    // Enter key to send (Shift+Enter for new line)
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const prompt = promptInput.value;
            sendMessage(prompt);
        }
    });

    // Auto-resize textarea
    promptInput.addEventListener('input', autoResize);

    // Clear chat button
    clearChatBtn.addEventListener('click', () => {
        if (confirm('Clear all chat messages?')) {
            clearChat();
        }
    });

    // Open settings button
    openSettingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Go to settings button (from no API key state)
    goToSettingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.extensionSettings) {
            const newApiKey = changes.extensionSettings.newValue?.geminiApiKey;
            if (newApiKey && newApiKey !== apiKey) {
                apiKey = newApiKey;
                initializeAI();
                showChatState();
            } else if (!newApiKey && apiKey) {
                apiKey = null;
                showNoApiKeyState();
            }
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSidePanel);

// Default configuration settings
const DEFAULT_SETTINGS = {
    // Window settings
    windowWidth: 854,
    windowHeight: 480,
    // History settings
    historyLimit: 50,
    historyDuration: 30, // days, 0 = forever
    
    // Theme settings
    themeMode: 'auto', // 'auto', 'light', 'dark'
    
    // Advanced settings
    autoFocus: true,
    rememberWindowState: true
};

let currentSettings = { ...DEFAULT_SETTINGS };

/**
 * Initialize the options page
 */
function initializeOptions() {
    // Initialize internationalization
    initializeI18n();
    
    // Load saved settings
    loadSettings().then(() => {
        // Populate form with current settings
        populateForm();
        
        // Set up event listeners
        setupEventListeners();
        
        // Apply theme
        applyTheme();
    }).catch(error => {
        console.error('Failed to initialize options:', error);
        showStatus('errorLoadingSettings', 'error');
    });
}

/**
 * Initialize internationalization for the options page
 */
function initializeI18n() {
    // Get all elements with IDs that correspond to translation keys
    const elementsToTranslate = [
        'optionsTitle',
        'optionsPageTitle', 
        'themeToggleLabel',
        'windowSettingsTitle',
        'windowWidthLabel',
        'windowWidthHelp',
        'windowHeightLabel', 
        'windowHeightHelp',

        'historySettingsTitle',
        'historyLimitLabel',
        'historyLimitHelp',
        'historyDurationLabel',
        'duration7Days',
        'duration30Days',
        'duration90Days',
        'duration180Days', 
        'duration365Days',
        'durationForever',
        'historyDurationHelp',
        'clearHistoryText',
        'clearHistoryHelp',
        'themeSettingsTitle',
        'themeModeLabel',
        'themeAuto',
        'themeLight',
        'themeDark',
        'themeModeHelp',
        'advancedSettingsTitle',
        'autoFocusLabel',
        'autoFocusHelp',
        'rememberWindowStateLabel',
        'rememberWindowStateHelp',
        'saveText',
        'resetText'
    ];

    elementsToTranslate.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const message = chrome.i18n.getMessage(id);
            if (message) {
                if (element.tagName === 'INPUT' && element.type === 'button') {
                    element.value = message;
                } else if (element.tagName === 'OPTION') {
                    element.textContent = message;
                } else {
                    element.textContent = message;
                }
            }
        }
    });
}

/**
 * Load settings from chrome storage
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get('extensionSettings');
        if (result.extensionSettings) {
            currentSettings = { ...DEFAULT_SETTINGS, ...result.extensionSettings };
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        throw error;
    }
}

/**
 * Save settings to chrome storage
 */
async function saveSettings() {
    try {
        await chrome.storage.local.set({ extensionSettings: currentSettings });
        console.log('Settings saved successfully:', currentSettings);
    } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
    }
}

/**
 * Populate form with current settings
 */
function populateForm() {
    // Window settings
    document.getElementById('windowWidth').value = currentSettings.windowWidth;
    document.getElementById('windowHeight').value = currentSettings.windowHeight;
    
    // History settings
    document.getElementById('historyLimit').value = currentSettings.historyLimit;
    document.getElementById('historyDuration').value = currentSettings.historyDuration;
    
    // Theme settings
    document.getElementById('themeMode').value = currentSettings.themeMode;
    const themeSwitchElement = document.getElementById('themeSwitch');
    if (themeSwitchElement) {
        themeSwitchElement.checked = currentSettings.themeMode === 'dark';
    }
    
    // Advanced settings
    document.getElementById('autoFocus').checked = currentSettings.autoFocus;
    document.getElementById('rememberWindowState').checked = currentSettings.rememberWindowState;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const form = document.getElementById('optionsForm');
    const resetBtn = document.getElementById('resetBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const themeSwitch = document.getElementById('themeSwitch');
    const themeModeSelect = document.getElementById('themeMode');
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Reset button
    resetBtn.addEventListener('click', handleReset);
    
    // Clear history button
    clearHistoryBtn.addEventListener('click', handleClearHistory);
    
    // Theme switch toggle
    if (themeSwitch) {
        themeSwitch.addEventListener('change', handleThemeSwitch);
    }
    
    // Theme mode select
    if (themeModeSelect) {
        themeModeSelect.addEventListener('change', handleThemeModeChange);
    }
    
    // Input validation
    setupInputValidation();
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Validate inputs
        if (!validateInputs()) {
            return;
        }
        
        // Update settings from form
        updateSettingsFromForm();
        
        // Save to storage
        await saveSettings();
        
        // Apply theme if changed
        applyTheme();
        
        // Show success message
        showStatus('settingsSaved', 'success');
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus('errorSavingSettings', 'error');
    }
}

/**
 * Update settings object from form values
 */
function updateSettingsFromForm() {
    // Window settings
    currentSettings.windowWidth = parseInt(document.getElementById('windowWidth').value);
    currentSettings.windowHeight = parseInt(document.getElementById('windowHeight').value);
    
    // History settings
    currentSettings.historyLimit = parseInt(document.getElementById('historyLimit').value);
    currentSettings.historyDuration = parseInt(document.getElementById('historyDuration').value);
    
    // Theme settings
    currentSettings.themeMode = document.getElementById('themeMode').value;
    
    // Advanced settings
    currentSettings.autoFocus = document.getElementById('autoFocus').checked;
    currentSettings.rememberWindowState = document.getElementById('rememberWindowState').checked;
}

/**
 * Validate form inputs
 */
function validateInputs() {
    const windowWidth = parseInt(document.getElementById('windowWidth').value);
    const windowHeight = parseInt(document.getElementById('windowHeight').value);
    const historyLimit = parseInt(document.getElementById('historyLimit').value);
    
    // Validate window dimensions
    if (windowWidth < 400 || windowWidth > 2000) {
        showStatus('invalidWindowWidth', 'error');
        return false;
    }
    
    if (windowHeight < 300 || windowHeight > 1500) {
        showStatus('invalidWindowHeight', 'error');
        return false;
    }
    
    // Validate history limit
    if (historyLimit < 10 || historyLimit > 200) {
        showStatus('invalidHistoryLimit', 'error');
        return false;
    }
    
    return true;
}

/**
 * Handle reset to defaults
 */
function handleReset() {
    if (confirm(chrome.i18n.getMessage('confirmReset'))) {
        currentSettings = { ...DEFAULT_SETTINGS };
        populateForm();
        applyTheme();
        showStatus('settingsReset', 'success');
    }
}

/**
 * Handle clear history
 */
async function handleClearHistory() {
    if (confirm(chrome.i18n.getMessage('confirmClearHistory'))) {
        try {
            await chrome.storage.local.set({ videoHistory: [] });
            showStatus('historyClearedSuccess', 'success');
        } catch (error) {
            console.error('Failed to clear history:', error);
            showStatus('errorClearingHistory', 'error');
        }
    }
}



/**
 * Handle theme switch toggle
 */
function handleThemeSwitch(event) {
    const themeMode = event.target.checked ? 'dark' : 'light';
    document.getElementById('themeMode').value = themeMode;
    currentSettings.themeMode = themeMode;
    applyTheme();
}

/**
 * Handle theme mode select change
 */
function handleThemeModeChange(event) {
    const themeMode = event.target.value;
    document.getElementById('themeSwitch').checked = themeMode === 'dark';
    currentSettings.themeMode = themeMode;
    applyTheme();
}

/**
 * Apply theme to the page
 */
function applyTheme() {
    const body = document.body;
    const themeMode = currentSettings.themeMode;
    
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

/**
 * Set up input validation
 */
function setupInputValidation() {
    // Add input event listeners for real-time validation
    const numberInputs = document.querySelectorAll('.number-input');
    
    numberInputs.forEach(input => {
        input.addEventListener('input', function() {
            const value = parseInt(this.value);
            const min = parseInt(this.min);
            const max = parseInt(this.max);
            
            if (value < min) {
                this.setCustomValidity(`Minimum value is ${min}`);
            } else if (value > max) {
                this.setCustomValidity(`Maximum value is ${max}`);
            } else {
                this.setCustomValidity('');
            }
        });
    });
}

/**
 * Show status message
 */
function showStatus(messageKey, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');
    
    // Get translated message
    const message = chrome.i18n.getMessage(messageKey) || messageKey;
    
    statusText.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

/**
 * Listen for system theme changes
 */
function setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addListener((e) => {
        if (currentSettings.themeMode === 'auto') {
            applyTheme();
        }
    });
}

/**
 * Get current settings (exported for use by other scripts)
 */
window.getCurrentSettings = function() {
    return currentSettings;
};

/**
 * Export settings (for backup/restore functionality)
 */
function exportSettings() {
    const dataStr = JSON.stringify(currentSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'youtube-popup-settings.json';
    link.click();
    
    URL.revokeObjectURL(url);
}

/**
 * Import settings (for backup/restore functionality)
 */
function importSettings(file) {
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const importedSettings = JSON.parse(e.target.result);
            
            // Validate imported settings
            const validatedSettings = { ...DEFAULT_SETTINGS, ...importedSettings };
            
            currentSettings = validatedSettings;
            populateForm();
            await saveSettings();
            applyTheme();
            
            showStatus('settingsImported', 'success');
        } catch (error) {
            console.error('Failed to import settings:', error);
            showStatus('errorImportingSettings', 'error');
        }
    };
    
    reader.readAsText(file);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeOptions();
    setupSystemThemeListener();
});
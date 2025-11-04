# YouTube Pop-up Player Extension - AI Coding Instructions

## Project Overview

This is a Chrome Manifest V3 extension that creates pop-up windows for YouTube videos with integrated Google Gemini AI assistant. The extension supports YouTube.com and YouTube Music with comprehensive internationalization (English, Spanish, Portuguese).

## Architecture Components

### Core Extension Structure
- **Service Worker**: `src/background.js` - Manages pop-up windows, video history, settings, and Chrome APIs
- **Content Scripts**: `src/content.js` (YouTube) + `src/content-music.js` (YouTube Music) - Inject buttons and detect videos
- **Popup Interface**: `src/popup.html|js` - Tabbed interface showing current page videos + history
- **Side Panel**: `src/sidepanel.html|js` - AI chat interface using Google Generative AI SDK
- **Options Page**: `src/options.html|js` - Settings management with theme switching

### Data Flow Patterns
1. Content scripts detect videos → send to background via `chrome.runtime.sendMessage()`
2. Background manages settings via `chrome.storage.local` with `DEFAULT_SETTINGS` constant
3. History management: background adds entries, popup displays with reactive filtering
4. AI chat: side panel imports `@google/generative-ai` SDK, manages conversation state

## Development Conventions

### Settings Management Pattern
All components use shared `DEFAULT_SETTINGS` constant (duplicated in `background.js` and `options.js`):
```javascript
const DEFAULT_SETTINGS = {
    windowWidth: 854, windowHeight: 480,
    historyLimit: 50, historyDuration: 30,
    themeMode: 'auto', autoFocus: true,
    geminiApiKey: ''
};
```

### Theme System
CSS uses custom properties with light/dark/auto modes:
- Root variables in `:root` (dark default)
- `.light-theme` and `.dark-theme` classes override variables
- All components check `themeMode` setting and apply classes to `body`

### Internationalization Pattern
- Messages in `_locales/{locale}/messages.json` with `chrome.i18n.getMessage(key)`
- Each component has `initializeI18n()` function that sets text content
- Use `"__MSG_key__"` in manifest.json for extension metadata

### Message Passing Architecture
Background script handles these message actions:
- `openPopup` - Creates/reuses pop-up window
- `addVideoToHistory` - Stores video with metadata
- `updateBadge` - Shows "ON" when videos detected
- `getVideoHistory` - Returns sorted history array

### Extension Action Behavior
- **Extension Icon Click**: Opens AI sidepanel using `chrome.sidePanel.open()`
- **Content Script Buttons**: Create video pop-up windows via message passing
- **Popup Interface**: Available through content script interactions, not default action
- **Side Panel Interface**: 3-tab structure (Current Videos, History, AI Chat) with shared video functionality

### Content Script Integration
- YouTube: Adds button to `.ytp-right-controls` with `MutationObserver` for SPA navigation
- YouTube Music: Adds button to `.middle-controls` with different styling
- Both scripts update badge count and send video detection messages

## Key Technical Patterns

### Pop-up Window Management
Background maintains `popupWindowId` and `musicPopupWindowId` globals, reuses existing windows:
```javascript
chrome.windows.create({
    url: videoUrl,
    type: 'popup',
    width: currentSettings.windowWidth,
    height: currentSettings.windowHeight
});
```

### History Storage Pattern
Videos stored as objects with `videoId`, `title`, `url`, `channel`, `thumbnail`, `timestamp`, `dateAdded`. Background handles cleanup based on `historyDuration` setting.

### AI Integration
- Side panel uses ES6 modules with `import { GoogleGenerativeAI }`
- Maintains conversation state in `chatHistory` array
- API key stored in settings, shows no-key state when missing
- Chat interface with loading states and error handling

## File Dependencies

- `manifest.json` defines permissions: `activeTab`, `scripting`, `storage`, `tabs`, `windows`, `sidePanel`
- `package.json` includes `@google/generative-ai` dependency
- All CSS files use CSS custom properties for theming
- Content scripts use `chrome.runtime.getURL()` for icon resources

## Common Workflows

### Adding New Settings
1. Update `DEFAULT_SETTINGS` in both `background.js` and `options.js`
2. Add form controls in `options.html` with matching IDs
3. Add to `populateForm()` and `collectFormData()` in `options.js`
4. Add translations to all `_locales/*/messages.json` files

### Extending AI Features
- Modify `sidepanel.js` `sendMessage()` function for new prompts
- Update chat interface in `sidepanel.html` for new UI elements
- Add message types to `chatHistory` state management

### Adding New Supported Sites
1. Add host permissions in `manifest.json`
2. Create new content script file (like `content-music.js`)
3. Add content script entry with site-specific selectors
4. Update background popup logic for new site detection
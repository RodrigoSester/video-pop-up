# YouTube Pop-up Player Extension

A Chrome extension that allows you to watch YouTube videos in a dedicated pop-up window for an enhanced viewing experience. Perfect for multitasking while watching videos.

## ✨ Features

### 🤖 AI Assistant Integration (NEW!)
- **Google Gemini AI**: Built-in AI assistant powered by Google's Gemini model
- **Side Panel Chat**: Interactive chat interface accessible from the extension toolbar
- **Contextual Help**: Ask questions about YouTube videos, get summaries, and more
- **Secure API Key Management**: Personal API key stored locally with easy configuration
- **Real-time Responses**: Fast AI-powered responses with loading states and error handling

### 🎮 Multiple Ways to Open Pop-ups
- **Extension Popup**: Click the extension icon to browse and select from all videos on the current YouTube page
- **In-Video Button**: A dedicated button is automatically added to YouTube's video player controls
- **Toolbar Action**: Click the extension icon directly when on a YouTube video page

### 🎯 Smart Pop-up Management
- **Window Reuse**: Opens new videos in the existing pop-up window instead of creating multiple windows
- **Centered Positioning**: Pop-up windows are automatically centered relative to your main browser window
- **Customizable Dimensions**: Configurable window size (default 854x480) through settings
- **Auto-focus Options**: Choose whether pop-up windows automatically come to foreground

### 🎨 Enhanced Viewing Experience
- **Fullscreen-style Layout**: Hides YouTube's header and navigation for distraction-free viewing
- **Custom Styling**: Clean, minimalist interface optimized for the pop-up experience
- **Responsive Design**: Video player adapts to the pop-up window dimensions
- **Theme Support**: Light, dark, and system-based theme modes with seamless switching

### � Video History Management
- **History Tracking**: Automatically saves opened videos with timestamps
- **Easy Access**: Browse and reopen previously watched videos from extension popup
- **History Controls**: Delete individual entries or clear entire history
- **Configurable Retention**: Set how long to keep history (7 days to forever)
- **Smart Limits**: Configurable maximum number of videos to remember

### ⚙️ Comprehensive Settings
- **Options Page**: Full-featured settings interface accessible from extension popup
- **Window Configuration**: Customize default pop-up window dimensions
- **History Management**: Configure retention policies and storage limits
- **Appearance Options**: Choose between light, dark, or system-based themes
- **Advanced Features**: Auto-focus, window state memory, and more

### 🌍 Internationalization
- **Multi-language Support**: Available in English, Portuguese, and Spanish
- **Automatic Detection**: Uses browser language settings by default
- **Complete Localization**: All UI elements and messages are translated

### 📱 Enhanced Interface
- **Tabbed Layout**: Separate tabs for current page videos and history
- **Badge Notification**: Extension icon shows "ON" badge when YouTube videos are detected
- **Interactive Elements**: Smooth hover effects and responsive design
- **Accessibility**: Keyboard navigation and screen reader support

## 🏗️ Project Structure

```
video-pop-up/
├── manifest.json           # Extension configuration and permissions
├── src/
│   ├── popup.html          # Extension popup interface with tabbed layout
│   ├── popup.js            # Popup functionality, video listing, and history
│   ├── content.js          # YouTube page integration and button injection
│   ├── background.js       # Service worker for window and history management
│   ├── options.html        # Settings/options page interface
│   ├── options.js          # Settings management and configuration
│   ├── options.css         # Styling for options page
│   └── style.css           # Shared styles for popup and injected elements
├── _locales/               # Internationalization files
│   ├── en/
│   │   └── messages.json   # English translations
│   ├── es/
│   │   └── messages.json   # Spanish translations
│   └── pt_BR/
│       └── messages.json   # Portuguese (Brazil) translations
├── images/
│   ├── icon16.png          # 16x16 extension icon
│   ├── icon48.png          # 48x48 extension icon
│   └── icon128.png         # 128x128 extension icon
├── package.json            # Node.js project configuration
└── README.md              # This file
```

## 🚀 Installation & Setup

### For Development

1. **Clone the Repository**
   ```bash
   git clone git@github.com:RodrigoSester/video-pop-up.git
   cd video-pop-up
   ```

2. **Install Dependencies** (Optional)
   ```bash
   yarn install
   ```

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" using the toggle in the top-right corner
   - Click "Load unpacked" button
   - Select the project directory
   - The extension should now appear in your extensions list

### For Users

The extension will be available on the Chrome Web Store (coming soon).

## 🎯 How to Use

### AI Assistant
1. **Setup Your API Key**:
   - Right-click the extension icon → Options
   - Navigate to the "AI Integration" section
   - Follow the step-by-step instructions to get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Paste your API key and save settings

2. **Using the AI Assistant**:
   - Click the extension icon to open the side panel
   - Type your questions or prompts in the text area
   - Press Enter or click "Send" to get AI responses
   - Ask about YouTube videos, get summaries, or general assistance
   - Use the "Clear Chat" button to start a new conversation

### Method 1: Extension Popup
1. Navigate to any YouTube page (homepage, channel, search results)
2. Click the extension icon in your browser toolbar
3. **Current Page Tab**: Browse detected videos on the current page
4. **History Tab**: Access your previously opened videos
5. Click any video to open it in a pop-up window

### Method 2: In-Video Button
1. Open any YouTube video
2. Look for the pop-up button in the video player controls (right side)
3. Click the button to open the current video in a pop-up window
4. Video is automatically added to your history for future access

### Method 3: Direct Action
1. Navigate to a specific YouTube video page
2. Click the extension icon directly (no popup menu)
3. The current video opens immediately in a pop-up window

### Settings & Customization
1. Click the extension icon to open the popup
2. Click the settings/options button (⚙️) in the popup header
3. Configure:
   - **Window Settings**: Customize pop-up dimensions
   - **History Settings**: Set retention policies and limits
   - **Appearance**: Choose light, dark, or system theme
   - **AI Integration**: Set up your Gemini API key for AI features
   - **Advanced**: Auto-focus and window memory options
4. Click "Save Settings" to apply changes

## 🔧 Technical Details

### Permissions Required
- `activeTab`: Access current tab information
- `scripting`: Inject CSS and JavaScript into YouTube pages
- `storage`: Store extension preferences, settings, video history, and API keys
- `tabs`: Manage browser tabs
- `windows`: Create and manage pop-up windows
- `sidePanel`: Enable AI assistant side panel interface

### Host Permissions
- `*://www.youtube.com/*`: Full access to YouTube pages
- `*://youtube.com/*`: Support for non-www YouTube URLs

### Features Added
- **AI Integration**: Google Gemini AI assistant with side panel interface
- **Options UI**: Integrated settings page with `options_ui` configuration
- **Internationalization**: Multi-language support using `default_locale` and `_locales`
- **Enhanced Storage**: Persistent settings, video history, and secure API key management
- **Improved UX**: Theme support, AI chat interface, and comprehensive customization options

### Browser Compatibility
- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ✅ Brave
- ❌ Firefox (requires Manifest V2 adaptation)
- ❌ Safari (requires native conversion)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Rodrigo Sesterheim** ([@RodrigoSester](https://github.com/RodrigoSester))
- Email: rodrigows09@gmail.com

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Known Issues

- Some YouTube layout changes may occasionally affect button positioning (automatically adapts)
- Pop-up CSS injection is scoped to popup windows only to prevent layout conflicts
- Extension may require page refresh after installation for content script injection
- History cleanup runs periodically based on retention settings
- AI features require a personal Google Gemini API key (free tier available)
- Side panel AI chat requires active internet connection for responses

## 🔮 Future Enhancements

- [ ] Keyboard shortcuts for quick pop-up creation and AI assistant
- [ ] Multiple video queue management and playlists
- [ ] Enhanced video metadata (thumbnails, channel info)
- [ ] Advanced filtering and search in history
- [ ] Video context awareness in AI assistant (pass current video info)
- [ ] Chat history persistence across sessions
- [ ] Export AI conversations
- [ ] Multi-model support (different Gemini variants)
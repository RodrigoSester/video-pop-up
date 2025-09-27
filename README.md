# YouTube Pop-up Player Extension

A Chrome extension that allows you to watch YouTube videos in a dedicated pop-up window for an enhanced viewing experience. Perfect for multitasking while watching videos.

## ✨ Features

### 🎮 Multiple Ways to Open Pop-ups
- **Extension Popup**: Click the extension icon to browse and select from all videos on the current YouTube page
- **In-Video Button**: A dedicated button is automatically added to YouTube's video player controls
- **Toolbar Action**: Click the extension icon directly when on a YouTube video page

### 🎯 Smart Pop-up Management
- **Window Reuse**: Opens new videos in the existing pop-up window instead of creating multiple windows
- **Centered Positioning**: Pop-up windows are automatically centered relative to your main browser window
- **Optimized Size**: Default 854x480 resolution for optimal video viewing

### 🎨 Enhanced Viewing Experience
- **Fullscreen-style Layout**: Hides YouTube's header and navigation for distraction-free viewing
- **Custom Styling**: Clean, minimalist interface optimized for the pop-up experience
- **Responsive Design**: Video player adapts to the pop-up window dimensions

### 📱 Visual Indicators
- **Badge Notification**: Extension icon shows "ON" badge when YouTube videos are detected on the page
- **Hover Effects**: Interactive buttons with smooth opacity transitions

## 🏗️ Project Structure

```
video-pop-up/
├── manifest.json           # Extension configuration and permissions
├── src/
│   ├── popup.html          # Extension popup interface
│   ├── popup.js            # Popup functionality and video listing
│   ├── content.js          # YouTube page integration and button injection
│   ├── background.js       # Service worker for window management
│   └── style.css           # Shared styles for popup and injected elements
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

### Method 1: Extension Popup
1. Navigate to any YouTube page (homepage, channel, search results)
2. Click the extension icon in your browser toolbar
3. Browse the list of detected videos with thumbnails and titles
4. Click any video to open it in a pop-up window

### Method 2: In-Video Button
1. Open any YouTube video
2. Look for the new pop-up button in the video player controls (right side)
3. Click the button to open the current video in a pop-up window

### Method 3: Direct Action
1. Navigate to a specific YouTube video page
2. Click the extension icon directly (no popup menu)
3. The current video opens immediately in a pop-up window

## 🔧 Technical Details

### Permissions Required
- `activeTab`: Access current tab information
- `scripting`: Inject CSS and JavaScript into YouTube pages
- `storage`: Store extension preferences
- `tabs`: Manage browser tabs
- `windows`: Create and manage pop-up windows
- `windowManagement`: Advanced window positioning

### Host Permissions
- `*://www.youtube.com/*`: Full access to YouTube pages
- `*://youtube.com/*`: Support for non-www YouTube URLs

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

- Pop-up CSS injection requires proper host permissions
- Some YouTube layout changes may affect button positioning
- Extension requires page refresh after installation for full functionality

## 🔮 Future Enhancements

- [ ] Keyboard shortcuts for quick pop-up creation
- [ ] Customizable pop-up window sizes
- [ ] Picture-in-picture mode support
- [ ] Multiple video queue management
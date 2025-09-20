# YouTube Pop-up Player Extension
This browser extension allows you to watch YouTube videos in a floating pop-up window.

# Features
- Extension Popup: Click the extension icon to see a list of all videos on the current YouTube page.

- In-Video Button: A button is added directly to the YouTube player controls to easily pop out the currently playing video.

- Badge Notification: The extension icon shows a badge when you are on a YouTube page with detectable videos.

Project Structure
manifest.json: The core configuration file for the extension.

popup.html: The HTML for the extension's popup window.

popup.js: The JavaScript that powers the popup, listing videos.

content.js: This script is injected into YouTube pages to find videos and add the pop-up button to the player.

background.js: The service worker that handles creating the pop-up window and managing the badge.

style.css: Shared styles for the popup and the injected button.

/images: Contains the icons for the extension.

Setup
Install Yarn: If you don't have Yarn, install it globally: npm install -g yarn

Initialize Project: Navigate to the project directory and run yarn init -y to create a package.json file. You don't need to install any packages for this simple extension.

How to Load the Extension in Your Browser
Google Chrome or Brave
Open your browser and navigate to chrome://extensions.

Enable "Developer mode" using the toggle in the top right corner.

Click the "Load unpacked" button.

Select the directory where you saved these files.

The extension should now be active!

Safari
Loading extensions in Safari is more complex and requires an Xcode project. This current structure is primarily for Chromium-based browsers. To support Safari, you would need to use Apple's conversion tools.

Next Steps for Production
Create Icons: You will need to create icon16.png, icon48.png, and icon128.png and place them in the images folder.

Testing: Thoroughly test on different YouTube page layouts (homepage, video page, channel page).

Packaging: For the Chrome Web Store, you'll zip the entire project folder.

Publishing: Follow the Chrome Web Store developer documentation to upload and publish your extension.
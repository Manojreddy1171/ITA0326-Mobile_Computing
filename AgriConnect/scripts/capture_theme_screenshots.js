const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5000";

const outDir = path.join(__dirname, "..", "qa", "screenshots", "theme_and_lang");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log("Capturing screenshots for Dark Mode, Light Mode & Language Switcher...");

// 1. Settings page light mode
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=2000 --window-size=1280,900 --screenshot="${path.join(outDir, 'settings_light_mode_desktop.png')}" "${BASE_URL}/settings.html"`, { stdio: 'inherit' });

// 2. Settings page mobile
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=2000 --window-size=393,852 --screenshot="${path.join(outDir, 'settings_light_mode_mobile_393x852.png')}" "${BASE_URL}/settings.html"`, { stdio: 'inherit' });

// 3. Index page desktop showing quick bar
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=2000 --window-size=1280,900 --screenshot="${path.join(outDir, 'index_with_quickbar_desktop.png')}" "${BASE_URL}/index.html"`, { stdio: 'inherit' });

// 4. Index page mobile showing quick bar
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=2000 --window-size=393,852 --screenshot="${path.join(outDir, 'index_with_quickbar_mobile.png')}" "${BASE_URL}/index.html"`, { stdio: 'inherit' });

// 5. Index page Dark Mode desktop
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --force-dark-mode --enable-features=WebContentsForceDark --virtual-time-budget=2000 --window-size=1280,900 --screenshot="${path.join(outDir, 'index_dark_mode_desktop.png')}" "${BASE_URL}/index.html"`, { stdio: 'inherit' });

// 6. Farmer Dashboard Dark Mode desktop
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --force-dark-mode --enable-features=WebContentsForceDark --virtual-time-budget=2000 --window-size=1280,900 --screenshot="${path.join(outDir, 'farmer_dashboard_dark_mode_desktop.png')}" "${BASE_URL}/farmer-dashboard.html"`, { stdio: 'inherit' });

console.log("Screenshots captured successfully in qa/screenshots/theme_and_lang!");

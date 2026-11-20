const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5000";

const SCREENS = [
    { name: "index", url: `${BASE_URL}/index.html` },
    { name: "login", url: `${BASE_URL}/login.html` },
    { name: "farmer_dashboard", url: `${BASE_URL}/farmer-dashboard.html` },
    { name: "buyer_dashboard", url: `${BASE_URL}/buyer-dashboard.html` },
    { name: "marketplace", url: `${BASE_URL}/marketplace.html` },
    { name: "wholesale_negotiations", url: `${BASE_URL}/wholesale-negotiations.html` },
    { name: "image_upload_studio", url: `${BASE_URL}/image-upload-studio.html` },
    { name: "group_buying", url: `${BASE_URL}/group-buying.html` },
    { name: "my_crops", url: `${BASE_URL}/my-crops.html` },
    { name: "farmer_orders", url: `${BASE_URL}/orders.html` },
    { name: "buyer_orders", url: `${BASE_URL}/buyer-orders.html` },
    { name: "equipment_rental", url: `${BASE_URL}/equipment-rental.html` }
];

const VIEWPORTS = [
    { label: "mobile_393x852", w: 393, h: 852 },
    { label: "mobile_360x800", w: 360, h: 800 },
    { label: "tablet_800x1280", w: 800, h: 1280 },
    { label: "desktop_1280x800", w: 1280, h: 800 }
];

const targetPhase = process.argv[2] || "before"; // "before" or "after"
const outDir = path.join(__dirname, "..", "qa_screenshots", targetPhase);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log(`=== Capturing QA Screenshots (Phase: ${targetPhase}) ===`);

for (const scr of SCREENS) {
    // Primary mobile screenshot (393x852)
    const outPath = path.join(outDir, `${scr.name}_mobile_393x852.png`);
    const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=2000 --window-size=393,852 --screenshot="${outPath}" "${scr.url}"`;
    try {
        execSync(cmd, { stdio: 'ignore', timeout: 15000 });
        console.log(`  [OK] ${scr.name} (393x852) -> ${path.basename(outPath)}`);
    } catch (e) {
        console.error(`  [ERR] Failed to capture ${scr.name}:`, e.message);
    }
}

// For Farmer & Buyer dashboard, also capture other resolutions
const multiResScreens = ["farmer_dashboard", "buyer_dashboard", "wholesale_negotiations", "group_buying"];
for (const scrName of multiResScreens) {
    const scr = SCREENS.find(s => s.name === scrName);
    for (const vp of VIEWPORTS) {
        if (vp.label === "mobile_393x852") continue; // already done
        const outPath = path.join(outDir, `${scr.name}_${vp.label}.png`);
        const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=2000 --window-size=${vp.w},${vp.h} --screenshot="${outPath}" "${scr.url}"`;
        try {
            execSync(cmd, { stdio: 'ignore', timeout: 15000 });
            console.log(`  [OK] ${scr.name} (${vp.label}) -> ${path.basename(outPath)}`);
        } catch (e) {
            console.error(`  [ERR] Failed ${scr.name} ${vp.label}:`, e.message);
        }
    }
}

console.log(`\n=== QA Screenshots Captured in ${outDir} ===`);

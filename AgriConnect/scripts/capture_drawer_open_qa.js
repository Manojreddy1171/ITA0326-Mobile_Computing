const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = path.join(__dirname, "..", "qa_screenshots", "after");

// Test script to capture drawer open state
const testHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>
window.location.href = "http://localhost:5000/farmer-dashboard.html";
</script>
</head>
<body></body>
</html>
`;

// Capture drawer open on farmer dashboard and buyer dashboard by injecting JS
// We can use Chrome DevTools protocol or a wrapper page that triggers drawer open
const testPagePath = path.join(__dirname, "..", "frontend", "test-drawer-open.html");
const testPageContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Drawer Open</title>
</head>
<body>
    <iframe id="testFrame" src="/farmer-dashboard.html" style="width:100vw; height:100vh; border:none;"></iframe>
    <script>
        const frame = document.getElementById('testFrame');
        frame.onload = () => {
            setTimeout(() => {
                const doc = frame.contentDocument || frame.contentWindow.document;
                const sb = doc.getElementById('sidebar');
                const ov = doc.getElementById('sidebarOverlay');
                if (sb) sb.classList.add('open');
                if (ov) ov.classList.add('active');
            }, 600);
        };
    </script>
</body>
</html>
`;

fs.writeFileSync(testPagePath, testPageContent);

const outPath1 = path.join(outDir, "farmer_dashboard_drawer_open_393x852.png");
try {
    execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --virtual-time-budget=2500 --window-size=393,852 --screenshot="${outPath1}" "http://localhost:5000/test-drawer-open.html"`, { stdio: 'ignore' });
    console.log("Captured drawer open on mobile:", path.basename(outPath1));
} catch (e) {
    console.error("Failed:", e.message);
}

// Clean up test page
if (fs.existsSync(testPagePath)) fs.unlinkSync(testPagePath);

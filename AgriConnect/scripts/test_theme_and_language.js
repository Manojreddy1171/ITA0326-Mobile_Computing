/**
 * Automated Verification Script: Dark/Light Mode Theme & Google Translation Engine
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
    });
}

async function verify() {
    console.log("================================================================================");
    console.log("   AGRICONNECT – THEME (DARK/LIGHT) & GOOGLE TRANSLATION VERIFICATION SUITE    ");
    console.log("================================================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(name, condition) {
        if (condition) {
            console.log(`  [PASS] ${name}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${name}`);
            failed++;
        }
    }

    // 1. Verify CSS Asset
    const cssPath = path.join(__dirname, '../frontend/assets/agri-theme-lang.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert('agri-theme-lang.css exists and defines dark theme', cssContent.includes('[data-theme="dark"]'));
    assert('agri-theme-lang.css defines quick action bar #agriQuickBar', cssContent.includes('#agriQuickBar'));
    assert('agri-theme-lang.css suppresses Google banner iframe', cssContent.includes('.goog-te-banner-frame'));

    // 2. Verify JS Asset
    const jsPath = path.join(__dirname, '../frontend/assets/agri-theme-lang.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    assert('agri-theme-lang.js exists and defines window.setAgriTheme', jsContent.includes('window.setAgriTheme'));
    assert('agri-theme-lang.js defines window.changeAgriLanguage', jsContent.includes('window.changeAgriLanguage'));
    assert('agri-theme-lang.js integrates Google Translate callback', jsContent.includes('agriGoogleTranslateInit'));
    assert('agri-theme-lang.js configures googtrans cookie', jsContent.includes('googtrans='));
    assert('agri-theme-lang.js includes instant Tamil (ta) and Sinhala (si) dictionary', jsContent.includes('ta:') && jsContent.includes('si:'));

    // 3. Test Live Web Server serving assets
    const cssRes = await get('http://localhost:5000/assets/agri-theme-lang.css');
    assert('GET /assets/agri-theme-lang.css returns 200 OK', cssRes.status === 200 && cssRes.body.length > 500);

    const jsRes = await get('http://localhost:5000/assets/agri-theme-lang.js');
    assert('GET /assets/agri-theme-lang.js returns 200 OK', jsRes.status === 200 && jsRes.body.length > 1000);

    // 4. Test Key Pages Include Theme & Language Engine
    const pages = [
        'index.html',
        'settings.html',
        'buyer-settings.html',
        'admin-settings.html',
        'farmer-dashboard.html',
        'buyer-dashboard.html',
        'wholesale-negotiations.html',
        'group-buying.html'
    ];

    for (const page of pages) {
        const pageRes = await get(`http://localhost:5000/${page}`);
        const hasCss = pageRes.body.includes('agri-theme-lang.css') || pageRes.body.includes('agri-navigation.css');
        const hasJs = pageRes.body.includes('agri-theme-lang.js') || pageRes.body.includes('agri-navigation.js');
        assert(`Page /${page} loads Theme & Translation assets`, hasCss && hasJs);
    }

    // 5. Test Settings Pages have Language options (en, ta, si)
    const settingsRes = await get('http://localhost:5000/settings.html');
    assert('settings.html includes data-lang="en"', settingsRes.body.includes('data-lang="en"'));
    assert('settings.html includes data-lang="ta" (Tamil)', settingsRes.body.includes('data-lang="ta"'));
    assert('settings.html includes data-lang="si" (Sinhala)', settingsRes.body.includes('data-lang="si"'));

    console.log("\n================================================================================");
    console.log(`   TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log("================================================================================");

    if (failed === 0) {
        console.log("\n>>> THEME & GOOGLE TRANSLATION VERIFICATION PASSED ✅ <<<\n");
    } else {
        process.exit(1);
    }
}

verify().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});

const http = require('http');

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(body); } catch (e) { parsed = body; }
                resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log("==================================================");
    console.log("   AgriConnect Advanced Modules Test Suite");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${testName}`);
            failed++;
        }
    }

    try {
        // 1. Test Static HTML Pages
        console.log("\n--- Testing HTML Pages ---");
        const pages = [
            "/wholesale-negotiations.html",
            "/image-upload-studio.html",
            "/group-buying.html",
            "/farmer-dashboard.html",
            "/buyer-dashboard.html",
            "/marketplace.html"
        ];
        for (const p of pages) {
            const res = await request({ hostname: 'localhost', port: 5000, path: p, method: 'GET' });
            assert(res.statusCode === 200, `Page ${p} returns HTTP 200`);
        }

        // 2. Test Module 1: Smart Wholesale Negotiator
        console.log("\n--- Testing Module 1: Price Negotiator ---");
        // 2a. Recommendation Engine API
        const recRes = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/negotiations/recommendation?asking_price=50&offered_price=42&quantity=100',
            method: 'GET'
        });
        assert(recRes.statusCode === 200 && recRes.body.success, "Recommendation Engine computes counteroffer");
        assert(recRes.body.recommendation.suggestedPrice > 42 && recRes.body.recommendation.suggestedPrice < 50,
            `Recommendation price is fair (got ₹${recRes.body?.recommendation?.suggestedPrice}/kg)`);

        // 2b. Query Seeded Demo Negotiation #1
        const negRes = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/negotiations/1',
            method: 'GET'
        });
        assert(negRes.statusCode === 200 && negRes.body.success, "GET /api/negotiations/1 returns demo record");
        assert(negRes.body.timeline && negRes.body.timeline.length >= 4,
            `Timeline contains complete 4-step negotiation dialogue (${negRes.body?.timeline?.length} messages)`);
        assert(negRes.body.negotiation.final_agreed_price == 47, "Final agreed price is ₹47/kg as requested");

        // 2c. Initiate new test negotiation
        const newNeg = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/negotiations',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            crop_id: 2,
            buyer_id: 28,
            quantity: 50,
            offered_price: 44,
            notes: "Test automated run"
        });
        assert(newNeg.statusCode === 201 && newNeg.body.success, "Buyer initiates new negotiation (POST /api/negotiations)");
        const testNegId = newNeg.body.negotiation_id;

        // 2d. Counteroffer
        const counterRes = await request({
            hostname: 'localhost', port: 5000,
            path: `/api/negotiations/${testNegId}/counter`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            sender_id: 27,
            sender_role: 'farmer',
            counter_price: 48,
            message: "I can do 48 for 50kg"
        });
        assert(counterRes.statusCode === 200 && counterRes.body.success, "Farmer submits counteroffer (POST /api/negotiations/:id/counter)");

        // 2e. Accept
        const acceptRes = await request({
            hostname: 'localhost', port: 5000,
            path: `/api/negotiations/${testNegId}/accept`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            user_id: 28,
            user_role: 'buyer'
        });
        assert(acceptRes.statusCode === 200 && acceptRes.body.success, "Buyer accepts counteroffer (POST /api/negotiations/:id/accept)");

        // 3. Test Module 2: Camera & Crop Images
        console.log("\n--- Testing Module 2: Camera & Images ---");
        const imgRes = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/images/crops/2',
            method: 'GET'
        });
        assert(imgRes.statusCode === 200 && imgRes.body.success, "GET /api/images/crops/2 returns images");
        assert(imgRes.body.images && imgRes.body.images.length >= 3, `Listing has multi-image gallery (${imgRes.body.images.length} photos)`);
        assert(imgRes.body.images.some(img => img.is_primary === 1), "Gallery has primary cover image designated");

        // 4. Test Module 3: Smart Group Buying & Demand Pooling
        console.log("\n--- Testing Module 3: Group Buying & Demand Pooling ---");
        // 4a. Get Active Campaigns
        const gbList = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/group-buying',
            method: 'GET'
        });
        assert(gbList.statusCode === 200 && gbList.body.success, "GET /api/group-buying lists campaigns");

        // 4b. Check Seeded Campaign #1
        const gb1 = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/group-buying/1',
            method: 'GET'
        });
        assert(gb1.statusCode === 200 && gb1.body.success, "GET /api/group-buying/1 returns demo campaign");
        assert(gb1.body.campaign.status === 'target_reached', "Demo Campaign #1 status is 'target_reached'");
        assert(gb1.body.commitments && gb1.body.commitments.length === 4, "4 wholesale buyers joined demo pool as requested");
        assert(parseFloat(gb1.body.campaign.current_committed_quantity) === 500, "Pooled volume reached exact 500 kg target");

        // 4c. Smart Recommendations
        const recGb = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/group-buying/recommendations',
            method: 'GET'
        });
        assert(recGb.statusCode === 200 && recGb.body.success, "GET /api/group-buying/recommendations returns smart highlights");

        // 4d. Buyer commitments list
        const bComm = await request({
            hostname: 'localhost', port: 5000,
            path: '/api/group-buying/my-commitments/28',
            method: 'GET'
        });
        assert(bComm.statusCode === 200 && bComm.body.success, "GET /api/group-buying/my-commitments/:buyer_id returns buyer purchases");

    } catch (e) {
        console.error("Test execution error:", e);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
}

runTests();

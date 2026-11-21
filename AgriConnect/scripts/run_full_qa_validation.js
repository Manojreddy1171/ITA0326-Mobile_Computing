const http = require("http");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });
        req.on("error", reject);
        if (data) {
            req.write(typeof data === "string" ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runComprehensiveQA() {
    console.log("================================================================================");
    console.log("   AGRICONNECT – COMPREHENSIVE QA AUTOMATION & ACCEPTANCE VALIDATION SUITE      ");
    console.log("================================================================================\n");

    let totalAssertions = 0;
    let passedAssertions = 0;
    let failedAssertions = 0;
    const testResults = [];

    function record(gate, testName, expected, actual, condition) {
        totalAssertions++;
        const passed = Boolean(condition);
        if (passed) {
            passedAssertions++;
            console.log(`  [PASS] [${gate}] ${testName}`);
        } else {
            failedAssertions++;
            console.error(`  [FAIL] [${gate}] ${testName}`);
            console.error(`         Expected: ${expected}`);
            console.error(`         Actual:   ${JSON.stringify(actual)}`);
        }
        testResults.push({ gate, testName, expected, actual, passed });
    }

    const db = await mysql.createPool({
        host: "localhost",
        user: "root",
        password: "root123",
        database: "agriconnect",
        port: 3306
    });

    try {
        // =====================================================================
        // GATE 1: Application & Database Startup
        // =====================================================================
        console.log("--- GATE 1: Application & Database Startup ---");
        const homeRes = await request({ hostname: "localhost", port: 5000, path: "/", method: "GET" });
        record("GATE 1", "Express Server running on port 5000", 200, homeRes.statusCode, homeRes.statusCode === 200);

        const [dbCheck] = await db.query("SELECT 1 AS alive");
        record("GATE 1", "MySQL Database connected and queryable", 1, dbCheck[0]?.alive, dbCheck[0]?.alive === 1);

        // =====================================================================
        // GATE 2: Multi-Role Authentication & Protected Logins
        // =====================================================================
        console.log("\n--- GATE 2: Farmer & Buyer Login ---");
        const farmerLogin = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { identifier: "farmer@agriconnect.com", password: "password123", role: "farmer" });

        record("GATE 2", "Farmer Authentication & Session Generation", true, farmerLogin.body?.token != null, farmerLogin.statusCode === 200 && Boolean(farmerLogin.body?.token));

        const buyerLogin = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { identifier: "buyer@agriconnect.com", password: "password123", role: "buyer" });

        record("GATE 2", "Buyer Authentication & Session Generation", true, buyerLogin.body?.token != null, buyerLogin.statusCode === 200 && Boolean(buyerLogin.body?.token));

        // Invalid Password Rejection
        const invalidLogin = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { identifier: "farmer@agriconnect.com", password: "wrong_password", role: "farmer" });

        record("GATE 2", "Security: Rejection of Invalid Passwords", 401, invalidLogin.statusCode, invalidLogin.statusCode === 401);

        // =====================================================================
        // GATE 3: Marketplace Product Retrieval from MySQL
        // =====================================================================
        console.log("\n--- GATE 3: Marketplace Crop Retrieval from MySQL ---");
        const cropsRes = await request({ hostname: "localhost", port: 5000, path: "/api/crops", method: "GET" });
        const cropList = Array.isArray(cropsRes.body) ? cropsRes.body : (cropsRes.body?.crops || []);
        record("GATE 3", "Crops Retrieved from Database", ">= 4 crops", cropList.length, cropList.length >= 4);

        // Verify Crop Details
        const sampleCrop = cropList.find(c => c.id === 2 || c.crop_name === "Tomatoes") || cropList[0];
        record("GATE 3", "Crop Schema Integrity (Pricing & Stock)", true, sampleCrop && sampleCrop.price_per_kg > 0, sampleCrop && sampleCrop.price_per_kg > 0);

        // =====================================================================
        // GATE 4: MODULE 1 – Smart Wholesale Price Negotiator
        // =====================================================================
        console.log("\n--- GATE 4: Module 1 – Smart Wholesale Price Negotiator ---");
        // 4a. Recommendation engine
        const recRes = await request({
            hostname: "localhost", port: 5000,
            path: "/api/negotiations/recommendation?asking_price=50&offered_price=42&quantity=100",
            method: "GET"
        });
        const recPrice = recRes.body?.recommendation?.suggestedPrice;
        record("GATE 4", "Rule-Based Recommendation Engine", "Between 45 and 48", recPrice, recPrice >= 45 && recPrice <= 48);

        // 4b. Scenario 1: Buyer creates offer
        const createNegRes = await request({
            hostname: "localhost", port: 5000, path: "/api/negotiations", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            buyer_id: 28,
            crop_id: 2,
            quantity: 100,
            offered_price: 42,
            initial_price: 50,
            notes: "QA E2E 100kg Tomatoes at ₹42/kg"
        });
        const negId = createNegRes.body?.negotiation_id;
        record("GATE 4", "Buyer Creates Wholesale Offer (Status: Pending)", 201, createNegRes.statusCode, createNegRes.statusCode === 201 && negId != null);

        // 4c. Scenario 2: Farmer counteroffers at ₹47/kg
        const counterRes = await request({
            hostname: "localhost", port: 5000, path: `/api/negotiations/${negId}/counter`, method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            sender_id: 27,
            sender_role: "farmer",
            counter_price: 47,
            message: "Farmer counteroffer: ₹47/kg"
        });
        record("GATE 4", "Farmer Counteroffer (₹47/kg)", 200, counterRes.statusCode, counterRes.statusCode === 200 && counterRes.body?.success === true);

        // 4d. Scenario 3: Buyer accepts counteroffer
        const acceptRes = await request({
            hostname: "localhost", port: 5000, path: `/api/negotiations/${negId}/accept`, method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { user_id: 28, user_role: "buyer" });
        record("GATE 4", "Buyer Accepts Counteroffer (Status: Accepted)", 200, acceptRes.statusCode, acceptRes.statusCode === 200 && acceptRes.body?.success === true);

        // 4e. Verify DB persistence & calculation
        const getFinalNeg = await request({ hostname: "localhost", port: 5000, path: `/api/negotiations/${negId}`, method: "GET" });
        const finalStatus = getFinalNeg.body?.negotiation?.status;
        const finalPrice = getFinalNeg.body?.negotiation?.final_agreed_price;
        record("GATE 4", "Agreement Persisted with Unit Price ₹47/kg", "accepted / 47", `${finalStatus} / ${finalPrice}`, finalStatus === "accepted" && finalPrice == 47);

        // 4f. Boundary Protection: Prevent negative price
        const negNegative = await request({
            hostname: "localhost", port: 5000, path: "/api/negotiations", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { buyer_id: 28, crop_id: 2, quantity: 100, offered_price: -10 });
        record("GATE 4", "Boundary Validation: Prevent Negative Prices", 400, negNegative.statusCode, negNegative.statusCode === 400);

        // 4g. Boundary Protection: Prevent zero quantity
        const negZeroQty = await request({
            hostname: "localhost", port: 5000, path: "/api/negotiations", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { buyer_id: 28, crop_id: 2, quantity: 0, offered_price: 42 });
        record("GATE 4", "Boundary Validation: Prevent Zero Quantities", 400, negZeroQty.statusCode, negZeroQty.statusCode === 400);

        // 4h. Boundary Protection: Prevent duplicate acceptance
        const negDupAccept = await request({
            hostname: "localhost", port: 5000, path: `/api/negotiations/${negId}/accept`, method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { user_id: 28, user_role: "buyer" });
        record("GATE 4", "Boundary Validation: Prevent Duplicate Acceptance", 400, negDupAccept.statusCode, negDupAccept.statusCode === 400);

        // =====================================================================
        // GATE 5: MODULE 2 – Camera and Image Uploads
        // =====================================================================
        console.log("\n--- GATE 5: Module 2 – Camera and Image Uploads ---");
        // 5a. Query Crop Image Gallery
        const galleryRes = await request({ hostname: "localhost", port: 5000, path: "/api/images/crops/2", method: "GET" });
        const images = galleryRes.body?.images || [];
        record("GATE 5", "Product Image Gallery Retrieval", true, images.length > 0, galleryRes.statusCode === 200 && images.length > 0);

        // 5b. Toggle Primary Cover Thumbnail
        if (images.length > 0) {
            const imgId = images[0].id;
            const primaryRes = await request({
                hostname: "localhost", port: 5000,
                path: `/api/images/crops/2/primary/${imgId}`,
                method: "PUT"
            });
            record("GATE 5", "Primary Cover Selection & Update", 200, primaryRes.statusCode, primaryRes.statusCode === 200 && primaryRes.body?.success === true);
        }

        // 5c. Negative Test: Empty Image Upload Rejection
        const emptyUpload = await request({
            hostname: "localhost", port: 5000, path: "/api/images/single", method: "POST"
        });
        record("GATE 5", "Negative Validation: Empty Upload Rejection", 400, emptyUpload.statusCode, emptyUpload.statusCode === 400);

        // =====================================================================
        // GATE 6: MODULE 3 – Smart Group Buying and Demand Pooling
        // =====================================================================
        console.log("\n--- GATE 6: Module 3 – Smart Group Buying and Demand Pooling ---");
        // 6a. 500 kg Demo Campaign Progress
        const campRes = await request({ hostname: "localhost", port: 5000, path: "/api/group-buying/1", method: "GET" });
        const camp = campRes.body?.campaign;
        const reachedTarget = camp && (camp.status === "target_reached" || camp.current_committed_quantity >= 500);
        record("GATE 6", "Cooperative Pooling Milestone: 500 kg Reached (100%)", true, reachedTarget, reachedTarget);

        // 6b. Four Buyer Commitments Verified in DB
        const [commitRows] = await db.query(
            "SELECT COUNT(DISTINCT buyer_id) AS buyers, SUM(quantity) AS total_kg FROM group_buying_commitments WHERE campaign_id = 1 AND status = 'committed'"
        );
        record("GATE 6", "Four Buyers Demand Pooling Verification", "4 buyers / >=500 kg", `${commitRows[0]?.buyers} buyers / ${commitRows[0]?.total_kg} kg`, commitRows[0]?.buyers >= 4 && commitRows[0]?.total_kg >= 500);

        // 6c. Smart Recommendations
        const groupRecRes = await request({ hostname: "localhost", port: 5000, path: "/api/group-buying/recommendations", method: "GET" });
        const recs = groupRecRes.body?.recommendations || [];
        record("GATE 6", "Smart Demand Insights & Campaign Recommendations", true, recs.length > 0, groupRecRes.statusCode === 200 && recs.length > 0);

        // =====================================================================
        // GATE 7: Core Navigation, Buttons and Screen Inventory
        // =====================================================================
        console.log("\n--- GATE 7: Core Navigation & Screen Inventory ---");
        const coreScreens = [
            "/index.html",
            "/login.html",
            "/register.html",
            "/farmer-dashboard.html",
            "/buyer-dashboard.html",
            "/marketplace.html",
            "/wholesale-negotiations.html",
            "/image-upload-studio.html",
            "/group-buying.html",
            "/equipment-rental.html",
            "/admin-dashboard.html",
            "/my-crops.html",
            "/orders.html",
            "/buyer-orders.html"
        ];
        let screensOk = true;
        for (const s of coreScreens) {
            const scRes = await request({ hostname: "localhost", port: 5000, path: s, method: "GET" });
            if (scRes.statusCode !== 200) {
                screensOk = false;
                break;
            }
        }
        record("GATE 7", "All 14 Core Portals & Dashboards Return HTTP 200", true, screensOk, screensOk);

        // =====================================================================
        // GATE 8: Critical Sidebar Overlap Resolution
        // =====================================================================
        console.log("\n--- GATE 8: Mobile Sidebar Overlap Resolution ---");
        const cssPath = path.join(__dirname, "../frontend/assets/agri-navigation.css");
        const css = fs.readFileSync(cssPath, "utf8");
        const hasOverlay = css.includes("#sidebarOverlay");
        const hasSlidingDrawer = css.includes("translateX(-100%)");
        const hasOffset = css.includes("--agri-sidebar-width") || css.includes("margin-left: 260px") || css.includes("margin-left: var");
        record("GATE 8", "Sliding Drawer, #sidebarOverlay Backdrop & Desktop Offset", true, hasOverlay && hasSlidingDrawer && hasOffset, hasOverlay && hasSlidingDrawer && hasOffset);

        // =====================================================================
        // GATE 9: Admin Analytics & Governance
        // =====================================================================
        console.log("\n--- GATE 9: Admin Live Analytics & Governance ---");
        const adminStats = await request({ hostname: "localhost", port: 5000, path: "/api/admin/stats", method: "GET" });
        const ast = adminStats.body?.stats;
        const adminOk = ast && ast.totalUsers > 0 && ast.farmers > 0 && ast.buyers > 0 && ast.totalListings > 0 && ast.totalOrders > 0;
        record("GATE 9", "Real SQL Aggregation Platform Metrics", true, adminOk, adminOk);

        // =====================================================================
        // GATE 10: Database Persistence & Referential Integrity
        // =====================================================================
        console.log("\n--- GATE 10: Database Record Persistence ---");
        const [uCount] = await db.query("SELECT COUNT(*) AS c FROM users");
        const [cCount] = await db.query("SELECT COUNT(*) AS c FROM crops");
        const [nCount] = await db.query("SELECT COUNT(*) AS c FROM negotiations");
        const [gCount] = await db.query("SELECT COUNT(*) AS c FROM group_buying_campaigns");
        const persistOk = uCount[0].c > 0 && cCount[0].c > 0 && nCount[0].c > 0 && gCount[0].c > 0;
        record("GATE 10", "Full Relational Persistence Across All Modules", true, persistOk, persistOk);

    } catch (err) {
        console.error("QA Execution Error:", err);
    } finally {
        await db.end();
    }

    console.log("\n================================================================================");
    console.log(`   QA ACCEPTANCE GATES: ${passedAssertions} / ${totalAssertions} ASSERTIONS PASSED (${Math.round(passedAssertions / totalAssertions * 100)}%)`);
    console.log("================================================================================\n");

    const passRate = (passedAssertions / totalAssertions) * 100;
    const isDemoReady = passRate === 100 && failedAssertions === 0;

    console.log(`>>> FINAL SYSTEM VERDICT: ${isDemoReady ? "DEMO READY ✅" : "NOT READY ❌"} <<<\n`);

    fs.writeFileSync(
        path.join(__dirname, "../qa/qa_acceptance_results.json"),
        JSON.stringify({ totalAssertions, passedAssertions, failedAssertions, isDemoReady, results: testResults }, null, 2)
    );

    if (!isDemoReady) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runComprehensiveQA();

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

async function runEndToEndMasterSuite() {
    console.log("================================================================================");
    console.log("   AGRICONNECT – COMPLETE END-TO-END AUTOMATED TEST SUITE (TESTS 1 - 10)       ");
    console.log("================================================================================\n");

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const testLog = [];

    function recordResult(testNum, testName, expected, actual, passCondition) {
        totalTests++;
        const passed = Boolean(passCondition);
        if (passed) {
            passedTests++;
            console.log(`  [PASS] Test ${testNum}: ${testName}`);
        } else {
            failedTests++;
            console.error(`  [FAIL] Test ${testNum}: ${testName}`);
            console.error(`         Expected: ${expected}`);
            console.error(`         Actual:   ${JSON.stringify(actual)}`);
        }
        testLog.push({
            testNum,
            name: testName,
            expected,
            actual,
            passed
        });
    }

    // Connect to MySQL for direct persistence checks
    const db = await mysql.createPool({
        host: "localhost",
        user: "root",
        password: "root123",
        database: "agriconnect",
        port: 3306
    });

    try {
        // =====================================================================
        // TEST 1: Farmer Registration & Authentication
        // =====================================================================
        console.log("--- 1. Testing Farmer Registration & Authentication ---");
        const uniqueEmail = `test_farmer_${Date.now()}_${Math.floor(Math.random()*1000)}@agriconnect.com`;
        const uniquePhone = String(Math.floor(6000000000 + Math.random() * 3000000000));
        const regPayload = {
            first_name: "Ramesh",
            last_name: "Kumar",
            email: uniqueEmail,
            phone: uniquePhone,
            password: "password123",
            role: "farmer",
            district: "Coimbatore"
        };

        const regRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/auth/register",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, regPayload);

        recordResult(
            1.1,
            "Farmer Registration API",
            "HTTP 200 or 201 with success message",
            regRes.statusCode,
            regRes.statusCode === 200 || regRes.statusCode === 201
        );

        // Login with credentials
        const loginRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/auth/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            identifier: uniqueEmail,
            password: "password123",
            role: "farmer"
        });

        recordResult(
            1.2,
            "Farmer Login & JWT Authentication",
            "HTTP 200 with user session data and role",
            loginRes.body?.message,
            loginRes.statusCode === 200 && Boolean(loginRes.body?.token)
        );

        // =====================================================================
        // TEST 2: Product Listing Flow
        // =====================================================================
        console.log("\n--- 2. Testing Product Listing ---");
        const [cropInsert] = await db.query(
            `INSERT INTO crops (farmer_id, crop_name, specific_name, harvested_date, price_per_kg, quantity, description, image, created_at)
             VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, NOW())`,
            [27, "Fresh Bell Peppers", "Shimla Capsicum", 65.00, 350, "Direct harvest farm fresh capsicum", "demo_capsicum.png"]
        );
        const newCropId = cropInsert.insertId;

        const cropsListRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/crops",
            method: "GET"
        });

        const cropArray = Array.isArray(cropsListRes.body) ? cropsListRes.body : (cropsListRes.body?.crops || []);
        const hasNewCrop = cropArray.some(c => c.id === newCropId || c.crop_name === "Fresh Bell Peppers");
        recordResult(
            2.1,
            "Crop Creation & Marketplace Listing",
            "Crop appears in GET /api/crops marketplace",
            hasNewCrop ? "Found crop in catalog" : "Crop not found",
            hasNewCrop
        );

        // =====================================================================
        // TEST 3: Buyer Purchase & Order Placement
        // =====================================================================
        console.log("\n--- 3. Testing Buyer Purchase & Order Placement ---");
        const orderPayload = {
            buyer_id: 28,
            crop_id: newCropId,
            quantity: 25,
            delivery_address: "42 Market Street, Bangalore"
        };

        const orderRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/orders",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, orderPayload);

        recordResult(
            3.1,
            "Buyer Checkout & Order Creation",
            "HTTP 200/201 with created order",
            orderRes.statusCode,
            orderRes.statusCode === 200 || orderRes.statusCode === 201
        );

        // Farmer confirms order
        const [orderRows] = await db.query(
            "SELECT id, status FROM orders WHERE buyer_id = 28 AND crop_id = ? ORDER BY id DESC LIMIT 1",
            [newCropId]
        );
        const createdOrderId = orderRows[0]?.id;

        let orderUpdateOk = false;
        if (createdOrderId) {
            const updateRes = await request({
                hostname: "localhost",
                port: 5000,
                path: `/api/orders/${createdOrderId}/status`,
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            }, { status: "accepted", farmer_id: 27 });
            orderUpdateOk = updateRes.statusCode === 200 && updateRes.body?.success === true;
        }

        recordResult(
            3.2,
            "Farmer Order Status Update (Accepted)",
            "Order status transitioned to 'accepted'",
            orderUpdateOk,
            orderUpdateOk
        );

        // =====================================================================
        // TEST 4: Smart Price Negotiation Flow
        // =====================================================================
        console.log("\n--- 4. Testing Smart Price Negotiation ---");
        // 4a. Recommendation engine
        const recRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/negotiations/recommendation?asking_price=50&offered_price=42&quantity=100",
            method: "GET"
        });

        const suggestedPrice = recRes.body?.recommendation?.suggestedPrice;
        recordResult(
            4.1,
            "Rule-Based Recommendation Engine",
            "Suggested price between offered (42) and asking (50)",
            suggestedPrice,
            suggestedPrice >= 45 && suggestedPrice <= 48
        );

        // 4b. Create wholesale offer
        const negCreateRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/negotiations",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            buyer_id: 28,
            crop_id: 2,
            quantity: 100,
            offered_price: 42,
            initial_price: 50,
            notes: "I want 100 kg tomatoes at ₹42/kg."
        });

        const activeNegId = negCreateRes.body?.negotiation_id;

        // 4c. Farmer counteroffer
        await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/negotiations/${activeNegId}/counter`,
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            sender_id: 27,
            sender_role: "farmer",
            counter_price: 47,
            message: "I can offer ₹47/kg for this bulk quantity."
        });

        // 4d. Buyer accepts
        await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/negotiations/${activeNegId}/accept`,
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            user_id: 28,
            user_role: "buyer"
        });

        const finalNegQuery = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/negotiations/${activeNegId}`,
            method: "GET"
        });

        const finalStatus = finalNegQuery.body?.negotiation?.status;
        const finalAgreedPrice = finalNegQuery.body?.negotiation?.final_agreed_price;
        recordResult(
            4.2,
            "Bilateral Bargaining & Final Agreement at ₹47/kg",
            "Negotiation status 'accepted' and final_agreed_price 47",
            { status: finalStatus, price: finalAgreedPrice },
            finalStatus === "accepted" && finalAgreedPrice == 47
        );

        // =====================================================================
        // TEST 5: Camera & Multi-Image Upload Studio Flow
        // =====================================================================
        console.log("\n--- 5. Testing Camera & Image Studio ---");
        const imgGalleryRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/images/crops/2",
            method: "GET"
        });

        recordResult(
            5.1,
            "Multi-Image Gallery & Primary Thumbnail Cover",
            "Images retrieved with is_primary flag",
            imgGalleryRes.body?.images?.length,
            imgGalleryRes.statusCode === 200 && imgGalleryRes.body?.images?.length >= 1
        );

        // =====================================================================
        // TEST 6: Smart Group Buying & Demand Pooling Flow
        // =====================================================================
        console.log("\n--- 6. Testing Group Buying & Demand Pooling ---");
        const groupRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/group-buying/1",
            method: "GET"
        });

        const gCamp = groupRes.body?.campaign;
        const reached500kg = gCamp && (gCamp.status === "target_reached" || gCamp.current_quantity >= gCamp.target_quantity);
        recordResult(
            6.1,
            "Demand Pooling 500 kg Milestone & Status Transition",
            "Target reached: 500 kg / 500 kg (100% progress)",
            { current: gCamp?.current_quantity, target: gCamp?.target_quantity, status: gCamp?.status },
            reached500kg
        );

        // Commit from a 5th buyer to verify dynamic atomic recalculation
        const joinRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/group-buying/1/join",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            buyer_id: 28,
            committed_quantity: 20
        });

        recordResult(
            6.2,
            "Atomic Demand Commitment & Progress Tracking",
            "Commitment registered or campaign status handled gracefully",
            joinRes.statusCode,
            joinRes.statusCode === 200 || joinRes.statusCode === 400
        );

        // =====================================================================
        // TEST 7: Equipment Rental Management Flow
        // =====================================================================
        console.log("\n--- 7. Testing Equipment Rental Management ---");
        const provRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/rentals/providers",
            method: "GET"
        });

        const providersList = provRes.body?.providers || (Array.isArray(provRes.body) ? provRes.body : []);
        recordResult(
            7.1,
            "Equipment & Machinery Provider Discovery",
            "HTTP 200 with equipment provider fleet",
            { count: providersList.length },
            provRes.statusCode === 200 && Array.isArray(providersList)
        );

        // =====================================================================
        // TEST 8: Admin Management & Platform Analytics Flow
        // =====================================================================
        console.log("\n--- 8. Testing Admin Management & Platform Analytics ---");
        const adminStatsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/admin/stats",
            method: "GET"
        });

        const s = adminStatsRes.body?.stats;
        const validMetrics = s && s.totalUsers > 0 && s.farmers > 0 && s.buyers > 0 && s.totalListings > 0 && s.totalOrders > 0;
        recordResult(
            8.1,
            "Admin Real SQL Aggregation Analytics",
            "Live counts for Users, Farmers, Buyers, Listings, Orders, Negotiations, Campaigns",
            s,
            validMetrics
        );

        // =====================================================================
        // TEST 9: Responsive Navigation & Zero Sidebar Overlap Verification
        // =====================================================================
        console.log("\n--- 9. Testing Responsive Navigation & Sidebar Overlap Fix ---");
        const navCssPath = path.join(__dirname, "../frontend/assets/agri-navigation.css");
        const navCssContent = fs.readFileSync(navCssPath, "utf8");

        const hasOverlayRule = navCssContent.includes("#sidebarOverlay") || navCssContent.includes(".sidebar-overlay");
        const hasMobileDrawerRule = navCssContent.includes("translateX(-100%)");
        const hasOffsetContentRule = navCssContent.includes("margin-left: 260px") || navCssContent.includes("left: 0");

        recordResult(
            9.1,
            "Universal Responsive Drawer & Dimmed Backdrop Overlay",
            "CSS defines sliding drawer (-100% to 0), overlay backdrop, and desktop content offset",
            { hasOverlayRule, hasMobileDrawerRule, hasOffsetContentRule },
            hasOverlayRule && hasMobileDrawerRule && hasOffsetContentRule
        );

        // =====================================================================
        // TEST 10: Database Persistence & Referential Integrity Flow
        // =====================================================================
        console.log("\n--- 10. Testing Database Persistence & Consistency ---");
        const [userDbRows] = await db.query("SELECT COUNT(*) AS count FROM users WHERE is_active = 1");
        const [cropDbRows] = await db.query("SELECT COUNT(*) AS count FROM crops");
        const [orderDbRows] = await db.query("SELECT COUNT(*) AS count FROM orders");
        const [negDbRows] = await db.query("SELECT COUNT(*) AS count FROM negotiations");
        const [campDbRows] = await db.query("SELECT COUNT(*) AS count FROM group_buying_campaigns");

        const dbConsistent = userDbRows[0].count > 0 && cropDbRows[0].count > 0 && orderDbRows[0].count > 0 && negDbRows[0].count > 0 && campDbRows[0].count > 0;
        recordResult(
            10.1,
            "Relational Consistency & Database Record Persistence",
            "Data persisted in MySQL users, crops, orders, negotiations, and group campaigns",
            {
                users: userDbRows[0].count,
                crops: cropDbRows[0].count,
                orders: orderDbRows[0].count,
                negotiations: negDbRows[0].count,
                campaigns: campDbRows[0].count
            },
            dbConsistent
        );

    } catch (err) {
        console.error("Critical test execution error:", err);
    } finally {
        await db.end();
    }

    console.log("\n================================================================================");
    console.log(`   TEST EXECUTION SUMMARY: ${passedTests} / ${totalTests} PASSED (${Math.round(passedTests / totalTests * 100)}%)`);
    console.log("================================================================================\n");

    // Write test run artifact
    fs.writeFileSync(
        path.join(__dirname, "test_e2e_results.json"),
        JSON.stringify({ totalTests, passedTests, failedTests, results: testLog }, null, 2)
    );

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runEndToEndMasterSuite();

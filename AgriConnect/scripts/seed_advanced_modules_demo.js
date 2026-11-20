const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const { Jimp } = require("jimp");

async function generateDemoImage(filePath, width, height, hexColor) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const img = new Jimp({ width, height, color: hexColor });
        await img.write(filePath);
        console.log(`Generated demo image: ${path.basename(filePath)}`);
    } catch (e) {
        console.warn(`Could not generate image: ${e.message}`);
    }
}

async function seed() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "agriconnect",
        port: Number(process.env.DB_PORT) || 3306,
        multipleStatements: true
    });

    console.log("Seeding Advanced Marketplace Modules Demo Data...");

    const passwordHash = await bcrypt.hash("password123", 10);

    // 1. Ensure Additional Demo Buyers Exist
    const buyers = [
        { email: "buyer2@agriconnect.com", first: "Priya", last: "Wholesale Mart", phone: "9876543222", address: "Chennai, TN" },
        { email: "buyer3@agriconnect.com", first: "Karthik", last: "Supermarket", phone: "9876543223", address: "Coimbatore, TN" },
        { email: "buyer4@agriconnect.com", first: "Anand", last: "Agro Retail", phone: "9876543224", address: "Madurai, TN" }
    ];

    const buyerIds = {};

    // Get existing Demo Buyer 1
    const [b1Rows] = await db.query("SELECT id FROM users WHERE email = 'buyer@agriconnect.com'");
    if (b1Rows.length > 0) {
        buyerIds["buyer1"] = b1Rows[0].id;
    }

    for (let i = 0; i < buyers.length; i++) {
        const b = buyers[i];
        const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [b.email]);
        if (existing.length > 0) {
            buyerIds[`buyer${i + 2}`] = existing[0].id;
        } else {
            const [uRes] = await db.query(
                "INSERT INTO users (first_name, last_name, phone, email, password, address, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
                [b.first, b.last, b.phone, b.email, passwordHash, b.address]
            );
            const uid = uRes.insertId;
            await db.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'buyer')", [uid]);
            await db.query("INSERT INTO buyer_profiles (user_id, phone, district) VALUES (?, ?, 'Chennai')", [uid, b.phone]);
            buyerIds[`buyer${i + 2}`] = uid;
            console.log(`Created demo buyer account: ${b.email} (ID: ${uid})`);
        }
    }

    // 2. Fetch Farmer ID and Tomatoes Crop
    const [fRows] = await db.query("SELECT id FROM users WHERE email = 'farmer@agriconnect.com'");
    const farmerId = fRows[0]?.id || 27;

    // Update Crop 2 (Tomatoes) asking price to ₹50/kg and quantity to 1000 kg for demo
    await db.query(
        "UPDATE crops SET price_per_kg = 50.00, quantity = 1000.00, crop_name = 'Tomatoes', specific_name = 'Organic Country Tomatoes' WHERE id = 2"
    );

    // 3. Module 2 Demo: Generate Multi-Images for Crop 2
    const uploadDir = path.join(__dirname, "..", "uploads", "crops");
    const img1 = path.join(uploadDir, "demo_tomato_primary.png");
    const img2 = path.join(uploadDir, "demo_tomato_crate.png");
    const img3 = path.join(uploadDir, "demo_tomato_closeup.png");

    await generateDemoImage(img1, 400, 300, 0xd32f2fff); // Red
    await generateDemoImage(img2, 400, 300, 0xc2185bff); // Dark red/crate
    await generateDemoImage(img3, 400, 300, 0xe53935ff); // Bright red

    // Clear old crop_images for crop 2 to keep demo clean
    await db.query("DELETE FROM crop_images WHERE crop_id = 2");
    await db.query(
        "INSERT INTO crop_images (crop_id, image_path, is_primary) VALUES (?, ?, 1), (?, ?, 0), (?, ?, 0)",
        [2, "/uploads/crops/demo_tomato_primary.png", 2, "/uploads/crops/demo_tomato_crate.png", 2, "/uploads/crops/demo_tomato_closeup.png"]
    );
    await db.query("UPDATE crops SET image = '/uploads/crops/demo_tomato_primary.png' WHERE id = 2");
    console.log("Seeded multi-image gallery for Crop 2 (Tomatoes)");

    // 4. Module 1 Demo: Seed Price Negotiation
    // Clean prior demo negotiation for crop 2 if any
    await db.query("DELETE FROM negotiations WHERE crop_id = 2 AND buyer_id = ?", [buyerIds["buyer1"]]);

    const [negRes] = await db.query(`
        INSERT INTO negotiations
        (crop_id, farmer_id, buyer_id, quantity, asking_price, offered_price, current_counter_price, final_agreed_price, market_reference_price, min_acceptable_price, status, notes)
        VALUES (?, ?, ?, 100.00, 50.00, 42.00, 47.00, 47.00, 48.00, 40.00, 'accepted', 'Wholesale batch order for weekly market supply')
    `, [2, farmerId, buyerIds["buyer1"]]);

    const negId = negRes.insertId;

    await db.query(`
        INSERT INTO negotiation_messages
        (negotiation_id, sender_id, sender_role, message_type, price, message, created_at)
        VALUES
        (?, ?, 'buyer', 'offer', 42.00, 'I want 100 kg tomatoes at ₹42/kg for wholesale distribution.', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
        (?, 0, 'system', 'system_suggestion', 46.00, 'The asking price is ₹50/kg. Based on 100 kg wholesale volume and market reference rate ₹48/kg, a recommended fair counteroffer is ₹46/kg.', DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
        (?, ?, 'farmer', 'counteroffer', 47.00, 'I can offer ₹47/kg for freshly harvested high-grade organic tomatoes.', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
        (?, ?, 'buyer', 'accept', 47.00, 'I accept at ₹47/kg. Deal confirmed!', DATE_SUB(NOW(), INTERVAL 5 MINUTE))
    `, [
        negId, buyerIds["buyer1"],
        negId,
        negId, farmerId,
        negId, buyerIds["buyer1"]
    ]);
    console.log(`Seeded Demo Negotiation #${negId} (Accepted @ ₹47/kg)`);

    // 5. Module 3 Demo: Seed Group Buying Campaign & Commitments
    // Clean prior demo campaign
    await db.query("DELETE FROM group_buying_campaigns WHERE crop_id = 2 AND farmer_id = ?", [farmerId]);

    const today = new Date().toISOString().split("T")[0];
    const expiry = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split("T")[0];

    const [gbRes] = await db.query(`
        INSERT INTO group_buying_campaigns
        (farmer_id, crop_id, title, description, original_price, group_price, min_target_quantity, max_available_quantity, current_committed_quantity, min_per_buyer, max_per_buyer, start_date, end_date, status)
        VALUES
        (?, 2, 'Fresh Country Tomatoes - Wholesale Group Pool', 'Direct farm harvest pooling! Join forces with fellow buyers to unlock wholesale price of ₹40/kg when pool hits 500 kg total.', 50.00, 40.00, 500.00, 1000.00, 500.00, 10.00, 250.00, ?, ?, 'target_reached')
    `, [farmerId, today, expiry]);

    const campaignId = gbRes.insertId;

    // 4 Buyers participate to reach exactly 500 kg
    const commitments = [
        { buyer: buyerIds["buyer1"], qty: 100.00, note: "Priya Stores Batch 1" },
        { buyer: buyerIds["buyer2"], qty: 150.00, note: "Wholesale Mart Order" },
        { buyer: buyerIds["buyer3"], qty: 200.00, note: "Supermarket Weekly Restock" },
        { buyer: buyerIds["buyer4"], qty: 50.00, note: "Retail Outlet Commitment" }
    ];

    for (const c of commitments) {
        await db.query(`
            INSERT INTO group_buying_commitments
            (campaign_id, buyer_id, quantity, unit_price, total_amount, status, notes)
            VALUES (?, ?, ?, 40.00, ?, 'committed', ?)
        `, [campaignId, c.buyer, c.qty, c.qty * 40.00, c.note]);
    }
    console.log(`Seeded Demo Group Buying Campaign #${campaignId} (500 kg Target Reached with 4 buyers)`);

    console.log("All Demonstration Sample Data Seeded Successfully!");
    await db.end();
}

seed().catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
});

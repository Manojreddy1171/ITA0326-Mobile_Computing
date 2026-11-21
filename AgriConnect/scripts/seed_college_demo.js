const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

async function seedCollegeDemo() {
    console.log("================================================================================");
    console.log("   SEEDING COLLEGE DEMONSTRATION DATA (FARMERS, CROPS, EQUIPMENT)               ");
    console.log("================================================================================\n");

    const db = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "root123",
        database: "agriconnect",
        port: 3306
    });

    const passwordHash = await bcrypt.hash("password123", 10);

    try {
        // 1. Ensure Verified Farmers: Ramesh, Ravi, Suresh
        const farmers = [
            { first: "Ramesh", last: "Kumar", email: "farmer@agriconnect.com", phone: "9876543210", state: "Tamil Nadu", district: "Coimbatore" },
            { first: "Ravi", last: "Teja", email: "ravi.farmer@agriconnect.com", phone: "9876543288", state: "Andhra Pradesh", district: "Kurnool" },
            { first: "Suresh", last: "Gowda", email: "suresh.farmer@agriconnect.com", phone: "9876543289", state: "Karnataka", district: "Mandya" }
        ];

        const farmerIds = {};
        for (const f of farmers) {
            const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [f.email]);
            let uid;
            if (existing.length > 0) {
                uid = existing[0].id;
                await db.query("UPDATE users SET first_name = ?, last_name = ?, is_active = 1 WHERE id = ?", [f.first, f.last, uid]);
            } else {
                const [res] = await db.query(
                    "INSERT INTO users (first_name, last_name, phone, email, password, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())",
                    [f.first, f.last, f.phone, f.email, passwordHash]
                );
                uid = res.insertId;
                await db.query("INSERT INTO user_roles (user_id, role) VALUES (?, 'farmer'), (?, 'buyer')", [uid, uid]);
            }
            farmerIds[f.first] = uid;

            // Ensure profile
            const [pRows] = await db.query("SELECT id FROM farmer_profiles WHERE user_id = ?", [uid]);
            if (pRows.length === 0) {
                await db.query("INSERT INTO farmer_profiles (user_id, phone, district) VALUES (?, ?, ?)", [uid, f.phone, f.district]);
            }
            console.log(`  [OK] Farmer ${f.first} (${f.state}) ready (User ID: ${uid})`);
        }

        // 2. Ensure Example Products: Tomatoes, Onions, Rice, Potatoes, Wheat, Mangoes
        const demoCrops = [
            { farmer: "Ramesh", name: "Tomatoes", specific: "Hybrid Roma Tomatoes", price: 50.00, qty: 500, img: "demo_tomato_primary.png", desc: "Grade-A naturally ripened firm red tomatoes." },
            { farmer: "Ravi", name: "Onions", specific: "Nashik Red Onion", price: 35.00, qty: 800, img: "demo_onion.png", desc: "Crisp, pungent red onions with low moisture content." },
            { farmer: "Suresh", name: "Rice", specific: "Sona Masoori Raw Rice", price: 58.00, qty: 1200, img: "demo_rice.png", desc: "Aromatic aged staple rice directly milled from Mandya." },
            { farmer: "Ramesh", name: "Potatoes", specific: "Jyoti Large Potatoes", price: 28.00, qty: 650, img: "demo_potato.png", desc: "Fresh harvest high-starch culinary potatoes." },
            { farmer: "Ravi", name: "Wheat", specific: "Sharbati Golden Wheat", price: 42.00, qty: 900, img: "demo_wheat.png", desc: "Cleaned heavy-grain premium golden wheat." },
            { farmer: "Suresh", name: "Mangoes", specific: "Alphonso / Badami Mangoes", price: 120.00, qty: 300, img: "demo_mango.png", desc: "Sweet naturally carbide-free orchard mangoes." }
        ];

        for (const c of demoCrops) {
            const fid = farmerIds[c.farmer] || 27;
            const [cExisting] = await db.query("SELECT id FROM crops WHERE crop_name = ? AND farmer_id = ?", [c.name, fid]);
            if (cExisting.length === 0) {
                await db.query(
                    `INSERT INTO crops (farmer_id, crop_name, specific_name, harvested_date, price_per_kg, quantity, description, image, created_at)
                     VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, NOW())`,
                    [fid, c.name, c.specific, c.price, c.qty, c.desc, c.img]
                );
                console.log(`  [OK] Inserted product: ${c.name} by Farmer ${c.farmer}`);
            } else {
                console.log(`  [OK] Product already active: ${c.name}`);
            }
        }

        // 3. Ensure Equipment: Tractor, Harvester, Water Pump, Rotavator
        const demoEquipment = [
            { name: "Shaktiman Rotary Tiller (Rotavator)", cat: "Rotavator", price: 800.00, qty: 2, img: "uploads/demo_rotavator.png", desc: "Heavy-duty 42-blade rotavator for complete seedbed preparation." }
        ];

        for (const eq of demoEquipment) {
            const [eqExisting] = await db.query("SELECT id FROM equipment WHERE category = ?", [eq.cat]);
            if (eqExisting.length === 0) {
                await db.query(
                    `INSERT INTO equipment (provider_id, equipment_name, category, quantity, garage_quantity, description, rental_price, price_unit, availability_status, image, created_at)
                     VALUES (29, ?, ?, ?, ?, ?, ?, 'day', 'available', ?, NOW())`,
                    [eq.name, eq.cat, eq.qty, eq.qty, eq.desc, eq.price, eq.img]
                );
                console.log(`  [OK] Inserted equipment: ${eq.name}`);
            } else {
                console.log(`  [OK] Equipment already active: ${eq.cat}`);
            }
        }

        console.log("\n================================================================================");
        console.log("   COLLEGE DEMONSTRATION DATA SEEDING COMPLETE! (100% SUCCESS)                  ");
        console.log("================================================================================\n");

    } catch (e) {
        console.error("Seed error:", e);
    } finally {
        await db.end();
        process.exit(0);
    }
}

seedCollegeDemo();

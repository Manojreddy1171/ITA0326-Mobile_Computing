const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { Jimp } = require('jimp');

async function createPlaceholderImage(filePath, width, height, hexColor) {
    try {
        const image = new Jimp({ width, height, color: hexColor });
        await image.write(filePath);
        console.log(`Generated demo image: ${path.basename(filePath)}`);
    } catch (e) {
        console.warn(`Could not generate image ${filePath}:`, e.message);
    }
}

async function ensureColumnExists(db, dbName, tableName, columnName, columnDefinition) {
    const [cols] = await db.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, tableName, columnName]
    );
    if (cols.length === 0) {
        console.log(`Adding missing column ${tableName}.${columnName}...`);
        await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
    }
}

async function run() {
    console.log('Connecting to MySQL on port', process.env.DB_PORT || 3306, '...');
    const rootConn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 3306,
        multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'agriconnect';
    console.log(`Creating database ${dbName} if not exists...`);
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: dbName,
        port: Number(process.env.DB_PORT) || 3306,
        multipleStatements: true
    });

    console.log('Running database schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    await db.query(schemaSql);

    console.log('Checking and adding columns required by migrations...');
    await ensureColumnExists(db, dbName, 'conversations', 'completed_by_user_one_at', 'DATETIME NULL');
    await ensureColumnExists(db, dbName, 'conversations', 'completed_by_user_two_at', 'DATETIME NULL');
    await ensureColumnExists(db, dbName, 'equipment', 'quantity', 'INT NOT NULL DEFAULT 1 AFTER category');
    await ensureColumnExists(db, dbName, 'equipment', 'garage_quantity', 'INT NOT NULL DEFAULT 0 AFTER quantity');
    await ensureColumnExists(db, dbName, 'users', 'last_seen_at', 'DATETIME NULL');
    await ensureColumnExists(db, dbName, 'users', 'score', 'INT NOT NULL DEFAULT 100');
    await ensureColumnExists(db, dbName, 'users', 'deactivated_at', 'DATETIME NULL');
    await ensureColumnExists(db, dbName, 'users', 'profile_picture', 'VARCHAR(255) NULL');
    await ensureColumnExists(db, dbName, 'users', 'preferred_language', "VARCHAR(10) NOT NULL DEFAULT 'en'");
    await ensureColumnExists(db, dbName, 'rentals', 'completed_by_farmer_at', 'DATETIME NULL');
    await ensureColumnExists(db, dbName, 'rentals', 'completed_by_provider_at', 'DATETIME NULL');
    await ensureColumnExists(db, dbName, 'expert_profiles', 'district', 'VARCHAR(100) NULL');

    // Run other migrations safely
    const migrationFiles = [
        'extend_rental_status.sql',
        'fix_notifications_type_enum.sql',
        'fix_reports_cascade.sql',
        'create_admin_account.sql',
        'resources_seed.sql'
    ];

    for (const file of migrationFiles) {
        const filePath = path.join(__dirname, '..', 'database', file);
        if (fs.existsSync(filePath)) {
            const sql = fs.readFileSync(filePath, 'utf8');
            try {
                await db.query(sql);
                console.log(`Applied: ${file}`);
            } catch (err) {
                console.warn(`Notice for ${file}:`, err.message);
            }
        }
    }

    // Seed Demo Users
    console.log('Seeding demo accounts and data...');
    const hashedPw = await bcrypt.hash('password123', 10);

    // 1. Farmer: Demo Farmer
    const [existingFarmer] = await db.query(`SELECT id FROM users WHERE email = 'farmer@agriconnect.com' OR phone = '9876543210'`);
    let farmerId;
    if (existingFarmer.length === 0) {
        const [res] = await db.query(`
            INSERT INTO users (first_name, last_name, phone, email, password, address, nic_front, nic_back, is_active, score)
            VALUES ('Demo', 'Farmer', '9876543210', 'farmer@agriconnect.com', ?, 'Green Valley Farms, Thanjavur, Tamil Nadu', 'uploads/nic_front.png', 'uploads/nic_back.png', 1, 100)
        `, [hashedPw]);
        farmerId = res.insertId;
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES (?, 'farmer'), (?, 'buyer')`, [farmerId, farmerId]);
        await db.query(`INSERT INTO farmer_profiles (user_id, phone, district) VALUES (?, '9876543210', 'Tamil Nadu')`, [farmerId]);
        await db.query(`INSERT INTO buyer_profiles (user_id, phone, district) VALUES (?, '9876543210', 'Tamil Nadu')`, [farmerId]);
    } else {
        farmerId = existingFarmer[0].id;
        await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPw, farmerId]);
    }

    // 2. Buyer: Demo Buyer
    const [existingBuyer] = await db.query(`SELECT id FROM users WHERE email = 'buyer@agriconnect.com' OR phone = '9876543211'`);
    let buyerId;
    if (existingBuyer.length === 0) {
        const [res] = await db.query(`
            INSERT INTO users (first_name, last_name, phone, email, password, address, nic_front, nic_back, is_active, score)
            VALUES ('Demo', 'Buyer', '9876543211', 'buyer@agriconnect.com', ?, 'Anna Nagar, Chennai, Tamil Nadu', 'uploads/nic_front.png', 'uploads/nic_back.png', 1, 100)
        `, [hashedPw]);
        buyerId = res.insertId;
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES (?, 'buyer')`, [buyerId]);
        await db.query(`INSERT INTO buyer_profiles (user_id, phone, district) VALUES (?, '9876543211', 'Chennai')`, [buyerId]);
    } else {
        buyerId = existingBuyer[0].id;
        await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPw, buyerId]);
    }

    // 3. Equipment Provider
    const [existingProvider] = await db.query(`SELECT id FROM users WHERE email = 'equipment@agriconnect.com' OR phone = '9876543212'`);
    let providerId;
    if (existingProvider.length === 0) {
        const [res] = await db.query(`
            INSERT INTO users (first_name, last_name, phone, email, password, address, nic_front, nic_back, is_active, score)
            VALUES ('Demo', 'Provider', '9876543212', 'equipment@agriconnect.com', ?, 'Industrial Estate, Coimbatore, Tamil Nadu', 'uploads/nic_front.png', 'uploads/nic_back.png', 1, 100)
        `, [hashedPw]);
        providerId = res.insertId;
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES (?, 'equipment_provider'), (?, 'buyer')`, [providerId, providerId]);
        await db.query(`
            INSERT INTO equipment_provider_profiles (user_id, phone, district, business_name, business_description, approval_status)
            VALUES (?, '9876543212', 'Tamil Nadu', 'AgriTech Rentals & Machinery', 'Providing modern agricultural machinery to farmers across Tamil Nadu.', 'approved')
        `, [providerId]);
        await db.query(`INSERT INTO buyer_profiles (user_id, phone, district) VALUES (?, '9876543212', 'Tamil Nadu')`, [providerId]);
    } else {
        providerId = existingProvider[0].id;
        await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPw, providerId]);
    }

    // 4. Expert
    const [existingExpert] = await db.query(`SELECT id FROM users WHERE email = 'expert@agriconnect.com' OR phone = '9876543213'`);
    let expertId;
    if (existingExpert.length === 0) {
        const [res] = await db.query(`
            INSERT INTO users (first_name, last_name, phone, email, password, address, nic_front, nic_back, is_active, score)
            VALUES ('Dr. Demo', 'Agronomist', '9876543213', 'expert@agriconnect.com', ?, 'TNAU Campus, Coimbatore, Tamil Nadu', 'uploads/nic_front.png', 'uploads/nic_back.png', 1, 100)
        `, [hashedPw]);
        expertId = res.insertId;
        await db.query(`INSERT INTO user_roles (user_id, role) VALUES (?, 'expert'), (?, 'buyer')`, [expertId, expertId]);
        await db.query(`
            INSERT INTO expert_profiles (user_id, phone, district, specialization, qualification, experience_years, bio, approval_status)
            VALUES (?, '9876543213', 'Tamil Nadu', 'Pest Control & Crop Health', 'Ph.D. in Agronomy', 15, 'Senior agronomist dedicated to sustainable farming practices.', 'approved')
        `, [expertId]);
        await db.query(`INSERT INTO buyer_profiles (user_id, phone, district) VALUES (?, '9876543213', 'Tamil Nadu')`, [expertId]);
    } else {
        expertId = existingExpert[0].id;
        await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPw, expertId]);
    }

    // Ensure upload dir and generate demo images
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    await createPlaceholderImage(path.join(uploadsDir, 'demo_rice.png'), 400, 300, 0xd4a373ff); // warm grain/gold
    await createPlaceholderImage(path.join(uploadsDir, 'demo_tomatoes.png'), 400, 300, 0xef233cff); // tomato red
    await createPlaceholderImage(path.join(uploadsDir, 'demo_onions.png'), 400, 300, 0x7209b7ff); // onion purple
    await createPlaceholderImage(path.join(uploadsDir, 'demo_tractor.png'), 400, 300, 0x2b9348ff); // tractor green
    await createPlaceholderImage(path.join(uploadsDir, 'demo_harvester.png'), 400, 300, 0x0077b6ff); // harvester blue
    await createPlaceholderImage(path.join(uploadsDir, 'demo_pump.png'), 400, 300, 0xf77f00ff); // pump orange

    // Crops for Demo Farmer
    const [cropsCount] = await db.query(`SELECT COUNT(*) as cnt FROM crops WHERE farmer_id = ?`, [farmerId]);
    let riceCropId;
    if (cropsCount[0].cnt === 0) {
        const [c1] = await db.query(`
            INSERT INTO crops (farmer_id, crop_name, specific_name, harvested_date, price_per_kg, quantity, description, image)
            VALUES (?, 'Rice', 'Ponni Samba Rice', '2026-11-01', 65.00, 500.00, 'Freshly harvested premium quality Ponni Samba rice from Tamil Nadu fields. Sorted and dried.', 'uploads/demo_rice.png')
        `, [farmerId]);
        riceCropId = c1.insertId;

        await db.query(`
            INSERT INTO crops (farmer_id, crop_name, specific_name, harvested_date, price_per_kg, quantity, description, image)
            VALUES (?, 'Tomatoes', 'Organic Country Tomatoes', '2026-11-15', 35.00, 200.00, 'Farm fresh vine-ripened red country tomatoes (Naatu Thakkali) with rich flavor.', 'uploads/demo_tomatoes.png')
        `, [farmerId]);

        await db.query(`
            INSERT INTO crops (farmer_id, crop_name, specific_name, harvested_date, price_per_kg, quantity, description, image)
            VALUES (?, 'Onions', 'Small Red Shallots', '2026-11-10', 45.00, 350.00, 'Sun-cured premium small red onions from Dindigul, Tamil Nadu. Crisp and aromatic.', 'uploads/demo_onions.png')
        `, [farmerId]);
    } else {
        const [existingCrops] = await db.query(`SELECT id FROM crops WHERE farmer_id = ? LIMIT 1`, [farmerId]);
        riceCropId = existingCrops[0].id;
    }

    // Equipment Listings for Demo Provider
    const [equipCount] = await db.query(`SELECT COUNT(*) as cnt FROM equipment WHERE provider_id = ?`, [providerId]);
    if (equipCount[0].cnt === 0) {
        await db.query(`
            INSERT INTO equipment (provider_id, equipment_name, category, description, rental_price, price_unit, availability_status, quantity, garage_quantity, image)
            VALUES (?, 'Mahindra 575 DI Tractor', 'Tractor', '45 HP heavy duty tractor with rotavator and cultivator attachments. Ideal for all soil types.', 1200.00, 'day', 'available', 2, 2, 'uploads/demo_tractor.png')
        `, [providerId]);

        await db.query(`
            INSERT INTO equipment (provider_id, equipment_name, category, description, rental_price, price_unit, availability_status, quantity, garage_quantity, image)
            VALUES (?, 'Kubota Combine Harvester', 'Harvester', 'High-speed paddy and grain combine harvester. Minimal grain loss and smooth field maneuverability.', 3500.00, 'day', 'available', 1, 1, 'uploads/demo_harvester.png')
        `, [providerId]);

        await db.query(`
            INSERT INTO equipment (provider_id, equipment_name, category, description, rental_price, price_unit, availability_status, quantity, garage_quantity, image)
            VALUES (?, 'Kirloskar Diesel Water Pump', 'Water Pump', '5 HP portable diesel water pump for field irrigation and rapid water delivery. Hoses included.', 450.00, 'day', 'available', 3, 3, 'uploads/demo_pump.png')
        `, [providerId]);
    }

    // Sample Order from Demo Buyer to Demo Farmer
    const [orderCount] = await db.query(`SELECT COUNT(*) as cnt FROM orders WHERE buyer_id = ?`, [buyerId]);
    if (orderCount[0].cnt === 0 && riceCropId) {
        await db.query(`
            INSERT INTO orders (buyer_id, farmer_id, crop_id, quantity, price_per_kg, total_amount, delivery_address, status)
            VALUES (?, ?, ?, 50.00, 65.00, 3250.00, '42 Anna Nagar 2nd Avenue, Chennai, Tamil Nadu', 'accepted')
        `, [buyerId, farmerId, riceCropId]);
    }

    // Sample Activities for Demo Farmer's Calendar
    const [actCount] = await db.query(`SELECT COUNT(*) as cnt FROM activities WHERE user_id = ?`, [farmerId]);
    if (actCount[0].cnt === 0) {
        await db.query(`
            INSERT INTO activities (user_id, title, description, activity_date, activity_type, status)
            VALUES 
            (?, 'Samba Paddy Irrigation', 'First round of canal water irrigation for the eastern paddy field', '2026-11-20', 'Irrigation', 'pending'),
            (?, 'Organic Neem Cake Fertilizer', 'Apply organic neem cake and bio-fertilizer to tomato crop', '2026-11-22', 'Fertilizer', 'pending'),
            (?, 'Onion Harvest Inspection', 'Inspect onion field maturity and prepare crates for transport', '2026-11-25', 'Harvesting', 'pending')
        `, [farmerId, farmerId, farmerId]);
    }

    console.log('Database initialization and demo seeding finished successfully!');
    await db.end();
}

run().catch(err => {
    console.error('Database setup failed:', err);
    process.exit(1);
});

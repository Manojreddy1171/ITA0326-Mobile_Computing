const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'agriconnect',
        port: Number(process.env.DB_PORT) || 3306,
        multipleStatements: true
    });

    console.log('Applying advanced modules migration...');
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'add_advanced_marketplace_modules.sql'), 'utf8');
    await db.query(sql);

    // Ensure is_primary column in crop_images
    const [cols] = await db.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'crop_images' AND COLUMN_NAME = 'is_primary'",
        [process.env.DB_NAME || 'agriconnect']
    );
    if (cols.length === 0) {
        console.log('Adding is_primary column to crop_images...');
        await db.query('ALTER TABLE `crop_images` ADD COLUMN `is_primary` TINYINT(1) NOT NULL DEFAULT 0 AFTER `image_path`');
    }

    console.log('Migration completed successfully!');
    await db.end();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

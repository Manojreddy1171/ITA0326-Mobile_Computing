require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wholesalehub',
    multipleStatements: true,
    timezone: '+05:30',
  });

  try {
    console.log('🌱 Seeding database...');

    // Clear existing data
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0`);
    await conn.query(`TRUNCATE TABLE notifications`);
    await conn.query(`TRUNCATE TABLE order_items`);
    await conn.query(`TRUNCATE TABLE orders`);
    await conn.query(`TRUNCATE TABLE pool_members`);
    await conn.query(`TRUNCATE TABLE group_pools`);
    await conn.query(`TRUNCATE TABLE offers`);
    await conn.query(`TRUNCATE TABLE product_images`);
    await conn.query(`TRUNCATE TABLE products`);
    await conn.query(`TRUNCATE TABLE categories`);
    await conn.query(`TRUNCATE TABLE users`);
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1`);

    // Categories
    const categories = [
      { name: 'Grocery & Staples', slug: 'grocery', icon: '🛒' },
      { name: 'FMCG', slug: 'fmcg', icon: '🧴' },
      { name: 'Apparel & Textiles', slug: 'apparel', icon: '👕' },
      { name: 'Electronics', slug: 'electronics', icon: '📱' },
      { name: 'Kitchenware', slug: 'kitchenware', icon: '🍳' },
      { name: 'Personal Care', slug: 'personal-care', icon: '🧼' },
      { name: 'Stationery', slug: 'stationery', icon: '📝' },
      { name: 'Agri & Seeds', slug: 'agri', icon: '🌾' },
    ];
    for (const cat of categories) {
      await conn.query(
        `INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)`,
        [cat.name, cat.slug, cat.icon]
      );
    }
    console.log('✅ Categories seeded');

    // Password for all users
    const password = await bcrypt.hash('Password@123', 10);

    // Sellers
    const sellers = [
      {
        uuid: uuidv4(), name: 'Ramesh Wholesale Traders', email: 'ramesh@wholesalehub.in',
        phone: '9876543210', business_name: 'Ramesh Wholesale Traders',
        gstin: '29AABCT1332L1ZV', city: 'Mumbai', state: 'Maharashtra', pincode: '400001',
      },
      {
        uuid: uuidv4(), name: 'Priya Enterprises', email: 'priya@wholesalehub.in',
        phone: '9812345678', business_name: 'Priya Enterprises Pvt Ltd',
        gstin: '07AAACR5055K1Z5', city: 'Delhi', state: 'Delhi', pincode: '110001',
      },
      {
        uuid: uuidv4(), name: 'Suresh Distributors', email: 'suresh@wholesalehub.in',
        phone: '9765432109', business_name: 'Suresh Distributors & Co',
        gstin: '33AABCU9603R1ZX', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001',
      },
    ];
    const sellerIds = [];
    for (const s of sellers) {
      const [res] = await conn.query(
        `INSERT INTO users (uuid, name, email, password_hash, role, phone, business_name, gstin, city, state, pincode, is_verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)`,
        [s.uuid, s.name, s.email, password, 'seller', s.phone, s.business_name, s.gstin, s.city, s.state, s.pincode]
      );
      sellerIds.push(res.insertId);
    }
    console.log('✅ Sellers seeded');

    // Buyers
    const buyers = [
      { uuid: uuidv4(), name: 'Anil Kumar', email: 'anil@buyer.in', phone: '9988776655', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      { uuid: uuidv4(), name: 'Meena Sharma', email: 'meena@buyer.in', phone: '9977665544', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      { uuid: uuidv4(), name: 'Ravi Patel', email: 'ravi@buyer.in', phone: '9966554433', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
      { uuid: uuidv4(), name: 'Sunita Reddy', email: 'sunita@buyer.in', phone: '9955443322', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
      { uuid: uuidv4(), name: 'Deepak Singh', email: 'deepak@buyer.in', phone: '9944332211', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001' },
    ];
    const buyerIds = [];
    for (const b of buyers) {
      const [res] = await conn.query(
        `INSERT INTO users (uuid, name, email, password_hash, role, phone, city, state, pincode, is_verified) VALUES (?,?,?,?,?,?,?,?,?,1)`,
        [b.uuid, b.name, b.email, password, 'buyer', b.phone, b.city, b.state, b.pincode]
      );
      buyerIds.push(res.insertId);
    }
    console.log('✅ Buyers seeded');

    // Products (30 realistic Indian wholesale products)
    const products = [
      // Seller 0 - Ramesh (Mumbai)
      { seller: 0, cat: 'grocery', name: 'Tata Salt Premium Iodized', brand: 'Tata', unit: 'kg bag', list_price: 22, moq: 100, min_price: 18, stock: 5000, negotiable: true, group_buy: true, desc: 'Premium iodized salt, 1kg pack. Ideal for retail stores and restaurants. Hygienic and pure.' },
      { seller: 0, cat: 'grocery', name: 'Aashirvaad Atta Whole Wheat', brand: 'Aashirvaad', unit: 'kg bag', list_price: 52, moq: 50, min_price: 45, stock: 3000, negotiable: true, group_buy: true, desc: 'Whole wheat atta with natural goodness. 5kg pack. Perfect for kirana stores.' },
      { seller: 0, cat: 'grocery', name: 'Fortune Sunflower Oil', brand: 'Fortune', unit: 'litre bottle', list_price: 135, moq: 50, min_price: 120, stock: 2000, negotiable: true, group_buy: false, desc: 'Refined sunflower oil in 1L bottle. Light on the stomach, rich in Vitamin E.' },
      { seller: 0, cat: 'grocery', name: 'India Gate Basmati Rice', brand: 'India Gate', unit: 'kg bag', list_price: 88, moq: 50, min_price: 78, stock: 2500, negotiable: true, group_buy: true, desc: 'Classic Basmati Rice 5kg pack, long grain, aged rice. Perfect for restaurants and retailers.' },
      { seller: 0, cat: 'grocery', name: 'MDH Garam Masala', brand: 'MDH', unit: '100g packet', list_price: 75, moq: 100, min_price: 65, stock: 4000, negotiable: false, group_buy: false, desc: 'Authentic Delhi spice blend. Pack of 100g. Made with natural ingredients.' },
      { seller: 0, cat: 'fmcg', name: 'Surf Excel Quick Wash', brand: 'Hindustan Unilever', unit: 'kg pack', list_price: 130, moq: 50, min_price: 115, stock: 3000, negotiable: true, group_buy: true, desc: 'Detergent powder for top-load and semi-automatic washing machines. 1kg pack.' },
      { seller: 0, cat: 'fmcg', name: 'Vim Dishwash Bar', brand: 'Hindustan Unilever', unit: 'piece', list_price: 30, moq: 200, min_price: 25, stock: 10000, negotiable: false, group_buy: false, desc: 'Lime-infused dishwash bar. 200g. Cuts through grease effectively.' },
      { seller: 0, cat: 'fmcg', name: 'Colgate MaxFresh Toothpaste', brand: 'Colgate', unit: '150g tube', list_price: 90, moq: 100, min_price: 78, stock: 5000, negotiable: true, group_buy: true, desc: 'Fluoride toothpaste with mint flavor. 150g tube. Wholesale carton of 12.' },
      { seller: 0, cat: 'fmcg', name: 'Dettol Liquid Handwash', brand: 'Dettol', unit: '250ml bottle', list_price: 85, moq: 50, min_price: 72, stock: 3000, negotiable: true, group_buy: false, desc: 'Antibacterial liquid handwash. 250ml. Original pine fragrance.' },
      { seller: 0, cat: 'fmcg', name: 'Parachute Coconut Oil', brand: 'Marico', unit: '500ml jar', list_price: 145, moq: 50, min_price: 128, stock: 2500, negotiable: true, group_buy: false, desc: 'Pure coconut oil in 500ml jar. 100% natural, cold-pressed.' },

      // Seller 1 - Priya (Delhi)
      { seller: 1, cat: 'apparel', name: 'Men\'s Plain Cotton T-Shirt', brand: 'InHouse Brand', unit: 'piece', list_price: 180, moq: 50, min_price: 145, stock: 2000, negotiable: true, group_buy: true, desc: 'Round-neck cotton T-shirt for men. Available in assorted colors. 180 GSM fabric.' },
      { seller: 1, cat: 'apparel', name: 'Women\'s Kurti Set', brand: 'Ethnic Wear', unit: 'piece', list_price: 350, moq: 25, min_price: 290, stock: 1000, negotiable: true, group_buy: false, desc: 'Printed cotton kurti set. Assorted prints. Sizes S to XXL available.' },
      { seller: 1, cat: 'apparel', name: 'Kids School Socks (Pack of 6)', brand: 'Rupa', unit: 'pack', list_price: 120, moq: 100, min_price: 98, stock: 5000, negotiable: false, group_buy: true, desc: 'White ankle socks for school use. Cotton blend, elastic top. Pack of 6 pairs.' },
      { seller: 1, cat: 'apparel', name: 'Men\'s Formal Shirt Fabric', brand: 'Raymond', unit: 'meter', list_price: 280, moq: 50, min_price: 240, stock: 1500, negotiable: true, group_buy: false, desc: 'Poly-cotton blended fabric for formal shirts. 1.5m per piece. Variety of checks.' },
      { seller: 1, cat: 'electronics', name: 'USB-C Fast Charging Cable 1m', brand: 'Zoook', unit: 'piece', list_price: 149, moq: 50, min_price: 120, stock: 3000, negotiable: true, group_buy: true, desc: 'Nylon braided USB-C cable, supports 18W fast charging. 1m length.' },
      { seller: 1, cat: 'electronics', name: 'Mobile Phone Cover (Universal)', brand: 'Inhouse', unit: 'piece', list_price: 49, moq: 200, min_price: 35, stock: 10000, negotiable: false, group_buy: false, desc: 'Transparent TPU back cover. Fits 6.1 to 6.7 inch phones. Bulk packaging.' },
      { seller: 1, cat: 'electronics', name: 'LED Bulb 9W (Pack of 10)', brand: 'Wipro', unit: 'pack', list_price: 620, moq: 20, min_price: 540, stock: 1000, negotiable: true, group_buy: true, desc: 'Energy-saving LED bulbs 9W, 900 lumens, cool white. Pack of 10 with 2-year warranty.' },
      { seller: 1, cat: 'electronics', name: 'Bluetooth Earphones TWS', brand: 'Boat', unit: 'piece', list_price: 799, moq: 25, min_price: 680, stock: 500, negotiable: true, group_buy: false, desc: 'True wireless earphones with 20hr battery life. Bluetooth 5.0, IPX4 water resistant.' },
      { seller: 1, cat: 'stationery', name: 'Classmate Notebooks (Pack of 12)', brand: 'ITC Classmate', unit: 'pack', list_price: 240, moq: 50, min_price: 200, stock: 2000, negotiable: true, group_buy: true, desc: '200-page ruled notebooks for school/college. Pack of 12. A4 size.' },
      { seller: 1, cat: 'stationery', name: 'Cello BoldMax Pens (Box of 50)', brand: 'Cello', unit: 'box', list_price: 220, moq: 50, min_price: 180, stock: 3000, negotiable: false, group_buy: false, desc: 'BoldMax ballpoint pens, blue ink. Box of 50. Smooth writing tip.' },

      // Seller 2 - Suresh (Chennai)
      { seller: 2, cat: 'kitchenware', name: 'Stainless Steel Tiffin Box (3-Tier)', brand: 'Vinod', unit: 'piece', list_price: 380, moq: 25, min_price: 320, stock: 800, negotiable: true, group_buy: true, desc: '3-tier stainless steel lunch box with clip lock. Leakproof, BPA-free, dishwasher safe.' },
      { seller: 2, cat: 'kitchenware', name: 'Hawkins Pressure Cooker 5L', brand: 'Hawkins', unit: 'piece', list_price: 1850, moq: 10, min_price: 1600, stock: 200, negotiable: true, group_buy: false, desc: '5-litre aluminium pressure cooker. Gasket-top model. ISI marked. With recipe book.' },
      { seller: 2, cat: 'kitchenware', name: 'Prestige Non-Stick Tawa', brand: 'Prestige', unit: 'piece', list_price: 550, moq: 20, min_price: 470, stock: 400, negotiable: true, group_buy: true, desc: '28cm non-stick dosa tawa. Granite finish, cool-touch handle. Induction compatible.' },
      { seller: 2, cat: 'personal-care', name: 'Himalaya Face Wash (Pack of 6)', brand: 'Himalaya', unit: 'pack', list_price: 780, moq: 20, min_price: 660, stock: 1000, negotiable: true, group_buy: false, desc: 'Purifying Neem Face Wash 150ml x 6. Herbal formula, suitable for all skin types.' },
      { seller: 2, cat: 'personal-care', name: 'Nivea Men Face Wash', brand: 'Nivea', unit: '100ml tube', list_price: 195, moq: 50, min_price: 165, stock: 2000, negotiable: true, group_buy: true, desc: 'Deep impact oil control face wash for men. 100ml tube. Removes excess oil and dirt.' },
      { seller: 2, cat: 'personal-care', name: 'Dove Soap Bar (Pack of 4)', brand: 'Dove', unit: 'pack', list_price: 220, moq: 50, min_price: 190, stock: 3000, negotiable: false, group_buy: false, desc: 'Moisturizing cream beauty bar 100g x 4. Gentle on skin, 1/4 moisturizing cream formula.' },
      { seller: 2, cat: 'agri', name: 'Bhindi (Okra) Seeds - 500g', brand: 'Syngenta', unit: '500g pack', list_price: 380, moq: 20, min_price: 320, stock: 500, negotiable: true, group_buy: false, desc: 'High-yield hybrid bhindi seeds. 500g pack. Germination rate 90%+. Suitable for all seasons.' },
      { seller: 2, cat: 'agri', name: 'NPK Fertilizer 19:19:19', brand: 'Iffco', unit: 'kg bag', list_price: 68, moq: 100, min_price: 58, stock: 5000, negotiable: true, group_buy: true, desc: 'Water soluble NPK fertilizer. 1kg pack. Boosts plant growth and yield. Suitable for all crops.' },
      { seller: 2, cat: 'grocery', name: 'Tata Tea Gold (Pack of 10 x 250g)', brand: 'Tata', unit: 'pack', list_price: 1450, moq: 10, min_price: 1280, stock: 500, negotiable: true, group_buy: false, desc: 'Premium tea with 35% long leaf. Pack of 10 x 250g. Rich aroma and bold taste.' },
      { seller: 2, cat: 'fmcg', name: 'Lifebuoy Total Soap Bar (Pack of 8)', brand: 'HUL', unit: 'pack', list_price: 280, moq: 50, min_price: 240, stock: 4000, negotiable: false, group_buy: true, desc: 'Total 10 protection soap bar 100g x 8. Fights 99.9% germs. Long-lasting freshness.' },
    ];

    const catSlugToId = {};
    const [cats] = await conn.query(`SELECT id, slug FROM categories`);
    for (const c of cats) catSlugToId[c.slug] = c.id;

    const productIds = [];
    for (const p of products) {
      const catId = catSlugToId[p.cat];
      const [res] = await conn.query(
        `INSERT INTO products (uuid, seller_id, category_id, name, description, brand, unit, list_price, moq, min_acceptable_price, stock_quantity, is_negotiable, is_group_buy_enabled, cover_image_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [uuidv4(), sellerIds[p.seller], catId, p.name, p.desc, p.brand, p.unit, p.list_price, p.moq, p.min_price, p.stock, p.negotiable ? 1 : 0, p.group_buy ? 1 : 0]
      );
      productIds.push(res.insertId);

      // Add placeholder images (using picsum for realistic look)
      const imageUrls = [
        `/uploads/seeds/product_${res.insertId}_1.jpg`,
        `/uploads/seeds/product_${res.insertId}_2.jpg`,
      ];
      for (let i = 0; i < imageUrls.length; i++) {
        await conn.query(
          `INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, ?)`,
          [res.insertId, imageUrls[i], i]
        );
      }
    }
    console.log('✅ Products seeded');

    // Sample offers
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Offer 1: Buyer Anil negotiating on Tata Salt (product 0)
    const [offer1] = await conn.query(
      `INSERT INTO offers (uuid, product_id, buyer_id, seller_id, round_number, offered_by, price_per_unit, quantity, message, status, expires_at)
       VALUES (?, ?, ?, ?, 1, 'buyer', 19.50, 200, 'Can you give me a better rate for 200 bags?', 'countered', ?)`,
      [uuidv4(), productIds[0], buyerIds[0], sellerIds[0], in48h]
    );
    const [offer2] = await conn.query(
      `INSERT INTO offers (uuid, product_id, buyer_id, seller_id, round_number, offered_by, price_per_unit, quantity, message, status, parent_offer_id, expires_at)
       VALUES (?, ?, ?, ?, 2, 'seller', 20.50, 200, 'Best I can do is ₹20.50 for 200 bags.', 'pending', ?, ?)`,
      [uuidv4(), productIds[0], buyerIds[0], sellerIds[0], offer1.insertId, in48h]
    );

    // Offer 2: Buyer Meena on Aashirvaad Atta (product 1) - accepted
    const [offer3] = await conn.query(
      `INSERT INTO offers (uuid, product_id, buyer_id, seller_id, round_number, offered_by, price_per_unit, quantity, message, status, expires_at)
       VALUES (?, ?, ?, ?, 1, 'buyer', 48.00, 100, 'Can you match ₹48 for 100 bags?', 'accepted', ?)`,
      [uuidv4(), productIds[1], buyerIds[1], sellerIds[0], past48h]
    );

    // Create order from accepted offer
    const [order1] = await conn.query(
      `INSERT INTO orders (uuid, buyer_id, seller_id, offer_id, status, subtotal, total_amount, shipping_address)
       VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
      [uuidv4(), buyerIds[1], sellerIds[0], offer3.insertId, 4800, 4800, '42 MG Road, Jaipur, Rajasthan 302001']
    );
    await conn.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, 100, 48.00, 4800.00)`,
      [order1.insertId, productIds[1]]
    );
    console.log('✅ Offers and orders seeded');

    // Group pools
    const deadline1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const deadline2 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days
    const deadline3 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days

    // Pool 1: Surf Excel (product 5)
    const [pool1] = await conn.query(
      `INSERT INTO group_pools (uuid, product_id, seller_id, title, description, moq, deadline, status, tier_config, current_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        uuidv4(), productIds[5], sellerIds[0],
        'Surf Excel Bulk Deal - Save up to 18%',
        'Join the pool to get maximum discount on Surf Excel Quick Wash 1kg packs.',
        50, deadline1,
        JSON.stringify([
          { min_qty: 100, discount_pct: 5 },
          { min_qty: 200, discount_pct: 12 },
          { min_qty: 400, discount_pct: 18 },
        ]),
        175
      ]
    );
    // Add pool members
    await conn.query(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity, status) VALUES (?, ?, ?, 'active')`,
      [pool1.insertId, buyerIds[2], 75]
    );
    await conn.query(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity, status) VALUES (?, ?, ?, 'active')`,
      [pool1.insertId, buyerIds[3], 100]
    );

    // Pool 2: LED Bulb pack (product 16)
    const [pool2] = await conn.query(
      `INSERT INTO group_pools (uuid, product_id, seller_id, title, description, moq, deadline, status, tier_config, current_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        uuidv4(), productIds[16], sellerIds[1],
        'Wipro LED Bulb Group Deal',
        'Bulk purchase of Wipro 9W LED bulbs. More buyers = bigger discount!',
        20, deadline2,
        JSON.stringify([
          { min_qty: 50, discount_pct: 5 },
          { min_qty: 100, discount_pct: 10 },
          { min_qty: 200, discount_pct: 15 },
        ]),
        85
      ]
    );
    await conn.query(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity, status) VALUES (?, ?, ?, 'active')`,
      [pool2.insertId, buyerIds[0], 40]
    );
    await conn.query(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity, status) VALUES (?, ?, ?, 'active')`,
      [pool2.insertId, buyerIds[4], 45]
    );

    // Pool 3: Classmate notebooks (product 18)
    const [pool3] = await conn.query(
      `INSERT INTO group_pools (uuid, product_id, seller_id, title, description, moq, deadline, status, tier_config, current_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        uuidv4(), productIds[18], sellerIds[1],
        'Classmate Notebooks Back-to-School Deal',
        'Stock up for the new school year! The more we buy, the more we save.',
        50, deadline3,
        JSON.stringify([
          { min_qty: 100, discount_pct: 8 },
          { min_qty: 250, discount_pct: 15 },
          { min_qty: 500, discount_pct: 20 },
        ]),
        320
      ]
    );
    await conn.query(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity, status) VALUES (?, ?, ?, 'active')`,
      [pool3.insertId, buyerIds[1], 150]
    );
    await conn.query(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity, status) VALUES (?, ?, ?, 'active')`,
      [pool3.insertId, buyerIds[3], 170]
    );
    console.log('✅ Group pools seeded');

    // Notifications
    const notifs = [
      { user: buyerIds[0], type: 'offer_countered', title: 'Counter Offer Received', message: 'Ramesh Wholesale Traders countered your offer on Tata Salt at ₹20.50/bag', data: JSON.stringify({ offer_id: offer2.insertId }) },
      { user: sellerIds[0], type: 'offer_received', title: 'New Offer Received', message: 'Anil Kumar made an offer of ₹19.50/bag for 200 units of Tata Salt', data: JSON.stringify({ offer_id: offer1.insertId }) },
      { user: buyerIds[1], type: 'offer_accepted', title: 'Offer Accepted!', message: 'Your offer of ₹48/bag for Aashirvaad Atta was accepted. Order placed!', data: JSON.stringify({ order_id: order1.insertId }) },
      { user: buyerIds[2], type: 'pool_joined', title: 'Joined Group Pool', message: 'You joined the Surf Excel Bulk Deal pool with 75 units', data: null },
      { user: buyerIds[3], type: 'pool_joined', title: 'Joined Group Pool', message: 'You joined the Surf Excel Bulk Deal pool with 100 units', data: null },
    ];
    for (const n of notifs) {
      await conn.query(
        `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)`,
        [n.user, n.type, n.title, n.message, n.data]
      );
    }
    console.log('✅ Notifications seeded');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('Demo Credentials (password: Password@123):');
    console.log('------------------------------------------');
    console.log('SELLERS:');
    sellers.forEach(s => console.log(`  ${s.name}: ${s.email}`));
    console.log('BUYERS:');
    buyers.forEach(b => console.log(`  ${b.name}: ${b.email}`));
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();

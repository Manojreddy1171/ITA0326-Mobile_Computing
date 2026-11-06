const express = require('express');
const { query, queryOne, pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/seller - seller dashboard summary
router.get('/seller', authenticate, requireRole('seller'), async (req, res) => {
  try {
    const sellerId = req.user.id;

    const [[productStats]] = await pool.execute(
      'SELECT COUNT(*) AS total, SUM(stock_quantity) AS total_stock FROM products WHERE seller_id = ? AND is_active = 1',
      [sellerId]
    );

    const [[offerStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending FROM offers WHERE seller_id = ?",
      [sellerId]
    );

    const [[poolStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active FROM group_pools WHERE seller_id = ?",
      [sellerId]
    );

    const [[orderStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(total_amount) AS revenue, SUM(CASE WHEN status='placed' THEN 1 ELSE 0 END) AS pending_orders FROM orders WHERE seller_id = ?",
      [sellerId]
    );

    // Recent products
    const [products] = await pool.execute(`
      SELECT p.id, p.name, p.list_price, p.stock_quantity, p.is_active, p.is_group_buy_enabled,
             c.name AS category_name,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS cover_image
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = ? AND p.is_active = 1
      ORDER BY p.created_at DESC LIMIT 5
    `, [sellerId]);

    // Pending offers
    const [offers] = await pool.execute(`
      SELECT o.id, o.price_per_unit, o.quantity, o.status, o.created_at, o.round_number,
             p.name AS product_name, buyer.name AS buyer_name
      FROM offers o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      WHERE o.seller_id = ? AND o.status = 'pending'
      ORDER BY o.created_at DESC LIMIT 5
    `, [sellerId]);

    // Active pools
    const [pools] = await pool.execute(`
      SELECT gp.id, gp.title, gp.current_quantity, gp.moq, gp.deadline, gp.status, gp.tier_config,
             p.name AS product_name
      FROM group_pools gp LEFT JOIN products p ON gp.product_id = p.id
      WHERE gp.seller_id = ? AND gp.status = 'active'
      ORDER BY gp.deadline ASC LIMIT 5
    `, [sellerId]);

    // Recent orders
    const [orders] = await pool.execute(`
      SELECT o.id, o.total_amount, o.status, o.placed_at,
             buyer.name AS buyer_name
      FROM orders o LEFT JOIN users buyer ON o.buyer_id = buyer.id
      WHERE o.seller_id = ?
      ORDER BY o.placed_at DESC LIMIT 5
    `, [sellerId]);

    return res.json({
      stats: {
        products: productStats,
        offers: offerStats,
        pools: poolStats,
        orders: orderStats,
      },
      recent: { products, offers, pools, orders },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// GET /api/dashboard/buyer - buyer dashboard summary
router.get('/buyer', authenticate, requireRole('buyer'), async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [[offerStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) AS accepted FROM offers WHERE buyer_id = ?",
      [buyerId]
    );

    const [[poolStats]] = await pool.execute(
      "SELECT COUNT(*) AS joined FROM pool_members WHERE buyer_id = ? AND status = 'active'",
      [buyerId]
    );

    const [[orderStats]] = await pool.execute(
      "SELECT COUNT(*) AS total, SUM(total_amount) AS spent FROM orders WHERE buyer_id = ?",
      [buyerId]
    );

    // Active offers
    const [offers] = await pool.execute(`
      SELECT o.id, o.price_per_unit, o.quantity, o.status, o.created_at, o.round_number, o.offered_by,
             p.name AS product_name, p.unit, p.list_price,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image,
             seller.name AS seller_name
      FROM offers o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      WHERE o.buyer_id = ? AND o.status IN ('pending', 'countered')
      ORDER BY o.created_at DESC LIMIT 5
    `, [buyerId]);

    // Active pools
    const [pools] = await pool.execute(`
      SELECT gp.id, gp.title, gp.current_quantity, gp.moq, gp.deadline, gp.status, gp.tier_config,
             pm.quantity AS my_quantity,
             p.name AS product_name, p.list_price, p.unit
      FROM pool_members pm
      JOIN group_pools gp ON pm.pool_id = gp.id
      JOIN products p ON gp.product_id = p.id
      WHERE pm.buyer_id = ? AND pm.status = 'active' AND gp.status = 'active'
      ORDER BY gp.deadline ASC LIMIT 5
    `, [buyerId]);

    // Recent orders
    const [orders] = await pool.execute(`
      SELECT o.id, o.total_amount, o.status, o.placed_at,
             seller.name AS seller_name, seller.business_name AS seller_business
      FROM orders o LEFT JOIN users seller ON o.seller_id = seller.id
      WHERE o.buyer_id = ?
      ORDER BY o.placed_at DESC LIMIT 5
    `, [buyerId]);

    return res.json({
      stats: { offers: offerStats, pools: poolStats, orders: orderStats },
      recent: { offers, pools, orders },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;

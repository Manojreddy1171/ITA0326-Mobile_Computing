const express = require('express');
const { query, queryOne, pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders - list orders for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (req.user.role === 'buyer') {
      conditions.push('o.buyer_id = ?');
      params.push(req.user.id);
    } else {
      conditions.push('o.seller_id = ?');
      params.push(req.user.id);
    }

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [orders] = await pool.execute(`
      SELECT o.id, o.uuid, o.status, o.subtotal, o.discount_amount, o.total_amount,
             o.placed_at, o.confirmed_at, o.shipped_at, o.delivered_at,
             o.offer_id, o.pool_id, o.notes, o.shipping_address,
             buyer.id AS buyer_id, buyer.name AS buyer_name, buyer.city AS buyer_city,
             seller.id AS seller_id, seller.name AS seller_name, seller.business_name AS seller_business
      FROM orders o
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      ${where}
      ORDER BY o.placed_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limitNum, offset]);

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM orders o ${where}`, params
    );

    // Fetch order items for each order
    for (const order of orders) {
      const items = await query(`
        SELECT oi.*, p.name AS product_name, p.unit,
               (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      order.items = items;
    }

    return res.json({ orders, pagination: { total, page: pageNum, limit: limitNum } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await queryOne(`
      SELECT o.*, 
             buyer.id AS buyer_id, buyer.name AS buyer_name, buyer.email AS buyer_email,
             buyer.phone AS buyer_phone, buyer.city AS buyer_city, buyer.state AS buyer_state,
             seller.id AS seller_id, seller.name AS seller_name, seller.business_name AS seller_business,
             seller.phone AS seller_phone
      FROM orders o
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Access check
    if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = await query(`
      SELECT oi.*, p.name AS product_name, p.brand, p.unit,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image,
             u.name AS buyer_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN users u ON oi.buyer_id = u.id
      WHERE oi.order_id = ?
    `, [order.id]);

    return res.json({ order, items });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PATCH /api/orders/:id/status - seller updates order status
router.patch('/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.seller_id !== req.user.id && order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (order.seller_id !== req.user.id && status !== 'cancelled') {
      return res.status(403).json({ error: 'Only seller can update order status' });
    }

    const timestampField = {
      confirmed: 'confirmed_at',
      shipped: 'shipped_at',
      delivered: 'delivered_at',
    }[status];

    const updateSql = timestampField
      ? `UPDATE orders SET status=?, ${timestampField}=NOW() WHERE id=?`
      : `UPDATE orders SET status=? WHERE id=?`;
    await query(updateSql, [status, order.id]);

    // Notify buyer
    const notifType = `order_${status}`;
    await query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?,?,?,?,?)',
      [order.buyer_id, notifType, `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your order #${order.id} has been ${status}`,
        JSON.stringify({ order_id: order.id })]
    );

    const io = require('../socket').getIO();
    io.to(`user_${order.buyer_id}`).emit('order:updated', { order_id: order.id, status });

    const updated = await queryOne('SELECT * FROM orders WHERE id=?', [order.id]);
    return res.json({ order: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;

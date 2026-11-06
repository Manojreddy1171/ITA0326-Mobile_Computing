const express = require('express');
const { query, queryOne, pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, createPoolSchema, joinPoolSchema } = require('../middleware/validate');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const getTierDiscount = (tierConfig, quantity) => {
  const tiers = Array.isArray(tierConfig) ? tierConfig : JSON.parse(tierConfig);
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);
  for (const tier of sorted) {
    if (quantity >= tier.min_qty) return tier.discount_pct;
  }
  return 0;
};

const getNextTier = (tierConfig, quantity) => {
  const tiers = Array.isArray(tierConfig) ? tierConfig : JSON.parse(tierConfig);
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  return sorted.find(t => t.min_qty > quantity) || null;
};

// GET /api/pools - list active pools
router.get('/', async (req, res) => {
  try {
    const { product_id, status = 'active', page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (status) { conditions.push('gp.status = ?'); params.push(status); }
    if (product_id) { conditions.push('gp.product_id = ?'); params.push(parseInt(product_id)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [pools] = await pool.execute(`
      SELECT gp.id, gp.uuid, gp.title, gp.description, gp.moq, gp.deadline, gp.status,
             gp.tier_config, gp.current_quantity, gp.final_discount_pct,
             p.id AS product_id, p.name AS product_name, p.list_price, p.unit,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image,
             u.name AS seller_name, u.business_name AS seller_business,
             (SELECT COUNT(*) FROM pool_members pm WHERE pm.pool_id = gp.id AND pm.status = 'active') AS member_count
      FROM group_pools gp
      LEFT JOIN products p ON gp.product_id = p.id
      LEFT JOIN users u ON gp.seller_id = u.id
      ${where}
      ORDER BY gp.deadline ASC
      LIMIT ? OFFSET ?
    `, [...params, limitNum, offset]);

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM group_pools gp ${where}`, params
    );

    return res.json({ pools, pagination: { total, page: pageNum, limit: limitNum } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch pools' });
  }
});

// GET /api/pools/:poolId
router.get('/:poolId', async (req, res) => {
  try {
    const pool_data = await queryOne(`
      SELECT gp.*, p.id AS product_id, p.name AS product_name, p.list_price, p.moq AS product_moq, p.unit,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image,
             u.name AS seller_name, u.business_name AS seller_business
      FROM group_pools gp
      LEFT JOIN products p ON gp.product_id = p.id
      LEFT JOIN users u ON gp.seller_id = u.id
      WHERE gp.id = ?
    `, [req.params.poolId]);

    if (!pool_data) return res.status(404).json({ error: 'Pool not found' });

    const members = await query(`
      SELECT pm.id, pm.quantity, pm.status, pm.joined_at,
             u.id AS buyer_id, u.name AS buyer_name, u.city AS buyer_city
      FROM pool_members pm
      LEFT JOIN users u ON pm.buyer_id = u.id
      WHERE pm.pool_id = ? AND pm.status = 'active'
      ORDER BY pm.joined_at ASC
    `, [req.params.poolId]);

    const tierConfig = typeof pool_data.tier_config === 'string'
      ? JSON.parse(pool_data.tier_config)
      : pool_data.tier_config;

    const currentDiscount = getTierDiscount(tierConfig, pool_data.current_quantity);
    const nextTier = getNextTier(tierConfig, pool_data.current_quantity);

    return res.json({
      pool: pool_data,
      members,
      current_discount: currentDiscount,
      next_tier: nextTier,
      current_price: parseFloat(pool_data.list_price) * (1 - currentDiscount / 100),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch pool' });
  }
});

// POST /api/pools - create pool (seller only)
router.post('/', authenticate, requireRole('seller'), validate(createPoolSchema), async (req, res) => {
  const { product_id, title, description, moq, deadline, tier_config } = req.body;
  try {
    const product = await queryOne('SELECT id, seller_id FROM products WHERE id = ? AND is_active = 1', [product_id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your product' });

    const existing = await queryOne("SELECT id FROM group_pools WHERE product_id = ? AND status = 'active'", [product_id]);
    if (existing) return res.status(409).json({ error: 'An active pool already exists for this product' });

    const [result] = await pool.execute(
      `INSERT INTO group_pools (uuid, product_id, seller_id, title, description, moq, deadline, tier_config) VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), product_id, req.user.id, title, description || null, moq, deadline, JSON.stringify(tier_config)]
    );

    // Enable group buy on product
    await query('UPDATE products SET is_group_buy_enabled = 1 WHERE id = ?', [product_id]);

    const poolData = await queryOne('SELECT * FROM group_pools WHERE id = ?', [result.insertId]);
    return res.status(201).json({ pool: poolData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create pool' });
  }
});

// POST /api/pools/:poolId/join - buyer joins pool
router.post('/:poolId/join', authenticate, requireRole('buyer'), validate(joinPoolSchema), async (req, res) => {
  const { quantity } = req.body;
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [pools] = await conn.execute(
      "SELECT * FROM group_pools WHERE id = ? AND status = 'active' FOR UPDATE",
      [req.params.poolId]
    );
    const poolData = pools[0];
    if (!poolData) {
      conn.release();
      return res.status(404).json({ error: 'Pool not found or not active' });
    }

    if (new Date(poolData.deadline) < new Date()) {
      conn.release();
      return res.status(400).json({ error: 'Pool deadline has passed' });
    }

    if (quantity < poolData.moq) {
      conn.release();
      return res.status(400).json({ error: `Minimum quantity is ${poolData.moq}` });
    }

    const [existing] = await conn.execute(
      "SELECT id, status FROM pool_members WHERE pool_id = ? AND buyer_id = ?",
      [poolData.id, req.user.id]
    );

    if (existing.length > 0 && existing[0].status === 'active') {
      conn.release();
      return res.status(409).json({ error: 'You have already joined this pool' });
    }

    if (existing.length > 0) {
      await conn.execute(
        'UPDATE pool_members SET quantity = ?, status = "active", left_at = NULL, joined_at = NOW() WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await conn.execute(
        'INSERT INTO pool_members (pool_id, buyer_id, quantity, status) VALUES (?,?,?,?)',
        [poolData.id, req.user.id, quantity, 'active']
      );
    }

    await conn.execute(
      'UPDATE group_pools SET current_quantity = current_quantity + ? WHERE id = ?',
      [quantity, poolData.id]
    );

    await conn.execute(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?,?,?,?,?)',
      [req.user.id, 'pool_joined', 'Joined Pool', `You joined "${poolData.title}" with ${quantity} units`, JSON.stringify({ pool_id: poolData.id })]
    );

    await conn.commit();
    conn.release();

    const io = require('../socket').getIO();
    io.to(`pool_${poolData.id}`).emit('pool:updated', { pool_id: poolData.id });

    return res.json({ success: true, quantity_joined: quantity });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    return res.status(500).json({ error: 'Failed to join pool' });
  }
});

// DELETE /api/pools/:poolId/leave - buyer leaves pool
router.delete('/:poolId/leave', authenticate, requireRole('buyer'), async (req, res) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [pools] = await conn.execute(
      "SELECT * FROM group_pools WHERE id = ? AND status = 'active' FOR UPDATE",
      [req.params.poolId]
    );
    const poolData = pools[0];
    if (!poolData) {
      conn.release();
      return res.status(404).json({ error: 'Pool not found or not active' });
    }

    if (new Date(poolData.deadline) < new Date()) {
      conn.release();
      return res.status(400).json({ error: 'Cannot leave after deadline' });
    }

    const [member] = await conn.execute(
      "SELECT * FROM pool_members WHERE pool_id = ? AND buyer_id = ? AND status = 'active'",
      [poolData.id, req.user.id]
    );
    if (!member.length) {
      conn.release();
      return res.status(404).json({ error: 'You are not in this pool' });
    }

    await conn.execute(
      "UPDATE pool_members SET status = 'left', left_at = NOW() WHERE id = ?",
      [member[0].id]
    );
    await conn.execute(
      'UPDATE group_pools SET current_quantity = GREATEST(0, current_quantity - ?) WHERE id = ?',
      [member[0].quantity, poolData.id]
    );

    await conn.execute(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?,?,?,?)',
      [req.user.id, 'pool_left', 'Left Pool', `You left "${poolData.title}"`]
    );

    await conn.commit();
    conn.release();

    const io = require('../socket').getIO();
    io.to(`pool_${poolData.id}`).emit('pool:updated', { pool_id: poolData.id });

    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    return res.status(500).json({ error: 'Failed to leave pool' });
  }
});

// POST /api/pools/:poolId/close - manually close pool (seller)
router.post('/:poolId/close', authenticate, requireRole('seller'), async (req, res) => {
  try {
    const poolData = await queryOne(
      "SELECT * FROM group_pools WHERE id = ? AND seller_id = ? AND status = 'active'",
      [req.params.poolId, req.user.id]
    );
    if (!poolData) return res.status(404).json({ error: 'Active pool not found' });

    await closePool(poolData.id);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to close pool' });
  }
});

// Exported pool closing function (also used by cron)
const closePool = async (poolId) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [pools] = await conn.execute("SELECT * FROM group_pools WHERE id = ? FOR UPDATE", [poolId]);
    const poolData = pools[0];
    if (!poolData || poolData.status !== 'active') {
      conn.release();
      return;
    }

    const [members] = await conn.execute(
      "SELECT pm.*, u.id AS uid FROM pool_members pm LEFT JOIN users u ON pm.buyer_id = u.id WHERE pm.pool_id = ? AND pm.status = 'active'",
      [poolId]
    );
    const totalQty = members.reduce((sum, m) => sum + m.quantity, 0);
    const tierConfig = typeof poolData.tier_config === 'string' ? JSON.parse(poolData.tier_config) : poolData.tier_config;
    const discountPct = getTierDiscount(tierConfig, totalQty);

    const [product] = await conn.execute('SELECT * FROM products WHERE id = ?', [poolData.product_id]);
    const prod = product[0];

    if (totalQty < poolData.moq) {
      // Pool failed
      await conn.execute("UPDATE group_pools SET status='failed', closed_at=NOW() WHERE id=?", [poolId]);
      for (const m of members) {
        await conn.execute(
          "UPDATE pool_members SET status='refunded' WHERE id=?", [m.id]
        );
        await conn.execute(
          'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?,?,?,?,?)',
          [m.buyer_id, 'pool_failed', 'Group Deal Failed',
            `The group deal for "${prod.name}" did not reach MOQ. No order was placed.`,
            JSON.stringify({ pool_id: poolId })]
        );
      }
      await conn.execute("UPDATE products SET is_group_buy_enabled=0 WHERE id=?", [prod.id]);
    } else {
      // Pool success
      const finalPrice = parseFloat(prod.list_price) * (1 - discountPct / 100);
      const subtotal = finalPrice * totalQty;

      // Create one consolidated order
      const [orderRes] = await conn.execute(
        `INSERT INTO orders (uuid, buyer_id, seller_id, pool_id, status, subtotal, discount_amount, total_amount) VALUES (?,?,?,?,'placed',?,?,?)`,
        [uuidv4(), members[0].buyer_id, poolData.seller_id, poolId, subtotal,
          parseFloat(prod.list_price) * totalQty - subtotal, subtotal]
      );
      const orderId = orderRes.insertId;

      for (const m of members) {
        const lineTotal = finalPrice * m.quantity;
        await conn.execute(
          'INSERT INTO order_items (order_id, product_id, buyer_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?,?)',
          [orderId, prod.id, m.buyer_id, m.quantity, finalPrice, lineTotal]
        );
        await conn.execute("UPDATE pool_members SET status='ordered' WHERE id=?", [m.id]);
        await conn.execute(
          'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?,?,?,?,?)',
          [m.buyer_id, 'pool_success', '🎉 Group Deal Successful!',
            `${discountPct}% discount applied! Final price: ₹${finalPrice.toFixed(2)}/unit for "${prod.name}"`,
            JSON.stringify({ pool_id: poolId, order_id: orderId })]
        );
      }

      await conn.execute(
        "UPDATE group_pools SET status='success', closed_at=NOW(), final_discount_pct=?, final_price=?, order_id=?, current_quantity=? WHERE id=?",
        [discountPct, finalPrice, orderId, totalQty, poolId]
      );
      await conn.execute("UPDATE products SET is_group_buy_enabled=0 WHERE id=?", [prod.id]);

      const io = require('../socket').getIO();
      io.to(`pool_${poolId}`).emit('pool:success', { pool_id: poolId, discount_pct: discountPct, final_price: finalPrice });
    }

    await conn.commit();
    conn.release();
  } catch (err) {
    await conn.rollback();
    conn.release();
    throw err;
  }
};

module.exports = router;
module.exports.closePool = closePool;

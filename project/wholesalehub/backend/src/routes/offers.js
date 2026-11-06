const express = require('express');
const { query, queryOne, pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, createOfferSchema, respondOfferSchema } = require('../middleware/validate');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const MAX_ROUNDS = 5;
const OFFER_EXPIRY_HOURS = 48;

const notifyUser = async (conn, userId, type, title, message, data = null) => {
  await conn.execute(
    `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?,?,?,?,?)`,
    [userId, type, title, message, data ? JSON.stringify(data) : null]
  );
};

// GET /api/offers - list offers for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { status = '', page = '1', limit = '20' } = req.query;
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

    // Only show the latest round of each negotiation thread
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT o.id, o.uuid, o.round_number, o.offered_by, o.price_per_unit, o.quantity,
             o.message, o.status, o.expires_at, o.created_at, o.parent_offer_id,
             p.id AS product_id, p.name AS product_name, p.unit, p.list_price, p.moq,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS product_image,
             buyer.id AS buyer_id, buyer.name AS buyer_name, buyer.business_name AS buyer_business,
             seller.id AS seller_id, seller.name AS seller_name, seller.business_name AS seller_business
      FROM offers o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users buyer ON o.buyer_id = buyer.id
      LEFT JOIN users seller ON o.seller_id = seller.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [offers] = await pool.execute(sql, [...params, limitNum, offset]);

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM offers o ${where}`, params
    );

    return res.json({ offers, pagination: { total, page: pageNum, limit: limitNum } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// GET /api/offers/:offerId/thread - full negotiation thread
router.get('/:offerId/thread', authenticate, async (req, res) => {
  try {
    // Find the root offer
    const rootFinder = `
      WITH RECURSIVE thread AS (
        SELECT * FROM offers WHERE id = ?
        UNION ALL
        SELECT o.* FROM offers o JOIN thread t ON o.id = t.parent_offer_id
      )
      SELECT id FROM thread ORDER BY round_number ASC LIMIT 1
    `;
    const [roots] = await pool.execute(rootFinder, [req.params.offerId]);
    const rootId = roots[0]?.id || req.params.offerId;

    // Get all offers in thread
    const [thread] = await pool.execute(`
      WITH RECURSIVE thread AS (
        SELECT * FROM offers WHERE id = ?
        UNION ALL
        SELECT o.* FROM offers o JOIN thread t ON o.parent_offer_id = t.id
      )
      SELECT t.*, 
             buyer.name AS buyer_name, seller.name AS seller_name
      FROM thread t
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      LEFT JOIN users seller ON t.seller_id = seller.id
      ORDER BY t.round_number ASC
    `, [rootId]);

    if (!thread.length) return res.status(404).json({ error: 'Offer not found' });

    // Check access
    const first = thread[0];
    if (first.buyer_id !== req.user.id && first.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const product = await queryOne(`
      SELECT p.id, p.name, p.unit, p.list_price, p.moq, p.is_negotiable,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS cover_image
      FROM products p WHERE p.id = ?
    `, [first.product_id]);

    return res.json({ thread, product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch offer thread' });
  }
});

// POST /api/offers - create new offer (buyer only)
router.post('/', authenticate, requireRole('buyer'), validate(createOfferSchema), async (req, res) => {
  const { product_id, price_per_unit, quantity, message } = req.body;
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [products] = await conn.execute(
      'SELECT id, seller_id, list_price, moq, min_acceptable_price, is_negotiable, stock_quantity, is_active FROM products WHERE id = ?',
      [product_id]
    );
    const product = products[0];
    if (!product || !product.is_active) {
      conn.release();
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!product.is_negotiable) {
      conn.release();
      return res.status(400).json({ error: 'This product is not open for negotiation' });
    }
    if (product.seller_id === req.user.id) {
      conn.release();
      return res.status(400).json({ error: 'Cannot make offer on your own product' });
    }
    if (quantity < product.moq) {
      conn.release();
      return res.status(400).json({ error: `Quantity must be >= MOQ (${product.moq})` });
    }

    // Check no active negotiation already
    const [existing] = await conn.execute(
      `SELECT id FROM offers WHERE product_id = ? AND buyer_id = ? AND status IN ('pending','countered') LIMIT 1`,
      [product_id, req.user.id]
    );
    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ error: 'You already have an active offer on this product' });
    }

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
    const [res1] = await conn.execute(
      `INSERT INTO offers (uuid, product_id, buyer_id, seller_id, round_number, offered_by, price_per_unit, quantity, message, status, expires_at)
       VALUES (?,?,?,?,1,'buyer',?,?,?,'pending',?)`,
      [uuidv4(), product_id, req.user.id, product.seller_id, price_per_unit, quantity, message || null, expiresAt]
    );

    await notifyUser(conn, product.seller_id, 'offer_received',
      'New Offer Received',
      `You received an offer of ₹${price_per_unit}/unit for ${quantity} units`,
      { offer_id: res1.insertId, product_id }
    );

    await conn.commit();
    conn.release();

    // Emit socket event
    const io = require('../socket').getIO();
    io.to(`seller_${product.seller_id}`).emit('offer:new', { offer_id: res1.insertId, product_id });

    const offer = await queryOne('SELECT * FROM offers WHERE id = ?', [res1.insertId]);
    return res.status(201).json({ offer });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    return res.status(500).json({ error: 'Failed to create offer' });
  }
});

// POST /api/offers/:offerId/respond - accept/reject/counter
router.post('/:offerId/respond', authenticate, validate(respondOfferSchema), async (req, res) => {
  const { action, price_per_unit, quantity, message } = req.body;
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [offers] = await conn.execute('SELECT * FROM offers WHERE id = ? FOR UPDATE', [req.params.offerId]);
    const offer = offers[0];
    if (!offer) {
      conn.release();
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Access check
    const isSeller = req.user.id === offer.seller_id;
    const isBuyer = req.user.id === offer.buyer_id;
    if (!isSeller && !isBuyer) {
      conn.release();
      return res.status(403).json({ error: 'Access denied' });
    }

    // Role must match who should respond
    if (offer.status !== 'pending') {
      conn.release();
      return res.status(400).json({ error: `Offer is already ${offer.status}` });
    }
    if (offer.offered_by === 'buyer' && !isSeller) {
      conn.release();
      return res.status(403).json({ error: 'Only the seller can respond to a buyer offer' });
    }
    if (offer.offered_by === 'seller' && !isBuyer) {
      conn.release();
      return res.status(403).json({ error: 'Only the buyer can respond to a seller counter' });
    }

    // Check expiry
    if (new Date(offer.expires_at) < new Date()) {
      await conn.execute('UPDATE offers SET status="expired" WHERE id=?', [offer.id]);
      await conn.commit();
      conn.release();
      return res.status(400).json({ error: 'Offer has expired' });
    }

    const io = require('../socket').getIO();

    if (action === 'accept') {
      await conn.execute('UPDATE offers SET status="accepted", responded_at=NOW() WHERE id=?', [offer.id]);

      // Auto-create order
      const total = offer.price_per_unit * offer.quantity;
      const [product] = await conn.execute('SELECT * FROM products WHERE id=?', [offer.product_id]);
      const [orderRes] = await conn.execute(
        `INSERT INTO orders (uuid, buyer_id, seller_id, offer_id, status, subtotal, total_amount) VALUES (?,?,?,?,'placed',?,?)`,
        [uuidv4(), offer.buyer_id, offer.seller_id, offer.id, total, total]
      );
      await conn.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)`,
        [orderRes.insertId, offer.product_id, offer.quantity, offer.price_per_unit, total]
      );

      const notifyId = isSeller ? offer.buyer_id : offer.seller_id;
      await notifyUser(conn, notifyId, 'offer_accepted', 'Offer Accepted!',
        `Your offer of ₹${offer.price_per_unit}/unit was accepted. Order #${orderRes.insertId} placed!`,
        { offer_id: offer.id, order_id: orderRes.insertId }
      );

      await conn.commit();
      conn.release();

      io.to(`user_${offer.buyer_id}`).emit('offer:accepted', { offer_id: offer.id, order_id: orderRes.insertId });
      io.to(`user_${offer.seller_id}`).emit('offer:accepted', { offer_id: offer.id });

      return res.json({ success: true, order_id: orderRes.insertId });
    }

    if (action === 'reject') {
      await conn.execute('UPDATE offers SET status="rejected", responded_at=NOW() WHERE id=?', [offer.id]);
      const notifyId = isSeller ? offer.buyer_id : offer.seller_id;
      await notifyUser(conn, notifyId, 'offer_rejected', 'Offer Rejected',
        `Your offer was declined.`, { offer_id: offer.id }
      );
      await conn.commit();
      conn.release();
      io.to(`user_${offer.buyer_id}`).emit('offer:rejected', { offer_id: offer.id });
      return res.json({ success: true });
    }

    if (action === 'counter') {
      if (offer.round_number >= MAX_ROUNDS) {
        conn.release();
        return res.status(400).json({ error: `Maximum negotiation rounds (${MAX_ROUNDS}) reached` });
      }
      if (!price_per_unit) {
        conn.release();
        return res.status(400).json({ error: 'price_per_unit required for counter offer' });
      }

      // Check counter price is within acceptable range (for seller)
      if (isSeller) {
        const [prod] = await conn.execute('SELECT min_acceptable_price FROM products WHERE id=?', [offer.product_id]);
        if (parseFloat(price_per_unit) < parseFloat(prod[0].min_acceptable_price)) {
          conn.release();
          return res.status(400).json({ error: 'Counter price is below minimum acceptable price' });
        }
      }

      await conn.execute('UPDATE offers SET status="countered", responded_at=NOW() WHERE id=?', [offer.id]);

      const nextOfferedBy = isSeller ? 'seller' : 'buyer';
      const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
      const [newOffer] = await conn.execute(
        `INSERT INTO offers (uuid, product_id, buyer_id, seller_id, round_number, offered_by, price_per_unit, quantity, message, status, parent_offer_id, expires_at)
         VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?)`,
        [uuidv4(), offer.product_id, offer.buyer_id, offer.seller_id,
          offer.round_number + 1, nextOfferedBy, price_per_unit,
          quantity || offer.quantity, message || null, offer.id, expiresAt]
      );

      const notifyId = isSeller ? offer.buyer_id : offer.seller_id;
      const notifyType = 'offer_countered';
      await notifyUser(conn, notifyId, notifyType, 'Counter Offer Received',
        `You received a counter offer of ₹${price_per_unit}/unit`,
        { offer_id: newOffer.insertId }
      );

      await conn.commit();
      conn.release();

      io.to(`user_${offer.buyer_id}`).emit('offer:countered', { offer_id: newOffer.insertId });
      io.to(`user_${offer.seller_id}`).emit('offer:countered', { offer_id: newOffer.insertId });

      const created = await queryOne('SELECT * FROM offers WHERE id=?', [newOffer.insertId]);
      return res.status(201).json({ offer: created });
    }

    conn.release();
    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    return res.status(500).json({ error: 'Failed to respond to offer' });
  }
});

// DELETE /api/offers/:offerId - buyer cancels their pending offer
router.delete('/:offerId', authenticate, requireRole('buyer'), async (req, res) => {
  try {
    const offer = await queryOne('SELECT * FROM offers WHERE id=? AND buyer_id=? AND status="pending"', [req.params.offerId, req.user.id]);
    if (!offer) return res.status(404).json({ error: 'Offer not found or cannot be cancelled' });
    await query('UPDATE offers SET status="cancelled" WHERE id=?', [offer.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to cancel offer' });
  }
});

module.exports = router;

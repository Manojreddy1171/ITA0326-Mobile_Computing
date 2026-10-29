const express = require('express');
const { query, pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '20', unread_only = 'false' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['user_id = ?'];
    const params = [req.user.id];
    if (unread_only === 'true') { conditions.push('is_read = 0'); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [notifications] = await pool.execute(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM notifications ${where}`, params);
    const [[{ unread }]] = await pool.execute(`SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`, [req.user.id]);

    return res.json({ notifications, pagination: { total, page: pageNum, limit: limitNum }, unread_count: unread });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;

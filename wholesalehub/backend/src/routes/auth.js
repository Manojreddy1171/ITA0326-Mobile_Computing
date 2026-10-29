const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../db');
const { authenticate, generateToken } = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');
const { avatarUpload, getFileUrl } = require('../middleware/upload');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password, role, phone, business_name, city, state, pincode } = req.body;
  try {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const { v4: uuidv4 } = require('uuid');
    const [result] = await require('../db').pool.execute(
      `INSERT INTO users (uuid, name, email, password_hash, role, phone, business_name, city, state, pincode) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), name, email, hash, role, phone || null, business_name || null, city || null, state || null, pincode || null]
    );

    const user = await queryOne(
      'SELECT id, uuid, name, email, role, business_name, city, state FROM users WHERE id = ?',
      [result.insertId]
    );
    const token = generateToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await queryOne(
      'SELECT id, uuid, name, email, password_hash, role, phone, business_name, avatar_url, city, state, is_active FROM users WHERE email = ?',
      [email]
    );
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password_hash, ...safeUser } = user;
    const token = generateToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT id, uuid, name, email, role, phone, business_name, gstin, address, city, state, pincode, avatar_url, is_verified, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res) => {
  const { name, phone, business_name, gstin, address, city, state, pincode } = req.body;
  try {
    await query(
      `UPDATE users SET name=?, phone=?, business_name=?, gstin=?, address=?, city=?, state=?, pincode=? WHERE id=?`,
      [name, phone, business_name, gstin, address, city, state, pincode, req.user.id]
    );
    const user = await queryOne('SELECT id, uuid, name, email, role, phone, business_name, city, state, pincode, avatar_url FROM users WHERE id=?', [req.user.id]);
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Profile update failed' });
  }
});

// POST /api/auth/avatar
router.post('/avatar', authenticate, avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const url = getFileUrl(req.file.filename, 'avatars');
    await query('UPDATE users SET avatar_url=? WHERE id=?', [url, req.user.id]);
    return res.json({ avatar_url: url });
  } catch (err) {
    return res.status(500).json({ error: 'Avatar upload failed' });
  }
});

module.exports = router;

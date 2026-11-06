const express = require('express');
const { query, queryOne, pool } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, createProductSchema } = require('../middleware/validate');
const { upload, getFileUrl } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/products - public listing with search/filter
router.get('/', async (req, res) => {
  try {
    const {
      search = '', category = '', seller_id = '',
      negotiable = '', group_buy = '',
      sort = 'created_at', order = 'desc',
      page = '1', limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let conditions = ['p.is_active = 1'];
    let params = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      conditions.push('c.slug = ?');
      params.push(category);
    }
    if (seller_id) {
      conditions.push('p.seller_id = ?');
      params.push(parseInt(seller_id));
    }
    if (negotiable === 'true') {
      conditions.push('p.is_negotiable = 1');
    }
    if (group_buy === 'true') {
      conditions.push('p.is_group_buy_enabled = 1');
    }

    const validSorts = { price: 'p.list_price', created_at: 'p.created_at', name: 'p.name', moq: 'p.moq' };
    const sortCol = validSorts[sort] || 'p.created_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`;
    const [countResult] = await pool.execute(countSql, params);
    const total = countResult[0].total;

    const sql = `
      SELECT p.id, p.uuid, p.name, p.brand, p.unit, p.list_price, p.moq, p.stock_quantity,
             p.is_negotiable, p.is_group_buy_enabled, p.cover_image_index, p.created_at,
             c.name AS category_name, c.slug AS category_slug,
             u.id AS seller_id, u.name AS seller_name, u.business_name AS seller_business,
             u.city AS seller_city,
             (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1 OFFSET p.cover_image_index) AS cover_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      ${where}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `;
    const [products] = await pool.execute(sql, [...params, limitNum, offset]);

    return res.json({
      products,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    const cats = await query('SELECT * FROM categories ORDER BY name');
    return res.json({ categories: cats });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/products/:id - public product detail (NEVER exposes min_acceptable_price)
router.get('/:id', async (req, res) => {
  try {
    const product = await queryOne(`
      SELECT p.id, p.uuid, p.name, p.description, p.brand, p.sku, p.unit,
             p.list_price, p.moq, p.stock_quantity, p.is_negotiable, p.is_group_buy_enabled,
             p.tags, p.cover_image_index, p.created_at,
             c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
             u.id AS seller_id, u.name AS seller_name, u.business_name AS seller_business,
             u.city AS seller_city, u.state AS seller_state, u.avatar_url AS seller_avatar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.id = ? AND p.is_active = 1
    `, [req.params.id]);

    if (!product) return res.status(404).json({ error: 'Product not found' });

    const images = await query(
      'SELECT id, url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [product.id]
    );

    // Active group pool for this product
    const pool_data = await queryOne(`
      SELECT gp.id, gp.uuid, gp.title, gp.description, gp.moq, gp.deadline, gp.status,
             gp.tier_config, gp.current_quantity, gp.final_discount_pct
      FROM group_pools gp
      WHERE gp.product_id = ? AND gp.status = 'active'
      LIMIT 1
    `, [product.id]);

    return res.json({ product, images, pool: pool_data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - create product (seller only)
router.post('/',
  authenticate, requireRole('seller'),
  upload.array('images', 5),
  validate(createProductSchema),
  async (req, res) => {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const {
        name, description, brand, category_id, unit, list_price,
        moq, min_acceptable_price, stock_quantity, is_negotiable,
        is_group_buy_enabled, tags, cover_image_index,
      } = req.body;

      if (parseFloat(min_acceptable_price) > parseFloat(list_price)) {
        conn.release();
        return res.status(400).json({ error: 'min_acceptable_price cannot exceed list_price' });
      }

      const [result] = await conn.execute(
        `INSERT INTO products (uuid, seller_id, category_id, name, description, brand, unit, list_price, moq, min_acceptable_price, stock_quantity, is_negotiable, is_group_buy_enabled, tags, cover_image_index)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), req.user.id, category_id, name, description || null, brand || null, unit, list_price, moq, min_acceptable_price, stock_quantity, is_negotiable ? 1 : 0, is_group_buy_enabled ? 1 : 0, tags || null, cover_image_index || 0]
      );
      const productId = result.insertId;

      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const url = getFileUrl(req.files[i].filename, 'products');
          await conn.execute(
            'INSERT INTO product_images (product_id, url, sort_order) VALUES (?,?,?)',
            [productId, url, i]
          );
        }
      }

      await conn.commit();
      conn.release();

      const product = await queryOne(
        `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
        [productId]
      );
      const images = await query('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [productId]);
      return res.status(201).json({ product, images });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error(err);
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }
);

// PATCH /api/products/:id - update product (seller, own only)
router.patch('/:id',
  authenticate, requireRole('seller'),
  upload.array('images', 5),
  async (req, res) => {
    try {
      const product = await queryOne(
        'SELECT * FROM products WHERE id = ? AND is_active = 1',
        [req.params.id]
      );
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your product' });

      const fields = {};
      const allowed = ['name', 'description', 'brand', 'unit', 'list_price', 'moq',
        'min_acceptable_price', 'stock_quantity', 'is_negotiable', 'is_group_buy_enabled',
        'tags', 'cover_image_index', 'category_id'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) fields[key] = req.body[key];
      }

      if (Object.keys(fields).length > 0) {
        const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
        await query(`UPDATE products SET ${sets} WHERE id = ?`, [...Object.values(fields), product.id]);
      }

      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const url = getFileUrl(req.files[i].filename, 'products');
          await query('INSERT INTO product_images (product_id, url, sort_order) VALUES (?,?,?)',
            [product.id, url, i]);
        }
      }

      const updated = await queryOne('SELECT * FROM products WHERE id = ?', [product.id]);
      const images = await query('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [product.id]);
      return res.json({ product: updated, images });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }
);

// DELETE /api/products/:id (soft delete, seller only)
router.delete('/:id', authenticate, requireRole('seller'), async (req, res) => {
  try {
    const product = await queryOne('SELECT seller_id FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your product' });
    await query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

// DELETE /api/products/:id/images/:imgId (seller only)
router.delete('/:id/images/:imgId', authenticate, requireRole('seller'), async (req, res) => {
  try {
    const product = await queryOne('SELECT seller_id FROM products WHERE id = ?', [req.params.id]);
    if (!product || product.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your product' });
    await query('DELETE FROM product_images WHERE id = ? AND product_id = ?', [req.params.imgId, req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

// PATCH /api/products/:id/images/reorder
router.patch('/:id/images/reorder', authenticate, requireRole('seller'), async (req, res) => {
  const { order } = req.body; // array of image IDs in new order
  try {
    const product = await queryOne('SELECT seller_id FROM products WHERE id = ?', [req.params.id]);
    if (!product || product.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your product' });
    for (let i = 0; i < order.length; i++) {
      await query('UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?', [i, order[i], req.params.id]);
    }
    const images = await query('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [req.params.id]);
    return res.json({ images });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reorder images' });
  }
});

module.exports = router;

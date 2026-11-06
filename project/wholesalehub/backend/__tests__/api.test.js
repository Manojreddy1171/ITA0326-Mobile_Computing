const request = require('supertest');
const { app } = require('../src/index');

describe('Auth API', () => {
  let buyerToken, sellerToken;

  it('POST /api/auth/register - registers a buyer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Buyer',
        email: `testbuyer_${Date.now()}@test.in`,
        password: 'Test@1234',
        role: 'buyer',
        city: 'Mumbai',
        state: 'Maharashtra',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('buyer');
    buyerToken = res.body.token;
  });

  it('POST /api/auth/register - registers a seller', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Seller',
        email: `testseller_${Date.now()}@test.in`,
        password: 'Test@1234',
        role: 'seller',
        business_name: 'Test Wholesale Co',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('seller');
    sellerToken = res.body.token;
  });

  it('POST /api/auth/login - logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'anil@buyer.in', password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('buyer');
  });

  it('POST /api/auth/login - rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'anil@buyer.in', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me - returns current user', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'anil@buyer.in', password: 'Password@123' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('anil@buyer.in');
  });

  it('POST /api/auth/register - rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad', email: 'bad@test.in', password: 'password', role: 'buyer' });
    expect(res.status).toBe(422);
  });
});

describe('Products API', () => {
  it('GET /api/products - returns product list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('GET /api/products - filters by category', async () => {
    const res = await request(app).get('/api/products?category=grocery');
    expect(res.status).toBe(200);
    res.body.products.forEach(p => {
      expect(p.category_slug).toBe('grocery');
    });
  });

  it('GET /api/products - does NOT expose min_acceptable_price', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    res.body.products.forEach(p => {
      expect(p).not.toHaveProperty('min_acceptable_price');
    });
  });

  it('GET /api/products/:id - returns product detail without min_acceptable_price', async () => {
    const listRes = await request(app).get('/api/products');
    const productId = listRes.body.products[0].id;
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.product).not.toHaveProperty('min_acceptable_price');
  });

  it('POST /api/products - requires seller role', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'anil@buyer.in', password: 'Password@123' });
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .field('name', 'Test Product')
      .field('list_price', '100')
      .field('moq', '10')
      .field('min_acceptable_price', '80')
      .field('category_id', '1')
      .field('stock_quantity', '100');
    expect(res.status).toBe(403);
  });
});

describe('Offer Flow API', () => {
  let buyerToken, sellerToken, productId, offerId;

  beforeAll(async () => {
    const buyerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ravi@buyer.in', password: 'Password@123' });
    buyerToken = buyerRes.body.token;

    const sellerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ramesh@wholesalehub.in', password: 'Password@123' });
    sellerToken = sellerRes.body.token;

    const prodRes = await request(app).get('/api/products?negotiable=true&limit=1');
    productId = prodRes.body.products[0].id;
  });

  it('POST /api/offers - buyer submits an offer', async () => {
    const res = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        product_id: productId,
        price_per_unit: 15,
        quantity: 200,
        message: 'Testing offer flow',
      });
    if (res.status === 409) {
      console.log('Offer already exists, skipping creation test');
      return;
    }
    expect(res.status).toBe(201);
    expect(res.body.offer).toHaveProperty('id');
    offerId = res.body.offer.id;
  });

  it('POST /api/offers - rejects offer below MOQ', async () => {
    const prodRes = await request(app).get(`/api/products/${productId}`);
    const moq = prodRes.body.product.moq;
    const res = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ product_id: productId, price_per_unit: 20, quantity: moq - 1 });
    expect([400, 409]).toContain(res.status);
  });
});

describe('Group Pool API', () => {
  it('GET /api/pools - returns active pools', async () => {
    const res = await request(app).get('/api/pools?status=active');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pools)).toBe(true);
  });

  it('POST /api/pools/:id/join - requires buyer auth', async () => {
    const poolsRes = await request(app).get('/api/pools?status=active&limit=1');
    if (!poolsRes.body.pools.length) return;
    const poolId = poolsRes.body.pools[0].id;
    const res = await request(app)
      .post(`/api/pools/${poolId}/join`)
      .send({ quantity: 50 });
    expect(res.status).toBe(401);
  });
});

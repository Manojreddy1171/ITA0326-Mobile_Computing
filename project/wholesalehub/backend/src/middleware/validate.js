const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = parsed.body || req.body;
    req.query = parsed.query || req.query;
    req.params = parsed.params || req.params;
    next();
  } catch (err) {
    const errors = err.errors?.map(e => ({
      field: e.path.slice(1).join('.'),
      message: e.message,
    }));
    return res.status(422).json({ error: 'Validation failed', errors });
  }
};

// Auth schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
      message: 'Password must have uppercase, number and special character',
    }),
    role: z.enum(['buyer', 'seller']),
    phone: z.string().optional(),
    business_name: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

// Product schemas
const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(200),
    description: z.string().optional(),
    brand: z.string().optional(),
    category_id: z.coerce.number().int().positive(),
    unit: z.string().default('piece'),
    list_price: z.coerce.number().positive(),
    moq: z.coerce.number().int().positive(),
    min_acceptable_price: z.coerce.number().positive(),
    stock_quantity: z.coerce.number().int().min(0),
    is_negotiable: z.coerce.boolean().default(true),
    is_group_buy_enabled: z.coerce.boolean().default(false),
    tags: z.string().optional(),
    cover_image_index: z.coerce.number().int().min(0).default(0),
  }),
});

// Offer schemas
const createOfferSchema = z.object({
  body: z.object({
    product_id: z.coerce.number().int().positive(),
    price_per_unit: z.coerce.number().positive(),
    quantity: z.coerce.number().int().positive(),
    message: z.string().max(500).optional(),
  }),
});

const respondOfferSchema = z.object({
  body: z.object({
    action: z.enum(['accept', 'reject', 'counter']),
    price_per_unit: z.coerce.number().positive().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    message: z.string().max(500).optional(),
  }),
  params: z.object({
    offerId: z.coerce.number().int().positive(),
  }),
});

// Group pool schemas
const createPoolSchema = z.object({
  body: z.object({
    product_id: z.coerce.number().int().positive(),
    title: z.string().min(5).max(200),
    description: z.string().optional(),
    moq: z.coerce.number().int().positive(),
    deadline: z.string().datetime(),
    tier_config: z.array(
      z.object({
        min_qty: z.number().int().positive(),
        discount_pct: z.number().min(0.01).max(50),
      })
    ).min(1),
  }),
});

const joinPoolSchema = z.object({
  body: z.object({ quantity: z.coerce.number().int().positive() }),
  params: z.object({ poolId: z.coerce.number().int().positive() }),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createProductSchema,
  createOfferSchema,
  respondOfferSchema,
  createPoolSchema,
  joinPoolSchema,
};

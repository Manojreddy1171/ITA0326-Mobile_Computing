-- WholesaleHub Database Schema
-- Run: mysql -u root -p wholesalehub < schema.sql

CREATE DATABASE IF NOT EXISTS wholesalehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wholesalehub;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('buyer', 'seller') NOT NULL,
  phone VARCHAR(20),
  business_name VARCHAR(150),
  gstin VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  avatar_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Product categories
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  seller_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  sku VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'piece',
  list_price DECIMAL(12, 2) NOT NULL,
  moq INT NOT NULL DEFAULT 1,
  min_acceptable_price DECIMAL(12, 2) NOT NULL COMMENT 'Private - never exposed to buyers',
  stock_quantity INT NOT NULL DEFAULT 0,
  is_negotiable BOOLEAN DEFAULT TRUE,
  is_group_buy_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  tags VARCHAR(500),
  cover_image_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_seller (seller_id),
  INDEX idx_category (category_id),
  INDEX idx_active (is_active),
  FULLTEXT INDEX ft_search (name, description, brand)
);

-- Product images
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
);

-- Offers (negotiation rounds)
CREATE TABLE IF NOT EXISTS offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  product_id INT NOT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  offered_by ENUM('buyer', 'seller') NOT NULL,
  price_per_unit DECIMAL(12, 2) NOT NULL,
  quantity INT NOT NULL,
  message TEXT,
  status ENUM('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
  parent_offer_id INT,
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (parent_offer_id) REFERENCES offers(id),
  INDEX idx_product_buyer (product_id, buyer_id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (status),
  INDEX idx_expires (expires_at)
);

-- Group buying pools
CREATE TABLE IF NOT EXISTS group_pools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  product_id INT NOT NULL,
  seller_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  moq INT NOT NULL,
  deadline TIMESTAMP NOT NULL,
  status ENUM('active', 'success', 'failed', 'closed') NOT NULL DEFAULT 'active',
  tier_config JSON NOT NULL COMMENT 'Array of {min_qty, discount_pct}',
  current_quantity INT DEFAULT 0,
  final_discount_pct DECIMAL(5, 2) DEFAULT 0,
  final_price DECIMAL(12, 2) NULL,
  order_id INT NULL,
  closed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  INDEX idx_product (product_id),
  INDEX idx_status_deadline (status, deadline)
);

-- Pool members
CREATE TABLE IF NOT EXISTS pool_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pool_id INT NOT NULL,
  buyer_id INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('active', 'left', 'ordered', 'refunded') NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL,
  FOREIGN KEY (pool_id) REFERENCES group_pools(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  UNIQUE KEY uq_pool_buyer (pool_id, buyer_id),
  INDEX idx_pool (pool_id),
  INDEX idx_buyer (buyer_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  offer_id INT NULL,
  pool_id INT NULL,
  status ENUM('placed', 'confirmed', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'placed',
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  shipping_address TEXT,
  notes TEXT,
  placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (offer_id) REFERENCES offers(id),
  INDEX idx_buyer (buyer_id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (status)
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  buyer_id INT NULL COMMENT 'For pool orders, tracks per-buyer line items',
  quantity INT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order (order_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('offer_received', 'offer_accepted', 'offer_rejected', 'offer_countered', 'offer_expired',
            'pool_joined', 'pool_success', 'pool_failed', 'pool_left',
            'order_placed', 'order_confirmed', 'order_shipped', 'order_delivered',
            'general') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSON NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_user_created (user_id, created_at)
);

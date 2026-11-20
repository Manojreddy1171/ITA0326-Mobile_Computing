-- =====================================================
-- AgriConnect: Advanced Marketplace Modules Migration
-- Module 1: Smart Wholesale Price Negotiator
-- Module 2: Multi-Image Storage & Metadata
-- Module 3: Smart Group Buying & Demand Pooling
-- =====================================================

-- -----------------------------------------------------
-- 1. NEGOTIATIONS (Module 1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS negotiations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crop_id INT NOT NULL,
    farmer_id INT NOT NULL,
    buyer_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    asking_price DECIMAL(10, 2) NOT NULL,
    offered_price DECIMAL(10, 2) NOT NULL,
    current_counter_price DECIMAL(10, 2) NULL,
    final_agreed_price DECIMAL(10, 2) NULL,
    market_reference_price DECIMAL(10, 2) NULL,
    min_acceptable_price DECIMAL(10, 2) NULL,
    status ENUM('pending', 'counteroffer_received', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_neg_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
    CONSTRAINT fk_neg_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_neg_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- 2. NEGOTIATION MESSAGES / TIMELINE (Module 1)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS negotiation_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    negotiation_id INT NOT NULL,
    sender_id INT NOT NULL,
    sender_role ENUM('farmer', 'buyer', 'system') NOT NULL,
    message_type ENUM('offer', 'counteroffer', 'system_suggestion', 'accept', 'reject', 'chat') NOT NULL,
    price DECIMAL(10, 2) NULL,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_neg_msg_neg FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- 3. CROP IMAGES ENHANCEMENT (Module 2)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crop_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_crop_images_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- 4. GROUP BUYING CAMPAIGNS (Module 3)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buying_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    crop_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    original_price DECIMAL(10, 2) NOT NULL,
    group_price DECIMAL(10, 2) NOT NULL,
    min_target_quantity DECIMAL(10, 2) NOT NULL,
    max_available_quantity DECIMAL(10, 2) NOT NULL,
    current_committed_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    min_per_buyer DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    max_per_buyer DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('draft', 'active', 'target_reached', 'successful', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gb_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_gb_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- 5. GROUP BUYING COMMITMENTS (Module 3)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS group_buying_commitments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    buyer_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('committed', 'cancelled', 'fulfilled') NOT NULL DEFAULT 'committed',
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gb_commit_campaign FOREIGN KEY (campaign_id) REFERENCES group_buying_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_gb_commit_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

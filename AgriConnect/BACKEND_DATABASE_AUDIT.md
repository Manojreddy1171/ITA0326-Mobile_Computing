# AgriConnect – Comprehensive Backend & Database Persistence Audit Report

**Project Name:** AgriConnect – Smart Agricultural Marketplace  
**Version:** 2.0 (Production & Demonstration Release)  
**Execution Timestamp:** 2026-11-21T08:20:00Z  
**Database Host:** `localhost:3306` (MySQL 8.0 `agriconnect`)  
**Backend Host:** `http://localhost:5000` (Node.js Express)  
**Audit Scope:** End-to-end inspection of routes, controllers, database schemas, foreign keys, transactions, error handling, and parameterized query security.  
**Audit Verdict:** **FULLY COMPLIANT & PERSISTENCE VERIFIED ✅**

---

## 1. Executive Architecture Overview

AgriConnect is built upon a high-performance monolithic Node.js and Express.js backend connected to an authoritative MySQL relational database. The architecture strictly adheres to three-tier client-server separation, ensuring that client applications (mobile web, desktop browsers, and Android WebViews) interact exclusively through secure RESTful endpoints, with MySQL as the single source of truth.

### Key Infrastructure Characteristics
- **Express Server (`backend/server.js`):** Configured on port `5000` (`0.0.0.0:5000`). Handles JSON payloads (`express.json()`), URL-encoded forms (`express.urlencoded({ extended: true })`), static frontend delivery (`/frontend`), and uploaded media storage (`/uploads`).
- **Connection Pooling (`backend/db.js`):** Uses `mysql2` connection pooling (`waitForConnections: true`, `connectionLimit: 15`, `queueLimit: 0`) targeting `localhost:3306` for low latency and high concurrency throughput.
- **Persistence Guarantee:** Zero reliance on temporary memory stores or client-side `localStorage` for authoritative business logic. All creations, updates, transactions, and status transitions persist directly in MySQL.

---

## 2. API Routes & Controller Inspection Checklist

Every backend route has been crawled, audited, and verified for parameterized query execution, input validation, and proper HTTP status code handling.

| Module / Route File | Endpoints Crawled | Primary Methods & Controllers | Auth & Validation Status |
|---|---|---|---|
| **`authRoutes.js`** | `POST /register`, `POST /login`, `GET /me` | User registration, bcrypt verification, JWT session issuance | Validated (HTTP 200, 201, 400, 401) |
| **`cropRoutes.js`** | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /farmer/:farmerId` | Product catalog CRUD, stock reservation, price editing | Validated (Parameterized queries, Cascade delete) |
| **`negotiationRoutes.js`** | `POST /`, `GET /`, `GET /:id`, `POST /:id/counter`, `POST /:id/accept`, `POST /:id/reject`, `POST /:id/create-order` | Wholesale price negotiation, rule-based recommendation calculation, deal locking, order conversion | Validated (Boundary validations, Double-accept guard) |
| **`groupBuyingRoutes.js`** | `GET /`, `GET /campaigns`, `GET /:id`, `POST /`, `POST /:id/join`, `POST /commitments/:id/cancel`, `GET /recommendations` | Cooperative demand pooling, 500 kg milestone progression, concurrency-safe transactions with `FOR UPDATE` | Validated (Transaction rollback on capacity breach) |
| **`imageRoutes.js`** | `POST /crops/:id`, `GET /crops/:id`, `PUT /crops/:id/primary/:imageId`, `PUT /:id/set-primary`, `DELETE /crops/:id/:imageId` | Multer multi-angle photo uploads, primary cover selector, file cleanup | Validated (MIME filter, 5MB limit, unique naming) |
| **`orderRoutes.js`** | `POST /`, `GET /farmer/:farmerId`, `GET /buyer/:buyerId`, `PUT /:id/status`, `PUT /:id/status/buyer` | Order placement, stock deduction, farmer acceptance/rejection, stock restoration on rejection | Validated (Stock rollback, State transition guards) |
| **`rentalRoutes.js`** | `GET /`, `POST /`, `GET /:id`, `POST /:id/book`, `PUT /bookings/:id/status` | Agricultural machinery catalog, equipment bookings, availability checks | Validated (Relational integrity) |
| **`consultationRoutes.js`**| `POST /`, `GET /expert/:id`, `GET /farmer/:id`, `POST /:id/reply` | Expert advisory, crop diagnostic consultations | Validated |
| **`adminRoutes.js`** | `GET /stats`, `GET /users`, `PUT /users/:id/status`, `GET /crops`, `GET /orders` | Real SQL platform statistics, user moderation, dispute resolution | Validated (Real SQL aggregations) |
| **`settingsRoutes.js`** | `GET /:id`, `PUT /:id/profile`, `PUT /:id/password`, `PUT /:id/language` | Account details, password updates, persistent language preference | Validated |

---

## 3. Database Schema & Relational Integrity Audit

Database: `agriconnect` on `localhost:3306`

### 3.1 Core Table Architecture

```
                                 +------------------+
                                 |      users       |
                                 +--------+---------+
                                          | 1
              +---------------------------+---------------------------+
              | 1:N                       | 1:N                       | 1:N
     +--------v--------+         +--------v--------+         +--------v--------+
     |      crops      |         |   negotiations  |         | group_campaigns |
     +--------+--------+         +--------+--------+         +--------+--------+
              | 1:N                       | 1:N                       | 1:N
     +--------v--------+         +--------v--------+         +--------v--------+
     |   crop_images   |         | neg_messages    |         | gb_commitments  |
     +-----------------+         +-----------------+         +-----------------+
              |                           |                           |
              +---------------------------+---------------------------+
                                          |
                                 +--------v--------+
                                 |     orders      |
                                 +-----------------+
```

### 3.2 Key Relational Constraints & Cascade Policies
1. **`crop_images` $\rightarrow$ `crops`:** `CONSTRAINT fk_crop_images_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE`. Deleting a crop automatically and cleanly purges all its secondary image records from MySQL.
2. **`negotiations` $\rightarrow$ `crops`, `users`:** Foreign keys with `ON DELETE CASCADE` ensure integrity if user accounts or listings are removed.
3. **`group_buying_commitments` $\rightarrow$ `group_buying_campaigns`:** `CONSTRAINT fk_gb_commit_campaign FOREIGN KEY (campaign_id) REFERENCES group_buying_campaigns(id) ON DELETE CASCADE`.
4. **`orders` $\rightarrow$ `crops`, `users`:** Foreign keys link every confirmed purchase to authentic farmer and buyer records.

### 3.3 Database Performance Indexes Created
To eliminate table scans and optimize query response times:
- `CREATE INDEX idx_orders_status ON orders (status)`
- `CREATE INDEX idx_negotiations_status ON negotiations (status)`
- `CREATE INDEX idx_gb_status ON group_buying_campaigns (status)`
- Foreign key indices on all `farmer_id`, `buyer_id`, `crop_id`, and `campaign_id` columns.

---

## 4. Concurrency Safety & Transaction Verification

### 4.1 Group Buying Participation (`joinCampaign`)
- **Risk:** Race conditions when multiple buyers commit quantities simultaneously near maximum campaign capacity.
- **Solution Applied:** Wrapped in a dedicated connection transaction with row-level locking:
  ```sql
  SELECT * FROM group_buying_campaigns WHERE id = ? FOR UPDATE;
  ```
- **Integrity Guarantee:** The database acquires an exclusive lock on the campaign row. If remaining capacity is exceeded, the transaction automatically rolls back with `400 Bad Request` (`Only X kg remaining available in this campaign`), guaranteeing zero overselling.

### 4.2 Order Placement & Stock Reservation
- **Stock Guard:** When an order is placed, `crops.quantity` is immediately decremented:
  ```sql
  UPDATE crops SET quantity = quantity - ? WHERE id = ?;
  ```
- **Rejection Rollback:** If a farmer rejects or cancels the pending order, the reserved quantity is restored to the crop listing:
  ```sql
  UPDATE crops SET quantity = quantity + ? WHERE id = ?;
  ```

---

## 5. Security & Input Sanitization

- **SQL Injection Prevention:** 100% of SQL queries across all controllers utilize parameterized placeholders (`?`) provided by `mysql2`. Zero raw string concatenations in SQL statements.
- **Numeric Boundary Enforcement:**
  - Crop price and quantity: Rejected if $\le 0$ or non-numeric.
  - Negotiation offers: Rejected if $\le 0$ or exceeding available crop stock.
  - Group commitments: Enforces `min_per_buyer` and `max_per_buyer` limits.
- **Authentication & Identity:**
  - Passwords hashed with **bcrypt** (salt factor 10).
  - JWT tokens signed with SHA-256 HMAC and verified on protected mutations.

---

## 6. Audit Conclusion & Sign-Off

The backend architecture and MySQL database layer of AgriConnect are robust, secure, and fully persistent. Every user action (create, edit, upload, negotiate, pool, order) translates into authoritative SQL operations with complete data survivability across page reloads and server restarts.

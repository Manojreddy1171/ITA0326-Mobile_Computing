# 📦 WholesaleHub — Smart B2B Wholesale Marketplace for MSMEs

**WholesaleHub** is a mobile-first, cross-platform B2B marketplace platform built to promote **inclusive economic growth and digital empowerment** for small retailers, local kirana store owners, and MSME manufacturers across India.

Unlike traditional consumer retail or rigid enterprise procurement platforms, WholesaleHub introduces two breakthrough commercial models:
1. **Interactive Multi-Round Price Negotiations**: Retailers and manufacturers negotiate volume prices directly with built-in reserve floor protection (up to 5 rounds).
2. **Cooperative Group Buying Pools**: Independent small retailers aggregate their purchase orders together into community pools, unlocking Tier-1 distributor volume discounts usually reserved only for retail conglomerates.

---

## 🚀 Key Features

### 1. Cooperative Group Buying (Kirana Pools)
* **Tiered Volume Ladders**: Sellers launch deals where volume thresholds trigger steep price drops (e.g. 50 units @ 5% off, 150 units @ 10% off, 300 units @ 15% off).
* **Live Aggregate Progress**: Real-time progress bars update via WebSockets whenever any retailer pledges units.
* **Fair Price Guarantee**: When the deadline passes and MOQ is satisfied, every participant automatically pays the lowest unlocked tier price.

### 2. Multi-Round Bid Negotiation
* **Direct Price Proposals**: Buyers can bid custom prices and bulk quantities below list price.
* **Floor Price Guard**: Sellers set a confidential reserve price; offers below this floor are automatically flagged or blocked.
* **Structured 5-Round Counter-Offer Engine**: Clear chronological audit trail with real-time Socket.io updates, instant accept/reject, and automated order generation.

### 3. Mobile-First & Installable PWA
* Designed for smartphones used on the shop floor and warehouse dock.
* Bottom navigation bar for one-handed mobile ergonomics.
* Offline-ready service worker caching with install prompt for Android and iOS home screens.

### 4. Enterprise-Ready Architecture
* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, TanStack React Query v5, Zustand, Lucide Icons, Lightbox gallery.
* **Backend**: Node.js, Express, Socket.io (real-time rooms), Multer + Sharp (image processing), Zod validation, JWT + bcrypt.
* **Database**: MySQL with relational schema, foreign key constraints, indexes, and full seed data.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6 |
| **State & Data** | Zustand (persistent auth), TanStack React Query v5 |
| **Real-time** | Socket.io Client (rooms for offers, pools, orders) |
| **PWA** | `vite-plugin-pwa`, Web App Manifest, Service Worker caching |
| **Backend** | Node.js, Express REST API, Socket.io server, Node-Cron |
| **Security & Validation** | Helmet, CORS, Express Rate Limit, Zod schemas, JWT, Bcrypt |
| **Database** | MySQL (parameterized queries & connection pool) |
| **Media** | Sharp (WebP compression), Multer local upload abstraction |

---

## 📁 Project Structure

```
wholesalehub/
├── package.json              # Monorepo runner (concurrent dev, migrate, seed)
├── .env.example              # Environment variables template
├── README.md                 # Documentation
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Express app & Socket.io server bootstrap
│   │   ├── socket.js         # Room-based real-time event dispatcher
│   │   ├── cron.js           # Cron jobs (expired offers & closed pools)
│   │   ├── db/
│   │   │   ├── index.js      # MySQL connection pool
│   │   │   ├── schema.sql    # DDL with tables, indexes & constraints
│   │   │   ├── migrate.js    # Database migration runner
│   │   │   └── seed.js       # Realistic Indian wholesale demo data
│   │   ├── middleware/       # Auth, validation (Zod), upload (Multer/Sharp)
│   │   └── routes/           # Auth, Products, Offers, Pools, Orders, Notifications, Dashboard
│   └── __tests__/            # Jest + Supertest API integration tests
└── frontend/
    ├── package.json
    ├── vite.config.ts        # Vite + PWA manifest & service worker
    ├── tailwind.config.js    # Theme design tokens & custom colors
    ├── public/
    │   └── favicon.svg       # Brand icon
    └── src/
        ├── main.tsx          # App entry point with React Query & Toast
        ├── App.tsx           # Route declarations & role guards
        ├── components/       # Layout, Navbar, BottomNav, ProductCard, ProtectedRoute
        ├── pages/            # 16 complete responsive views
        ├── lib/              # Axios instance, Socket client, INR & date formatters
        └── store/            # Zustand auth state
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MySQL**: 8.0+ running locally or remotely

### 2. Setup Database
Create a MySQL database:
```sql
CREATE DATABASE wholesalehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure Backend Environment
Create `backend/.env` (or copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=wholesalehub

JWT_SECRET=wholesalehub_jwt_super_secret_key_2026
JWT_EXPIRES_IN=7d

UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
FRONTEND_URL=http://localhost:5173
```

### 4. Install Dependencies
In the root directory, run:
```bash
npm run install:all
```
*(Or navigate into `backend` and `frontend` and run `npm install` in each).*

### 5. Run Migrations & Seed Sample Data
```bash
# Inside backend directory:
npm run migrate
npm run seed
```

This populates categories (Groceries, FMCG, Agri, Apparel, Electronics), verified manufacturers, small retailers, products with pricing tiers, sample negotiations, and active cooperative group buying pools.

### 6. Run Frontend & Backend Together
From the root directory:
```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/health

---

## 👥 Demo Test Accounts

The seed script creates ready-to-test accounts with passwords pre-hashed using bcrypt:

| Role | Email | Password | Business Name |
|---|---|---|---|
| **Wholesale Seller** | `seller@wholesalehub.com` | `password123` | Royal Agro & FMCG Mills |
| **Wholesale Seller** | `textiles@wholesalehub.com` | `password123` | Surat Handloom Weavers |
| **Retail Buyer** | `buyer@wholesalehub.com` | `password123` | Balaji Supermarket & Kirana |
| **Retail Buyer** | `retailer2@wholesalehub.com` | `password123` | Krishna Stores |

*(You can also use the **Quick Demo Login** buttons on the login page to sign in with one click).*

---

## 🧪 Running Tests

Integration tests verify authentication, product creation, floor-price negotiation rules, and group-buying joins:
```bash
cd backend
npm test
```

---

## 📱 Mobile PWA Installation

WholesaleHub includes a Web App Manifest and Service Worker:
1. Open the app in Chrome (Android) or Safari (iOS).
2. Tap **"Install App"** or **"Add to Home Screen"**.
3. The app launches standalone without browser chrome, providing full native app ergonomics.

# AgriConnect – Smart Agricultural Marketplace

AgriConnect is an enterprise-grade full-stack digital marketplace connecting **farmers, wholesale buyers, agricultural experts, and equipment providers** on a transparent, real-time trading platform.

Built for both modern desktop and mobile browsers—with full **Android Studio WebView integration**—AgriConnect eliminates exploitative intermediaries, enables digital wholesale bargaining, pools collective buyer demand, and delivers verified farm machinery leasing.

---

## 🌟 Advanced Marketplace Modules

AgriConnect includes three specialized agricultural marketplace modules:

1. **Smart Wholesale Price Negotiator (`wholesale-negotiations.html`)**
   - Direct bilateral bargaining between farmers and wholesale buyers.
   - Transparent rule-based recommendation engine factoring asking price, offered price, volume thresholds, and farmer floor prices.
   - Comprehensive negotiation timeline log with instant one-click conversion to confirmed marketplace orders.

2. **Camera & Multi-Angle Image Upload Studio (`image-upload-studio.html`)**
   - Direct device camera capture (`capture="environment"`) and local photo gallery picker.
   - Multi-photo uploads (up to 5 images, max 5MB each) with instant thumbnail preview.
   - Dedicated primary cover manager to designate the main marketplace listing thumbnail.

3. **Smart Group Buying & Demand Pooling (`group-buying.html`)**
   - Collective wholesale order pooling enabling buyers to join forces and unlock bulk discount pricing.
   - Dynamic pooling progress bar reaching automated transition to `target_reached` (e.g. 500 kg threshold).
   - Atomic transaction tracking preventing overselling and double counting.

4. **Universal Responsive Drawer Navigation**
   - Seamless responsive experience across all screen sizes (320px to 1920px).
   - Sliding mobile drawer with dimmed blurred backdrop overlay (`#sidebarOverlay`) and zero sidebar-content overlapping.
   - Pinned 260px desktop sidebar with clean main content offset.

---

## 👥 Supported Roles & Dashboards

| Role | Access URL | Core Capabilities |
|---|---|---|
| **Farmer** | `/farmer-dashboard.html` | Manage crops, upload camera images, review incoming orders, negotiate wholesale prices, track group campaigns |
| **Wholesale Buyer** | `/buyer-dashboard.html` | Browse marketplace, place orders, negotiate price per kg, join group-buying pools |
| **Machinery Provider**| `/equipment-rental.html` | List tractors, harvesters, rotavators, water pumps; manage seasonal bookings |
| **Agronomist Expert**| `/expert-dashboard.html` | Provide soil, pest, and crop advisory consultations to local farmers |
| **Administrator** | `/admin-dashboard.html` | Monitor live platform KPIs, approve user registrations, resolve disputes and complaints |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or newer)
- **MySQL / MariaDB** (v8.0+, standard port 3306 or 3307)
- **Android Studio** (Optional, for native Android app build)

### 1. Installation
```bash
git clone https://github.com/Kilshan2801/AgriConnect.git
cd AgriConnect
npm install
```

### 2. Environment Configuration
Create or verify `.env` in the root folder:
```ini
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=agriconnect
DB_PORT=3306
PORT=5000
ADMIN_EMAIL=admin@agriconnect.com
ADMIN_PASSWORD=admin123
JWT_SECRET=super_secret_jwt_key_agriconnect_2026
```

### 3. Database Initialization & Demo Seeding
Run the automated migration and seed scripts:
```bash
# Initialize schema and seed demonstration accounts
node scripts/init_and_seed.js
node scripts/migrate_modules.js
node scripts/seed_advanced_modules_demo.js
node scripts/seed_college_demo.js
```

### 4. Start the Application Server
```bash
npm start
# or
node backend/server.js
```
The server will start listening at:
- Web: `http://localhost:5000`
- Android Emulator: `http://10.0.2.2:5000`

### 5. Run the Automated End-to-End Test Suite
Verify all 10 core workflows across authentication, product listings, checkout, negotiation, image studio, group pooling, equipment rentals, admin metrics, and persistence:
```bash
node scripts/test_e2e_all.js
```
Expected result: **14 / 14 PASSED (100%)**.

---

## 📱 Pre-Seeded Demonstration Accounts

All demo accounts use password `password123`:

- **Farmer (Lead):** `farmer@agriconnect.com` (Ramesh Kumar, Tamil Nadu)
- **Farmer (Crops):** `ravi.farmer@agriconnect.com` (Ravi Teja, Andhra Pradesh)
- **Farmer (Grains):** `suresh.farmer@agriconnect.com` (Suresh Gowda, Karnataka)
- **Wholesale Buyer:** `buyer@agriconnect.com` (Wholesale Hub)
- **Equipment Provider:** `equipment@agriconnect.com` (Machinery Leasing)
- **Agricultural Expert:** `expert@agriconnect.com` (Senior Agronomist)
- **System Administrator:** `admin@agriconnect.com` / `admin123`

---

## 📸 QA Screenshots & Audit Reports

Comprehensive visual before-and-after audit logs and screenshots are available at:
- `PROJECT_AUDIT.md` – Full architectural and route analysis.
- `FINAL_IMPLEMENTATION_REPORT.md` – End-to-end deliverables and test summary.
- `qa/UI_AUDIT_REPORT.md` – Responsive breakpoint analysis across 320px–1920px.
- `qa/screenshots/after/` – Visual screenshots of all pages on mobile, tablet, and desktop.

# AgriConnect – Complete Repository Audit & Architecture Report

**Project Name:** AgriConnect – Smart Agricultural Marketplace  
**Repository:** [Kilshan2801/AgriConnect](https://github.com/Kilshan2801/AgriConnect.git)  
**Demonstration Target:** Final-Year Engineering / Degree Project & Live College Showcase  
**Target Environment:** Local Node.js + MySQL 8.0, Modern Web Browsers, Android WebView Application  

---

## 1. System Architecture Overview

AgriConnect is designed as a high-performance, lightweight, monolithic full-stack agricultural marketplace platform with zero frontend framework overhead.

```
                      +-----------------------------------+
                      |      Client Presentation Layer    |
                      |   (HTML5, CSS3, ES6 JavaScript)   |
                      |    Desktop, Tablet, Mobile Web     |
                      |   + Android Native WebView App    |
                      +-----------------+-----------------+
                                        | HTTP / JSON REST
                                        v
                      +-----------------------------------+
                      |    Node.js / Express.js Backend   |
                      |   (Port 5000 / 0.0.0.0 Binding)   |
                      +--------+-----------------+--------+
                               |                 |
                   Multer File |                 | mysql2 Connection Pool
                   Storage     |                 | (Parameterized SQL)
                               v                 v
                      +-----------------+  +----------------------+
                      | /uploads Store  |  |    MySQL Database    |
                      | Multi-Image CDN |  |     (agriconnect)    |
                      +-----------------+  +----------------------+
```

### Core Technology Stack
- **Frontend Presentation:** Semantic HTML5, CSS3 (CSS Grid & Flexbox, Theme variables), Vanilla JavaScript (ES6+ async/await, Fetch API).
- **Universal Mobile Layer:** Responsive drawer navigation with `#sidebarOverlay` backdrop (`agri-navigation.css` & `agri-navigation.js`).
- **Android Native Container:** Android Studio project (`AgriConnect-Android/`), Kotlin 2.0+, SDK 35, Material 3, WebView with swipe-refresh and camera file-chooser integration.
- **Backend Application Layer:** Node.js (v20+), Express.js (v4.18+), JWT authentication, Bcrypt password hashing, Multer multipart storage.
- **Persistence & Database:** MySQL 8.0 on standard port 3306, `mysql2` driver with transaction isolation and parameterization.

---

## 2. Existing Frontend Screens & Role Portals

| Portal / Role | Primary Screens | Purpose & Working Functionality |
|---|---|---|
| **Public & Landing** | `index.html` | Hero, 4 core capability cards, dynamic crop listings from `/api/crops`, 3-step workflow, footer. |
| **Authentication** | `login.html`, `register.html`, `admin-login.html` | Multi-role registration (Farmer, Buyer, Expert, Provider), password toggle, JWT session management, role routing. |
| **Farmer Portal** | `farmer-dashboard.html`<br>`my-crops.html`<br>`orders.html`<br>`image-upload-studio.html` | Farm summary metrics, crop inventory CRUD, incoming order confirmation, multi-angle camera image studio. |
| **Buyer Portal** | `buyer-dashboard.html`<br>`marketplace.html`<br>`buyer-orders.html`<br>`buyer-search-crops.html` | Order tracking, crop catalog browsing, direct checkout, price bargaining entry point. |
| **Negotiator Module** | `wholesale-negotiations.html` | Bilateral wholesale bargaining dashboard, smart rule-based counteroffer advice, offer timeline, agreement finalization. |
| **Group Buying Module**| `group-buying.html` | Wholesale bulk pooling campaigns, target progress visualization (e.g., 500 kg), commitment joining. |
| **Equipment Portal** | `equipment-rental.html` | Farm machinery catalog (tractors, harvesters), booking calendar, date validation, provider confirmations. |
| **Expert Portal** | `expert-dashboard.html`<br>`consultations.html`<br>`expert-consultations.html` | Farmer agronomy advisory requests, consultation scheduling, pest & soil guidance. |
| **Admin Portal** | `admin-dashboard.html`<br>`admin-manage-users.html`<br>`admin-registrations.html`<br>`admin-conflicts.html` | Platform KPIs (users, listings, orders, negotiations, campaigns), user approval/deactivation, report resolution. |
| **Shared Utilities** | `messages.html`, `notifications.html`, `history.html`, `settings.html`, `help-support.html` | User communications, transactional alerts, audit trail logs, profile settings. |

---

## 3. Backend API Route Catalog

| Endpoint Namespace | Router File | Key Operations Supported |
|---|---|---|
| `/api/auth` | `authRoutes.js`, `adminAuthRoutes.js` | User registration, login, admin authentication, password reset, role switches. |
| `/api/crops` | `cropRoutes.js` | Create crop, list active marketplace crops, filter by category/location, update stock, delete listing. |
| `/api/orders` | `orderRoutes.js` | Place order, farmer order status update (pending -> confirmed -> delivered), buyer order history. |
| `/api/negotiations` | `negotiationRoutes.js` | Create offer, fetch recommendation counteroffer, farmer counter/accept/reject, buyer accept/counter, timeline audit. |
| `/api/images` | `imageRoutes.js` | Multi-image multipart upload (up to 5 photos), primary thumbnail toggle, image deletion, crop image gallery. |
| `/api/group-buying` | `groupBuyingRoutes.js` | Create pooling campaign, list active campaigns, commit purchase quantity, calculate demand percentage. |
| `/api/rentals` | `rentalRoutes.js` | List equipment, request rental, conflict checking, approve/cancel booking. |
| `/api/consultations`| `consultationRoutes.js` | Book expert consultation, message exchange, consultation status update. |
| `/api/admin` | `adminRoutes.js` | Platform summary aggregation stats (`/api/admin/dashboard-stats`, `/api/admin/stats`), user approvals, account deactivations. |
| `/api/notifications`| `notificationRoutes.js` | Transactional alerts, unread counts, mark-as-read. |
| `/api/messages` | `messageRoutes.js` | Farmer-buyer and farmer-expert direct messaging threads. |
| `/api/reports` | `reportRoutes.js` | Conflict and fraud reporting, dispute resolution status updates. |
| `/api/settings` | `settingsRoutes.js` | User profile updates, notification preferences, contact details. |

---

## 4. Database Schema & Tables

The MySQL `agriconnect` database houses 19 relational tables with foreign key integrity and transactional safety:

1. `users`: Core account details (`id`, `first_name`, `last_name`, `email`, `phone`, `password`, `is_active`, `created_at`).
2. `user_roles`: Role mappings (`user_id`, `role`: `'farmer'`, `'buyer'`, `'expert'`, `'equipment_provider'`, `'admin'`).
3. `farmer_profiles`: Farm location, district, state, land area, primary crops.
4. `buyer_profiles`: Business name, delivery phone, preferred district, purchase type.
5. `expert_profiles`: Specialization, qualifications, years of experience.
6. `equipment_provider_profiles`: Business name, operational districts, fleet summary.
7. `crops`: Crop listings (`farmer_id`, `crop_name`, `category`, `price_per_unit`, `quantity`, `unit`, `location`, `status`).
8. `crop_images`: Multi-angle photos (`crop_id`, `image_url`, `is_primary`, `uploaded_at`).
9. `orders`: Marketplace orders (`buyer_id`, `crop_id`, `farmer_id`, `quantity`, `total_price`, `status`, `delivery_address`).
10. `order_items`: Line-item breakdown for multi-product cart checkouts.
11. `negotiations`: Wholesale price negotiations (`buyer_id`, `farmer_id`, `crop_id`, `quantity`, `initial_price`, `offered_price`, `counter_price`, `final_agreed_price`, `status`).
12. `negotiation_messages`: Dialogue history and rule recommendation logs.
13. `group_buying_campaigns`: Demand pooling campaigns (`farmer_id`, `crop_id`, `target_quantity`, `current_quantity`, `discount_price`, `original_price`, `status`, `deadline`).
14. `group_buying_commitments`: Individual buyer pooled pledges (`campaign_id`, `buyer_id`, `committed_quantity`, `status`).
15. `equipment`: Machinery listings (`provider_id`, `name`, `category`, `daily_rate`, `availability_status`, `image_url`).
16. `rental_requests`: Rental bookings (`equipment_id`, `farmer_id`, `start_date`, `end_date`, `total_amount`, `status`).
17. `consultations`: Agronomist advisory requests (`farmer_id`, `expert_id`, `topic`, `status`, `scheduled_at`).
18. `messages`: User-to-user communications (`sender_id`, `receiver_id`, `message`, `is_read`, `created_at`).
19. `notifications`: Real-time transactional events (`user_id`, `title`, `message`, `is_read`, `related_type`, `related_id`).

---

## 5. Audit of Issues & Solutions Applied

| Problem Identified in Legacy Code | Root Cause | Engineering Solution Implemented |
|---|---|---|
| **Sidebar Overlapping Content** | Desktop sidebar had fixed position without mobile collapsing logic or dimmed backdrop | Built universal `agri-navigation.css` & `agri-navigation.js` with sliding drawer (`transform: translateX`), `#sidebarOverlay` backdrop, and tap-outside dismiss. |
| **Buyer Dashboard Layout Squeeze** | Fixed 210px sidebar on viewports $< 700\text{px}$ without hamburger menu toggle | Added hamburger menu button (`#mobileMenu`), drawer animation, and responsive content margins. |
| **Landing Page Outdated** | Previous `index.html` was a simple dual-card splash screen | Rebuilt `index.html` into a modern agricultural landing page featuring hero section, 4 capability cards, live database crop cards, and 3-step guide. |
| **Missing Module 1 (Negotiator)** | No digital price bargaining system | Created `backend/controllers/negotiationController.js`, `wholesale-negotiations.html`, and seeded live tomato negotiation. |
| **Missing Module 2 (Camera Studio)**| Single file upload with no multi-angle or camera support | Created `imageController.js`, `image-upload-studio.html` supporting device camera (`capture="environment"`), gallery picker, and primary cover manager. |
| **Missing Module 3 (Group Buying)** | No collective purchasing mechanism | Created `groupBuyingController.js`, `group-buying.html`, and demand pooling engine with 500 kg tomato campaign. |
| **Admin Stats Hardcoding** | Platform metrics did not reflect recent marketplace listings or orders | Enhanced `adminController.js` and `adminRoutes.js` with live SQL aggregations for users, listings, orders, negotiations, and campaigns. |

---

## 6. Implementation & Verification Plan

1. **Step 1:** Modernize Landing Page (`frontend/index.html`) using designated theme (`#2E7D32`, `#66BB6A`, `#F8FAF8`, `#FF9800`, `#263238`).
2. **Step 2:** Enhance Admin Dashboard stats controller and UI cards.
3. **Step 3:** Verify Farmer and Buyer Dashboard navigation links and summary cards.
4. **Step 4:** Execute comprehensive 10-step End-to-End Automated Test Suite (`scripts/test_e2e_all.js`).
5. **Step 5:** Generate Before-and-After QA Screenshots and report (`qa/UI_AUDIT_REPORT.md`).
6. **Step 6:** Prepare final documentation (`FINAL_IMPLEMENTATION_REPORT.md`) and compile Android release APK.

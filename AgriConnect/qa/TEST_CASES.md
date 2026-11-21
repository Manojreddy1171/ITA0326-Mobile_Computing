# AgriConnect – Comprehensive Quality Assurance Test Cases

**Test Suite:** End-to-End Functional, Boundary & Security Regression  
**Target:** AgriConnect v2.0 Smart Agricultural Marketplace  
**Execution Environment:** Node.js v20+, MySQL 8.0 (Port 3306), Headless Chrome / Android WebView  

---

## 1. Authentication & Role Authorization (TC-AUTH)

| Test ID | Scenario | Preconditions | Input Data | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| **TC-AUTH-01** | Farmer Registration | Valid unique credentials | Name, unique phone, email, district, password | User record created in `users`, role in `user_roles`, profile in `farmer_profiles`, HTTP 201 | ✅ PASS |
| **TC-AUTH-02** | Farmer Login | Registered active user | Correct email/phone and password, role: `farmer` | HTTP 200, JWT token returned, redirection to `farmer-dashboard.html` | ✅ PASS |
| **TC-AUTH-03** | Buyer Login | Registered active user | Correct email/phone and password, role: `buyer` | HTTP 200, JWT token returned, redirection to `buyer-dashboard.html` | ✅ PASS |
| **TC-AUTH-04** | Invalid Password Rejection | Registered account | Valid email, incorrect password | HTTP 401 Unauthorized, descriptive error message, zero token issued | ✅ PASS |
| **TC-AUTH-05** | Admin Login | Server-side credentials | `admin@agriconnect.com`, `admin123` | HTTP 200, JWT issued, access to admin dashboard | ✅ PASS |

---

## 2. Module 1: Smart Wholesale Price Negotiator (TC-NEG)

| Test ID | Scenario | Preconditions | Input Data | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| **TC-NEG-01** | Rule-Based Recommendation | Crop listing exists | Asking: ₹50, Offered: ₹42, Qty: 100 kg | Recommendation returns suggested counteroffer between ₹45–48/kg (₹46.6/kg) based on volume discount formula | ✅ PASS |
| **TC-NEG-02** | Buyer Initiates Wholesale Offer | Logged in as Buyer | Crop ID: 2, Qty: 100 kg, Offer: ₹42/kg | Negotiation created in `negotiations` (status: `pending`), message logged in `negotiation_messages` | ✅ PASS |
| **TC-NEG-03** | Farmer Submits Counteroffer | Logged in as Farmer | Negotiation ID, Counter: ₹47/kg | Negotiation status transitions to `countered`, counter price updated, notification sent to buyer | ✅ PASS |
| **TC-NEG-04** | Buyer Accepts Counteroffer | Logged in as Buyer | Negotiation ID, status: `countered` | Negotiation status transitions to `accepted`, final price locked at ₹47/kg, total ₹4,700 | ✅ PASS |
| **TC-NEG-05** | Convert Agreement to Order | Accepted negotiation | Buyer ID, delivery address | Order generated in `orders` table applying agreed wholesale price ₹47/kg | ✅ PASS |
| **TC-NEG-06** | Boundary: Negative Price Rejection| Crop listing exists | Offered price: -₹10/kg | HTTP 400 Bad Request: "Offered price must be a positive number greater than zero." | ✅ PASS |
| **TC-NEG-07** | Boundary: Zero Quantity Rejection | Crop listing exists | Quantity: 0 kg | HTTP 400 Bad Request: "Requested quantity must be a positive number greater than zero." | ✅ PASS |
| **TC-NEG-08** | Security: Duplicate Acceptance | Already accepted deal | Accept request sent again | HTTP 400 Bad Request: "Negotiation is already accepted." | ✅ PASS |

---

## 3. Module 2: Camera & Multi-Angle Image Upload Studio (TC-IMG)

| Test ID | Scenario | Preconditions | Input Data | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| **TC-IMG-01** | Multi-Image Gallery Retrieval | Crop with photos exists | Crop ID: 2 | Returns image array with `image_path` and `is_primary` flag | ✅ PASS |
| **TC-IMG-02** | Primary Cover Selector | Multiple crop photos | Crop ID: 2, Target Image ID | Designates target image as primary (`is_primary = 1`), resets others to 0, updates `crops.image` | ✅ PASS |
| **TC-IMG-03** | Camera Capture Flow Verification| Mobile browser / WebView | `capture="environment"` attribute | Camera triggers native device camera picker rather than only file browser | ✅ PASS |
| **TC-IMG-04** | Negative: Empty Upload Rejection | Product add screen | No file attached | HTTP 400 Bad Request: "No image file uploaded." | ✅ PASS |
| **TC-IMG-05** | Negative: File Format Validation | Image upload route | Non-image file (e.g. `.exe`, `.txt`) | Multer file filter rejects upload: "Only JPEG, PNG, and WebP images are allowed." | ✅ PASS |

---

## 4. Module 3: Smart Group Buying & Demand Pooling (TC-GRP)

| Test ID | Scenario | Preconditions | Input Data | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| **TC-GRP-01** | 500 kg Cooperative Pooling Goal | Active campaign | Target: 500 kg, 4 buyers commit | Cumulative demand reaches 500 kg (100%), automated status update to `target_reached` | ✅ PASS |
| **TC-GRP-02** | Buyer Joins Active Group Pool | Logged in as Buyer | Campaign ID: 1, Qty: 20 kg | Pledged quantity added to `group_buying_commitments`, progress percentage recalculated | ✅ PASS |
| **TC-GRP-03** | Four Buyer Progression Tracking | Fresh 500 kg campaign | 100 kg, 150 kg, 200 kg, 50 kg | Progress bar increments: 20% -> 50% -> 90% -> 100% | ✅ PASS |
| **TC-GRP-04** | Commitment Cancellation & Recalc| Buyer with commitment | Commitment ID, cancel request | Status marked `cancelled`, campaign quantity decremented, status recalculated | ✅ PASS |
| **TC-GRP-05** | Smart Demand Insights API | Active campaigns | `/api/group-buying/recommendations` | Returns campaigns prioritized by high completion progress (>70%) and discount percentages | ✅ PASS |
| **TC-GRP-06** | Boundary: Expired Campaign Guard | Past deadline campaign | Attempt commitment | HTTP 400 Bad Request: "This campaign has expired and cannot accept new commitments." | ✅ PASS |

---

## 5. Marketplace, Orders & Rentals (TC-MKT / TC-RENT)

| Test ID | Scenario | Preconditions | Input Data | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| **TC-MKT-01** | Crop Catalog Browsing | Active crops in DB | `GET /api/crops` | Returns array of approved crops with pricing, stock, farmer name, and thumbnail | ✅ PASS |
| **TC-MKT-02** | Direct Checkout Order Creation | Logged in as Buyer | Buyer ID, Crop ID, 25 kg, address | Order recorded in `orders` (status: `pending`), stock reserved | ✅ PASS |
| **TC-MKT-03** | Farmer Confirms Incoming Order | Logged in as Farmer | Order ID, status: `accepted` | Order status updated to `accepted`, notification dispatched to buyer | ✅ PASS |
| **TC-RENT-01**| Machinery Provider Fleet Listing| Equipment in DB | `GET /api/rentals/providers` | Returns verified providers with tractor, harvester, pump, and rotavator availability | ✅ PASS |

---

## 6. Admin Governance & Platform Analytics (TC-ADM)

| Test ID | Scenario | Preconditions | Input Data | Expected Result | Pass/Fail |
|---|---|---|---|---|---|
| **TC-ADM-01** | Real SQL Aggregation KPIs | Admin session | `GET /api/admin/stats` | Returns live calculated counts for Users (14), Farmers (4), Buyers (8), Listings (9), Orders (5), Negotiations (4), Campaigns (1) | ✅ PASS |
| **TC-ADM-02** | User Registration Moderation | Pending registration | Registration ID, status: `approved` | Updates user status, enables full role access, sends welcome notification | ✅ PASS |

---

## 7. Responsive Navigation & Zero Sidebar Overlap (TC-RESP)

| Test ID | Scenario | Viewport | Expected Behavior | Pass/Fail |
|---|---|---|---|---|
| **TC-RESP-01** | Compact Android Phone | $320 \times 640$ | Sidebar hidden offscreen (`translateX(-100%)`), hamburger menu visible, $0\text{px}$ horizontal overflow | ✅ PASS |
| **TC-RESP-02** | Standard Android Phone | $393 \times 852$ | Full responsive cards, sliding drawer opens on tap with dimmed `#sidebarOverlay` backdrop | ✅ PASS |
| **TC-RESP-03** | Android Tablet Portrait | $800 \times 1280$ | Drawer collapsed offscreen, cards wrap in responsive 2-column grid, tap-outside dismiss active | ✅ PASS |
| **TC-RESP-04** | Desktop Monitor | $1280 \times 800$ | Pinned 260px sidebar, main content offset with `margin-left: 260px`, zero overlap | ✅ PASS |
| **TC-RESP-05** | Full HD Desktop Monitor | $1920 \times 1080$ | Fixed navigation, centered content containers, accessible touch targets ($\ge 44\text{px}$) | ✅ PASS |

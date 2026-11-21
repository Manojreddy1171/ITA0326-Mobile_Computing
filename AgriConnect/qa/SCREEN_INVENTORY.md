# AgriConnect – Complete Screen & Portal Inventory

**Total Screens Discovered:** 56  
**Total Screens Tested:** 56  
**HTTP 200 Verification:** 56 / 56 (100%)  
**Audit Date:** 2026-11-21  

---

## 1. Public & Core Authentication Screens

| # | Screen File | User Role / Audience | Primary Capabilities | HTTP Status | Test Result |
|---|---|---|---|---|---|
| 1 | `index.html` | Public / Guest | Modern Landing Page: Hero, 4 Core Modules, Live Featured Crops, 3-step guide, Footer | 200 OK | ✅ PASS |
| 2 | `login.html` | All Users | Role-based authentication (Farmer, Buyer, Expert, Provider), password toggle, JWT creation | 200 OK | ✅ PASS |
| 3 | `register.html` | New Users | Multi-role registration form with document validation and district selector | 200 OK | ✅ PASS |
| 4 | `select-role.html` | Multi-role Users | Role switcher for users holding both farmer and buyer credentials | 200 OK | ✅ PASS |
| 5 | `admin-login.html` | Administrator | Server-side verified administrative sign in | 200 OK | ✅ PASS |
| 6 | `help-support.html` | Public / Users | Platform FAQs, contact information, terms of service, privacy policy | 200 OK | ✅ PASS |

---

## 2. Farmer Portal Screens

| # | Screen File | User Role | Primary Capabilities | HTTP Status | Test Result |
|---|---|---|---|---|---|
| 7 | `farmer-dashboard.html`| Farmer | Farm summary KPIs, incoming orders, negotiations, group campaigns, responsive drawer | 200 OK | ✅ PASS |
| 8 | `my-crops.html` | Farmer | Crop inventory CRUD, pricing updates, stock quantities | 200 OK | ✅ PASS |
| 9 | `orders.html` | Farmer | Incoming buyer order processing (pending -> accepted -> delivered) | 200 OK | ✅ PASS |
| 10| `image-upload-studio.html`| Farmer | **Module 2**: Mobile camera capture, multi-photo picker, primary cover manager | 200 OK | ✅ PASS |
| 11| `wholesale-negotiations.html`| Farmer / Buyer | **Module 1**: Bilateral price negotiation dashboard, counteroffers, order conversion | 200 OK | ✅ PASS |
| 12| `group-buying.html` | Farmer / Buyer | **Module 3**: Wholesale demand pooling campaigns, 500 kg milestone, commitment tracking | 200 OK | ✅ PASS |
| 13| `calendar.html` | Farmer | Harvest scheduling and activity planner | 200 OK | ✅ PASS |
| 14| `consultations.html` | Farmer | Agronomist expert consultation booking and history | 200 OK | ✅ PASS |
| 15| `messages.html` | Farmer | In-app messaging threads with buyers and agronomists | 200 OK | ✅ PASS |
| 16| `notifications.html` | Farmer | Real-time transactional order and negotiation alerts | 200 OK | ✅ PASS |
| 17| `report-issues.html` | Farmer | Marketplace conflict and dispute reporting form | 200 OK | ✅ PASS |
| 18| `history.html` | Farmer | Audit trail of past transactions and crop sales | 200 OK | ✅ PASS |
| 19| `settings.html` | Farmer | Profile management, phone, district, and notification preferences | 200 OK | ✅ PASS |

---

## 3. Wholesale Buyer Portal Screens

| # | Screen File | User Role | Primary Capabilities | HTTP Status | Test Result |
|---|---|---|---|---|---|
| 20| `buyer-dashboard.html` | Buyer | Active orders, pending negotiations, group purchases, quick discovery links | 200 OK | ✅ PASS |
| 21| `marketplace.html` | Buyer | Crop catalog browsing, category filtering, direct checkout modal, price bargaining | 200 OK | ✅ PASS |
| 22| `buyer-search-crops.html`| Buyer | Text and visual crop search with live filtering | 200 OK | ✅ PASS |
| 23| `buyer-orders.html` | Buyer | Order status tracking, dispatch updates, order receipt confirmation | 200 OK | ✅ PASS |
| 24| `buyer-messages.html` | Buyer | Buyer-to-farmer direct communications | 200 OK | ✅ PASS |
| 25| `buyer-notifications.html`| Buyer | Counteroffer alerts, campaign updates, order confirmations | 200 OK | ✅ PASS |
| 26| `buyer-report-issues.html`| Buyer | Quality dispute and delivery conflict submission | 200 OK | ✅ PASS |
| 27| `buyer-history.html` | Buyer | Historical purchase invoices and past contracts | 200 OK | ✅ PASS |
| 28| `buyer-settings.html` | Buyer | Delivery addresses, contact numbers, account settings | 200 OK | ✅ PASS |
| 29| `buyer-help-support.html`| Buyer | Buyer FAQs and wholesale dispute resolution policies | 200 OK | ✅ PASS |

---

## 4. Equipment Provider Portal Screens

| # | Screen File | User Role | Primary Capabilities | HTTP Status | Test Result |
|---|---|---|---|---|---|
| 30| `equipment-rental.html` | Farmer / Provider| Farm machinery catalog (Tractors, Harvesters, Pumps, Rotavators), booking calendar | 200 OK | ✅ PASS |
| 31| `rental-dashboard.html` | Provider | Equipment fleet utilization, active rentals, revenue summary | 200 OK | ✅ PASS |
| 32| `rental-equipment.html` | Provider | Machinery inventory management, daily rental rates, garage stock | 200 OK | ✅ PASS |
| 33| `rental-orders.html` | Provider | Rental request approval, dispatch tracking, equipment return | 200 OK | ✅ PASS |
| 34| `rental-messages.html` | Provider | Farmer communications regarding equipment delivery | 200 OK | ✅ PASS |
| 35| `rental-notifications.html`| Provider| Booking alerts and return notices | 200 OK | ✅ PASS |
| 36| `rental-history.html` | Provider | Rental transaction log and past leases | 200 OK | ✅ PASS |
| 37| `rental-report-issues.html`| Provider| Equipment damage and payment dispute reporting | 200 OK | ✅ PASS |
| 38| `rental-settings.html` | Provider | Provider business details and operating districts | 200 OK | ✅ PASS |
| 39| `rental-help-support.html` | Provider| Equipment rental agreement guidelines | 200 OK | ✅ PASS |

---

## 5. Agricultural Expert Portal Screens

| # | Screen File | User Role | Primary Capabilities | HTTP Status | Test Result |
|---|---|---|---|---|---|
| 40| `expert-dashboard.html` | Expert | Agronomy consultation requests, active cases, upcoming appointments | 200 OK | ✅ PASS |
| 41| `expert-consultations.html`| Expert | Farmer consultation queue management and advisory notes | 200 OK | ✅ PASS |
| 42| `expert-consultation-chat.html`| Expert| Real-time consultation chat with farmers | 200 OK | ✅ PASS |
| 43| `expert-resources.html` | Expert | Soil health, pest control, and seasonal crop guide repository | 200 OK | ✅ PASS |
| 44| `expert-notifications.html`| Expert| New advisory request alerts | 200 OK | ✅ PASS |
| 45| `expert-history.html` | Expert | Completed consultations and farmer feedback logs | 200 OK | ✅ PASS |
| 46| `expert-report-issues.html`| Expert| Platform issue reporting | 200 OK | ✅ PASS |
| 47| `expert-settings.html` | Expert | Professional credentials, specialization, available hours | 200 OK | ✅ PASS |
| 48| `expert-help-support.html`| Expert | Expert community guidelines and FAQs | 200 OK | ✅ PASS |

---

## 6. System Administrator Portal Screens

| # | Screen File | User Role | Primary Capabilities | HTTP Status | Test Result |
|---|---|---|---|---|---|
| 49| `admin-dashboard.html` | Admin | Real SQL aggregation platform KPIs (Users, Farmers, Buyers, Listings, Orders, Negotiations, Campaigns) | 200 OK | ✅ PASS |
| 50| `admin-registrations.html`| Admin | Farmer, Expert, and Provider application approval/rejection | 200 OK | ✅ PASS |
| 51| `admin-manage-users.html` | Admin | User account activation, deactivation, and conduct scoring | 200 OK | ✅ PASS |
| 52| `admin-conflicts.html` | Admin | Dispute resolution, report review, warning dispatches | 200 OK | ✅ PASS |
| 53| `admin-history.html` | Admin | System audit trail logs and moderation events | 200 OK | ✅ PASS |
| 54| `admin-notifications.html`| Admin | System broadcast messages and alerts | 200 OK | ✅ PASS |
| 55| `admin-settings.html` | Admin | System parameters and administrative security settings | 200 OK | ✅ PASS |
| 56| `admin-help-support.html` | Admin | Administrator internal documentation and SOPs | 200 OK | ✅ PASS |

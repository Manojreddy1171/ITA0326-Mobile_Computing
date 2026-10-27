# ITA0326 - Mobile Computing Capstone

# Smart B2B Mobile Wholesale Marketplace
> **Course Code:** ITA0326 &bull; **Project:** Mobile Wholesale Marketplace Capstone  
> **Repository:** [https://github.com/Manojreddy1171/ITA0326-Mobile_Computing.git](https://github.com/Manojreddy1171/ITA0326-Mobile_Computing.git)

---

## 📌 Executive Summary & Research Gap
Traditional B2B wholesale commerce across small and medium retail enterprises (SMEs / Kirana stores) suffers from three structural bottlenecks:
1. **Opaque & Fragmented Pricing:** Prices are haggled via undocumented phone calls or informal chat groups without audit trails.
2. **High Minimum Order Quantities (MOQs):** Small independent retailers cannot purchase factory-direct lots individually because manufacturers enforce large volume thresholds.
3. **Substandard Lot Deliveries:** Catalogues rely on static stock photos, leading to high dispute rates upon delivery.

This project delivers a **Smart Mobile Wholesale Marketplace** designed to bridge this gap with **three integrated core modules**:
- **Module 1: Smart Wholesale Price Negotiator** (Structured bilateral offer/counter-offer engine with contract deal-locking).
- **Module 2: Camera & Visual Listing Engine** (Device camera capture, compression diagnostics, and high-resolution optical inspection).
- **Module 3: Smart Group Buying & Demand Pooling** (Live multi-retailer demand aggregation to breach supplier MOQs and unlock volume discounts).

---

## 🏗️ System Architecture & Workflow

```
+---------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                    |
|   Responsive Mobile Web Viewport (iPhone Frame Mockup) / Fluid Tablet View      |
|   - Buyer Interface: Browse, Propose Offers, Join Pools, Inspect Lots           |
|   - Seller Interface: Upload Visual Listings, Counter Offers, Manage MOQ Pools  |
+---------------------------------------------------------------------------------+
                                        │
                                        ▼
+---------------------------------------------------------------------------------+
|                                APPLICATION LOGIC                                |
|   - Role-Based Access Control (Buyer Persona vs Seller Persona)                 |
|   - Audio Feedback Engine (Web Audio API Chimes)                                |
|   - Real-Time Device Camera Controller (`navigator.mediaDevices.getUserMedia`)   |
+---------------------------------------------------------------------------------+
           │                                    │                               │
           ▼                                    ▼                               ▼
┌───────────────────────┐            ┌──────────────────────┐        ┌─────────────────────┐
│       MODULE 1        │            │       MODULE 2       │        │      MODULE 3       │
│ Smart Price Negotiator│            │ Camera & Visuals     │        │ Group Demand Pooling│
├───────────────────────┤            ├──────────────────────┤        ├─────────────────────┤
│ - Bilateral Bidding   │            │ - Live Camera Stream │        │ - MOQ Target Bar    │
│ - Counter-Offer Logic │            │ - Image Compression  │        │ - Tiered Discounts  │
│ - Offer Audit Trail   │            │ - Quality Validation │        │ - Multi-Buyer Pool  │
│ - Deal Locking Engine │            │ - Optical Zoom Modal │        │ - Co-Buyer Simulator│
└───────────────────────┘            └──────────────────────┘        └─────────────────────┘
                                        │
                                        ▼
+---------------------------------------------------------------------------------+
|                         STORAGE & PERSISTENCE LAYER                             |
|   - LocalStorage State Engine (Products, Pools, Negotiations, Contracts)         |
+---------------------------------------------------------------------------------+
```

---

## 🚀 The Three Core Modules

### 1. Module 1: Smart Wholesale Price Negotiator
- **Input:** Target purchase quantity and buyer's customized proposed price per unit.
- **Workflow:** 
  1. Buyer transmits a binding proposal.
  2. Seller receives the offer in their dashboard and can **Accept**, **Reject**, or propose a **Counter-Offer** (with custom rate and quantity).
  3. Buyer can accept the counter-offer or negotiate further.
  4. Once agreed, the deal automatically transitions to `LOCKED`, freezing the pricing and generating a wholesale contract reference.
- **Output:** Transparent audit trail and legally binding order terms.

### 2. Module 2: Camera & Visual Listing Engine
- **Input:** Direct device camera stream (`getUserMedia`) or high-res gallery uploads.
- **Workflow:**
  1. Seller captures raw lot photos before shipping.
  2. System runs real-time compression diagnostics (displaying raw KB, compressed WebP estimation, and resolution).
  3. Buyers utilize the **Optical Inspection Zoomer** (up to 300% zoom with reset controls) to inspect lot cleanliness, packaging, and batch stamps.
- **Output:** Verified visual proof of the physical wholesale batch.

### 3. Module 3: Smart Group Buying & Demand Pooling
- **Input:** Small order commitments (e.g., 5 to 20 units) from multiple local retail stores.
- **Workflow:**
  1. Wholesalers list products with tiered volume thresholds (e.g., Tier 1: 40 units @ 8% off; Tier 2: 75 units @ 15% off; Tier 3: 100 units @ 22% off).
  2. Demand automatically accumulates into a pooled progress bar.
  3. Retailers can use the **"+ Simulate Co-Buyer"** button during presentations to demonstrate live progress accumulation and automatic tier unlocking.
- **Output:** Small retailers achieve manufacturer wholesale discounts without exceeding their capital capacity.

---

## 🛠️ Technology Stack & Dependencies

- **Frontend Core:** HTML5 Semantic Structure, Vanilla JavaScript (ES6+ Classes, Async/Await).
- **Styling & Design System:** Vanilla CSS3 (Custom design tokens, glassmorphism, responsive grid, dynamic smartphone bezel mockup).
- **Device APIs:**
  - `navigator.mediaDevices.getUserMedia` for camera access.
  - `HTMLCanvasElement` for instantaneous snapshot capture and image compression processing.
  - `FileReader` for device gallery imports.
  - `Web Audio API` for audio cues on deal locks, camera shutter clicks, and notifications.
- **Typography:** Plus Jakarta Sans & JetBrains Mono (Google Fonts).

---

## 💻 How to Run Locally

You can run this project using any local web server or open directly in your browser:

### Option 1: Using Python
```bash
python -m http.server 3000
```
Then navigate to: `http://localhost:3000`

### Option 2: Using Node.js / npx serve
```bash
npx serve .
```

### Option 3: Direct Browser Launch
Double-click `index.html` in your file explorer to open it in Chrome, Edge, Safari, or Firefox.

---

## 📱 Mobile Frame vs Full-Width Mode
- Use the **Mobile Frame** toggle on the top navigation bar to experience the application exactly as it appears on an iPhone 16 Pro device.
- Switch to **Full Width** mode for presentation on projector screens or wide desktop monitors.
- Use the **Active Role** selector (Buyer vs Seller) to view perspective-specific controls.

---

## 📁 Repository Structure
```
ITA0326-Mobile_Computing/
├── index.html                           # Main application single-page structure
├── styles.css                           # Mobile design system, phone shell & theme
├── app.js                               # Core business logic for all 3 modules
├── README.md                            # Comprehensive project documentation
├── .gitignore                           # Git ignore configuration
└── docs/                                # Project presentations and coursework documents
    ├── Mobile_Marketplace_Capstone.pptx      # Capstone slide deck presentation
    ├── Frequency_Reuse_Concept_Map_Report.docx # Coursework assessment report
    └── *.docx                           # Assessment reports and solved assignments
```
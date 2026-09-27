# PocketPOS — Product Requirements Document (PRD)

## 1. Executive Summary & Product Vision

**PocketPOS** is a smartphone-first, cloud-native Point of Sale (POS), inventory management, and digital ledger system tailored for small and medium-sized retail businesses. 

### 1.1 The Core Problem
Traditional POS setups in emerging markets (particularly Pakistan) require:
- Expensive desktop PCs or proprietary touchscreen terminals ($300–$1,000+ upfront cost)
- Handheld laser barcode scanners and tangled cables
- Continuous electricity / UPS backup to prevent power-outage crashes
- Complicated, dated desktop software that requires formal staff training
- Separate physical khata (notebooks) for tracking customer credit (*Udhaar*)

### 1.2 The PocketPOS Solution
PocketPOS transforms any standard Android or iOS smartphone into an all-in-one retail terminal:
- **Zero Dedicated Hardware**: The phone camera acts as an ultra-fast barcode scanner.
- **Pocket-Ready**: Complete a sale, deduct inventory, record payment, and generate a receipt while moving around the store or standing at a compact counter.
- **Integrated Udhaar Ledger**: Seamlessly records partial payments and customer credit directly during checkout.
- **Cloud Centralization**: Business owners can monitor live sales, staff performance, stock levels, and profits from anywhere.
- **Frictionless Digital Receipts**: Instantly share itemized receipts via WhatsApp or SMS, eliminating the mandatory requirement for paper receipt rolls.
- **Designed for Pakistan, Scalable Globally**: Built-in support for Pakistani Rupee (PKR), local payment rails (Cash, Easypaisa, JazzCash, Raast, Bank Transfer, Udhaar), and single-rate or multi-tier sales tax.

---

## 2. Target Market & User Personas

### 2.1 Personas

| Persona | Role | Primary Pain Points | PocketPOS Value |
| :--- | :--- | :--- | :--- |
| **Bhai Tariq** (Shop Owner) | Owner of "Madina Super Store" (Karachi) | Stolen cash, untracked inventory losses, lost paper khata books, power cuts. | Live mobile dashboard, atomic stock tracking, tamper-proof Udhaar ledger, works on battery. |
| **Hamza** (Cashier / Counter Staff) | 20-year-old high-school graduate | Complex POS software with too many keyboard shortcuts, long queues at rush hour. | Clean mobile camera scanner, instant scan-to-cart in < 1 second, single-tap checkout. |
| **Ayesha** (Boutique Owner) | Runs a modern clothing & cosmetics shop in Lahore | Desktop POS looks ugly on a boutique counter; needs flexible payment options (cards + Easypaisa). | Sleek mobile SaaS design, instant digital receipts on WhatsApp with shop logo and branding. |

---

## 3. Product Principles

1. **Extreme Simplicity**: Every core action (scan product, adjust quantity, checkout) must be achievable in 3 taps or fewer.
2. **One-Handed Usability**: Critical POS actions (Scanner toggle, Cart bar, Pay button) must reside inside the thumb zone of a standard 6.5-inch phone.
3. **No Silent Failures**: Every transaction either fully succeeds or rolls back cleanly with human-readable error feedback.
4. **Zero Fake Functionality**: Any button or control presented in the UI must have a working backend implementation or be explicitly labeled as "Upcoming".
5. **Rock-Solid Multi-Tenancy**: Data isolation is enforced at the database kernel level (Supabase RLS); no shop owner or cashier can ever glimpse another shop's records.

---

## 4. Detailed Functional Requirements

### 4.1 Module 1: Authentication & Access Control
- **Sign Up**: Email + password registration with verification.
- **Login & Session**: Secure JWT storage using platform keychain (Expo SecureStore). Automatic silent refresh.
- **Password Reset**: Email-based self-service reset flow.
- **Role-Based Permissions**:
  - `OWNER`: Unrestricted access across all shops owned, financial reports, cost prices, profit margins, staff management, shop settings, and data exports.
  - `CASHIER`: Restricted strictly to POS sales, barcode scanning, basic customer search, and own-shift receipt viewing. Cannot view purchase/cost prices, cannot delete sales history, cannot edit shop tax/settings, cannot access gross profit reports.

### 4.2 Module 2: Shop Profile & Onboarding
- First-time login automatically routes unassigned users to Shop Onboarding.
- Attributes:
  - Shop Name (e.g., "Al-Madina Mart")
  - Logo URL (Supabase Storage bucket `shop-assets`)
  - Phone Number (+92 3XX XXXXXXX)
  - Address, City, Country (Default: `Pakistan`)
  - Currency (Default: `PKR`, symbol `Rs.`)
  - Tax Configuration (Default tax rate %, Tax identification/NTN number, Enable/Disable toggle)
  - Invoice Customization (Prefix e.g., `INV-`, footer thank-you message, return policy notes)

### 4.3 Module 3: Product & Category Catalog
- Fields per product:
  - Name (Required)
  - SKU (Auto-generated or custom alphanumeric)
  - Barcode (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, QR Code)
  - Category ID (Foreign key)
  - Brand (Optional string)
  - Purchase / Cost Price (Numeric, 2 decimals, hidden from Cashiers)
  - Selling Price (Numeric, 2 decimals)
  - Current Stock Quantity (Numeric, decimal support for kg/liters or integer for units)
  - Minimum Stock Alert Threshold (Numeric)
  - Unit of Measurement (`pcs`, `kg`, `g`, `ltr`, `pack`, `box`, `meter`)
  - Product Image URL (Stored in Supabase Storage with local compression)
  - Description / Notes
  - Active Status (`true`/`false`)
- Features:
  - Live search by product name, SKU, or barcode.
  - Category filters with fast horizontal pill selector.
  - Quick stock adjustment with reason logging (`Restock`, `Audit Correction`, `Damaged`).
  - Barcode uniqueness validation per shop (`UNIQUE(shop_id, barcode)`).

### 4.4 Module 4: High-Performance Camera Barcode Scanner
- Mobile-optimized viewfinder utilizing `expo-camera` / MLKit barcode scanning.
- Viewfinder overlay with targeted bounding box.
- Torch/flashlight toggle for dim retail counters.
- Audio feedback (audible "beep") + haptic feedback (vibration) on successful decode.
- Scan resolution logic:
  - If barcode matches existing product: add to cart (or increment quantity by 1 if already present), flash green feedback toast, remain active for continuous rapid scanning.
  - If barcode is unknown: open a quick modal: *"Barcode [12345678] not registered. Create new product?"* with pre-filled barcode.

### 4.5 Module 5: Point of Sale (POS) & Checkout Engine
- **Active Cart Management**:
  - Item listing with quantity stepper (`+`, `-`, direct numeric keypad entry).
  - Line-item discount (percentage or fixed amount).
  - Line-item removal with swipe-to-delete.
  - Cart-level discount and tax calculation.
  - Order subtotal, calculated tax, discount total, and net grand total.
- **Customer Assignment**:
  - Quick-search existing customer or one-tap "Walk-in Customer" (default).
  - Quick-add modal for new customer name and phone without leaving cart.
- **Payment Method Multi-Select**:
  - `Cash`: Built-in quick cash buttons (Rs. 100, 500, 1000, 5000) with automatic change due calculation.
  - `Bank Transfer`: Record bank reference/transaction ID.
  - `Easypaisa`: Mobile wallet reference.
  - `JazzCash`: Mobile wallet reference.
  - `Udhaar (Customer Credit)`: Only allowed if a named customer is attached. Full or partial credit.
  - `Split Payment`: e.g., Bill is Rs. 3,000 -> Customer pays Rs. 1,000 cash + Rs. 2,000 Udhaar.
- **Sale Completion**:
  - Atomic database RPC call (`complete_sale_transaction`).
  - Instant stock reduction.
  - Immediate transition to Digital Receipt screen.

### 4.6 Module 6: Inventory Movements & Stock Tracking
- Real-time stock decrement on completed sale.
- Return / Refund restock movements.
- Manual audit adjustments with mandatory movement types:
  - `SALE`
  - `PURCHASE_RECEIPT`
  - `MANUAL_CORRECTION`
  - `RETURN`
  - `DAMAGED_EXPIRED`
- Strict non-negative inventory rule (configurable via shop settings if backordering is permitted).
- Visual warning badges for products where `current_stock <= min_stock`.

### 4.7 Module 7: Udhaar (Customer Credit) & Khata Ledger
- Customer directory with live aggregated metrics:
  - Total Lifetime Purchases
  - Current Outstanding Balance
  - Last Payment Date
- Dedicated Khata Ledger per customer:
  - Chronological statement of debit (unpaid sales) and credit (debt payments received).
- Record Repayment flow:
  - Customer walks in to settle Udhaar -> Select customer -> Enter amount paid -> Choose payment method (Cash, Bank, JazzCash, Easypaisa) -> System updates outstanding balance and logs payment record.

### 4.8 Module 8: Digital Receipt & Sharing
- Visually polished digital invoice format:
  - Shop Header (Logo, Name, Address, Contact)
  - Invoice Number & Timestamp
  - Cashier Name
  - Customer Name & Phone
  - Itemized table (Item, Qty, Unit Price, Total)
  - Subtotal, Tax, Discount, Grand Total
  - Payment Breakdown (e.g. Paid Rs. 2000 via Cash, Remaining Rs. 1000 on Udhaar)
  - Shop Thank-You Note & Policy
- Action buttons:
  - **WhatsApp Share**: Pre-formats an aesthetic text message summary + deep link or image to share directly via `whatsapp://send`.
  - **Print / PDF**: Generates a standard receipt format ready for mobile print or PDF saving.
  - **New Sale**: Clears cart and returns to POS screen.

### 4.9 Module 9: Expenses Management
- Lightweight expense tracking to calculate realistic net earnings.
- Expense Categories: `Rent`, `Electricity / Utility`, `Salaries`, `Transport`, `Stock Purchase`, `Maintenance`, `Tea / Refreshments`, `Other`.
- Fields: Category, Amount, Date, Description/Note, Logged By.

### 4.10 Module 10: Reports & Executive Dashboard
- **Dashboard Highlights**:
  - Today's Gross Sales
  - Today's Completed Orders
  - Total Items Sold Today
  - Low Stock Alerts Count
  - Total Outstanding Udhaar (Receivables)
  - Today's Total Expenses
  - Estimated Gross Profit (Sales - Cost of Goods Sold)
- **Reports**:
  - Sales by Date Range (Today, Yesterday, Last 7 Days, This Month, Custom)
  - Top 10 Best-Selling Products by Volume & Revenue
  - Low Stock Reorder Report
  - Udhaar Ageing & Defaulter List
  - Cashier Shift Performance (Transactions count, total volume per cashier)

---

## 5. Non-Functional Requirements

| Metric | Target | Verification Method |
| :--- | :--- | :--- |
| **Barcode Recognition Latency** | < 150 ms from camera frame hit | Real-device camera testing with standard 13-digit EAN barcodes |
| **Checkout Transaction Latency** | < 500 ms roundtrip | Single atomic PostgreSQL RPC call |
| **Cold Startup Time** | < 2.0 s on mid-range Android phone | Expo production release profiling |
| **Offline Resilience** | Detects disconnect within 1s; queues requests safely | NetInfo event listener with visual offline banner |
| **Data Integrity** | 100% ACID compliant checkout | Stored procedure with row-level locks on stock rows |
| **Localization** | PKR currency formatting (e.g., `Rs. 1,250`) | Standard localized formatting utility |

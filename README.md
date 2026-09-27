# PocketPOS

> **PocketPOS** is a smartphone-first, cloud-native Point of Sale (POS), inventory management, and digital ledger system designed for small and medium-sized retail businesses.

---

## 📱 Product Vision

A shopkeeper should be able to run their entire shop using only a smartphone:
- **Zero Dedicated Hardware**: The smartphone camera acts as the high-speed barcode scanner.
- **Integrated Udhaar Ledger**: Seamlessly records partial payments and customer credit directly during checkout.
- **Instant Digital Receipts**: Share itemized receipts via WhatsApp or SMS in a single tap.
- **Real-Time Cloud Synchronization**: Monitor live sales, stock, and profits from anywhere.
- **Built for Pakistan, Scalable Globally**: Built-in support for PKR (`Rs.`), local payment methods (Cash, Easypaisa, JazzCash, Raast, Bank Transfer, Udhaar), and multi-tier tax settings.

---

## 🛠 Tech Stack

- **Mobile Client**: React Native, Expo (SDK 57), TypeScript, Expo Router
- **Backend & Database**: Supabase, PostgreSQL 15+, Row Level Security (RLS)
- **Auth & Storage**: Supabase Auth (Email/Password), Supabase Storage
- **Local Persistence**: Hardware-backed `expo-secure-store`
- **Validation**: Zod
- **Web Admin**: Next.js 14+ (App Router), Tailwind CSS *(Upcoming Phase)*

---

## 📂 Repository Structure

```
pocket-pos/
├── docs/                       # Architectural & Technical Documentation
│   ├── product-requirements.md # PRD & Functional Specifications
│   ├── system-architecture.md  # High-level architecture & data flows
│   ├── database-design.md      # PostgreSQL Schema, ERD & RPCs
│   ├── security.md             # RLS policies & RBAC matrix
│   ├── development-roadmap.md  # 16-phase milestone tracker
│   └── ui-screen-map.md        # UI Hierarchy & thumb-zone UX
│
├── apps/
│   └── mobile/                 # React Native / Expo Application
│       ├── app/                # Expo Router file-based screens
│       │   ├── (auth)/         # Login, Sign Up, Forgot Password
│       │   ├── (tabs)/         # Protected Home & Tab screens
│       │   └── _layout.tsx     # Route protection & AuthProvider
│       └── src/
│           ├── components/     # UI components (Button, Input, Card)
│           ├── constants/      # Design system tokens & themes
│           ├── context/        # AuthContext & useAuth hook
│           ├── services/       # Supabase client & SecureStore adapter
│           ├── types/          # Auth & Database TypeScript definitions
│           ├── utils/          # Zod validation & error mappers
│           └── __tests__/      # Automated verification test suites
│
└── package.json                # Root workspace configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or pnpm
- Expo Go app on iOS/Android (or physical device / emulator)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ali128664-hue/pocket-pos.git
cd pocket-pos

# Install dependencies
npm --prefix apps/mobile install
```

### 3. Environment Configuration
Create a `.env` file in `apps/mobile/` based on `.env.example`:
```bash
cp apps/mobile/.env.example apps/mobile/.env
```
Fill in your Supabase project credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Running the Project
```bash
# Run Expo development server
npm start

# Run TypeScript checks
npm run typecheck

# Run Linting
npm run lint

# Run Automated Test Suite
npm run test
```

---

## 🗺 Development Roadmap Status

- [x] **Phase 0**: Architecture & Documentation
- [x] **Phase 1**: Project Setup + Authentication (Expo Router, SecureStore, Supabase, Zod)
- [ ] **Phase 2**: Shop Onboarding *(Next)*
- [ ] **Phase 3**: Database & RLS Enforcement
- [ ] **Phase 4**: Product Management & Catalog
- [ ] **Phase 5**: Mobile Barcode Scanner
- [ ] **Phase 6**: POS Terminal & Cart Engine
- [ ] **Phase 7**: Checkout & Payments (Cash, Wallets, Udhaar)
- [ ] **Phase 8**: Inventory Movements & Stock Tracking
- [ ] **Phase 9**: Customers & Khata Ledger
- [ ] **Phase 10**: Expense Management
- [ ] **Phase 11**: Mobile Dashboard & KPIs
- [ ] **Phase 12**: Business Reports & Analytics
- [ ] **Phase 13**: Staff Management & Cashier Shifts
- [ ] **Phase 14**: Digital Receipts & WhatsApp Sharing
- [ ] **Phase 15**: QA, Security Audit & Resilience
- [ ] **Phase 16**: Production Build & EAS Deployment

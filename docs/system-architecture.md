# PocketPOS — System Architecture & Design

## 1. High-Level Architecture Overview

PocketPOS operates on a modern cloud-first, mobile-centric architecture. The client is a performant React Native application built with Expo and TypeScript, backed directly by Supabase (PostgreSQL, Row Level Security, Auth, Storage, and Realtime/Edge RPCs). A companion Web Admin dashboard (Next.js + Tailwind CSS) provides store owners with deeper desktop analytics and bulk management.

```mermaid
graph TD
    subgraph Mobile_App [Mobile Client - React Native / Expo]
        Scanner[Expo Camera Barcode Scanner]
        POS[POS / Cart Engine - Zustand]
        OfflineNet[NetInfo Connection Monitor]
        ClientCache[TanStack Query Cache + SecureStore]
    end

    subgraph Web_Client [Web Admin - Next.js / Tailwind]
        WebDash[Desktop Analytics & Inventory]
        WebAuth[Supabase Auth SSR]
    end

    subgraph Supabase_Cloud [Supabase Backend Infrastructure]
        AuthService[Supabase GoTrue Auth]
        Postgres[PostgreSQL 15+ Database Engine]
        RLS[Row Level Security Engine]
        StorageS3[Supabase Storage Buckets]
        RPCs[PL/pgSQL Atomic Transaction RPCs]
    end

    Mobile_App <-->|HTTPS / WSS / JWT| Supabase_Cloud
    Web_Client <-->|HTTPS / SSR / JWT| Supabase_Cloud
    Scanner --> POS
    POS -->|complete_sale_transaction RPC| RPCs
    RPCs -->|Atomic Write| Postgres
    Postgres --> RLS
    StorageS3 <-->|Product & Logo Images| Mobile_App
```

---

## 2. Technology Stack Selection & Rationale

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Mobile Runtime** | React Native (Expo SDK 51+) | Cross-platform (iOS/Android) from a single TypeScript codebase. Fast iteration with Expo Go and rock-solid EAS builds. |
| **Mobile Navigation** | Expo Router (File-based) | Type-safe deep linking, streamlined tab and modal hierarchies, native stack transitions. |
| **Camera & Barcode** | `expo-camera` / MLKit barcode scanner | Direct hardware integration with zero native bridge overhead. High frame-rate barcode decoding for EAN, UPC, and Code 128. |
| **Local State (Cart/UI)** | Zustand | Ultra-lightweight (<2KB), zero boilerplate, synchronous state transitions for cart updates, persistable to AsyncStorage. |
| **Server State & Cache**| TanStack Query v5 | Automatic background refetching, query invalidation on mutation, optimistic updates, and offline caching hooks. |
| **Backend & Database** | Supabase (PostgreSQL 15+) | Enterprise-grade SQL engine with native JSONB, ACID transactions, Row Level Security (RLS), and managed Auth. |
| **File Storage** | Supabase Storage (S3-backed) | Built-in CDN, asset bucket access control policies linked to `shop_id`. |
| **Web Admin Console** | Next.js 14+ (App Router) + Tailwind | Fast server-side rendered dashboard for owners who prefer full-screen reports on laptops or tablets. |

---

## 3. Data Flow Architecture: Scan-to-Receipt Lifecycle

The core transaction lifecycle must be completely atomic, durable, and performant.

```mermaid
sequenceDiagram
    autonumber
    actor Cashier
    participant Scanner as Expo Camera Scanner
    participant CartStore as Zustand POS Cart Store
    participant TanStack as TanStack Query Cache
    participant DB_RPC as Postgres complete_sale_transaction()
    participant Storage as Receipt / WhatsApp Service

    Cashier->>Scanner: Points camera at item barcode
    Scanner->>Scanner: Decodes barcode (e.g. "896400012345")
    Scanner->>TanStack: Query product by barcode in cache
    alt Barcode found
        TanStack->>CartStore: addItem(product, qty: 1)
        CartStore->>Cashier: Haptic feedback + Audio beep
    else Barcode not found
        Scanner->>Cashier: Trigger "Product Not Found / Add New" sheet
    end

    Cashier->>CartStore: Adjust qty / Add discount / Select Customer
    Cashier->>CartStore: Select Payment (e.g., Cash Rs. 1000 + Udhaar Rs. 500)
    Cashier->>CartStore: Tap "Complete Sale"

    CartStore->>DB_RPC: Invoke RPC with payload (shop_id, items[], payments[], customer_id)
    Note over DB_RPC: Begins atomic PostgreSQL transaction
    DB_RPC->>DB_RPC: Validate stock levels & row locks
    DB_RPC->>DB_RPC: Generate sequential invoice number (INV-YYMM-XXXX)
    DB_RPC->>DB_RPC: Insert sales record
    DB_RPC->>DB_RPC: Insert sale_items records
    DB_RPC->>DB_RPC: Decrement current_stock on products
    DB_RPC->>DB_RPC: Insert inventory_movements (type: SALE)
    DB_RPC->>DB_RPC: Insert payments records
    DB_RPC->>DB_RPC: If credit > 0, update customer outstanding balance
    Note over DB_RPC: Transaction COMMITTED
    DB_RPC-->>CartStore: Return { success: true, invoice: {...} }

    CartStore->>TanStack: Invalidate queries ['products', 'sales', 'dashboard', 'customer']
    CartStore->>Storage: Render Digital Receipt Screen
    Cashier->>Storage: One-tap WhatsApp share to customer phone
```

---

## 4. State Management Boundaries

To prevent messy state overlapping, state is strictly separated into four discrete tiers:

1. **Authentication & Profile State (`useAuthStore`)**:
   - Holds user JWT session, active user profile, assigned role (`OWNER` vs `CASHIER`), and currently active `shop_id`.
   - Token refresh managed via Supabase client with secure storage.
2. **Server Cache State (`TanStack Query`)**:
   - Manages asynchronous server data: product list, categories, sales history, customer directories, analytics metrics.
   - Provides background stale-while-revalidate and cached offline reads.
3. **Active Cart & Checkout State (`useCartStore` - Zustand)**:
   - Ephemeral in-memory cart: items array, active customer, payment distribution, order discounts.
   - Isolated from network latency so scanning and quantity steppers remain instantaneous (60fps).
4. **Local Hardware / UI State**:
   - Camera permissions, torch status, modal visibility, camera scanning pause locks.

---

## 5. Offline-First Resilience Strategy

While PocketPOS is cloud-synchronized, Pakistani retail shops frequently encounter unstable cellular connections (2G/3G/4G dips) or load-shedding internet drops.

### 5.1 MVP Offline Safeguards
- **Realtime Connection Monitoring**: `@react-native-community/netinfo` continuously tracks network availability. An ambient top-bar indicator signals `Online` (green) or `Offline (Working from Cache)` (amber).
- **Cached Product Catalog**: TanStack Query persists the catalog locally in AsyncStorage. When offline, cashiers can still search cached products and verify prices.
- **Fail-Safe Checkout Guard**: If the device is offline during checkout, the app alerts the user: *"You are offline. To prevent duplicate invoices and unsynced stock, reconnect to internet to finalize this sale."* It saves the pending cart draft locally in storage so no scanned cart is ever lost.
- **Post-MVP Synchronization Engine**: The database design uses client-generated UUIDs (`id UUID DEFAULT gen_random_uuid()`), which enables future asynchronous offline queueing without ID collisions.

---

## 6. Monorepo Project Structure

```
pocket-pos/
├── docs/                       # Architecture, PRD, DB, Security docs
├── apps/
│   ├── mobile/                 # React Native / Expo Application
│   │   ├── app/                # Expo Router file-based routes
│   │   │   ├── (auth)/         # Sign up, Login, Forgot password
│   │   │   ├── (onboarding)/   # Shop creation wizard
│   │   │   ├── (tabs)/         # Bottom tab navigation
│   │   │   │   ├── index.tsx   # Dashboard / Home
│   │   │   │   ├── pos.tsx     # Main POS sales terminal
│   │   │   │   ├── products/   # Products catalog & management
│   │   │   │   ├── customers/  # Customers & Udhaar ledger
│   │   │   │   └── more/       # Secondary modules
│   │   │   ├── modals/         # Scanner, Add Customer, Receipt modal
│   │   │   └── _layout.tsx
│   │   ├── src/
│   │   │   ├── components/     # UI components (Button, Input, Card, Modal)
│   │   │   ├── features/       # Feature-specific modules (pos, inventory, etc.)
│   │   │   ├── hooks/          # Custom reusable React hooks
│   │   │   ├── services/       # Supabase client, API wrappers, RPC calls
│   │   │   ├── stores/         # Zustand stores (cart, auth, ui)
│   │   │   ├── types/          # Database & domain TypeScript definitions
│   │   │   ├── utils/          # Currency formatters, date helpers, validators
│   │   │   └── constants/      # Colors, typography, spacing, themes
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── app.json            # Expo config
│   │
│   └── web/                    # Next.js Web Admin Console (Owner Portal)
│       ├── app/                # Next.js 14 App Router
│       ├── components/         # Tailwind desktop UI components
│       ├── lib/                # Supabase SSR client
│       └── package.json
│
├── supabase/                   # Supabase Infrastructure as Code
│   ├── migrations/             # SQL schema migrations & RLS policies
│   ├── functions/              # Edge functions
│   ├── seed.sql                # Dev test seed data
│   └── config.toml
│
├── packages/                   # Shared TypeScript packages
│   └── types/                  # Shared database & entity interfaces
│
└── package.json                # Root npm/pnpm workspace config
```

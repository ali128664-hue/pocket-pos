import assert from 'node:assert';
import {
  normalizeBarcode,
  detectBarcodeSymbology,
  validateBarcode,
  formatBarcodeDisplay,
} from '../utils/barcode';
import type { Product } from '../types/database';

console.log('🧪 Starting Phase 5 Mobile Barcode Scanner & Lookup Test Suite...\n');

// ==============================================================================
// 1. Barcode Normalization & Sanitation
// ==============================================================================
console.log('--- Test Group 1: Barcode Normalization & Sanitation ---');

// Test 1.1: Trimming whitespace
assert.strictEqual(
  normalizeBarcode('   8964001234567   '),
  '8964001234567',
  'Should trim leading and trailing whitespace'
);

// Test 1.2: Stripping control characters (hardware HID scanner carriage return / line feeds)
const rawScannerOutput = '\x028964001234567\r\n\x03';
assert.strictEqual(
  normalizeBarcode(rawScannerOutput),
  '8964001234567',
  'Should strip HID scanner control characters, STX, ETX, CR and LF'
);

// Test 1.3: Handling null, undefined, and empty strings
assert.strictEqual(normalizeBarcode(''), '', 'Empty string should return empty string');
assert.strictEqual(normalizeBarcode(null), '', 'Null should return empty string');
assert.strictEqual(normalizeBarcode(undefined), '', 'Undefined should return empty string');

console.log('✅ Barcode normalization and sanitation tests passed');

// ==============================================================================
// 2. Retail Barcode Symbology Detection
// ==============================================================================
console.log('\n--- Test Group 2: Barcode Symbology Detection ---');

// EAN-13 (Standard retail packaging in Pakistan & globally)
assert.strictEqual(
  detectBarcodeSymbology('8964001234567'),
  'EAN-13',
  '13-digit number should be detected as EAN-13'
);

// UPC-A (12-digit standard)
assert.strictEqual(
  detectBarcodeSymbology('012345678905'),
  'UPC-A',
  '12-digit number should be detected as UPC-A'
);

// EAN-8 (8-digit compact)
assert.strictEqual(
  detectBarcodeSymbology('89640012'),
  'EAN-8',
  '8-digit number should be detected as EAN-8'
);

// ITF-14 (14-digit carton packaging)
assert.strictEqual(
  detectBarcodeSymbology('18964001234564'),
  'ITF-14',
  '14-digit number should be detected as ITF-14'
);

// Code-128 / Code-39 (Alphanumeric store labels)
assert.strictEqual(
  detectBarcodeSymbology('BEV-COLA-500'),
  'CODE-39',
  'Short alphanumeric string should be detected as CODE-39'
);

assert.strictEqual(
  detectBarcodeSymbology('INTERNAL-INVENTORY-SKU-99882233'),
  'CODE-128',
  'Long alphanumeric string should be detected as CODE-128'
);

console.log('✅ Barcode symbology detection tests passed');

// ==============================================================================
// 3. Barcode Display Formatting
// ==============================================================================
console.log('\n--- Test Group 3: Barcode Display Formatting ---');

// EAN-13 formatting
assert.strictEqual(
  formatBarcodeDisplay('8964001234567'),
  '896 4001 23456 7',
  'EAN-13 should be formatted into human-readable grouping'
);

// UPC-A formatting
assert.strictEqual(
  formatBarcodeDisplay('012345678905'),
  '0 12345 67890 5',
  'UPC-A should be formatted into standard grouping'
);

// Generic / Alphanumeric retains raw normalized characters
assert.strictEqual(
  formatBarcodeDisplay('BEV-001-PK'),
  'BEV-001-PK',
  'Non-numeric barcodes should retain clean string format'
);

console.log('✅ Barcode display formatting tests passed');

// ==============================================================================
// 4. Barcode Validation Rules
// ==============================================================================
console.log('\n--- Test Group 4: Barcode Validation Rules ---');

// Valid barcode
const validResult = validateBarcode('8964001234567');
assert.strictEqual(validResult.isValid, true);
assert.strictEqual(validResult.normalized, '8964001234567');
assert.strictEqual(validResult.symbology, 'EAN-13');

// Empty barcode fails
const emptyResult = validateBarcode('   ');
assert.strictEqual(emptyResult.isValid, false);
assert.strictEqual(emptyResult.error, 'Barcode cannot be empty');

// Too short (< 3 chars)
const shortResult = validateBarcode('12');
assert.strictEqual(shortResult.isValid, false);
assert.strictEqual(shortResult.error, 'Barcode must be at least 3 characters');

// Too long (> 64 chars)
const longResult = validateBarcode('1'.repeat(65));
assert.strictEqual(longResult.isValid, false);
assert.strictEqual(longResult.error, 'Barcode must not exceed 64 characters');

console.log('✅ Barcode validation rules tests passed');

// ==============================================================================
// 5. Product Lookup Simulation & Shop Multi-Tenant Isolation
// ==============================================================================
console.log('\n--- Test Group 5: Barcode Lookup & Shop Multi-Tenant Isolation ---');

const mockProducts: (Product & { category_name?: string | null })[] = [
  {
    id: 'prod-001',
    shop_id: 'shop-alpha',
    category_id: 'cat-001',
    name: 'Tapal Danedar 400g',
    sku: 'TAP-400',
    barcode: '896400010012',
    brand: 'Tapal',
    description: 'Black Tea',
    unit: 'pack',
    purchase_price: 450,
    selling_price: 520,
    current_stock: 50,
    minimum_stock: 10,
    image_url: 'https://example.com/tapal.jpg',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_name: 'Tea & Coffee',
  },
  {
    id: 'prod-002',
    shop_id: 'shop-beta',
    category_id: 'cat-002',
    name: 'Olpers Milk 1L',
    sku: 'OLP-1L',
    barcode: '896400020024',
    brand: 'Olpers',
    description: 'UHT Milk',
    unit: 'box',
    purchase_price: 240,
    selling_price: 280,
    current_stock: 100,
    minimum_stock: 15,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_name: 'Dairy',
  },
  {
    id: 'prod-003',
    shop_id: 'shop-alpha',
    category_id: 'cat-001',
    name: 'Discontinued Tea',
    sku: 'DISC-001',
    barcode: '896400099999',
    brand: 'Tapal',
    description: 'Inactive Product',
    unit: 'pack',
    purchase_price: 300,
    selling_price: 350,
    current_stock: 0,
    minimum_stock: 5,
    image_url: null,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_name: 'Tea & Coffee',
  },
];

// Helper mimicking database RPC public.lookup_product_by_barcode logic
function simulateLookupByBarcode(
  shopId: string,
  rawBarcode: string,
  isOwner = true
): (Product & { category_name?: string | null }) | null {
  const clean = normalizeBarcode(rawBarcode);
  if (!clean) return null;

  const found = mockProducts.find(
    (p) =>
      p.shop_id === shopId &&
      p.barcode === clean &&
      (p.is_active || isOwner)
  );

  if (!found) return null;

  return {
    ...found,
    purchase_price: isOwner ? found.purchase_price : 0,
  };
}

// Test 5.1: Exact barcode lookup in shop-alpha
const foundItem = simulateLookupByBarcode('shop-alpha', '896400010012', true);
assert.ok(foundItem !== null, 'Product should be found by exact barcode');
assert.strictEqual(foundItem?.name, 'Tapal Danedar 400g');
assert.strictEqual(foundItem?.selling_price, 520);
assert.strictEqual(foundItem?.current_stock, 50);

// Test 5.2: Shop isolation — Barcode belongs to shop-beta, query from shop-alpha MUST return null
const crossShopItem = simulateLookupByBarcode('shop-alpha', '896400020024', true);
assert.strictEqual(
  crossShopItem,
  null,
  'Multi-tenant check: Cannot look up products belonging to other shops'
);

// Test 5.3: Barcode not found in inventory
const nonExistentItem = simulateLookupByBarcode('shop-alpha', '9999999999999', true);
assert.strictEqual(nonExistentItem, null, 'Unregistered barcode should return null');

console.log('✅ Barcode lookup and multi-tenant isolation tests passed');

// ==============================================================================
// 6. Role-Based Purchase Price Security
// ==============================================================================
console.log('\n--- Test Group 6: Role-Based Purchase Price Security ---');

// Test 6.1: OWNER lookup reveals real purchase price
const ownerLookup = simulateLookupByBarcode('shop-alpha', '896400010012', true);
assert.strictEqual(ownerLookup?.purchase_price, 450, 'Owner should see real purchase price');

// Test 6.2: CASHIER lookup masks purchase price to exactly 0
const cashierLookup = simulateLookupByBarcode('shop-alpha', '896400010012', false);
assert.strictEqual(
  cashierLookup?.purchase_price,
  0,
  'Cashier must receive purchase_price = 0'
);

// Test 6.3: CASHIER cannot view inactive products
const cashierInactiveLookup = simulateLookupByBarcode('shop-alpha', '896400099999', false);
assert.strictEqual(
  cashierInactiveLookup,
  null,
  'Cashier cannot view inactive products'
);

// Test 6.4: OWNER can view inactive products
const ownerInactiveLookup = simulateLookupByBarcode('shop-alpha', '896400099999', true);
assert.ok(ownerInactiveLookup !== null, 'Owner can view inactive products for editing');
assert.strictEqual(ownerInactiveLookup?.is_active, false);

console.log('✅ Role-based purchase price security tests passed');

// ==============================================================================
// 7. Scanner Lock & Debounce Logic
// ==============================================================================
console.log('\n--- Test Group 7: Scanner Lock & Debounce Logic ---');

class MockScannerController {
  private isLocked = false;
  public scanEventsCount = 0;
  public processedCodes: string[] = [];

  public handleBarcodeEvent(code: string) {
    if (this.isLocked) {
      // Ignored because scanner is locked during modal/processing
      return false;
    }
    this.isLocked = true;
    this.scanEventsCount++;
    this.processedCodes.push(normalizeBarcode(code));
    return true;
  }

  public unlock() {
    this.isLocked = false;
  }
}

const controller = new MockScannerController();

// Simulate rapid-fire frames of the same barcode detected in 100ms
const firstAttempt = controller.handleBarcodeEvent('896400010012');
const secondAttempt = controller.handleBarcodeEvent('896400010012');
const thirdAttempt = controller.handleBarcodeEvent('896400010012');

assert.strictEqual(firstAttempt, true, 'First scan event should be accepted');
assert.strictEqual(secondAttempt, false, 'Rapid second scan event must be locked/debounced');
assert.strictEqual(thirdAttempt, false, 'Rapid third scan event must be locked/debounced');
assert.strictEqual(controller.scanEventsCount, 1, 'Exactly one scan processed');

// Unlock after user presses "Scan Next"
controller.unlock();
const nextScanAttempt = controller.handleBarcodeEvent('896400020024');
assert.strictEqual(nextScanAttempt, true, 'Next scan after unlock should be accepted');
assert.strictEqual(controller.scanEventsCount, 2);

console.log('✅ Scanner lock and debounce logic tests passed');

// ==============================================================================
// 8. Navigation & Mode Prefill Flow
// ==============================================================================
console.log('\n--- Test Group 8: Navigation & Mode Prefill Flow ---');

// Simulate "Add Product" pre-fill query parameter construction
function buildAddProductPrefillUrl(barcode: string) {
  const clean = normalizeBarcode(barcode);
  return {
    pathname: '/(tabs)/products/add',
    params: { barcode: clean },
  };
}

const navRoute = buildAddProductPrefillUrl('  896400999123  ');
assert.strictEqual(navRoute.pathname, '/(tabs)/products/add');
assert.strictEqual(navRoute.params.barcode, '896400999123');

console.log('✅ Navigation and mode prefill flow tests passed');

console.log('\n🎉 ALL 8 PHASE 5 BARCODE SCANNER TEST GROUPS PASSED SUCCESSFULLY!\n');

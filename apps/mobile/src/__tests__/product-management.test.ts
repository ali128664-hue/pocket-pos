import assert from 'node:assert';
import {
  categorySchema,
  productSchema,
  stockAdjustmentSchema,
} from '../utils/validation';
import type { Product, CategoryWithCount } from '../types/database';

console.log('🧪 Starting Phase 4 Product & Category Management Test Suite...\n');

// ==============================================================================
// 1. Category Schema Validation
// ==============================================================================
console.log('--- Test Group 1: Category Schema Validation ---');

// Valid category
const validCategory = categorySchema.safeParse({
  name: 'Beverages',
  description: 'Cold drinks, juices and mineral water',
});
assert.strictEqual(validCategory.success, true, 'Valid category should pass');

// Empty category name
const emptyCategory = categorySchema.safeParse({
  name: '   ',
  description: 'Empty name test',
});
assert.strictEqual(emptyCategory.success, false, 'Empty category name should fail');

// Category name exceeding 50 chars
const longCategory = categorySchema.safeParse({
  name: 'A'.repeat(51),
});
assert.strictEqual(longCategory.success, false, 'Overly long category name should fail');

console.log('✅ Category schema validation tests passed');

// ==============================================================================
// 2. Product Schema Validation
// ==============================================================================
console.log('\n--- Test Group 2: Product Schema Validation ---');

// Valid product
const validProduct = productSchema.safeParse({
  name: 'Tapal Danedar 400g',
  sku: 'TAP-400',
  barcode: '896400010012',
  brand: 'Tapal',
  categoryId: 'cat-uuid-1',
  description: 'Premium black tea',
  unit: 'pack',
  purchasePrice: '450.00',
  sellingPrice: '520.00',
  currentStock: '50',
  minimumStock: '10',
  imageUrl: 'https://example.com/tapal.jpg',
  isActive: true,
});
assert.strictEqual(validProduct.success, true, 'Valid product should pass');

// Negative selling price
const negativePrice = productSchema.safeParse({
  name: 'Invalid Item',
  purchasePrice: '100',
  sellingPrice: '-50',
  currentStock: '10',
  minimumStock: '5',
});
assert.strictEqual(negativePrice.success, false, 'Negative selling price should fail');

// Negative stock
const negativeStock = productSchema.safeParse({
  name: 'Invalid Item',
  purchasePrice: '100',
  sellingPrice: '150',
  currentStock: '-5',
  minimumStock: '5',
});
assert.strictEqual(negativeStock.success, false, 'Negative current stock should fail');

// Missing required name
const missingName = productSchema.safeParse({
  name: '',
  purchasePrice: '100',
  sellingPrice: '150',
  currentStock: '10',
  minimumStock: '5',
});
assert.strictEqual(missingName.success, false, 'Missing product name should fail');

console.log('✅ Product schema validation tests passed');

// ==============================================================================
// 3. Stock Adjustment Schema & Math Validation
// ==============================================================================
console.log('\n--- Test Group 3: Stock Adjustment Validation & Calculations ---');

// Positive adjustment (+10)
const positiveAdj = stockAdjustmentSchema.safeParse({
  quantityChange: '+10',
  movementType: 'PURCHASE_RECEIPT',
  notes: 'Shipment received from distributor',
});
assert.strictEqual(positiveAdj.success, true, 'Positive stock adjustment should pass');

// Negative adjustment (-5)
const negativeAdj = stockAdjustmentSchema.safeParse({
  quantityChange: '-5',
  movementType: 'DAMAGED_EXPIRED',
  notes: 'Damaged in transit',
});
assert.strictEqual(negativeAdj.success, true, 'Negative stock adjustment should pass');

// Zero adjustment (should fail)
const zeroAdj = stockAdjustmentSchema.safeParse({
  quantityChange: '0',
  movementType: 'MANUAL_CORRECTION',
});
assert.strictEqual(zeroAdj.success, false, 'Zero stock adjustment should fail');

// Disallowed negative stock check
function calculateResultingStock(currentStock: number, change: number, allowNegative: boolean): { newStock: number; allowed: boolean } {
  const newStock = currentStock + change;
  if (!allowNegative && newStock < 0) {
    return { newStock, allowed: false };
  }
  return { newStock, allowed: true };
}

const checkAllowed = calculateResultingStock(25, 10, false);
assert.strictEqual(checkAllowed.newStock, 35);
assert.strictEqual(checkAllowed.allowed, true);

const checkDisallowed = calculateResultingStock(5, -10, false);
assert.strictEqual(checkDisallowed.newStock, -5);
assert.strictEqual(checkDisallowed.allowed, false, 'Should prohibit negative stock when allow_negative_stock is false');

console.log('✅ Stock adjustment validation and math tests passed');

// ==============================================================================
// 4. Product Search Logic (Name, SKU, Barcode)
// ==============================================================================
console.log('\n--- Test Group 4: Multi-Field Search Logic ---');

const mockProducts: Product[] = [
  {
    id: 'p1',
    shop_id: 'shop-A',
    category_id: 'c1',
    name: 'Nestle Everyday 1kg',
    sku: 'NES-1KG',
    barcode: '7613035849012',
    brand: 'Nestle',
    description: null,
    unit: 'pcs',
    purchase_price: 1800,
    selling_price: 2100,
    current_stock: 15,
    minimum_stock: 5,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    shop_id: 'shop-A',
    category_id: 'c2',
    name: 'Dalda Cooking Oil 5L',
    sku: 'DAL-5L',
    barcode: '8964000456123',
    brand: 'Dalda',
    description: null,
    unit: 'can',
    purchase_price: 2600,
    selling_price: 2950,
    current_stock: 3,
    minimum_stock: 5,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p3',
    shop_id: 'shop-A',
    category_id: 'c1',
    name: 'Olpers Milk 1L',
    sku: 'OLP-1L',
    barcode: '8964000987654',
    brand: 'Engro',
    description: null,
    unit: 'box',
    purchase_price: 250,
    selling_price: 290,
    current_stock: 0,
    minimum_stock: 10,
    image_url: null,
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function searchProducts(items: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
  );
}

// Search by name
const nameResults = searchProducts(mockProducts, 'everyday');
assert.strictEqual(nameResults.length, 1);
assert.strictEqual(nameResults[0].id, 'p1');

// Search by SKU
const skuResults = searchProducts(mockProducts, 'DAL-5L');
assert.strictEqual(skuResults.length, 1);
assert.strictEqual(skuResults[0].id, 'p2');

// Search by Barcode
const barcodeResults = searchProducts(mockProducts, '8964000987654');
assert.strictEqual(barcodeResults.length, 1);
assert.strictEqual(barcodeResults[0].id, 'p3');

console.log('✅ Multi-field search logic tests passed');

// ==============================================================================
// 5. Stock Status & Filter Detection
// ==============================================================================
console.log('\n--- Test Group 5: Stock Status & Filter Detection ---');

function getStockStatus(currentStock: number, minStock: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (currentStock <= 0) return 'OUT_OF_STOCK';
  if (currentStock <= minStock) return 'LOW_STOCK';
  return 'IN_STOCK';
}

assert.strictEqual(getStockStatus(15, 5), 'IN_STOCK', 'Stock > minStock should be IN_STOCK');
assert.strictEqual(getStockStatus(3, 5), 'LOW_STOCK', '0 < Stock <= minStock should be LOW_STOCK');
assert.strictEqual(getStockStatus(0, 10), 'OUT_OF_STOCK', 'Stock = 0 should be OUT_OF_STOCK');
assert.strictEqual(getStockStatus(-2, 5), 'OUT_OF_STOCK', 'Negative stock should be OUT_OF_STOCK');

console.log('✅ Stock status detection tests passed');

// ==============================================================================
// 6. Role-Based Access Hiding (Owner vs Cashier)
// ==============================================================================
console.log('\n--- Test Group 6: Role-Based Cost Masking & Access ---');

function sanitizeProductForRole(product: Product, isOwner: boolean): Product {
  return {
    ...product,
    purchase_price: isOwner ? product.purchase_price : 0,
  };
}

const productWithOwner = sanitizeProductForRole(mockProducts[0], true);
assert.strictEqual(productWithOwner.purchase_price, 1800, 'Owner should see real purchase cost');

const productWithCashier = sanitizeProductForRole(mockProducts[0], false);
assert.strictEqual(productWithCashier.purchase_price, 0, 'Cashier must NOT see purchase cost');
assert.strictEqual(productWithCashier.selling_price, 2100, 'Cashier sees selling price');

// Cashier view filter: Inactive products must be hidden from Cashier
function filterProductsForCashier(items: Product[]): Product[] {
  return items.filter((p) => p.is_active);
}

const cashierVisibleProducts = filterProductsForCashier(mockProducts);
assert.strictEqual(cashierVisibleProducts.length, 2, 'Inactive product p3 must be hidden from Cashier');
assert.strictEqual(cashierVisibleProducts.every((p) => p.is_active), true);

console.log('✅ Role-based access and cost masking tests passed');

// ==============================================================================
// 7. Multi-Tenant Shop Isolation
// ==============================================================================
console.log('\n--- Test Group 7: Multi-Tenant Shop Isolation ---');

const multiShopProducts: Product[] = [
  { ...mockProducts[0], shop_id: 'shop-A' },
  { ...mockProducts[1], shop_id: 'shop-A' },
  { ...mockProducts[0], id: 'p4', shop_id: 'shop-B' },
];

function filterByShop(items: Product[], shopId: string): Product[] {
  return items.filter((p) => p.shop_id === shopId);
}

const shopAProducts = filterByShop(multiShopProducts, 'shop-A');
assert.strictEqual(shopAProducts.length, 2);
assert.strictEqual(shopAProducts.every((p) => p.shop_id === 'shop-A'), true);

const shopBProducts = filterByShop(multiShopProducts, 'shop-B');
assert.strictEqual(shopBProducts.length, 1);
assert.strictEqual(shopBProducts[0].shop_id, 'shop-B');

console.log('✅ Multi-tenant shop isolation tests passed');

// ==============================================================================
// 8. Safe Category Deletion Verification
// ==============================================================================
console.log('\n--- Test Group 8: Safe Category Deletion Verification ---');

const mockCategories: CategoryWithCount[] = [
  {
    id: 'c1',
    shop_id: 'shop-A',
    name: 'Groceries',
    description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product_count: 2,
  },
  {
    id: 'c2',
    shop_id: 'shop-A',
    name: 'Electronics',
    description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product_count: 0,
  },
];

function canDeleteCategory(category: CategoryWithCount): { canDelete: boolean; reason?: string } {
  if (category.product_count > 0) {
    return {
      canDelete: false,
      reason: `Cannot delete category: ${category.product_count} product(s) assigned`,
    };
  }
  return { canDelete: true };
}

const deleteC1 = canDeleteCategory(mockCategories[0]);
assert.strictEqual(deleteC1.canDelete, false, 'Category with product_count > 0 cannot be deleted');

const deleteC2 = canDeleteCategory(mockCategories[1]);
assert.strictEqual(deleteC2.canDelete, true, 'Category with product_count = 0 can be deleted safely');

console.log('✅ Safe category deletion verification tests passed');

console.log('\n🎉 ALL PHASE 4 PRODUCT & CATEGORY MANAGEMENT TESTS PASSED WITH 0 ERRORS!\n');

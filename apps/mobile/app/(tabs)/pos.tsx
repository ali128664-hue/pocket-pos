import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Search,
  ScanBarcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Tag,
  Package,
  Layers,
  X,
} from 'lucide-react-native';

import { useShop } from '../../src/context/ShopContext';
import { useCart } from '../../src/context/CartContext';
import { fetchProducts, lookupProductByBarcode } from '../../src/services/product';
import { fetchCategories } from '../../src/services/category';
import type { Product, CategoryWithCount, CompleteSaleResult } from '../../src/types/database';
import { CustomerSelectModal } from '../../src/components/pos/CustomerSelectModal';
import { PaymentModal } from '../../src/components/pos/PaymentModal';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function PosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const { currentShop, isOwner } = useShop();
  const {
    items,
    customer,
    orderDiscount,
    subtotal,
    totalDiscount,
    taxAmount,
    grandTotal,
    totalItemsCount,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
    setCustomer,
    setOrderDiscount,
    clearCart,
  } = useCart();

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Product & { category_name?: string | null })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<(Product & { category_name?: string | null })[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Modals
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountInput, setDiscountInput] = useState(orderDiscount > 0 ? String(orderDiscount) : '');

  // Handle barcode returned from scanner
  const [prevParamBarcode, setPrevParamBarcode] = useState(params.barcode);
  if (params.barcode && params.barcode !== prevParamBarcode) {
    setPrevParamBarcode(params.barcode);
    if (currentShop) {
      lookupProductByBarcode(currentShop.id, params.barcode, isOwner).then(({ data, error }) => {
        if (data) {
          addToCart(data, 1);
        } else {
          Alert.alert(
            'Barcode Not Found',
            `Product with barcode "${params.barcode}" was not found in your inventory.`
          );
        }
      });
    }
  }

  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Live product search
  useEffect(() => {
    if (!currentShop || !searchQuery.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await fetchProducts({
          shopId: currentShop.id,
          search: searchQuery.trim(),
          pageSize: 15,
          isOwner,
        });
        setSearchResults(data);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentShop, isOwner]);

  // Load catalog when opening browse modal
  const openCatalogModal = useCallback(async () => {
    if (!currentShop) return;
    setCatalogModalVisible(true);
    setIsLoadingCatalog(true);
    try {
      const [catsRes, prodsRes] = await Promise.all([
        fetchCategories(currentShop.id),
        fetchProducts({
          shopId: currentShop.id,
          categoryId: selectedCatId,
          pageSize: 50,
          isOwner,
        }),
      ]);
      setCategories(catsRes.data);
      setCatalogProducts(prodsRes.data);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [currentShop, selectedCatId, isOwner]);

  const handleCategoryFilter = async (catId: string | null) => {
    if (!currentShop) return;
    setSelectedCatId(catId);
    setIsLoadingCatalog(true);
    try {
      const { data } = await fetchProducts({
        shopId: currentShop.id,
        categoryId: catId,
        pageSize: 50,
        isOwner,
      });
      setCatalogProducts(data);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    Alert.alert('Clear Cart', 'Are you sure you want to empty the cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) {
      setOrderDiscount(0);
    } else {
      setOrderDiscount(Math.min(val, subtotal));
    }
    setDiscountModalVisible(false);
  };

  const handleCheckoutSuccess = (result: CompleteSaleResult) => {
    router.push({
      pathname: '/sale-success',
      params: {
        saleId: result.sale_id,
        invoiceNumber: result.invoice_number,
        total: String(result.total),
        paidAmount: String(result.paid_amount),
        creditAmount: String(result.credit_amount),
        paymentStatus: result.payment_status,
        customerName: customer?.name || '',
      },
    });
  };

  const formatPrice = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>
            {currentShop?.name || 'PocketPOS'}
          </Text>
          <Text style={styles.roleBadgeText}>
            Selling as <Text style={{ fontWeight: '700' }}>{isOwner ? 'OWNER' : 'CASHIER'}</Text>
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearCart}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={18} color={colors.danger[600]} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search & Barcode Scan Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarRow}>
          <View style={styles.searchInputWrapper}>
            <Search size={18} color={colors.neutral[400]} style={{ marginRight: spacing.xs }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by name, SKU..."
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={handleSearchTextChange}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={handleClearSearch}>
                <X size={18} color={colors.neutral[400]} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/products/scanner',
                params: { mode: 'fill', returnTo: '/(tabs)/pos' },
              })
            }
            activeOpacity={0.8}
            accessibilityLabel="Scan barcode"
          >
            <ScanBarcode size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Live Search Suggestions Dropdown */}
        {searchQuery.trim().length > 0 && (
          <View style={styles.searchResultsDropdown}>
            {isSearching ? (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => {
                      addToCart(item, 1);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchItemName}>{item.name}</Text>
                      <Text style={styles.searchItemCategory}>
                        {item.category_name || 'Uncategorized'} • Stock: {item.current_stock}
                      </Text>
                    </View>
                    <Text style={styles.searchItemPrice}>{formatPrice(item.selling_price)}</Text>
                    <Plus size={16} color={colors.primary[600]} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.noResultsBox}>
                <Text style={styles.noResultsText}>No products found matching &quot;{searchQuery}&quot;</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Cart Items List */}
      <View style={styles.cartContainer}>
        {items.length === 0 ? (
          <View style={styles.emptyCartContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingCart size={44} color={colors.neutral[300]} />
            </View>
            <Text style={styles.emptyCartTitle}>Cart is Empty</Text>
            <Text style={styles.emptyCartDesc}>
              Scan product barcodes or search inventory to begin a sale.
            </Text>

            <TouchableOpacity style={styles.browseCatalogBtn} onPress={openCatalogModal}>
              <Layers size={18} color={colors.primary[600]} style={{ marginRight: 6 }} />
              <Text style={styles.browseCatalogBtnText}>Browse Product Catalog</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.product.id}
            contentContainerStyle={styles.cartListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Card style={styles.cartItemCard}>
                <View style={styles.cartItemRow}>
                  {/* Thumbnail */}
                  {item.product.image_url ? (
                    <Image source={{ uri: item.product.image_url }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Package size={20} color={colors.neutral[400]} />
                    </View>
                  )}

                  {/* Product Info */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product.name}
                    </Text>
                    <Text style={styles.itemUnitPrice}>
                      {formatPrice(item.product.selling_price)} per {item.product.unit || 'pcs'}
                    </Text>
                    {item.discount > 0 && (
                      <Text style={styles.itemDiscountText}>
                        Discount: -{formatPrice(item.discount)}
                      </Text>
                    )}
                  </View>

                  {/* Quantity Stepper */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => decrementQuantity(item.product.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Minus size={14} color={colors.neutral[700]} />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => incrementQuantity(item.product.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Plus size={14} color={colors.neutral[700]} />
                    </TouchableOpacity>
                  </View>

                  {/* Line Total & Remove */}
                  <View style={styles.lineTotalCol}>
                    <Text style={styles.lineTotalText}>{formatPrice(item.lineTotal)}</Text>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.product.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Trash2 size={16} color={colors.neutral[400]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>

      {/* Bottom Summary & Checkout Panel */}
      <View style={styles.bottomPanel}>
        {/* Customer & Discount Pill Row */}
        <View style={styles.pillsRow}>
          {/* Customer Selector Button */}
          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => setCustomerModalVisible(true)}
            activeOpacity={0.8}
          >
            <User size={14} color={colors.primary[600]} style={{ marginRight: 4 }} />
            <Text style={styles.actionPillText} numberOfLines={1}>
              {customer ? customer.name : 'Walk-in Customer'}
            </Text>
          </TouchableOpacity>

          {/* Order Discount Button */}
          <TouchableOpacity
            style={[styles.actionPill, orderDiscount > 0 && styles.actionPillActive]}
            onPress={() => {
              setDiscountInput(orderDiscount > 0 ? String(orderDiscount) : '');
              setDiscountModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Tag
              size={14}
              color={orderDiscount > 0 ? colors.danger[600] : colors.neutral[600]}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.actionPillText,
                orderDiscount > 0 && { color: colors.danger[600], fontWeight: '700' },
              ]}
            >
              {orderDiscount > 0 ? `-${formatPrice(orderDiscount)}` : 'Discount'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pricing Summary Breakdown */}
        <View style={styles.totalsSummaryRow}>
          <View>
            <Text style={styles.totalItemsLabel}>
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
              {totalDiscount > 0 ? ` • Disc: -${formatPrice(totalDiscount)}` : ''}
              {taxAmount > 0 ? ` • Tax: +${formatPrice(taxAmount)}` : ''}
            </Text>
            <Text style={styles.grandTotalAmount}>{formatPrice(grandTotal)}</Text>
          </View>

          <Button
            title={`Charge ${formatPrice(grandTotal)}`}
            onPress={() => setPaymentModalVisible(true)}
            disabled={items.length === 0}
            size="lg"
            style={styles.chargeBtn}
          />
        </View>
      </View>

      {/* Customer Selection Modal */}
      <CustomerSelectModal
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        selectedCustomer={customer}
        onSelectCustomer={setCustomer}
      />

      {/* Payment & Checkout Modal */}
      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={handleCheckoutSuccess}
        onOpenCustomerSelect={() => {
          setPaymentModalVisible(false);
          setCustomerModalVisible(true);
        }}
      />

      {/* Order Discount Modal */}
      <Modal
        visible={discountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDiscountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.discountModalContent}>
            <View style={styles.discountModalHeader}>
              <Text style={styles.discountModalTitle}>Order Discount</Text>
              <TouchableOpacity onPress={() => setDiscountModalVisible(false)}>
                <X size={20} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.discountModalDesc}>
              Enter a fixed discount amount (in PKR) to apply to this entire sale.
            </Text>
            <TextInput
              style={styles.discountInput}
              placeholder="0.00"
              placeholderTextColor={colors.neutral[400]}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.discountActions}>
              <Button
                title="Remove"
                variant="outline"
                onPress={() => {
                  setOrderDiscount(0);
                  setDiscountModalVisible(false);
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Apply Discount"
                onPress={handleApplyDiscount}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Catalog Quick Browse Modal */}
      <Modal
        visible={catalogModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCatalogModalVisible(false)}
      >
        <View style={styles.catalogModalOverlay}>
          <View style={styles.catalogModalContent}>
            <View style={styles.catalogHeader}>
              <Text style={styles.catalogTitle}>Product Catalog</Text>
              <TouchableOpacity onPress={() => setCatalogModalVisible(false)}>
                <X size={22} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {/* Categories Horizontal Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              <TouchableOpacity
                style={[styles.categoryPill, selectedCatId === null && styles.categoryPillActive]}
                onPress={() => handleCategoryFilter(null)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCatId === null && styles.categoryPillTextActive,
                  ]}
                >
                  All Items
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, selectedCatId === cat.id && styles.categoryPillActive]}
                  onPress={() => handleCategoryFilter(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      selectedCatId === cat.id && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Catalog Products Grid */}
            {isLoadingCatalog ? (
              <View style={styles.catalogLoading}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
              </View>
            ) : (
              <FlatList
                data={catalogProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.catalogGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.catalogCard}
                    onPress={() => addToCart(item, 1)}
                    activeOpacity={0.8}
                  >
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.catalogImage} />
                    ) : (
                      <View style={styles.catalogImagePlaceholder}>
                        <Package size={24} color={colors.neutral[400]} />
                      </View>
                    )}
                    <Text style={styles.catalogCardName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.catalogCardPrice}>{formatPrice(item.selling_price)}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyCatalogBox}>
                    <Text style={styles.emptyCatalogText}>No products in this category</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  shopName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  roleBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.danger[50],
  },
  clearBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.danger[600],
    marginLeft: 4,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    position: 'relative',
    zIndex: 10,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 2,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: 54,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  searchLoading: {
    padding: spacing.md,
    alignItems: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  searchItemName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
  searchItemCategory: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  searchItemPrice: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  noResultsBox: {
    padding: spacing.md,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  cartContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  cartListContent: {
    paddingVertical: spacing.sm,
  },
  cartItemCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    backgroundColor: '#ffffff',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
    marginRight: spacing.sm,
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  itemDetails: {
    flex: 1,
    marginRight: spacing.xs,
  },
  itemName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
  itemUnitPrice: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  itemDiscountText: {
    fontSize: 10,
    color: colors.danger[600],
    fontWeight: typography.weights.medium,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  quantityText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    paddingHorizontal: 8,
  },
  lineTotalCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  lineTotalText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyCartTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginBottom: 4,
  },
  emptyCartDesc: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  browseCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  browseCatalogBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
  },
  bottomPanel: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  actionPillActive: {
    backgroundColor: colors.danger[50],
    borderColor: colors.danger[100],
  },
  actionPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
  totalsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalItemsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  grandTotalAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  chargeBtn: {
    paddingHorizontal: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  discountModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  discountModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  discountModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  discountModalDesc: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    marginBottom: spacing.md,
  },
  discountInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  discountActions: {
    flexDirection: 'row',
  },
  catalogModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  catalogModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    height: '80%',
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  catalogTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  categoryPillActive: {
    backgroundColor: colors.primary[600],
  },
  categoryPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.semibold,
  },
  catalogGrid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  catalogCard: {
    flex: 1,
    margin: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
  },
  catalogImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  catalogImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  catalogCardName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 2,
  },
  catalogCardPrice: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  catalogLoading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyCatalogBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyCatalogText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
  },
});

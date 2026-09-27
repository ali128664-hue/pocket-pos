import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import { useRouter } from 'expo-router';
import {
  Search,
  Plus,
  Package,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  EyeOff,
} from 'lucide-react-native';

import { useShop } from '../../../src/context/ShopContext';
import { fetchCategories } from '../../../src/services/category';
import { fetchProducts } from '../../../src/services/product';
import type {
  Product,
  CategoryWithCount,
  StockFilterType,
  ActiveFilterType,
} from '../../../src/types/database';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../../src/constants/theme';

export default function ProductListScreen() {
  const router = useRouter();
  const { currentShop, isOwner } = useShop();

  const [products, setProducts] = useState<(Product & { category_name?: string | null })[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilterType>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilterType>('ALL');

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    if (!currentShop) return;
    try {
      const [catRes, prodRes] = await Promise.all([
        fetchCategories(currentShop.id),
        fetchProducts({
          shopId: currentShop.id,
          search: debouncedSearch,
          categoryId: selectedCategoryId,
          stockFilter,
          activeFilter,
          isOwner,
        }),
      ]);

      setCategories(catRes.data);
      if (prodRes.data) {
        setProducts(prodRes.data);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentShop, debouncedSearch, selectedCategoryId, stockFilter, activeFilter, isOwner]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) {
      return {
        label: 'Out of Stock',
        badgeStyle: styles.badgeDanger,
        textStyle: styles.badgeDangerText,
        icon: <XCircle size={12} color={colors.danger[700]} />,
      };
    }
    if (current <= min) {
      return {
        label: 'Low Stock',
        badgeStyle: styles.badgeWarning,
        textStyle: styles.badgeWarningText,
        icon: <AlertTriangle size={12} color={colors.warning[600]} />,
      };
    }

    return {
      label: 'In Stock',
      badgeStyle: styles.badgeSuccess,
      textStyle: styles.badgeSuccessText,
      icon: <CheckCircle2 size={12} color={colors.success[700]} />,
    };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Products</Text>
          <Text style={styles.headerSubtitle}>
            {products.length} {products.length === 1 ? 'item' : 'items'} in inventory
          </Text>
        </View>

        {isOwner && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.categoryManageButton}
              onPress={() => router.push('/(tabs)/products/categories')}
              activeOpacity={0.7}
            >
              <Layers size={18} color={colors.primary[600]} />
              <Text style={styles.categoryManageText}>Categories</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/products/add')}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <Input
          placeholder="Search by name, SKU, or barcode..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={18} color={colors.neutral[400]} />}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Category Filter Pills */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsList}
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedCategoryId === null && styles.filterPillActive,
            ]}
            onPress={() => setSelectedCategoryId(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategoryId === null && styles.filterPillTextActive,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.filterPill,
                selectedCategoryId === c.id && styles.filterPillActive,
              ]}
              onPress={() => setSelectedCategoryId(c.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedCategoryId === c.id && styles.filterPillTextActive,
                ]}
              >
                {c.name} ({c.product_count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stock Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stockPillsList}
        >
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as StockFilterType[]).map(
            (status) => {
              const label =
                status === 'ALL'
                  ? 'All Stock'
                  : status === 'IN_STOCK'
                  ? 'In Stock'
                  : status === 'LOW_STOCK'
                  ? 'Low Stock'
                  : 'Out of Stock';

              const isSelected = stockFilter === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.stockPill,
                    isSelected && styles.stockPillActive,
                  ]}
                  onPress={() => setStockFilter(status)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.stockPillText,
                      isSelected && styles.stockPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}

          {isOwner &&
            (['ACTIVE', 'INACTIVE'] as ActiveFilterType[]).map((act) => {
              const isSelected = activeFilter === act;
              return (
                <TouchableOpacity
                  key={act}
                  style={[
                    styles.stockPill,
                    isSelected && styles.stockPillActive,
                  ]}
                  onPress={() =>
                    setActiveFilter(activeFilter === act ? 'ALL' : act)
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.stockPillText,
                      isSelected && styles.stockPillTextActive,
                    ]}
                  >
                    {act === 'ACTIVE' ? 'Active Only' : 'Inactive Only'}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>

      {/* Product List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={52} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedCategoryId || stockFilter !== 'ALL'
                  ? 'No matching products'
                  : 'No Products in Inventory'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedCategoryId || stockFilter !== 'ALL'
                  ? 'Try clearing your search query or filters.'
                  : 'Add your shop items to start tracking inventory and scanning products.'}
              </Text>
              {isOwner && !searchQuery && selectedCategoryId === null && stockFilter === 'ALL' && (
                <Button
                  title="Add First Product"
                  onPress={() => router.push('/(tabs)/products/add')}
                  variant="primary"
                  style={styles.emptyButton}
                />
              )}
            </View>
          }
          renderItem={({ item }) => {
            const stockStatus = getStockStatus(item.current_stock, item.minimum_stock);
            return (
              <TouchableOpacity
                onPress={() => {
                  if (isOwner) {
                    router.push({
                      pathname: '/(tabs)/products/edit/[id]',
                      params: { id: item.id },
                    });
                  }
                }}
                activeOpacity={isOwner ? 0.7 : 1}
              >
                <Card style={styles.productCard}>
                  <View style={styles.productRow}>
                    {/* Thumbnail */}
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Package size={24} color={colors.neutral[400]} />
                      </View>
                    )}

                    {/* Product Details */}
                    <View style={styles.productInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {!item.is_active && (
                          <View style={styles.inactiveBadge}>
                            <EyeOff size={10} color={colors.neutral[600]} />
                            <Text style={styles.inactiveBadgeText}>Inactive</Text>
                          </View>
                        )}
                      </View>

                      {/* Brand & Category */}
                      <View style={styles.metaRow}>
                        {item.category_name && (
                          <Text style={styles.categoryTag} numberOfLines={1}>
                            {item.category_name}
                          </Text>
                        )}
                        {item.brand && (
                          <Text style={styles.brandTag} numberOfLines={1}>
                            {item.brand}
                          </Text>
                        )}
                        {item.barcode && (
                          <Text style={styles.barcodeTag} numberOfLines={1}>
                            {item.barcode}
                          </Text>
                        )}
                      </View>

                      {/* Price & Stock Section */}
                      <View style={styles.bottomRow}>
                        <View>
                          <Text style={styles.sellingPrice}>
                            Rs. {item.selling_price.toLocaleString()}
                          </Text>
                          {isOwner && item.purchase_price > 0 && (
                            <Text style={styles.costPrice}>
                              Cost: Rs. {item.purchase_price.toLocaleString()}
                            </Text>
                          )}
                        </View>

                        <View style={styles.stockStatusContainer}>
                          <View style={[styles.stockBadge, stockStatus.badgeStyle]}>
                            {stockStatus.icon}
                            <Text style={[styles.stockBadgeText, stockStatus.textStyle]}>
                              {item.current_stock} {item.unit} • {stockStatus.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Quick Stock Adjust Button (Owner only) */}
                    {isOwner && (
                      <TouchableOpacity
                        style={styles.adjustStockButton}
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/products/adjust-stock/[id]',
                            params: { id: item.id },
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Sliders size={18} color={colors.primary[600]} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  categoryManageText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  filterSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    paddingBottom: spacing.sm,
  },
  categoryPillsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  filterPillActive: {
    backgroundColor: colors.primary[600],
  },
  filterPillText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
    fontWeight: typography.weights.medium,
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.semibold,
  },
  stockPillsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    paddingTop: 4,
  },
  stockPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  stockPillActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  stockPillText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
  stockPillTextActive: {
    color: colors.primary[700],
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  productCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    backgroundColor: colors.neutral[100],
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  productInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: 2,
  },
  productName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.neutral[200],
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  inactiveBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  categoryTag: {
    fontSize: typography.sizes.xs - 1,
    color: colors.primary[700],
    backgroundColor: colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    fontWeight: typography.weights.medium,
  },
  brandTag: {
    fontSize: typography.sizes.xs - 1,
    color: colors.neutral[600],
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  barcodeTag: {
    fontSize: typography.sizes.xs - 1,
    color: colors.neutral[500],
    fontFamily: 'monospace',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sellingPrice: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  costPrice: {
    fontSize: typography.sizes.xs - 2,
    color: colors.neutral[500],
  },
  stockStatusContainer: {
    alignItems: 'flex-end',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  stockBadgeText: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.semibold,
  },
  badgeSuccess: {
    backgroundColor: colors.success[50],
  },
  badgeSuccessText: {
    color: colors.success[700],
  },
  badgeWarning: {
    backgroundColor: colors.warning[50],
  },
  badgeWarningText: {
    color: colors.warning[600],
  },

  badgeDanger: {
    backgroundColor: colors.danger[50],
  },
  badgeDangerText: {
    color: colors.danger[700],
  },
  adjustStockButton: {
    marginLeft: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 1.5,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    minWidth: 180,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Receipt,
  Search,
  User,
  X,
} from 'lucide-react-native';

import { useShop } from '../../src/context/ShopContext';
import {
  fetchShopSales,
  fetchSaleDetails,
  type SaleListItem,
  type SaleDetailView,
} from '../../src/services/sales';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function SaleHistoryScreen() {
  const { currentShop } = useShop();

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'CREDIT'>('ALL');

  // Detail Modal State
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [saleDetail, setSaleDetail] = useState<SaleDetailView | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadSales = useCallback(async () => {
    if (!currentShop) return;
    try {
      const { data } = await fetchShopSales({
        shopId: currentShop.id,
        search: searchQuery,
      });
      setSales(data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentShop, searchQuery]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSales();
  };

  const handleOpenDetail = async (saleId: string) => {
    if (!currentShop) return;
    setSelectedSaleId(saleId);
    setSaleDetail(null);
    setIsLoadingDetail(true);

    try {
      const { data } = await fetchSaleDetails(currentShop.id, saleId);
      setSaleDetail(data);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const formatPrice = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const filteredSales = sales.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.payment_status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          label: 'PAID',
          bg: colors.success[50],
          color: colors.success[700],
        };
      case 'PARTIAL':
        return {
          label: 'PARTIAL',
          bg: colors.warning[50],
          color: colors.warning[600],
        };
      case 'CREDIT':
        return {
          label: 'UDHAAR',
          bg: colors.primary[50],
          color: colors.primary[700],
        };
      default:
        return {
          label: status,
          bg: colors.neutral[100],
          color: colors.neutral[700],
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sales History</Text>
        <Text style={styles.subtitle}>
          {filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'} recorded
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={18} color={colors.neutral[400]} style={{ marginRight: spacing.sm }} />
        <TextInput
          placeholder="Search by invoice number (e.g. INV-2609-00001)..."
          placeholderTextColor={colors.neutral[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersRow}>
        {(['ALL', 'PAID', 'PARTIAL', 'CREDIT'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterPill, statusFilter === tab && styles.filterPillActive]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text
              style={[styles.filterPillText, statusFilter === tab && styles.filterPillTextActive]}
            >
              {tab === 'ALL' ? 'All' : tab === 'CREDIT' ? 'Udhaar' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sales List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const status = getStatusBadge(item.payment_status);
            return (
              <TouchableOpacity
                onPress={() => handleOpenDetail(item.id)}
                activeOpacity={0.8}
              >
                <Card style={styles.saleCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
                      <Text style={styles.saleDate}>
                        {new Date(item.created_at).toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardBottom}>
                    <View style={styles.customerRow}>
                      <User size={14} color={colors.neutral[500]} style={{ marginRight: 4 }} />
                      <Text style={styles.customerName}>
                        {item.customer_name || 'Walk-in Customer'}
                      </Text>
                    </View>
                    <Text style={styles.saleTotal}>{formatPrice(item.total)}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Receipt size={48} color={colors.neutral[300]} style={{ marginBottom: spacing.md }} />
              <Text style={styles.emptyTitle}>No Sales Found</Text>
              <Text style={styles.emptyDesc}>Completed sales will appear here.</Text>
            </View>
          }
        />
      )}

      {/* Sale Details Modal */}
      <Modal
        visible={Boolean(selectedSaleId)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSaleId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sale Receipt</Text>
                <Text style={styles.modalSubtitle}>{saleDetail?.invoice_number || ''}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSaleId(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {isLoadingDetail || !saleDetail ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                {/* Meta details */}
                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Customer:</Text>
                    <Text style={styles.metaValue}>
                      {saleDetail.customer_name
                        ? `${saleDetail.customer_name}${saleDetail.customer_phone ? ` (${saleDetail.customer_phone})` : ''}`
                        : 'Walk-in Customer'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Date:</Text>
                    <Text style={styles.metaValue}>
                      {new Date(saleDetail.created_at).toLocaleString('en-PK')}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Status:</Text>
                    <Text style={[styles.metaValue, { fontWeight: '700' }]}>
                      {saleDetail.payment_status}
                    </Text>
                  </View>
                </View>

                {/* Items List */}
                <Text style={styles.itemsHeading}>Items Sold</Text>
                {saleDetail.items.map((it) => (
                  <View key={it.id} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.product_name}</Text>
                      <Text style={styles.itemQtyPrice}>
                        {it.quantity} × {formatPrice(it.unit_price)}
                        {it.discount > 0 ? ` (Disc: -${formatPrice(it.discount)})` : ''}
                      </Text>
                    </View>
                    <Text style={styles.itemLineTotal}>{formatPrice(it.line_total)}</Text>
                  </View>
                ))}

                <View style={styles.divider} />

                {/* Financial Breakdown */}
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Subtotal</Text>
                  <Text style={styles.calcValue}>{formatPrice(saleDetail.subtotal)}</Text>
                </View>
                {saleDetail.discount > 0 && (
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, { color: colors.danger[600] }]}>Discount</Text>
                    <Text style={[styles.calcValue, { color: colors.danger[600] }]}>
                      - {formatPrice(saleDetail.discount)}
                    </Text>
                  </View>
                )}
                {saleDetail.tax > 0 && (
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Tax</Text>
                    <Text style={styles.calcValue}>+ {formatPrice(saleDetail.tax)}</Text>
                  </View>
                )}
                <View style={[styles.calcRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{formatPrice(saleDetail.total)}</Text>
                </View>

                <View style={styles.divider} />

                {/* Payments Breakdown */}
                <Text style={styles.itemsHeading}>Payments Recorded</Text>
                {saleDetail.payments.map((p) => (
                  <View key={p.id} style={styles.paymentRow}>
                    <Text style={styles.paymentMethod}>
                      {p.payment_method}
                      {p.reference_number ? ` (Ref: ${p.reference_number})` : ''}
                    </Text>
                    <Text style={styles.paymentAmount}>{formatPrice(p.amount)}</Text>
                  </View>
                ))}

                {saleDetail.credit_amount > 0 && (
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentMethod, { color: colors.warning[600] }]}>
                      Udhaar (Credit Ledger)
                    </Text>
                    <Text style={[styles.paymentAmount, { color: colors.warning[600] }]}>
                      {formatPrice(saleDetail.credit_amount)}
                    </Text>
                  </View>
                )}
              </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
    paddingVertical: spacing.xs,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  filterPillActive: {
    backgroundColor: colors.primary[600],
  },
  filterPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.semibold,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  saleCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  saleDate: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing.sm,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
  saleTotal: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  modalLoading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  modalBody: {
    paddingBottom: spacing.xxl,
  },
  metaBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  metaValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
  },
  itemsHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  itemName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
  },
  itemQtyPrice: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  itemLineTotal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calcLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  calcValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
  },
  grandTotalRow: {
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  grandTotalValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  paymentMethod: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
  },
  paymentAmount: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
});

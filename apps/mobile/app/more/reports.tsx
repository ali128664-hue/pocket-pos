import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  CreditCard,
  AlertTriangle,
} from 'lucide-react-native';

import { useShop } from '../../src/context/ShopContext';
import {
  fetchSalesReport,
  fetchPaymentBreakdown,
  fetchLowStockReport,
  type SalesReportSummary,
  type PaymentBreakdownItem,
  type LowStockReportItem,
} from '../../src/services/reports';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

type DateFilter = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL_TIME';

export default function ReportsScreen() {
  const router = useRouter();
  const { currentShop } = useShop();

  const [dateFilter, setDateFilter] = useState<DateFilter>('TODAY');
  const [salesSummary, setSalesSummary] = useState<SalesReportSummary | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getDateRange = (filter: DateFilter): { start?: string; end?: string } => {
    const now = new Date();
    if (filter === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString() };
    }
    if (filter === 'YESTERDAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (filter === 'LAST_7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString() };
    }
    if (filter === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString() };
    }
    return {};
  };

  const loadReports = useCallback(async () => {
    if (!currentShop) return;
    try {
      setIsLoading(true);
      const range = getDateRange(dateFilter);
      const [salesRes, paymentsRes, lowStockRes] = await Promise.all([
        fetchSalesReport(currentShop.id, range.start, range.end),
        fetchPaymentBreakdown(currentShop.id, range.start, range.end),
        fetchLowStockReport(currentShop.id),
      ]);

      if (salesRes.data) setSalesSummary(salesRes.data);
      if (paymentsRes.data) setPaymentBreakdown(paymentsRes.data);
      if (lowStockRes.data) setLowStockItems(lowStockRes.data);
    } finally {
      setIsLoading(false);
    }
  }, [currentShop, dateFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const formatPrice = (val: number) => `Rs. ${val.toLocaleString('en-PK')}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Business Reports</Text>
        </View>

        {/* Date Filter Pills */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'ALL_TIME', label: 'All Time' },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterPill,
                  dateFilter === f.id && styles.filterPillActive,
                ]}
                onPress={() => setDateFilter(f.id as DateFilter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    dateFilter === f.id && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={styles.loadingText}>Generating reports...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Sales Volume Hero */}
            <Card style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroIconBox}>
                  <TrendingUp size={24} color={colors.primary[600]} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.heroLabel}>TOTAL NET REVENUE</Text>
                  <Text style={styles.heroAmount}>
                    {formatPrice(salesSummary?.netRevenue || 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Total Orders</Text>
                  <Text style={styles.metricValue}>{salesSummary?.orderCount || 0}</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Cash / Paid</Text>
                  <Text style={[styles.metricValue, { color: colors.success[700] }]}>
                    {formatPrice(salesSummary?.paidAmount || 0)}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Udhaar (Credit)</Text>
                  <Text style={[styles.metricValue, { color: colors.warning[600] }]}>
                    {formatPrice(salesSummary?.creditAmount || 0)}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Discounts Given</Text>
                  <Text style={styles.metricValue}>
                    {formatPrice(salesSummary?.totalDiscount || 0)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Payment Method Breakdown */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <CreditCard size={18} color={colors.primary[600]} style={{ marginRight: spacing.xs }} />
                <Text style={styles.sectionTitle}>Payment Method Distribution</Text>
              </View>

              {paymentBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>No payments recorded in this period</Text>
              ) : (
                paymentBreakdown.map((item) => (
                  <View key={item.method} style={styles.paymentBarContainer}>
                    <View style={styles.paymentRow}>
                      <Text style={styles.paymentMethodName}>
                        {item.method.replace('_', ' ')}
                      </Text>
                      <Text style={styles.paymentAmount}>
                        {formatPrice(item.total)} ({item.percentage}%)
                      </Text>
                    </View>
                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor:
                              item.method === 'UDAAR'
                                ? colors.warning[500]
                                : item.method === 'CASH'
                                ? colors.success[600]
                                : colors.primary[600],
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card>

            {/* Low Stock Reorder List */}
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <AlertTriangle size={18} color={colors.warning[600]} style={{ marginRight: spacing.xs }} />
                <Text style={styles.sectionTitle}>Low Stock Reorder List</Text>
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockBadgeText}>{lowStockItems.length} items</Text>
                </View>
              </View>

              {lowStockItems.length === 0 ? (
                <Text style={styles.emptyText}>All products have healthy stock levels! 🎉</Text>
              ) : (
                lowStockItems.map((prod) => (
                  <View key={prod.id} style={styles.lowStockRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lowStockName}>{prod.name}</Text>
                      <Text style={styles.lowStockMeta}>
                        SKU: {prod.sku || 'N/A'} • Min: {prod.minimumStock} {prod.unit}
                      </Text>
                    </View>
                    <View style={styles.stockCountBox}>
                      <Text style={styles.stockCountNumber}>
                        {prod.currentStock} {prod.unit}
                      </Text>
                      <Text style={styles.stockWarningLabel}>Low Stock</Text>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  appBarTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  filtersSection: {
    backgroundColor: '#ffffff',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
    fontWeight: typography.weights.bold,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.neutral[500],
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricItem: {
    width: '45%',
  },
  metricLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  metricValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  lowStockBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
  },
  paymentBarContainer: {
    marginBottom: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentMethodName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[800],
  },
  paymentAmount: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  barBackground: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  lowStockName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  lowStockMeta: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  stockCountBox: {
    alignItems: 'flex-end',
  },
  stockCountNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.danger[600],
  },
  stockWarningLabel: {
    fontSize: 10,
    color: colors.danger[600],
  },
  emptyText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
});

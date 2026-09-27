import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  LogOut,
  Store,
  MapPin,
  Receipt,
  Plus,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react-native';

import { useAuth } from '../../src/context/AuthContext';
import { useShop } from '../../src/context/ShopContext';
import { fetchDashboardMetrics, type DashboardMetrics } from '../../src/services/dashboard';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { currentShop, memberships, isOwner } = useShop();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const currentRole = memberships[0]?.role || (isOwner ? 'OWNER' : 'CASHIER');

  const loadMetrics = useCallback(async () => {
    if (!currentShop) return;
    try {
      const { data } = await fetchDashboardMetrics(currentShop.id, isOwner);
      if (data) {
        setMetrics(data);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentShop, isOwner]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadMetrics();
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of PocketPOS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await signOut();
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const formatPrice = (val: number) => `Rs. ${val.toLocaleString('en-PK')}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.full_name || user?.user_metadata?.full_name || 'Shopkeeper'}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{currentRole}</Text>
          </View>
        </View>

        {/* Active Shop Information Card */}
        {currentShop && (
          <Card style={styles.shopCard}>
            <View style={styles.shopHeader}>
              {currentShop.logo_url ? (
                <Image source={{ uri: currentShop.logo_url }} style={styles.shopLogo} />
              ) : (
                <View style={styles.shopLogoPlaceholder}>
                  <Store size={26} color={colors.primary[600]} />
                </View>
              )}
              <View style={styles.shopHeaderInfo}>
                <Text style={styles.shopName}>{currentShop.name}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={13} color={colors.neutral[400]} style={{ marginRight: 4 }} />
                  <Text style={styles.locationText}>
                    {currentShop.city}, {currentShop.country}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.primary[600] }]}
            onPress={() => router.push('/(tabs)/pos' as any)}
            activeOpacity={0.8}
          >
            <ShoppingCart size={20} color="#ffffff" />
            <Text style={styles.quickActionBtnText}>New Sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.neutral[800] }]}
            onPress={() => router.push('/(tabs)/products/add' as any)}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.quickActionBtnText}>Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.warning[600] }]}
            onPress={() => router.push('/(tabs)/customers' as any)}
            activeOpacity={0.8}
          >
            <Users size={20} color="#ffffff" />
            <Text style={styles.quickActionBtnText}>Customers</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Metrics Dashboard Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{"Today's Highlights"}</Text>
          {isLoading && <ActivityIndicator size="small" color={colors.primary[600]} />}
        </View>

        <View style={styles.metricsGrid}>
          {/* Today's Sales */}
          <Card style={styles.metricCard}>
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>{"TODAY'S REVENUE"}</Text>
              <TrendingUp size={16} color={colors.primary[600]} />
            </View>
            <Text style={styles.metricBigValue}>
              {formatPrice(metrics?.todaySalesAmount || 0)}
            </Text>
            <Text style={styles.metricSubtext}>
              {metrics?.todayOrdersCount || 0} order{metrics?.todayOrdersCount === 1 ? '' : 's'} completed
            </Text>
          </Card>

          {/* Outstanding Udhaar */}
          <Card
            style={styles.metricCard}
            onPress={() => router.push('/(tabs)/customers' as any)}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>OUTSTANDING UDHAAR</Text>
              <Users size={16} color={colors.warning[600]} />
            </View>
            <Text style={[styles.metricBigValue, { color: colors.warning[600] }]}>
              {formatPrice(metrics?.totalUdhaarAmount || 0)}
            </Text>
            <Text style={styles.metricSubtext}>Market receivables</Text>
          </Card>

          {/* Low Stock Alerts */}
          <Card
            style={styles.metricCard}
            onPress={() => router.push('/(tabs)/products' as any)}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricLabel}>LOW STOCK ITEMS</Text>
              <AlertTriangle
                size={16}
                color={metrics?.lowStockCount ? colors.danger[600] : colors.neutral[400]}
              />
            </View>
            <Text
              style={[
                styles.metricBigValue,
                { color: metrics?.lowStockCount ? colors.danger[600] : colors.neutral[900] },
              ]}
            >
              {metrics?.lowStockCount || 0}
            </Text>
            <Text style={styles.metricSubtext}>
              {metrics?.lowStockCount ? 'Need immediate restocking' : 'All stock levels healthy'}
            </Text>
          </Card>

          {/* Today's Expenses (Owner Only) */}
          {isOwner && (
            <Card
              style={styles.metricCard}
              onPress={() => router.push('/more/expenses' as any)}
            >
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricLabel}>{"TODAY'S EXPENSES"}</Text>
                <DollarSign size={16} color={colors.danger[600]} />
              </View>
              <Text style={[styles.metricBigValue, { color: colors.danger[600] }]}>
                {formatPrice(metrics?.todayExpensesAmount || 0)}
              </Text>
              <Text style={styles.metricSubtext}>Operating shop costs</Text>
            </Card>
          )}
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history' as any)}>
            <Text style={styles.viewAllText}>View All Invoices</Text>
          </TouchableOpacity>
        </View>

        {metrics?.recentSales && metrics.recentSales.length > 0 ? (
          metrics.recentSales.map((sale) => (
            <Card
              key={sale.id}
              style={styles.saleRowCard}
              onPress={() => router.push('/(tabs)/history' as any)}
            >
              <View style={styles.saleRowLeft}>
                <View style={styles.receiptIconBox}>
                  <Receipt size={18} color={colors.primary[600]} />
                </View>
                <View style={{ marginLeft: spacing.sm }}>
                  <Text style={styles.saleInvoiceText}>{sale.invoice_number}</Text>
                  <Text style={styles.saleCustomerText}>
                    {sale.customer_name || 'Walk-in Customer'} •{' '}
                    {new Date(sale.created_at).toLocaleTimeString('en-PK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.saleAmountText}>{formatPrice(sale.total)}</Text>
                <Text
                  style={[
                    styles.saleStatusBadge,
                    sale.payment_status === 'PAID'
                      ? styles.paidColor
                      : sale.payment_status === 'PARTIAL'
                      ? styles.partialColor
                      : styles.creditColor,
                  ]}
                >
                  {sale.payment_status}
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptySalesCard}>
            <Clock size={32} color={colors.neutral[300]} />
            <Text style={styles.emptySalesText}>No sales recorded today yet.</Text>
            <TouchableOpacity
              style={styles.startSaleLink}
              onPress={() => router.push('/(tabs)/pos' as any)}
            >
              <Text style={styles.startSaleLinkText}>+ Start a New Sale</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Sign Out Button */}
        <View style={styles.signOutBox}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            isLoading={isSigningOut}
            icon={<LogOut size={16} color={colors.danger[600]} style={{ marginRight: 6 }} />}
            style={styles.signOutBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  roleBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
  },
  shopCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogo: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  shopLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopHeaderInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  shopName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  quickActionBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  viewAllText: {
    fontSize: typography.sizes.xs,
    color: colors.primary[600],
    fontWeight: typography.weights.semibold,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.neutral[500],
    letterSpacing: 0.5,
  },
  metricBigValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginVertical: 2,
  },
  metricSubtext: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  saleRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  saleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleInvoiceText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  saleCustomerText: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  saleAmountText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  saleStatusBadge: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
  paidColor: {
    color: colors.success[700],
  },
  partialColor: {
    color: colors.warning[600],
  },
  creditColor: {
    color: colors.primary[700],
  },
  emptySalesCard: {
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptySalesText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  startSaleLink: {
    marginTop: spacing.sm,
  },
  startSaleLinkText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  signOutBox: {
    marginTop: spacing.xl,
  },
  signOutBtn: {
    borderColor: colors.danger[100],
  },
});

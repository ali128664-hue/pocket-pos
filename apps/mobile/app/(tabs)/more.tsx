import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Receipt,
  Users,
  DollarSign,
  TrendingUp,
  Layers,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  FolderTree,
  ScanBarcode,
} from 'lucide-react-native';

import { useAuth } from '../../src/context/AuthContext';
import { useShop } from '../../src/context/ShopContext';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function MoreScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { currentShop, isOwner } = useShop();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of PocketPOS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const renderMenuItem = ({
    title,
    subtitle,
    icon,
    route,
    ownerOnly = false,
  }: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    route: string;
    ownerOnly?: boolean;
  }) => {
    if (ownerOnly && !isOwner) return null;

    return (
      <TouchableOpacity
        key={route}
        style={styles.menuItem}
        onPress={() => router.push(route as any)}
        activeOpacity={0.7}
      >
        <View style={styles.menuIconBox}>{icon}</View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <ChevronRight size={18} color={colors.neutral[400]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.avatarInitial}>
                {(profile?.full_name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.profileName}>
                {profile?.full_name || user?.user_metadata?.full_name || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{isOwner ? 'OWNER' : 'CASHIER'}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Section: Business Management */}
        <Text style={styles.sectionHeader}>BUSINESS MANAGEMENT</Text>
        <Card style={styles.menuCard}>
          {renderMenuItem({
            title: 'Sales & Receipts History',
            subtitle: 'Search past invoices, view digital receipts',
            icon: <Receipt size={20} color={colors.primary[600]} />,
            route: '/(tabs)/history',
          })}
          <View style={styles.menuDivider} />

          {renderMenuItem({
            title: 'Customers & Khata Ledger',
            subtitle: 'Track market receivables and settle debt',
            icon: <Users size={20} color={colors.warning[600]} />,
            route: '/(tabs)/customers',
          })}
          <View style={styles.menuDivider} />

          {renderMenuItem({
            title: 'Operating Expenses',
            subtitle: 'Track rent, utilities, and daily costs',
            icon: <DollarSign size={20} color={colors.danger[600]} />,
            route: '/more/expenses',
            ownerOnly: true,
          })}
          {isOwner && <View style={styles.menuDivider} />}

          {renderMenuItem({
            title: 'Business Reports',
            subtitle: 'Sales breakdown, payment methods, reorder list',
            icon: <TrendingUp size={20} color={colors.primary[600]} />,
            route: '/more/reports',
          })}
        </Card>

        {/* Section: Inventory & Operations */}
        <Text style={styles.sectionHeader}>INVENTORY & OPERATIONS</Text>
        <Card style={styles.menuCard}>
          {renderMenuItem({
            title: 'Stock Movement Audit',
            subtitle: 'Complete chronological inventory log',
            icon: <Layers size={20} color={colors.primary[600]} />,
            route: '/more/inventory-movements',
          })}
          <View style={styles.menuDivider} />

          {renderMenuItem({
            title: 'Product Categories',
            subtitle: 'Manage departments and catalog grouping',
            icon: <FolderTree size={20} color={colors.primary[600]} />,
            route: '/(tabs)/products/categories',
          })}
          <View style={styles.menuDivider} />

          {renderMenuItem({
            title: 'Barcode Scanner Viewfinder',
            subtitle: 'Scan product barcodes and lookup items',
            icon: <ScanBarcode size={20} color={colors.primary[600]} />,
            route: '/(tabs)/products/scanner',
          })}
        </Card>

        {/* Section: Administration (Owner Only) */}
        {isOwner && (
          <>
            <Text style={styles.sectionHeader}>ADMINISTRATION</Text>
            <Card style={styles.menuCard}>
              {renderMenuItem({
                title: 'Staff & Cashiers',
                subtitle: 'Manage team access, activate/deactivate cashiers',
                icon: <ShieldCheck size={20} color={colors.primary[600]} />,
                route: '/more/staff',
                ownerOnly: true,
              })}
              <View style={styles.menuDivider} />

              {renderMenuItem({
                title: 'Shop & Tax Settings',
                subtitle: 'Update shop profile, tax rate, invoice prefix',
                icon: <Settings size={20} color={colors.neutral[700]} />,
                route: '/more/settings',
                ownerOnly: true,
              })}
            </Card>
          </>
        )}

        {/* Sign Out Card */}
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.danger[50] }]}>
              <LogOut size={20} color={colors.danger[600]} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.menuTitle, { color: colors.danger[600] }]}>Sign Out</Text>
              <Text style={styles.menuSubtitle}>Log out of this device safely</Text>
            </View>
            <ChevronRight size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        </Card>

        {/* App Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>PocketPOS Mobile • v1.0.0 (Production Release)</Text>
          <Text style={styles.storeText}>{currentShop?.name || 'Retail Terminal'}</Text>
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
  profileCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: '#ffffff',
  },
  profileName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  profileEmail: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.neutral[500],
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    padding: 0,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  menuSubtitle: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: 66,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  versionText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
  },
  storeText: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
});

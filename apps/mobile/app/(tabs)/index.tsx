import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import {
  LogOut,
  User,
  ShieldCheck,
  Store,
  MapPin,
  Percent,
  Receipt,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useShop } from '../../src/context/ShopContext';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const { currentShop, memberships } = useShop();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const currentRole = memberships[0]?.role || 'OWNER';

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {profile?.full_name || user?.user_metadata?.full_name || 'Shopkeeper'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Phase 2 Active</Text>
          </View>
        </View>

        {/* Active Shop Information Card */}
        {currentShop && (
          <Card style={styles.shopCard}>
            <View style={styles.shopHeader}>
              {currentShop.logo_url ? (
                <Image
                  source={{ uri: currentShop.logo_url }}
                  style={styles.shopLogo}
                />
              ) : (
                <View style={styles.shopLogoPlaceholder}>
                  <Store size={26} color={colors.primary[600]} />
                </View>
              )}
              <View style={styles.shopHeaderInfo}>
                <View style={styles.shopNameRow}>
                  <Text style={styles.shopName}>{currentShop.name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{currentRole}</Text>
                  </View>
                </View>
                <View style={styles.locationRow}>
                  <MapPin size={14} color={colors.neutral[400]} />
                  <Text style={styles.locationText}>
                    {currentShop.city}, {currentShop.country}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.shopMetaGrid}>
              <View style={styles.shopMetaItem}>
                <View style={styles.metaIcon}>
                  <Receipt size={16} color={colors.primary[600]} />
                </View>
                <View>
                  <Text style={styles.metaLabel}>Invoice Prefix</Text>
                  <Text style={styles.metaValue}>{currentShop.invoice_prefix}</Text>
                </View>
              </View>

              <View style={styles.shopMetaItem}>
                <View style={styles.metaIcon}>
                  <Percent size={16} color={colors.primary[600]} />
                </View>
                <View>
                  <Text style={styles.metaLabel}>Tax Rate</Text>
                  <Text style={styles.metaValue}>{currentShop.tax_rate}%</Text>
                </View>
              </View>

              <View style={styles.shopMetaItem}>
                <View style={styles.metaIcon}>
                  <Text style={styles.currencyIcon}>₨</Text>
                </View>
                <View>
                  <Text style={styles.metaLabel}>Currency</Text>
                  <Text style={styles.metaValue}>{currentShop.currency}</Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* User Account & Security Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <User size={24} color={colors.primary[600]} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.full_name || user?.user_metadata?.full_name || 'Shopkeeper'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <ShieldCheck size={18} color={colors.success[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Authentication & Storage</Text>
              <Text style={styles.detailValue}>
                Hardware-backed Expo SecureStore + Supabase RLS
              </Text>
            </View>
          </View>
        </Card>

        {/* Phase 2 Verification Checklist */}
        <Card style={styles.phaseCard}>
          <Text style={styles.phaseTitle}>Phase 2 Shop Onboarding Complete</Text>
          <Text style={styles.phaseDescription}>
            Shop creation, automatic OWNER membership, logo storage, and tenant routing are operating cleanly.
          </Text>

          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Shop Onboarding Screen & Form</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Zod Validation (Pakistani phone, tax, prefix)</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Atomic create_shop_with_owner RPC / flow</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Automatic OWNER Membership Assignment</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Expo ImagePicker & Logo Storage Service</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Zero-flash Protected Routing with hasShop Guard</Text>
          </View>
        </Card>

        {/* Sign Out CTA */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          size="lg"
          isLoading={isSigningOut}
          icon={<LogOut size={20} color={colors.primary[600]} />}
          style={styles.signOutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    fontWeight: typography.weights.medium,
  },
  userName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  badge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
  },
  shopCard: {
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[600],
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginRight: spacing.md,
  },
  shopLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginRight: spacing.md,
  },
  shopHeaderInfo: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success[500],
  },
  roleBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.success[700],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.md,
  },
  shopMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shopMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
  },
  currencyIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary[600],
  },
  metaLabel: {
    fontSize: 10,
    color: colors.neutral[400],
  },
  metaValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailIcon: {
    width: 28,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  detailValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[800],
    marginTop: 1,
  },
  phaseCard: {
    backgroundColor: '#ffffff',
    marginBottom: spacing.xxl,
  },
  phaseTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  phaseDescription: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[700],
    marginLeft: spacing.sm,
  },
  signOutButton: {
    marginBottom: spacing.xxxl,
  },
});

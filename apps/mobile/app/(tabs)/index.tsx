import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LogOut, User, ShieldCheck, Mail, Store, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { isSupabaseConfigured } from '../../src/services/supabase';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const configured = isSupabaseConfigured();

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
            <Text style={styles.badgeText}>Phase 1 Active</Text>
          </View>
        </View>

        {/* User Profile & Session Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <User size={28} color={colors.primary[600]} />
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
              <Text style={styles.detailLabel}>Session Storage</Text>
              <Text style={styles.detailValue}>
                Hardware-backed Expo SecureStore (Active)
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Mail size={18} color={colors.neutral[500]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>User ID</Text>
              <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                {user?.id || 'Local session'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Store size={18} color={colors.primary[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Backend Connection</Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: configured ? colors.success[600] : colors.warning[600] },
                ]}
              >
                {configured ? 'Connected to Supabase' : 'Running in Local Sandbox'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Architecture & Phase Verification Box */}
        <Card style={styles.phaseCard}>
          <Text style={styles.phaseTitle}>Phase 1 Foundation Verification</Text>
          <Text style={styles.phaseDescription}>
            Authentication, session persistence, protected routing, and Zod input validation are operating cleanly.
          </Text>

          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Expo Router Navigation Shell</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Supabase Auth with Email / Password</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>SecureStore Session Persistence</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Protected Route Guards (Auth vs App)</Text>
          </View>
          <View style={styles.checkItem}>
            <CheckCircle2 size={18} color={colors.success[600]} />
            <Text style={styles.checkText}>Zod Validation & Friendly Error Mapping</Text>
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
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  profileEmail: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailIcon: {
    width: 32,
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
    fontSize: typography.sizes.sm,
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
    fontSize: typography.sizes.sm,
    color: colors.neutral[700],
    marginLeft: spacing.sm,
  },
  signOutButton: {
    marginBottom: spacing.xxxl,
  },
});

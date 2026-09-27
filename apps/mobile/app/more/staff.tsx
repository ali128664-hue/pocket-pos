import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  ShieldAlert,
  X,
  AlertCircle,
} from 'lucide-react-native';

import { useShop } from '../../src/context/ShopContext';
import {
  fetchShopStaff,
  toggleStaffStatus,
  addCashierByEmail,
  type StaffMember,
} from '../../src/services/staff';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function StaffScreen() {
  const router = useRouter();
  const { currentShop, isOwner } = useShop();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(isOwner);

  // Add Cashier Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!currentShop) return;
    try {
      setIsLoading(true);
      const { data } = await fetchShopStaff(currentShop.id);
      if (data) {
        setStaff(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentShop]);

  useEffect(() => {
    if (isOwner) {
      loadStaff();
    }
  }, [loadStaff, isOwner]);

  const handleToggleStatus = async (member: StaffMember) => {
    if (member.role === 'OWNER') {
      Alert.alert('Action Not Allowed', 'The shop owner account cannot be deactivated.');
      return;
    }

    const newStatus = !member.is_active;
    const { error } = await toggleStaffStatus(member.id, newStatus);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadStaff();
    }
  };

  const handleAddCashier = async () => {
    if (!currentShop) return;
    if (!emailInput.trim()) {
      setAddError('Cashier email is required');
      return;
    }

    try {
      setIsAdding(true);
      setAddError('');
      const { success, error } = await addCashierByEmail(currentShop.id, emailInput.trim());

      if (error || !success) {
        setAddError(error?.message || 'Could not add cashier');
        return;
      }

      setModalVisible(false);
      setEmailInput('');
      Alert.alert('Cashier Added', `Cashier added to ${currentShop.name} successfully.`);
      loadStaff();
    } catch (err: any) {
      setAddError(err.message || 'An unexpected error occurred');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Staff</Text>
        </View>
        <View style={styles.restrictedContainer}>
          <ShieldAlert size={56} color={colors.danger[500]} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedDesc}>
            Only the shop OWNER can manage staff accounts and cashier assignments.
          </Text>
          <Button
            title="Return to Home"
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Staff & Cashiers</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setAddError('');
              setModalVisible(true);
            }}
          >
            <Plus size={18} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add Cashier</Text>
          </TouchableOpacity>
        </View>

        {/* Info Header */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <ShieldCheck size={20} color={colors.primary[600]} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCardTitle}>Role-Based Access Control</Text>
              <Text style={styles.infoCardDesc}>
                Cashiers can process sales and scan barcodes, but cannot view purchase prices,
                delete sales, or access operating expense records.
              </Text>
            </View>
          </View>
        </Card>

        {/* Staff List */}
        {isLoading && staff.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={styles.loadingText}>Loading staff team...</Text>
          </View>
        ) : (
          <FlatList
            data={staff}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card style={styles.staffCard}>
                <View style={styles.staffHeader}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>
                      {item.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.staffName}>{item.full_name}</Text>
                      <View
                        style={[
                          styles.roleBadge,
                          item.role === 'OWNER' ? styles.ownerBadge : styles.cashierBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            item.role === 'OWNER'
                              ? styles.ownerBadgeText
                              : styles.cashierBadgeText,
                          ]}
                        >
                          {item.role}
                        </Text>
                      </View>
                    </View>

                    {item.email && (
                      <View style={styles.metaRow}>
                        <Mail size={12} color={colors.neutral[400]} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{item.email}</Text>
                      </View>
                    )}

                    {item.phone && (
                      <View style={styles.metaRow}>
                        <Phone size={12} color={colors.neutral[400]} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{item.phone}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {item.role === 'CASHIER' && (
                  <View style={styles.staffFooter}>
                    <View style={styles.statusIndicator}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: item.is_active
                              ? colors.success[500]
                              : colors.neutral[400],
                          },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {item.is_active ? 'Active Cashier' : 'Deactivated'}
                      </Text>
                    </View>

                    <Switch
                      value={item.is_active}
                      onValueChange={() => handleToggleStatus(item)}
                      trackColor={{ false: colors.neutral[200], true: colors.primary[600] }}
                    />
                  </View>
                )}
              </Card>
            )}
          />
        )}

        {/* Add Cashier Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Cashier to Shop</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={22} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              {addError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.danger[600]} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{addError}</Text>
                </View>
              ) : null}

              <Text style={styles.modalNote}>
                Enter the email address of the registered PocketPOS user you want to assign as a
                CASHIER for {currentShop?.name}.
              </Text>

              <Text style={styles.fieldLabel}>Cashier Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="cashier@example.com"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailInput}
                onChangeText={setEmailInput}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Add as Cashier"
                  onPress={handleAddCashier}
                  isLoading={isAdding}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  infoCard: {
    margin: spacing.md,
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoCardTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[800],
    marginBottom: 2,
  },
  infoCardDesc: {
    fontSize: 11,
    color: colors.primary[900],
    lineHeight: 16,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  staffCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[700],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  staffName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  ownerBadge: {
    backgroundColor: colors.primary[50],
  },
  ownerBadgeText: {
    color: colors.primary[700],
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  cashierBadge: {
    backgroundColor: colors.neutral[100],
  },
  cashierBadgeText: {
    color: colors.neutral[700],
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  staffFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: 6,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  restrictedTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.danger[600],
    marginTop: spacing.md,
  },
  restrictedDesc: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
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
  modalNote: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger[50],
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  errorBannerText: {
    fontSize: typography.sizes.xs,
    color: colors.danger[700],
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});

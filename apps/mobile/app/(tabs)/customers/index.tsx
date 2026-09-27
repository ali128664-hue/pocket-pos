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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Search,
  Plus,
  Phone,
  ArrowRight,
  BookOpen,
  X,
  AlertCircle,
} from 'lucide-react-native';

import { useShop } from '../../../src/context/ShopContext';
import {
  fetchCustomers,
  createCustomer,
  fetchShopCustomersSummary,
} from '../../../src/services/customer';
import type { Customer } from '../../../src/types/database';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '../../../src/constants/theme';

export default function CustomersScreen() {
  const router = useRouter();
  const { currentShop } = useShop();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalUdhaar, setTotalUdhaar] = useState<number>(0);
  const [totalCustomersCount, setTotalCustomersCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add Customer Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadData = useCallback(
    async (query = '') => {
      if (!currentShop) return;
      try {
        setIsLoading(true);
        const [customersRes, summaryRes] = await Promise.all([
          fetchCustomers(currentShop.id, query),
          fetchShopCustomersSummary(currentShop.id),
        ]);

        if (customersRes.data) {
          setCustomers(customersRes.data);
        }
        if (!summaryRes.error) {
          setTotalUdhaar(summaryRes.totalUdhaar);
          setTotalCustomersCount(summaryRes.totalCustomers);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentShop]
  );

  useEffect(() => {
    loadData(searchQuery);
  }, [loadData, searchQuery]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleCreateCustomer = async () => {
    if (!currentShop) return;
    if (!nameInput.trim()) {
      setCreateError('Customer name is required');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError('');
      const { data, error } = await createCustomer(currentShop.id, {
        name: nameInput.trim(),
        phone: phoneInput.trim() || null,
        address: addressInput.trim() || null,
        notes: notesInput.trim() || null,
      });

      if (error || !data) {
        setCreateError(error?.message || 'Could not save customer');
        return;
      }

      setModalVisible(false);
      setNameInput('');
      setPhoneInput('');
      setAddressInput('');
      setNotesInput('');
      loadData(searchQuery);
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const formatPrice = (val: number) => `Rs. ${val.toLocaleString('en-PK')}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Customers & Khata</Text>
            <Text style={styles.screenSubtitle}>Manage accounts and track Udhaar debt</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setCreateError('');
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add Customer</Text>
          </TouchableOpacity>
        </View>

        {/* Total Receivables Banner */}
        <Card style={styles.summaryBanner}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIconBox}>
              <BookOpen size={24} color={colors.warning[600]} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.summaryLabel}>TOTAL MARKET RECEIVABLES (UDHAAR)</Text>
              <Text style={styles.summaryAmount}>{formatPrice(totalUdhaar)}</Text>
              <Text style={styles.summarySubtext}>
                Across {totalCustomersCount} registered customer{totalCustomersCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.neutral[400]} style={{ marginRight: spacing.xs }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name or phone..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.neutral[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Customer Directory List */}
        {isLoading && customers.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.customerCard}
                onPress={() => router.push(`/(tabs)/customers/${item.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.customerAvatar}>
                  <Users size={20} color={colors.primary[600]} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  {item.phone ? (
                    <View style={styles.phoneRow}>
                      <Phone size={12} color={colors.neutral[400]} style={{ marginRight: 4 }} />
                      <Text style={styles.customerPhone}>{item.phone}</Text>
                    </View>
                  ) : (
                    <Text style={styles.noPhoneText}>No phone recorded</Text>
                  )}
                </View>

                {/* Outstanding balance badge */}
                <View style={styles.balanceContainer}>
                  {item.outstanding_balance > 0 ? (
                    <View style={styles.debtBadge}>
                      <Text style={styles.debtLabel}>UDHAAR</Text>
                      <Text style={styles.debtValue}>{formatPrice(item.outstanding_balance)}</Text>
                    </View>
                  ) : (
                    <View style={styles.clearBadge}>
                      <Text style={styles.clearText}>Clear (Rs. 0)</Text>
                    </View>
                  )}
                  <ArrowRight size={16} color={colors.neutral[400]} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={48} color={colors.neutral[300]} />
                <Text style={styles.emptyTitle}>No Customers Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? `No customers match "${searchQuery}"`
                    : 'Start by adding your first customer to track purchases and Udhaar.'}
                </Text>
              </View>
            }
          />
        )}

        {/* Add Customer Modal */}
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
                <Text style={styles.modalTitle}>Add New Customer</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={22} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              {createError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.danger[600]} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{createError}</Text>
                </View>
              ) : null}

              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.fieldLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Tariq Mehmood"
                  placeholderTextColor={colors.neutral[400]}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="03001234567"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="phone-pad"
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                />

                <Text style={styles.fieldLabel}>Address / Shop</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Street / Market / Area"
                  placeholderTextColor={colors.neutral[400]}
                  value={addressInput}
                  onChangeText={setAddressInput}
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Special instructions, credit terms..."
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  value={notesInput}
                  onChangeText={setNotesInput}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Save Customer"
                  onPress={handleCreateCustomer}
                  isLoading={isCreating}
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
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  screenSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  summaryBanner: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning[500],
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.neutral[500],
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
    marginVertical: 2,
  },
  summarySubtext: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  noPhoneText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
    fontStyle: 'italic',
    marginTop: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtBadge: {
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  debtLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
  },
  debtValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
  },
  clearBadge: {
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  clearText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.success[700],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[700],
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
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
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
    marginBottom: 4,
    marginTop: spacing.xs,
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
    marginBottom: spacing.sm,
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

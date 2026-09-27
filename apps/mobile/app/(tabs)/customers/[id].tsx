import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
} from 'lucide-react-native';

import { useShop } from '../../../src/context/ShopContext';
import {
  fetchCustomerById,
  updateCustomer,
  fetchCustomerLedger,
} from '../../../src/services/customer';
import { executeRecordCustomerPayment } from '../../../src/services/sales';
import type { Customer, CustomerLedgerEntry } from '../../../src/types/database';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '../../../src/constants/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentShop } = useShop();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settle Udhaar Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH'>('CASH');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [payError, setPayError] = useState('');

  // Edit Customer Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  const loadCustomerData = useCallback(async () => {
    if (!currentShop || !id) return;
    try {
      setIsLoading(true);
      const [custRes, ledgerRes] = await Promise.all([
        fetchCustomerById(currentShop.id, id),
        fetchCustomerLedger(currentShop.id, id),
      ]);

      if (custRes.data) {
        setCustomer(custRes.data);
        setEditName(custRes.data.name);
        setEditPhone(custRes.data.phone || '');
        setEditAddress(custRes.data.address || '');
        setEditNotes(custRes.data.notes || '');
      }
      if (ledgerRes.data) {
        setLedger(ledgerRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentShop, id]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const handleRecordPayment = async () => {
    if (!currentShop || !customer) return;
    const amount = parseFloat(payAmountInput);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Please enter a valid payment amount');
      return;
    }
    if (amount > customer.outstanding_balance) {
      setPayError(`Payment cannot exceed outstanding balance of Rs. ${customer.outstanding_balance}`);
      return;
    }

    try {
      setIsSubmittingPay(true);
      setPayError('');
      const { data, error } = await executeRecordCustomerPayment({
        shop_id: currentShop.id,
        customer_id: customer.id,
        amount,
        payment_method: payMethod,
        reference_number: payRef.trim() || null,
        notes: payNotes.trim() || null,
      });

      if (error || !data) {
        setPayError(error?.message || 'Payment could not be recorded');
        return;
      }

      setPaymentModalVisible(false);
      setPayAmountInput('');
      setPayRef('');
      setPayNotes('');
      Alert.alert(
        'Payment Recorded',
        `Successfully recorded Rs. ${amount.toLocaleString('en-PK')}. Remaining balance: Rs. ${data.new_balance.toLocaleString('en-PK')}`
      );
      loadCustomerData();
    } catch (err: any) {
      setPayError(err.message || 'An error occurred');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentShop || !customer) return;
    if (!editName.trim()) {
      setEditError('Customer name cannot be empty');
      return;
    }

    try {
      setIsUpdating(true);
      setEditError('');
      const { data, error } = await updateCustomer(currentShop.id, customer.id, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
      });

      if (error || !data) {
        setEditError(error?.message || 'Update failed');
        return;
      }

      setCustomer(data);
      setEditModalVisible(false);
      Alert.alert('Success', 'Customer profile updated successfully');
    } catch (err: any) {
      setEditError(err.message || 'An error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPrice = (val: number) => `Rs. ${val.toLocaleString('en-PK')}`;

  if (isLoading && !customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading customer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>Customer not found</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
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
          <Text style={styles.appBarTitle} numberOfLines={1}>
            {customer.name}
          </Text>
          <TouchableOpacity
            style={styles.editIconBtn}
            onPress={() => {
              setEditError('');
              setEditModalVisible(true);
            }}
          >
            <Edit2 size={18} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Outstanding Balance Hero Card */}
          <Card style={styles.balanceHeroCard}>
            <Text style={styles.balanceHeroLabel}>OUTSTANDING UDHAAR BALANCE</Text>
            <Text
              style={[
                styles.balanceHeroAmount,
                customer.outstanding_balance > 0 ? styles.debtColor : styles.clearColor,
              ]}
            >
              {formatPrice(customer.outstanding_balance)}
            </Text>
            <Text style={styles.balanceHeroSubtext}>
              {customer.outstanding_balance > 0
                ? 'Payment is currently pending from customer'
                : 'Customer has settled all credit bills'}
            </Text>

            {customer.outstanding_balance > 0 && (
              <Button
                title="Settle Debt (Record Payment)"
                onPress={() => {
                  setPayError('');
                  setPayAmountInput(String(customer.outstanding_balance));
                  setPaymentModalVisible(true);
                }}
                style={styles.settleBtn}
              />
            )}
          </Card>

          {/* Customer Contact & Profile Card */}
          <Card style={styles.infoCard}>
            <Text style={styles.cardHeading}>Customer Information</Text>

            <View style={styles.infoRow}>
              <Phone size={16} color={colors.neutral[400]} style={{ marginRight: spacing.sm }} />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{customer.phone || 'Not recorded'}</Text>
            </View>

            {customer.address && (
              <View style={styles.infoRow}>
                <MapPin size={16} color={colors.neutral[400]} style={{ marginRight: spacing.sm }} />
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{customer.address}</Text>
              </View>
            )}

            {customer.notes && (
              <View style={styles.infoRow}>
                <FileText size={16} color={colors.neutral[400]} style={{ marginRight: spacing.sm }} />
                <Text style={styles.infoLabel}>Notes:</Text>
                <Text style={styles.infoValue}>{customer.notes}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Clock size={16} color={colors.neutral[400]} style={{ marginRight: spacing.sm }} />
              <Text style={styles.infoLabel}>Customer Since:</Text>
              <Text style={styles.infoValue}>
                {new Date(customer.created_at).toLocaleDateString('en-PK', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </Card>

          {/* Khata Statement / Transaction Ledger */}
          <View style={styles.ledgerHeaderRow}>
            <Text style={styles.ledgerTitle}>Khata Statement</Text>
            <Text style={styles.ledgerCount}>{ledger.length} entries</Text>
          </View>

          {ledger.length === 0 ? (
            <Card style={styles.emptyLedgerCard}>
              <CheckCircle2 size={36} color={colors.neutral[300]} />
              <Text style={styles.emptyLedgerTitle}>No Khata Transactions</Text>
              <Text style={styles.emptyLedgerDesc}>
                This customer has no recorded credit sales or repayment records yet.
              </Text>
            </Card>
          ) : (
            ledger.map((item) => (
              <Card key={item.id} style={styles.ledgerCard}>
                <View style={styles.ledgerCardRow}>
                  <View
                    style={[
                      styles.ledgerIconCircle,
                      item.type === 'DEBIT' ? styles.debitBg : styles.creditBg,
                    ]}
                  >
                    {item.type === 'DEBIT' ? (
                      <ArrowUpRight size={18} color={colors.danger[600]} />
                    ) : (
                      <ArrowDownLeft size={18} color={colors.success[700]} />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.ledgerDesc}>{item.description}</Text>
                    <Text style={styles.ledgerDate}>
                      {new Date(item.date).toLocaleDateString('en-PK', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {item.reference_number && (
                      <Text style={styles.ledgerRef}>Ref: {item.reference_number}</Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.ledgerAmount,
                        item.type === 'DEBIT' ? styles.debitAmount : styles.creditAmount,
                      ]}
                    >
                      {item.type === 'DEBIT' ? '+' : '-'} {formatPrice(item.amount)}
                    </Text>
                    <Text style={styles.ledgerTypeBadge}>
                      {item.type === 'DEBIT' ? 'Credit Added' : 'Payment Received'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Record Payment / Settle Debt Modal */}
        <Modal
          visible={paymentModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPaymentModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Record Debt Payment</Text>
                <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                  <X size={22} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              {payError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.danger[600]} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{payError}</Text>
                </View>
              ) : null}

              <ScrollView style={{ maxHeight: 420 }}>
                {/* Total debt callout */}
                <View style={styles.debtCallout}>
                  <Text style={styles.debtCalloutLabel}>Current Outstanding Debt:</Text>
                  <Text style={styles.debtCalloutValue}>
                    {formatPrice(customer.outstanding_balance)}
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Payment Amount (PKR) *</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={payAmountInput}
                  onChangeText={setPayAmountInput}
                />

                {/* Quick full payment pill */}
                <TouchableOpacity
                  style={styles.quickFullBtn}
                  onPress={() => setPayAmountInput(String(customer.outstanding_balance))}
                >
                  <Text style={styles.quickFullBtnText}>
                    Pay Full Amount ({formatPrice(customer.outstanding_balance)})
                  </Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Payment Method</Text>
                <View style={styles.methodPillsRow}>
                  {(['CASH', 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodPill,
                        payMethod === method && styles.methodPillActive,
                      ]}
                      onPress={() => setPayMethod(method)}
                    >
                      <Text
                        style={[
                          styles.methodPillText,
                          payMethod === method && styles.methodPillTextActive,
                        ]}
                      >
                        {method.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {payMethod !== 'CASH' && (
                  <>
                    <Text style={styles.fieldLabel}>Transaction / Reference #</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. TXN-123456"
                      placeholderTextColor={colors.neutral[400]}
                      value={payRef}
                      onChangeText={setPayRef}
                    />
                  </>
                )}

                <Text style={styles.fieldLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Cleared pending milk invoice"
                  placeholderTextColor={colors.neutral[400]}
                  value={payNotes}
                  onChangeText={setPayNotes}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setPaymentModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Confirm Payment"
                  onPress={handleRecordPayment}
                  isLoading={isSubmittingPay}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Customer Modal */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Customer</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <X size={22} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              {editError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.danger[600]} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{editError}</Text>
                </View>
              ) : null}

              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.fieldLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                />

                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={editPhone}
                  onChangeText={setEditPhone}
                />

                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={editAddress}
                  onChangeText={setEditAddress}
                />

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                  value={editNotes}
                  onChangeText={setEditNotes}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setEditModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Save Changes"
                  onPress={handleUpdateProfile}
                  isLoading={isUpdating}
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
  editIconBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  balanceHeroCard: {
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  balanceHeroLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.neutral[500],
    letterSpacing: 0.5,
  },
  balanceHeroAmount: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    marginVertical: spacing.xs,
  },
  debtColor: {
    color: colors.warning[600],
  },
  clearColor: {
    color: colors.success[600],
  },
  balanceHeroSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  settleBtn: {
    width: '100%',
    backgroundColor: colors.warning[600],
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cardHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[500],
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[800],
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  ledgerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  ledgerCount: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  emptyLedgerCard: {
    backgroundColor: '#ffffff',
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  emptyLedgerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[700],
    marginTop: spacing.sm,
  },
  emptyLedgerDesc: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
  },
  ledgerCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  ledgerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ledgerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debitBg: {
    backgroundColor: colors.danger[50],
  },
  creditBg: {
    backgroundColor: colors.success[50],
  },
  ledgerDesc: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  ledgerDate: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  ledgerRef: {
    fontSize: 10,
    color: colors.neutral[400],
    marginTop: 1,
  },
  ledgerAmount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  debitAmount: {
    color: colors.danger[600],
  },
  creditAmount: {
    color: colors.success[700],
  },
  ledgerTypeBadge: {
    fontSize: 10,
    color: colors.neutral[500],
    marginTop: 2,
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
  errorText: {
    fontSize: typography.sizes.md,
    color: colors.danger[600],
    fontWeight: typography.weights.semibold,
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
  debtCallout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warning[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  debtCalloutLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.warning[600],
  },
  debtCalloutValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  amountInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  quickFullBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  quickFullBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
  },
  methodPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  methodPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
  },
  methodPillActive: {
    backgroundColor: colors.primary[600],
  },
  methodPillText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
  },
  methodPillTextActive: {
    color: '#ffffff',
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

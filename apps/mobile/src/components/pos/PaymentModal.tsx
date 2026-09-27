import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Banknote,
  BookOpen,
  Smartphone,
  Building,
  AlertCircle,
  AlertTriangle,
  User,
} from 'lucide-react-native';

import { useShop } from '../../context/ShopContext';
import { useCart } from '../../context/CartContext';
import { executeCompleteSaleTransaction } from '../../services/sales';
import type {
  PaymentMethod,
  CompleteSaleResult,
  CompleteSaleParams,
  CompleteSaleItemInput,
  CompleteSalePaymentInput,
} from '../../types/database';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: CompleteSaleResult) => void;
  onOpenCustomerSelect: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onOpenCustomerSelect,
}) => {
  const { currentShop } = useShop();
  const {
    items,
    customer,
    subtotal,
    totalDiscount,
    orderDiscount,
    taxAmount,
    grandTotal,
    notes,
    clearCart,
  } = useCart();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');

  // Cash Payment State
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');

  // Udhaar / Split Payment State
  const [cashDownPaymentInput, setCashDownPaymentInput] = useState<string>('0');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  // Submission / Error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isSubmittingRef = useRef(false);

  // Initialize inputs when modal opens
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setSelectedMethod('CASH');
      setCashReceivedInput(grandTotal > 0 ? String(grandTotal) : '');
      setCashDownPaymentInput('0');
      setReferenceNumber('');
      setErrorMessage('');
    }
  }

  const cashReceived = useMemo(() => {
    const val = parseFloat(cashReceivedInput);
    return isNaN(val) ? 0 : val;
  }, [cashReceivedInput]);

  const changeToReturn = useMemo(() => {
    return Math.max(0, Math.round((cashReceived - grandTotal) * 100) / 100);
  }, [cashReceived, grandTotal]);

  // For Udhaar split: cash down payment + remaining credit
  const cashDownPayment = useMemo(() => {
    const val = parseFloat(cashDownPaymentInput);
    return isNaN(val) ? 0 : Math.max(0, val);
  }, [cashDownPaymentInput]);

  const remainingUdhaar = useMemo(() => {
    return Math.max(0, Math.round((grandTotal - cashDownPayment) * 100) / 100);
  }, [grandTotal, cashDownPayment]);

  const formatPrice = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleQuickCash = (amount: number) => {
    setCashReceivedInput(String(amount));
    if (errorMessage) setErrorMessage('');
  };

  const handleQuickAddCash = (increment: number) => {
    const current = parseFloat(cashReceivedInput) || 0;
    setCashReceivedInput(String(current + increment));
    if (errorMessage) setErrorMessage('');
  };

  const handleCheckout = async () => {
    if (isSubmittingRef.current || !currentShop) return;

    if (items.length === 0) {
      setErrorMessage('Your cart is empty. Add products before checkout.');
      return;
    }

    // 1. Validate Payments Payload
    const paymentsPayload: CompleteSalePaymentInput[] = [];

    if (selectedMethod === 'CASH') {
      if (cashReceived < grandTotal) {
        setErrorMessage(
          `Cash received (${formatPrice(cashReceived)}) cannot be less than the total (${formatPrice(grandTotal)}).`
        );
        return;
      }
      // Exact sale amount is recorded in database; change is handed back
      paymentsPayload.push({
        payment_method: 'CASH',
        amount: grandTotal,
      });
    } else if (selectedMethod === 'UDAAR') {
      if (!customer) {
        setErrorMessage('A registered customer is strictly required for Udhaar (Credit) sales.');
        return;
      }

      if (cashDownPayment > grandTotal) {
        setErrorMessage('Down payment cannot exceed the total bill.');
        return;
      }

      if (cashDownPayment > 0) {
        paymentsPayload.push({
          payment_method: 'CASH',
          amount: cashDownPayment,
        });
      }

      if (remainingUdhaar > 0) {
        paymentsPayload.push({
          payment_method: 'UDAAR',
          amount: remainingUdhaar,
        });
      }
    } else {
      // Digital methods: EASYPAISA, JAZZCASH, BANK_TRANSFER
      paymentsPayload.push({
        payment_method: selectedMethod,
        amount: grandTotal,
        reference_number: referenceNumber.trim() || null,
      });
    }

    // 2. Prepare Items Payload
    const itemsPayload: CompleteSaleItemInput[] = items.map((it) => ({
      product_id: it.product.id,
      quantity: it.quantity,
      discount: it.discount > 0 ? it.discount : 0,
    }));

    const checkoutParams: CompleteSaleParams = {
      shop_id: currentShop.id,
      customer_id: customer ? customer.id : null,
      items: itemsPayload,
      payments: paymentsPayload,
      order_discount: orderDiscount > 0 ? orderDiscount : 0,
      notes: notes.trim() || null,
    };

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setErrorMessage('');

      const { data, error } = await executeCompleteSaleTransaction(checkoutParams);

      if (error || !data) {
        let friendly = error?.message || 'Transaction could not be completed';
        if (friendly.includes('Insufficient stock')) {
          friendly = friendly.replace('Database error: ', '');
        } else if (friendly.includes('Payment mismatch')) {
          friendly = 'Payment amounts do not match the total bill.';
        } else if (friendly.includes('registered customer is required')) {
          friendly = 'A registered customer is required for Udhaar / credit sales.';
        }
        setErrorMessage(friendly);
        return;
      }

      // Checkout Success! Clear cart and invoke callback
      clearCart();
      onClose();
      onSuccess(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during checkout');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Checkout</Text>
              <Text style={styles.headerSubtitle}>{items.length} items in bill</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Bill Financial Summary */}
            <Card style={styles.billSummaryCard}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Subtotal</Text>
                <Text style={styles.billValue}>{formatPrice(subtotal)}</Text>
              </View>

              {totalDiscount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.danger[600] }]}>Discount</Text>
                  <Text style={[styles.billValue, { color: colors.danger[600] }]}>
                    - {formatPrice(totalDiscount)}
                  </Text>
                </View>
              )}

              {taxAmount > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Tax ({currentShop?.tax_rate || 0}%)</Text>
                  <Text style={styles.billValue}>+ {formatPrice(taxAmount)}</Text>
                </View>
              )}

              <View style={styles.totalDivider} />

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatPrice(grandTotal)}</Text>
              </View>
            </Card>

            {/* Customer Pill / Selector */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Customer</Text>
              <TouchableOpacity onPress={onOpenCustomerSelect}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.customerSelectorCard}
              onPress={onOpenCustomerSelect}
              activeOpacity={0.8}
            >
              <View style={styles.customerIconCircle}>
                <User size={18} color={colors.primary[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerNameText}>
                  {customer ? customer.name : 'Walk-in Customer'}
                </Text>
                <Text style={styles.customerSubtext}>
                  {customer?.phone ? customer.phone : 'Cash sales only'}
                </Text>
              </View>
              {customer && customer.outstanding_balance > 0 && (
                <View style={styles.customerUdhaarBadge}>
                  <Text style={styles.customerUdhaarBadgeText}>
                    Prev Udhaar: Rs. {customer.outstanding_balance.toLocaleString('en-PK')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Payment Method Selector */}
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethodsGrid}>
              {/* Cash */}
              <TouchableOpacity
                style={[
                  styles.methodTile,
                  selectedMethod === 'CASH' && styles.methodTileActive,
                ]}
                onPress={() => setSelectedMethod('CASH')}
                activeOpacity={0.8}
              >
                <Banknote
                  size={24}
                  color={selectedMethod === 'CASH' ? colors.primary[600] : colors.neutral[600]}
                />
                <Text
                  style={[
                    styles.methodTileText,
                    selectedMethod === 'CASH' && styles.methodTileTextActive,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              {/* Udhaar */}
              <TouchableOpacity
                style={[
                  styles.methodTile,
                  selectedMethod === 'UDAAR' && styles.methodTileActive,
                ]}
                onPress={() => setSelectedMethod('UDAAR')}
                activeOpacity={0.8}
              >
                <BookOpen
                  size={24}
                  color={selectedMethod === 'UDAAR' ? colors.warning[600] : colors.neutral[600]}
                />
                <Text
                  style={[
                    styles.methodTileText,
                    selectedMethod === 'UDAAR' && styles.methodTileTextActive,
                  ]}
                >
                  Udhaar
                </Text>
              </TouchableOpacity>

              {/* EasyPaisa */}
              <TouchableOpacity
                style={[
                  styles.methodTile,
                  selectedMethod === 'EASYPAISA' && styles.methodTileActive,
                ]}
                onPress={() => setSelectedMethod('EASYPAISA')}
                activeOpacity={0.8}
              >
                <Smartphone
                  size={24}
                  color={selectedMethod === 'EASYPAISA' ? '#10b981' : colors.neutral[600]}
                />
                <Text
                  style={[
                    styles.methodTileText,
                    selectedMethod === 'EASYPAISA' && styles.methodTileTextActive,
                  ]}
                >
                  EasyPaisa
                </Text>
              </TouchableOpacity>

              {/* JazzCash */}
              <TouchableOpacity
                style={[
                  styles.methodTile,
                  selectedMethod === 'JAZZCASH' && styles.methodTileActive,
                ]}
                onPress={() => setSelectedMethod('JAZZCASH')}
                activeOpacity={0.8}
              >
                <Smartphone
                  size={24}
                  color={selectedMethod === 'JAZZCASH' ? '#f59e0b' : colors.neutral[600]}
                />
                <Text
                  style={[
                    styles.methodTileText,
                    selectedMethod === 'JAZZCASH' && styles.methodTileTextActive,
                  ]}
                >
                  JazzCash
                </Text>
              </TouchableOpacity>

              {/* Bank Transfer */}
              <TouchableOpacity
                style={[
                  styles.methodTile,
                  selectedMethod === 'BANK_TRANSFER' && styles.methodTileActive,
                ]}
                onPress={() => setSelectedMethod('BANK_TRANSFER')}
                activeOpacity={0.8}
              >
                <Building
                  size={24}
                  color={selectedMethod === 'BANK_TRANSFER' ? colors.primary[600] : colors.neutral[600]}
                />
                <Text
                  style={[
                    styles.methodTileText,
                    selectedMethod === 'BANK_TRANSFER' && styles.methodTileTextActive,
                  ]}
                >
                  Bank
                </Text>
              </TouchableOpacity>
            </View>

            {/* CASH Payment Interface */}
            {selectedMethod === 'CASH' && (
              <Card style={styles.methodCard}>
                <Text style={styles.inputHeading}>Cash Received from Customer</Text>

                {/* Quick Denomination Buttons */}
                <View style={styles.denominationsRow}>
                  <TouchableOpacity
                    style={styles.denomBtn}
                    onPress={() => handleQuickCash(grandTotal)}
                  >
                    <Text style={styles.denomBtnText}>Exact</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.denomBtn}
                    onPress={() => handleQuickAddCash(50)}
                  >
                    <Text style={styles.denomBtnText}>+50</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.denomBtn}
                    onPress={() => handleQuickAddCash(100)}
                  >
                    <Text style={styles.denomBtnText}>+100</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.denomBtn}
                    onPress={() => handleQuickAddCash(500)}
                  >
                    <Text style={styles.denomBtnText}>+500</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.denomBtn}
                    onPress={() => handleQuickCash(5000)}
                  >
                    <Text style={styles.denomBtnText}>5,000</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.neutral[400]}
                  value={cashReceivedInput}
                  onChangeText={(text) => {
                    setCashReceivedInput(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />

                {/* Change Calculation Box */}
                <View
                  style={[
                    styles.changeBox,
                    cashReceived >= grandTotal ? styles.changeBoxSuccess : styles.changeBoxWarning,
                  ]}
                >
                  <Text style={styles.changeLabel}>
                    {cashReceived >= grandTotal ? 'Change to Return:' : 'Remaining Balance Needed:'}
                  </Text>
                  <Text
                    style={[
                      styles.changeValue,
                      cashReceived >= grandTotal ? styles.changeValueSuccess : styles.changeValueWarning,
                    ]}
                  >
                    {cashReceived >= grandTotal
                      ? formatPrice(changeToReturn)
                      : formatPrice(grandTotal - cashReceived)}
                  </Text>
                </View>
              </Card>
            )}

            {/* UDHAAR (Credit) Payment Interface */}
            {selectedMethod === 'UDAAR' && (
              <Card style={styles.methodCard}>
                {!customer ? (
                  <View style={styles.udhaarAlert}>
                    <AlertTriangle size={20} color={colors.warning[600]} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.udhaarAlertTitle}>Customer Selection Required</Text>
                      <Text style={styles.udhaarAlertDesc}>
                        Udhaar cannot be given to a walk-in customer. Please select or create a customer
                        first.
                      </Text>
                      <TouchableOpacity
                        style={styles.udhaarSelectBtn}
                        onPress={onOpenCustomerSelect}
                      >
                        <Text style={styles.udhaarSelectBtnText}>Select Customer Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    <View style={styles.udhaarCustomerHeader}>
                      <Text style={styles.udhaarCustomerName}>{customer.name}</Text>
                      <Text style={styles.udhaarPrevBalance}>
                        Previous Balance: {formatPrice(customer.outstanding_balance)}
                      </Text>
                    </View>

                    <Text style={styles.inputHeading}>Immediate Down Payment (Cash)</Text>
                    <TextInput
                      style={styles.amountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.neutral[400]}
                      value={cashDownPaymentInput}
                      onChangeText={(text) => {
                        setCashDownPaymentInput(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                      keyboardType="decimal-pad"
                    />

                    <View style={styles.udhaarBreakdownBox}>
                      <View style={styles.udhaarRow}>
                        <Text style={styles.udhaarRowLabel}>Total Bill:</Text>
                        <Text style={styles.udhaarRowValue}>{formatPrice(grandTotal)}</Text>
                      </View>
                      <View style={styles.udhaarRow}>
                        <Text style={styles.udhaarRowLabel}>Paid in Cash now:</Text>
                        <Text style={styles.udhaarRowValue}>- {formatPrice(cashDownPayment)}</Text>
                      </View>
                      <View style={styles.udhaarDivider} />
                      <View style={styles.udhaarRow}>
                        <Text style={[styles.udhaarRowLabel, { fontWeight: '700' }]}>
                          New Udhaar Added:
                        </Text>
                        <Text style={[styles.udhaarRowValue, { color: colors.warning[600], fontWeight: '700' }]}>
                          + {formatPrice(remainingUdhaar)}
                        </Text>
                      </View>
                      <View style={styles.udhaarRow}>
                        <Text style={styles.udhaarRowLabel}>Updated Total Debt:</Text>
                        <Text style={[styles.udhaarRowValue, { fontWeight: '700' }]}>
                          {formatPrice(customer.outstanding_balance + remainingUdhaar)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            )}

            {/* DIGITAL METHODS (EasyPaisa, JazzCash, Bank) */}
            {(selectedMethod === 'EASYPAISA' ||
              selectedMethod === 'JAZZCASH' ||
              selectedMethod === 'BANK_TRANSFER') && (
              <Card style={styles.methodCard}>
                <Text style={styles.inputHeading}>
                  Transaction Reference / Trx ID (Optional)
                </Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="e.g. TRX-9823471"
                  placeholderTextColor={colors.neutral[400]}
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                />
                <Text style={styles.hintText}>
                  Enter the confirmation SMS code or bank reference for future verification.
                </Text>
              </Card>
            )}

            {/* Error Message Display */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <AlertCircle size={18} color={colors.danger[600]} style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom Confirmation Bar */}
          <View style={styles.bottomBar}>
            <Button
              title={isSubmitting ? 'Processing Transaction...' : `Complete Sale — ${formatPrice(grandTotal)}`}
              onPress={handleCheckout}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              style={styles.checkoutBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    height: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  billSummaryCard: {
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    marginBottom: spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  billLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  billValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.xs + 2,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  grandTotalLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  grandTotalValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  changeLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary[600],
  },
  customerSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  customerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  customerNameText: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
  customerSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  customerUdhaarBadge: {
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  customerUdhaarBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  methodTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
  },
  methodTileActive: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  methodTileText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
    marginTop: 4,
  },
  methodTileTextActive: {
    color: colors.primary[700],
    fontWeight: typography.weights.bold,
  },
  methodCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#ffffff',
  },
  inputHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  denominationsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  denomBtn: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  denomBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[800],
  },
  amountInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  changeBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  changeBoxSuccess: {
    backgroundColor: colors.success[50],
  },
  changeBoxWarning: {
    backgroundColor: colors.warning[50],
  },
  changeLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
    marginBottom: 2,
  },
  changeValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  changeValueSuccess: {
    color: colors.success[700],
  },
  changeValueWarning: {
    color: colors.warning[600],
  },
  udhaarAlert: {
    flexDirection: 'row',
    backgroundColor: colors.warning[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  udhaarAlertTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
    marginBottom: 2,
  },
  udhaarAlertDesc: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  udhaarSelectBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  udhaarSelectBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#ffffff',
  },
  udhaarCustomerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  udhaarCustomerName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  udhaarPrevBalance: {
    fontSize: typography.sizes.xs,
    color: colors.warning[600],
    fontWeight: typography.weights.medium,
  },
  udhaarBreakdownBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  udhaarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  udhaarRowLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  udhaarRowValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[900],
  },
  udhaarDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 4,
  },
  hintText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger[600],
    flex: 1,
    lineHeight: 18,
  },
  bottomBar: {
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  checkoutBtn: {
    width: '100%',
  },
});

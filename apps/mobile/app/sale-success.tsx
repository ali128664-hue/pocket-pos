import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  Receipt,
  ShoppingCart,
  User,
  Home,
  Share2,
  Send,
} from 'lucide-react-native';

import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../src/constants/theme';
import { useShop } from '../src/context/ShopContext';
import { fetchSaleDetails, type SaleDetailView } from '../src/services/sales';
import {
  generateReceiptText,
  shareReceiptViaWhatsApp,
  shareReceiptGeneral,
} from '../src/services/receipt';

export default function SaleSuccessScreen() {
  const router = useRouter();
  const { currentShop } = useShop();
  const params = useLocalSearchParams<{
    saleId?: string;
    invoiceNumber?: string;
    total?: string;
    paidAmount?: string;
    creditAmount?: string;
    paymentStatus?: string;
    customerName?: string;
    customerPhone?: string;
  }>();

  const [saleDetail, setSaleDetail] = useState<SaleDetailView | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const invoiceNumber = params.invoiceNumber || 'INV-00000';
  const total = parseFloat(params.total || '0') || 0;
  const paidAmount = parseFloat(params.paidAmount || '0') || 0;
  const creditAmount = parseFloat(params.creditAmount || '0') || 0;
  const paymentStatus = params.paymentStatus || 'PAID';
  const customerName = params.customerName || null;
  const customerPhone = params.customerPhone || null;

  useEffect(() => {
    if (params.saleId && currentShop?.id) {
      fetchSaleDetails(currentShop.id, params.saleId).then(({ data }) => {
        if (data) setSaleDetail(data);
      });
    }
  }, [params.saleId, currentShop?.id]);

  const getReceiptText = () => {
    return generateReceiptText({
      shopName: currentShop?.name || 'PocketPOS Store',
      shopPhone: currentShop?.phone || null,
      shopAddress: currentShop?.address || null,
      invoiceNumber,
      date: new Date(),
      customerName,
      customerPhone,
      items: saleDetail?.items.map((it) => ({
        name: it.product_name,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        total: it.line_total,
      })),
      subtotal: saleDetail ? saleDetail.subtotal : total,
      discount: saleDetail ? saleDetail.discount : 0,
      tax: saleDetail ? saleDetail.tax : 0,
      total,
      paidAmount,
      creditAmount,
    });
  };

  const handleShareWhatsApp = async () => {
    setIsSharing(true);
    try {
      const receipt = getReceiptText();
      await shareReceiptViaWhatsApp({
        phone: customerPhone,
        receiptText: receipt,
      });
    } catch {
      Alert.alert('Notice', 'Unable to open WhatsApp. Standard share dialog used.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareGeneral = async () => {
    const receipt = getReceiptText();
    await shareReceiptGeneral(receipt);
  };

  const formatPrice = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = () => {
    if (paymentStatus === 'PAID') {
      return {
        text: 'Fully Paid',
        bg: colors.success[50],
        color: colors.success[700],
      };
    }
    if (paymentStatus === 'PARTIAL') {
      return {
        text: 'Partial Payment',
        bg: colors.warning[50],
        color: colors.warning[600],
      };
    }
    return {
      text: 'Udhaar / Credit',
      bg: colors.primary[50],
      color: colors.primary[700],
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Animated / Prominent Success Icon */}
        <View style={styles.iconCircleOuter}>
          <View style={styles.iconCircleInner}>
            <CheckCircle2 size={54} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.successHeading}>Sale Completed!</Text>
        <Text style={styles.successSubheading}>Transaction has been recorded atomically</Text>

        {/* Invoice Summary Card */}
        <Card style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.invoiceLabel}>INVOICE NUMBER</Text>
              <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                {statusBadge.text}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {customerName && (
            <View style={styles.row}>
              <View style={styles.labelWithIcon}>
                <User size={14} color={colors.neutral[500]} style={{ marginRight: 6 }} />
                <Text style={styles.rowLabel}>Customer</Text>
              </View>
              <Text style={styles.rowValue}>{customerName}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Amount Received</Text>
            <Text style={[styles.rowValue, { color: colors.success[700] }]}>
              {formatPrice(paidAmount)}
            </Text>
          </View>

          {creditAmount > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Added to Udhaar</Text>
              <Text style={[styles.rowValue, { color: colors.warning[600] }]}>
                {formatPrice(creditAmount)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.timestampLabel}>Date & Time</Text>
            <Text style={styles.timestampValue}>
              {new Date().toLocaleDateString('en-PK', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={handleShareWhatsApp}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Send size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.whatsappBtnText}>Send Receipt via WhatsApp</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareGeneral}
          >
            <Share2 size={16} color={colors.neutral[700]} style={{ marginRight: 6 }} />
            <Text style={styles.shareBtnText}>Share Digital Receipt</Text>
          </TouchableOpacity>

          <Button
            title="Start New Sale"
            onPress={() => router.replace('/(tabs)/pos')}
            icon={<ShoppingCart size={18} color="#ffffff" />}
            style={styles.primaryBtn}
          />

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => router.replace('/(tabs)/history')}
            >
              <Receipt size={16} color={colors.neutral[700]} style={{ marginRight: 6 }} />
              <Text style={styles.outlineBtnText}>Sales History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Home size={16} color={colors.neutral[700]} style={{ marginRight: 6 }} />
              <Text style={styles.outlineBtnText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircleInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  successHeading: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    textAlign: 'center',
  },
  successSubheading: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  invoiceCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.xl,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.neutral[500],
    letterSpacing: 0.5,
  },
  invoiceNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  timestampLabel: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[400],
  },
  timestampValue: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 400,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs + 2,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    backgroundColor: '#ffffff',
    marginBottom: spacing.md,
  },
  shareBtnText: {
    color: colors.neutral[700],
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  primaryBtn: {
    width: '100%',
    marginBottom: spacing.md,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    backgroundColor: '#ffffff',
  },
  outlineBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
});

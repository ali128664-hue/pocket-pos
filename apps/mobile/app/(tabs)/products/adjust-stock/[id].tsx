import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import { useShop } from '../../../../src/context/ShopContext';
import { fetchProductById, adjustStock } from '../../../../src/services/product';
import type { Product } from '../../../../src/types/database';

import { stockAdjustmentSchema } from '../../../../src/utils/validation';
import { Input } from '../../../../src/components/ui/Input';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../../../src/constants/theme';

type AdjustmentReason = 'MANUAL_CORRECTION' | 'PURCHASE_RECEIPT' | 'DAMAGED_EXPIRED' | 'RETURN';

const REASON_OPTIONS: { label: string; value: AdjustmentReason; description: string }[] = [
  {
    label: 'New Stock Received',
    value: 'PURCHASE_RECEIPT',

    description: 'Restocked from supplier or wholesale market',
  },
  {
    label: 'Physical Count Audit',
    value: 'MANUAL_CORRECTION',
    description: 'Correct inventory discrepancies after counting shelf',
  },
  {
    label: 'Damaged or Expired',
    value: 'DAMAGED_EXPIRED',
    description: 'Broken packaging, spillage, or past expiry date',
  },
  {
    label: 'Customer Return',
    value: 'RETURN',
    description: 'Item returned back to shop inventory',
  },
];

const PRESETS = [
  { label: '+1', value: 1 },
  { label: '+5', value: 5 },
  { label: '+10', value: 10 },
  { label: '+25', value: 25 },
  { label: '+50', value: 50 },
  { label: '-1', value: -1 },
  { label: '-5', value: -5 },
  { label: '-10', value: -10 },
];

export default function AdjustStockScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentShop, isOwner } = useShop();

  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  const [quantityChange, setQuantityChange] = useState('');
  const [movementType, setMovementType] = useState<
    'MANUAL_CORRECTION' | 'PURCHASE_RECEIPT' | 'DAMAGED_EXPIRED' | 'RETURN'
  >('MANUAL_CORRECTION');
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!currentShop || !id) return;
    try {
      setIsLoading(true);
      const { data, error } = await fetchProductById(currentShop.id, id, isOwner);
      if (error || !data) {
        Alert.alert('Error', error?.message || 'Product not found', [
          { text: 'Back', onPress: () => router.back() },
        ]);
        return;
      }
      setProduct(data);
    } finally {
      setIsLoading(false);
    }
  }, [currentShop, id, isOwner, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const numChange = parseFloat(quantityChange) || 0;
  const currentStock = product?.current_stock ?? 0;
  const newStock = currentStock + numChange;
  const allowNegative = currentShop?.allow_negative_stock ?? false;
  const isNegativeDisallowed = !allowNegative && newStock < 0;

  const handleApplyPreset = (value: number) => {
    const current = parseFloat(quantityChange) || 0;
    const updated = current + value;
    setQuantityChange(updated === 0 ? '' : (updated > 0 ? `+${updated}` : `${updated}`));
    setErrorText('');
  };

  const handleManualChangeText = (text: string) => {
    setQuantityChange(text);
    setErrorText('');
  };

  const handleSubmit = async () => {
    if (!currentShop || !product) return;
    if (!isOwner) {
      Alert.alert('Access Denied', 'Only shop owners can adjust stock manually.');
      return;
    }

    const validation = stockAdjustmentSchema.safeParse({
      quantityChange,
      movementType,
      notes,
    });

    if (!validation.success) {
      setErrorText(validation.error.issues[0]?.message || 'Invalid adjustment data');
      return;
    }


    if (isNegativeDisallowed) {
      setErrorText(
        `Adjustment would cause negative stock (${newStock} ${product.unit}). Your shop settings prohibit negative inventory.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText('');

      const { data, error } = await adjustStock({
        shop_id: currentShop.id,
        product_id: product.id,
        quantity_change: numChange,
        movement_type: movementType,
        notes: notes.trim() || undefined,
      });

      if (error || !data) {
        setErrorText(error?.message || 'Failed to adjust stock');
        return;
      }

      Alert.alert(
        'Stock Adjusted',
        `Stock for "${product.name}" updated successfully.\nPrevious: ${data.previous_stock} ${product.unit}\nNew: ${data.new_stock} ${product.unit}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      setErrorText(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading stock details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Stock Adjustment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Product Summary Card */}
        {product && (
          <Card style={styles.card}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.sku || product.barcode ? (
              <Text style={styles.productMeta}>
                {[product.sku ? `SKU: ${product.sku}` : null, product.barcode ? `Barcode: ${product.barcode}` : null]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            ) : null}

            <View style={styles.stockComparisonRow}>
              <View style={styles.stockBox}>
                <Text style={styles.stockBoxLabel}>Current Stock</Text>
                <Text style={styles.currentStockValue}>
                  {currentStock} <Text style={styles.unitText}>{product.unit}</Text>
                </Text>
              </View>

              <View style={styles.arrowBox}>
                {numChange > 0 ? (
                  <ArrowUpRight size={24} color={colors.success[600]} />
                ) : numChange < 0 ? (
                  <ArrowDownRight size={24} color={colors.danger[600]} />
                ) : (
                  <Sliders size={20} color={colors.neutral[400]} />
                )}
              </View>

              <View
                style={[
                  styles.stockBox,
                  isNegativeDisallowed
                    ? styles.stockBoxDanger
                    : numChange !== 0
                    ? styles.stockBoxActive
                    : null,
                ]}
              >
                <Text style={styles.stockBoxLabel}>Resulting Stock</Text>
                <Text
                  style={[
                    styles.newStockValue,
                    isNegativeDisallowed
                      ? styles.textDanger
                      : numChange > 0
                      ? styles.textSuccess
                      : numChange < 0
                      ? styles.textWarning
                      : null,
                  ]}
                >
                  {numChange !== 0 ? newStock : currentStock}{' '}
                  <Text style={styles.unitText}>{product.unit}</Text>
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Quantity Change Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Stock Quantity Change</Text>
          <Text style={styles.sectionSubtitle}>
            Enter positive amount to add stock, or negative amount to reduce stock.
          </Text>

          <Input
            placeholder="e.g. +10 or -5"
            value={quantityChange}
            onChangeText={handleManualChangeText}
            keyboardType="numbers-and-punctuation"
            style={styles.quantityInput}
            error={errorText}
          />

          {/* Quick Presets */}
          <Text style={styles.presetsTitle}>Quick Adjust Buttons</Text>
          <View style={styles.presetsGrid}>
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[
                  styles.presetChip,
                  preset.value > 0 ? styles.presetChipAdd : styles.presetChipSubtract,
                ]}
                onPress={() => handleApplyPreset(preset.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    preset.value > 0 ? styles.presetTextAdd : styles.presetTextSubtract,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Reason / Movement Type */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Adjustment Reason *</Text>

          <View style={styles.reasonsList}>
            {REASON_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reasonItem,
                  movementType === option.value && styles.reasonItemSelected,
                ]}
                onPress={() => setMovementType(option.value)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioCircle,
                    movementType === option.value && styles.radioCircleSelected,
                  ]}
                >
                  {movementType === option.value && <View style={styles.radioInner} />}
                </View>
                <View style={styles.reasonInfo}>
                  <Text
                    style={[
                      styles.reasonLabel,
                      movementType === option.value && styles.reasonLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.reasonDesc}>{option.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Additional Notes (Optional)"
            placeholder="e.g. Invoice #PO-9042 from distributor"
            value={notes}
            onChangeText={setNotes}
            containerStyle={{ marginTop: spacing.md }}
          />
        </Card>

        {/* Submit */}
        <View style={styles.submitContainer}>
          <Button
            title="Confirm Stock Adjustment"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={numChange === 0 || isNegativeDisallowed}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  card: {
    marginBottom: spacing.lg,
  },
  productName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  productMeta: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  stockComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  stockBox: {
    flex: 1,
    alignItems: 'center',
  },
  stockBoxActive: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
  },
  stockBoxDanger: {
    backgroundColor: colors.danger[50],
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
  },
  arrowBox: {
    paddingHorizontal: spacing.sm,
  },
  stockBoxLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
    marginBottom: 2,
  },
  currentStockValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  newStockValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  textSuccess: {
    color: colors.success[600],
  },
  textWarning: {
    color: colors.warning[600],
  },
  textDanger: {
    color: colors.danger[600],
  },
  unitText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.neutral[500],
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  quantityInput: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  presetsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    minWidth: 54,
    alignItems: 'center',
  },
  presetChipAdd: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[500],
  },
  presetChipSubtract: {
    backgroundColor: colors.danger[50],
    borderColor: colors.danger[500],
  },
  presetChipText: {
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  presetTextAdd: {
    color: colors.success[700],
  },
  presetTextSubtract: {
    color: colors.danger[700],
  },

  reasonsList: {
    gap: spacing.sm,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: '#ffffff',
  },
  reasonItemSelected: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[50],
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioCircleSelected: {
    borderColor: colors.primary[600],
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[600],
  },
  reasonInfo: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  reasonLabelSelected: {
    color: colors.primary[700],
  },
  reasonDesc: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  submitContainer: {
    marginTop: spacing.sm,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  Upload,
  Tag,
  DollarSign,
  AlertTriangle,
  Sliders,
  ScanBarcode,
} from 'lucide-react-native';
import { useShop } from '../../../../src/context/ShopContext';
import { fetchCategories } from '../../../../src/services/category';
import {
  fetchProductById,
  updateProduct,
} from '../../../../src/services/product';

import { uploadProductImage } from '../../../../src/services/storage';
import type { CategoryWithCount, Product } from '../../../../src/types/database';
import { Input } from '../../../../src/components/ui/Input';
import { Button } from '../../../../src/components/ui/Button';
import { Card } from '../../../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../../../src/constants/theme';

export default function EditProductScreen() {
  const router = useRouter();
  const { id, barcode: paramBarcode } = useLocalSearchParams<{ id: string; barcode?: string }>();
  const { currentShop, isOwner } = useShop();

  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [minimumStock, setMinimumStock] = useState('5');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Validation / submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentShop || !id) return;
    try {
      setIsLoading(true);
      const [categoriesRes, productRes] = await Promise.all([
        fetchCategories(currentShop.id),
        fetchProductById(currentShop.id, id, isOwner),
      ]);

      setCategories(categoriesRes.data);

      if (productRes.error || !productRes.data) {
        Alert.alert('Error', productRes.error?.message || 'Product not found', [
          { text: 'Back', onPress: () => router.back() },
        ]);
        return;
      }

      const p = productRes.data;
      setProduct(p);
      setName(p.name);
      setSku(p.sku || '');
      setBarcode(p.barcode || '');
      setBrand(p.brand || '');
      setSelectedCategoryId(p.category_id);
      setUnit(p.unit || 'pcs');
      setPurchasePrice(p.purchase_price.toString());
      setSellingPrice(p.selling_price.toString());
      setMinimumStock(p.minimum_stock.toString());
      setDescription(p.description || '');
      setIsActive(p.is_active);
      setExistingImageUrl(p.image_url);
    } finally {
      setIsLoading(false);
    }
  }, [currentShop, id, isOwner, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [prevParamBarcode, setPrevParamBarcode] = useState(paramBarcode);
  if (paramBarcode && paramBarcode !== prevParamBarcode) {
    setPrevParamBarcode(paramBarcode);
    setBarcode(paramBarcode);
  }

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to upload a product image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setLocalImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick image');
    }
  };

  const handleRemoveImage = () => {
    setLocalImageUri(null);
    setExistingImageUrl(null);
  };

  const handleToggleActive = (value: boolean) => {
    if (!value) {
      Alert.alert(
        'Deactivate Product',
        'Deactivating this product will hide it from normal sales and cashier screens. Historical sales records will remain preserved. Proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: () => setIsActive(false),
          },
        ]
      );
    } else {
      setIsActive(true);
    }
  };

  const handleSubmit = async () => {
    if (!currentShop || !id) return;
    if (!isOwner) {
      Alert.alert('Access Denied', 'Only shop owners can edit products.');
      return;
    }

    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!sellingPrice.trim() || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
      newErrors.sellingPrice = 'Enter a valid selling price';
    }
    if (!purchasePrice.trim() || isNaN(Number(purchasePrice)) || Number(purchasePrice) < 0) {
      newErrors.purchasePrice = 'Enter a valid purchase price';
    }
    if (!minimumStock.trim() || isNaN(Number(minimumStock)) || Number(minimumStock) < 0) {
      newErrors.minimumStock = 'Enter a valid minimum stock';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      let finalImageUrl = existingImageUrl;
      if (localImageUri) {
        const { url, error: uploadError } = await uploadProductImage(
          localImageUri,
          currentShop.id
        );
        if (uploadError) {
          console.warn('Image upload error:', uploadError.message);
        } else {
          finalImageUrl = url;
        }
      }

      const { error } = await updateProduct(currentShop.id, id, {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        brand: brand.trim() || null,
        category_id: selectedCategoryId,
        description: description.trim() || null,
        unit: unit.trim() || 'pcs',
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        minimum_stock: parseFloat(minimumStock) || 0,
        image_url: finalImageUrl,
        is_active: isActive,
      });

      if (error) {
        Alert.alert('Save Failed', error.message);
        return;
      }

      Alert.alert('Success', 'Product updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentDisplayImage = localImageUri || existingImageUrl;

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
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Stock Quick Info & Adjustment Shortcut */}
        {product && (
          <Card style={[styles.card, styles.stockBanner]}>
            <View style={styles.stockBannerRow}>
              <View>
                <Text style={styles.stockBannerTitle}>Current On-Hand Stock</Text>
                <Text style={styles.stockBannerQty}>
                  {product.current_stock} {product.unit}
                </Text>
              </View>
              {isOwner && (
                <Button
                  title="Adjust Stock"
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/products/adjust-stock/[id]',
                      params: { id: product.id },
                    })
                  }
                  variant="outline"
                  size="sm"
                  icon={<Sliders size={16} color={colors.primary[600]} />}
                />
              )}
            </View>
          </Card>
        )}

        {/* Product Image Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Product Image</Text>
          <View style={styles.imagePickerRow}>
            {currentDisplayImage ? (
              <Image source={{ uri: currentDisplayImage }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color={colors.neutral[400]} />
                <Text style={styles.placeholderText}>No photo</Text>
              </View>
            )}

            <View style={styles.imageActions}>
              <Button
                title={currentDisplayImage ? 'Change Photo' : 'Upload Photo'}
                onPress={handlePickImage}
                variant="outline"
                size="sm"
                icon={<Upload size={16} color={colors.primary[600]} />}
              />
              {currentDisplayImage && (
                <Button
                  title="Remove"
                  onPress={handleRemoveImage}
                  variant="ghost"
                  size="sm"
                  textStyle={{ color: colors.danger[600] }}
                />
              )}
            </View>
          </View>
        </Card>

        {/* Basic Info Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Input
            label="Product Name *"
            placeholder="e.g. Olpers Milk 1L"
            value={name}
            onChangeText={setName}
            error={errors.name}
            leftIcon={<Tag size={18} color={colors.neutral[400]} />}
          />

          <Input
            label="Brand"
            placeholder="e.g. Nestle, Unilever"
            value={brand}
            onChangeText={setBrand}
          />

          {/* Category Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPills}
            >
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  selectedCategoryId === null && styles.categoryPillSelected,
                ]}
                onPress={() => setSelectedCategoryId(null)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategoryId === null && styles.categoryPillTextSelected,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    selectedCategoryId === cat.id && styles.categoryPillSelected,
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      selectedCategoryId === cat.id && styles.categoryPillTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Input
                label="SKU"
                placeholder="e.g. BEV-001"
                value={sku}
                onChangeText={setSku}
              />
            </View>
            <View style={styles.halfCol}>
              <Input
                label="Barcode"
                placeholder="e.g. 896400123"
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="numeric"
                rightIcon={
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/products/scanner',
                        params: { mode: 'fill', returnTo: `/(tabs)/products/edit/${id}` },
                      })
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Scan barcode with camera"
                  >
                    <ScanBarcode size={20} color={colors.primary[600]} />
                  </TouchableOpacity>
                }
              />
            </View>
          </View>

          <Input
            label="Unit"
            placeholder="e.g. pcs, kg, pack"
            value={unit}
            onChangeText={setUnit}
          />
        </Card>

        {/* Pricing Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Pricing (PKR)</Text>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Input
                label="Selling Price *"
                placeholder="0.00"
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="decimal-pad"
                error={errors.sellingPrice}
                leftIcon={<DollarSign size={18} color={colors.primary[600]} />}
              />
            </View>
            <View style={styles.halfCol}>
              <Input
                label="Purchase Cost *"
                placeholder="0.00"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="decimal-pad"
                error={errors.purchasePrice}
                hint="Only visible to owner"
              />
            </View>
          </View>
        </Card>

        {/* Inventory Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Stock Alert</Text>

          <Input
            label="Low Stock Alert Threshold *"
            placeholder="5"
            value={minimumStock}
            onChangeText={setMinimumStock}
            keyboardType="numeric"
            error={errors.minimumStock}
            leftIcon={<AlertTriangle size={18} color={colors.warning[500]} />}
            hint="You will receive alerts when stock falls below this number"
          />
        </Card>

        {/* Additional Details & Active Switch */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Status & Notes</Text>

          <Input
            label="Description (Optional)"
            placeholder="Product notes"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ minHeight: 60 }}
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Active Product</Text>
              <Text style={styles.switchHint}>
                {isActive
                  ? 'Product is active and eligible for POS sales'
                  : 'Product is deactivated and hidden from cashier screens'}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: colors.neutral[300], true: colors.primary[600] }}
            />
          </View>
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title="Save Changes"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
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
    fontSize: typography.sizes.lg,
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
  stockBanner: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  stockBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockBannerTitle: {
    fontSize: typography.sizes.xs,
    color: colors.primary[800],
    fontWeight: typography.weights.medium,
  },
  stockBannerQty: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary[900],
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  imagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  placeholderText: {
    fontSize: typography.sizes.xs - 2,
    color: colors.neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
  imageActions: {
    flex: 1,
    gap: spacing.sm,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
    marginBottom: spacing.xs + 2,
  },
  categoryPills: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  categoryPillSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  categoryPillText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[700],
    fontWeight: typography.weights.medium,
  },
  categoryPillTextSelected: {
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  switchLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  switchHint: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
    maxWidth: 240,
  },
  submitContainer: {
    marginTop: spacing.md,
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

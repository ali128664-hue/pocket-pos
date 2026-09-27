import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  Upload,
  Tag,
  DollarSign,
  Package,
  AlertTriangle,
} from 'lucide-react-native';

import { useShop } from '../../../src/context/ShopContext';
import { fetchCategories } from '../../../src/services/category';
import { createProduct } from '../../../src/services/product';
import { uploadProductImage } from '../../../src/services/storage';
import type { CategoryWithCount } from '../../../src/types/database';
import { productSchema } from '../../../src/utils/validation';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../../src/constants/theme';

export default function AddProductScreen() {
  const router = useRouter();
  const { currentShop, isOwner } = useShop();

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
  const [currentStock, setCurrentStock] = useState('0');
  const [minimumStock, setMinimumStock] = useState('5');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  // Validation / submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentShop) {
      fetchCategories(currentShop.id).then(({ data }) => {
        setCategories(data);
      });
    }
  }, [currentShop]);

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
  };

  const handleSubmit = async () => {
    if (!currentShop) return;
    if (!isOwner) {
      Alert.alert('Access Denied', 'Only shop owners can create new products.');
      return;
    }

    setErrors({});

    const formData = {
      name,
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      brand: brand.trim() || undefined,
      categoryId: selectedCategoryId,
      description: description.trim() || undefined,
      unit: unit.trim() || 'pcs',
      purchasePrice: purchasePrice.trim(),
      sellingPrice: sellingPrice.trim(),
      currentStock: currentStock.trim(),
      minimumStock: minimumStock.trim(),
      imageUrl: localImageUri,
      isActive,
    };

    const validation = productSchema.safeParse(formData);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!newErrors[fieldName]) {
          newErrors[fieldName] = issue.message;
        }
      }
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      let finalImageUrl: string | null = null;
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

      const { error } = await createProduct(currentShop.id, {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        brand: brand.trim() || null,
        category_id: selectedCategoryId,
        description: description.trim() || null,
        unit: unit.trim() || 'pcs',
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        current_stock: parseFloat(currentStock) || 0,
        minimum_stock: parseFloat(minimumStock) || 0,
        image_url: finalImageUrl,
        is_active: isActive,
      });

      if (error) {
        Alert.alert('Save Failed', error.message);
        return;
      }

      Alert.alert('Success', `"${name.trim()}" has been added to your shop inventory.`, [
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
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Product Image Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Product Image</Text>
          <View style={styles.imagePickerRow}>
            {localImageUri ? (
              <Image source={{ uri: localImageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color={colors.neutral[400]} />
                <Text style={styles.placeholderText}>No photo selected</Text>
              </View>
            )}

            <View style={styles.imageActions}>
              <Button
                title={localImageUri ? 'Change Photo' : 'Upload Photo'}
                onPress={handlePickImage}
                variant="outline"
                size="sm"
                icon={<Upload size={16} color={colors.primary[600]} />}
              />
              {localImageUri && (
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
            placeholder="e.g. Olpers Milk 1L, Tapal Tea 400g"
            value={name}
            onChangeText={setName}
            error={errors.name}
            leftIcon={<Tag size={18} color={colors.neutral[400]} />}
          />

          <Input
            label="Brand"
            placeholder="e.g. Nestle, Unilever, National"
            value={brand}
            onChangeText={setBrand}
            error={errors.brand}
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
                error={errors.sku}
              />
            </View>
            <View style={styles.halfCol}>
              <Input
                label="Barcode"
                placeholder="e.g. 896400123"
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="numeric"
                error={errors.barcode}
              />
            </View>
          </View>

          <Input
            label="Unit"
            placeholder="e.g. pcs, kg, pack, bottle"
            value={unit}
            onChangeText={setUnit}
            error={errors.unit}
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
          <Text style={styles.sectionTitle}>Stock & Inventory</Text>

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Input
                label="Current Stock *"
                placeholder="0"
                value={currentStock}
                onChangeText={setCurrentStock}
                keyboardType="numeric"
                error={errors.currentStock}
                leftIcon={<Package size={18} color={colors.neutral[400]} />}
              />
            </View>
            <View style={styles.halfCol}>
              <Input
                label="Low Stock Alert *"
                placeholder="5"
                value={minimumStock}
                onChangeText={setMinimumStock}
                keyboardType="numeric"
                error={errors.minimumStock}
                leftIcon={<AlertTriangle size={18} color={colors.warning[500]} />}
              />
            </View>
          </View>
        </Card>

        {/* Additional Details Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Details & Visibility</Text>

          <Input
            label="Description (Optional)"
            placeholder="Product specifications, notes, or storage details"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ minHeight: 60 }}
            error={errors.description}
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Active Product</Text>
              <Text style={styles.switchHint}>
                Active products can be sold at the POS counter
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.neutral[300], true: colors.primary[600] }}
            />
          </View>
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title="Save Product"
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
  },
  submitContainer: {
    marginTop: spacing.md,
  },
});

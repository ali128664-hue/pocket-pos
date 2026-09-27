import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Layers,
  FolderOpen,
  Search,
} from 'lucide-react-native';
import { useShop } from '../../../src/context/ShopContext';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../src/services/category';
import type { CategoryWithCount } from '../../../src/types/database';
import { categorySchema } from '../../../src/utils/validation';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../../src/constants/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const { currentShop, isOwner } = useShop();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!currentShop) return;
    try {
      const { data, error } = await fetchCategories(currentShop.id);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setCategories(data);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentShop]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCategories();
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDesc('');
    setModalError('');
    setIsModalVisible(true);
  };

  const handleOpenEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDesc(category.description || '');
    setModalError('');
    setIsModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!currentShop) return;

    // Validate
    const validation = categorySchema.safeParse({
      name: categoryName,
      description: categoryDesc,
    });

    if (!validation.success) {
      setModalError(validation.error.issues[0]?.message || 'Invalid category data');
      return;
    }


    try {
      setIsSubmitting(true);
      setModalError('');

      if (editingCategory) {
        const { error } = await updateCategory(currentShop.id, editingCategory.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim() || null,
        });

        if (error) {
          setModalError(error.message);
          return;
        }
      } else {
        const { error } = await createCategory(currentShop.id, {
          name: categoryName.trim(),
          description: categoryDesc.trim() || null,
        });

        if (error) {
          setModalError(error.message);
          return;
        }
      }

      setIsModalVisible(false);
      loadCategories();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (category: CategoryWithCount) => {
    if (!currentShop) return;

    if (category.product_count > 0) {
      Alert.alert(
        'Cannot Delete Category',
        `"${category.name}" has ${category.product_count} active product(s) assigned to it. Please reassign or delete those products before removing this category.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await deleteCategory(currentShop.id, category.id);
            if (!success || error) {
              Alert.alert('Error', error?.message || 'Failed to delete category');
            } else {
              loadCategories();
            }
          },
        },
      ]
    );
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        {isOwner ? (
          <TouchableOpacity
            onPress={handleOpenAdd}
            style={styles.addButton}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Search size={18} color={colors.neutral[400]} />}
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Categories List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FolderOpen size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No categories found' : 'No Categories Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try searching with a different keyword.'
                  : 'Create categories to neatly organize your products and inventory.'}
              </Text>
              {isOwner && !searchQuery && (
                <Button
                  title="Create First Category"
                  onPress={handleOpenAdd}
                  variant="primary"
                  style={styles.emptyButton}
                />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.categoryCard}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryIconContainer}>
                  <Layers size={22} color={colors.primary[600]} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.categoryDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {item.product_count} {item.product_count === 1 ? 'Product' : 'Products'}
                    </Text>
                  </View>
                </View>

                {isOwner && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(item)}
                      style={styles.iconAction}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={18} color={colors.neutral[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={[styles.iconAction, styles.deleteAction]}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color={colors.danger[600]} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          )}
        />
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </Text>

            {modalError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{modalError}</Text>
              </View>
            ) : null}

            <Input
              label="Category Name *"
              placeholder="e.g. Beverages, Dairy, Snacks"
              value={categoryName}
              onChangeText={setCategoryName}
              autoCapitalize="words"
            />

            <Input
              label="Description (Optional)"
              placeholder="Brief description of items in this category"
              value={categoryDesc}
              onChangeText={setCategoryDesc}
              multiline
              numberOfLines={3}
              style={{ minHeight: 60 }}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsModalVisible(false)}
                style={styles.modalButton}
                disabled={isSubmitting}
              />
              <Button
                title={editingCategory ? 'Update' : 'Create'}
                variant="primary"
                onPress={handleSaveCategory}
                style={styles.modalButton}
                isLoading={isSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  searchInput: {
    marginBottom: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  categoryCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  countText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  iconAction: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
  },
  deleteAction: {
    backgroundColor: colors.danger[50],
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 1.5,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    minWidth: 180,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    backgroundColor: colors.danger[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger[100],
  },
  errorBannerText: {
    color: colors.danger[700],
    fontSize: typography.sizes.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

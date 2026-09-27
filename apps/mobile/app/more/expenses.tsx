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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Tag,
  X,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react-native';

import { useShop } from '../../src/context/ShopContext';
import { useAuth } from '../../src/context/AuthContext';
import {
  fetchExpenses,
  createExpense,
  deleteExpense,
  fetchExpenseSummary,
  EXPENSE_CATEGORIES,
} from '../../src/services/expense';
import type { Expense } from '../../src/types/database';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function ExpensesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentShop, isOwner } = useShop();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalMonthExpense, setTotalMonthExpense] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(isOwner);

  // Add Expense Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryInput, setCategoryInput] = useState<string>('UTILITIES');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadExpensesData = useCallback(async () => {
    if (!currentShop) return;
    try {
      setIsLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        fetchExpenses({
          shopId: currentShop.id,
          category: selectedCategory,
        }),
        fetchExpenseSummary(currentShop.id),
      ]);

      if (listRes.data) {
        setExpenses(listRes.data);
      }
      if (summaryRes.data) {
        setTotalMonthExpense(summaryRes.data.totalAmount);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentShop, selectedCategory]);

  useEffect(() => {
    if (isOwner) {
      loadExpensesData();
    }
  }, [loadExpensesData, isOwner]);

  const handleCreateExpense = async () => {
    if (!currentShop || !user) return;
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setCreateError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      setCreateError('');
      const { data, error } = await createExpense({
        shopId: currentShop.id,
        category: categoryInput,
        amount,
        note: noteInput.trim() || null,
        loggedBy: user.id,
      });

      if (error || !data) {
        setCreateError(error?.message || 'Could not record expense');
        return;
      }

      setModalVisible(false);
      setAmountInput('');
      setNoteInput('');
      loadExpensesData();
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = (expense: Expense) => {
    if (!currentShop) return;
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this ${expense.category} expense of Rs. ${expense.amount.toLocaleString('en-PK')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteExpense(currentShop.id, expense.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              loadExpensesData();
            }
          },
        },
      ]
    );
  };

  const formatPrice = (val: number) => `Rs. ${val.toLocaleString('en-PK')}`;

  // Cashier Role Protection Guard
  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Expenses</Text>
        </View>
        <View style={styles.restrictedContainer}>
          <ShieldAlert size={56} color={colors.danger[500]} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedDesc}>
            Only the shop OWNER can access or record operating expenses and financial metrics.
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
          <Text style={styles.appBarTitle}>Expense Management</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setCreateError('');
              setModalVisible(true);
            }}
          >
            <Plus size={18} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Total Expense Hero Card */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>TOTAL RECORDED EXPENSES</Text>
          <Text style={styles.heroAmount}>{formatPrice(totalMonthExpense)}</Text>
          <Text style={styles.heroSubtext}>All-time recorded store expenditures</Text>
        </Card>

        {/* Category Filters */}
        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {['ALL', ...EXPENSE_CATEGORIES].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  selectedCategory === cat && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === cat && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Expense List */}
        {isLoading && expenses.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card style={styles.expenseCard}>
                <View style={styles.expenseRow}>
                  <View style={styles.categoryBadge}>
                    <Tag size={14} color={colors.primary[600]} style={{ marginRight: 4 }} />
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{formatPrice(item.amount)}</Text>
                </View>

                {item.note && <Text style={styles.expenseNote}>{item.note}</Text>}

                <View style={styles.expenseFooter}>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={colors.neutral[400]} style={{ marginRight: 4 }} />
                    <Text style={styles.expenseDate}>
                      {new Date(item.created_at).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteExpense(item)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color={colors.danger[500]} />
                  </TouchableOpacity>
                </View>
              </Card>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <DollarSign size={44} color={colors.neutral[300]} />
                <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedCategory !== 'ALL'
                    ? `No expenses found for category "${selectedCategory}"`
                    : 'Track rent, utilities, and daily shop running costs easily.'}
                </Text>
              </View>
            }
          />
        )}

        {/* Add Expense Modal */}
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
                <Text style={styles.modalTitle}>Record New Expense</Text>
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
                <Text style={styles.fieldLabel}>Expense Category *</Text>
                <View style={styles.categorySelectGrid}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catSelectBtn,
                        categoryInput === cat && styles.catSelectBtnActive,
                      ]}
                      onPress={() => setCategoryInput(cat)}
                    >
                      <Text
                        style={[
                          styles.catSelectBtnText,
                          categoryInput === cat && styles.catSelectBtnTextActive,
                        ]}
                      >
                        {cat.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Amount (PKR) *</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={amountInput}
                  onChangeText={setAmountInput}
                />

                <Text style={styles.fieldLabel}>Description / Notes</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="e.g. Electric bill for current month"
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  value={noteInput}
                  onChangeText={setNoteInput}
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
                  title="Save Expense"
                  onPress={handleCreateExpense}
                  isLoading={isSubmitting}
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
  heroCard: {
    margin: spacing.md,
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.neutral[500],
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.danger[600],
    marginVertical: spacing.xs,
  },
  heroSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  categoriesSection: {
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  categoryPillActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  categoryPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
  },
  expenseAmount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.danger[600],
  },
  expenseNote: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[700],
    marginVertical: spacing.xs,
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  deleteBtn: {
    padding: spacing.xs,
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
  categorySelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  catSelectBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
  },
  catSelectBtnActive: {
    backgroundColor: colors.primary[600],
  },
  catSelectBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
  catSelectBtnTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
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
    marginBottom: spacing.sm,
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

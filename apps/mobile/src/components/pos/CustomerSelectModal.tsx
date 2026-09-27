import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Search,
  User,
  UserPlus,
  X,
  Check,
  Phone,
  AlertCircle,
} from 'lucide-react-native';

import { useShop } from '../../context/ShopContext';
import { fetchCustomers, createCustomer } from '../../services/customer';
import type { Customer } from '../../types/database';
import { Button } from '../ui/Button';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface CustomerSelectModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  visible,
  onClose,
  selectedCustomer,
  onSelectCustomer,
}) => {
  const { currentShop } = useShop();

  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset form inputs when modal becomes visible
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setActiveTab('search');
      setSearchQuery('');
      setNewName('');
      setNewPhone('');
      setCreateError('');
    }
  }

  const loadCustomers = useCallback(
    async (query = '') => {
      if (!currentShop) return;
      try {
        setIsLoading(true);
        const { data } = await fetchCustomers(currentShop.id, query);
        setCustomers(data);
      } finally {
        setIsLoading(false);
      }
    },
    [currentShop]
  );

  useEffect(() => {
    if (visible) {
      loadCustomers('');
    }
  }, [visible, loadCustomers]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    loadCustomers(text);
  };

  const handleSelect = (customer: Customer | null) => {
    onSelectCustomer(customer);
    onClose();
  };

  const handleCreateCustomer = async () => {
    if (!currentShop) return;

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setCreateError('Customer name is required');
      return;
    }

    const trimmedPhone = newPhone.trim();
    if (trimmedPhone && trimmedPhone.length < 7) {
      setCreateError('Please enter a valid phone number');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError('');
      const { data, error } = await createCustomer(currentShop.id, {
        name: trimmedName,
        phone: trimmedPhone || null,
      });

      if (error || !data) {
        setCreateError(error?.message || 'Could not create customer');
        return;
      }

      // Automatically select newly created customer
      onSelectCustomer(data);
      onClose();
    } finally {
      setIsCreating(false);
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
            <Text style={styles.title}>Select Customer</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.neutral[500]} />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'search' && styles.tabButtonActive]}
              onPress={() => setActiveTab('search')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'search' && styles.tabButtonTextActive]}
              >
                Search Existing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
              onPress={() => setActiveTab('create')}
              activeOpacity={0.8}
            >
              <UserPlus size={16} color={activeTab === 'create' ? colors.primary[600] : colors.neutral[500]} style={{ marginRight: 6 }} />
              <Text
                style={[styles.tabButtonText, activeTab === 'create' && styles.tabButtonTextActive]}
              >
                New Customer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content: Search Tab */}
          {activeTab === 'search' && (
            <View style={{ flex: 1 }}>
              {/* Search Input */}
              <View style={styles.searchBar}>
                <Search size={18} color={colors.neutral[400]} style={{ marginRight: spacing.sm }} />
                <TextInput
                  placeholder="Search by name or phone..."
                  placeholderTextColor={colors.neutral[400]}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  style={styles.searchInput}
                  autoCorrect={false}
                />
              </View>

              {/* Walk-in Customer Option */}
              <TouchableOpacity
                style={[
                  styles.customerItem,
                  selectedCustomer === null && styles.customerItemSelected,
                ]}
                onPress={() => handleSelect(null)}
                activeOpacity={0.7}
              >
                <View style={styles.customerIconWrapper}>
                  <User size={20} color={colors.primary[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>Walk-in Customer</Text>
                  <Text style={styles.customerSubtext}>Standard retail sale without ledger</Text>
                </View>
                {selectedCustomer === null && <Check size={20} color={colors.primary[600]} />}
              </TouchableOpacity>

              {/* Customers List */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                </View>
              ) : (
                <FlatList
                  data={customers}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = selectedCustomer?.id === item.id;
                    const hasUdhaar = item.outstanding_balance > 0;
                    return (
                      <TouchableOpacity
                        style={[styles.customerItem, isSelected && styles.customerItemSelected]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.customerIconWrapper, hasUdhaar && styles.customerIconWrapperWarning]}>
                          <User size={20} color={hasUdhaar ? colors.warning[600] : colors.neutral[600]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.customerName}>{item.name}</Text>
                          {item.phone ? (
                            <View style={styles.phoneRow}>
                              <Phone size={12} color={colors.neutral[400]} style={{ marginRight: 4 }} />
                              <Text style={styles.customerPhone}>{item.phone}</Text>
                            </View>
                          ) : null}
                        </View>
                        {hasUdhaar ? (
                          <View style={styles.balanceBadge}>
                            <Text style={styles.balanceBadgeLabel}>Udhaar</Text>
                            <Text style={styles.balanceBadgeValue}>
                              Rs. {item.outstanding_balance.toLocaleString('en-PK')}
                            </Text>
                          </View>
                        ) : null}
                        {isSelected && (
                          <Check size={20} color={colors.primary[600]} style={{ marginLeft: 8 }} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No customers found</Text>
                      <TouchableOpacity
                        style={styles.quickAddLink}
                        onPress={() => setActiveTab('create')}
                      >
                        <Text style={styles.quickAddLinkText}>+ Add &quot;{searchQuery}&quot; as a new customer</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              )}
            </View>
          )}

          {/* Content: Create New Customer Tab */}
          {activeTab === 'create' && (
            <View style={styles.createForm}>
              <Text style={styles.fieldLabel}>Customer Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Muhammad Ali"
                placeholderTextColor={colors.neutral[400]}
                value={newName}
                onChangeText={(text) => {
                  setNewName(text);
                  if (createError) setCreateError('');
                }}
                autoFocus
              />

              <Text style={styles.fieldLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 03001234567"
                placeholderTextColor={colors.neutral[400]}
                value={newPhone}
                onChangeText={(text) => {
                  setNewPhone(text);
                  if (createError) setCreateError('');
                }}
                keyboardType="phone-pad"
              />

              {createError ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color={colors.danger[600]} style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{createError}</Text>
                </View>
              ) : null}

              <Button
                title={isCreating ? 'Saving Customer...' : 'Save & Select Customer'}
                onPress={handleCreateCustomer}
                isLoading={isCreating}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
  },
  tabButtonTextActive: {
    color: colors.primary[700],
    fontWeight: typography.weights.semibold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.neutral[900],
    paddingVertical: spacing.xs,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
    borderRadius: borderRadius.md,
  },
  customerItemSelected: {
    backgroundColor: colors.primary[50],
  },
  customerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  customerIconWrapperWarning: {
    backgroundColor: colors.warning[50],
  },
  customerName: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
  },
  customerSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
  },
  balanceBadge: {
    alignItems: 'flex-end',
    backgroundColor: colors.warning[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  balanceBadgeLabel: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.warning[600],
  },
  balanceBadgeValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.warning[600],
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
  },
  quickAddLink: {
    paddingVertical: spacing.xs,
  },
  quickAddLinkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary[600],
  },
  createForm: {
    paddingTop: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.neutral[900],
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger[600],
    flex: 1,
  },
});

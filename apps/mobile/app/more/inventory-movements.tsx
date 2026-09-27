import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Layers,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  AlertOctagon,
  Wrench,
} from 'lucide-react-native';

import { useShop } from '../../src/context/ShopContext';
import {
  fetchInventoryMovements,
  type InventoryMovementListItem,
} from '../../src/services/inventory';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

const MOVEMENT_TYPES = [
  'ALL',
  'SALE',
  'PURCHASE_RECEIPT',
  'MANUAL_CORRECTION',
  'DAMAGED_EXPIRED',
  'RETURN',
];

export default function InventoryMovementsScreen() {
  const router = useRouter();
  const { currentShop } = useShop();

  const [movements, setMovements] = useState<InventoryMovementListItem[]>([]);
  const [selectedType, setSelectedType] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadMovements = useCallback(async () => {
    if (!currentShop) return;
    try {
      setIsLoading(true);
      const { data } = await fetchInventoryMovements({
        shopId: currentShop.id,
        movementType: selectedType,
      });
      if (data) {
        setMovements(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentShop, selectedType]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'SALE':
        return <ArrowDownLeft size={16} color={colors.danger[600]} />;
      case 'PURCHASE_RECEIPT':
        return <ArrowUpRight size={16} color={colors.success[700]} />;
      case 'DAMAGED_EXPIRED':
        return <AlertOctagon size={16} color={colors.warning[600]} />;
      case 'RETURN':
        return <RotateCcw size={16} color={colors.primary[600]} />;
      default:
        return <Wrench size={16} color={colors.neutral[600]} />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'SALE':
        return { bg: colors.danger[50], text: colors.danger[600] };
      case 'PURCHASE_RECEIPT':
        return { bg: colors.success[50], text: colors.success[700] };
      case 'DAMAGED_EXPIRED':
        return { bg: colors.warning[50], text: colors.warning[600] };
      case 'RETURN':
        return { bg: colors.primary[50], text: colors.primary[700] };
      default:
        return { bg: colors.neutral[100], text: colors.neutral[700] };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Stock Movement Audit</Text>
        </View>

        {/* Movement Type Filter */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {MOVEMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterPill,
                  selectedType === type && styles.filterPillActive,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    selectedType === type && styles.filterPillTextActive,
                  ]}
                >
                  {type.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Movements List */}
        {isLoading && movements.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
            <Text style={styles.loadingText}>Loading stock audit trail...</Text>
          </View>
        ) : (
          <FlatList
            data={movements}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const badge = getBadgeStyle(item.movement_type);
              return (
                <Card style={styles.movementCard}>
                  <View style={styles.movementHeader}>
                    <View style={styles.productLeft}>
                      <View style={[styles.typeIconBox, { backgroundColor: badge.bg }]}>
                        {getMovementIcon(item.movement_type)}
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.productName}>{item.product_name}</Text>
                        <Text style={styles.productSku}>
                          SKU: {item.product_sku || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                        {item.movement_type.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.qtyRow}>
                    <Text style={styles.stockShiftText}>
                      Stock: {item.stock_before} → {item.stock_after} {item.product_unit}
                    </Text>
                    <Text
                      style={[
                        styles.qtyDelta,
                        item.quantity >= 0 ? styles.posDelta : styles.negDelta,
                      ]}
                    >
                      {item.quantity > 0 ? '+' : ''}
                      {item.quantity} {item.product_unit}
                    </Text>
                  </View>

                  {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}

                  <View style={styles.timestampRow}>
                    <Calendar size={12} color={colors.neutral[400]} style={{ marginRight: 4 }} />
                    <Text style={styles.timestampText}>
                      {new Date(item.created_at).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Layers size={44} color={colors.neutral[300]} />
                <Text style={styles.emptyTitle}>No Stock Movements Recorded</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedType !== 'ALL'
                    ? `No movements found of type "${selectedType}"`
                    : 'Sales, restocks, and corrections will automatically appear here.'}
                </Text>
              </View>
            }
          />
        )}
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  filterPillActive: {
    backgroundColor: colors.primary[600],
  },
  filterPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  movementCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  productLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  typeIconBox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  productSku: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 1,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  stockShiftText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[600],
  },
  qtyDelta: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  posDelta: {
    color: colors.success[700],
  },
  negDelta: {
    color: colors.danger[600],
  },
  notesText: {
    fontSize: 11,
    color: colors.neutral[600],
    fontStyle: 'italic',
    marginTop: 2,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  timestampText: {
    fontSize: 10,
    color: colors.neutral[400],
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
});

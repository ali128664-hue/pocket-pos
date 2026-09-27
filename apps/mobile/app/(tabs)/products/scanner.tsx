import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Image,
  Vibration,
  ActivityIndicator,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import {
  ArrowLeft,
  Zap,
  ZapOff,
  Keyboard,
  Package,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit,
  PlusCircle,
  Sliders,
} from 'lucide-react-native';

import { useShop } from '../../../src/context/ShopContext';
import { lookupProductByBarcode } from '../../../src/services/product';
import type { Product } from '../../../src/types/database';
import { normalizeBarcode, formatBarcodeDisplay, validateBarcode } from '../../../src/utils/barcode';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);
const SCAN_BOX_HEIGHT = 180;

type ScanResultState =
  | { type: 'idle' }
  | { type: 'loading'; barcode: string }
  | { type: 'found'; barcode: string; product: Product & { category_name?: string | null } }
  | { type: 'not_found'; barcode: string };

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: 'lookup' | 'fill'; returnTo?: string }>();
  const mode = params.mode || 'lookup';
  const returnTo = params.returnTo;

  const { currentShop, isOwner } = useShop();
  const [permission, requestPermission] = useCameraPermissions();

  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultState>({ type: 'idle' });
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');

  // Lock to avoid multi-firing scans
  const isLockedRef = useRef(false);

  // Request permissions if not granted
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const unlockScanner = useCallback(() => {
    setScanResult({ type: 'idle' });
    setTimeout(() => {
      isLockedRef.current = false;
    }, 400);
  }, []);

  const handleBarcodeProcessed = useCallback(
    async (rawCode: string) => {
      const cleanBarcode = normalizeBarcode(rawCode);
      if (!cleanBarcode) return;

      // Provide haptic feedback
      try {
        Vibration.vibrate(Platform.OS === 'android' ? 60 : [0, 60]);
      } catch {
        // Ignore vibration errors on web or unsupported devices
      }

      // If in 'fill' mode, immediately return the barcode back to the calling screen
      if (mode === 'fill') {
        const destination = returnTo || '/(tabs)/products/add';
        router.replace({
          pathname: destination as any,
          params: { barcode: cleanBarcode },
        });
        return;
      }

      // In 'lookup' mode, fetch the product from the current shop
      if (!currentShop) return;

      setScanResult({ type: 'loading', barcode: cleanBarcode });

      try {
        const { data, error } = await lookupProductByBarcode(
          currentShop.id,
          cleanBarcode,
          isOwner
        );

        if (error) {
          setScanResult({ type: 'not_found', barcode: cleanBarcode });
          return;
        }

        if (data) {
          setScanResult({
            type: 'found',
            barcode: cleanBarcode,
            product: data,
          });
        } else {
          setScanResult({
            type: 'not_found',
            barcode: cleanBarcode,
          });
        }
      } catch {
        setScanResult({ type: 'not_found', barcode: cleanBarcode });
      }
    },
    [mode, returnTo, router, currentShop, isOwner]
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (isLockedRef.current || !data) return;
      isLockedRef.current = true;
      handleBarcodeProcessed(data);
    },
    [handleBarcodeProcessed]
  );

  const handleManualSubmit = () => {
    const validation = validateBarcode(manualInput);
    if (!validation.isValid) {
      setManualError(validation.error || 'Invalid barcode');
      return;
    }
    setManualError('');
    setManualModalVisible(false);
    isLockedRef.current = true;
    handleBarcodeProcessed(validation.normalized);
    setManualInput('');
  };

  const formatPrice = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // 1. Permission Checking / Loading State
  if (!permission) {
    return (
      <SafeAreaView style={styles.darkContainer}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[400]} />
          <Text style={styles.loadingText}>Initializing camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Permission Denied / Blocked State
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.darkContainer}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrapper}>
            <AlertCircle size={48} color={colors.warning[500]} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            PocketPOS needs access to your device camera to scan product barcodes and update your
            inventory instantly.
          </Text>

          {permission.canAskAgain ? (
            <Button
              title="Grant Camera Access"
              onPress={requestPermission}
              style={styles.permissionButton}
            />
          ) : (
            <Button
              title="Open Device Settings"
              onPress={() => Linking.openSettings()}
              style={styles.permissionButton}
              variant="outline"
            />
          )}

          <TouchableOpacity
            style={styles.manualEntryFallbackButton}
            onPress={() => {
              setManualError('');
              setManualInput('');
              setManualModalVisible(true);
            }}
          >
            <Keyboard size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.manualEntryFallbackText}>Enter Barcode Manually</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.goBackTextButton} onPress={() => router.back()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Barcode Input Modal (Also available when camera denied) */}
        <Modal
          visible={manualModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setManualModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Barcode Manually</Text>
                <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                  <X size={22} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtext}>
                Type the barcode numbers printed under the product barcode stripes.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 8964001234567"
                placeholderTextColor={colors.neutral[400]}
                value={manualInput}
                onChangeText={(text) => {
                  setManualInput(text);
                  if (manualError) setManualError('');
                }}
                keyboardType="numeric"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleManualSubmit}
              />
              {manualError ? <Text style={styles.modalError}>{manualError}</Text> : null}
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setManualModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Look Up"
                  onPress={handleManualSubmit}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // 3. Main Scanner Screen with Live Camera
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'itf14',
            'qr',
          ],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Target Reticle / Dark Mask Overlay */}
      <SafeAreaView style={styles.overlayContainer}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={22} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.scannerTitle}>
              {mode === 'fill' ? 'Scan to Select Barcode' : 'Scan Product Barcode'}
            </Text>
            <Text style={styles.scannerSubtitle}>Align barcode inside the frame</Text>
          </View>

          <TouchableOpacity
            style={[styles.circleButton, torchEnabled && styles.circleButtonActive]}
            onPress={() => setTorchEnabled((prev) => !prev)}
            activeOpacity={0.8}
          >
            {torchEnabled ? <ZapOff size={20} color="#ffffff" /> : <Zap size={20} color="#ffffff" />}
          </TouchableOpacity>
        </View>

        {/* Viewfinder Cutout Area */}
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinderBox}>
            {/* Viewfinder 4 Corner Reticle Marks */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Red Scanning Indicator Line */}
            <View style={styles.scanLine} />
          </View>
        </View>

        {/* Bottom Control Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => {
              setManualError('');
              setManualInput('');
              setManualModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Keyboard size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.manualEntryText}>Type Barcode Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Manual Barcode Input Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Barcode Manually</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <X size={22} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtext}>
              Type the numbers printed under the product barcode stripes.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 8964001234567"
              placeholderTextColor={colors.neutral[400]}
              value={manualInput}
              onChangeText={(text) => {
                setManualInput(text);
                if (manualError) setManualError('');
              }}
              keyboardType="numeric"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
            />
            {manualError ? <Text style={styles.modalError}>{manualError}</Text> : null}
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setManualModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Look Up"
                onPress={handleManualSubmit}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Modal while database lookup executes */}
      {scanResult.type === 'loading' && (
        <View style={styles.resultOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.lookupText}>Looking up product...</Text>
            <Text style={styles.lookupBarcodeText}>
              Barcode: {formatBarcodeDisplay(scanResult.barcode)}
            </Text>
          </View>
        </View>
      )}

      {/* Product Found Result Modal */}
      {scanResult.type === 'found' && (
        <View style={styles.resultOverlay}>
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <View style={styles.successIconBadge}>
                  <CheckCircle2 size={18} color={colors.success[600]} />
                </View>
                <Text style={styles.resultHeaderTitle}>Product Found</Text>
              </View>
              <TouchableOpacity onPress={unlockScanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.productDetailsRow}>
              {scanResult.product.image_url ? (
                <Image
                  source={{ uri: scanResult.product.image_url }}
                  style={styles.productThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.productThumbnailPlaceholder}>
                  <Package size={28} color={colors.neutral[400]} />
                </View>
              )}

              <View style={styles.productDetailsTextCol}>
                <Text style={styles.productName} numberOfLines={2}>
                  {scanResult.product.name}
                </Text>
                {scanResult.product.category_name && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {scanResult.product.category_name}
                    </Text>
                  </View>
                )}
                <Text style={styles.productBarcode}>
                  Barcode: {formatBarcodeDisplay(scanResult.barcode)}
                </Text>
                {scanResult.product.sku ? (
                  <Text style={styles.productSku}>SKU: {scanResult.product.sku}</Text>
                ) : null}
              </View>
            </View>

            {/* Price & Stock Information */}
            <View style={styles.priceStockRow}>
              <View style={styles.priceCol}>
                <Text style={styles.priceLabel}>Selling Price</Text>
                <Text style={styles.priceValue}>
                  {formatPrice(scanResult.product.selling_price)}
                </Text>
              </View>

              <View style={styles.stockCol}>
                <Text style={styles.priceLabel}>Stock on Hand</Text>
                <View style={styles.stockStatusBadge}>
                  <Text style={styles.stockValueText}>
                    {scanResult.product.current_stock} {scanResult.product.unit || 'pcs'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Database-Protected Purchase Price for OWNER ONLY */}
            {isOwner && (
              <View style={styles.ownerCostBox}>
                <Text style={styles.ownerCostLabel}>Cost (Owner View Only):</Text>
                <Text style={styles.ownerCostValue}>
                  {formatPrice(scanResult.product.purchase_price)}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              <Button
                title="Scan Next"
                onPress={unlockScanner}
                style={styles.scanNextButton}
              />

              {isOwner && (
                <View style={styles.ownerActionsRow}>
                  <TouchableOpacity
                    style={styles.actionOutlineBtn}
                    onPress={() => {
                      const id = scanResult.product.id;
                      unlockScanner();
                      router.push(`/(tabs)/products/edit/${id}` as any);
                    }}
                  >
                    <Edit size={16} color={colors.primary[600]} style={{ marginRight: 6 }} />
                    <Text style={styles.actionOutlineBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionOutlineBtn}
                    onPress={() => {
                      const id = scanResult.product.id;
                      unlockScanner();
                      router.push(`/(tabs)/products/adjust-stock/${id}` as any);
                    }}
                  >
                    <Sliders size={16} color={colors.primary[600]} style={{ marginRight: 6 }} />
                    <Text style={styles.actionOutlineBtnText}>Adjust Stock</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card>
        </View>
      )}

      {/* Product Not Found Modal */}
      {scanResult.type === 'not_found' && (
        <View style={styles.resultOverlay}>
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <View style={styles.notFoundIconBadge}>
                  <AlertTriangle size={18} color={colors.warning[600]} />
                </View>
                <Text style={styles.resultHeaderTitle}>Product Not Found</Text>
              </View>
              <TouchableOpacity onPress={unlockScanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <View style={styles.notFoundBody}>
              <Text style={styles.notFoundBarcodeHeading}>Scanned Barcode</Text>
              <View style={styles.barcodeDisplayBox}>
                <Text style={styles.barcodeDisplayText}>
                  {formatBarcodeDisplay(scanResult.barcode)}
                </Text>
              </View>
              <Text style={styles.notFoundDesc}>
                No product with this barcode exists in your inventory.
              </Text>
            </View>

            <View style={styles.resultActions}>
              {isOwner ? (
                <Button
                  title="Add This Product"
                  onPress={() => {
                    const code = scanResult.barcode;
                    unlockScanner();
                    router.push({
                      pathname: '/(tabs)/products/add',
                      params: { barcode: code },
                    });
                  }}
                  icon={<PlusCircle size={18} color="#ffffff" />}
                  style={styles.scanNextButton}
                />
              ) : null}

              <Button
                title="Scan Again"
                variant={isOwner ? 'outline' : 'primary'}
                onPress={unlockScanner}
                style={{ marginTop: 8 }}
              />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  darkContainer: {
    flex: 1,
    backgroundColor: colors.neutral[900],
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  centerContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.neutral[300],
    marginTop: spacing.md,
  },
  permissionContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    maxWidth: 380,
  },
  permissionIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  permissionDesc: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.neutral[300],
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  manualEntryFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    marginBottom: spacing.md,
  },
  manualEntryFallbackText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: '#ffffff',
  },
  goBackTextButton: {
    paddingVertical: spacing.sm,
  },
  goBackText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.neutral[400],
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : spacing.xs,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleButtonActive: {
    backgroundColor: colors.primary[600],
  },
  titleContainer: {
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#ffffff',
  },
  scannerSubtitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.neutral[300],
    marginTop: 2,
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: SCAN_BOX_WIDTH,
    height: SCAN_BOX_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#22c55e', // Green scanner guide
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    height: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    width: '90%',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  manualEntryText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  modalSubtext: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.neutral[600],
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.neutral[900],
    backgroundColor: colors.neutral[50],
    marginBottom: spacing.xs,
  },
  modalError: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.danger[600],
    marginBottom: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  lookupText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
    marginTop: spacing.md,
  },
  lookupBarcodeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.neutral[500],
    marginTop: 4,
  },
  resultCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
    backgroundColor: '#ffffff',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  notFoundIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warning[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  resultHeaderTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  productDetailsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  productThumbnail: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    marginRight: spacing.md,
  },
  productThumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  productDetailsTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
  },
  productBarcode: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.neutral[500],
  },
  productSku: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.neutral[500],
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  priceValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary[600],
  },
  stockCol: {
    alignItems: 'flex-end',
  },
  stockStatusBadge: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
  stockValueText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[800],
  },
  ownerCostBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  ownerCostLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.neutral[600],
  },
  ownerCostValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.neutral[800],
  },
  resultActions: {
    marginTop: spacing.xs,
  },
  scanNextButton: {
    width: '100%',
  },
  ownerActionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
  },
  actionOutlineBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
  },
  notFoundBody: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  notFoundBarcodeHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  barcodeDisplayBox: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  barcodeDisplayText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  notFoundDesc: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.neutral[600],
    textAlign: 'center',
  },
});

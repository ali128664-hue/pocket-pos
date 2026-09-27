import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Store,
  Camera,
  ShieldAlert,
  Save,
  CheckCircle2,
} from 'lucide-react-native';

import { useShop } from '../../src/context/ShopContext';
import { useAuth } from '../../src/context/AuthContext';
import { updateShopSettings } from '../../src/services/shopSettings';
import { uploadShopLogo } from '../../src/services/storage';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function ShopSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentShop, isOwner, refreshShop } = useShop();

  const [prevShopId, setPrevShopId] = useState(currentShop?.id);
  const [name, setName] = useState(currentShop?.name || '');
  const [phone, setPhone] = useState(currentShop?.phone || '');
  const [address, setAddress] = useState(currentShop?.address || '');
  const [city, setCity] = useState(currentShop?.city || '');
  const [taxRate, setTaxRate] = useState(String(currentShop?.tax_rate || 0));
  const [invoicePrefix, setInvoicePrefix] = useState(currentShop?.invoice_prefix || 'INV');
  const [logoUri, setLogoUri] = useState<string | null>(currentShop?.logo_url || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (currentShop && currentShop.id !== prevShopId) {
    setPrevShopId(currentShop.id);
    setName(currentShop.name);
    setPhone(currentShop.phone || '');
    setAddress(currentShop.address || '');
    setCity(currentShop.city || '');
    setTaxRate(String(currentShop.tax_rate || 0));
    setInvoicePrefix(currentShop.invoice_prefix || 'INV');
    setLogoUri(currentShop.logo_url || null);
  }

  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera roll access is required to choose a shop logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        setLogoUri(localUri);

        // Upload immediately
        if (user?.id) {
          setIsUploadingLogo(true);
          const { url, error } = await uploadShopLogo(localUri, user.id);
          setIsUploadingLogo(false);
          if (error) {
            Alert.alert('Upload Failed', error.message);
          } else if (url) {
            setLogoUri(url);
          }
        }
      }
    } catch (err: any) {
      setIsUploadingLogo(false);
      Alert.alert('Error', err.message || 'Could not select image');
    }
  };

  const handleSaveSettings = async () => {
    if (!currentShop) return;
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Shop name is required.');
      return;
    }

    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      Alert.alert('Validation Error', 'Tax rate must be between 0% and 100%.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const { data, error } = await updateShopSettings(currentShop.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        tax_rate: rate,
        invoice_prefix: invoicePrefix.trim().toUpperCase() || 'INV',
        logo_url: logoUri,
      });

      if (error || !data) {
        Alert.alert('Save Failed', error?.message || 'Could not update settings');
        return;
      }

      await refreshShop();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      Alert.alert('Saved', 'Shop profile and tax configuration updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Shop Settings</Text>
        </View>
        <View style={styles.restrictedContainer}>
          <ShieldAlert size={56} color={colors.danger[500]} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedDesc}>
            Only the shop OWNER can modify shop settings, tax rates, or invoice configurations.
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Top App Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={colors.neutral[800]} />
            </TouchableOpacity>
            <Text style={styles.appBarTitle}>Shop Settings</Text>
            {saveSuccess && (
              <View style={styles.savedPill}>
                <CheckCircle2 size={14} color={colors.success[700]} style={{ marginRight: 4 }} />
                <Text style={styles.savedPillText}>Saved</Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Logo Section */}
            <Card style={styles.logoCard}>
              <View style={styles.logoPreviewBox}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImage} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Store size={36} color={colors.primary[600]} />
                  </View>
                )}
                {isUploadingLogo && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.changeLogoBtn}
                onPress={handlePickLogo}
                disabled={isUploadingLogo}
              >
                <Camera size={16} color={colors.primary[700]} style={{ marginRight: 6 }} />
                <Text style={styles.changeLogoBtnText}>
                  {logoUri ? 'Change Shop Logo' : 'Upload Shop Logo'}
                </Text>
              </TouchableOpacity>
            </Card>

            {/* General Profile Info */}
            <Card style={styles.formCard}>
              <Text style={styles.sectionHeading}>Business Profile</Text>

              <Text style={styles.fieldLabel}>Shop Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Shop Name"
              />

              <Text style={styles.fieldLabel}>Official Phone / WhatsApp</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="03001234567"
              />

              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Karachi, Lahore, Islamabad"
              />

              <Text style={styles.fieldLabel}>Shop Address / Street</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Shop #4, Main Market"
              />
            </Card>

            {/* Tax & Financial Configuration */}
            <Card style={styles.formCard}>
              <Text style={styles.sectionHeading}>Tax & Invoice Settings</Text>

              <Text style={styles.fieldLabel}>Sales Tax Rate (% GST)</Text>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="numeric"
                placeholder="0.00"
              />
              <Text style={styles.fieldHint}>
                Set to 0 if your retail shop does not collect sales tax.
              </Text>

              <Text style={styles.fieldLabel}>Invoice Prefix</Text>
              <TextInput
                style={styles.input}
                value={invoicePrefix}
                onChangeText={setInvoicePrefix}
                autoCapitalize="characters"
                placeholder="INV"
              />
              <Text style={styles.fieldHint}>
                Prefix for sequential invoice receipts (e.g. INV-2609-00001).
              </Text>
            </Card>

            {/* Save Button */}
            <Button
              title="Save Shop Settings"
              onPress={handleSaveSettings}
              isLoading={isSaving}
              icon={<Save size={18} color="#ffffff" style={{ marginRight: 6 }} />}
              style={styles.saveBtn}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  savedPillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.success[700],
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  logoCard: {
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  logoPreviewBox: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  changeLogoBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary[700],
  },
  formCard: {
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.neutral[700],
    marginBottom: 4,
    marginTop: spacing.xs,
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
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: 10,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
  },
  saveBtn: {
    marginTop: spacing.sm,
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
});

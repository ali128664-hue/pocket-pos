import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Store,
  Phone,
  MapPin,
  Building,
  Camera,
  X,
  Percent,
  Receipt,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useShop } from '../../src/context/ShopContext';
import { uploadShopLogo } from '../../src/services/storage';
import {
  shopOnboardingSchema,
  ShopOnboardingFormData,
} from '../../src/utils/validation';
import { getFriendlyErrorMessage } from '../../src/utils/errors';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { Card } from '../../src/components/ui/Card';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function CreateShopScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createShop } = useShop();

  const [formData, setFormData] = useState<ShopOnboardingFormData>({
    name: '',
    phone: user?.user_metadata?.phone || '',
    city: '',
    address: '',
    taxRate: '0',
    invoicePrefix: 'INV',
    logoUri: null,
  });

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ShopOnboardingFormData, string>>
  >({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof ShopOnboardingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (generalError) setGeneralError(null);
  };

  const handlePickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow photo library access to select a logo for your shop.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData((prev) => ({ ...prev, logoUri: result.assets[0].uri }));
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUri: null }));
  };

  const handleCreateShop = async () => {
    if (isSubmitting) return; // Prevent duplicate submissions
    setGeneralError(null);

    // Validate using Zod
    const result = shopOnboardingSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors: Partial<Record<keyof ShopOnboardingFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof ShopOnboardingFormData;
        if (fieldName && !formattedErrors[fieldName]) {
          formattedErrors[fieldName] = issue.message;
        }
      });
      setFieldErrors(formattedErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      let uploadedLogoUrl: string | null = null;

      // Upload logo if selected
      if (formData.logoUri && user?.id) {
        const { url: logoUrl, error: uploadErr } = await uploadShopLogo(
          formData.logoUri,
          user.id
        );
        if (uploadErr) {
          console.warn('Logo upload was skipped due to storage error:', uploadErr.message);
          // Logo is optional; continue without failing shop creation
        } else {
          uploadedLogoUrl = logoUrl;
        }
      }

      // Create shop and assign OWNER
      const { shop, error: shopErr } = await createShop({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        address: formData.address?.trim() || undefined,
        currency: 'PKR',
        tax_rate: parseFloat(formData.taxRate) || 0,
        invoice_prefix: formData.invoicePrefix.trim() || 'INV',
        logo_url: uploadedLogoUrl,
      });

      if (shopErr) {
        setGeneralError(getFriendlyErrorMessage(shopErr));
        setIsSubmitting(false);
        return;
      }

      if (shop) {
        setIsSuccess(true);
        // Navigate to tabs after showing success state
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1200);
      }
    } catch (err) {
      setGeneralError(getFriendlyErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isSuccess ? (
          /* Success Screen */
          <View style={styles.successContainer}>
            <View style={styles.successIconBadge}>
              <CheckCircle2 size={48} color={colors.success[600]} />
            </View>
            <Text style={styles.successTitle}>Your shop is ready!</Text>
            <Text style={styles.successSubtitle}>
              {formData.name} has been set up successfully. Launching your PocketPOS terminal...
            </Text>
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Store size={32} color="#ffffff" />
              </View>
              <Text style={styles.title}>Set Up Your Shop</Text>
              <Text style={styles.subtitle}>
                Add your shop details to get started with PocketPOS.
              </Text>
            </View>

            {/* Form Card */}
            <Card style={styles.card}>
              <ErrorMessage message={generalError} />

              {/* Logo Picker Section */}
              <View style={styles.logoPickerContainer}>
                {formData.logoUri ? (
                  <View style={styles.logoPreviewWrapper}>
                    <Image
                      source={{ uri: formData.logoUri }}
                      style={styles.logoImage}
                    />
                    <TouchableOpacity
                      style={styles.removeLogoButton}
                      onPress={handleRemoveLogo}
                      activeOpacity={0.8}
                    >
                      <X size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.logoPlaceholder}
                    onPress={handlePickLogo}
                    activeOpacity={0.7}
                  >
                    <Camera size={26} color={colors.primary[600]} />
                    <Text style={styles.logoPlaceholderText}>
                      Add Shop Logo (Optional)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Required Fields */}
              <Input
                label="Shop Name *"
                placeholder="e.g., Al-Madina Super Store"
                value={formData.name}
                onChangeText={(val) => handleChange('name', val)}
                leftIcon={<Store size={20} color={colors.neutral[400]} />}
                error={fieldErrors.name}
              />

              <Input
                label="Phone Number *"
                placeholder="03001234567"
                value={formData.phone}
                onChangeText={(val) => handleChange('phone', val)}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={colors.neutral[400]} />}
                error={fieldErrors.phone}
                hint="Used on digital invoices and receipts"
              />

              <Input
                label="City *"
                placeholder="e.g., Karachi, Lahore, Islamabad"
                value={formData.city}
                onChangeText={(val) => handleChange('city', val)}
                leftIcon={<MapPin size={20} color={colors.neutral[400]} />}
                error={fieldErrors.city}
              />

              <Input
                label="Shop Address (Optional)"
                placeholder="e.g., Shop #4, Tariq Road"
                value={formData.address || ''}
                onChangeText={(val) => handleChange('address', val)}
                leftIcon={<Building size={20} color={colors.neutral[400]} />}
                error={fieldErrors.address}
              />

              {/* Advanced Settings Toggle */}
              <TouchableOpacity
                style={styles.advancedToggle}
                onPress={() => setShowAdvanced((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.advancedToggleText}>
                  {showAdvanced ? '− Hide Tax & Invoice Settings' : '+ Edit Tax & Invoice Settings'}
                </Text>
              </TouchableOpacity>

              {showAdvanced && (
                <View style={styles.advancedSection}>
                  <Input
                    label="Default Sales Tax Rate (%)"
                    placeholder="0"
                    value={formData.taxRate}
                    onChangeText={(val) => handleChange('taxRate', val)}
                    keyboardType="numeric"
                    leftIcon={<Percent size={20} color={colors.neutral[400]} />}
                    error={fieldErrors.taxRate}
                    hint="Default is 0%. Can be adjusted per sale."
                  />

                  <Input
                    label="Invoice Prefix"
                    placeholder="INV"
                    value={formData.invoicePrefix}
                    onChangeText={(val) => handleChange('invoicePrefix', val)}
                    autoCapitalize="characters"
                    leftIcon={<Receipt size={20} color={colors.neutral[400]} />}
                    error={fieldErrors.invoicePrefix}
                    hint="Prefix for receipts (e.g., INV generates INV-2609-00001)"
                  />
                </View>
              )}

              {/* Submit Button */}
              <Button
                title="Create Shop"
                onPress={handleCreateShop}
                isLoading={isSubmitting}
                size="lg"
                style={styles.submitButton}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    padding: spacing.xl,
  },
  logoPickerContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoPreviewWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.primary[200],
  },
  removeLogoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger[600],
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  logoPlaceholder: {
    width: '100%',
    height: 76,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  logoPlaceholderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.primary[700],
    marginTop: spacing.xs,
  },
  advancedToggle: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  advancedToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary[600],
  },
  advancedSection: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  submitButton: {
    marginTop: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  successIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});

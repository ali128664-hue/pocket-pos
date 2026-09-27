import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Phone, Store } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { signUpSchema, SignUpFormData } from '../../src/utils/validation';
import { getFriendlyErrorMessage } from '../../src/utils/errors';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignUpFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof SignUpFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (generalError) setGeneralError(null);
  };

  const handleSignUp = async () => {
    setGeneralError(null);

    // Validate using Zod
    const result = signUpSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors: Partial<Record<keyof SignUpFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof SignUpFormData;
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
      const { error, user } = await signUp(
        formData.email.trim(),
        formData.password,
        formData.fullName.trim(),
        formData.phone ? formData.phone.trim() : undefined
      );

      if (error) {
        setGeneralError(getFriendlyErrorMessage(error));
        return;
      }

      if (user && !user.confirmed_at && user.identities?.length) {
        Alert.alert(
          'Account Created',
          'Please check your email to confirm your account before logging in.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      }
      // If auto-confirm is enabled, AuthProvider will automatically redirect to app shell
    } catch (err) {
      setGeneralError(getFriendlyErrorMessage(err));
    } finally {
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
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Store size={32} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>Create Owner Account</Text>
          <Text style={styles.brandSubtitle}>
            Start running your shop on PocketPOS
          </Text>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          <ErrorMessage message={generalError} />

          <Input
            label="Full Name *"
            placeholder="Muhammad Ali"
            value={formData.fullName}
            onChangeText={(val) => handleChange('fullName', val)}
            autoCapitalize="words"
            leftIcon={<User size={20} color={colors.neutral[400]} />}
            error={fieldErrors.fullName}
          />

          <Input
            label="Mobile Number (Optional)"
            placeholder="03001234567"
            value={formData.phone}
            onChangeText={(val) => handleChange('phone', val)}
            keyboardType="phone-pad"
            leftIcon={<Phone size={20} color={colors.neutral[400]} />}
            hint="Pakistani mobile number for shop communications"
            error={fieldErrors.phone}
          />

          <Input
            label="Email Address *"
            placeholder="shopkeeper@example.com"
            value={formData.email}
            onChangeText={(val) => handleChange('email', val)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Mail size={20} color={colors.neutral[400]} />}
            error={fieldErrors.email}
          />

          <Input
            label="Password *"
            placeholder="Minimum 6 characters"
            value={formData.password}
            onChangeText={(val) => handleChange('password', val)}
            isPassword
            leftIcon={<Lock size={20} color={colors.neutral[400]} />}
            error={fieldErrors.password}
          />

          <Input
            label="Confirm Password *"
            placeholder="Re-enter password"
            value={formData.confirmPassword}
            onChangeText={(val) => handleChange('confirmPassword', val)}
            isPassword
            leftIcon={<Lock size={20} color={colors.neutral[400]} />}
            error={fieldErrors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleSignUp}
            isLoading={isSubmitting}
            size="lg"
            style={styles.submitButton}
          />
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
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
  brandTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
  },
  footerLink: {
    fontSize: typography.sizes.sm,
    color: colors.primary[600],
    fontWeight: typography.weights.bold,
  },
});

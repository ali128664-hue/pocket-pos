import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Store } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { loginSchema, LoginFormData } from '../../src/utils/validation';
import { getFriendlyErrorMessage } from '../../src/utils/errors';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (generalError) setGeneralError(null);
  };

  const handleLogin = async () => {
    setGeneralError(null);

    // Validate with Zod
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors: Partial<Record<keyof LoginFormData, string>> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof LoginFormData;
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
      const { error } = await signIn(formData.email.trim(), formData.password);
      if (error) {
        setGeneralError(getFriendlyErrorMessage(error));
      }
      // If successful, onAuthStateChange in AuthProvider will handle navigation
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
          <Text style={styles.brandTitle}>PocketPOS</Text>
          <Text style={styles.brandSubtitle}>
            Smartphone-first retail POS & inventory
          </Text>
        </View>

        {/* Card Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to manage your shop</Text>

          <ErrorMessage message={generalError} />

          <Input
            label="Email Address"
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
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChangeText={(val) => handleChange('password', val)}
            isPassword
            leftIcon={<Lock size={20} color={colors.neutral[400]} />}
            error={fieldErrors.password}
          />

          <View style={styles.forgotPasswordRow}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            isLoading={isSubmitting}
            size="lg"
            style={styles.submitButton}
          />
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/sign-up')}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Register Shop</Text>
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
    marginBottom: spacing.xxl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
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
  formTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  formSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.xs,
  },
  forgotPasswordText: {
    fontSize: typography.sizes.sm,
    color: colors.primary[600],
    fontWeight: typography.weights.medium,
  },
  submitButton: {
    marginTop: spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
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

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
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { forgotPasswordSchema } from '../../src/utils/validation';
import { getFriendlyErrorMessage } from '../../src/utils/errors';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ErrorMessage } from '../../src/components/ui/ErrorMessage';
import { colors, spacing, typography, borderRadius } from '../../src/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async () => {
    setGeneralError(null);

    // Validate with Zod
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return;
    }

    setEmailError(undefined);
    setIsSubmitting(true);

    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setGeneralError(getFriendlyErrorMessage(error));
      } else {
        setIsSuccess(true);
      }
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
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.neutral[700]} />
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>

        {isSuccess ? (
          /* Success Card */
          <View style={styles.card}>
            <View style={styles.successIconBadge}>
              <CheckCircle2 size={40} color={colors.success[600]} />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We have sent password reset instructions to:
            </Text>
            <Text style={styles.emailHighlight}>{email}</Text>
            <Text style={styles.instruction}>
              Click the link in the email to set a new password. If you don&apos;t see it, check your spam folder.
            </Text>
            <Button
              title="Return to Sign In"
              onPress={() => router.replace('/(auth)/login')}
              size="lg"
              style={styles.actionButton}
            />
          </View>
        ) : (
          /* Form Card */
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <KeyRound size={28} color={colors.primary[600]} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered email address and we&apos;ll send you instructions to reset your password.
            </Text>

            <ErrorMessage message={generalError} />

            <Input
              label="Email Address"
              placeholder="shopkeeper@example.com"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (emailError) setEmailError(undefined);
                if (generalError) setGeneralError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Mail size={20} color={colors.neutral[400]} />}
              error={emailError}
            />

            <Button
              title="Send Reset Instructions"
              onPress={handleReset}
              isLoading={isSubmitting}
              size="lg"
              style={styles.actionButton}
            />
          </View>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[700],
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs,
  },
  card: {
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
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[500],
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  emailHighlight: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primary[700],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  instruction: {
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
});

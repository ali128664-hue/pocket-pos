import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, borderRadius, spacing, typography } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  isPassword = false,
  containerStyle,
  secureTextEntry,
  style,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = isPassword ? !showPassword : secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.neutral[400]}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={() => setShowPassword((prev) => !prev)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.neutral[500]} />
            ) : (
              <Eye size={20} color={colors.neutral[500]} />
            )}
          </TouchableOpacity>
        )}

        {!isPassword && rightIcon && (
          <View style={styles.rightIconButton}>{rightIcon}</View>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.neutral[700],
    marginBottom: spacing.xs + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.primary[600],
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: colors.danger[500],
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger[600],
    marginTop: spacing.xs,
  },
  hintText: {
    fontSize: typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
});

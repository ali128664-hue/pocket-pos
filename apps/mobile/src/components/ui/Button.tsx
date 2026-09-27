import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, borderRadius, spacing, typography } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = () => {
    const base: ViewStyle = {
      ...styles.button,
      ...styles[`size_${size}`],
    };

    if (disabled || isLoading) {
      return { ...base, ...styles[`variant_${variant}`], ...styles.disabled, ...style };
    }

    return { ...base, ...styles[`variant_${variant}`], ...style };
  };

  const getTextStyle = () => {
    return {
      ...styles.text,
      ...styles[`textSize_${size}`],
      ...styles[`textVariant_${variant}`],
      ...textStyle,
    };
  };

  const spinnerColor =
    variant === 'outline' || variant === 'ghost' ? colors.primary[600] : '#ffffff';

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  size_sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
  },
  variant_primary: {
    backgroundColor: colors.primary[600],
  },
  variant_secondary: {
    backgroundColor: colors.secondary[500],
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary[600],
  },
  variant_danger: {
    backgroundColor: colors.danger[600],
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  textSize_sm: {
    fontSize: typography.sizes.sm,
  },
  textSize_md: {
    fontSize: typography.sizes.md,
  },
  textSize_lg: {
    fontSize: typography.sizes.lg,
  },
  textVariant_primary: {
    color: '#ffffff',
  },
  textVariant_secondary: {
    color: '#ffffff',
  },
  textVariant_outline: {
    color: colors.primary[600],
  },
  textVariant_danger: {
    color: '#ffffff',
  },
  textVariant_ghost: {
    color: colors.primary[600],
  },
});

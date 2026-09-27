import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  fullScreen = true,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.primary[600]} />
      {Boolean(message) && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.neutral[600],
    fontWeight: typography.weights.medium,
  },
});

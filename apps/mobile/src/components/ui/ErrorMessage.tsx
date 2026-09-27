import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors, borderRadius, spacing, typography } from '../../constants/theme';

interface ErrorMessageProps {
  message?: string | null;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <AlertCircle size={18} color={colors.danger[600]} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger[50],
    borderWidth: 1,
    borderColor: colors.danger[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.danger[700],
    lineHeight: 20,
  },
});

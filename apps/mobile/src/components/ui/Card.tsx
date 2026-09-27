import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});

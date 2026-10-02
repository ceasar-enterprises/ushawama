import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow, Vapor } from '../theme';

type CardProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  accentColor?: string;
  style?: ViewStyle;
  compact?: boolean;
};

export function Card({
  children,
  title,
  subtitle,
  onPress,
  variant = 'default',
  accentColor,
  style,
  compact = false,
}: CardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.card,
        styles[variant],
        variant === 'elevated' && Shadow.md,
        accentColor && { borderLeftColor: accentColor, borderLeftWidth: 3 },
        compact && styles.compact,
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  compact: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  default: {
    ...Vapor,
    ...Shadow.sm,
  },
  elevated: {
    ...Vapor,
    ...Shadow.md,
  },
  outlined: {
    ...Vapor,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  filled: {
    ...Vapor,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

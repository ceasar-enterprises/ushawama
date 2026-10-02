import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';

type ProgressBarProps = {
  progress: number; // 0-100
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  style?: ViewStyle;
};

export function ProgressBar({
  progress,
  color = Colors.primary,
  height = 8,
  label,
  showPercent = true,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.container, style]}>
      {(label || showPercent) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercent && <Text style={styles.percent}>{Math.round(clamped)}%</Text>}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            { width: `${clamped}%`, backgroundColor: color, height },
          ]}
        />
      </View>
    </View>
  );
}

type LevelBadgeProps = {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  completed?: boolean;
};

const LEVEL_COLORS = [
  Colors.level1,
  Colors.level2,
  Colors.level3,
  Colors.level4,
  Colors.level5,
];

const LEVEL_NAMES = [
  'Jina Langu',
  'Bei ya Bidhaa',
  'Fomu ya Forodha',
  'Soko',
  'Biashara Yangu',
];

export function LevelBadge({ level, size = 'md', completed = false }: LevelBadgeProps) {
  const bgColor = LEVEL_COLORS[(level - 1) % 5] || Colors.primary;
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;

  return (
    <View
      style={[
        styles.badge,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bgColor },
        completed && styles.badgeCompleted,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          size === 'sm' && styles.badgeTextSm,
          size === 'lg' && styles.badgeTextLg,
        ]}
      >
        {level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  percent: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '700' },
  track: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: Radius.full,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCompleted: {
    borderWidth: 2,
    borderColor: Colors.textOnPrimary,
  },
  badgeText: {
    color: Colors.textOnPrimary,
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  badgeTextSm: { fontSize: FontSize.xs },
  badgeTextLg: { fontSize: FontSize.xl },
});

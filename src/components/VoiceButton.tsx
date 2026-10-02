import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import * as Speech from 'expo-speech';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../theme';

type VoiceButtonProps = {
  text?: string;
  onRecordStart?: () => void;
  onRecordStop?: (transcript: string) => void;
  label?: string;
  variant?: 'speak' | 'listen' | 'both';
  size?: 'sm' | 'md' | 'lg';
  lang?: string;
  style?: ViewStyle;
};

const LANG_CODES: Record<string, string> = {
  en: 'en-US',
  sw: 'sw-KE',
  lg: 'en-US', // Luganda fallback
  rw: 'en-US', // Kinyarwanda fallback
};

export function VoiceButton({
  text,
  onRecordStart,
  onRecordStop,
  label,
  variant = 'speak',
  size = 'md',
  lang = 'en',
  style,
}: VoiceButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(() => {
    if (!text) return;
    setSpeaking(true);
    Speech.speak(text, {
      language: LANG_CODES[lang] || 'en-US',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
    });
  }, [text, lang]);

  const handlePress = () => {
    if (variant === 'speak' || variant === 'both') {
      speak();
    }
    if (variant === 'listen') {
      onRecordStart?.();
    }
  };

  const dim = size === 'sm' ? 40 : size === 'lg' ? 64 : 52;
  const icon = speaking ? '…' : variant === 'listen' ? '●' : '▶';

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          { width: dim, height: dim, borderRadius: dim / 2 },
          speaking && styles.buttonActive,
          Shadow.md,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={[styles.icon, size === 'sm' && styles.iconSm, size === 'lg' && styles.iconLg]}>
          {icon}
        </Text>
      </TouchableOpacity>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: Spacing.xs },
  button: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 1.05 }],
  },
  icon: { fontSize: FontSize.xl },
  iconSm: { fontSize: FontSize.lg },
  iconLg: { fontSize: FontSize.xxl },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
});

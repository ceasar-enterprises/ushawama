/**
 * VoiceBar — Full voice interaction bar for Ushawama
 * Tap mic → speak → transcript → command → TTS response
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../theme';
import { useVoice } from './useVoice';
import { VoiceCommand, VoiceLanguage } from './engine';
import { getVoiceEngine } from './engine';

type VoiceBarProps = {
  language?: VoiceLanguage;
  onCommand?: (cmd: VoiceCommand) => void;
  placeholder?: string;
  compact?: boolean;
};

export function VoiceBar({
  language = 'en',
  onCommand,
  placeholder,
  compact = false,
}: VoiceBarProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const { state, transcript, startListening, stopListening, speak, stopSpeaking, error } = useVoice({
    language,
    onCommand,
  });

  // Pulse animation when listening
  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const handleMicPress = async () => {
    if (state === 'listening') {
      await stopListening();
    } else if (state === 'speaking') {
      stopSpeaking();
    } else {
      await startListening();
    }
  };

  const stateLabels: Record<string, string> = {
    idle: placeholder || 'Tap the mic and speak...',
    listening: 'Listening... speak now',
    processing: 'Understanding...',
    speaking: 'Speaking...',
    error: 'Something went wrong. Tap to retry.',
  };

  const micIcon = state === 'listening' ? '●' : state === 'speaking' ? '…' : '●';

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactBtn}
        onPress={handleMicPress}
        activeOpacity={0.7}
      >
        <Animated.Text style={[styles.compactIcon, { transform: [{ scale: pulseAnim }] }]}>
          {micIcon}
        </Animated.Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.bar, state === 'listening' && styles.barActive]}>
      <TouchableOpacity onPress={handleMicPress} activeOpacity={0.7}>
        <Animated.View
          style={[
            styles.micBtn,
            state === 'listening' && styles.micBtnActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.micIcon}>{micIcon}</Text>
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.textArea}>
        <Text
          style={[
            styles.label,
            state === 'listening' && styles.labelActive,
            state === 'error' && styles.labelError,
          ]}
        >
          {stateLabels[state]}
        </Text>
        {transcript ? (
          <Text style={styles.transcript} numberOfLines={2}>
            "{transcript}"
          </Text>
        ) : null}
        {error ? (
          <Text style={styles.error} numberOfLines={1}>{error}</Text>
        ) : null}
      </View>

      {state === 'listening' && (
        <View style={styles.waveContainer}>
          {[0, 1, 2, 3, 4].map(i => (
            <Animated.View
              key={i}
              style={[
                styles.wave,
                {
                  height: state === 'listening' ? 16 + i * 2 : 4,
                  opacity: state === 'listening' ? 0.5 + (i % 3) * 0.2 : 0.3,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  barActive: {
    backgroundColor: Colors.primary + '08',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: Colors.error,
  },
  micIcon: { fontSize: FontSize.xl },
  textArea: { flex: 1 },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  labelActive: { color: Colors.primary },
  labelError: { color: Colors.error },
  transcript: { fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: 2, fontStyle: 'italic' },
  error: { fontSize: FontSize.xs, color: Colors.error, marginTop: 2 },
  waveContainer: { flexDirection: 'row', gap: 3, alignItems: 'center', height: 30 },
  wave: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primaryLight,
    minHeight: 4,
  },
  compactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIcon: { fontSize: FontSize.lg },
});

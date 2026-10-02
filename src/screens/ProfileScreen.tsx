import React from 'react';
import { Text, StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LevelBadge } from '../components/ProgressBar';
import { VoiceButton } from '../components/VoiceButton';

type Props = { navigation: any };

const TRADER = {
  name: 'Nalubega Sarah',
  phone: '+256 701 234 567',
  village: 'Busia Town',
  country: 'Uganda',
  role: 'Seller',
  literacyLevel: 2,
  joined: 'March 2026',
};

export default function ProfileScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>NS</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{TRADER.name}</Text>
          <Text style={styles.meta}>{TRADER.village}, {TRADER.country}</Text>
          <Text style={styles.meta}>{TRADER.phone}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>3</Text>
          <Text style={styles.statLabel}>Active Trades</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>12</Text>
          <Text style={styles.statLabel}>Hours Learned</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>47</Text>
          <Text style={styles.statLabel}>Words Known</Text>
        </View>
      </View>

      {/* Literacy */}
      <Card variant="elevated" title="Reading Progress" subtitle={`Level ${TRADER.literacyLevel}: Bei ya Bidhaa`}>
        <View style={styles.levelRow}>
          {[1, 2, 3, 4, 5].map(l => (
            <LevelBadge key={l} level={l} size="sm" completed={l < TRADER.literacyLevel} />
          ))}
        </View>
        <Button
          title="Continue Learning"
          onPress={() => navigation.navigate('Literacy')}
          variant="outline"
          fullWidth
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      {/* Quick links */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <Card variant="outlined">
        {[
          { label: 'Notifications' },
          { label: 'Language' },
          { label: 'Payment Methods', action: () => navigation.navigate('Payment', { product: 'MoMo top-up', amount: 0, currency: 'USD', payerPhone: TRADER.phone, payeePhone: TRADER.phone }) },
          { label: 'Help & Support' },
          { label: 'About Ushawama' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.settingRow} activeOpacity={0.6} onPress={item.action}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Button
        title="Sign Out"
        onPress={() => {}}
        variant="ghost"
        fullWidth
        style={{ marginTop: Spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginBottom: Spacing.xl },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.textOnPrimary, fontSize: FontSize.xxl, fontWeight: '800' },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  stat: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  levelRow: { flexDirection: 'row', gap: Spacing.sm },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' },
  chevron: { fontSize: FontSize.xl, color: Colors.textMuted },
});

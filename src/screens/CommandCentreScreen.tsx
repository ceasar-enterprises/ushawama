import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, Shadow, Vapor } from '../theme';
import { Card } from '../components/Card';
import { useOps, OpsAlert } from '../ops';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

type Module = {
  key: string;
  title: string;
  sub: string;
  icon: IonName;
  color: string;
  screen: string;
};

const MODULES: Module[] = [
  { key: 'tracking', title: 'Live Tracking', sub: 'Follow cargo in motion', icon: 'navigate-circle', color: Colors.accent, screen: 'LiveTracking' },
  { key: 'ticketing', title: 'Ticketing', sub: 'Report & track issues', icon: 'chatbubbles', color: Colors.secondary, screen: 'Ticketing' },
  { key: 'customs', title: 'Customs Clearing', sub: 'Documents → release', icon: 'document-text', color: Colors.level4, screen: 'Customs' },
  { key: 'estimates', title: 'Estimates', sub: 'Costed before you ship', icon: 'receipt', color: Colors.level3, screen: 'Estimates' },
  { key: 'warehouse', title: 'Warehousing', sub: 'Storage & stock control', icon: 'cube', color: Colors.info, screen: 'Warehouse' },
  { key: 'freight', title: 'Trucks & Cargo', sub: 'Match loads to trucks', icon: 'bus', color: Colors.primaryLight, screen: 'Freight' },
];

const ALERT_COLOR: Record<OpsAlert['kind'], string> = {
  urgent: Colors.error,
  warn: Colors.warning,
  info: Colors.info,
  good: Colors.success,
};

type Props = { navigation: any };

export default function CommandCentreScreen({ navigation }: Props) {
  const { summary } = useOps();

  const kpis = [
    { label: 'In transit', value: String(summary.shipments.inTransit), color: Colors.accent },
    { label: 'At border', value: String(summary.shipments.atBorder), color: Colors.warning },
    { label: 'Duty due', value: summary.customs.dutyDue > 0 ? `$${summary.customs.dutyDue}` : '$0', color: summary.customs.dutyDue > 0 ? Colors.error : Colors.success },
    { label: 'Open tickets', value: String(summary.tickets.open), color: summary.tickets.urgent > 0 ? Colors.error : Colors.secondary },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Live KPI strip */}
      <View style={styles.kpiRow}>
        {kpis.map(k => (
          <View key={k.label} style={[styles.kpiTile, Shadow.sm]}>
            <View style={[styles.kpiDot, { backgroundColor: k.color }]} />
            <Text style={styles.kpiValue}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        ))}
      </View>

      {/* Live alerts */}
      <Card
        variant="filled"
        accentColor={Colors.primary}
        style={styles.alertsCard}
        title="Live Operations"
        subtitle={`${summary.alerts.length} signal${summary.alerts.length > 1 ? 's' : ''} on the corridors`}
      >
        {summary.alerts.map(a => (
          <View key={a.id} style={styles.alertRow}>
            <View style={[styles.alertDot, { backgroundColor: ALERT_COLOR[a.kind] }]} />
            <Text style={styles.alertText}>{a.text}</Text>
          </View>
        ))}
      </Card>

      {/* Module grid */}
      <Text style={styles.sectionTitle}>Command Modules</Text>
      <View style={styles.grid}>
        {MODULES.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.moduleCard, Shadow.sm]}
            activeOpacity={0.75}
            onPress={() => {
              if (m.screen === 'Freight') {
                navigation.navigate('Trade', { screen: 'Trucking' });
              } else {
                navigation.navigate(m.screen);
              }
            }}
          >
            <View style={[styles.moduleIcon, { backgroundColor: m.color + '18' }]}>
              <Ionicons name={m.icon} size={22} color={m.color} />
            </View>
            <Text style={styles.moduleTitle}>{m.title}</Text>
            <Text style={styles.moduleSub}>{m.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.hint}>All modules run on your data — no paperwork needed.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },

  kpiRow: { flexDirection: 'row', gap: Spacing.sm },
  kpiTile: {
    flex: 1,
    ...Vapor,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  kpiDot: { width: 8, height: 8, borderRadius: 4, marginBottom: Spacing.sm },
  kpiValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  alertsCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.sm },
  alertDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  alertText: { flex: 1, fontSize: FontSize.sm, color: Colors.textOnPrimary, lineHeight: 19 },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  moduleCard: {
    width: '47%',
    flexGrow: 1,
    ...Vapor,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  moduleIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  moduleTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  moduleSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },

  hint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
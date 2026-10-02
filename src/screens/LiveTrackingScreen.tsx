import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { useOps, Shipment, ShipmentStage } from '../ops';

type Filter = 'all' | ShipmentStage;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All shipments' },
  { id: 'in_transit', label: 'In transit' },
  { id: 'at_border', label: 'At border' },
  { id: 'delivered', label: 'Delivered' },
];

const STAGE_COLOR: Record<ShipmentStage, string> = {
  booked: Colors.textMuted,
  in_transit: Colors.accent,
  at_border: Colors.warning,
  cleared: Colors.success,
  delivered: Colors.success,
};

const STAGE_LABEL: Record<ShipmentStage, string> = {
  booked: 'BOOKED',
  in_transit: 'ON ROAD',
  at_border: 'AT BORDER',
  cleared: 'CLEARED',
  delivered: 'DELIVERED',
};

function relTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const h = Math.round(diff / 3600000);
  if (h < 0) return `${Math.abs(h)}h ago`;
  if (h < 1) return 'due shortly';
  if (h < 24) return `ETA ${h}h`;
  return `ETA ${Math.round(h / 24)}d`;
}

/* Stylised route strip: dots for stops, a marker at the live location */
function RouteStrip({ stops, current }: { stops: string[]; current: string }) {
  const idx = Math.max(0, stops.indexOf(current));
  const shown = stops.slice(0, Math.min(6, stops.length));
  return (
    <View style={styles.routeWrap}>
      {shown.map((stop, i) => {
        const reached = i <= idx;
        const isCurrent = stop === current;
        return (
          <View key={`${stop}-${i}`} style={styles.routeCol}>
            <View style={styles.routeSegment}>
              <View style={[styles.routeLine, { flex: 1 }, i === 0 && { opacity: 0 }]} />
              <View
                style={[
                  styles.routeDot,
                  isCurrent ? styles.routeMarker : reached && styles.routeDotReached,
                ]}
              />
              <View style={[styles.routeLine, { flex: 1 }, i === shown.length - 1 && { opacity: 0 }]} />
            </View>
            <Text style={[styles.routeStop, isCurrent && styles.routeStopCurrent]}>
              {isCurrent ? `● ${stop}` : stop}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ShipmentCard({ s, onToggleNotify }: { s: Shipment; onToggleNotify: (id: string) => void }) {
  const color = STAGE_COLOR[s.status];
  const doneSteps = s.timeline.filter(t => t.done).length;
  return (
    <Card compact style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.refRow}>
          <Text style={styles.ref}>{s.ref}</Text>
          <View style={[styles.pill, { backgroundColor: color + '22' }]}>
            <Text style={[styles.pillText, { color }]}>{STAGE_LABEL[s.status]}</Text>
          </View>
        </View>
        <Text style={styles.cargo}>
          {s.cargoType} · {s.weightTonnes} t
        </Text>
        <Text style={styles.carrier}>
          {s.carrier} · {s.plate} · {s.driver}
        </Text>
      </View>

      <RouteStrip stops={s.stops} current={s.currentLocation} />

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${s.progressPct}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.progressLabel}>
          {doneSteps}/{s.timeline.length} · {relTime(s.eta)}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Timeline */}
      <View style={styles.timeline}>
        {s.timeline.map(t => (
          <View key={t.key} style={styles.timelineRow}>
            <View style={styles.timelineCol}>
              <View
                style={[
                  styles.timelineDot,
                  t.done ? { backgroundColor: color } : styles.timelineDotPending,
                ]}
              >
                {t.done && <Text style={styles.timelineTick}>✓</Text>}
              </View>
              {t.key !== s.timeline[s.timeline.length - 1].key && (
                <View style={styles.timelineLine} />
              )}
            </View>
            <View style={styles.timelineText}>
              <Text style={[styles.timelineLabel, t.done && { color: Colors.textPrimary }]}>
                {t.label}
              </Text>
              {t.at && <Text style={styles.timelineAt}>{relTime(t.at)}</Text>}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.notifyRow}>
        <Text style={styles.notifyLabel}>Notify me at each stage</Text>
        <Switch
          value={s.notify}
          onValueChange={() => onToggleNotify(s.id)}
          trackColor={{ true: Colors.primaryLight, false: Colors.border }}
          thumbColor="#fff"
          ios_backgroundColor={Colors.border}
        />
      </View>
    </Card>
  );
}

export default function LiveTrackingScreen() {
  const { shipments, toggleNotify } = useOps();
  const [filter, setFilter] = useState<Filter>('all');

  const shown = filter === 'all' ? shipments : shipments.filter(s => s.status === filter);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.chips}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {shown.length === 0 && (
        <Card compact variant="outlined">
          <Text style={styles.empty}>No shipments in this view.</Text>
        </Card>
      )}
      {shown.map(s => (
        <ShipmentCard key={s.id} s={s} onToggleNotify={toggleNotify} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textOnPrimary },

  card: { marginTop: Spacing.lg },
  cardHead: { marginBottom: Spacing.md },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.4 },
  cargo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.xs },
  carrier: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  routeWrap: { flexDirection: 'row', marginBottom: Spacing.md },
  routeCol: { flex: 1, alignItems: 'center' },
  routeSegment: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  routeLine: { height: 2, backgroundColor: Colors.border },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  routeDotReached: { backgroundColor: Colors.primaryLight },
  routeMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: Colors.accentLight + '88',
  },
  routeStop: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  routeStopCurrent: { color: Colors.accent, fontWeight: '700' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceElevated, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.md },

  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row' },
  timelineCol: { width: 22, alignItems: 'center' },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineDotPending: { backgroundColor: Colors.surfaceElevated, borderWidth: 2, borderColor: Colors.border },
  timelineTick: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 15 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.borderLight, minHeight: 18 },
  timelineText: { flex: 1, paddingBottom: Spacing.md, paddingLeft: Spacing.sm },
  timelineLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  timelineAt: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },

  notifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  notifyLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },

  empty: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
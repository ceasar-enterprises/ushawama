import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useOps, CustomsFiling, CustomsDocState } from '../ops';

const DOC_STATE: Record<CustomsDocState, { label: string; color: string }> = {
  missing: { label: 'MISSING', color: Colors.textMuted },
  uploaded: { label: 'UPLOADED', color: Colors.info },
  verified: { label: 'VERIFIED', color: Colors.success },
};

const READY_DOCS = ['Commercial Invoice', 'Packing List', 'Certificate of Origin', 'SPS Certificate'];

function StageStepper({ f }: { f: CustomsFiling }) {
  const doneColor = f.status === 'released' ? Colors.success : Colors.primary;
  return (
    <View style={styles.stages}>
      {f.stages.map((s, i) => {
        const active = s.active && !s.done;
        return (
          <View key={s.key} style={styles.stageCol}>
            <View style={styles.stageTrackRow}>
              <View style={[styles.stageLine, { flex: 1 }, i === 0 && { opacity: 0 }]} />
              <View
                style={[
                  styles.stageNode,
                  s.done && { backgroundColor: doneColor },
                  active && { borderColor: Colors.warning, borderWidth: 2, backgroundColor: Colors.warning + '22' },
                  !s.done && !active && { backgroundColor: Colors.surfaceElevated, borderWidth: 1.5, borderColor: Colors.border },
                ]}
              >
                {s.done && <Text style={styles.stageTick}>✓</Text>}
                {!s.done && <Text style={[styles.stageNum, active && { color: Colors.warning }]}>{i + 1}</Text>}
              </View>
              <View style={[styles.stageLine, { flex: 1 }, i === f.stages.length - 1 && { opacity: 0 }]} />
            </View>
            <Text style={[styles.stageLabel, active && { color: Colors.warning, fontWeight: '700' }]}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function FilingCard({
  f,
  onDoc,
  onPay,
  onRelease,
}: {
  f: CustomsFiling;
  onDoc: (id: string, key: string, state: CustomsDocState) => void;
  onPay: (id: string) => void;
  onRelease: (id: string) => void;
}) {
  const released = f.status === 'released';
  return (
    <Card compact style={styles.card}>
      <View style={styles.head}>
        <View>
          <Text style={styles.ref}>{f.ref} · {f.declarationId}</Text>
          <Text style={styles.cargo}>{f.cargo}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: released ? Colors.success + '22' : Colors.warning + '22' }]}>
          <Text style={[styles.statusText, { color: released ? Colors.success : Colors.warning }]}>
            {released ? 'RELEASED' : f.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {f.border} border · {f.regime === 'formal' ? 'Formal (CET)' : 'Simplified (STR)'}
      </Text>
      <Text style={styles.meta}>
        Importer: {f.importer} · Agent: {f.agent}
      </Text>

      <StageStepper f={f} />

      {/* Documents */}
      <Text style={styles.section}>Documents</Text>
      {f.documents.map(d => {
        const st = DOC_STATE[d.state];
        return (
          <View key={d.key} style={styles.docRow}>
            <Text style={styles.docName}>{d.name}</Text>
            <View style={[styles.docPill, { backgroundColor: st.color + '1c' }]}>
              <Text style={[styles.docPillText, { color: st.color }]}>{st.label}</Text>
            </View>
            {d.state !== 'verified' && (
              <TouchableOpacity onPress={() => onDoc(f.id, d.key, 'uploaded')} activeOpacity={0.7}>
                <Text style={styles.docAction}>Upload</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Duty */}
      <View style={styles.dutyRow}>
        <View>
          <Text style={styles.section}>Duty due</Text>
          <Text style={styles.dutyAmount}>
            ${f.dutyDue.toLocaleString()} <Text style={styles.dutyPaid}>/ paid ${f.dutyPaid}</Text>
          </Text>
        </View>
        {!released && (
          <Button
            title={f.dutyPaid >= f.dutyDue ? 'Release cargo' : `Pay $${f.dutyDue.toLocaleString()}`}
            size="sm"
            onPress={() => (f.dutyPaid >= f.dutyDue ? onRelease(f.id) : onPay(f.id))}
          />
        )}
      </View>
    </Card>
  );
}

export default function CustomsScreen() {
  const { customs, setDocState, payDuty, release } = useOps();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card variant="filled" compact accentColor={Colors.level4}>
        <Text style={styles.introTitle}>How clearing works here</Text>
        <Text style={styles.introText}>
          Submit documents → verification → pay duty → release. Simplified regime
          (STR) applies to goods under the threshold — fewer documents, lower fees.
        </Text>
      </Card>
      {customs.map(f => (
        <FilingCard
          key={f.id}
          f={f}
          onDoc={setDocState}
          onPay={payDuty}
          onRelease={release}
        />
      ))}
      {customs.length === 0 && (
        <Card compact variant="outlined">
          <Text style={styles.empty}>No declarations yet.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },

  introTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textOnPrimary },
  introText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: Spacing.xs, lineHeight: 19 },

  card: { marginTop: Spacing.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  ref: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  cargo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  statusText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.4 },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  stages: { flexDirection: 'row', marginTop: Spacing.lg },
  stageCol: { flex: 1, alignItems: 'center' },
  stageTrackRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stageLine: { height: 2, backgroundColor: Colors.border },
  stageNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTick: { color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 18 },
  stageNum: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700' },
  stageLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },

  section: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.lg },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  docName: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  docPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  docPillText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.3 },
  docAction: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.accent },

  dutyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  dutyAmount: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  dutyPaid: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textMuted },

  empty: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
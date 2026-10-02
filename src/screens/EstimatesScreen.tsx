import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useOps, Estimate, EstimateInput } from '../ops';
import { EAC_TOWNS } from '../trucking';

const BORDERS = ['Busia', 'Malaba', 'Namanga', 'Suam', 'Moyale'];

function usd(n: number): string {
  return `$${n.toLocaleString()}`;
}

function FormatRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.lineRow}>
      <Text style={styles.lineLabel}>{label}</Text>
      <View style={styles.lineVal}>
        {note && <Text style={styles.lineNote}>{note}</Text>}
        <Text style={styles.lineAmount}>{value}</Text>
      </View>
    </View>
  );
}

function EstimateCard({ e }: { e: Estimate }) {
  const when = new Date(e.createdAt);
  const date = `${when.getDate().toString().padStart(2, '0')}/${(when.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
  return (
    <Card compact style={styles.savedCard}>
      <View style={styles.savedHead}>
        <Text style={styles.savedRef}>{e.ref}</Text>
        <Text style={styles.savedDate}>{date} · {e.border}</Text>
      </View>
      <Text style={styles.savedCargo}>{e.cargoType}</Text>
      <View style={styles.savedTotalRow}>
        <Text style={styles.savedTotalLabel}>Total landed cost</Text>
        <Text style={styles.savedTotal}>{usd(e.totalUSD)}</Text>
      </View>
    </Card>
  );
}

export default function EstimatesScreen() {
  const { estimates, buildEstimate, saveEstimate } = useOps();
  const [form, setForm] = useState({
    cargoType: '',
    valueUSD: '',
    weightTonnes: '',
    origin: 'Kampala',
    destination: 'Nairobi',
    border: 'Busia',
    months: '0',
  });
  const [preview, setPreview] = useState<Estimate | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeInput = (): EstimateInput | null => {
    const value = parseFloat(form.valueUSD);
    const weight = parseFloat(form.weightTonnes);
    if (!form.cargoType.trim()) {
      setError('Name the cargo first.');
      return null;
    }
    if (!value || value <= 0) {
      setError('Enter a cargo value (USD).');
      return null;
    }
    if (!weight || weight <= 0) {
      setError('Enter the weight in tonnes.');
      return null;
    }
    return {
      cargoType: form.cargoType.trim(),
      valueUSD: value,
      weightTonnes: weight,
      origin: form.origin,
      destination: form.destination,
      border: form.border,
      monthsInWarehouse: Math.max(0, parseInt(form.months) || 0),
    };
  };

  const onEstimate = () => {
    setError(null);
    setSaved(false);
    const input = computeInput();
    if (!input) return;
    setPreview(buildEstimate(input));
  };

  const onSave = async () => {
    const input = computeInput();
    if (!input) return;
    await saveEstimate(input);
    setSaved(true);
    setPreview(null);
    setForm({ cargoType: '', valueUSD: '', weightTonnes: '', origin: 'Kampala', destination: 'Nairobi', border: 'Busia', months: '0' });
  };

  const set = (k: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card variant="filled" compact accentColor={Colors.level3}>
        <Text style={styles.introTitle}>Know your landed cost before you ship</Text>
        <Text style={styles.introText}>
          Freight + duty + VAT + fees. Nothing hidden — USD today, paid at the border.
        </Text>
      </Card>

      {/* Estimator */}
      <Text style={styles.label}>Cargo</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Maize, 60kg bags"
        placeholderTextColor={Colors.textMuted}
        value={form.cargoType}
        onChangeText={set('cargoType')}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Value (USD)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5000"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={form.valueUSD}
            onChangeText={set('valueUSD')}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Weight (t)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 15"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={form.weightTonnes}
            onChangeText={set('weightTonnes')}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Origin</Text>
          <Select value={form.origin} onChange={set('origin')} options={EAC_TOWNS} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Destination</Text>
          <Select value={form.destination} onChange={set('destination')} options={EAC_TOWNS} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Border</Text>
          <Select value={form.border} onChange={set('border')} options={BORDERS} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Warehouse (months)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={form.months}
            onChangeText={set('months')}
          />
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button title="Estimate total cost" onPress={onEstimate} style={styles.estimateBtn} />

      {preview && (
        <Card style={styles.breakdown}>
          <View style={styles.breakdownHead}>
            <Text style={styles.breakdownTitle}>{preview.cargoType}</Text>
            <Text style={styles.breakdownSub}>{preview.ref} · {preview.border}</Text>
          </View>
          {preview.lines.map(l => (
            <FormatRow key={l.key} label={l.label} value={usd(l.amount)} note={l.note} />
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total landed cost</Text>
            <Text style={styles.totalAmount}>{usd(preview.totalUSD)}</Text>
          </View>
          <Button title="Save this estimate" variant="outline" onPress={onSave} style={styles.saveBtn} />
        </Card>
      )}

      {saved && (
        <Card variant="filled" compact style={styles.savedNotice}>
          <Text style={styles.savedNoticeText}>Saved — reuse it when you book freight.</Text>
        </Card>
      )}

      {/* Saved estimates */}
      {estimates.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Saved estimates</Text>
          {estimates.map(e => (
            <EstimateCard key={e.id} e={e} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={styles.select} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Text style={styles.selectText}>{value}</Text>
        <Text style={styles.selectCaret}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.selectList}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.selectOpt, value === opt && styles.selectOptActive]}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectOptText, value === opt && styles.selectOptTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 80 },

  introTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textOnPrimary },
  introText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: Spacing.xs, lineHeight: 19 },

  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },

  select: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { fontSize: FontSize.md, color: Colors.textPrimary },
  selectCaret: { fontSize: FontSize.md, color: Colors.textMuted },
  selectList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginTop: 2,
    ...({ boxShadow: '0 6px 18px rgba(0,0,0,0.10)' } as any),
    elevation: 6,
    paddingVertical: Spacing.xs,
    zIndex: 20,
  },
  selectOpt: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  selectOptActive: { backgroundColor: Colors.primary + '12' },
  selectOptText: { fontSize: FontSize.md, color: Colors.textPrimary },
  selectOptTextActive: { color: Colors.primary, fontWeight: '700' },

  error: { color: Colors.error, fontSize: FontSize.sm, marginTop: Spacing.md },
  estimateBtn: { marginTop: Spacing.xl },

  breakdown: { marginTop: Spacing.xl },
  breakdownHead: { marginBottom: Spacing.md },
  breakdownTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  breakdownSub: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2, fontWeight: '600' },

  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  lineLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  lineVal: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  lineNote: { fontSize: FontSize.xs, color: Colors.textMuted },
  lineAmount: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  totalAmount: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  saveBtn: { marginTop: Spacing.md },

  savedNotice: { marginTop: Spacing.lg },
  savedNoticeText: { fontSize: FontSize.sm, color: Colors.textOnPrimary, fontWeight: '600' },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  savedCard: { marginTop: Spacing.md },
  savedHead: { flexDirection: 'row', justifyContent: 'space-between' },
  savedRef: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  savedDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  savedCargo: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.xs },
  savedTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  savedTotalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  savedTotal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
});
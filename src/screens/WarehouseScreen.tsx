import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useOps, Warehouse, StockItem } from '../ops';

function expiryState(expires?: string): { label: string; color: string } {
  if (!expires) return { label: 'NO EXPIRY', color: Colors.textMuted };
  const days = Math.floor((new Date(expires).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `EXPIRED ${Math.abs(days)}d AGO`, color: Colors.error };
  if (days <= 14) return { label: `EXPIRES IN ${days}d`, color: Colors.warning };
  return { label: `OK · ${days}d LEFT`, color: Colors.success };
}

function WarehouseCard({ w }: { w: Warehouse }) {
  const pct = Math.min(100, Math.round((w.usedTonne / w.capacityTonne) * 100));
  const color = pct >= 90 ? Colors.error : pct >= 70 ? Colors.warning : Colors.primaryLight;
  return (
    <Card compact style={styles.card}>
      <View style={styles.whHead}>
        <View>
          <Text style={styles.whName}>{w.name}</Text>
          <Text style={styles.whMeta}>{w.city} · ${w.ratePerTonnePerMonth}/t/month</Text>
        </View>
        <Text style={[styles.whPct, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.whUsed}>
        {w.usedTonne.toLocaleString()} of {w.capacityTonne.toLocaleString()} tonnes used
      </Text>
    </Card>
  );
}

function StockRow({
  s,
  wh,
  onRelease,
}: {
  s: StockItem;
  wh: Warehouse;
  onRelease: (id: string) => void;
}) {
  const exp = expiryState(s.expires);
  return (
    <View style={styles.stockRow}>
      <View style={styles.stockDot} />
      <View style={styles.stockMain}>
        <View style={styles.stockTop}>
          <Text style={styles.stockRef}>{s.ref}</Text>
          <View style={[styles.expPill, { backgroundColor: exp.color + '1c' }]}>
            <Text style={[styles.expText, { color: exp.color }]}>{exp.label}</Text>
          </View>
        </View>
        <Text style={styles.stockCargo}>{s.cargoType} · {s.quantity}</Text>
        <Text style={styles.stockMeta}>
          {wh.name.split(' ')[0]} · Bin {s.bin} · {s.owner}
        </Text>
      </View>
      <Button title="Release" size="sm" variant="ghost" onPress={() => onRelease(s.id)} />
    </View>
  );
}

export default function WarehouseScreen() {
  const { warehouses, stock, checkInStock, releaseStock } = useOps();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cargoType: '', quantity: '', owner: '' });
  const [warehouseId, setWarehouseId] = useState('wh_1');

  const whById = (id: string) => warehouses.find(w => w.id === id);

  const submit = async () => {
    if (!form.cargoType.trim() || !parseFloat(form.quantity)) return;
    await checkInStock({
      cargoType: form.cargoType,
      quantity: form.quantity,
      warehouseId,
      owner: form.owner.trim() || 'Ushawama Trader',
    });
    setOpen(false);
    setForm({ cargoType: '', quantity: '', owner: '' });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {warehouses.map(w => (
          <WarehouseCard key={w.id} w={w} />
        ))}

        <Text style={styles.sectionTitle}>Stock in store</Text>
        {stock.map(s => (
          <StockRow
            key={s.id}
            s={s}
            wh={whById(s.warehouseId)!}
            onRelease={releaseStock}
          />
        ))}

        <View style={styles.emptyPad} />
      </ScrollView>

      <View style={styles.fabWrap}>
        <Button title="Check in goods" onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Check in goods</Text>

            <Text style={styles.label}>Cargo</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Beans (bags)"
              placeholderTextColor={Colors.textMuted}
              value={form.cargoType}
              onChangeText={v => setForm(prev => ({ ...prev, cargoType: v }))}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Quantity (t)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 6"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={form.quantity}
                  onChangeText={v => setForm(prev => ({ ...prev, quantity: v }))}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Warehouse</Text>
                <View style={styles.chips}>
                  {warehouses.map(w => (
                    <TouchableOpacity
                      key={w.id}
                      style={[styles.chip, warehouseId === w.id && styles.chipActive]}
                      onPress={() => setWarehouseId(w.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, warehouseId === w.id && styles.chipTextActive]}>
                        {w.city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Owner / trader</Text>
            <TextInput
              style={styles.input}
              placeholder="Trader name"
              placeholderTextColor={Colors.textMuted}
              value={form.owner}
              onChangeText={v => setForm(prev => ({ ...prev, owner: v }))}
            />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setOpen(false)} />
              <Button title="Check in" onPress={submit} disabled={!form.cargoType.trim() || !parseFloat(form.quantity)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 90 },

  card: { marginTop: Spacing.lg },
  whHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  whName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  whMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  whPct: { fontSize: FontSize.xl, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceElevated, marginTop: Spacing.sm, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4 },
  whUsed: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },

  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryLight, marginRight: Spacing.sm },
  stockMain: { flex: 1 },
  stockTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stockRef: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  expPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  expText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  stockCargo: { fontSize: FontSize.md, color: Colors.textPrimary, marginTop: 2, fontWeight: '600' },
  stockMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  emptyPad: { height: 40 },

  fabWrap: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.lg },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(8,30,22,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textOnPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xl },
});
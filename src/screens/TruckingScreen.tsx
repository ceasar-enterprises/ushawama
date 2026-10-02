import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { VoiceButton } from '../components/VoiceButton';
import {
  useTrucking,
  CargoMatch,
  TruckMatch,
  EAC_TOWNS,
  BORDERS,
} from '../trucking';

const COMPANY_ID = 'truckco_1';

const MODES = [
  { id: 'trucks', label: 'For Trucks' },
  { id: 'cargo', label: 'For Cargo' },
  { id: 'mine', label: 'My Hauls' },
] as const;

type Mode = typeof MODES[number]['id'];

export default function TruckingScreen({ navigation }: any) {
  const {
    trucks,
    cargo,
    loading,
    dispatch,
    completeDelivery,
    matchTrucksForCargo,
    matchCargoForTruck,
    postCargo,
  } = useTrucking(COMPANY_ID);

  const [mode, setMode] = useState<Mode>('trucks');
  const [postOpen, setPostOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    shipperName: '',
    cargoType: '',
    weightTonnes: '',
    pickup: 'Kampala',
    dropoff: 'Nairobi',
    border: 'Busia',
    offeredFee: '',
    currency: 'USD' as const,
    phone: '',
  });

  const myTrucks = trucks.filter(t => t.ownerId === COMPANY_ID);
  const manifestTrucks = myTrucks.filter(
    t => t.status === 'hauling' || t.status === 'loading' || t.status === 'at_destination'
  );
  const radarLoads: { truckId: string; match: CargoMatch }[] = (() => {
    const seen = new Set<string>();
    const out: { truckId: string; match: CargoMatch }[] = [];
    for (const truck of myTrucks) {
      const top = matchCargoForTruck(truck.id, 1)[0];
      if (top && !seen.has(top.cargo.id)) {
        seen.add(top.cargo.id);
        out.push({ truckId: truck.id, match: top });
      }
      if (out.length >= 4) break;
    }
    return out;
  })();

  const submitCargo = async () => {
    const weight = parseFloat(form.weightTonnes);
    const fee = parseFloat(form.offeredFee);
    if (!form.cargoType.trim() || !weight || isNaN(fee) || form.pickup === form.dropoff) return;
    await postCargo({
      shipperName: form.shipperName.trim() || 'Ushawama Shipper',
      cargoType: form.cargoType.trim(),
      weightTonnes: weight,
      pickup: form.pickup,
      dropoff: form.dropoff,
      border: form.border,
      offeredFee: fee,
      currency: form.currency,
      phone: form.phone.trim() || '+256 701 234 567',
    });
    setPostOpen(false);
    setForm({ shipperName: '', cargoType: '', weightTonnes: '', pickup: 'Kampala', dropoff: 'Nairobi', border: 'Busia', offeredFee: '', currency: 'USD', phone: '' });
    setNotice('Cargo posted — truckers can now match it.');
  };

  const onDispatch = async (truckId: string, cargoId: string) => {
    await dispatch(truckId, cargoId);
    setNotice('Truck dispatched — follow the haul in My Hauls.');
  };

  const onComplete = async (truckId: string, cargoId: string) => {
    const result = await completeDelivery(truckId, cargoId);
    if (result) {
      const loads = result.returnLoads;
      if (loads.length > 0) {
        setNotice(
          `Delivered to ${result.truck.currentLocation}. ${loads.length} return load${loads.length > 1 ? 's' : ''} waiting for your truck — no empty return run.`
        );
      } else {
        setNotice(`Delivered to ${result.truck.currentLocation}. No return load there yet.`);
      }
    }
  };

  const scoreColor = (s: number) =>
    s >= 70 ? Colors.success : s >= 50 ? Colors.warning : Colors.info;

  const renderTruckMatch = (m: TruckMatch, cargoId: string) => (
    <View key={m.truck.id} style={styles.matchRow}>
      <View style={styles.matchMain}>
        <View style={styles.matchTop}>
          <Text style={styles.matchTitle}>
            {m.truck.plate} · {m.truck.company}
          </Text>
          <View style={[styles.score, { backgroundColor: scoreColor(m.score) + '22' }]}>
            <Text style={[styles.scoreText, { color: scoreColor(m.score) }]}>{m.score}%</Text>
          </View>
        </View>
        <Text style={styles.matchMeta}>
          {m.truck.capacityTonnes}t capacity · at {m.truck.currentLocation}
        </Text>
        {m.reasons.length > 0 && (
          <Text style={styles.reasons}>{m.reasons.join(' · ')}</Text>
        )}
      </View>
      <Button
        title="Dispatch"
        size="sm"
        onPress={() => onDispatch(m.truck.id, cargoId)}
        style={styles.matchBtn}
      />
    </View>
  );

  const renderCargoMatch = (m: CargoMatch, truckId: string) => (
    <View key={m.cargo.id} style={styles.matchRow}>
      <View style={styles.matchMain}>
        <View style={styles.matchTop}>
          <Text style={styles.matchTitle}>{m.cargo.cargoType}</Text>
          <View style={[styles.score, { backgroundColor: scoreColor(m.score) + '22' }]}>
            <Text style={[styles.scoreText, { color: scoreColor(m.score) }]}>{m.score}%</Text>
          </View>
        </View>
        <Text style={styles.matchMeta}>
          {m.cargo.weightTonnes}t · {m.cargo.pickup} → {m.cargo.dropoff} · {feeLabel(m.cargo.offeredFee, m.cargo.currency)}
        </Text>
        {m.reasons.length > 0 && (
          <Text style={styles.reasons}>{m.reasons.join(' · ')}</Text>
        )}
      </View>
      <Button
        title="Take Load"
        size="sm"
        onPress={() => onDispatch(truckId, m.cargo.id)}
        style={styles.matchBtn}
      />
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card variant="filled" compact>
        <View style={styles.voiceRow}>
          <VoiceButton
            text="This is the trucking board. Say: find a truck for my maize to Nairobi, or return loads."
            variant="speak"
            size="sm"
          />
          <Text style={styles.voiceHint}>
            Match trucks to cargo — including return loads after delivery
          </Text>
        </View>
      </Card>

      {/* Mode selector */}
      <View style={styles.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[styles.modeChip, mode === m.id && styles.modeChipActive]}
            onPress={() => setMode(m.id)}
          >
            <Text style={[styles.modeText, mode === m.id && styles.modeTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notice */}
      {notice && (
        <Card compact variant="filled" accentColor={Colors.success}>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      )}

      {loading ? (
        <Text style={styles.loading}>Loading trucks & cargo...</Text>
      ) : mode === 'trucks' ? (
        <>
          <Text style={styles.sectionSub}>
            {trucks.filter(t => t.status === 'available' || t.status === 'at_destination').length} trucks ready · tap one to see matching cargo
          </Text>
          {trucks
            .filter(t => t.status === 'available' || t.status === 'at_destination')
            .map(truck => {
              const matches = matchCargoForTruck(truck.id);
              return (
                <Card key={truck.id} variant="default">
                  <View style={styles.truckHeader}>
                    <View style={styles.truckLeft}>
                      <Text style={styles.truckCompany}>{truck.company}</Text>
                      <Text style={styles.truckMeta}>
                        {truck.plate} · {truck.capacityTonnes}t · Driver {truck.driver}
                      </Text>
                      <Text style={styles.truckMeta}>
                        Route: {truck.route.join(' → ')} · now at {truck.currentLocation}
                      </Text>
                      {truck.verified ? (
                        <Text style={styles.verified}>✓ Verified company</Text>
                      ) : (
                        <Text style={styles.unverified}>Not yet verified</Text>
                      )}
                    </View>
                  </View>
                  {matches.length === 0 ? (
                    <Text style={styles.noMatch}>No open cargo fits this truck right now.</Text>
                  ) : (
                    <>
                      <Text style={styles.matchSectionLabel}>Best cargo to haul</Text>
                      {matches.map(m => renderCargoMatch(m, truck.id))}
                    </>
                  )}
                </Card>
              );
            })}
        </>
      ) : mode === 'cargo' ? (
        <>
          <Text style={styles.sectionSub}>
            {cargo.filter(c => c.status === 'open').length} open shipments · tap one to see matching trucks
          </Text>
          {cargo
            .filter(c => c.status === 'open')
            .map(item => {
              const matches = matchTrucksForCargo(item.id);
              return (
                <Card key={item.id} variant="default">
                  <View style={styles.truckHeader}>
                    <View style={styles.truckLeft}>
                      <Text style={styles.truckCompany}>{item.cargoType}</Text>
                      <Text style={styles.truckMeta}>
                        {item.weightTonnes} tonnes · {item.pickup} → {item.dropoff} · {item.border}
                      </Text>
                      <Text style={styles.truckMeta}>
                        Shipper: {item.shipperName} · Fee {feeLabel(item.offeredFee, item.currency)}
                      </Text>
                    </View>
                  </View>
                  {matches.length === 0 ? (
                    <Text style={styles.noMatch}>No truck fits this shipment yet.</Text>
                  ) : (
                    <>
                      <Text style={styles.matchSectionLabel}>Best trucks to haul it</Text>
                      {matches.map(m => renderTruckMatch(m, item.id))}
                    </>
                  )}
                </Card>
              );
            })}
        </>
      ) : (
        <>
          <Text style={styles.sectionSub}>Fleet control · Nile Hauliers Ltd</Text>

          {/* KPI row */}
          <View style={styles.kpiGrid}>
            {[
              { label: 'Active hauls', value: myTrucks.filter(t => t.status === 'hauling').length, dot: Colors.accent },
              { label: 'Loading', value: myTrucks.filter(t => t.status === 'loading').length, dot: Colors.secondary },
              { label: 'At destination', value: myTrucks.filter(t => t.status === 'at_destination').length, dot: Colors.success },
              { label: 'Idle ready', value: myTrucks.filter(t => t.status === 'available').length, dot: Colors.textMuted },
            ].map(k => (
              <View key={k.label} style={styles.kpiTile}>
                <View style={[styles.kpiDot, { backgroundColor: k.dot }]} />
                <Text style={styles.kpiValue}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>

          {/* Fleet utilization */}
          <Text style={styles.sectionSub}>Fleet utilization · capacity loaded</Text>
          <Card variant="default">
            {myTrucks.length === 0 && (
              <Text style={styles.noMatch}>No trucks assigned to this company yet.</Text>
            )}
            {myTrucks.map(truck => {
              const aboard = truck.cargoOnBoardId ? cargo.find(c => c.id === truck.cargoOnBoardId) : undefined;
              const pct = aboard ? Math.min(100, Math.round((aboard.weightTonnes / truck.capacityTonnes) * 100)) : 0;
              const color =
                truck.status === 'hauling' ? Colors.accent
                : truck.status === 'loading' ? Colors.secondary
                : truck.status === 'at_destination' ? Colors.success
                : Colors.border;
              return (
                <View key={truck.id} style={styles.utilRow}>
                  <Text style={[styles.utilPlate, { color }]}>{truck.plate}</Text>
                  <View style={styles.utilTrack}>
                    <View style={[styles.utilFill, { backgroundColor: color, width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.utilPct}>{pct}%</Text>
                </View>
              );
            })}
          </Card>

          {/* Active manifest */}
          <Text style={styles.sectionSub}>
            Active manifest · {manifestTrucks.length} truck{manifestTrucks.length === 1 ? '' : 's'}
          </Text>
          {manifestTrucks.length === 0 ? (
            <Text style={styles.noMatch}>
              Nothing on the road. Dispatch a truck from For Trucks or For Cargo and it shows here.
            </Text>
          ) : (
            manifestTrucks.map(truck => {
              const aboard = truck.cargoOnBoardId ? cargo.find(c => c.id === truck.cargoOnBoardId) : undefined;
              const stColor =
                truck.status === 'hauling' ? Colors.accent
                : truck.status === 'loading' ? Colors.secondary
                : Colors.success;
              const stLabel =
                truck.status === 'hauling' ? 'ON ROAD'
                : truck.status === 'loading' ? 'LOADING'
                : 'AT DEST';
              return (
                <Card key={truck.id} variant="default">
                  <View style={styles.truckHeader}>
                    <View style={styles.truckLeft}>
                      <View style={styles.matchTop}>
                        <Text style={styles.truckCompany}>{truck.plate} · {truck.driver}</Text>
                        <View style={[styles.score, { backgroundColor: stColor + '22' }]}>
                          <Text style={[styles.scoreText, { color: stColor }]}>{stLabel}</Text>
                        </View>
                      </View>
                      {aboard ? (
                        <Text style={styles.truckMeta}>
                          {aboard.cargoType} · {aboard.pickup} → {aboard.dropoff} · {aboard.weightTonnes}t of {truck.capacityTonnes}t
                        </Text>
                      ) : (
                        <Text style={styles.truckMeta}>
                          {truck.capacityTonnes}t unit · now at {truck.currentLocation}
                        </Text>
                      )}
                    </View>
                  </View>
                  {truck.status === 'hauling' && aboard && (
                    <Button
                      title="Mark Delivered"
                      size="sm"
                      variant="secondary"
                      onPress={() => onComplete(truck.id, aboard.id)}
                      style={{ marginTop: Spacing.sm }}
                    />
                  )}
                </Card>
              );
            })
          )}

          {/* Return-load radar */}
          <Text style={styles.sectionSub}>Return-load radar · no empty runs</Text>
          <Card variant="default">
            {radarLoads.length === 0 ? (
              <Text style={styles.noMatch}>
                No backhauls queued yet. Complete a delivery and matching return loads light up here.
              </Text>
            ) : (
              <>
                <Text style={styles.matchSectionLabel}>{radarLoads.length} open loads in range</Text>
                {radarLoads.map(({ truckId, match }) => renderCargoMatch(match, truckId))}
              </>
            )}
          </Card>
        </>
      )}

      {/* Post cargo */}
      <Card variant="outlined" style={{ marginTop: Spacing.md }}>
        <Text style={styles.postTitle}>Ship something?</Text>
        <Text style={styles.postSub}>
          Post cargo and we'll match the right truck — including return loads so trucks never travel empty.
        </Text>
        <Button
          title="Post Cargo"
          fullWidth
          onPress={() => setPostOpen(true)}
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      {/* Post Cargo Modal */}
      <Modal visible={postOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Cargo</Text>
              <TouchableOpacity onPress={() => setPostOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Field label="Shipper name" value={form.shipperName} onChange={t => setForm({ ...form, shipperName: t })} placeholder="Company or your name" />
            <Field label="Cargo" value={form.cargoType} onChange={t => setForm({ ...form, cargoType: t })} placeholder="e.g. maize, cement, coffee" />
            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Weight (tonnes)" value={form.weightTonnes} onChange={t => setForm({ ...form, weightTonnes: t })} placeholder="e.g. 18" numeric />
              </View>
              <View style={styles.half}>
                <Field label="Fee offer (USD)" value={form.offeredFee} onChange={t => setForm({ ...form, offeredFee: t })} placeholder="e.g. 450" numeric />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Pickup → Dropoff</Text>
            <View style={styles.row}>
              <View style={styles.half}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {EAC_TOWNS.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, form.pickup === t && styles.chipActive]}
                      onPress={() => setForm({ ...form, pickup: t })}
                    >
                      <Text style={styles.chipText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.half}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {EAC_TOWNS.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, form.dropoff === t && styles.chipActive, t === form.pickup && styles.chipDisabled]}
                      onPress={() => t !== form.pickup && setForm({ ...form, dropoff: t })}
                    >
                      <Text style={styles.chipText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Border crossing</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {BORDERS.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, form.border === b && styles.chipActive]}
                  onPress={() => setForm({ ...form, border: b })}
                >
                  <Text style={styles.chipText}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Field label="Phone" value={form.phone} onChange={t => setForm({ ...form, phone: t })} placeholder="+256..." />

            <Button
              title="Post Cargo"
              fullWidth
              loading={loading}
              disabled={!form.cargoType.trim() || !parseFloat(form.weightTonnes) || isNaN(parseFloat(form.offeredFee)) || form.pickup === form.dropoff}
              onPress={submitCargo}
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({
  label, value, onChange, placeholder, numeric,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <View style={{ marginTop: Spacing.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={numeric ? (Platform.OS === 'ios' ? 'decimal-pad' : 'numeric') : 'default'}
      />
    </View>
  );
}

function feeLabel(fee: number, currency: string) {
  if (currency === 'USD') return `$${fee}`;
  return `${currency} ${fee.toLocaleString()}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  voiceHint: { fontSize: FontSize.sm, color: Colors.textSecondary },

  modeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginTop: Spacing.md,
  },
  modeChip: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  modeChipActive: { backgroundColor: Colors.primary },
  modeText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  modeTextActive: { color: Colors.textOnPrimary },

  notice: { fontSize: FontSize.sm, color: Colors.textOnPrimary, fontWeight: '600' },
  loading: { fontSize: FontSize.sm, color: Colors.textMuted, paddingVertical: Spacing.lg, textAlign: 'center' },
  sectionSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.md, marginBottom: Spacing.sm },

  truckHeader: { flexDirection: 'row' },
  truckLeft: { flex: 1 },
  truckCompany: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  truckMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  verified: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.success, marginTop: Spacing.xs },
  unverified: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.warning, marginTop: Spacing.xs },

  matchSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  matchMain: { flex: 1, marginRight: Spacing.sm },
  matchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  matchTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  matchMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  reasons: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  matchBtn: { marginLeft: Spacing.xs },
  score: { borderRadius: Radius.sm, paddingVertical: 2, paddingHorizontal: Spacing.sm },
  scoreText: { fontSize: FontSize.xs, fontWeight: '800' },
  noMatch: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.sm },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: Spacing.sm },
  kpiTile: {
    width: '48.5%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  kpiDot: { width: 8, height: 8, borderRadius: 4 },
  kpiValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xs },
  kpiLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  utilRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  utilPlate: { width: 64, fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  utilTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  utilFill: { height: '100%', borderRadius: 4 },
  utilPct: { width: 36, textAlign: 'right', fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },

  haulBlock: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.sm },

  postTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  postSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  modalClose: { fontSize: FontSize.xl, color: Colors.textMuted },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  chip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.xs,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipDisabled: { opacity: 0.35 },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, },
});
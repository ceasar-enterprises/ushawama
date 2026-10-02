import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { VoiceButton } from '../components/VoiceButton';
import { calculateDuty, quickEstimate, DutyResult, QuickEstimate } from '../core/duty';

type Props = { navigation: any };

const COUNTRIES = [
  { code: 'UG', label: 'Uganda' },
  { code: 'KE', label: 'Kenya' },
  { code: 'TZ', label: 'Tanzania' },
  { code: 'RW', label: 'Rwanda' },
  { code: 'BI', label: 'Burundi' },
  { code: 'SS', label: 'S. Sudan' },
  { code: 'CD', label: 'DRC' },
];

const BORDERS = ['Busia', 'Malaba', 'Namanga', 'Suam', 'Moyale'];

export default function DutyCalculatorScreen({ navigation }: Props) {
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [origin, setOrigin] = useState('UG');
  const [destination, setDestination] = useState('KE');
  const [border, setBorder] = useState('Busia');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DutyResult | null>(null);
  const [estimate, setEstimate] = useState<QuickEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    if (!product.trim()) {
      setError('Enter a product name to calculate duty.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setEstimate(null);
    try {
      const qty = parseFloat(quantity) || 1;
      const price = parseFloat(unitPrice) || 0;

      if (price > 0) {
        // Full calculation with price
        const res = await calculateDuty({
          productDescription: product.trim(),
          quantity: qty,
          unit: 'kg',
          unitPriceUSD: price,
          origin,
          destination,
          border: border.toUpperCase(),
          tradeRegime: 'formal',
        });
        setResult(res);
      } else {
        // Quick estimate (no price provided)
        const est = await quickEstimate(product.trim(), destination, origin);
        setEstimate(est);
      }
    } catch (e: any) {
      setError(e?.message || 'Calculation failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [product, quantity, unitPrice, origin, destination, border]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Voice input */}
        <Card variant="filled" compact>
          <View style={styles.voiceRow}>
            <VoiceButton
              text={`Tell me what you want to import. For example: I am bringing ${quantity || '10'} bags of maize from ${origin} to ${destination}`}
              variant="speak"
              size="sm"
            />
            <Text style={styles.voiceHint}>Say what you want to check</Text>
          </View>
        </Card>

        {/* Product */}
        <Text style={styles.label}>What are you trading?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Maize, Beans, Cassava..."
          placeholderTextColor={Colors.textMuted}
          value={product}
          onChangeText={setProduct}
        />

        {/* Quantity + Price */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Unit Price (USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 250"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={unitPrice}
              onChangeText={setUnitPrice}
            />
          </View>
        </View>

        {/* Origin */}
        <Text style={styles.label}>Origin</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {COUNTRIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[styles.chip, origin === c.code && styles.chipActive]}
              onPress={() => setOrigin(c.code)}
            >
              <Text style={[styles.chipText, origin === c.code && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Destination */}
        <Text style={styles.label}>Destination</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {COUNTRIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[styles.chip, destination === c.code && styles.chipActive]}
              onPress={() => setDestination(c.code)}
            >
              <Text style={[styles.chipText, destination === c.code && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Border */}
        <Text style={styles.label}>Border crossing</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {BORDERS.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.chip, border === b && styles.chipActive]}
              onPress={() => setBorder(b)}
            >
              <Text style={[styles.chipText, border === b && styles.chipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Calculate */}
        <Button
          title={loading ? 'Calculating...' : 'Calculate Duty'}
          onPress={calculate}
          fullWidth
          loading={loading}
          style={{ marginTop: Spacing.xl }}
        />

        {/* Error */}
        {error && (
          <Card compact variant="filled" accentColor={Colors.error} style={{ marginTop: Spacing.xl }}>
            <Text style={styles.error}>{error}</Text>
          </Card>
        )}

        {/* Quick Estimate (no price) */}
        {estimate && (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={styles.resultTitle}>Quick Estimate</Text>
            <Card variant="elevated">
              <Text style={styles.resultProduct}>{estimate.product}</Text>
              {estimate.hsCode && (
                <Text style={styles.resultHs}>HS {estimate.hsCode} · {estimate.hsDescription}</Text>
              )}
              <View style={styles.divider} />
              {estimate.dutyRate && <Row label="Duty Rate" value={estimate.dutyRate} bold color={Colors.secondary} />}
              {estimate.vatRate && <Row label="VAT Rate" value={estimate.vatRate} bold />}
              {estimate.message && <Text style={styles.estimateMsg}>{estimate.message}</Text>}
              {estimate.note && <Text style={styles.estimateNote}>{estimate.note}</Text>}
            </Card>
            <Text style={styles.priceHint}>
              Add a unit price above to get a full landed-cost breakdown.
            </Text>
          </View>
        )}

        {/* Full Result */}
        {result && (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={styles.resultTitle}>Cost Breakdown</Text>
            <Card variant="elevated">
              <Text style={styles.resultProduct}>{result.product}</Text>
              <Text style={styles.resultHs}>HS {result.hsCode} · {result.hsDescription}</Text>
              {result.isIntraEAC && (
                <View style={styles.eacBadge}>
                  <Text style={styles.eacBadgeText}>Intra-EAC · Preferential Rate</Text>
                </View>
              )}
              <View style={styles.divider} />
              <Row label="CIF Value" value={`$${result.cifValue.toFixed(2)}`} bold />
              <Row label={`Customs Duty (${result.dutyRate})`} value={`$${result.fees.customsDuty.toFixed(2)}`} />
              <Row label={`VAT (${result.vatRate})`} value={`$${result.fees.vat.toFixed(2)}`} />
              <Row label="Inspection" value={`$${result.fees.inspection}`} />
              <Row label="Documentation" value={`$${result.fees.documentation}`} />
              <Row label="Certificate of Origin" value={`$${result.fees.certificateOfOrigin}`} />
              {result.fees.spsCertificate > 0 && (
                <Row label="SPS Certificate" value={`$${result.fees.spsCertificate}`} />
              )}
              {result.isSTR && (
                <View style={styles.strBadge}>
                  <Text style={styles.strBadgeText}>Simplified Trade Regime — reduced fees</Text>
                </View>
              )}
              <View style={styles.divider} />
              <Row
                label="Total Fees"
                value={`$${result.fees.total.toFixed(2)}`}
                bold
                color={Colors.secondary}
              />
              <View style={styles.divider} />
              <Row
                label="TOTAL LANDED COST"
                value={`$${result.totalLandedCost.toFixed(2)}`}
                bold
                color={Colors.primary}
                large
              />
              <Text style={styles.perUnit}>${result.totalPerUnit.toFixed(2)} per {result.unit}</Text>
            </Card>

            {result.warnings.map((w: any, i: number) => (
              <Card key={i} compact variant="filled" accentColor={Colors.warning}>
                <Text style={styles.warning}>{w.message}</Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({
  label,
  value,
  bold,
  color,
  large,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
  large?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && rowStyles.bold]}>{label}</Text>
      <Text
        style={[
          rowStyles.value,
          bold && rowStyles.bold,
          color && { color },
          large && rowStyles.large,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  value: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500', textAlign: 'right' },
  bold: { fontWeight: '700' },
  large: { fontSize: FontSize.xl },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  voiceHint: { fontSize: FontSize.sm, color: Colors.textSecondary },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfField: { flex: 1 },
  chipScroll: { marginBottom: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  chipTextActive: { color: Colors.textOnPrimary },
  resultTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  resultProduct: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  resultHs: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm },
  warning: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '500' },
  error: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '500' },
  estimateMsg: { fontSize: FontSize.md, color: Colors.textPrimary, marginTop: Spacing.sm },
  estimateNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, fontStyle: 'italic' },
  priceHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, fontStyle: 'italic' },
  eacBadge: { backgroundColor: Colors.success + '18', borderRadius: Radius.sm, paddingVertical: 3, paddingHorizontal: Spacing.sm, marginTop: Spacing.xs, alignSelf: 'flex-start' },
  eacBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.success },
  strBadge: { backgroundColor: Colors.info + '18', borderRadius: Radius.sm, paddingVertical: 3, paddingHorizontal: Spacing.sm, marginTop: Spacing.sm, alignSelf: 'flex-start' },
  strBadgeText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.info },
  perUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'right' },
});

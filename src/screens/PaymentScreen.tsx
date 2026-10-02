import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { usePayment } from '../payment';
import { PaymentProvider, Currency } from '../payment';
import { PROVIDER_CONFIG } from '../payment';

type Props = { navigation: any; route: any };

export default function PaymentScreen({ route }: Props) {
  const params: any = route.params || {};
  const { product, amount, currency, matchId, payerPhone, payeePhone } = params;

  const { pay, loading, error, releaseEscrow, refund, formatMoney, convert } = usePayment();

  const [provider, setProvider] = useState<PaymentProvider>('mtn_momo');
  const [escrow, setEscrow] = useState(true);
  const [txnId, setTxnId] = useState<string | null>(null);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);

  const usdEquivalent = convert(amount || 0, (currency as Currency) || 'USD', 'USD');

  const handlePay = useCallback(async () => {
    const txn = await pay({
      amount,
      currency: (currency as Currency) || 'USD',
      provider,
      payerPhone: payerPhone || '+256701234567',
      payeePhone: payeePhone || '+254700111222',
      matchId,
      reference: `ushawama_${matchId || 'direct'}_${Date.now()}`,
      escrow,
    });
    if (txn) {
      setTxnId(txn.id);
      setEscrowId(txn.escrowId || null);
      setEscrowStatus('funded');
    }
  }, [pay, amount, currency, provider, matchId, payerPhone, payeePhone, escrow]);

  const handleRelease = useCallback(async () => {
    if (!escrowId) return;
    await releaseEscrow(escrowId);
    setEscrowStatus('released');
  }, [escrowId, releaseEscrow]);

  const handleRefund = useCallback(async () => {
    if (!escrowId) return;
    await refund(escrowId);
    setEscrowStatus('refunded');
  }, [escrowId, refund]);

  // A4 — reading the receipt aloud: every high moment is a literacy moment.
  const speakReceipt = useCallback(() => {
    Speech.stop();
    const money = formatMoney(amount || 0, (currency as Currency) || 'USD');
    const what = product || 'your order';
    let msg: string;
    if (escrowStatus === 'released') {
      msg = `Good news. ${money} was released to the seller for ${what}. Reference ${txnId?.slice(0, 8)}.`;
    } else if (escrowStatus === 'refunded') {
      msg = `${money} was refunded to your mobile money wallet for ${what}. Reference ${txnId?.slice(0, 8)}.`;
    } else if (txnId) {
      msg = escrow
        ? `${money} is now held safely in escrow for ${what}, until you confirm you received the goods. Reference ${txnId?.slice(0, 8)}.`
        : `Payment of ${money} sent for ${what}. Reference ${txnId?.slice(0, 8)}.`;
    } else {
      return;
    }
    Speech.speak(msg, { language: 'en', rate: 0.95 });
  }, [amount, currency, escrow, escrowStatus, formatMoney, product, txnId]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Order summary */}
      <Text style={styles.title}>Secure Payment</Text>
      <Card variant="elevated" accentColor={Colors.primary}>
        <Text style={styles.product}>{product || 'Trade payment'}</Text>
        <View style={styles.divider} />
        <Row label="Amount" value={formatMoney(amount || 0, (currency as Currency) || 'USD')} bold />
        <Row label="≈ USD" value={formatMoney(usdEquivalent, 'USD')} />
        <Row label="Match" value={matchId?.slice(0, 8) || 'Direct'} />
      </Card>

      {/* Provider */}
      <Text style={styles.section}>Payment Method</Text>
      <Card variant="outlined">
        {(['mtn_momo', 'airtel_money', 'tigo_pesa', 'bank_transfer', 'cash'] as PaymentProvider[]).map(p => {
          const cfg = PROVIDER_CONFIG[p];
          const active = provider === p;
          return (
            <TouchableOpacity
              key={p}
              style={[styles.providerRow, active && styles.providerActive]}
              onPress={() => setProvider(p)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{cfg.name}</Text>
                <Text style={styles.providerRegions}>{cfg.regions.join(', ')}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]} />
            </TouchableOpacity>
          );
        })}
      </Card>

      {/* Escrow toggle */}
      <Card variant="filled">
        <TouchableOpacity
          style={styles.escrowRow}
          onPress={() => setEscrow(!escrow)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.escrowTitle}>
              {escrow ? 'Escrow enabled' : 'Escrow disabled'}
            </Text>
            <Text style={styles.escrowSub}>
              Money is held until you confirm goods received. {escrow ? 'Both sides protected.' : 'Relies on trust.'}
            </Text>
          </View>
          <View style={[styles.toggle, escrow && styles.toggleOn]}>
            <View style={[styles.toggleKnob, escrow && styles.toggleKnobOn]} />
          </View>
        </TouchableOpacity>
      </Card>

      {error && (
        <Card compact variant="filled" accentColor={Colors.error}>
          <Text style={styles.error}>{error}</Text>
        </Card>
      )}

      {/* Pay button */}
      {!txnId && (
        <Button
          title={`Pay ${formatMoney(amount || 0, (currency as Currency) || 'USD')}`}
          onPress={handlePay}
          fullWidth
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.xl }}
        />
      )}

      {/* Escrow lifecycle */}
      {txnId && escrow && (
        <Card
          variant="elevated"
          accentColor={escrowStatus === 'released' ? Colors.success : Colors.secondary}
          style={{ marginTop: Spacing.xl }}
        >
          <Text style={styles.escrowTitle}>
            {escrowStatus === 'released'
              ? 'Released to seller'
              : escrowStatus === 'refunded'
              ? 'Refunded to buyer'
              : 'Funds in escrow'}
          </Text>
          <Text style={styles.escrowSub}>Reference: {txnId.slice(0, 14)}</Text>

          <View style={styles.flowTimeline}>
            <FlowStep done label="Funded" />
            <FlowStep done={escrowStatus !== null && ['released', 'refunded'].includes(escrowStatus)} label="Goods delivered" />
            <FlowStep done={escrowStatus === 'released'} label="Released" />
          </View>

          <TouchableOpacity style={styles.readButton} onPress={speakReceipt} activeOpacity={0.7}>
            <Text style={styles.readButtonText}>Listen to my receipt</Text>
          </TouchableOpacity>

          {escrowStatus !== 'released' && escrowStatus !== 'refunded' && (
            <>
              <Button
                title="✓ I received the goods — release"
                onPress={handleRelease}
                fullWidth
                variant="primary"
                style={{ marginTop: Spacing.md }}
              />
              <Button
                title="Dispute / refund"
                onPress={handleRefund}
                fullWidth
                variant="outline"
                style={{ marginTop: Spacing.sm }}
              />
            </>
          )}
        </Card>
      )}

      {txnId && !escrow && (
        <Card variant="elevated" accentColor={Colors.success} style={{ marginTop: Spacing.xl }}>
          <Text style={styles.escrowTitle}>Payment sent</Text>
          <Text style={styles.escrowSub}>Reference: {txnId.slice(0, 14)}</Text>
          <TouchableOpacity style={styles.readButton} onPress={speakReceipt} activeOpacity={0.7}>
            <Text style={styles.readButtonText}>Listen to my receipt</Text>
          </TouchableOpacity>
        </Card>
      )}
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary },
  value: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' },
  bold: { fontWeight: '800', fontSize: FontSize.lg, color: Colors.primary },
});

function FlowStep({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.flowStep}>
      <View style={[styles.flowDot, done && styles.flowDotDone]}>
        <Text style={styles.flowDotText}>{done ? '✓' : ''}</Text>
      </View>
      <Text style={[styles.flowLabel, done && styles.flowLabelDone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  product: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: Spacing.sm },
  section: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.sm },

  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  providerActive: { backgroundColor: Colors.primary + '08' },
  providerName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  providerRegions: { fontSize: FontSize.xs, color: Colors.textMuted },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },

  escrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  escrowTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  escrowSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: Colors.border, padding: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surface },
  toggleKnobOn: { transform: [{ translateX: 20 }] },

  error: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '500' },

  flowTimeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg },
  flowStep: { alignItems: 'center', flex: 1 },
  flowDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowDotDone: { backgroundColor: Colors.success },
  flowDotText: { color: Colors.textOnPrimary, fontWeight: '800', fontSize: FontSize.sm },
  flowLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  flowLabelDone: { color: Colors.success, fontWeight: '600' },

  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '0d',
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  readButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});
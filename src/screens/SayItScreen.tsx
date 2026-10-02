/**
 * SayItScreen — "Say it, get it done" voice demo surface (Phase 1 exit)
 * Mic -> STT (web SpeechRecognition on Chrome; Whisper path on native)
 *     -> spine NLU (/api/voice/parse, gemini) or local regex fallback
 *     -> trade engine action (post listing / find buyers+sellers) -> TTS reply.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow, Vapor } from '../theme';
import { useVoice } from '../voice/useVoice';
import { ParsedCommand, VoiceLanguage } from '../voice/engine';
import { TradeMatchEngine, Listing } from '../trade/engine';

const DEMO_USER = 'demo-trader';

function parseQty(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export function SayItScreen() {
  const [lang, setLang] = useState<VoiceLanguage>('en');
  const [last, setLast] = useState<ParsedCommand | null>(null);
  const [reply, setReply] = useState<string>('');
  const [results, setResults] = useState<Listing[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const transcriptRef = useRef('');
  const tradeRef = useRef<TradeMatchEngine | null>(null);

  const { state, transcript, startListening, stopListening, speak, setLanguage, error, processTranscript } = useVoice({
    language: lang,
    onTranscript: (t) => {
      transcriptRef.current = t;
    },
    onCommand: (cmd) => {
      handleCommand(cmd as ParsedCommand);
    },
  });

  // ── Seed a tiny demo marketplace once ──

  useEffect(() => {
    (async () => {
      const engine = new TradeMatchEngine();
      tradeRef.current = engine;
      await engine.init();
      const existing = await engine.getListings();
      if (existing.length === 0) {
        await engine.createListing(DEMO_USER, {
          role: 'buyer',
          product: 'maize',
          quantity: 120,
          unit: 'kg',
          pricePerUnit: 1.2,
          currency: 'USD',
          location: 'Busia',
          country: 'KE',
          border: 'BUSIA',
          phone: '0700000001',
          description: 'Buying maize for Nairobi resale',
        });
        await engine.createListing(DEMO_USER, {
          role: 'seller',
          product: 'maize',
          quantity: 200,
          unit: 'kg',
          pricePerUnit: 1.0,
          currency: 'USD',
          location: 'Mbale',
          country: 'UG',
          border: 'BUSIA',
          phone: '0700000002',
          description: 'Mountain maize from Mbale',
        });
        await engine.createListing(DEMO_USER, {
          role: 'buyer',
          product: 'beans',
          quantity: 80,
          unit: 'kg',
          pricePerUnit: 1.5,
          currency: 'USD',
          location: 'Kampala',
          country: 'UG',
          border: 'MALABA',
          phone: '0700000003',
          description: 'Looking for beans suppliers',
        });
      }
    })();
  }, []);

  // ── Command -> action -> TTS reply ──

  const say = useCallback(
    async (text: string) => {
      setReply(text);
      await speak(text);
    },
    [speak],
  );

  const handleCommand = useCallback(
    async (cmd: ParsedCommand) => {
      setLast(cmd);
      setBusy(true);
      setResults([]);
      try {
        const engine = tradeRef.current;
        const text = transcriptRef.current;
        const sw = lang === 'sw';

        if (cmd.type === 'post_product') {
          const qty = parseQty(cmd.quantity);
          const product = cmd.product || 'product';
          if (!engine) return;
          const listing = await engine.createListing(DEMO_USER, {
            role: 'seller',
            product,
            quantity: qty || 10,
            unit: 'kg',
            pricePerUnit: 1.0,
            currency: 'USD',
            location: 'Nairobi',
            country: 'KE',
            border: 'BUSIA',
            phone: '0700000000',
            description: `Posted by voice${text ? `: ${text}` : ''}`,
          });
          const all = await engine.getMatches(DEMO_USER);
          const fresh = all.filter((m) => m.sellerListingId === listing.id);
          setMatchCount(fresh.length);
          await say(
            sw
              ? `Imefanyika. ${product} kilo ${qty || 10} zimeorodheshwa. ${fresh.length} mkabaila umepatikana.`
              : `Done. ${qty || 10}kg of ${product} posted at Busia. ${fresh.length} match${fresh.length === 1 ? '' : 'es'} found.`,
          );
          return;
        }

        if (cmd.type === 'find_buyer' || cmd.type === 'find_seller') {
          if (!engine) return;
          const role = cmd.type === 'find_buyer' ? 'buyer' : 'seller';
          const product = cmd.product || text || '';
          const listings = await engine.getListings({ product, role });
          setResults(listings);
          setMatchCount(listings.length);
          if (listings.length === 0) {
            await say(
              sw
                ? `Sikupata ${role === 'buyer' ? 'wanunuzi' : 'wauzaji'} wa ${product}. Jaribu bidhaa nyingine.`
                : `No ${role}s looking for ${product}${product ? '' : ' yet'}. Try another product.`,
            );
          } else {
            await say(
              sw
                ? `Nimepata ${listings.length} ${role === 'buyer' ? 'wanunuzi' : 'wauzaji'} wa ${product}.`
                : `Found ${listings.length} ${role}s for ${product}.`,
            );
          }
          return;
        }

        if (cmd.type === 'duty_check') {
          await say(
            sw
              ? `Kodi inahesabiwa kwenye Duty Check. Sema "kodi ya mahindi" huko.`
              : `Duty is calculated on the Duty tab. Say "check duty for rice" there for a figure.`,
          );
          return;
        }

        if (cmd.type === 'track_cargo') {
          await say(
            sw
              ? `Nafuatilia shehena. Fungua Live Tracking kuona wapi iko.`
              : `I can track cargo. Open Live Tracking to see where it is.`,
          );
          return;
        }

        if (cmd.type === 'help') {
          await say(
            sw
              ? `Jaribu: "nina mahindi kilo 50 Nairobi", au "nani ananunua maharage Busia".`
              : `Try: "I have 50kg of maize to sell in Nairobi", or "who is buying beans at Busia?".`,
          );
          return;
        }

        await say(
          sw
            ? `Nimesikia "${text}". Ningependa uliseme tofauti kidogo.`
            : `I heard: "${text || 'nothing yet'}". Could you say that differently?`,
        );
      } finally {
        setBusy(false);
      }
    },
    [lang, say],
  );

  // ── Mic loop ──

  useEffect(() => {
    if (state === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const handleMic = async () => {
    if (state === 'listening') {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const [typed, setTyped] = useState('');
  const submitTyped = useCallback(async () => {
    const text = typed.trim();
    if (!text || state === 'processing') return;
    setTyped('');
    transcriptRef.current = text;
    await processTranscript(text);
  }, [typed, state, processTranscript]);

  const pickLanguage = (l: VoiceLanguage) => {
    setLang(l);
    setLanguage(l);
  };

  const stateLabel =
    state === 'listening'
      ? lang === 'sw'
        ? 'Nasikiliza... sema sasa'
        : 'Listening... speak now'
      : state === 'processing'
        ? lang === 'sw'
          ? 'Nakuelewa...'
          : 'Understanding...'
        : state === 'speaking'
          ? lang === 'sw'
            ? 'Nazungumza...'
            : 'Speaking...'
          : lang === 'sw'
            ? 'Gonga na useme'
            : 'Tap the mic and speak';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Say It</Text>
        <Text style={styles.subtitle}>
          {lang === 'sw'
            ? 'Sema unachohitaji — tunafanya yote.'
            : 'Speak what you need — we do the rest.'}
        </Text>

        <View style={styles.langRow}>
          {(['en', 'sw'] as VoiceLanguage[]).map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => pickLanguage(l)}
              style={[styles.langPill, lang === l && styles.langPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.langLabel, lang === l && styles.langLabelActive]}>
                {l === 'en' ? 'English' : 'Kiswahili'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleMic} activeOpacity={0.8} style={styles.micTouch}>
          <Animated.View
            style={[
              styles.micBtn,
              state === 'listening' && styles.micBtnActive,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.micIcon}>{state === 'speaking' ? '…' : '●'}</Text>
          </Animated.View>
        </TouchableOpacity>
        <Text style={[styles.stateLabel, state === 'listening' && styles.stateLabelActive]}>
          {state === 'error' ? error || 'Something went wrong' : stateLabel}
        </Text>
        {transcript ? (
          <Text style={styles.transcript} numberOfLines={2}>
            “{transcript}”
          </Text>
        ) : null}
      </View>

      {last && (
        <View style={[Vapor, styles.commandCard]}>
          <View style={styles.commandHeader}>
            <Text style={styles.commandType}>{last.type}</Text>
            <View style={[styles.badge, last.source === 'spine' ? styles.badgeSpine : styles.badgeLocal]}>
              <Text style={styles.badgeText}>
                {last.source === 'spine' ? 'SPINE' : 'LOCAL'}
              </Text>
            </View>
          </View>
          {'product' in last && last.product ? <Text style={styles.commandValue}>Product: {last.product}</Text> : null}
          {'quantity' in last && last.quantity ? <Text style={styles.commandValue}>Quantity: {last.quantity}</Text> : null}
          {busy ? <ActivityIndicator color={Colors.primary} style={styles.spinner} /> : null}
          {reply ? <Text style={styles.reply}>{reply}</Text> : null}
        </View>
      )}

      <View style={[Vapor, styles.typeRow]}>
        <TextInput
          style={styles.typeInput}
          value={typed}
          onChangeText={setTyped}
          placeholder={lang === 'sw' ? 'Au chapa hapa…' : 'Or type it instead…'}
          placeholderTextColor={Colors.textSecondary}
          onSubmitEditing={submitTyped}
          returnKeyType="send"
          enterKeyHint="send"
        />
        <TouchableOpacity
          onPress={submitTyped}
          disabled={!typed.trim() || state === 'processing'}
          style={[styles.sendBtn, (!typed.trim() || state === 'processing') && styles.sendBtnDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {matchCount} {last?.type === 'find_buyer' ? 'buyers' : 'sellers'}
          </Text>
          {results.slice(0, 3).map((l) => (
            <View key={l.id} style={[Vapor, styles.resultRow]}>
              <View style={styles.resultMain}>
                <Text style={styles.resultTitle}>
                  {l.role === 'buyer' ? 'Buyer' : 'Seller'} · {l.location}
                </Text>
                <Text style={styles.resultSub}>
                  {l.product} · {l.quantity}{l.unit} · {l.currency} {l.pricePerUnit}/{l.unit}
                </Text>
              </View>
              <View style={styles.borderChip}>
                <Text style={styles.borderChipText}>{l.border}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: {
    backgroundColor: Vapor.backgroundColor,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadow.md,
  },
  title: { fontSize: FontSize.hero, fontWeight: '800', color: Colors.primaryDark },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  langRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  langPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  langLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  langLabelActive: { color: Colors.textOnPrimary },
  micTouch: { marginTop: Spacing.xl },
  micBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  micBtnActive: { backgroundColor: Colors.error },
  micIcon: { fontSize: 34, color: Colors.textOnPrimary, marginTop: -2 },
  stateLabel: { marginTop: Spacing.md, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  stateLabelActive: { color: Colors.primary },
  transcript: { marginTop: Spacing.sm, fontSize: FontSize.md, color: Colors.textPrimary, fontStyle: 'italic', textAlign: 'center' },
  commandCard: { marginTop: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.lg },
  commandHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commandType: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  badgeSpine: { backgroundColor: Colors.success + '1A' },
  badgeLocal: { backgroundColor: Colors.border },
  badgeText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 0.5 },
  commandValue: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  spinner: { marginTop: Spacing.md },
  reply: { marginTop: Spacing.md, fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
    marginTop: Spacing.lg,
  },
  typeInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '800', marginTop: -2 },
  section: { marginTop: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultMain: { flex: 1, gap: 2 },
  resultTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  resultSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  borderChip: {
    backgroundColor: Colors.primaryLight + '1A',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  borderChipText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
});

export default SayItScreen;
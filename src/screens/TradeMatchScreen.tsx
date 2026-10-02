import React, { useState, useCallback } from 'react';
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
import { useTrade } from '../trade';

const USER_ID = 'u1'; // placeholder — replaced by auth

const FILTERS = ['All', 'Buyers', 'Sellers', 'My Listings', 'Matches'];
const CURRENCIES = ['USD', 'UGX', 'KES', 'TZS', 'RWF'];

export default function TradeMatchScreen({ navigation }: any) {
  const { listings, matches, loading, error, refresh, postListing } = useTrade(USER_ID);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [postOpen, setPostOpen] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  // Post form state
  const [form, setForm] = useState({
    role: 'seller',
    product: '',
    quantity: '',
    pricePerUnit: '',
    currency: 'USD',
    location: '',
    border: 'Busia',
    phone: '',
  });

  const filtered = useCallback(() => {
    if (showMatches) return [];
    // My listings
    if (filter === 'My Listings') {
      return listings.filter(l => l.userId === USER_ID);
    }
    let ls = listings;
    if (filter === 'Buyers') ls = ls.filter(l => l.role === 'buyer');
    if (filter === 'Sellers') ls = ls.filter(l => l.role === 'seller');
    if (search) {
      const q = search.toLowerCase();
      ls = ls.filter(l => l.product.toLowerCase().includes(q));
    }
    return ls;
  }, [filter, search, listings, showMatches]);

  const submitPost = useCallback(async () => {
    const product = form.product.trim();
    const quantity = parseFloat(form.quantity);
    const pricePerUnit = parseFloat(form.pricePerUnit);
    if (!product || !quantity || isNaN(pricePerUnit)) {
      return; // disable button when invalid
    }
    const created = await postListing({
      role: form.role as 'buyer' | 'seller',
      product,
      quantity,
      pricePerUnit,
      currency: form.currency,
      location: form.location,
      country: form.role === 'seller' ? 'UG' : 'KE',
      border: form.border,
      phone: form.phone,
    });
    if (created) {
      setPostOpen(false);
      setForm({ role: 'seller', product: '', quantity: '', pricePerUnit: '', currency: 'USD', location: '', border: 'Busia', phone: '' });
    }
  }, [form, postListing]);

  const visible: any[] = showMatches ? matches : filtered();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Voice CTA */}
      <Card variant="filled" compact>
        <View style={styles.voiceRow}>
          <VoiceButton
            text="You are on the Ushawama marketplace. Say: I want to sell maize, or find buyers for beans."
            variant="speak"
            size="sm"
          />
          <Text style={styles.voiceHint}>Say what you need to buy or sell</Text>
        </View>
      </Card>

      {/* Trucks & Cargo */}
      <Card variant="outlined" compact style={styles.truckCard}>
        <TouchableOpacity
          style={styles.truckCardRow}
          onPress={() => navigation.navigate('Trucking')}
          activeOpacity={0.7}
        >
          <View style={styles.truckCardLeft}>
            <Text style={styles.truckCardTitle}>Trucks & Cargo</Text>
            <Text style={styles.truckCardSub}>
              Move your goods — match a truck, or find return-load cargo after dropoff.
            </Text>
          </View>
          <Text style={styles.truckCardArrow}>→</Text>
        </TouchableOpacity>
      </Card>

      {/* Search */}
      {!showMatches && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search products (maize, beans, fish...)"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && !showMatches && styles.filterActive]}
              onPress={() => { setFilter(f); setShowMatches(f === 'Matches'); }}
            >
              <Text style={[styles.filterText, filter === f && !showMatches && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Error */}
      {error && (
        <Card compact variant="filled" accentColor={Colors.error}>
          <Text style={styles.error}>{error}</Text>
        </Card>
      )}

      {loading ? (
        <Text style={styles.loading}>Loading marketplace...</Text>
      ) : (
        <>
          <Text style={styles.resultCount}>
            {showMatches ? `${visible.length} active matches` : `${visible.length} listings`}
          </Text>

          {visible.length === 0 && (
            <Card variant="outlined" style={{ marginTop: Spacing.md }}>
              <Text style={styles.emptyTitle}>
                {showMatches ? 'No matches yet' : 'No listings yet'}
              </Text>
              <Text style={styles.emptySub}>
                {showMatches
                  ? 'Post a product and Ushawama will match you with buyers or sellers automatically.'
                  : 'Be the first to post a listing in this marketplace.'}
              </Text>
            </Card>
          )}

          {/* Listings */}
          {!showMatches &&
            visible.map(listing => (
              <Card key={listing.id} variant="default">
                <View style={styles.listingRow}>
                  <View style={styles.listingLeft}>
                    <View style={styles.listingHeader}>
                      <View
                        style={[
                          styles.typeBadge,
                          listing.role === 'buyer' ? styles.buyerBadge : styles.sellerBadge,
                        ]}
                      >
                        <Text style={styles.typeBadgeText}>
                          {listing.role === 'buyer' ? 'WANTS' : 'HAS'}
                        </Text>
                      </View>
                      {listing.verified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>✓ Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.product}>{listing.product}</Text>
                    <Text style={styles.details}>
                      {listing.quantity} {listing.unit} · {listing.location}
                    </Text>
                    <Text style={styles.meta}>
                      {listing.border} · {formatAgo(listing.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.listingRight}>
                    <Text style={styles.price}>
                      {formatPrice(listing.pricePerUnit, listing.currency)}/per {listing.unit}
                    </Text>
                    <Button
                      title="Connect"
                      onPress={() => navigation.navigate('Payment', {
                        listingId: listing.id,
                        product: listing.product,
                        amount: listing.pricePerUnit * listing.quantity,
                        currency: listing.currency,
                        payeePhone: listing.phone,
                      })}
                      size="sm"
                      variant={listing.role === 'buyer' ? 'primary' : 'secondary'}
                      style={{ marginTop: Spacing.sm }}
                    />
                  </View>
                </View>
              </Card>
            ))}

          {/* Matches */}
          {showMatches &&
            visible.map(match => (
              <Card key={match.id} variant="default" accentColor={Colors.success}>
                <View style={styles.listingRow}>
                  <View style={styles.listingLeft}>
                    <View style={styles.listingHeader}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>MATCH</Text>
                      </View>
                      <Text style={styles.matchStatus}>{match.status}</Text>
                    </View>
                    <Text style={styles.product}>{match.product}</Text>
                    <Text style={styles.details}>
                      {match.quantity} kg · negotiated price
                    </Text>
                    <Text style={styles.meta}>{match.border} · {formatAgo(match.createdAt)}</Text>
                  </View>
                  <View style={styles.listingRight}>
                    <Text style={styles.price}>
                      {formatPrice(match.agreedPrice, match.currency)}
                    </Text>
                    <Button
                      title="Pay Securely"
                      onPress={() => navigation.navigate('Payment', {
                        matchId: match.id,
                        product: match.product,
                        amount: match.agreedPrice * match.quantity,
                        currency: match.currency,
                        payerPhone: '+256701234567',
                        payeePhone: '+254700111222',
                      })}
                      size="sm"
                      variant="primary"
                      style={{ marginTop: Spacing.sm }}
                    />
                  </View>
                </View>
              </Card>
            ))}
        </>
      )}

      {/* Post CTA */}
      <Card variant="outlined" style={{ marginTop: Spacing.md }}>
        <Text style={styles.postTitle}>Post Your Product or Need</Text>
        <Text style={styles.postSub}>
          Tell the market what you have or what you want. Matching is automatic.
        </Text>
        <Button
          title="Post Listing"
          onPress={() => setPostOpen(true)}
          fullWidth
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      {/* ── Post Listing Modal ── */}
      <Modal visible={postOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post a Listing</Text>
              <TouchableOpacity onPress={() => setPostOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Role toggle */}
            <View style={styles.roleToggle}>
              {(['seller', 'buyer'] as const).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
                  onPress={() => setForm({ ...form, role: r })}
                >
                  <Text style={[styles.roleText, form.role === r && styles.roleTextActive]}>
                    {r === 'seller' ? 'I have' : 'I want'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="Product" value={form.product} onChange={t => setForm({ ...form, product: t })} placeholder="e.g. maize" />
            <Field label="Quantity" value={form.quantity} onChange={t => setForm({ ...form, quantity: t })} placeholder="e.g. 500" numeric />

            <View style={styles.row}>
              <View style={styles.half}>
                <Field label="Price / unit" value={form.pricePerUnit} onChange={t => setForm({ ...form, pricePerUnit: t })} placeholder="e.g. 1.8" numeric />
              </View>
              <View style={styles.half}>
                <Text style={styles.fieldLabel}>Currency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CURRENCIES.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.currencyChip, form.currency === c && styles.currencyChipActive]}
                      onPress={() => setForm({ ...form, currency: c })}
                    >
                      <Text style={styles.currencyText}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Field label="Location" value={form.location} onChange={t => setForm({ ...form, location: t })} placeholder="e.g. Mbale" />

            <Text style={styles.fieldLabel}>Border crossing (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['Busia', 'Malaba', 'Namanga', 'Suam', 'Moyale'].map(b => (
                <TouchableOpacity
                  key={b}
                  style={[styles.currencyChip, form.border === b && styles.currencyChipActive]}
                  onPress={() => setForm({ ...form, border: b })}
                >
                  <Text style={styles.currencyText}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Field label="Phone" value={form.phone} onChange={t => setForm({ ...form, phone: t })} placeholder="+256..." />

            <Button
              title="Post Listing"
              onPress={submitPost}
              fullWidth
              loading={loading}
              disabled={!form.product.trim() || !parseFloat(form.quantity) || isNaN(parseFloat(form.pricePerUnit))}
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

function formatPrice(price: number, currency: string) {
  if (currency === 'USD') return `$${price.toFixed(2)}`;
  return `${currency} ${price.toLocaleString()}`;
}

function formatAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  voiceHint: { fontSize: FontSize.sm, color: Colors.textSecondary },

  truckCard: { marginTop: Spacing.md },
  truckCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  truckCardLeft: { flex: 1 },
  truckCardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  truckCardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  truckCardArrow: { fontSize: FontSize.xl, color: Colors.primary, fontWeight: '700' },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  filterRow: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  filterChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },
  filterActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: Colors.textOnPrimary },
  resultCount: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  loading: { fontSize: FontSize.sm, color: Colors.textMuted, paddingVertical: Spacing.lg, textAlign: 'center' },
  error: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '500' },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },

  listingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  listingLeft: { flex: 1, marginRight: Spacing.md },
  listingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  typeBadge: { borderRadius: Radius.sm, paddingVertical: 2, paddingHorizontal: Spacing.xs },
  buyerBadge: { backgroundColor: Colors.info + '20' },
  sellerBadge: { backgroundColor: Colors.secondary + '20' },
  typeBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textPrimary },
  verifiedBadge: { backgroundColor: Colors.success + '20', borderRadius: Radius.sm, paddingVertical: 2, paddingHorizontal: Spacing.xs },
  verifiedText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.success },
  matchStatus: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.success, textTransform: 'uppercase' },
  product: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  details: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs },

  listingRight: { alignItems: 'flex-end' },
  price: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },

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
  roleToggle: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.xs, marginBottom: Spacing.md },
  roleBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  roleBtnActive: { backgroundColor: Colors.primary },
  roleText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
  roleTextActive: { color: Colors.textOnPrimary },
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
  currencyChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.xs,
  },
  currencyChipActive: { backgroundColor: Colors.primary },
  currencyText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
});
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../theme';
import { Card } from '../components/Card';
import { useMarket, CURRENCY_NAMES } from '../market/useMarket';

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function openLink(link: string) {
  if (link) Linking.openURL(link).catch(() => {});
}

export default function MarketStatusScreen() {
  const { summary, loading, error, refresh } = useMarket();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const fx = summary?.fx;
  const watch = summary?.watch;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
      }
    >
      <Text style={styles.pageTitle}>Market &amp; News</Text>
      <Text style={styles.pageSub}>
        Live exchange rates and the latest market headlines for the East African corridor.
      </Text>

      {summary?.stale && (
        <Card compact variant="filled" accentColor={Colors.warning}>
          <Text style={styles.staleText}>Live feed temporarily unreachable — showing last cached snapshot.</Text>
        </Card>
      )}

      {/* ── FX rates ── */}
      <Text style={styles.sectionHeader}>Exchange Rates · 1 USD</Text>
      {fx ? (
        <Card variant="elevated" compact style={styles.card}>
          {(['KES', 'UGX', 'TZS', 'RWF'] as const).map(code => (
            <View key={code} style={styles.fxRow}>
              <View style={styles.fxLeft}>
                <View style={[styles.fxDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.fxCode}>{CURRENCY_NAMES[code]}</Text>
              </View>
              <Text style={styles.fxValue}>
                {code} {fx.rates[code]?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
            </View>
          ))}
          <Text style={styles.fxNote}>As of {fx.asOf ? new Date(fx.asOf).toISOString().slice(0, 16).replace('T', ' ') : '—'} UTC · source: open.er-api.com</Text>
        </Card>
      ) : (
        <Card compact variant="outlined" style={styles.card}>
          <Text style={styles.loadingText}>{loading ? 'Loading rates…' : 'Rates unavailable'}</Text>
        </Card>
      )}

      {/* ── Market Watch ── */}
      <Text style={styles.sectionHeader}>Market Watch</Text>
      {watch ? (
        <Card variant="filled" style={styles.watchCard}>
          <View style={styles.watchBadgeRow}>
            <Text style={styles.watchBadge}>PRICE WATCH</Text>
            <Text style={styles.watchWhen}>{timeAgo(watch.publishedAt)}</Text>
          </View>
          <Text style={styles.watchTitle}>{watch.title}</Text>
          <Text style={styles.watchMeta}>
            {watch.source} · {watch.publishedAt ? new Date(watch.publishedAt).toISOString().slice(0, 10) : ''}
          </Text>
          {watch.link ? (
            <TouchableOpacity onPress={() => openLink(watch.link ?? '')} activeOpacity={0.7} style={styles.readBtn}>
              <Text style={styles.readBtnText}>Read the article →</Text>
            </TouchableOpacity>
          ) : null}
        </Card>
      ) : (
        <Card compact variant="outlined" style={styles.card}>
          <Text style={styles.loadingText}>{loading ? 'Scanning headlines…' : 'No market watch yet'}</Text>
        </Card>
      )}

      {/* ── News ── */}
      <Text style={styles.sectionHeader}>Latest Market News</Text>
      {error && (
        <Card compact variant="filled" accentColor={Colors.error}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}
      {(summary?.news || []).length === 0 && !loading && !error && (
        <Card compact variant="outlined" style={styles.card}>
          <Text style={styles.loadingText}>No headlines yet.</Text>
        </Card>
      )}
      {(summary?.news || []).map((item, i) => (
        <Card key={`${i}`} compact variant="default" style={styles.card}>
          <TouchableOpacity
            onPress={() => openLink(item.link)}
            activeOpacity={0.7}
            style={styles.newsRow}
          >
            <View style={styles.newsTextWrap}>
              <Text style={styles.newsTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.newsMeta}>
                {item.source} · {timeAgo(item.publishedAt)}
              </Text>
            </View>
            <Text style={styles.newsArrow}>→</Text>
          </TouchableOpacity>
        </Card>
      ))}

      <Text style={styles.footer}>
        Sources: {summary?.sources?.join(' · ') || '—'} · Updated {summary?.updatedAt ? new Date(summary.updatedAt).toISOString().slice(0, 16).replace('T', ' ') : '—'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: Colors.textPrimary },
  pageSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.xs },
  staleText: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '600' },
  sectionHeader: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  card: { borderRadius: Radius.xl },
  fxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  fxLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fxDot: { width: 8, height: 8, borderRadius: 4 },
  fxCode: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  fxValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  fxNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted },
  errorText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '500' },
  watchCard: { borderRadius: Radius.xl },
  watchBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  watchBadge: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.secondary, letterSpacing: 1 },
  watchWhen: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)' },
  watchTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textOnPrimary, marginTop: Spacing.sm },
  watchMeta: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: Spacing.xs },
  readBtn: { alignSelf: 'flex-start', marginTop: Spacing.md, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  readBtnText: { color: Colors.textOnPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  newsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  newsTextWrap: { flex: 1 },
  newsTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  newsMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  newsArrow: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '700' },
  footer: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xl, lineHeight: 16 },
});
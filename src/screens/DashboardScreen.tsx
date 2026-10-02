import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Pressable,
  Platform,
  Linking,
  type ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, Vapor } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ProgressBar, LevelBadge } from '../components/ProgressBar';
import { VoiceButton } from '../components/VoiceButton';
import { useTrade } from '../trade/useTrade';
import { useMarket } from '../market/useMarket';

const TRUCK_PHOTO = require('../../assets/illustrations/truck-photo.jpg');

type DashboardProps = {
  navigation: any;
};

// Mock data — replaced with real store/service later
const USER_ID = 'u1'; // placeholder — replaced by auth

const TRADER = {
  name: 'Nalubega Sarah',
  phone: '+256 701 234 567',
  village: 'Busia Town',
  role: 'seller',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatPrice(amount: number, currency: string): string {
  if (currency === 'UGX') return `UGX ${Math.round(amount).toLocaleString()}`;
  if (currency === 'KES') return `KES ${Math.round(amount).toLocaleString()}`;
  if (currency === 'TZS') return `TZS ${Math.round(amount).toLocaleString()}`;
  if (currency === 'RWF') return `RWF ${Math.round(amount).toLocaleString()}`;
  return `$${amount.toFixed(2)}`;
}

const LITERACY = {
  currentLevel: 2,
  currentLevelName: 'Bei ya Bidhaa',
  completedLessons: 5,
  totalLessons: 14,
  totalHours: 12,
  nextLesson: 'Numbers and Money',
};

const ACTION_TILES = [
  { numeral: '01', value: 'Duty', label: 'CHECK', target: 'Duty', tint: 'rgba(2,119,189,0.10)', border: 'rgba(2,119,189,0.28)', dot: Colors.accent },
  { numeral: '02', value: 'Buyer', label: 'FIND', target: 'Trade', tint: 'rgba(21,101,192,0.10)', border: 'rgba(21,101,192,0.28)', dot: Colors.info },
  { numeral: '03', value: 'Lesson', label: 'MY READ', target: 'Learn', tint: 'rgba(255,143,0,0.12)', border: 'rgba(255,143,0,0.32)', dot: Colors.secondary },
  { numeral: '04', value: 'Product', label: 'POST', target: 'Trade', tint: 'rgba(11,79,58,0.10)', border: 'rgba(11,79,58,0.28)', dot: Colors.primary },
];

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>
        {initials || '•'}
      </Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }: DashboardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const { matches, listings, loading, error, refresh } = useTrade(USER_ID);
  const { summary: market, loading: marketLoading, refresh: marketRefresh } = useMarket();

  const myListings = listings.filter(l => l.userId === USER_ID && l.status === 'active');

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), marketRefresh()]);
    setRefreshing(false);
  };

  const heroTilt = useRef(new Animated.Value(0)).current;
  const heroRotate = heroTilt.interpolate({
    inputRange: [0, 1],
    outputRange: ['10deg', '26deg'],
  });
  const heroLift = heroTilt.interpolate({
    inputRange: [0, 1],
    outputRange: ['0px', '-7px'],
  });
  const tiltIn = () => {
    Animated.spring(heroTilt, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 }).start();
  };
  const tiltOut = () => {
    Animated.spring(heroTilt, { toValue: 0, useNativeDriver: true, friction: 5, tension: 90 }).start();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {/* ─── Large Title Header ─── */}
      <View style={styles.largeTitleRow}>
        <View style={styles.largeTitleCol}>
          <Text style={styles.largeTitle}>Karibu, Sarah</Text>
          <Text style={styles.largeTitleSub}>
            {TRADER.village} · {TRADER.role === 'seller' ? 'Seller' : 'Buyer'}
          </Text>
        </View>
        <Avatar name={TRADER.name} />
      </View>

      {/* ─── Hero Feature Card ─── */}
      <Card variant="filled" style={styles.heroCard}>
        <Pressable
          accessibilityLabel="Truck at the loading dock"
          onHoverIn={Platform.OS === 'web' ? tiltIn : undefined}
          onHoverOut={Platform.OS === 'web' ? tiltOut : undefined}
          style={styles.hero3D}
        >
          <View style={[styles.heroLayer, styles.layerBack]}>
            <Image source={TRUCK_PHOTO} style={styles.heroImg} resizeMode="cover" />
            <View style={styles.heroShade} />
          </View>
          <View style={[styles.heroLayer, styles.layerMid]}>
            <Image source={TRUCK_PHOTO} style={styles.heroImg} resizeMode="cover" />
            <View style={[styles.heroShade, styles.heroShadeMid]} />
          </View>
          <Animated.View
            style={[
              styles.heroLayer,
              styles.layerFront,
              {
                transform: [
                  { perspective: 900 },
                  { rotateX: heroRotate },
                  { translateY: heroLift },
                ],
              },
            ]}
          >
            <Image source={TRUCK_PHOTO} style={styles.heroImg} resizeMode="cover" />
          </Animated.View>
          <View style={styles.groundShadow} />
        </Pressable>
        <View style={styles.heroSheen} />
        <Text style={styles.heroTitle}>Busia · Malaba corridor</Text>
        <Text style={styles.heroPrompt}>What do you need today?</Text>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>Tap the mic or say “check duty”</Text>
        </View>
      </Card>

      {/* ─── Quick Actions — NEBULA KPI tiles ─── */}
      <Text style={styles.sectionHeader}>Quick Actions</Text>
      <Card variant="filled" compact style={styles.tilesCard}>
        <View style={styles.quickActions}>
          {ACTION_TILES.map(tile => (
            <TouchableOpacity
              key={tile.numeral}
              style={styles.nebulaTile}
              onPress={() => navigation.navigate(tile.target)}
              activeOpacity={0.6}
            >
              <View style={[styles.nebulaNum, { backgroundColor: tile.tint, borderColor: tile.border }]}>
                <View style={[styles.actionDot, { backgroundColor: tile.dot }]} />
                <Text style={[styles.nebulaNumText, { color: tile.dot }]}>{tile.numeral}</Text>
              </View>
              <Text style={styles.nebulaValue}>{tile.value}</Text>
              <Text style={styles.nebulaLabel}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* ─── Literacy Progress ─── */}
      <Text style={styles.sectionHeader}>My Reading Journey</Text>
      <Card
        variant="elevated"
        style={styles.iosCard}
        title={LITERACY.currentLevelName}
        subtitle={`Level ${LITERACY.currentLevel} of 5 · ${LITERACY.totalHours}h done`}
        onPress={() => navigation.navigate('Literacy')}
      >
        <View style={styles.literacyRow}>
          <ProgressBar
            progress={(LITERACY.completedLessons / LITERACY.totalLessons) * 100}
            color={Colors.level2}
            label={`${LITERACY.completedLessons}/${LITERACY.totalLessons} lessons`}
          />
          <View style={styles.literacyNext}>
            <Text style={styles.literacyNextLabel}>Next up</Text>
            <Text style={styles.literacyNextLesson}>{LITERACY.nextLesson}</Text>
          </View>
        </View>
        <View style={styles.levelBadges}>
          {[1, 2, 3, 4, 5].map(l => (
            <LevelBadge key={l} level={l} size="sm" completed={l < LITERACY.currentLevel} />
          ))}
        </View>
      </Card>

      {/* ─── Active Trades ─── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Active Trades</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Trade')}>
          <Text style={styles.seeAll}>See All ›</Text>
        </TouchableOpacity>
      </View>
      {myListings.length > 0 && (
        <Card compact variant="outlined" style={styles.iosCard}>
          <Text style={styles.myListingText}>
            You have {myListings.length} {myListings.length === 1 ? 'listing' : 'listings'} live
          </Text>
        </Card>
      )}
      {loading && matches.length === 0 && (
        <Card compact variant="outlined" style={styles.iosCard}>
          <Text style={styles.tradeStatus}>Checking for matches…</Text>
        </Card>
      )}
      {!loading && matches.length === 0 && (
        <Card compact variant="outlined" style={styles.iosCard}>
          <Text style={styles.emptyTradeTitle}>No active trades yet</Text>
          <Text style={styles.emptyTradeSub}>
            Post a product or find a buyer — we'll match you at your border.
          </Text>
          <Button
            title="Find a buyer"
            size="sm"
            onPress={() => navigation.navigate('Trade')}
            style={styles.emptyTradeBtn}
          />
        </Card>
      )}
      {matches.map(match => {
        const isSeller = match.buyerId === USER_ID;
        const dotted = {
          pending: Colors.warning,
          accepted: Colors.success,
          in_transit: Colors.info,
          delivered: Colors.success,
          disputed: Colors.error,
        }[match.status];
        const statusLabel = match.status === 'pending' ? 'Pending' : match.status.charAt(0).toUpperCase() + match.status.slice(1);
        return (
          <Card key={match.id} compact variant="default" style={styles.iosCard}>
            <View style={styles.tradeRow}>
              <View style={styles.tradeInfo}>
                <View style={styles.tradeStatusDot}>
                  <View style={[styles.dot, { backgroundColor: dotted }]} />
                  <Text style={styles.tradeStatus}>{statusLabel}</Text>
                </View>
                <Text style={styles.tradeProduct}>
                  {match.product} ({match.quantity} {match.quantity === 1 ? 'unit' : 'units'})
                </Text>
                <Text style={styles.tradeBuyer}>
                  {isSeller ? 'Seller match' : 'Buyer match'} · {match.border}
                </Text>
              </View>
              <View style={styles.tradeRight}>
                <Text style={styles.tradePrice}>{formatPrice(match.agreedPrice, match.currency)}</Text>
                <Text style={styles.tradeTime}>{timeAgo(match.createdAt)}</Text>
              </View>
            </View>
          </Card>
        );
      })}

      {/* ─── Market & News (live data) ─── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>Market & News</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Market')}>
          <Text style={styles.seeAll}>See All ›</Text>
        </TouchableOpacity>
      </View>

      {marketLoading && !market && (
        <Card compact variant="outlined" style={styles.iosCard}>
          <Text style={styles.tradeStatus}>Fetching live market…</Text>
        </Card>
      )}

      {market && (
        <>
          <Card compact variant="filled" style={styles.iosCard}>
            <Text style={styles.marketCardLabel}>Exchange Rates · 1 USD</Text>
            <View style={styles.fxStrip}>
              {(['KES', 'UGX', 'TZS', 'RWF'] as const).map(code => (
                <Text key={code} style={styles.fxCell}>
                  <Text style={styles.fxCode}>{code} </Text>
                  <Text style={styles.fxNum}>
                    {market.fx?.rates?.[code]?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </Text>
                </Text>
              ))}
            </View>
          </Card>

          {market.watch?.title && (
            <Card compact variant="default" style={styles.iosCard}>
              <TouchableOpacity
                onPress={() => market.watch?.link && Linking.openURL(market.watch.link).catch(() => {})}
                activeOpacity={0.7}
              >
                <Text style={styles.marketWatchBadge}>PRICE WATCH · {timeAgo(market.watch.publishedAt ?? '')}</Text>
                <Text style={styles.marketWatchTitle} numberOfLines={2}>
                  {market.watch.title}
                </Text>
                <Text style={styles.marketWatchSource}>{market.watch.source}</Text>
              </TouchableOpacity>
            </Card>
          )}

          {(market.news || []).slice(0, 2).map((item, i) => (
            <Card key={`mn-${i}`} compact variant="outlined" style={styles.iosCard}>
              <TouchableOpacity
                onPress={() => item.link && Linking.openURL(item.link).catch(() => {})}
                activeOpacity={0.7}
                style={styles.tipRow}
              >
                <View style={[styles.tipDot, { backgroundColor: Colors.primary }]} />
                <View style={styles.tipTextWrap}>
                  <Text style={styles.marketNewsTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.marketNewsMeta}>
                    {item.source} · {timeAgo(item.publishedAt ?? '')}
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))}

          <Card compact variant="filled" style={styles.iosCard}>
            <Text style={styles.marketUpdated}>
              Live snapshots — rates (open.er-api.com) & regional press · {timeAgo(market.updatedAt)} ago.
              Pull down to refresh.
            </Text>
          </Card>
        </>
      )}

      {/* ─── Voice Search Bar ─── */}
      <Card variant="filled" style={styles.voiceBar}>
        <View style={styles.voiceRow}>
          <VoiceButton
            text="Search products, check duty, find buyers. What do you need?"
            variant="speak"
            size="md"
            lang="sw"
          />
          <View style={styles.voiceInputArea}>
            <Text style={styles.voicePlaceholder}>Tap the mic and say what you need…</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const shadowSoft: ViewStyle = Platform.OS === 'web'
  ? { boxShadow: '0 8px 28px rgba(11, 79, 58, 0.12)' }
  : {
      shadowColor: '#0B4F3A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 5,
    };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: 120 },

  // Large title header (iOS-style)
  largeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  largeTitleCol: { flex: 1, marginRight: Spacing.md },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  largeTitleSub: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  avatar: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowSoft,
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.4 },

  // Hero feature card
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl + 4,
    overflow: 'hidden',
    minHeight: 190,
    ...shadowSoft,
  },
  heroSheen: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.4,
    zIndex: 1,
  },
  heroPrompt: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 3,
    zIndex: 1,
    letterSpacing: -0.3,
  },
  heroChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    zIndex: 1,
  },
  heroChipText: { color: '#FFFFFF', fontSize: FontSize.xs, fontWeight: '600' },
  hero3D: {
    position: 'absolute',
    right: -40,
    bottom: -22,
    width: 430,
    height: 150,
    zIndex: 0,
  },
  heroLayer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 430,
    height: 150,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  layerBack: { transform: [{ translateX: -30 }, { translateY: -26 }, { scale: 0.72 }] },
  layerMid: { transform: [{ translateX: -14 }, { translateY: -12 }, { scale: 0.88 }] },
  layerFront: {},
  heroImg: { width: '100%', height: '100%', borderRadius: Radius.lg },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 30, 22, 0.55)', borderRadius: Radius.lg },
  heroShadeMid: { backgroundColor: 'rgba(8, 30, 22, 0.35)' },
  groundShadow: {
    position: 'absolute',
    left: 18,
    right: 10,
    bottom: -8,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(8, 30, 22, 0.35)',
    ...(Platform.OS === 'web' ? { boxShadow: '0 10px 26px rgba(8, 30, 22, 0.45)' } : {}),
  },

  // Quick actions — iOS widget grid
  sectionHeader: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', paddingHorizontal: Spacing.xs },
  tilesCard: {
    ...Vapor,
    borderRadius: Radius.xl,
    ...shadowSoft,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nebulaTile: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    ...(Platform.OS === 'web'
      ? { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.65)' }
      : {}),
  },
  nebulaNum: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  nebulaNumText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.6 },
  actionDot: { width: 8, height: 8, borderRadius: 4 },
  nebulaValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  nebulaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 2,
  },

  // Card polish (iOS continuous corners + soft tinted shadow)
  iosCard: {
    borderRadius: Radius.xl,
    ...shadowSoft,
  },
  myListingText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },

  // Literacy
  literacyRow: { gap: Spacing.sm },
  literacyNext: { marginTop: Spacing.xs },
  literacyNextLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600' },
  literacyNextLesson: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  levelBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },

  // Trades
  tradeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tradeInfo: { flex: 1, marginRight: Spacing.md },
  tradeStatusDot: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tradeStatus: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tradeProduct: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.xs },
  tradeBuyer: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  tradeRight: { alignItems: 'flex-end' },
  tradePrice: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  tradeTime: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  // Empty trades
  emptyTradeTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  emptyTradeSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  emptyTradeBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start' },

  // Tip / market
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tipDot: { width: 10, height: 10, borderRadius: 5 },
  tipTextWrap: { flex: 1 },
  tipText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },

  // Live market
  marketCardLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  fxStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  fxCell: { flexDirection: 'row' },
  fxCode: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  fxNum: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  marketWatchBadge: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  marketWatchTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  marketWatchSource: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  marketNewsTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  marketNewsMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  marketUpdated: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },

  // Voice bar
  voiceBar: {
    marginTop: Spacing.lg,
    borderRadius: Radius.xl,
    ...shadowSoft,
  },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  voiceInputArea: { flex: 1 },
  voicePlaceholder: { fontSize: FontSize.sm, color: Colors.textMuted },
});
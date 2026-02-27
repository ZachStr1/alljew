import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Platform,
} from 'react-native';
import { useAppState } from '../state/AppState';
import { useTravelLocation } from '../lib/useTravelLocation';
import { useHomeData } from '../lib/useHomeData';
import LocationPill from '../components/LocationPill';

/**
 * Today Screen UI (matches the provided render)
 * - No new dependencies (no blur/gradient libs)
 * - Uses semi-transparent “glass” cards
 * - Uses day/night background based on the homeData night flag
 *
 * NOTE: Replace these background URLs with local assets later for App Store polish.
 */
const DAY_BG = {
  uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80',
};
const NIGHT_BG = {
  uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
};

function extractOmerDay(omerRaw?: string | null) {
  if (!omerRaw) return null;
  const m = String(omerRaw).match(/(\d{1,2})/);
  if (m?.[1]) return `Omer Count: Day ${m[1]}`;
  return String(omerRaw);
}

function normalizeParshaTitle(parsha?: string | null) {
  if (!parsha) return null;
  return parsha.replace(/^Parashat\s+/i, '').trim();
}

export default function TodayScreen() {
  const { locationMode, setLocationMode, effectiveCoords } = useAppState();
  useTravelLocation();

  const homeData = useHomeData(effectiveCoords);

  // Prefer the most accurate “night” flag your hook provides
  const isNight = useMemo(() => {
    const anyHome: any = homeData as any;
    if (typeof anyHome.afterTzeit === 'boolean') return anyHome.afterTzeit;
    if (typeof anyHome.afterSunset === 'boolean') return anyHome.afterSunset;
    return false;
  }, [homeData]);

  const bgSource = isNight ? NIGHT_BG : DAY_BG;

  const travelOn = locationMode === 'TRAVEL';

  // If your hook exposes a Hebrew string line, we’ll use it.
  // Otherwise we just omit the big Hebrew line and keep the English lines.
  const hebrewLine: string | null = (homeData as any)?.hebrewDate ?? null;

  const parsha = normalizeParshaTitle(homeData.parsha);
  const omerLine = extractOmerDay(homeData.omer);

  const nextUpLabel = homeData.nextUpLabel ?? 'Loading…';
  const nextUpTime = homeData.nextUpTime ?? '';

  const candleLighting = homeData.candleLighting ?? null;
  const havdalah = homeData.havdalah ?? null;

  // Optional countdown field if your shabbat hook/home hook provides it
  const countdown: string | null =
    (homeData as any)?.shabbatCountdown ?? (homeData as any)?.countdown ?? null;

  const toggleMode = () => {
    setLocationMode(travelOn ? 'MANUAL' : 'TRAVEL');
  };

  return (
    <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
      {/* Subtle dark overlay for readability */}
      <View style={styles.dimOverlay} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
                {/* Top pill */}
                <LocationPill />

        {/* Cards */}
        <View style={styles.cardsWrap}>
          {/* Jewish Date */}
          <View style={styles.cardGlass}>
            <Text style={styles.cardHeader}>Jewish Date</Text>

            {hebrewLine ? (
              <Text style={styles.hebrewBig} numberOfLines={1} adjustsFontSizeToFit>
                {hebrewLine}
              </Text>
            ) : null}

            <Text style={styles.primaryLine}>{homeData.jewishDate ?? 'Loading…'}</Text>

            {parsha ? (
              <Text style={styles.secondaryLine}>Parashat {parsha}</Text>
            ) : (
              <Text style={styles.secondaryLinePlaceholder}> </Text>
            )}

            <View style={styles.cardDivider} />

            {omerLine ? (
              <Text style={styles.footerLine}>{omerLine}</Text>
            ) : (
              <Text style={styles.footerLine}> </Text>
            )}
          </View>

          {/* Holidays */}
          <View style={styles.cardGlass}>
            <Text style={styles.cardHeader}>Today</Text>

            {Array.isArray((homeData as any).todayHolidays) && (homeData as any).todayHolidays.length > 0 ? (
              <View style={{ gap: 8 }}>
                {(homeData as any).todayHolidays.map((h: any) => (
                  <View key={`${h.title}-${h.dateISO}`} style={styles.holidayRow}>
                    <Text style={styles.holidayName}>{h.title}</Text>
                    {h.hebrew ? <Text style={styles.holidayHebrew}>{h.hebrew}</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.mutedText}>No holiday today</Text>
            )}

            {Array.isArray((homeData as any).upcomingHolidays) && (homeData as any).upcomingHolidays.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.subTitle}>Upcoming</Text>
                {(homeData as any).upcomingHolidays.map((h: any) => (
                  <Text key={`${h.title}-${h.dateISO}`} style={styles.upcomingLine}>
                    {h.dateISO} • {h.title}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          {/* Next Up */}
          <View style={styles.cardGlass}>
            <Text style={styles.cardHeader}>Next Up</Text>

            <Text style={styles.nextUpLabel} numberOfLines={2} adjustsFontSizeToFit>
              {nextUpLabel}
            </Text>

            {!!nextUpTime && <Text style={styles.nextUpTime}>{nextUpTime}</Text>}

            <Text style={styles.nextUpIcon}>🌇</Text>
          </View>

          {/* Shabbat */}
          <View style={styles.cardGlass}>
            <Text style={styles.cardHeader}>Upcoming Shabbat</Text>

            <View style={styles.shabbatLines}>
              <Text style={styles.shabbatLine}>
                Candle Lighting: <Text style={styles.shabbatValue}>{candleLighting ?? '—'}</Text>
              </Text>
              <Text style={styles.shabbatLine}>
                Havdalah: <Text style={styles.shabbatValue}>{havdalah ?? '—'}</Text>
              </Text>
            </View>

            <View style={styles.cardDivider} />

            {countdown ? (
              <Text style={styles.countdownLine}>⏳ {countdown} remaining</Text>
            ) : (
              <Text style={styles.countdownLinePlaceholder}> </Text>
            )}
          </View>

          {/* Small spacer so cards don’t touch tab bar */}
          <View style={{ height: 18 }} />
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.select({ ios: 74, android: 28, default: 28 }),
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  topRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
  travelPill: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  travelPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  travelPillOn: {
    fontWeight: '800',
    color: '#0f766e',
  },
  travelIcon: {
    fontSize: 14,
  },

  cardsWrap: {
    gap: 16,
    alignItems: 'center',
  },

  cardGlass: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },

  cardHeader: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  hebrewBig: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '800',
    color: '#0b0f1a',
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  primaryLine: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  secondaryLine: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  secondaryLinePlaceholder: {
    textAlign: 'center',
    fontSize: 14,
    color: 'transparent',
    marginBottom: 6,
  },

  cardDivider: {
    marginTop: 8,
    marginBottom: 10,
    height: 1,
    backgroundColor: 'rgba(17,24,39,0.10)',
  },

  footerLine: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  nextUpLabel: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '900',
    color: '#0b0f1a',
    marginTop: 2,
  },
  nextUpTime: {
    textAlign: 'center',
    fontSize: 36,
    fontWeight: '900',
    color: '#0b0f1a',
    marginTop: 6,
  },
  nextUpIcon: {
    textAlign: 'center',
    fontSize: 18,
    marginTop: 10,
    opacity: 0.9,
  },

  shabbatLines: {
    gap: 6,
    marginTop: 4,
  },
  shabbatLine: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  shabbatValue: {
    fontWeight: '800',
    color: '#111827',
  },

  countdownLine: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  countdownLinePlaceholder: {
    textAlign: 'center',
    fontSize: 13,
    color: 'transparent',
  },
  holidayRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.10)',
  },
  holidayName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  holidayHebrew: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(17,24,39,0.70)',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(17,24,39,0.70)',
    marginBottom: 6,
  },
  upcomingLine: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(17,24,39,0.80)',
    marginTop: 4,
  },
  mutedText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(17,24,39,0.55)',
  },
});
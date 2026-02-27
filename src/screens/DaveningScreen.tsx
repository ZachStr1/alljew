import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  ImageBackground,
  Platform,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppState } from '../state/AppState';
import { useTravelLocation } from '../lib/useTravelLocation';
import { useDaveningData } from '../lib/useDaveningData';
import LocationPill from '../components/LocationPill';
import InAppReaderModal from '../components/InAppReaderModal';

const DAY_BG = {
  uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80',
};

const NIGHT_BG = {
  uri: 'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1400&q=80',
};

type WindowStatus = 'current' | 'upcoming' | 'past' | string;

type TefillaWindow = {
  name: string;
  status: WindowStatus;
  emoji?: string;
  timeRange: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  start?: string;
  end?: string;
  countdownText?: string;
  endsIn?: string;
  startsIn?: string;
};

function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function parseClockToDate(clock: string): Date | null {
  const m = clock.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;

  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ampm = m[3].toUpperCase();
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;

  const now = new Date();
  const dt = new Date(now);
  dt.setHours(hh, mm, 0, 0);

  if (dt.getTime() < now.getTime() - 2 * 3600 * 1000) {
    dt.setDate(dt.getDate() + 1);
  }

  return dt;
}

function parseTimeRange(range: string): { start: Date | null; end: Date | null } {
  const normalized = range.replace(/–/g, '-');
  const parts = normalized.split('-').map((p) => p.trim());
  if (parts.length < 2) return { start: null, end: null };
  const start = parseClockToDate(parts[0]);
  const end = parseClockToDate(parts[1]);
  return { start, end };
}

function getStatusDotColor(status: WindowStatus): string {
  if (status === 'current') return '#22c55e';
  if (status === 'upcoming') return '#f59e0b';
  return '#9ca3af';
}

const QUICK_LINKS: { key: string; title: string; url: string }[] = [
    { key: 'shacharit', title: 'Shacharit', url: "https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Pesukei_Dezimra%2C_Mourner's_Kaddish?lang=bi" },
    { key: 'mincha', title: 'Mincha', url: 'https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Minchah%2C_Ashrei?lang=bi' },
    { key: 'maariv', title: 'Maariv', url: 'https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Maariv%2C_Vehu_Rachum?lang=bi' },
    { key: 'birchot', title: 'Birchot HaShachar', url: 'https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Preparatory_Prayers%2C_Modeh_Ani?lang=bi' },
    { key: 'shema', title: 'Kriat Shema', url: 'https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Blessings_of_the_Shema%2C_Shema?lang=bi' },
    { key: 'amidah', title: 'Amidah', url: 'https://www.sefaria.org/Siddur_Ashkenaz%2C_Weekday%2C_Shacharit%2C_Amidah%2C_Patriarchs?lang=bi' },
  ] as const;

export default function DaveningScreen() {
  const { effectiveCoords } = useAppState();
  useTravelLocation();

  const navigation = useNavigation<any>();
  const daveningData: any = useDaveningData(effectiveCoords);

  const windows: TefillaWindow[] = (daveningData?.tefillaWindows ?? []) as TefillaWindow[];

  // In-app Siddur reader state
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerTitle, setReaderTitle] = useState<string>('Siddur');

  const openQuickLink = (title: string, url: string) => {
    setReaderTitle(title);
    setReaderUrl(url);
    setReaderOpen(true);
  };

  const currentWindow = useMemo(() => windows.find((w) => w.status === 'current') ?? null, [windows]);
  const upcomingWindow = useMemo(() => windows.find((w) => w.status === 'upcoming') ?? null, [windows]);

  const heroTitle = useMemo(() => {
    if (currentWindow) return `${currentWindow.name} window is open`;
    if (upcomingWindow) return `${upcomingWindow.name} starts soon`;
    return 'No active window';
  }, [currentWindow, upcomingWindow]);

  const heroDotColor = useMemo(
    () => getStatusDotColor(currentWindow?.status ?? upcomingWindow?.status ?? 'past'),
    [currentWindow, upcomingWindow]
  );

  const heroRange = useMemo(() => {
    const w = currentWindow ?? upcomingWindow;
    if (!w) return null;

    const startIso = (w.startsAt ?? w.start) as string | undefined;
    const endIso = (w.endsAt ?? w.end) as string | undefined;

    if (startIso || endIso) {
      const start = startIso ? new Date(startIso) : null;
      const end = endIso ? new Date(endIso) : null;
      return {
        start: start && !isNaN(start.getTime()) ? start : null,
        end: end && !isNaN(end.getTime()) ? end : null,
      };
    }

    return parseTimeRange(w.timeRange);
  }, [currentWindow, upcomingWindow]);

  const heroMode = useMemo(() => {
    if (currentWindow) return 'ends';
    if (upcomingWindow) return 'starts';
    return null;
  }, [currentWindow, upcomingWindow]);

  const [heroCountdown, setHeroCountdown] = useState<string>('—');

  useEffect(() => {
    const w = currentWindow ?? upcomingWindow;
    if (!w) {
      setHeroCountdown('—');
      return;
    }

    const direct = w.endsIn ?? w.startsIn ?? w.countdownText;
    if (typeof direct === 'string' && direct.trim().length > 0) {
      setHeroCountdown(direct.trim());
      return;
    }

    const target =
      heroMode === 'ends' ? heroRange?.end : heroMode === 'starts' ? heroRange?.start : null;

    if (!target) {
      setHeroCountdown('—');
      return;
    }

    const tick = () => {
      const diffMs = target.getTime() - Date.now();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      setHeroCountdown(formatHMS(diffSec));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentWindow, upcomingWindow, heroMode, heroRange]);

  const isNight = useMemo(() => {
    const anyCurrent = currentWindow?.name?.toLowerCase() ?? '';
    const anyUpcoming = upcomingWindow?.name?.toLowerCase() ?? '';
    if (anyCurrent.includes('maariv') || anyUpcoming.includes('maariv')) return true;
    const h = new Date().getHours();
    return h >= 18 || h < 6;
  }, [currentWindow, upcomingWindow]);

  const bgSource = isNight ? NIGHT_BG : DAY_BG;

  const locationLabel =
    (daveningData?.locationLabel as string | undefined) ??
    (daveningData?.city as string | undefined) ??
    (daveningData?.placeName as string | undefined) ??
    null;

  if (!effectiveCoords) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>
          Location not available. Enable location services or set manual location.
        </Text>
      </View>
    );
  }

  if (daveningData?.isLoading) {
    return (
      <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
        <View style={styles.dimOverlay} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading prayer times...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
      <View style={styles.dimOverlay} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top controls */}
        <View style={styles.topControls}>
          <View style={styles.topRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Compass')}
              style={styles.compassBtn}
            >
              <Ionicons name="compass-outline" size={20} color="#111827" />
            </TouchableOpacity>

            <LocationPill />

            <View style={styles.topRightSpacer} />
          </View>

          <Text style={styles.locationSubtitle}>
            {locationLabel ? `Showing times for ${locationLabel}` : 'Showing times for your location'}
          </Text>
        </View>

        <View style={styles.cardsWrap}>
          {/* Hero */}
          <View style={[styles.cardGlass, styles.heroCard]}>
            <Text style={styles.sectionHeader}>Right Now</Text>
            <Text style={styles.heroTitle}>{heroTitle}</Text>

            <View style={styles.heroCountdownRow}>
              <View style={[styles.dot, { backgroundColor: heroDotColor }]} />
              <Text style={styles.heroCountdownText}>
                {heroMode === 'ends' ? 'Ends in ' : heroMode === 'starts' ? 'Starts in ' : ''}
                {heroCountdown}
              </Text>
            </View>
          </View>

          {/* Windows */}
          <View style={styles.cardGlass}>
            <Text style={styles.sectionHeader}>Today’s Tefillah Windows</Text>

            <View style={styles.windowsInnerCard}>
              {windows.map((w, idx) => {
                const isCurrentRow = w.status === 'current';
                const icon =
                  w.emoji ??
                  (w.name.toLowerCase().includes('shach')
                    ? '☀️'
                    : w.name.toLowerCase().includes('mincha')
                      ? '🌤️'
                      : '🌙');

                return (
                  <View
                    key={`${w.name}-${idx}`}
                    style={[styles.windowRow, isCurrentRow && styles.windowRowCurrent]}
                  >
                    {isCurrentRow ? (
                      <View style={styles.currentAccent} />
                    ) : (
                      <View style={styles.currentAccentSpacer} />
                    )}

                    <Text style={styles.windowLeft}>
                      <Text style={styles.windowIcon}>{icon} </Text>
                      <Text style={styles.windowName}>{w.name}:</Text>
                    </Text>

                    <View style={styles.windowRightWrap}>
                      <Text style={styles.windowTime}>{w.timeRange}</Text>
                      {isCurrentRow ? (
                        <View style={styles.currentPill}>
                          <Text style={styles.currentPillText}>Current</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Quick Links (In-app Siddur) */}
          <View style={styles.cardGlass}>
            <Text style={styles.cardHeader}>Quick Links</Text>

            {QUICK_LINKS.map((l) => (
              <Pressable
                key={l.key}
                onPress={() => openQuickLink(l.title, l.url)}
                style={({ pressed }) => [styles.quickLinkRow, pressed && { opacity: 0.9 }]}
              >
                <Text allowFontScaling={false} style={styles.quickLinkTitle}>
                  {l.title}
                </Text>

                <Text allowFontScaling={false} style={styles.quickLinkIcon}>
                  📖
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 18 }} />
        </View>
      </ScrollView>

      {/* In-app reader modal */}
      <InAppReaderModal
        visible={readerOpen}
        title={readerTitle}
        url={readerUrl}
        onClose={() => setReaderOpen(false)}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  container: { flex: 1 },
  content: {
    paddingTop: Platform.select({ ios: 74, android: 28, default: 28 }),
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  messageText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },

  topControls: {
    alignItems: 'center',
    marginBottom: 16,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compassBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 5,
  },
  topRightSpacer: {
    width: 38,
    height: 38,
  },
  locationSubtitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },

  cardsWrap: { gap: 16, alignItems: 'center' },
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

  heroCard: { paddingVertical: 18 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0b0f1a',
    marginBottom: 10,
  },
  heroCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  heroCountdownText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },

  windowsInnerCard: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.10)',
    overflow: 'hidden',
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,24,39,0.08)',
  },
  windowRowCurrent: {
    backgroundColor: 'rgba(34,197,94,0.10)',
  },
  currentAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 10,
  },
  currentAccentSpacer: {
    width: 4,
    marginRight: 10,
  },
  windowLeft: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  windowIcon: {
    fontSize: 15,
  },
  windowName: {
    fontWeight: '800',
  },
  windowRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  windowTime: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  currentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.10)',
  },
  currentPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },

  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },

  quickLinkRow: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickLinkTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  quickLinkIcon: {
    fontSize: 16,
  },
});
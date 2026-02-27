import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useAppState } from '../state/AppState';
import { useTravelLocation } from '../lib/useTravelLocation';
import { useZmanimData } from '../lib/useZmanimData';
import LocationPill from '../components/LocationPill';

const SKY_BG = {
  uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80',
};
const NIGHT_BG = {
  uri: 'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1400&q=80',
};

type ZmanItem = { label: string; time: string };

type FlatRow = {
  label: string;
  time: string;
  dt: Date | null;
  section: 'Morning' | 'Midday' | 'Evening' | 'Dawn';
};

function safeText(value: any, fallback = '—'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if (typeof (value as any).time === 'string') return (value as any).time;
    if (typeof (value as any).date === 'string') return (value as any).date;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseTimeToDate(timeStr: string): Date | null {
  // Parses times like "5:42 AM" using the device locale day.
  // Best-effort only (your hook may already return formatted strings).
  if (!timeStr) return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
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

  // If it's earlier than now by more than ~2 hours, assume it belongs to next day (rare but helps late-night tzeit)
  if (dt.getTime() < now.getTime() - 2 * 3600 * 1000) {
    dt.setDate(dt.getDate() + 1);
  }

  return dt;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${hours}:${mm}:${ss}`;
}

function pickIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('sunrise')) return '☀️';
  if (l.includes('sunset')) return '🌇';
  if (l.includes('tzeit')) return '🌙';
  if (l.includes('shema')) return '☀️';
  if (l.includes('tefillah')) return '☀️';
  if (l.includes('chatzot')) return '🕛';
  if (l.includes('plag')) return '🕯️';
  return '';
}

export default function ZmanimScreen() {
  const { effectiveCoords, locationMode, setLocationMode } = useAppState();
  useTravelLocation();

  const zmanimData = useZmanimData(effectiveCoords);

  const isNight = useMemo(() => {
    // Preferred: use zmanimData times if available
    const anyZ: any = zmanimData as any;

    // If your hook exposes flags, use them
    if (typeof anyZ.afterTzeit === 'boolean') return anyZ.afterTzeit;
    if (typeof anyZ.afterSunset === 'boolean') return anyZ.afterSunset;

    // Try to infer from today's sunset / tzeit if present in anyZ.times
    const sunsetIso = anyZ?.times?.sunset;
    const tzeitIso = anyZ?.times?.tzeit42min ?? anyZ?.times?.tzeit;

    const now = new Date();

    if (typeof tzeitIso === 'string') {
      const tzeit = new Date(tzeitIso);
      if (!isNaN(tzeit.getTime())) return now >= tzeit;
    }

    if (typeof sunsetIso === 'string') {
      const sunset = new Date(sunsetIso);
      if (!isNaN(sunset.getTime())) return now >= sunset;
    }

    // Fallback: simple heuristic (night between 6pm–6am)
    const h = now.getHours();
    return h >= 18 || h < 6;
  }, [zmanimData]);

  const bgSource = isNight ? NIGHT_BG : SKY_BG;

  const travelOn = locationMode === 'TRAVEL';
  const toggleMode = () => setLocationMode(travelOn ? 'MANUAL' : 'TRAVEL');

  const morning: ZmanItem[] = (zmanimData as any)?.morning ?? [];
  const midday: ZmanItem[] = (zmanimData as any)?.afternoon ?? [];
  const evening: ZmanItem[] = (zmanimData as any)?.evening ?? [];

  // Flatten everything so we can find the next upcoming zman
  const { nextUpcomingLabel, nextUpcomingIn } = useMemo(() => {
    const rows: FlatRow[] = [];

    const push = (section: FlatRow['section'], items: ZmanItem[]) => {
      for (const it of items ?? []) {
        const time = safeText(it.time, '');
        rows.push({
          section,
          label: it.label,
          time,
          dt: parseTimeToDate(time),
        });
      }
    };

    push('Morning', morning);
    push('Midday', midday);
    push('Evening', evening);

    const now = new Date();
    const future = rows
      .filter((r) => r.dt && r.dt.getTime() >= now.getTime())
      .sort((a, b) => (a.dt!.getTime() - b.dt!.getTime()));

    const next = future[0];
    if (!next?.dt) return { nextUpcomingLabel: null as string | null, nextUpcomingIn: null as string | null };

    const diffMs = next.dt.getTime() - now.getTime();
    return {
      nextUpcomingLabel: next.label,
      nextUpcomingIn: formatCountdown(diffMs),
    };
  }, [morning, midday, evening]);

  const isLoading = Boolean((zmanimData as any)?.isLoading);

  if (!effectiveCoords) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>
          Location not available. Enable location services or set manual location.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
        <View style={styles.dimOverlay} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading zmanim...</Text>
        </View>
      </ImageBackground>
    );
  }

  const Card = ({ title, items }: { title: string; items: ZmanItem[] }) => {
    return (
      <View style={styles.cardGlass}>
        <Text style={styles.cardTitle}>{title}</Text>
        {items.map((it, idx) => (
          <View key={`${title}-${idx}`} style={styles.row}>
            <Text style={styles.rowLabel}>{it.label}</Text>
            <Text style={styles.rowTime}>
              {safeText(it.time, '—')} {pickIcon(it.label)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
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
          <Card title="Morning" items={morning} />
          <Card title="Midday" items={midday} />
          <Card title="Evening" items={evening} />

          {/* Today Summary */}
          <View style={styles.cardGlass}>
            <Text style={styles.cardTitle}>Today Summary</Text>

            <Text style={styles.summaryLine}>
              Timezone: <Text style={styles.summaryValue}>{safeText((zmanimData as any)?.tzid, '—')}</Text>
            </Text>

            {(zmanimData as any)?.lastUpdated ? (
              <Text style={styles.summaryLine}>
                Updated: <Text style={styles.summaryValue}>{safeText((zmanimData as any)?.lastUpdated, '—')}</Text>
              </Text>
            ) : null}

            <View style={styles.summaryDivider} />

            <Text style={styles.summaryLine}>
              Next upcoming:{' '}
              <Text style={styles.summaryValue}>
                {nextUpcomingLabel ? nextUpcomingLabel : '—'}
              </Text>
              {nextUpcomingIn ? (
                <Text style={styles.summaryValue}> in {nextUpcomingIn}</Text>
              ) : null}
            </Text>
          </View>

          <View style={{ height: 18 }} />
        </View>
      </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.75)',
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

  topRow: { alignItems: 'center', marginBottom: 16 },
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
  travelPillText: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  travelPillOn: { fontWeight: '900', color: '#0f766e' },
  travelIcon: { fontSize: 14 },

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
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    paddingRight: 10,
  },
  rowTime: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },

  summaryLine: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 6,
  },
  summaryValue: {
    fontWeight: '900',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(17,24,39,0.10)',
    marginTop: 10,
  },
});
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Platform,
  Switch,
  Pressable,
} from 'react-native';
import { useAppState } from '../state/AppState';
import { useTravelLocation } from '../lib/useTravelLocation';
import { useShabbatData } from '../lib/useShabbatData';
import LocationPill from '../components/LocationPill';
import { useNavigation } from '@react-navigation/native';

const DAY_BG = {
  uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80',
};
const NIGHT_BG = {
  uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
};

function normalizeParshaTitle(parsha?: string | null) {
  if (!parsha) return null;
  return parsha.replace(/^Parashat\s+/i, '').trim();
}

function safeText(value: any, fallback = '—'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  // Common pattern: { time, date }
  if (typeof value === 'object') {
    if (typeof (value as any).time === 'string') return (value as any).time;

    // If date is ISO-like, show local time
    if (typeof (value as any).date === 'string') {
      const dt = new Date((value as any).date);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      return (value as any).date;
    }

    // Last resort (avoid crashing React)
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function formatDHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}:${ss}`;
}

function parseHMS(text: string): number | null {
  const m = String(text).trim().match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3]);
  if ([hh, mm, ss].some((n) => Number.isNaN(n))) return null;
  return hh * 3600 + mm * 60 + ss;
}

function parseTimeUntilSeconds(value: any): number | null {
  if (!value) return null;

  // If it's already a number (seconds)
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));

  // If it's a string like "HH:MM:SS"
  if (typeof value === 'string') {
    const s = parseHMS(value);
    return typeof s === 'number' ? s : null;
  }

  // If it's an object like {days, hours, minutes, seconds}
  if (typeof value === 'object') {
    const v: any = value;
    const days = Number(v.days ?? 0);
    const hours = Number(v.hours ?? 0);
    const minutes = Number(v.minutes ?? 0);
    const seconds = Number(v.seconds ?? 0);

    if ([days, hours, minutes, seconds].some((n) => Number.isNaN(n))) return null;

    const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
    return Math.max(0, Math.floor(total));
  }

  return null;
}

function parseTargetDate(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const dt = new Date(value as any);
    return isNaN(dt.getTime()) ? null : dt;
  }

  if (typeof value === 'object') {
    const v: any = value;
    const candidate = v.date ?? v.value ?? v.timestamp ?? v.datetime ?? v.dateTime ?? v.iso;
    if (candidate) {
      const dt = new Date(candidate);
      return isNaN(dt.getTime()) ? null : dt;
    }
  }

  return null;
}

export default function ShabbatScreen() {
  const { locationMode, setLocationMode, effectiveCoords } = useAppState();
  useTravelLocation();

  const shabbatData: any = useShabbatData(effectiveCoords);

  const navigation = useNavigation<any>();
  const { isPremium } = useAppState();

  const requirePremium = (): boolean => {
    if (isPremium) return true;
    navigation.navigate('Paywall');
    return false;
  };

  const travelOn = locationMode === 'TRAVEL';
  const toggleMode = () => setLocationMode(travelOn ? 'MANUAL' : 'TRAVEL');

  // Background: prefer hook flags if present
  const isNight = useMemo(() => {
    if (typeof shabbatData?.afterTzeit === 'boolean') return shabbatData.afterTzeit;
    if (typeof shabbatData?.afterSunset === 'boolean') return shabbatData.afterSunset;
    if (typeof shabbatData?.isShabbat === 'boolean') return shabbatData.isShabbat;
    const label = safeText(shabbatData?.statusText ?? shabbatData?.statusLabel ?? '', '').toLowerCase();
    return label.includes('havdalah') || label.includes('ends');
  }, [shabbatData]);

  const bgSource = isNight ? NIGHT_BG : DAY_BG;

  const statusHeader = safeText(shabbatData?.statusHeader, 'Shabbat Status');
  const statusText = safeText(
    shabbatData?.statusText ?? shabbatData?.statusLine ?? shabbatData?.statusLabel,
    'Shabbat begins in'
  );

  const parsha = normalizeParshaTitle(safeText(shabbatData?.parsha, ''));

  const candleLighting = safeText(shabbatData?.candleLighting ?? shabbatData?.candles, '—');
  const havdalah = safeText(shabbatData?.havdalah, '—');

  // Live countdown: prefer countdownTarget; fallback to timeUntilTarget string "HH:MM:SS"
  const targetDate = useMemo(() => parseTargetDate(shabbatData?.countdownTarget), [shabbatData?.countdownTarget]);
  const fallbackSeconds = useMemo(
    () => parseTimeUntilSeconds(shabbatData?.timeUntilTarget),
    [shabbatData?.timeUntilTarget]
  );

  const [liveCountdown, setLiveCountdown] = useState<string>('—');

  const fallbackStartMsRef = useRef<number | null>(null);
  const fallbackStartSecondsRef = useRef<number | null>(null);

  useEffect(() => {
    // reset fallback baselines whenever the input changes
    fallbackStartMsRef.current = null;
    fallbackStartSecondsRef.current = null;

    if (!targetDate && typeof fallbackSeconds !== 'number') {
      setLiveCountdown(
        safeText(shabbatData?.countdown ?? shabbatData?.timeRemaining ?? shabbatData?.shabbatCountdown, '—')
      );
      return;
    }

    const tick = () => {
      if (targetDate) {
        const diffMs = targetDate.getTime() - Date.now();
        const diffSec = Math.max(0, Math.floor(diffMs / 1000));
        setLiveCountdown(formatDHMS(diffSec));
        return;
      }

      if (typeof fallbackSeconds === 'number') {
        if (fallbackStartMsRef.current == null || fallbackStartSecondsRef.current == null) {
          fallbackStartMsRef.current = Date.now();
          fallbackStartSecondsRef.current = fallbackSeconds;
        }
        const elapsedSec = Math.floor((Date.now() - (fallbackStartMsRef.current ?? Date.now())) / 1000);
        const remaining = Math.max(0, (fallbackStartSecondsRef.current ?? 0) - elapsedSec);
        setLiveCountdown(formatDHMS(remaining));
        return;
      }

      setLiveCountdown('—');
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [
    targetDate,
    fallbackSeconds,
    shabbatData?.timeUntilTarget,
    shabbatData?.countdown,
    shabbatData?.timeRemaining,
    shabbatData?.shabbatCountdown,
  ]);

  // Optional mincha/maariv window if your hook provides it
  const minchaMaarivWindow =
    shabbatData?.minchaMaarivWindow ?? shabbatData?.maarivWindow ?? shabbatData?.minchaWindow ?? null;
  const minchaMaarivWindowText = minchaMaarivWindow ? safeText(minchaMaarivWindow, '') : '';

  const [remind30, setRemind30] = useState(true);
  const [remindAtCandles, setRemindAtCandles] = useState(true);
  const [remindHavdalah, setRemindHavdalah] = useState(true);

  // Optional: quick debug toggle (long press hero) – does not affect UI unless enabled
  const [debug, setDebug] = useState(false);

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

        <View style={styles.cardsWrap}>
          <Pressable onLongPress={() => setDebug((v) => !v)} delayLongPress={400}>
            <View style={[styles.cardGlass, styles.heroCard]}>
              <Text style={styles.cardHeader}>{statusHeader}</Text>
              <Text style={styles.heroTitle}>{statusText}</Text>
              <Text style={styles.heroCountdown}>{liveCountdown}</Text>
              <Text style={styles.heroSub}>{parsha ? `Parashat ${parsha}` : ' '}</Text>

              {debug ? (
                <View style={styles.debugBox}>
                  <Text style={styles.debugTitle}>DEBUG (long-press to hide)</Text>
                  <Text style={styles.debugLine}>countdownTarget: {safeText(shabbatData?.countdownTarget, '(non-string)')}</Text>
                  <Text style={styles.debugLine}>parsed targetDate: {targetDate ? targetDate.toISOString() : 'null'}</Text>
                  <Text style={styles.debugLine}>
                    timeUntilTarget: {safeText(shabbatData?.timeUntilTarget, 'null')}
                  </Text>
                  <Text style={styles.debugLine}>fallbackSeconds: {fallbackSeconds ?? 'null'}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          <View style={styles.cardGlass}>
            <Text style={styles.cardHeader}>Times</Text>

            <View style={styles.timesRow}>
              <Text style={styles.timesLabel}>Candle Lighting:</Text>
              <Text style={styles.timesValue}>
                {candleLighting} <Text style={styles.timesIcon}>🕯️</Text>
              </Text>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.timesRow}>
              <Text style={styles.timesLabel}>Havdalah:</Text>
              <Text style={styles.timesValue}>
                {havdalah} <Text style={styles.timesIcon}>🕯️🌙</Text>
              </Text>
            </View>

            {minchaMaarivWindowText ? (
              <>
                <View style={styles.rowDivider} />
                <Text style={styles.windowText}>Mincha / Maariv window: {minchaMaarivWindowText}</Text>
              </>
            ) : null}
          </View>

          <View style={styles.cardGlass}>
            <Text style={styles.cardHeader}>Reminders</Text>

            <View style={styles.reminderRow}>
              <Text style={styles.reminderText}>Remind me 30 min before{`\n`}candle lighting</Text>
              <Switch
                value={remind30}
                disabled={!isPremium}
                onValueChange={(v) => {
                  if (!requirePremium()) return;
                  setRemind30(v);
                }}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.reminderRow}>
              <Text style={styles.reminderText}>Remind me at candle lighting</Text>
              <Switch
                value={remindAtCandles}
                disabled={!isPremium}
                onValueChange={(v) => {
                  if (!requirePremium()) return;
                  setRemindAtCandles(v);
                }}
              />
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.reminderRow}>
              <Text style={styles.reminderText}>Remind me at havdalah</Text>
              <Switch
                value={remindHavdalah}
                disabled={!isPremium}
                onValueChange={(v) => {
                  if (!requirePremium()) return;
                  setRemindHavdalah(v);
                }}
              />
            </View>

            <Pressable onPress={() => { if (!isPremium) navigation.navigate('Paywall'); }}>
              {isPremium ? (
                'Premium enabled'
              ) : (
                <>
                  <Text style={styles.premiumNote}>Premium feature — </Text>
                  <Text style={[styles.premiumNote, styles.unlockText]}>tap to unlock</Text>
                </>
              )}
            </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  container: { flex: 1 },
  content: {
    paddingTop: Platform.select({ ios: 74, android: 28, default: 28 }),
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  topRow: { alignItems: 'center', marginBottom: 18 },
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
  travelPillText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  travelPillOn: { fontWeight: '800', color: '#0f766e' },
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

  heroCard: { paddingVertical: 20 },
  cardHeader: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#0b0f1a',
    marginTop: 2,
  },
  heroCountdown: {
    textAlign: 'center',
    fontSize: 44,
    fontWeight: '900',
    color: '#0b0f1a',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  heroSub: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },

  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  timesLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  timesValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  timesIcon: { fontSize: 14 },
  windowText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 6,
  },

  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  reminderText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },

  rowDivider: { height: 1, backgroundColor: 'rgba(17,24,39,0.10)' },

  premiumNote: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  unlockText: {
    color: '#000000',
  },

  debugBox: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(17,24,39,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.10)',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  debugLine: { fontSize: 11, color: '#111827', marginTop: 2 },
});
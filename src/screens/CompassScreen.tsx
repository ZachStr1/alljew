import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAY_BG = {
  uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80',
};

const NIGHT_BG = {
  uri: 'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1400&q=80',
};

function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function isEastHeading(deg: number, toleranceDeg = 8): boolean {
  const h = normalizeHeading(deg);
  return Math.abs(h - 90) <= toleranceDeg;
}

export default function CompassScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [heading, setHeading] = useState<number | null>(null);
  const [headingError, setHeadingError] = useState<string | null>(null);

  const facingEast = heading != null ? isEastHeading(heading) : false;

  // Use local time as a simple day/night toggle (consistent with rest of app)
  const isNight = useMemo(() => {
    const h = new Date().getHours();
    return h >= 18 || h < 6;
  }, []);

  const bgSource = isNight ? NIGHT_BG : DAY_BG;

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    const start = async () => {
      try {
        setHeadingError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHeadingError('Location permission is required for compass heading.');
          return;
        }

        sub = await Location.watchHeadingAsync((h) => {
          const deg =
            typeof h.trueHeading === 'number' && h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          if (typeof deg === 'number' && !Number.isNaN(deg)) {
            setHeading(normalizeHeading(deg));
          }
        });
      } catch {
        setHeadingError('Compass heading unavailable on this device/simulator.');
      }
    };

    start();

    return () => {
      if (sub) sub.remove();
      sub = null;
    };
  }, []);

  // Needle rotation: we want the needle to point to where you are facing.
  // Our needle is drawn pointing to the right (East). So rotate by (heading - 90).
  const needleRotation = heading == null ? 0 : heading - 90;

  return (
    <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
      <View style={styles.dimOverlay} />

      <View style={[styles.content, { paddingTop: insets.top + 18 }]}>
        {/* Top header (back + centered title) */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Compass</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Hero glass card */}
        <View style={styles.heroCard}>
          <View style={[styles.dialOuter, facingEast && styles.dialOuterEast]}>
            <View style={styles.dialInner}>
              {/* Tick marks (simple) */}
              {Array.from({ length: 36 }).map((_, i) => {
                const rot = i * 10;
                const isMajor = i % 3 === 0;
                return (
                  <View
                    key={i}
                    style={[
                      styles.tick,
                      isMajor ? styles.tickMajor : styles.tickMinor,
                      { transform: [{ rotate: `${rot}deg` }] },
                    ]}
                  />
                );
              })}

              {/* Cardinal letters */}
              <Text style={[styles.cardinal, styles.n]}>N</Text>
              <Text style={[styles.cardinal, styles.e]}>E</Text>
              <Text style={[styles.cardinal, styles.s]}>S</Text>
              <Text style={[styles.cardinal, styles.w]}>W</Text>

              {/* Needle */}
              <View style={[styles.needleWrap, { transform: [{ rotate: `${needleRotation}deg` }] }]}>
                <View style={[styles.needleBar, facingEast && styles.needleBarEast]} />
              </View>

              <View style={styles.centerKnob} />

              <Text style={[styles.facingText, facingEast && styles.facingTextEast]}>
                {facingEast ? 'Facing East' : 'Turn toward East'}
              </Text>
            </View>
          </View>
        </View>

        {/* Heading glass card */}
        <View style={styles.headingCard}>
          <Text style={styles.headingLabel}>Heading</Text>
          <Text style={styles.headingValue}>
            {heading == null ? '—' : `${Math.round(heading)}°`}
          </Text>
          <Text style={[styles.headingStatus, facingEast && styles.headingStatusEast]}>
            {headingError
              ? headingError
              : heading == null
                ? '—'
                : facingEast
                  ? 'You are facing East ✓'
                  : 'You are not facing East'}
          </Text>
        </View>

        {/* bottom spacing so it sits nicely above the tab bar */}
        <View style={{ height: 20 }} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },

  content: {
    flex: 1,
  },

  headerRow: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },

  heroCard: {
    marginHorizontal: 18,
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    alignItems: 'center',
  },

  dialOuter: {
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.14)',
    padding: 10,
  },
  dialOuterEast: {
    borderColor: 'rgba(34,197,94,0.55)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.35,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  dialInner: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 6,
    borderColor: 'rgba(17,24,39,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  tick: {
    position: 'absolute',
    width: 2,
    top: 10,
    left: '50%',
  },
  tickMajor: {
    height: 14,
    backgroundColor: 'rgba(17,24,39,0.35)',
  },
  tickMinor: {
    height: 8,
    backgroundColor: 'rgba(17,24,39,0.22)',
  },

  cardinal: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  n: { top: 18 },
  s: { bottom: 18 },
  e: { right: 22 },
  w: { left: 22 },

  needleWrap: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleBar: {
    width: 180,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  needleBarEast: {
    backgroundColor: '#22c55e',
  },
  centerKnob: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.35)',
  },

  facingText: {
    position: 'absolute',
    bottom: 58,
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(17,24,39,0.72)',
  },
  facingTextEast: {
    color: '#15803d',
  },

  headingCard: {
    marginTop: 16,
    marginHorizontal: 18,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    alignItems: 'center',
  },
  headingLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  headingValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0b0f1a',
    fontVariant: ['tabular-nums'],
    lineHeight: 52,
  },
  headingStatus: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(17,24,39,0.70)',
    textAlign: 'center',
  },
  headingStatusEast: {
    color: '#15803d',
  },
});

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
  ImageBackground,
  Image,
} from 'react-native';
import Constants from 'expo-constants';

import { useAppState } from '../state/AppState';
import { useTravelLocation } from '../lib/useTravelLocation';
import { useKosherData, KosherPlace } from '../lib/useKosherData';
import LocationPill from '../components/LocationPill';

type FilterType = 'all' | 'restaurant' | 'grocery' | 'bakery';

type FilterButton = {
  key: FilterType;
  label: string;
};

const CITY_DAY_BG = {
  uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
};

const CITY_NIGHT_BG = {
  uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1400&q=80',
};

function safeText(value: any, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if (typeof (value as any).title === 'string') return (value as any).title;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function getCategoryLabel(place: any, fallback: string): string {
  const c = (place?.category as string | undefined) ?? '';
  if (c) return c;

  const types: string[] = Array.isArray(place?.types) ? place.types : [];
  const lower = types.join(' ').toLowerCase();
  if (lower.includes('bakery')) return 'Bakery';
  if (lower.includes('grocery') || lower.includes('supermarket') || lower.includes('store')) return 'Grocery';
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('meal')) return 'Restaurant';
  return fallback;
}

export default function KosherScreen() {
  const { effectiveCoords, locationMode, setLocationMode } = useAppState();
  useTravelLocation();

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const kosherData = useKosherData(effectiveCoords, filterType);

  const travelOn = locationMode === 'TRAVEL';
  const toggleMode = () => setLocationMode(travelOn ? 'MANUAL' : 'TRAVEL');

  const isNight = useMemo(() => {
    const h = new Date().getHours();
    return h >= 18 || h < 6;
  }, []);

  const bgSource = isNight ? CITY_NIGHT_BG : CITY_DAY_BG;

  const filters: FilterButton[] = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: 'restaurant', label: 'Restaurants' },
      { key: 'grocery', label: 'Grocery' },
      { key: 'bakery', label: 'Bakery' },
    ],
    []
  );

  const openInMaps = (place: KosherPlace) => {
    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const latLng = `${place.location.latitude},${place.location.longitude}`;
    const label = encodeURIComponent(place.name);

    const url = Platform.select({
      ios: `${scheme}?q=${label}&ll=${latLng}`,
      android: `${scheme}${latLng}?q=${label}`,
    });

    if (url) Linking.openURL(url);
  };

  const openAreaInMaps = () => {
    if (!effectiveCoords) return;
    const latLng = `${effectiveCoords.latitude},${effectiveCoords.longitude}`;
    const url = Platform.select({
      ios: `maps:?ll=${latLng}`,
      android: `geo:${latLng}?q=${latLng}`,
    });
    if (url) Linking.openURL(url);
  };

  const locationLabel =
    (kosherData as any)?.locationLabel ??
    (kosherData as any)?.city ??
    (kosherData as any)?.placeName ??
    null;

  const mapsKey =
    (Constants.expoConfig?.extra as any)?.googlePlacesApiKey ||
    (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    (Constants.manifest2 as any)?.extra?.expoClient?.extra?.googlePlacesApiKey ||
    (Constants.manifest as any)?.extra?.googlePlacesApiKey ||
    null;

  const staticMapUrl = useMemo(() => {
    if (!effectiveCoords) return null;
    if (!mapsKey) return null;

    const { latitude, longitude } = effectiveCoords;

    const markers = (kosherData.places ?? []).slice(0, 3);

    const markerParams = markers
      .map((p) => {
        const lat = p.location.latitude;
        const lng = p.location.longitude;
        return `markers=color:0xF59E0B|${lat},${lng}`;
      })
      .join('&');

    const centerMarker = `markers=color:0x2563EB|${latitude},${longitude}`;

    const size = '640x280';
    const zoom = 13;

    const base = 'https://maps.googleapis.com/maps/api/staticmap';
    const url =
      `${base}?center=${latitude},${longitude}` +
      `&zoom=${zoom}` +
      `&size=${size}` +
      `&scale=2` +
      `&maptype=roadmap` +
      `&${centerMarker}` +
      (markerParams ? `&${markerParams}` : '') +
      `&key=${mapsKey}`;

    return url;
  }, [effectiveCoords, mapsKey, kosherData.places]);

  const renderRow = (place: KosherPlace, idx: number) => {
    const categoryFallback =
      filterType === 'restaurant'
        ? 'Restaurant'
        : filterType === 'grocery'
          ? 'Grocery'
          : filterType === 'bakery'
            ? 'Bakery'
            : 'Kosher';

    const category = getCategoryLabel(place as any, categoryFallback);
    const rowId = (place.id ?? `${place.name}-${idx}`) as string;
    const isExpandedRow = expandedId === rowId;

    const hoursText: string[] | null =
      (place as any)?.weekdayText ??
      (place as any)?.openingHoursText ??
      (place as any)?.opening_hours?.weekday_text ??
      (place as any)?.openingHours?.weekdayText ??
      null;

    const toggleExpanded = () => {
      setExpandedId((prev) => (prev === rowId ? null : rowId));
    };

    return (
      <View key={rowId} style={[styles.listRowWrap, idx === 0 && styles.listRowFirstWrap]}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => openInMaps(place)} style={styles.listRow}>
          <View style={styles.listRowLeft}>
            <Text style={styles.placeName} numberOfLines={1} allowFontScaling={false}>
              {place.name}
            </Text>
            <Text style={styles.placeMeta} numberOfLines={1} allowFontScaling={false}>
              {category} • {place.distanceText}
              {typeof place.rating === 'number' ? ` • ⭐ ${place.rating.toFixed(1)}` : ''}
            </Text>
          </View>

          <View style={styles.listRowRight}>
            {place.isOpen !== undefined ? (
              <Text
                allowFontScaling={false}
                style={[styles.openText, place.isOpen ? styles.open : styles.closed]}
              >
                {place.isOpen ? 'Open' : 'Closed'}
              </Text>
            ) : (
              <Text allowFontScaling={false} style={[styles.openText, styles.unknown]}>
                —
              </Text>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={toggleExpanded}
              style={styles.detailsButton}
              accessibilityRole="button"
              accessibilityLabel={isExpandedRow ? 'Hide hours' : 'Show hours'}
            >
              <Text allowFontScaling={false} style={styles.detailsIcon}>
                {isExpandedRow ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {isExpandedRow ? (
          <View style={styles.detailsPanel}>
            <Text allowFontScaling={false} style={styles.detailsTitle}>
              Hours
            </Text>

            {Array.isArray(hoursText) && hoursText.length > 0 ? (
              hoursText.map((line, i) => (
                <Text allowFontScaling={false} key={`${rowId}-h-${i}`} style={styles.detailsLine}>
                  {line}
                </Text>
              ))
            ) : (
              <Text allowFontScaling={false} style={styles.detailsLineMuted}>
                Hours not available for this place.
              </Text>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  if (!effectiveCoords) {
    return (
      <View style={styles.centerContainer}>
        <Text allowFontScaling={false} style={styles.messageText}>
          Location not available. Enable location services or set manual location.
        </Text>
      </View>
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
        {/* Travel Mode pill */}
               {/* Top pill */}
               <LocationPill />

          <Text allowFontScaling={false} style={styles.subtitle}>
            {locationLabel
              ? `Showing kosher options near ${safeText(locationLabel)}`
              : 'Showing kosher options near you'}
          </Text>
        

        {/* Filter bar */}
        <View style={styles.cardGlass}>
          <View style={styles.filterRow}>
            {filters.map((f) => {
              const active = f.key === filterType;
              return (
                <TouchableOpacity
                  key={f.key}
                  activeOpacity={0.9}
                  onPress={() => setFilterType(f.key)}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={[styles.filterText, active && styles.filterTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* List card */}
        <View style={[styles.cardGlass, styles.listCard]}>
          {kosherData.isLoading ? (
            <View style={styles.centerInner}>
              <ActivityIndicator size="large" color="#0f766e" />
              <Text allowFontScaling={false} style={styles.loadingText}>
                Searching for kosher places...
              </Text>
            </View>
          ) : kosherData.error ? (
            <View style={styles.centerInner}>
              <Text allowFontScaling={false} style={styles.errorText}>
                ⚠️ {kosherData.error}
              </Text>
              <Text allowFontScaling={false} style={styles.errorHint}>
                Check your Google Places API key configuration.
              </Text>
            </View>
          ) : kosherData.places.length === 0 ? (
            <View style={styles.centerInner}>
              <Text allowFontScaling={false} style={styles.messageText}>
                No kosher places found nearby.
              </Text>
              <Text allowFontScaling={false} style={styles.errorHint}>
                Try a different filter or location.
              </Text>
            </View>
          ) : (
            <View style={styles.listWrap}>{kosherData.places.slice(0, 10).map(renderRow)}</View>
          )}
        </View>

        {/* Map preview card */}
        <View style={[styles.cardGlass, styles.mapCard]}>
          <View style={styles.mapPreview}>
            {staticMapUrl ? (
              <Image source={{ uri: staticMapUrl }} style={styles.mapImage} resizeMode="cover" />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text allowFontScaling={false} style={styles.mapPlaceholderText}>
                  {mapsKey ? 'Map preview unavailable' : 'Missing Google Maps key'}
                </Text>
              </View>
            )}

            <View style={styles.mapGlassOverlay} />
          </View>

          <TouchableOpacity activeOpacity={0.9} style={styles.mapButton} onPress={openAreaInMaps}>
            <Text allowFontScaling={false} style={styles.mapButtonIcon}>
              🗺️
            </Text>
            <Text allowFontScaling={false} style={styles.mapButtonText}>
              Open in Maps
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  container: { flex: 1 },
  content: {
    paddingTop: Platform.select({ ios: 74, android: 28, default: 28 }),
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 14,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  topControls: { alignItems: 'center', marginBottom: 4 },
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
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },

  cardGlass: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterPill: {
    flex: 1,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(17,24,39,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(17,24,39,0.12)',
  },
  filterText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: '#4b5563',
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#111827',
    fontWeight: '900',
  },

  listCard: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  listWrap: {
    backgroundColor: 'transparent',
  },

  listRowWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,24,39,0.10)',
  },
  listRowFirstWrap: {
    borderTopWidth: 0,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  listRowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  placeMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  openText: {
    fontSize: 14,
    fontWeight: '900',
  },
  open: { color: '#16a34a' },
  closed: { color: '#6b7280' },
  unknown: { color: '#9ca3af' },

  detailsButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.08)',
  },
  detailsIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6b7280',
    lineHeight: 18,
  },

  detailsPanel: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  detailsLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 4,
  },
  detailsLineMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 4,
  },

  mapCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  mapPreview: {
    height: 110,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.10)',
    overflow: 'hidden',
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mapGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  mapPlaceholderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textAlign: 'center',
  },

  mapButton: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.10)',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mapButtonIcon: { fontSize: 14 },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  centerInner: {
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b91c1c',
    textAlign: 'center',
  },
  errorHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
});
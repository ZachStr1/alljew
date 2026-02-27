import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Location from "expo-location";

type Coords = { latitude: number; longitude: number };
type LocationMode = "TRAVEL" | "MANUAL";

type AppStateValue = {
  locationMode: LocationMode;
  setLocationMode: (mode: LocationMode) => void;

  // coords
  travelCoords: Coords | null;
  setTravelCoords: (coords: Coords | null) => void;

  manualCoords: Coords | null;
  manualLabel: string | null;
  setManualCoords: (coords: Coords | null, label?: string | null) => void;

  // always what the app should use
  effectiveCoords: Coords | null;

  // premium
  isPremium: boolean;
  refreshPremium: () => Promise<boolean>;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [locationMode, _setLocationMode] = useState<LocationMode>("TRAVEL");

  const [travelCoords, setTravelCoords] = useState<Coords | null>(null);

  const [manualCoords, _setManualCoords] = useState<Coords | null>(null);
  const [manualLabel, setManualLabel] = useState<string | null>(null);

  // premium
  const [isPremium, setIsPremium] = useState(false);

  // manual location modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const setManualCoords = (coords: Coords | null, label?: string | null) => {
    _setManualCoords(coords);
    if (typeof label !== "undefined") setManualLabel(label);
  };

  const effectiveCoords = useMemo(() => {
    if (locationMode === "TRAVEL") return travelCoords;
    // MANUAL: if not set yet, fall back to last travel coords so the app never breaks
    return manualCoords ?? travelCoords;
  }, [locationMode, travelCoords, manualCoords]);

  const setLocationMode = (mode: LocationMode) => {
    _setLocationMode(mode);

    // If switching to MANUAL, open the modal so user can choose a place.
    if (mode === "MANUAL") {
      // If they don't have a manual location yet, prefill with something nice.
      if (!manualCoords && travelCoords) {
        setManualCoords(travelCoords, "Current location");
      }
      setManualError(null);
      setManualModalOpen(true);
    }
  };

  const closeManualModal = () => {
    setManualModalOpen(false);
    setManualError(null);
    setManualLoading(false);
  };

  const applyManualLocation = async () => {
    const query = manualQuery.trim();
    if (!query) {
      setManualError("Type a city, address, or zip code.");
      return;
    }

    try {
      setManualLoading(true);
      setManualError(null);

      // Use Expo geocoding (no extra API key needed)
      const results = await Location.geocodeAsync(query);

      if (!results || results.length === 0) {
        setManualError("No results found. Try a more specific location.");
        setManualLoading(false);
        return;
      }

      const first = results[0];
      const coords = { latitude: first.latitude, longitude: first.longitude };
      setManualCoords(coords, query);

      setManualLoading(false);
      setManualModalOpen(false);
    } catch (e: any) {
      setManualLoading(false);
      setManualError(e?.message ?? "Could not set location.");
    }
  };

  // Premium is coming soon (RevenueCat disabled for now)
  const refreshPremium = useCallback(async () => {
    // Keep the API shape so the app can call this safely.
    // For now, premium is always false.
    setIsPremium(false);
    return false;
  }, []);

  const value: AppStateValue = {
    locationMode,
    setLocationMode,

    travelCoords,
    setTravelCoords,

    manualCoords,
    manualLabel,
    setManualCoords,

    effectiveCoords,

    isPremium,
    refreshPremium,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}

      {/* Manual location picker modal */}
      <Modal
        visible={manualModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeManualModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text allowFontScaling={false} style={styles.modalTitle}>
              Set Manual Location
            </Text>
            <Text allowFontScaling={false} style={styles.modalSubtitle}>
              Type any city, address, or zip code. (Example: “Woodmere, NY”)
            </Text>

            <TextInput
              value={manualQuery}
              onChangeText={setManualQuery}
              placeholder="Search location…"
              placeholderTextColor="rgba(17,24,39,0.45)"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
            />

            {manualError ? (
              <Text allowFontScaling={false} style={styles.errorText}>
                {manualError}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  closeManualModal();
                }}
                style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
              >
                <Text allowFontScaling={false} style={styles.btnGhostText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={applyManualLocation}
                disabled={manualLoading}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnPrimary,
                  pressed && !manualLoading && styles.pressed,
                  manualLoading && { opacity: 0.75 },
                ]}
              >
                {manualLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text allowFontScaling={false} style={styles.btnPrimaryText}>
                    Set
                  </Text>
                )}
              </Pressable>
            </View>

            <Text allowFontScaling={false} style={styles.modalHint}>
              Tip: Turn Live Location back ON anytime from the pill.
            </Text>
          </View>
        </View>
      </Modal>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.65)",
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.12)",
    backgroundColor: "rgba(255,255,255,0.8)",
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#b91c1c",
  },
  modalActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  btn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnGhost: {
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.1)",
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  btnPrimary: {
    backgroundColor: "#2563eb",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ffffff",
  },
  pressed: {
    opacity: Platform.select({ ios: 0.85, android: 0.9, default: 0.9 }),
  },
  modalHint: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(17,24,39,0.55)",
  },
});
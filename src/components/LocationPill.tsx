import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppState } from "../state/AppState";

type Props = {
  // optional: if you want the pill to say Travel Mode instead
  label?: string; // default "Live Location"
};

export default function LocationPill({ label = "Live Location" }: Props) {
  const { locationMode, setLocationMode, manualLabel } = useAppState();

  const isLive = locationMode === "TRAVEL";

  return (
    <View style={styles.wrap}>
      {/* Main pill toggles live/manual */}
      <Pressable
        onPress={() => setLocationMode(isLive ? "MANUAL" : "TRAVEL")}
        style={({ pressed }) => [styles.pill, pressed && { opacity: 0.9 }]}
      >
        <Text allowFontScaling={false} style={{ fontSize: 16 }}>
          📍
        </Text>

        <Text allowFontScaling={false} style={styles.text}>
          {label}:{" "}
          <Text style={[styles.status, isLive ? styles.on : styles.off]}>
            {isLive ? "On" : "Off"}
          </Text>
        </Text>

        {/* When manual mode: show label + edit button */}
        {!isLive && (
          <View style={styles.manualRight}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.manualLabel}>
              {manualLabel ?? "Set location"}
            </Text>

            {/* Pencil = open modal again (no toggle required) */}
            <Pressable
              onPress={() => setLocationMode("MANUAL")}
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.85 }]}
              hitSlop={10}
            >
              <Ionicons name="pencil" size={14} color="#111827" />
            </Pressable>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.70)",
  },
  text: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  status: {
    fontWeight: "900",
  },
  on: { color: "#0f766e" },
  off: { color: "#6b7280" },

  manualRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 6,
    maxWidth: 170,
  },
  manualLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.70)",
    maxWidth: 120,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.08)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
});
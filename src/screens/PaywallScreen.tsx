import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ComingSoonModal from "../components/ComingSoonModal";

import { useAppState } from "../state/AppState";

export default function PaywallScreen() {
  const navigation = useNavigation<any>();
  const { isPremium, refreshPremium } = useAppState();

  const [showComingSoon, setShowComingSoon] = useState(false);

  // If user is already premium, bounce back
  useEffect(() => {
    if (isPremium) navigation.goBack();
  }, [isPremium, navigation]);

  const openPaywall = () => {
    setShowComingSoon(true);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>

        <Text style={styles.title}>Premium</Text>

        <View style={{ width: 40 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.h1}>Unlock Shabbat Reminders</Text>
        <Text style={styles.sub}>
          Get notifications for candle lighting, Shabbat start, and Havdalah.
        </Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>• Remind me 30 minutes before candle lighting</Text>
          <Text style={styles.bullet}>• Remind me at candle lighting</Text>
          <Text style={styles.bullet}>• Remind me at Havdalah</Text>
        </View>

        <Pressable
          onPress={openPaywall}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          disabled={false}
        >
          <Text style={styles.primaryBtnText}>Upgrade</Text>
        </Pressable>

        <Text style={styles.smallPrint}>
          Coming soon: subscriptions via the App Store / Play Store.
        </Text>
      </View>
      <ComingSoonModal
        visible={showComingSoon}
        onClose={() => setShowComingSoon(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingTop: Platform.select({ ios: 64, android: 24, default: 24 }),
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  card: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",
    padding: 18,
  },
  h1: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(17,24,39,0.65)",
    lineHeight: 20,
    marginBottom: 14,
  },
  bullets: {
    gap: 8,
    marginBottom: 14,
  },
  bullet: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  primaryBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#ffffff",
  },
  smallPrint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(17,24,39,0.55)",
  },
});
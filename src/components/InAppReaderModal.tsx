import React from "react";
import { Modal, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  title?: string;
  url: string | null;
  onClose: () => void;
};

export default function InAppReaderModal({ visible, title, url, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>

          <Text allowFontScaling={false} style={styles.title} numberOfLines={1}>
            {title ?? "Siddur"}
          </Text>

          <View style={styles.rightSpacer} />
        </View>

        {/* Web */}
        {url ? (
          <WebView
            source={{ uri: url }}
            startInLoadingState
            allowsBackForwardNavigationGestures
            setSupportMultipleWindows={false}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },

  header: {
    paddingTop: Platform.select({ ios: 54, android: 18, default: 18 }),
    paddingBottom: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,24,39,0.10)",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  rightSpacer: { width: 40, height: 40 },
});
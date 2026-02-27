import React from "react";
import { Modal, View, Text, Pressable } from "react-native";

const RNModal = Modal as any;
const RNView = View as any;
const RNText = Text as any;
const RNPressable = Pressable as any;

export default function ComingSoonModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return React.createElement(
    RNModal,
    {
      visible,
      transparent: true,
      animationType: "fade",
      onRequestClose: onClose,
    },
    React.createElement(
      RNView,
      {
        style: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        },
      },
      React.createElement(
        RNView,
        {
          style: {
            width: "100%",
            maxWidth: 420,
            backgroundColor: "white",
            borderRadius: 16,
            padding: 20,
          },
        },
        React.createElement(
          RNText,
          { style: { fontSize: 18, fontWeight: "700", marginBottom: 8 } },
          "Premium Coming Soon"
        ),
        React.createElement(
          RNText,
          { style: { fontSize: 14, lineHeight: 20, marginBottom: 16 } },
          "Subscriptions will be enabled after Apple Developer + App Store Connect setup is finalized.\nThe paywall and entitlements are already built—this is the final step."
        ),
        React.createElement(
          RNPressable,
          {
            onPress: onClose,
            style: {
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              backgroundColor: "#111",
            },
          },
          React.createElement(
            RNText,
            { style: { color: "white", fontWeight: "600" } },
            "Got it"
          )
        )
      )
    )
  );
}
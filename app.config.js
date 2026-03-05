// app.config.js
try {
  require("dotenv").config();
} catch (e) {
  // Expo CLI can load .env without dotenv; don't crash native builds if dotenv isn't resolvable.
}

module.exports = ({ config }) => {
  const ios = (config && config.ios) || {};
  const android = (config && config.android) || {};
  const extra = (config && config.extra) || {};

  return {
    ...config,

    // App Store / Play Store display name + Expo slug
    name: "AllJew",
    icon: "./assets/icon.png",

    ios: {
      ...ios,
      bundleIdentifier: "com.zacharystrauss.alljew",
    },

    android: {
      ...android,
      package: "com.zacharystrauss.alljew",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#0B1F3B",
      },
    },

    extra: {
      ...extra,
      // Prefer EXPO_PUBLIC_ (recommended by Expo), but fall back to GOOGLE_ if you already use that.
      googlePlacesApiKey: (() => {
        const key =
          process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
          process.env.GOOGLE_PLACES_API_KEY;
        if (!key) {
          throw new Error(
            "Missing Google Places API key. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY (recommended) or GOOGLE_PLACES_API_KEY in your environment."
          );
        }
        return key;
      })(),
    },
  };
};
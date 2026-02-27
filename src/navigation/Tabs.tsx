import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CompassScreen from "../screens/CompassScreen";

import TodayScreen from "../screens/TodayScreen";
import ZmanimScreen from "../screens/ZmanimScreen";
import ShabbatScreen from "../screens/ShabbatScreen";
import DaveningScreen from "../screens/DaveningScreen";
import KosherScreen from "../screens/KosherScreen";

const Tab = createBottomTabNavigator();

const DaveningStack = createNativeStackNavigator();

function DaveningStackScreen() {
  return (
    <DaveningStack.Navigator screenOptions={{ headerShown: false }}>
      <DaveningStack.Screen name="DaveningMain" component={DaveningScreen} />
      <DaveningStack.Screen name="Compass" component={CompassScreen} />
    </DaveningStack.Navigator>
  );
}

export default function Tabs() {
  const insets = useSafeAreaInsets();

  // top spacing (dynamic island)
  const topPad = Math.max(insets.top + 10, 22);

  // bottom spacing (home indicator)
  const bottomPad = Math.max(insets.bottom, 10);
  const barHeight = 56 + bottomPad;

  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: "transparent", paddingTop: topPad },

        tabBarBackground: () => (
            <BlurView intensity={25} tint="light" style={{ flex: 1 }} />
          ),

        tabBarIcon: ({ size, focused }) => {
          const iconColor = focused ? "#2563eb" : "#6b7280"; 

          if (route.name === "Today") {
            return <Ionicons name="sunny-outline" size={22} color={iconColor} />;
          }

          if (route.name === "Zmanim") {
            return <Ionicons name="time-outline" size={22} color={iconColor} />;
          }

          if (route.name === "Shabbat") {
            return (
              <MaterialCommunityIcons
                name="candle"
                size={22}
                color={iconColor}
              />
            );
          }

          if (route.name === "Davening") {
            return (
              <MaterialCommunityIcons
                name="book-outline"
                size={22}
                color={iconColor}
              />
            );
          }

          if (route.name === "Kosher") {
            return (
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={22}
                color={iconColor}
              />
            );
          }

          return null;
        },

        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: barHeight,
          paddingBottom: bottomPad,
          borderTopWidth: 0,
          backgroundColor: "transparent",

          shadowColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: Platform.select({ ios: 6, android: 8, default: 8 }),
        },

        tabBarIconStyle: {
          marginTop: Platform.select({ ios: 8, android: 8, default: 8 }),
        },

        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#6b7280",
      })}
    >
      <Tab.Screen name="Zmanim" component={ZmanimScreen} />
      <Tab.Screen name="Shabbat" component={ShabbatScreen} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Davening" component={DaveningStackScreen} />
      <Tab.Screen name="Kosher" component={KosherScreen} />
    </Tab.Navigator>
  );
}
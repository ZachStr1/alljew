import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PaywallScreen from "../screens/PaywallScreen";

import Tabs from "./Tabs";

export type RootStackParamList = {
  Tabs: undefined;
  Paywall: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
Paywall: undefined;

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
    </Stack.Navigator>
  );
}
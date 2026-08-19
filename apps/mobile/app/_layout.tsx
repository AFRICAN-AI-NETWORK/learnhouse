import "../ReactotronConfig";
import React, { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider, useAppTheme } from "../context/ThemeContext";
import { NetworkProvider } from "../context/NetworkContext";
import { CurrencyProvider } from "../context/CurrencyContext";
import { Text, TextInput } from "react-native";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function getFontFamilyForWeight(styleArray: any[]) {
  let weight = "500";
  for (const s of styleArray) {
    if (s && s.fontWeight) {
      weight = s.fontWeight.toString();
    }
  }
  let fontFamily = "PlusJakartaSans_500Medium";
  if (weight === "400" || weight === "normal")
    fontFamily = "PlusJakartaSans_400Regular";
  if (weight === "600") fontFamily = "PlusJakartaSans_600SemiBold";
  if (weight === "700" || weight === "bold")
    fontFamily = "PlusJakartaSans_700Bold";
  if (weight === "800" || weight === "900")
    fontFamily = "PlusJakartaSans_800ExtraBold";
  return fontFamily;
}

// Apply global font hack for React Native
const oldTextRender = (Text as any).render;
(Text as any).render = function (...args: any[]) {
  const origin = oldTextRender.call(this, ...args);
  const styleArray = Array.isArray(origin.props.style)
    ? origin.props.style
    : [origin.props.style];
  return React.cloneElement(origin, {
    style: [{ fontFamily: getFontFamilyForWeight(styleArray) }, ...styleArray],
  });
};

const oldTextInputRender = (TextInput as any).render;
(TextInput as any).render = function (...args: any[]) {
  const origin = oldTextInputRender.call(this, ...args);
  const styleArray = Array.isArray(origin.props.style)
    ? origin.props.style
    : [origin.props.style];
  return React.cloneElement(origin, {
    style: [{ fontFamily: getFontFamilyForWeight(styleArray) }, ...styleArray],
  });
};

function AppNavigator() {
  const { Theme, isDark } = useAppTheme();

  return (
    <AuthProvider>
      <NetworkProvider>
        <CurrencyProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Theme.colors.background },
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen
              name="auth/login"
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          </Stack>
        </CurrencyProvider>
      </NetworkProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}

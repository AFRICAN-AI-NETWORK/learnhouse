import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "system",
  setThemeMode: () => {},
  isDark: false,
});

export const useThemeState = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem("@appearance_mode");
        if (storedTheme) {
          setThemeModeState(storedTheme as ThemeMode);
        }
      } catch (error) {
        console.error("Failed to load theme state", error);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem("@appearance_mode", mode);
    } catch (error) {
      console.error("Failed to save theme state", error);
    }
  };

  const isDark =
    themeMode === "system"
      ? systemColorScheme === "dark"
      : themeMode === "dark";

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

import { lightColors, darkColors, Theme } from "../constants/theme";

export const useAppTheme = () => {
  const { isDark, themeMode, setThemeMode } = useThemeState();
  const colors = isDark ? darkColors : lightColors;
  return {
    Theme: { ...Theme, colors }, // The dynamic full Theme object
    colors,
    isDark,
    themeMode,
    setThemeMode,
  };
};

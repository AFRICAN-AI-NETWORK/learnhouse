import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";

export default function LandingScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const { session, isLoading } = useAuth();
  const router = useRouter();

  // Animation drivers
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Parallel Logo Entrance Animation
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Delayed Subtitle Fade In
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // 3. Navigation Timer (1.8s duration)
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (session) {
          router.replace("/(tabs)");
        } else {
          router.replace("/auth/login");
        }
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoading, session]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/aina_doodle_bg.png")}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.06 }}
        resizeMode="repeat"
      >
        <View style={styles.contentContainer}>
          {/* Animated Logo Image */}
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require("../assets/aina_logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Animated Subtitle & Loading Spinner */}
          <Animated.View style={[styles.textWrapper, { opacity: textOpacity }]}>
            <Text style={styles.appTagline}>African AI Network Academy</Text>
            <ActivityIndicator
              size="small"
              color={Theme.colors.primary}
              style={styles.spinner}
            />
          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
}

const makeStyles = (Theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#ffffff",
    },
    backgroundImage: {
      flex: 1,
      width: "100%",
      height: "100%",
    },
    contentContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: Theme.spacing.xl,
    },
    logoWrapper: {
      alignItems: "center",
      marginBottom: Theme.spacing.md,
    },
    brandLogo: {
      width: 240,
      height: 76,
    },
    textWrapper: {
      alignItems: "center",
      marginTop: Theme.spacing.sm,
    },
    appTagline: {
      fontSize: 13,
      fontWeight: "600",
      color: Theme.colors.textMuted,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: Theme.spacing.xl,
    },
    spinner: {
      marginTop: Theme.spacing.md,
    },
  });

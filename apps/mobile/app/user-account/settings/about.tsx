import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../../context/ThemeContext";
import {
  ArrowLeft,
  AtSign,
  Briefcase,
  Camera,
  FileText,
  Shield,
  Globe,
} from "lucide-react-native";

export default function AboutScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/profile");
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About AINA</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Info & Mission */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/aina_logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>African AI Network Academy</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>

          <Text style={styles.missionText}>
            Practical tech education for Africa's next generation of
            professionals. Learn skills. Build projects. Get hired.
          </Text>
        </View>

        {/* Legal Links */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <View style={styles.listContainer}>
            <TouchableOpacity
              style={styles.listItem}
              activeOpacity={0.7}
              onPress={() =>
                openLink("https://lms.africanainetwork.com/policy")
              }
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: "rgba(16, 185, 129, 0.1)" },
                ]}
              >
                <Shield size={20} color="#10b981" />
              </View>
              <Text style={styles.listItemText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>

          <View style={styles.listContainer}>
            <TouchableOpacity
              style={styles.listItem}
              activeOpacity={0.7}
              onPress={() => openLink("https://x.com/_AANetwork_")}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: "rgba(0, 0, 0, 0.05)" },
                ]}
              >
                <AtSign size={20} color={Theme.colors.text} />
              </View>
              <Text style={styles.listItemText}>Twitter / X</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.listItem}
              activeOpacity={0.7}
              onPress={() =>
                openLink("https://www.linkedin.com/company/african-ai-network/")
              }
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: "rgba(10, 102, 194, 0.1)" },
                ]}
              >
                <Briefcase size={20} color="#0a66c2" />
              </View>
              <Text style={styles.listItemText}>LinkedIn</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.listItem}
              activeOpacity={0.7}
              onPress={() =>
                openLink("https://www.instagram.com/africanainetwork")
              }
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: "rgba(225, 48, 108, 0.1)" },
                ]}
              >
                <Camera size={20} color="#e1306c" />
              </View>
              <Text style={styles.listItemText}>Instagram</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer website link */}
        <TouchableOpacity
          style={styles.websiteLink}
          activeOpacity={0.7}
          onPress={() => openLink("https://africanainetwork.com")}
        >
          <Globe size={16} color={Theme.colors.primary} />
          <Text style={styles.websiteLinkText}>Visit our website</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Theme.colors.surfaceBorder,
      backgroundColor: Theme.colors.surface,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: Theme.colors.text,
    },
    scrollContent: {
      padding: Theme.spacing.lg,
      paddingBottom: 60,
    },

    // Logo & Mission
    logoContainer: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 40,
    },
    logoImage: {
      width: 240,
      height: 80,
      marginBottom: 16,
    },
    appName: {
      fontSize: 20,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: 4,
    },
    appVersion: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      marginBottom: 20,
    },
    missionText: {
      fontSize: 15,
      color: Theme.colors.text,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 16,
    },

    // Sections
    sectionContainer: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    listContainer: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      overflow: "hidden",
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    iconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    listItemText: {
      fontSize: 16,
      fontWeight: "500",
      color: Theme.colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: Theme.colors.surfaceBorder,
      marginLeft: 68, // align with text
    },

    websiteLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      gap: 8,
    },
    websiteLinkText: {
      fontSize: 15,
      fontWeight: "600",
      color: Theme.colors.primary,
    },
  });

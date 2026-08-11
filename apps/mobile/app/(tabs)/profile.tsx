import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import { getUserAvatarMediaDirectory } from "../../services/media";
import {
  User,
  LogOut,
  Building2,
  Smartphone,
  Bell,
  ChevronRight,
  AlertTriangle,
  CreditCard,
  Download,
  Moon,
  HelpCircle,
  Info,
  Shield,
} from "lucide-react-native";

export default function ProfileScreen() {
  const { session, logout } = useAuth();
  const router = useRouter();
  const { themeMode, setThemeMode, Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!session?.accessToken) return;
      setIsLoading(true);
      try {
        const res = await apiRequest("/api/v1/users/profile", {
          token: session.accessToken,
        });
        if (res.data) {
          setProfileData(res.data);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [session?.accessToken]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
    router.replace("/auth/login");
  };

  const userEmail =
    profileData?.email || session?.user?.email || "student@learnhouse.app";
  const userName = profileData?.first_name
    ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
    : session?.user?.first_name
      ? `${session.user.first_name} ${session.user.last_name || ""}`.trim()
      : "AINA Student";
  const organizationName =
    profileData?.organization?.name || "African AI Network Academy";

  const rawProfileImage =
    profileData?.avatar_image ||
    profileData?.avatar_url ||
    session?.user?.avatar_url ||
    null;
  const profileImage = getUserAvatarMediaDirectory(
    String(profileData?.user_uuid || session?.user?.id || ""),
    rawProfileImage || "",
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <User size={36} color={Theme.colors.primary} />
            )}
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>

          <View style={styles.rolePill}>
            <Building2 size={12} color={Theme.colors.primary} />
            <Text style={styles.rolePillText}>{organizationName}</Text>
          </View>
        </View>

        {/* Settings Group: ACCOUNT */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>

          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => router.push("/user-account/settings/general")}
          >
            <View style={styles.settingLeft}>
              <User size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Personal Information</Text>
                <Text style={styles.settingDescription}>
                  Update your name, email and profile photo
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <CreditCard size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Payment Methods</Text>
                <Text style={styles.settingDescription}>
                  Manage your saved cards and billing
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => router.push("/user-account/settings/security")}
          >
            <View style={styles.settingLeft}>
              <Shield size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Account Security</Text>
                <Text style={styles.settingDescription}>
                  Change your password and secure your account
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Settings Group: PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Bell size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Manage push and email notifications
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={[
                  styles.settingValue,
                  { color: Theme.colors.success, fontWeight: "600" },
                ]}
              >
                Enabled
              </Text>
              <ChevronRight
                size={18}
                color={Theme.colors.textMuted}
                style={{ marginLeft: 8 }}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Download size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Downloads</Text>
                <Text style={styles.settingDescription}>
                  Manage downloaded courses and resources
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={styles.settingLeft}>
              <Moon size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Appearance</Text>
                <Text style={styles.settingDescription}>
                  Choose your preferred theme
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.settingValue}>
                {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
              </Text>
              <ChevronRight
                size={18}
                color={Theme.colors.textMuted}
                style={{ marginLeft: 8 }}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings Group: SUPPORT & ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORT & ABOUT</Text>

          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => router.push("/user-account/settings/support")}
          >
            <View style={styles.settingLeft}>
              <HelpCircle size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>Help & Support</Text>
                <Text style={styles.settingDescription}>
                  Get help and contact support
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => router.push("/user-account/settings/about")}
          >
            <View style={styles.settingLeft}>
              <Info size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>About AINA</Text>
                <Text style={styles.settingDescription}>
                  Learn more about AINA and our mission
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <Smartphone size={18} color={Theme.colors.primary} />
              <View>
                <Text style={styles.settingLabel}>App Version</Text>
                <Text style={styles.settingDescription}>
                  You're using the latest version
                </Text>
              </View>
            </View>
            <Text style={styles.settingValue}>v1.0.0</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={Theme.colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Viewport-Centric In-App Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBadge}>
              <AlertTriangle size={24} color={Theme.colors.danger} />
            </View>

            <Text style={styles.modalTitle}>Sign Out Confirmation</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out of your AINA account?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
                disabled={isLoggingOut}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmModalBtn}
                onPress={handleConfirmLogout}
                activeOpacity={0.8}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.confirmModalBtnText}>Yes, Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appearance Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Appearance</Text>
            <Text style={styles.modalMessage}>Choose your preferred theme</Text>

            <View
              style={{ width: "100%", gap: 12, marginBottom: Theme.spacing.xl }}
            >
              {["system", "light", "dark"].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.cancelModalBtn,
                    themeMode === mode && {
                      borderColor: Theme.colors.primary,
                      backgroundColor: "rgba(0, 87, 255, 0.05)",
                    },
                  ]}
                  onPress={() => {
                    setThemeMode(mode as any);
                    setShowThemeModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cancelModalBtnText,
                      themeMode === mode && { color: Theme.colors.primary },
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { width: "100%" }]}
              onPress={() => setShowThemeModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (Theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Theme.colors.background,
    },
    scrollContent: {
      padding: Theme.spacing.lg,
    },
    profileCard: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.xl,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
      marginBottom: Theme.spacing.xl,
    },
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(0, 87, 255, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Theme.spacing.md,
      borderWidth: 1,
      borderColor: "rgba(0, 87, 255, 0.2)",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    userName: {
      fontSize: 20,
      fontWeight: "700",
      color: Theme.colors.text,
    },
    userEmail: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      marginTop: 2,
      marginBottom: Theme.spacing.md,
    },
    rolePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(0, 87, 255, 0.06)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Theme.borderRadius.full,
      borderWidth: 1,
      borderColor: "rgba(0, 87, 255, 0.15)",
    },
    rolePillText: {
      fontSize: 12,
      fontWeight: "600",
      color: Theme.colors.primary,
    },
    section: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      marginBottom: Theme.spacing.xl,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: "600",
      color: Theme.colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: Theme.spacing.md,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Theme.colors.surfaceBorder,
    },
    settingLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.md,
    },
    settingLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    settingDescription: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 13,
      color: Theme.colors.textMuted,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Theme.spacing.sm,
      backgroundColor: Theme.colors.dangerBackground,
      borderWidth: 1,
      borderColor: "rgba(220, 38, 38, 0.2)",
      paddingVertical: 14,
      borderRadius: Theme.borderRadius.md,
    },
    logoutText: {
      fontSize: 15,
      fontWeight: "600",
      color: Theme.colors.danger,
    },
    /* In-Viewport Modal Styling */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      justifyContent: "center",
      alignItems: "center",
      padding: Theme.spacing.xl,
    },
    modalCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.xl,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    modalIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: Theme.colors.dangerBackground,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Theme.spacing.md,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: 6,
      textAlign: "center",
    },
    modalMessage: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: Theme.spacing.xl,
    },
    modalActions: {
      flexDirection: "row",
      gap: Theme.spacing.md,
      width: "100%",
    },
    cancelModalBtn: {
      flex: 1,
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      paddingVertical: 12,
      borderRadius: Theme.borderRadius.md,
      alignItems: "center",
    },
    cancelModalBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    confirmModalBtn: {
      flex: 1,
      backgroundColor: Theme.colors.danger,
      paddingVertical: 12,
      borderRadius: Theme.borderRadius.md,
      alignItems: "center",
    },
    confirmModalBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#ffffff",
    },
  });

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { useAppTheme } from "../../../context/ThemeContext";
import { apiRequest } from "../../../services/api";
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react-native";

export default function SecuritySettingsScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const router = useRouter();
  const { session } = useAuth();

  const [isSaving, setIsSaving] = useState(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [alertInfo, setAlertInfo] = useState({
    title: "",
    message: "",
    visible: false,
    success: false,
  });

  const [formData, setFormData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const showAlert = (
    title: string,
    message: string,
    success: boolean = false,
  ) => {
    setAlertInfo({ title, message, visible: true, success });
  };

  const handleSave = async () => {
    if (
      !formData.old_password ||
      !formData.new_password ||
      !formData.confirm_password
    ) {
      showAlert("Error", "Please fill in all password fields.");
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      showAlert("Error", "New passwords do not match.");
      return;
    }

    if (formData.new_password.length < 8) {
      showAlert("Error", "New password must be at least 8 characters long.");
      return;
    }

    setIsSaving(true);
    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error("User ID not found");

      const res = await apiRequest(`/api/v1/users/change_password/${userId}`, {
        method: "PUT",
        token: session?.accessToken,
        body: {
          old_password: formData.old_password,
          new_password: formData.new_password,
        },
      });

      if (res.error) {
        throw new Error(
          typeof res.error === "string" ? res.error : JSON.stringify(res.error),
        );
      }

      setFormData({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });

      showAlert(
        "Success",
        "Your password has been successfully updated.",
        true,
      );
    } catch (err: any) {
      console.error(err);
      showAlert(
        "Update Failed",
        err.message ||
          "Could not update password. Please check your current password and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
          <Text style={styles.headerTitle}>Password & Security</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconHeaderContainer}>
            <View style={styles.iconCircle}>
              <ShieldCheck size={36} color={Theme.colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Change Password</Text>
            <Text style={styles.sectionSubtitle}>
              Ensure your account is using a long, random password to stay
              secure.
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <Lock
                  size={20}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.old_password}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, old_password: text }))
                  }
                  placeholder="Enter current password"
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showOldPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowOldPassword(!showOldPassword)}
                  style={styles.eyeIcon}
                >
                  {showOldPassword ? (
                    <EyeOff size={20} color={Theme.colors.textMuted} />
                  ) : (
                    <Eye size={20} color={Theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock
                  size={20}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.new_password}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, new_password: text }))
                  }
                  placeholder="Enter new password"
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIcon}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color={Theme.colors.textMuted} />
                  ) : (
                    <Eye size={20} color={Theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Must be at least 8 characters.
              </Text>
            </View>

            {/* Confirm New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Lock
                  size={20}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.confirm_password}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, confirm_password: text }))
                  }
                  placeholder="Confirm new password"
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={Theme.colors.textMuted} />
                  ) : (
                    <Eye size={20} color={Theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* In-App Native-looking Modal Alert */}
      <Modal
        visible={alertInfo.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertInfo({ ...alertInfo, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {alertInfo.success ? (
              <View
                style={[
                  styles.modalIconWrapper,
                  { backgroundColor: "rgba(16, 185, 129, 0.1)" },
                ]}
              >
                <ShieldCheck size={32} color="#10b981" />
              </View>
            ) : null}
            <Text style={styles.modalTitle}>{alertInfo.title}</Text>
            <Text style={styles.modalMessage}>{alertInfo.message}</Text>
            <TouchableOpacity
              style={[
                styles.confirmModalBtn,
                alertInfo.success && { backgroundColor: "#10b981" },
              ]}
              onPress={() => setAlertInfo({ ...alertInfo, visible: false })}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmModalBtnText}>OK</Text>
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
      paddingBottom: 40,
    },
    iconHeaderContainer: {
      alignItems: "center",
      marginBottom: 32,
      marginTop: 16,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(37, 99, 235, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 20,
    },
    formContainer: {
      backgroundColor: Theme.colors.surface,
      padding: 20,
      borderRadius: Theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 8,
      marginLeft: 4,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      borderRadius: Theme.borderRadius.lg,
      backgroundColor: Theme.colors.background,
      paddingHorizontal: 12,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 48,
      color: Theme.colors.text,
      fontSize: 15,
    },
    eyeIcon: {
      padding: 10,
    },
    helperText: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      marginTop: 6,
      marginLeft: 4,
    },
    saveButton: {
      backgroundColor: Theme.colors.primary,
      borderRadius: Theme.borderRadius.lg,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      ...Theme.shadows.sm,
    },
    saveButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: 24,
      width: "100%",
      maxWidth: 340,
      alignItems: "center",
      ...Theme.shadows.lg,
    },
    modalIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    modalMessage: {
      fontSize: 15,
      color: Theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    confirmModalBtn: {
      backgroundColor: Theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: Theme.borderRadius.md,
      width: "100%",
      alignItems: "center",
    },
    confirmModalBtnText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "600",
    },
  });

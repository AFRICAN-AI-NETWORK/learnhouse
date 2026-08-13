import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
  ImageBackground,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../../context/ThemeContext";
import {
  Lock,
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react-native";
import { apiRequest } from "../../services/api";

export default function ResetPasswordScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const params = useLocalSearchParams<{ email?: string }>();

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) {
      setErrorMessage(
        "Please enter both the reset code and your new password.",
      );
      return;
    }
    if (!params.email) {
      setErrorMessage(
        "Email is missing from the session. Please request a new code.",
      );
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    // Using org_id=1 as the default organization for now
    const orgId = 1;

    // Construct query parameters
    const query = new URLSearchParams();
    query.append("new_password", newPassword);
    query.append("org_id", orgId.toString());
    query.append("reset_code", resetCode.trim());

    const res = await apiRequest(
      `/api/v1/users/reset_password/change_password/${encodeURIComponent(params.email.trim())}?${query.toString()}`,
      {
        method: "POST",
      },
    );

    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(
        typeof res.error === "string"
          ? res.error
          : "Failed to reset password. The code might be expired or incorrect.",
      );
    } else {
      Alert.alert("Success", "Your password has been successfully updated.", [
        {
          text: "Go to Login",
          onPress: () => router.replace("/auth/login"),
        },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require("../../assets/aina_doodle_bg.png")}
        style={styles.backgroundImage}
        resizeMode="repeat"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={Theme.colors.text} />
            </TouchableOpacity>

            {/* Top Logo & Header */}
            <View style={styles.headerContainer}>
              <Image
                source={require("../../assets/aina_logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>Create New Password</Text>
              <Text style={styles.headerSubtitle}>
                Enter the 5-digit code we sent to your email.
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              {errorMessage ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={18} color={Theme.colors.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Reset Code Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>5-Digit Reset Code</Text>
                <View style={styles.inputWrapper}>
                  <Key
                    size={20}
                    color={Theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input as any}
                    placeholder="e.g. A1B2C"
                    placeholderTextColor={Theme.colors.textDim}
                    value={resetCode}
                    onChangeText={setResetCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={5}
                  />
                </View>
              </View>

              {/* New Password Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock
                    size={20}
                    color={Theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input as any}
                    placeholder="••••••••"
                    placeholderTextColor={Theme.colors.textDim}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={Theme.colors.textMuted} />
                    ) : (
                      <Eye size={20} color={Theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const makeStyles = (Theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Theme.colors.background,
    },
    backgroundImage: {
      flex: 1,
      width: "100%",
      height: "100%",
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: Theme.spacing.lg,
    },
    backButton: {
      position: "absolute",
      top: Theme.spacing.lg,
      left: Theme.spacing.lg,
      zIndex: 10,
      padding: 8,
      borderRadius: 20,
      backgroundColor: Theme.colors.surface,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
    },
    headerContainer: {
      alignItems: "center",
      marginBottom: Theme.spacing.xl,
      marginTop: Theme.spacing.xxl,
    },
    brandLogo: {
      width: 200,
      height: 64,
      marginBottom: Theme.spacing.md,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: Theme.colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      marginTop: 4,
      textAlign: "center",
    },
    formCard: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 3,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.sm,
      backgroundColor: Theme.colors.dangerBackground,
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.3)",
      borderRadius: Theme.borderRadius.md,
      padding: Theme.spacing.md,
      marginBottom: Theme.spacing.md,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: Theme.colors.danger,
      lineHeight: 18,
    },
    inputGroup: {
      marginBottom: Theme.spacing.md,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: Theme.colors.textMuted,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      borderRadius: Theme.borderRadius.md,
      paddingHorizontal: Theme.spacing.md,
      height: 48,
    },
    inputIcon: {
      marginRight: Theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: Theme.colors.text,
      height: "100%",
      ...(Platform.OS === "web"
        ? { outlineStyle: "none", outlineWidth: 0 }
        : {}),
    },
    button: {
      height: 52,
      backgroundColor: Theme.colors.primary,
      borderRadius: Theme.borderRadius.md,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: Theme.spacing.sm,
      marginTop: Theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#ffffff",
    },
  });

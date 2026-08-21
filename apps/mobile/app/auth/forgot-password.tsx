import { SafeAreaView } from "react-native-safe-area-context";
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
  Image,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../context/ThemeContext";
import { Mail, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react-native";
import { apiRequest } from "../../services/api";

export default function ForgotPasswordScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    // Using org_id=1 as the default organization for now
    const orgId = 1;

    const res = await apiRequest(
      `/api/v1/users/reset_password/send_reset_code/${encodeURIComponent(email.trim())}?org_id=${orgId}`,
      {
        method: "POST",
      },
    );

    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(
        typeof res.error === "string"
          ? res.error
          : "Failed to send reset code.",
      );
    } else {
      // Successfully sent the code. Navigate to reset screen, passing email.
      router.push({
        pathname: "/auth/reset-password",
        params: { email: email.trim() },
      });
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
              <Text style={styles.headerTitle}>Reset Password</Text>
              <Text style={styles.headerSubtitle}>
                Enter your email to receive a 5-digit reset code.
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

              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail
                    size={20}
                    color={Theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input as any}
                    placeholder="student@example.com"
                    placeholderTextColor={Theme.colors.textDim}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Send Code</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </>
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

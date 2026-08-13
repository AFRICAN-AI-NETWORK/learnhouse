import React, { useState, useEffect } from "react";
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
  ImageBackground,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../../context/ThemeContext";
import {
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { apiRequest } from "../../services/api";

const GradientDotsIcon = ({ size = 60 }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: "rgba(37, 99, 235, 0.08)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    }}
  >
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3b82f6" stopOpacity="1" />
          <Stop offset="1" stopColor="#1d4ed8" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Circle cx="5" cy="5" r="2.5" fill="url(#grad)" />
      <Circle cx="12" cy="5" r="2.5" fill="url(#grad)" />
      <Circle cx="19" cy="5" r="2.5" fill="url(#grad)" />
      <Circle cx="5" cy="12" r="2.5" fill="url(#grad)" />
      <Circle cx="12" cy="12" r="2.5" fill="url(#grad)" />
      <Circle cx="19" cy="12" r="2.5" fill="url(#grad)" />
      <Circle cx="5" cy="19" r="2.5" fill="url(#grad)" />
      <Circle cx="12" cy="19" r="2.5" fill="url(#grad)" />
      <Circle cx="19" cy="19" r="2.5" fill="url(#grad)" />
    </Svg>
  </View>
);

export default function VerifyEmailScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const params = useLocalSearchParams();
  const email = (params.email as string) || "student@example.com";
  const role = (params.role as string) || "student";

  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(30);

  const router = useRouter();

  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otpCode];
    newOtp[index] = text;
    setOtpCode(newOtp);
  };

  const handleVerify = async () => {
    const fullCode = otpCode.join("");
    if (fullCode.length < 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await apiRequest("/api/v1/auth/verify-otp", {
        method: "POST",
        body: { email, otp: fullCode },
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        if (role === "marketer" || role === "partner") {
          router.replace("/(tabs)/marketer");
        } else {
          router.replace("/(tabs)");
        }
      }
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    try {
      const res = await apiRequest("/api/v1/auth/resend-verification", {
        method: "POST",
        body: { email, org_slug: "default" },
      });
      if (res.error) {
        setErrorMessage(res.error);
        return;
      }
      setSuccessMessage("A new 6-digit code has been sent to your email.");
      setResendTimer(45);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch {
      setErrorMessage("Failed to resend code.");
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
          >
            {/* Header */}
            <View style={styles.headerContainer}>
              <Image
                source={require("../../assets/aina_logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <GradientDotsIcon />
              <Text style={styles.headerTitle}>Verify Your Email</Text>
              <Text style={styles.headerSubtitle}>
                We sent a 6-digit verification code to {"\n"}
                <Text style={styles.emailHighlight}>{email}</Text>
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

              {successMessage ? (
                <View style={styles.successBox}>
                  <ShieldCheck size={18} color={Theme.colors.success} />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>ENTER 6-DIGIT CODE</Text>

              {/* 6 Digit Inputs Row */}
              <View style={styles.otpRow}>
                {otpCode.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    style={[
                      styles.otpInput,
                      digit !== "" && styles.otpInputFilled,
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, idx)}
                  />
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Verify & Proceed</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>

              {/* Resend Code Link */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendHint}>Didn't receive the code?</Text>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendTimer > 0}
                  style={styles.resendBtn}
                >
                  <RefreshCw
                    size={14}
                    color={
                      resendTimer > 0
                        ? Theme.colors.textDim
                        : Theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.resendBtnText,
                      resendTimer > 0 && styles.resendBtnTextDisabled,
                    ]}
                  >
                    {resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : "Resend Code"}
                  </Text>
                </TouchableOpacity>
              </View>
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
    headerContainer: {
      alignItems: "center",
      marginBottom: Theme.spacing.lg,
    },
    brandLogo: {
      width: 180,
      height: 56,
      marginBottom: Theme.spacing.md,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: Theme.colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      marginTop: 6,
      textAlign: "center",
      lineHeight: 20,
    },
    emailHighlight: {
      fontWeight: "700",
      color: Theme.colors.text,
    },
    formCard: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
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
    },
    successBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.sm,
      backgroundColor: Theme.colors.successBackground,
      borderWidth: 1,
      borderColor: "rgba(5, 150, 105, 0.3)",
      borderRadius: Theme.borderRadius.md,
      padding: Theme.spacing.md,
      marginBottom: Theme.spacing.md,
    },
    successText: {
      flex: 1,
      fontSize: 13,
      color: Theme.colors.success,
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
      color: Theme.colors.textMuted,
      marginBottom: Theme.spacing.md,
      textAlign: "center",
      letterSpacing: 0.8,
    },
    otpRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Theme.spacing.xl,
    },
    otpInput: {
      width: 44,
      height: 52,
      borderWidth: 1.5,
      borderColor: Theme.colors.inputBorder,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: Theme.colors.inputBackground,
      fontSize: 20,
      fontWeight: "800",
      color: Theme.colors.text,
      textAlign: "center",
      ...(Platform.OS === "web"
        ? { outlineStyle: "none", outlineWidth: 0 }
        : {}),
    } as any,
    otpInputFilled: {
      borderColor: Theme.colors.primary,
      backgroundColor: "rgba(0, 87, 255, 0.04)",
    },
    button: {
      height: 52,
      backgroundColor: Theme.colors.primary,
      borderRadius: Theme.borderRadius.md,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: Theme.spacing.sm,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#ffffff",
    },
    resendContainer: {
      marginTop: Theme.spacing.lg,
      alignItems: "center",
    },
    resendHint: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      marginBottom: Theme.spacing.xs,
    },
    resendBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    resendBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: Theme.colors.primary,
    },
    resendBtnTextDisabled: {
      color: Theme.colors.textDim,
    },
  });

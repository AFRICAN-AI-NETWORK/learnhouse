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
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import {
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  UserPlus,
  TrendingUp,
  Handshake,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
} from "lucide-react-native";

export default function LoginScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const [orgSlug, setOrgSlug] = useState("default");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login, logout } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await login(orgSlug || "default", email.trim(), password);
      if (res.success && res.user) {
        const u = res.user;
        const isGlobalAdmin = u.is_admin || u.role === "admin";
        // Restrict mobile app access to only Students (USER) and Partners
        let hasValidMobileRole = false;

        if (u.orgs && Array.isArray(u.orgs)) {
          hasValidMobileRole = u.orgs.some((org: any) => {
            const roleName = org.role?.toLowerCase() || "";
            return roleName === "user" || roleName === "partner";
          });
        }

        // If they don't have a valid mobile role, or they are explicitly an admin
        if (!hasValidMobileRole || isGlobalAdmin) {
          setErrorMessage(
            "Please use the AINA Web Dashboard to access your account.",
          );
          await logout();
          return;
        }

        router.replace("/(tabs)");
      } else {
        setErrorMessage(
          res.error || "Invalid credentials. Please check and try again.",
        );
      }
    } catch {
      setErrorMessage("Unable to connect to AINA server. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            {/* Top Logo & Header */}
            <View style={styles.headerContainer}>
              <Image
                source={require("../../assets/aina_logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>Welcome Back 👋</Text>
              <Text style={styles.headerSubtitle}>
                Sign in to access your AINA courses & dashboard
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
                    style={styles.input}
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

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock
                    size={20}
                    color={Theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Theme.colors.textDim}
                    value={password}
                    onChangeText={setPassword}
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

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberBtn}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  {rememberMe ? (
                    <CheckSquare size={20} color={Theme.colors.primary} />
                  ) : (
                    <Square size={20} color={Theme.colors.textDim} />
                  )}
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push("/auth/forgot-password")}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Registration Options Footer - Stacked Buttons */}
            <View style={styles.registerContainer}>
              <TouchableOpacity
                style={styles.regOutlineBtn}
                onPress={() => router.push("/auth/register-student")}
                activeOpacity={0.7}
              >
                <UserPlus size={18} color={Theme.colors.primary} />
                <Text style={styles.regOutlineText}>Register Student</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.regOutlineBtn}
                onPress={() => router.push("/auth/register-partner")}
                activeOpacity={0.7}
              >
                <Handshake size={18} color={Theme.colors.warning} />
                <Text style={styles.regOutlineText}>Apply as Partner</Text>
              </TouchableOpacity>
            </View>

            {/* Legal Footer */}
            <View style={styles.legalFooter}>
              <Text style={styles.legalText}>
                By signing in, you agree to our
              </Text>
              <View style={styles.legalLinksRow}>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL("https://africanainetwork.com/terms")
                  }
                >
                  <Text style={styles.legalLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.legalText}> and </Text>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL("https://lms.africanainetwork.com/policy")
                  }
                >
                  <Text style={styles.legalLink}>Privacy Policy</Text>
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
      marginBottom: Theme.spacing.xl,
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
    } as any,
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
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Theme.spacing.md,
      marginTop: 4,
    },
    rememberBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    rememberText: {
      fontSize: 13,
      color: Theme.colors.textMuted,
    },
    forgotText: {
      fontSize: 13,
      color: Theme.colors.primary,
      fontWeight: "600",
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: Theme.spacing.xl,
      marginBottom: Theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Theme.colors.surfaceBorder,
    },
    dividerText: {
      paddingHorizontal: 16,
      fontSize: 12,
      fontWeight: "600",
      color: Theme.colors.textDim,
    },
    registerContainer: {
      alignItems: "stretch",
      gap: Theme.spacing.md,
    },
    regOutlineBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      borderRadius: Theme.borderRadius.md,
      height: 52,
    },
    regOutlineText: {
      fontSize: 15,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    legalFooter: {
      marginTop: Theme.spacing.xxl,
      alignItems: "center",
    },
    legalText: {
      fontSize: 12,
      color: Theme.colors.textMuted,
    },
    legalLinksRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    legalLink: {
      fontSize: 12,
      color: Theme.colors.primary,
    },
  });

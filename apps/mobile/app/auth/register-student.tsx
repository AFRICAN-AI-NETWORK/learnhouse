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
  ImageBackground,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Phone,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react-native";

export default function RegisterStudentScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !phone || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await apiRequest("/api/v1/users/1", {
        method: "POST",
        body: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone_number: phone.trim(),
          signup_type: "student",
          password,
        },
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        router.push({
          pathname: "/auth/verify-email",
          params: { email: email.trim(), role: "student" },
        });
      }
    } catch {
      router.push({
        pathname: "/auth/verify-email",
        params: { email: email.trim(), role: "student" },
      });
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
            <View style={styles.headerContainer}>
              <Image
                source={require("../../assets/aina_logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>Student Registration</Text>
              <Text style={styles.headerSubtitle}>
                Create your account to start learning on AINA
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

              {/* First Name & Last Name */}
              <View style={styles.nameRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={styles.inputWrapper}>
                    <User
                      size={18}
                      color={Theme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Jane"
                      placeholderTextColor={Theme.colors.textDim}
                      value={firstName}
                      onChangeText={setFirstName}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={styles.inputWrapper}>
                    <User
                      size={18}
                      color={Theme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Doe"
                      placeholderTextColor={Theme.colors.textDim}
                      value={lastName}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>
              </View>

              {/* Email Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail
                    size={18}
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
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Phone
                    size={18}
                    color={Theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="+1234567890"
                    placeholderTextColor={Theme.colors.textDim}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock
                    size={18}
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

              {/* Security Hint */}
              <View style={styles.hintRow}>
                <ShieldCheck size={16} color={Theme.colors.success} />
                <Text style={styles.hintText}>
                  A 6-digit OTP code will be sent to your email for
                  verification.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Register & Send Verification Code
                    </Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Security Notice */}
            <View style={styles.securityNotice}>
              <Lock size={14} color={Theme.colors.primary} />
              <Text style={styles.securityText}>
                Your information is secure with AINA.
              </Text>
            </View>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginRow}
              onPress={() => router.push("/auth/login")}
              activeOpacity={0.7}
            >
              <Text style={styles.loginText}>Already have an account? </Text>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
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
      padding: Theme.spacing.lg,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: Theme.spacing.md,
    },
    backBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    headerContainer: {
      alignItems: "center",
      marginBottom: Theme.spacing.lg,
    },
    brandLogo: {
      width: 180,
      height: 56,
      marginBottom: Theme.spacing.sm,
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
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 3,
      marginBottom: Theme.spacing.xl,
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
    nameRow: {
      flexDirection: "row",
      gap: Theme.spacing.md,
    },
    inputGroup: {
      marginBottom: Theme.spacing.md,
    },
    label: {
      fontSize: 11,
      fontWeight: "700",
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
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "#ECFDF5",
      padding: Theme.spacing.md,
      borderRadius: Theme.borderRadius.md,
      marginBottom: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: "#D1FAE5",
    },
    hintText: {
      flex: 1,
      fontSize: 13,
      color: "#059669",
      lineHeight: 18,
      fontWeight: "500",
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
      fontSize: 14,
      fontWeight: "700",
      color: "#ffffff",
    },
    securityNotice: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      marginBottom: Theme.spacing.xl,
    },
    securityText: {
      fontSize: 13,
      color: Theme.colors.textMuted,
    },
    loginRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: Theme.spacing.xxl,
    },
    loginText: {
      fontSize: 14,
      color: Theme.colors.textMuted,
    },
    loginLink: {
      fontSize: 14,
      fontWeight: "700",
      color: Theme.colors.primary,
    },
  });

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
  ImageBackground,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import {
  Mail,
  Phone,
  User,
  Building2,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Handshake,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react-native";

export default function RegisterPartnerScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);

  const [step, setStep] = useState(1);

  // Step 1 Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 Fields
  const [orgName, setOrgName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const handleNextStep = () => {
    if (!email || !password) {
      setErrorMessage("Please fill in email and password.");
      return;
    }
    setErrorMessage("");
    setStep(2);
  };

  const handleRegister = async () => {
    if (!orgName || !firstName || !lastName || !username || !phone) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      // Changed to the standard users endpoint to align with backend
      const res = await apiRequest("/api/v1/users/1", {
        method: "POST",
        body: {
          email: email.trim(),
          password,
          organization_name: orgName.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim(),
          phone_number: phone.trim(),
          signup_type: "partner",
        },
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        router.push({
          pathname: "/auth/verify-email",
          params: { email: email.trim(), role: "partner" },
        });
      }
    } catch {
      router.push({
        pathname: "/auth/verify-email",
        params: { email: email.trim(), role: "partner" },
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
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => (step === 1 ? router.back() : setStep(1))}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={Theme.colors.text} />
              <Text style={styles.backBtnText}>
                {step === 1 ? "Back to Sign In" : "Back to Account"}
              </Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.headerContainer}>
              <Image
                source={require("../../assets/aina_logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <View style={styles.badge}>
                <Handshake size={14} color={Theme.colors.warning} />
                <Text style={styles.badgeText}>
                  Institutional Partner Portal
                </Text>
              </View>
              <Text style={styles.headerTitle}>Partner Application</Text>
              <Text style={styles.headerSubtitle}>
                {step === 1
                  ? "Step 1: Account Credentials"
                  : "Step 2: Partner Details"}
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

              {step === 1 && (
                <>
                  {/* Email Address */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Official Email Address</Text>
                    <View style={styles.inputWrapper}>
                      <Mail
                        size={18}
                        color={Theme.colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="partner@company.com"
                        placeholderTextColor={Theme.colors.textDim}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
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
                        placeholder="8+ characters"
                        placeholderTextColor={Theme.colors.textDim}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                      >
                        {showPassword ? (
                          <EyeOff size={18} color={Theme.colors.textMuted} />
                        ) : (
                          <Eye size={18} color={Theme.colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Next Step Button */}
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleNextStep}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Continue</Text>
                    <ArrowRight size={18} color="#ffffff" />
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  {/* Organization Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Organization / Company Name
                    </Text>
                    <View style={styles.inputWrapper}>
                      <Building2
                        size={18}
                        color={Theme.colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Tech Innovations Ltd"
                        placeholderTextColor={Theme.colors.textDim}
                        value={orgName}
                        onChangeText={setOrgName}
                      />
                    </View>
                  </View>

                  {/* Name Row */}
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

                  {/* Username */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username</Text>
                    <View style={styles.inputWrapper}>
                      <User
                        size={18}
                        color={Theme.colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="janedoe123"
                        placeholderTextColor={Theme.colors.textDim}
                        value={username}
                        onChangeText={setUsername}
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
                        placeholder="+234 800 000 0000"
                        placeholderTextColor={Theme.colors.textDim}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
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
                    style={[
                      styles.button,
                      isSubmitting && styles.buttonDisabled,
                    ]}
                    onPress={handleRegister}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>
                          Join Partner Program
                        </Text>
                        <ArrowRight size={18} color="#ffffff" />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
      marginBottom: Theme.spacing.xs,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(217, 119, 6, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(217, 119, 6, 0.2)",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: Theme.borderRadius.full,
      marginBottom: Theme.spacing.xs,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: Theme.colors.warning,
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
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
    eyeBtn: {
      padding: 4,
    },
    hintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(5, 150, 105, 0.06)",
      padding: Theme.spacing.md,
      borderRadius: Theme.borderRadius.md,
      marginBottom: Theme.spacing.lg,
    },
    hintText: {
      flex: 1,
      fontSize: 12,
      color: Theme.colors.success,
      lineHeight: 16,
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
  });

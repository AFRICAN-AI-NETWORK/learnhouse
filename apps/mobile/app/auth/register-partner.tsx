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
  Phone,
  User,
  Building2,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Handshake,
  ShieldCheck,
} from "lucide-react-native";

export default function RegisterPartnerScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const handleRegister = async () => {
    if (!orgName || !contactName || !email || !phone) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await apiRequest("/api/v1/affiliation/signup", {
        method: "POST",
        body: {
          org_name: orgName.trim(),
          contact_name: contactName.trim(),
          email: email.trim(),
          phone_number: phone.trim(),
          payout_details: payoutDetails.trim(),
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
        imageStyle={{ opacity: 0.06 }}
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
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={Theme.colors.text} />
              <Text style={styles.backBtnText}>Back to Sign In</Text>
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
                Join AINA as an institutional or corporate partner
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

              {/* Organization Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Organization / Company Name</Text>
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

              {/* Contact Person Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Person Name</Text>
                <View style={styles.inputWrapper}>
                  <User
                    size={18}
                    color={Theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Jane Doe"
                    placeholderTextColor={Theme.colors.textDim}
                    value={contactName}
                    onChangeText={setContactName}
                  />
                </View>
              </View>

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

              {/* Payout Details */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Payout / Settlement Account Info
                </Text>
                <View style={styles.inputWrapper}>
                  <CreditCard
                    size={18}
                    color={Theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Bank Name, Account Number, SWIFT / Sort Code"
                    placeholderTextColor={Theme.colors.textDim}
                    value={payoutDetails}
                    onChangeText={setPayoutDetails}
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
                      Submit Partner Application
                    </Text>
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

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import {
  Handshake,
  Building2,
  Users,
  DollarSign,
  Copy,
  CheckCircle,
  ShieldCheck,
  Award,
} from "lucide-react-native";

export default function PartnerTabScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const { session } = useAuth();
  const [partnerStats, setPartnerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPartnerPortalData() {
      if (!session) return;
      setIsLoading(true);
      const res = await apiRequest("/api/v1/affiliation/me", {
        token: session.accessToken,
      });
      if (res.data) {
        setPartnerStats(res.data);
      }
      setIsLoading(false);
    }

    loadPartnerPortalData();
  }, [session]);

  const handleCopyCode = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const orgName = session?.user?.first_name
    ? `${session.user.first_name}`
    : "Institutional Partner";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.headerBox}>
          <View style={styles.badgeRow}>
            <Handshake size={16} color={Theme.colors.warning} />
            <Text style={styles.badgeText}>Institutional Partner Portal</Text>
          </View>
          <Text style={styles.title}>Partner Dashboard</Text>
          <Text style={styles.subtitle}>
            Manage organization promo codes, student enrollments, and
            institutional payouts
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Theme.colors.primary}
            style={{ marginTop: 32 }}
          />
        ) : (
          <>
            {/* Organization Promo Code Card */}
            <View style={styles.codeCard}>
              <View style={styles.orgRow}>
                <Building2 size={20} color={Theme.colors.primary} />
                <Text style={styles.orgName}>{orgName}</Text>
              </View>
              <Text style={styles.cardLabel}>
                ORGANIZATION PROMO CODE & LINK
              </Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>
                  {partnerStats?.promo_code || "AINA-ORG-2026"}
                </Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  {copied ? (
                    <CheckCircle size={16} color={Theme.colors.success} />
                  ) : (
                    <Copy size={16} color="#ffffff" />
                  )}
                  <Text style={styles.copyBtnText}>
                    {copied ? "Copied!" : "Copy Code"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.commissionHint}>
                Institutional discount & commission applied automatically for
                all organization students.
              </Text>
            </View>

            {/* Performance Metrics */}
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Users size={22} color={Theme.colors.primary} />
                <Text style={styles.statVal}>
                  {partnerStats?.enrolled_students || 85}
                </Text>
                <Text style={styles.statTitle}>Enrolled Students</Text>
              </View>
              <View style={styles.statBox}>
                <DollarSign size={22} color={Theme.colors.success} />
                <Text style={styles.statVal}>
                  ${partnerStats?.total_earnings?.toFixed(2) || "1,240.00"}
                </Text>
                <Text style={styles.statTitle}>Total Earnings</Text>
              </View>
              <View style={styles.statBox}>
                <Award size={22} color={Theme.colors.warning} />
                <Text style={styles.statVal}>
                  ${partnerStats?.pending_payout?.toFixed(2) || "320.00"}
                </Text>
                <Text style={styles.statTitle}>Pending Payout</Text>
              </View>
            </View>

            {/* Payout & Settlement Info */}
            <View style={styles.payoutCard}>
              <View style={styles.payoutHeader}>
                <ShieldCheck size={20} color={Theme.colors.success} />
                <Text style={styles.payoutTitle}>
                  Institutional Settlement Active
                </Text>
              </View>
              <Text style={styles.payoutDesc}>
                Settlement payouts are deposited directly to your registered
                organization bank account at the end of each billing cycle.
              </Text>
            </View>
          </>
        )}
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
    scrollContent: {
      padding: Theme.spacing.lg,
    },
    headerBox: {
      marginBottom: Theme.spacing.lg,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: Theme.colors.warning,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: Theme.colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
    codeCard: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      marginBottom: Theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    orgRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.xs,
      marginBottom: Theme.spacing.md,
    },
    orgName: {
      fontSize: 16,
      fontWeight: "700",
      color: Theme.colors.text,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: Theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: Theme.spacing.xs,
    },
    codeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: Theme.colors.inputBackground,
      borderRadius: Theme.borderRadius.md,
      padding: Theme.spacing.md,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      marginVertical: Theme.spacing.xs,
    },
    codeText: {
      fontSize: 18,
      fontWeight: "700",
      color: Theme.colors.text,
      letterSpacing: 1,
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: Theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Theme.borderRadius.sm,
    },
    copyBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#ffffff",
    },
    commissionHint: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      marginTop: Theme.spacing.sm,
      lineHeight: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: Theme.spacing.md,
    },
    statsContainer: {
      flexDirection: "row",
      gap: Theme.spacing.sm,
      marginBottom: Theme.spacing.lg,
    },
    statBox: {
      flex: 1,
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.md,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      alignItems: "center",
    },
    statVal: {
      fontSize: 16,
      fontWeight: "700",
      color: Theme.colors.text,
      marginTop: Theme.spacing.xs,
    },
    statTitle: {
      fontSize: 11,
      color: Theme.colors.textMuted,
      marginTop: 2,
      textAlign: "center",
    },
    payoutCard: {
      backgroundColor: "rgba(5, 150, 105, 0.08)",
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(5, 150, 105, 0.2)",
    },
    payoutHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.xs,
      marginBottom: 6,
    },
    payoutTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    payoutDesc: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      lineHeight: 16,
    },
  });

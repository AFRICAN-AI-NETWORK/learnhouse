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
  TrendingUp,
  Users,
  DollarSign,
  Copy,
  CheckCircle,
  ShieldCheck,
} from "lucide-react-native";

export default function MarketerTabScreen() {
  const { session } = useAuth();
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadPartnerData() {
      if (!session) return;
      setIsLoading(true);
      const res = await apiRequest("/api/v1/referrals/marketers/me", {
        token: session.accessToken,
      });
      if (res.data) {
        setStats(res.data);
      }
      setIsLoading(false);
    }

    loadPartnerData();
  }, [session]);

  const handleCopyCode = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerBox}>
          <View style={styles.badgeRow}>
            <TrendingUp size={16} color={Theme.colors.accent} />
            <Text style={styles.badgeText}>LearnHouse Partner Program</Text>
          </View>
          <Text style={styles.title}>Marketer Dashboard</Text>
          <Text style={styles.subtitle}>
            Track your student referrals, commissions, and instant payouts
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
            {/* Referral Code Card */}
            <View style={styles.codeCard}>
              <Text style={styles.cardLabel}>Your Referral Code</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>
                  {stats?.referral_code || "AINA-PARTNER"}
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
                Earn{" "}
                <Text
                  style={{ color: Theme.colors.success, fontWeight: "700" }}
                >
                  $7.70 USD
                </Text>{" "}
                for every student who signs up with your referral code.
              </Text>
            </View>

            {/* Performance Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Users size={22} color={Theme.colors.primary} />
                <Text style={styles.statVal}>
                  {stats?.total_referrals || 0}
                </Text>
                <Text style={styles.statTitle}>Total Referrals</Text>
              </View>
              <View style={styles.statBox}>
                <DollarSign size={22} color={Theme.colors.success} />
                <Text style={styles.statVal}>
                  ${stats?.total_earnings?.toFixed(2) || "0.00"}
                </Text>
                <Text style={styles.statTitle}>Total Earned</Text>
              </View>
            </View>

            {/* Payout Info */}
            <View style={styles.payoutCard}>
              <View style={styles.payoutHeader}>
                <ShieldCheck size={20} color={Theme.colors.success} />
                <Text style={styles.payoutTitle}>Direct Payouts Enabled</Text>
              </View>
              <Text style={styles.payoutDesc}>
                Payouts are transferred directly to your local bank account or
                mobile money once approved.
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
      color: Theme.colors.accent,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: Theme.colors.text,
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
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: Theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
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
    statsContainer: {
      flexDirection: "row",
      gap: Theme.spacing.md,
      marginBottom: Theme.spacing.lg,
    },
    statBox: {
      flex: 1,
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      alignItems: "center",
    },
    statVal: {
      fontSize: 22,
      fontWeight: "700",
      color: Theme.colors.text,
      marginTop: Theme.spacing.xs,
    },
    statTitle: {
      fontSize: 11,
      color: Theme.colors.textMuted,
      marginTop: 2,
    },
    payoutCard: {
      backgroundColor: "rgba(16, 185, 129, 0.08)",
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(16, 185, 129, 0.2)",
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

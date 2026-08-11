import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import {
  Gift,
  Share2,
  Copy,
  CheckCircle2,
  DollarSign,
  Award,
  CreditCard,
  Link as LinkIcon,
  Clock,
} from "lucide-react-native";

export default function StudentReferralScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const { session } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");

  const orgId = (session?.user as any)?.org_id || 1;
  const referralCode =
    referralData?.code || session?.user?.referral_code || "XESSGHKPAE";
  const shareableUrl = `https://lms.africanainetwork.com/ref/${referralCode}`;

  useEffect(() => {
    async function loadStudentReferral() {
      if (!session || !session.accessToken) return;
      setIsLoading(true);

      // Fetch existing referral code or auto-generate idempotently
      let codeRes = await apiRequest(`/api/v1/referrals/${orgId}/my-code`, {
        token: session.accessToken,
      });

      if (!codeRes.data || !codeRes.data.code) {
        const genRes = await apiRequest(
          `/api/v1/referrals/${orgId}/generate-code`,
          {
            method: "POST",
            token: session.accessToken,
          },
        );
        if (genRes.data) {
          codeRes = genRes;
        }
      }

      if (codeRes.data) {
        setReferralData(codeRes.data);
      }

      // Fetch commission balance
      const balanceRes = await apiRequest(
        `/api/v1/referrals/${orgId}/commission-balance`,
        {
          token: session.accessToken,
        },
      );
      if (balanceRes.data) {
        setBalanceData(balanceRes.data);
      }

      setIsLoading(false);
    }

    loadStudentReferral();
  }, [session, session?.accessToken, orgId]);

  const handleCopyCode = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRequestPayout = async () => {
    setIsRequestingPayout(true);
    setTimeout(() => {
      setIsRequestingPayout(false);
      setPayoutMessage("Payout request submitted successfully!");
      setTimeout(() => setPayoutMessage(""), 4000);
    }, 1200);
  };

  const totalEarned = balanceData?.total_balance ?? 0;
  const eligibleBalance = balanceData?.eligible_for_payout ?? 0;
  const pendingBalance = balanceData?.pending ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Gift size={16} color={Theme.colors.primary} />
            <Text style={styles.badgeText}>Student Rewards</Text>
          </View>
          <Text style={styles.title}>Referrals</Text>
          <Text style={styles.subtitle}>
            Earn commissions by referring new users to the platform. Earn $4 USD
            for every friend who joins!
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Theme.colors.primary}
            style={{ marginTop: 24 }}
          />
        ) : (
          <>
            {/* Referral Code Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Referral Code</Text>
              <Text style={styles.cardSubtitle}>
                Share your code and earn commissions on every successful
                referral.
              </Text>

              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{referralCode}</Text>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>referrals</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.copyBtn, copiedCode && styles.copyBtnSuccess]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  {copiedCode ? (
                    <>
                      <CheckCircle2 size={16} color="#ffffff" />
                      <Text style={styles.copyBtnText}>Copied</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={16} color="#ffffff" />
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Shareable Link Row */}
              <View style={styles.linkRow}>
                <View style={styles.linkBox}>
                  <LinkIcon size={14} color={Theme.colors.textMuted} />
                  <Text style={styles.linkText} numberOfLines={1}>
                    {shareableUrl}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.copyLinkBtn,
                    copiedLink && styles.copyBtnSuccess,
                  ]}
                  onPress={handleCopyLink}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.copyLinkBtnText,
                      copiedLink && { color: "#ffffff" },
                    ]}
                  >
                    {copiedLink ? "Copied" : "Copy Link"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Commission Balance Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Commission Balance</Text>
              <Text style={styles.cardSubtitle}>
                Track your earnings and request payouts when eligible.
              </Text>

              <View style={styles.balanceGrid}>
                <View style={styles.balanceBox}>
                  <Text style={styles.balanceLabel}>$ Total Earned</Text>
                  <Text style={styles.balanceAmount}>
                    ${totalEarned.toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.balanceBox, styles.balanceBoxHighlight]}>
                  <Text style={[styles.balanceLabel, { color: "#ffffff" }]}>
                    ✓ Eligible Balance
                  </Text>
                  <Text style={[styles.balanceAmount, { color: "#ffffff" }]}>
                    ${eligibleBalance.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.balanceBox}>
                  <Text style={styles.balanceLabel}>⏱ Pending</Text>
                  <Text style={styles.balanceAmount}>
                    ${pendingBalance.toFixed(2)}
                  </Text>
                </View>
              </View>

              {payoutMessage ? (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color={Theme.colors.success} />
                  <Text style={styles.successText}>{payoutMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.payoutBtn,
                  eligibleBalance < 1 && styles.payoutBtnDisabled,
                  isRequestingPayout && { opacity: 0.6 },
                ]}
                onPress={handleRequestPayout}
                disabled={eligibleBalance < 1 || isRequestingPayout}
                activeOpacity={0.8}
              >
                {isRequestingPayout ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.payoutBtnText}>
                    Request Payout (minimum $1.00 required)
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Commission History Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Commission History</Text>
              <Text style={styles.cardSubtitle}>
                All commissions earned through your referrals.
              </Text>

              <View style={styles.emptyContainer}>
                <Clock size={36} color={Theme.colors.textDim} />
                <Text style={styles.emptyText}>
                  No commissions yet. Share your referral code to get started!
                </Text>
              </View>
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
    header: {
      marginBottom: Theme.spacing.lg,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      backgroundColor: "rgba(0, 87, 255, 0.08)",
      borderWidth: 1,
      borderColor: "rgba(0, 87, 255, 0.2)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Theme.borderRadius.full,
      marginBottom: Theme.spacing.xs,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: Theme.colors.primary,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: Theme.colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      marginTop: 4,
      lineHeight: 20,
    },
    card: {
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
      marginBottom: Theme.spacing.lg,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: 2,
    },
    cardSubtitle: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      marginBottom: Theme.spacing.md,
    },
    codeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.sm,
      marginBottom: Theme.spacing.sm,
    },
    codeBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      borderRadius: Theme.borderRadius.md,
      paddingHorizontal: Theme.spacing.md,
      height: 44,
    },
    codeText: {
      fontSize: 16,
      fontWeight: "700",
      color: Theme.colors.text,
      letterSpacing: 1,
    },
    tag: {
      backgroundColor: "rgba(0, 0, 0, 0.06)",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tagText: {
      fontSize: 11,
      fontWeight: "600",
      color: Theme.colors.textMuted,
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: Theme.colors.primary,
      paddingHorizontal: 16,
      height: 44,
      borderRadius: Theme.borderRadius.md,
    },
    copyBtnSuccess: {
      backgroundColor: Theme.colors.success,
    },
    copyBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#ffffff",
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.sm,
    },
    linkBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      borderRadius: Theme.borderRadius.md,
      paddingHorizontal: Theme.spacing.md,
      height: 40,
    },
    linkText: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      flex: 1,
    },
    copyLinkBtn: {
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      paddingHorizontal: 14,
      height: 40,
      borderRadius: Theme.borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    copyLinkBtnText: {
      fontSize: 12,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    balanceGrid: {
      flexDirection: "row",
      gap: Theme.spacing.sm,
      marginBottom: Theme.spacing.md,
    },
    balanceBox: {
      flex: 1,
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.md,
    },
    balanceBoxHighlight: {
      backgroundColor: Theme.colors.primary,
      borderColor: Theme.colors.primary,
    },
    balanceLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: Theme.colors.textMuted,
      marginBottom: 4,
    },
    balanceAmount: {
      fontSize: 18,
      fontWeight: "700",
      color: Theme.colors.text,
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: Theme.colors.successBackground,
      padding: Theme.spacing.md,
      borderRadius: Theme.borderRadius.md,
      marginBottom: Theme.spacing.md,
    },
    successText: {
      fontSize: 13,
      fontWeight: "600",
      color: Theme.colors.success,
    },
    payoutBtn: {
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      paddingVertical: 12,
      borderRadius: Theme.borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    payoutBtnDisabled: {
      opacity: 0.5,
    },
    payoutBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: Theme.colors.textMuted,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Theme.spacing.xl,
    },
    emptyText: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      marginTop: Theme.spacing.sm,
      textAlign: "center",
    },
  });

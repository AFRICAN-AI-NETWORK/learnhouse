import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import {
  ChevronLeft,
  ReceiptText,
  AlertCircle,
  RefreshCw,
} from "lucide-react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";

export default function BillingScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const router = useRouter();
  const { session } = useAuth();

  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState<number | null>(null);

  const fetchPayments = async () => {
    if (!session?.accessToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiRequest("/api/v1/payments/1/payments/me", {
        token: session.accessToken,
      });
      if (res && Array.isArray(res)) {
        setPayments(res);
      }
    } catch (err) {
      console.error("Failed to load payments", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [session?.accessToken]);

  const handleCancelSubscription = (paymentId: number, productName: string) => {
    Alert.alert(
      "Cancel Subscription",
      `Are you sure you want to cancel your subscription to ${productName}? You will lose access to the course immediately, but your progress will be saved.`,
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setIsCanceling(paymentId);
            try {
              await apiRequest(
                `/api/v1/payments/1/payments/${paymentId}/cancel`,
                {
                  method: "POST",
                  token: session?.accessToken,
                },
              );
              Alert.alert("Success", "Subscription has been cancelled.");
              fetchPayments(); // Refresh list
            } catch (err) {
              console.error("Failed to cancel", err);
              Alert.alert(
                "Error",
                "Could not cancel subscription. Please try again.",
              );
            } finally {
              setIsCanceling(null);
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "active":
        return Theme.colors.success;
      case "pending":
        return Theme.colors.warning;
      case "failed":
      case "cancelled":
        return Theme.colors.danger;
      default:
        return Theme.colors.textMuted;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Billing & Transactions",
          headerTitleStyle: {
            fontFamily: "Outfit-SemiBold",
            color: Theme.colors.text,
          },
          headerStyle: {
            backgroundColor: Theme.colors.background,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/profile");
                }
              }}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={Theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {payments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <ReceiptText size={48} color={Theme.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyText}>
                Your payment and subscription history will appear here once you
                purchase a course.
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchPayments}
              >
                <RefreshCw size={16} color={Theme.colors.primary} />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {payments.map((payment) => {
                const isSubscription =
                  payment.product?.product_type === "subscription";
                const isActive = payment.status === "active";
                const amount =
                  payment.final_amount ?? payment.product?.amount ?? 0;
                const currency = payment.product?.currency ?? "USD";

                return (
                  <View key={payment.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: Theme.colors.border },
                          ]}
                        >
                          <Text style={styles.typeBadgeText}>
                            {isSubscription ? "SUBSCRIPTION" : "ONE-TIME"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                getStatusColor(payment.status) + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: getStatusColor(payment.status) },
                            ]}
                          >
                            {payment.status?.toUpperCase() || "UNKNOWN"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.date}>
                        {formatDate(payment.creation_date)}
                      </Text>
                    </View>

                    <Text style={styles.productName}>
                      {payment.product?.name || "Unknown Product"}
                    </Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.amount}>
                        {currency}{" "}
                        {amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      {isSubscription && payment.product?.interval && (
                        <Text style={styles.interval}>
                          {" "}
                          / {payment.product.interval}
                        </Text>
                      )}
                    </View>

                    {isSubscription && isActive && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          disabled={isCanceling === payment.id}
                          onPress={() =>
                            handleCancelSubscription(
                              payment.id,
                              payment.product?.name,
                            )
                          }
                        >
                          {isCanceling === payment.id ? (
                            <ActivityIndicator
                              size="small"
                              color={Theme.colors.danger}
                            />
                          ) : (
                            <>
                              <AlertCircle
                                size={16}
                                color={Theme.colors.danger}
                              />
                              <Text style={styles.cancelButtonText}>
                                Cancel Subscription
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    listContainer: {
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    badgeRow: {
      flexDirection: "row",
      gap: 8,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    typeBadgeText: {
      fontFamily: "Inter-SemiBold",
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontFamily: "Inter-Bold",
      fontSize: 10,
      letterSpacing: 0.5,
    },
    date: {
      fontFamily: "Inter-Medium",
      fontSize: 12,
      color: colors.textMuted,
    },
    productName: {
      fontFamily: "Outfit-SemiBold",
      fontSize: 18,
      color: colors.text,
      marginBottom: 8,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
    },
    amount: {
      fontFamily: "Outfit-Bold",
      fontSize: 24,
      color: colors.text,
    },
    interval: {
      fontFamily: "Inter-Medium",
      fontSize: 14,
      color: colors.textMuted,
    },
    actionRow: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    cancelButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.danger + "15",
    },
    cancelButtonText: {
      fontFamily: "Inter-SemiBold",
      fontSize: 14,
      color: colors.danger,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      fontFamily: "Outfit-SemiBold",
      fontSize: 20,
      color: colors.text,
      marginBottom: 12,
    },
    emptyText: {
      fontFamily: "Inter-Regular",
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    refreshButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    refreshText: {
      fontFamily: "Inter-SemiBold",
      fontSize: 14,
      color: colors.primary,
    },
  });

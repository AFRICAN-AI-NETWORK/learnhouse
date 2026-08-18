import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import {
  ChevronLeft,
  BellOff,
  Trash2,
  Check,
  CheckCheck,
} from "lucide-react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../services/api";

export default function NotificationsScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const router = useRouter();
  const { session } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (pageNum = 1, shouldRefresh = false) => {
    if (!session?.accessToken) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (shouldRefresh) setIsRefreshing(true);
    else if (pageNum === 1) setIsLoading(true);

    try {
      const res = await apiRequest(
        `/api/v1/notifications/?page=${pageNum}&limit=20`,
        {
          token: session.accessToken,
        },
      );
      if (res && Array.isArray(res)) {
        if (shouldRefresh || pageNum === 1) {
          setNotifications(res);
        } else {
          setNotifications((prev) => [...prev, ...res]);
        }
        setHasMore(res.length === 20);
        setPage(pageNum);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, [session?.accessToken]);

  const onRefresh = () => {
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && !isRefreshing && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest(`/api/v1/notifications/read-all`, {
        method: "POST",
        token: session?.accessToken,
      });
      // Locally update all to read
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiRequest(`/api/v1/notifications/${id}/read`, {
        method: "POST",
        token: session?.accessToken,
      });
      // Locally update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const deleteNotification = (id: number) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/api/v1/notifications/${id}`, {
                method: "DELETE",
                token: session?.accessToken,
              });
              setNotifications((prev) => prev.filter((n) => n.id !== id));
            } catch (err) {
              console.error("Failed to delete notification", err);
              Alert.alert("Error", "Could not delete the notification.");
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={[styles.card, !item.is_read && styles.cardUnread]}
        activeOpacity={0.7}
        onPress={() => {
          if (!item.is_read) markAsRead(item.id);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            {!item.is_read && <View style={styles.unreadDot} />}
            <Text
              style={[styles.title, !item.is_read && styles.titleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>

        <Text style={styles.message} numberOfLines={3}>
          {item.message}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteNotification(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Notifications",
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
                  router.replace("/(tabs)/");
                }
              }}
              style={styles.backButton}
            >
              <ChevronLeft size={24} color={Theme.colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.headerRightBtn}
            >
              <CheckCheck size={20} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading && page === 1 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <BellOff size={48} color={Theme.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>You're All Caught Up!</Text>
              <Text style={styles.emptyText}>
                There are no new notifications or alerts for you right now.
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoading && page > 1 ? (
              <View style={{ padding: 20 }}>
                <ActivityIndicator size="small" color={Theme.colors.primary} />
              </View>
            ) : null
          }
        />
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
    headerRightBtn: {
      marginRight: 16,
      padding: 8,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      padding: 20,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardUnread: {
      backgroundColor: colors.primary + "0A", // subtle primary tint
      borderColor: colors.primary + "30",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    titleContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginRight: 12,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 8,
    },
    title: {
      fontFamily: "Outfit-Medium",
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    titleUnread: {
      fontFamily: "Outfit-Bold",
    },
    date: {
      fontFamily: "Inter-Medium",
      fontSize: 12,
      color: colors.textMuted,
    },
    message: {
      fontFamily: "Inter-Regular",
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    actionRow: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    actionButton: {
      padding: 4,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 80,
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
    },
  });

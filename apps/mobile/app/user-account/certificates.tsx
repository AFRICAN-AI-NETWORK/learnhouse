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
import { useRouter } from "expo-router";
import { ChevronLeft, ExternalLink, Award } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import * as WebBrowser from "expo-web-browser";

export default function CertificatesScreen() {
  const router = useRouter();
  const { Theme } = useAppTheme();
  const { session } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      if (!session?.accessToken) return;
      try {
        setLoading(true);
        const res = await apiRequest("/api/v1/certifications/user/all", {
          token: session.accessToken,
        });
        if (res.data) {
          setCertificates(res.data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load certificates");
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [session?.accessToken]);

  const handleOpenVerifyUrl = async (uuid: string) => {
    const verifyUrl = `https://lms.africanainetwork.com/certificates/${uuid}/verify`;
    try {
      await WebBrowser.openBrowserAsync(verifyUrl);
    } catch (e) {
      console.error("Failed to open browser:", e);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: Theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: Theme.colors.background,
            borderBottomColor: Theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Theme.colors.text }]}>
          My Certificates
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: Theme.colors.danger }]}>
              {error}
            </Text>
          </View>
        ) : certificates.length === 0 ? (
          <View style={styles.centerContainer}>
            <Award
              size={48}
              color={Theme.colors.textMuted}
              style={{ marginBottom: 16 }}
            />
            <Text style={[styles.emptyText, { color: Theme.colors.text }]}>
              No certificates found
            </Text>
            <Text
              style={[styles.emptySubText, { color: Theme.colors.textMuted }]}
            >
              Complete courses to earn certificates!
            </Text>
          </View>
        ) : (
          certificates.map((cert) => (
            <TouchableOpacity
              key={cert.user_certification_uuid || cert.id}
              style={[
                styles.certCard,
                {
                  backgroundColor: Theme.colors.surface,
                  borderColor: Theme.colors.border,
                },
              ]}
              onPress={() => handleOpenVerifyUrl(cert.user_certification_uuid)}
              activeOpacity={0.7}
            >
              <View style={styles.certIconContainer}>
                <Award size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.certInfo}>
                <Text
                  style={[styles.certTitle, { color: Theme.colors.text }]}
                  numberOfLines={2}
                >
                  {cert.certification?.title ||
                    cert.course?.title ||
                    "Course Certificate"}
                </Text>
                <Text
                  style={[styles.certDate, { color: Theme.colors.textMuted }]}
                >
                  {cert.created_at
                    ? new Date(cert.created_at).toLocaleDateString()
                    : "Earned recently"}
                </Text>
              </View>
              <ExternalLink size={20} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50, // Approximation for safe area
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: "center",
  },
  certCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  certIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  certInfo: {
    flex: 1,
    marginRight: 12,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  certDate: {
    fontSize: 14,
  },
});

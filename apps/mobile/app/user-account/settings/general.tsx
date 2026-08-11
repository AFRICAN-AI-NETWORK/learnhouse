import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../../../context/AuthContext";
import { useAppTheme } from "../../../context/ThemeContext";
import { apiRequest } from "../../../services/api";
import { getUserAvatarMediaDirectory } from "../../../services/media";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  Save,
  Camera,
} from "lucide-react-native";

export default function GeneralSettingsScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const router = useRouter();
  const { session, updateSession } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({
    title: "",
    message: "",
    visible: false,
  });

  const showAlert = (title: string, message: string) => {
    setAlertInfo({ title, message, visible: true });
  };

  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    bio: "",
    avatarUrl: "",
  });

  // load user data
  useEffect(() => {
    async function loadProfile() {
      if (!session?.accessToken) return;
      try {
        const res = await apiRequest("/api/v1/users/profile", {
          token: session.accessToken,
        });
        if (!res.error && res.data) {
          const rawAvatar = res.data.avatar_image || res.data.avatar_url || "";
          const resolvedAvatar = rawAvatar
            ? getUserAvatarMediaDirectory(res.data.user_uuid, rawAvatar)
            : "";

          setFormData({
            username: res.data.username || "",
            first_name: res.data.first_name || "",
            last_name: res.data.last_name || "",
            email: res.data.email || "",
            phone_number: res.data.phone_number || "",
            bio: res.data.bio || "",
            avatarUrl: resolvedAvatar || "",
          });
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [session?.accessToken]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!session?.user?.id) {
        throw new Error("No active session found");
      }

      const userId = session.user.id;

      const updateData = {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        bio: formData.bio,
      };

      await apiRequest(`/api/v1/users/${userId}`, {
        method: "PUT",
        token: session?.accessToken,
        body: updateData,
      });

      // Update local session so all tabs instantly reflect the changes
      await updateSession({
        user: {
          ...(session?.user || {}),
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          username: updateData.username,
        } as any,
      });

      showAlert("Success", "Your personal information has been updated.");
    } catch (err) {
      console.error(err);
      showAlert("Error", "Failed to update personal information.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const originalImage = result.assets[0];

        // Aggressively compress and resize the image to guarantee it's under 2MB
        const manipResult = await ImageManipulator.manipulateAsync(
          originalImage.uri,
          [{ resize: { width: 500 } }], // Resize to 500px width (height will auto-scale)
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }, // Compress as JPEG
        );

        const localUri = manipResult.uri;
        setFormData((prev) => ({ ...prev, avatarUrl: localUri }));

        // Upload immediately
        setIsUploading(true);
        const userId = session?.user?.id;

        const filename = "avatar.jpg";
        const type = "image/jpeg";

        const formDataFile = new FormData();

        if (Platform.OS === "web") {
          // On Web, we need to convert the URI to a Blob
          const res = await fetch(localUri);
          const blob = await res.blob();
          const fileBlob = new Blob([blob], { type });
          formDataFile.append("avatar_file", fileBlob, filename);
        } else {
          // On Native, React Native's FormData expects this object format
          // @ts-ignore
          formDataFile.append("avatar_file", {
            uri: localUri,
            name: filename,
            type,
          });
        }

        const uploadRes = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL || "https://lms-backend.africanainetwork.com"}/api/v1/users/update_avatar/${userId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
              // Do not set Content-Type manually, let the browser/fetch handle the boundary
            },
            body: formDataFile,
          },
        );

        if (!uploadRes.ok) {
          let errorMsg = "Failed to upload image";
          try {
            const errData = await uploadRes.json();
            if (errData.detail) {
              errorMsg =
                typeof errData.detail === "string"
                  ? errData.detail
                  : JSON.stringify(errData.detail);
            }
          } catch (e) {}
          throw new Error(errorMsg);
        }

        // Update local session with new avatar
        try {
          const userData = await uploadRes.json();
          if (userData && (userData.avatar_image || userData.avatar_url)) {
            await updateSession({
              user: {
                ...(session?.user || {}),
                avatar_url: userData.avatar_image || userData.avatar_url,
              } as any,
            });
          }
        } catch (e) {}

        // Show success alert
        showAlert("Success", "Profile photo uploaded successfully!");
      }
    } catch (error: any) {
      console.error("Image upload failed:", error);
      showAlert("Error", error.message || "Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/profile");
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formGroup}>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <Text style={styles.sectionSubtitle}>
                Update your personal information below.
              </Text>
            </View>

            {/* Profile Photo Upload Placeholder */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                {formData.avatarUrl ? (
                  <Image
                    source={{ uri: formData.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarFallbackText}>
                    {formData.first_name ? formData.first_name.charAt(0) : "U"}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.avatarUploadButton,
                  isUploading && { opacity: 0.7 },
                ]}
                onPress={handlePickImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                ) : (
                  <Camera
                    size={16}
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text style={styles.avatarUploadText}>
                  {isUploading ? "Uploading..." : "Change Photo"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <User
                  size={18}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, username: text }))
                  }
                  placeholder="Username"
                  placeholderTextColor={Theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputContainer}>
                <User
                  size={18}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.first_name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, first_name: text }))
                  }
                  placeholder="First Name"
                  placeholderTextColor={Theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputContainer}>
                <User
                  size={18}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.last_name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, last_name: text }))
                  }
                  placeholder="Last Name"
                  placeholderTextColor={Theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <Mail
                  size={18}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: Theme.colors.textMuted }]}
                  value={formData.email}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor={Theme.colors.textMuted}
                />
              </View>
              <Text style={styles.helpText}>
                Email address cannot be changed.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number (Optional)</Text>
              <View style={styles.inputContainer}>
                <Phone
                  size={18}
                  color={Theme.colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.phone_number}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, phone_number: text }))
                  }
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio (Optional)</Text>
              <View
                style={[
                  styles.inputContainer,
                  { height: 100, alignItems: "flex-start" },
                ]}
              >
                <FileText
                  size={18}
                  color={Theme.colors.textMuted}
                  style={[styles.inputIcon, { marginTop: 12 }]}
                />
                <TextInput
                  style={[
                    styles.input,
                    { height: 100, textAlignVertical: "top", paddingTop: 12 },
                  ]}
                  value={formData.bio}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, bio: text }))
                  }
                  placeholder="Tell us a little about yourself"
                  placeholderTextColor={Theme.colors.textMuted}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={18} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* In-App Native-looking Modal Alert */}
      <Modal
        visible={alertInfo.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertInfo({ ...alertInfo, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{alertInfo.title}</Text>
            <Text style={styles.modalMessage}>{alertInfo.message}</Text>
            <TouchableOpacity
              style={styles.confirmModalBtn}
              onPress={() => setAlertInfo({ ...alertInfo, visible: false })}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (Theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Theme.spacing.lg,
      paddingVertical: Theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Theme.colors.surfaceBorder,
      backgroundColor: Theme.colors.surface,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: Theme.colors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollContent: {
      padding: Theme.spacing.lg,
      paddingBottom: 40,
    },
    formGroup: {
      marginBottom: Theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      lineHeight: 20,
    },
    avatarSection: {
      alignItems: "center",
      marginVertical: Theme.spacing.lg,
    },
    avatarCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: Theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      overflow: "hidden",
      borderWidth: 3,
      borderColor: Theme.colors.surface,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarFallbackText: {
      fontSize: 32,
      color: "#fff",
      fontWeight: "700",
    },
    avatarUploadButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    avatarUploadText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: Theme.colors.inputBorder,
      borderRadius: Theme.borderRadius.md,
      height: 48,
    },
    inputDisabled: {
      backgroundColor: Theme.colors.surfaceBorder,
      opacity: 0.7,
    },
    inputIcon: {
      paddingLeft: 12,
      marginRight: 8,
    },
    input: {
      flex: 1,
      height: "100%",
      color: Theme.colors.text,
      fontSize: 14,
      paddingRight: 12,
    },
    helpText: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      marginTop: 6,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Theme.colors.primary,
      height: 52,
      borderRadius: Theme.borderRadius.md,
      marginTop: Theme.spacing.lg,
      gap: 8,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#ffffff",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      justifyContent: "center",
      alignItems: "center",
      padding: Theme.spacing.xl,
    },
    modalCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.xl,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: Theme.colors.text,
      marginBottom: 6,
      textAlign: "center",
    },
    modalMessage: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: Theme.spacing.xl,
    },
    confirmModalBtn: {
      width: "100%",
      backgroundColor: Theme.colors.primary,
      paddingVertical: 12,
      borderRadius: Theme.borderRadius.md,
      alignItems: "center",
    },
    confirmModalBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#ffffff",
    },
  });

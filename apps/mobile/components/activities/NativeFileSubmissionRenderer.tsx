import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { apiRequest, getApiUrl } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import {
  FileUp,
  File,
  CheckCircle2,
  Check,
  X,
  Trash2,
} from "lucide-react-native";

export default function NativeFileSubmissionRenderer({
  assignmentUuid,
  assignmentTaskUuid,
  onSubmissionStatusChange,
}: {
  assignmentUuid: string;
  assignmentTaskUuid: string;
  onSubmissionStatusChange?: (isSubmitted: boolean) => void;
}) {
  const { session } = useAuth();
  const { Theme } = useAppTheme();

  const [taskData, setTaskData] = useState<any>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gradingResults, setGradingResults] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [serverFileUuid, setServerFileUuid] = useState<string>("");

  const fetchTask = useCallback(async () => {
    if (!session?.accessToken || !assignmentTaskUuid) return;
    try {
      setLoading(true);
      // Fetch the task definition
      const res = await apiRequest(
        `/api/v1/assignments/task/${assignmentTaskUuid}`,
        {
          token: session.accessToken,
        },
      );
      if (res.data) {
        setTaskData(res.data);
      }

      // Fetch user's existing submissions (if any)
      const subRes = await apiRequest(
        `/api/v1/assignments/${assignmentUuid}/tasks/${assignmentTaskUuid}/submissions/me`,
        { token: session.accessToken },
      );

      if (subRes.data?.task_submission) {
        if (subRes.data.task_submission.fileUUID) {
          setServerFileUuid(subRes.data.task_submission.fileUUID);
        }

        const status = subRes.data.status;
        if (
          status === "SUBMITTED" ||
          status === "GRADED" ||
          subRes.data.grading_results
        ) {
          setHasSubmitted(true);
          setGradingResults(subRes.data.grading_results);
          if (onSubmissionStatusChange) onSubmissionStatusChange(true);
        } else {
          if (onSubmissionStatusChange) onSubmissionStatusChange(false);
        }
      } else {
        if (onSubmissionStatusChange) onSubmissionStatusChange(false);
      }
    } catch (error) {
      console.error("Failed to load file task:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentTaskUuid, session?.accessToken]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const pickDocument = async () => {
    if (hasSubmitted) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Error picking document:", err);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const uploadFile = async (): Promise<boolean> => {
    if (!selectedFile || !session?.accessToken) return false;

    try {
      const formData = new FormData();
      formData.append("sub_file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/octet-stream",
      } as any);

      const baseUrl = getApiUrl();
      const url = `${baseUrl.replace(/\/$/, "")}/api/v1/assignments/${assignmentUuid}/tasks/${assignmentTaskUuid}/sub_file`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          // Content-Type is set automatically by fetch when using FormData
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("Failed to upload file:", error);
      return false;
    }
  };

  const handleSaveOrSubmit = async (isFinalSubmit: boolean = false) => {
    if (!session?.accessToken || !assignmentTaskUuid) return;

    setSubmitting(true);

    // If there is a local file picked, upload it first
    if (selectedFile) {
      const uploadSuccess = await uploadFile();
      if (!uploadSuccess) {
        Alert.alert("Error", "Failed to upload the file. Please try again.");
        setSubmitting(false);
        return;
      }
      // Assuming upload sets the file internally on the backend.
      // But we still need to call the PUT /submissions to commit "SAVE" or "SUBMIT"
      // Wait, if upload sets the file, does it return the fileUUID?
      // Yes, but the web app just calls handleAssignmentTaskSubmission with userSubmissions object.
      // The backend puts the file in the database and updates task_submission.
    } else if (!serverFileUuid && isFinalSubmit) {
      Alert.alert("Error", "Please select a file to upload before submitting.");
      setSubmitting(false);
      return;
    }

    try {
      // Re-fetch the submission to get the updated fileUUID if we just uploaded
      let currentFileUuid = serverFileUuid;
      if (selectedFile) {
        const checkRes = await apiRequest(
          `/api/v1/assignments/${assignmentUuid}/tasks/${assignmentTaskUuid}/submissions/me`,
          { token: session.accessToken },
        );
        if (checkRes.data?.task_submission?.fileUUID) {
          currentFileUuid = checkRes.data.task_submission.fileUUID;
          setServerFileUuid(currentFileUuid);
          setSelectedFile(null); // Clear local selection
        }
      }

      const payload = {
        assignment_task_uuid: assignmentTaskUuid,
        action: isFinalSubmit ? "SUBMIT" : "SAVE",
        task_submission: {
          fileUUID: currentFileUuid,
        },
      };

      const res = await apiRequest(
        `/api/v1/assignments/${assignmentUuid}/tasks/${assignmentTaskUuid}/submissions`,
        {
          method: "PUT",
          token: session.accessToken,
          body: payload,
        },
      );

      if (res.data) {
        if (isFinalSubmit) {
          setHasSubmitted(true);
          setGradingResults(
            res.data.task_submission?.grading_results ||
              res.data.grading_results,
          );
          if (onSubmissionStatusChange) onSubmissionStatusChange(true);
          Alert.alert("Success", "File submitted successfully!");
        } else {
          Alert.alert("Saved", "Your progress has been saved.");
        }
      }
    } catch (error) {
      console.error("Failed to submit file task", error);
      Alert.alert("Error", "Could not save your submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Theme.colors.surface }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={{ marginTop: 10, color: Theme.colors.textMuted }}>
          Loading Assignment...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Theme.colors.background }]}
    >
      <View style={[styles.card, { backgroundColor: Theme.colors.surface }]}>
        <Text style={[styles.title, { color: Theme.colors.text }]}>
          Submit a File
        </Text>
        <Text style={[styles.description, { color: Theme.colors.textMuted }]}>
          Upload your completed document, image, or archive file below.
        </Text>

        {!hasSubmitted && !selectedFile && !serverFileUuid ? (
          <TouchableOpacity
            style={[
              styles.uploadBox,
              {
                borderColor: Theme.colors.primary,
                backgroundColor: `${Theme.colors.primary}05`,
              },
            ]}
            onPress={pickDocument}
          >
            <FileUp
              size={32}
              color={Theme.colors.primary}
              style={{ marginBottom: 12 }}
            />
            <Text style={{ color: Theme.colors.primary, fontWeight: "600" }}>
              Tap to browse files
            </Text>
            <Text
              style={{
                color: Theme.colors.textMuted,
                fontSize: 12,
                marginTop: 4,
              }}
            >
              Maximum size: 50MB
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Selected File (Local) */}
        {selectedFile && !hasSubmitted ? (
          <View style={[styles.fileCard, { borderColor: Theme.colors.border }]}>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <File size={24} color={Theme.colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{ color: Theme.colors.text, fontWeight: "500" }}
                  numberOfLines={1}
                >
                  {selectedFile.name}
                </Text>
                <Text style={{ color: Theme.colors.textMuted, fontSize: 12 }}>
                  {selectedFile.size
                    ? (selectedFile.size / 1024 / 1024).toFixed(2) + " MB"
                    : "Unknown size"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={removeSelectedFile}
              style={{ padding: 8 }}
            >
              <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Uploaded File (Server) */}
        {serverFileUuid && !selectedFile ? (
          <View
            style={[
              styles.fileCard,
              {
                borderColor: Theme.colors.border,
                backgroundColor: hasSubmitted
                  ? Theme.colors.background
                  : "transparent",
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <CheckCircle2 size={24} color={Theme.colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{ color: Theme.colors.text, fontWeight: "500" }}
                  numberOfLines={1}
                >
                  File Uploaded
                </Text>
                <Text style={{ color: Theme.colors.textMuted, fontSize: 12 }}>
                  {serverFileUuid}
                </Text>
              </View>
            </View>
            {!hasSubmitted && (
              <TouchableOpacity
                onPress={() => setServerFileUuid("")}
                style={{ padding: 8 }}
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {gradingResults && gradingResults.is_correct !== undefined && (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor: gradingResults.is_correct
                  ? "#E6F4EA"
                  : "#FCE8E6",
                borderColor: gradingResults.is_correct ? "#CEEAD6" : "#FAD2CF",
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {gradingResults.is_correct ? (
                <Check size={18} color="#137333" style={{ marginRight: 8 }} />
              ) : (
                <X size={18} color="#A50E0E" style={{ marginRight: 8 }} />
              )}
              <Text
                style={{
                  color: gradingResults.is_correct ? "#137333" : "#A50E0E",
                  fontWeight: "600",
                }}
              >
                {gradingResults.is_correct ? "Accepted" : "Needs Revision"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {!hasSubmitted && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.saveBtn, { borderColor: Theme.colors.border }]}
            onPress={() => handleSaveOrSubmit(false)}
            disabled={submitting}
          >
            <Text style={{ color: Theme.colors.text, fontWeight: "600" }}>
              {submitting ? "..." : "Save Draft"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: Theme.colors.primary },
            ]}
            onPress={() => handleSaveOrSubmit(true)}
            disabled={submitting}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>
              {submitting ? "Submitting..." : "Submit File"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {hasSubmitted && (
        <View style={[styles.actionRow, { justifyContent: "center" }]}>
          <CheckCircle2
            size={20}
            color={Theme.colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: Theme.colors.text,
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            File Submitted
          </Text>
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    padding: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  feedbackBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 40,
    gap: 12,
  },
  saveBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
  },
  submitBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});

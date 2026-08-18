import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import {
  Link2,
  ExternalLink,
  CheckCircle2,
  Check,
  X,
} from "lucide-react-native";

export default function NativeLinkSubmissionRenderer({
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
  const [linkInput, setLinkInput] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gradingResults, setGradingResults] = useState<any>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<string>("");

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
        if (subRes.data.task_submission.linkUrl) {
          setLinkInput(subRes.data.task_submission.linkUrl);
        }

        const status = subRes.data.status;
        setSubmissionFeedback(subRes.data.task_submission_grade_feedback || "");

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
      console.error("Failed to load link task:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentTaskUuid, session?.accessToken]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSaveOrSubmit = async (isFinalSubmit: boolean = false) => {
    if (!session?.accessToken || !assignmentTaskUuid) return;

    let urlToSubmit = linkInput.trim();
    if (!urlToSubmit) {
      Alert.alert("Error", "Please enter a valid link.");
      return;
    }

    // Auto-prepend https if missing
    if (
      !urlToSubmit.startsWith("http://") &&
      !urlToSubmit.startsWith("https://")
    ) {
      urlToSubmit = "https://" + urlToSubmit;
      setLinkInput(urlToSubmit);
    }

    if (!isValidUrl(urlToSubmit)) {
      Alert.alert(
        "Error",
        "The provided text does not appear to be a valid URL.",
      );
      return;
    }

    const payload = {
      assignment_task_uuid: assignmentTaskUuid,
      action: isFinalSubmit ? "SUBMIT" : "SAVE",
      task_submission: {
        linkUrl: urlToSubmit,
      },
    };

    try {
      setSubmitting(true);
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
          Alert.alert("Success", "Link submitted successfully!");
        } else {
          Alert.alert("Saved", "Your progress has been saved.");
        }
      }
    } catch (error) {
      console.error("Failed to submit link", error);
      Alert.alert("Error", "Could not save your submission.");
    } finally {
      setSubmitting(false);
    }
  };

  const openLink = () => {
    if (linkInput) {
      Linking.openURL(linkInput).catch(() => {
        Alert.alert("Error", "Could not open the provided link.");
      });
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
          Submit a Link
        </Text>
        <Text style={[styles.description, { color: Theme.colors.textMuted }]}>
          Provide a URL to your completed work (e.g. Google Docs, Figma, GitHub,
          etc.)
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              borderColor: hasSubmitted ? "transparent" : Theme.colors.border,
              backgroundColor: hasSubmitted
                ? Theme.colors.background
                : "transparent",
            },
          ]}
        >
          <Link2
            size={20}
            color={Theme.colors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={[
              styles.input,
              {
                color: hasSubmitted
                  ? Theme.colors.textMuted
                  : Theme.colors.text,
              },
            ]}
            placeholder="https://..."
            placeholderTextColor={Theme.colors.border}
            value={linkInput}
            onChangeText={setLinkInput}
            editable={!hasSubmitted}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {hasSubmitted && linkInput ? (
          <TouchableOpacity
            style={[
              styles.openLinkBtn,
              { backgroundColor: `${Theme.colors.primary}15` },
            ]}
            onPress={openLink}
          >
            <ExternalLink size={16} color={Theme.colors.primary} />
            <Text
              style={[styles.openLinkText, { color: Theme.colors.primary }]}
            >
              Test Submitted Link
            </Text>
          </TouchableOpacity>
        ) : null}

        {submissionFeedback ? (
          <View
            style={[
              styles.feedbackBox,
              { backgroundColor: "#F0F9FF", borderColor: "#B9E6FE" },
            ]}
          >
            <Text
              style={{ color: "#026AA2", fontWeight: "600", marginBottom: 4 }}
            >
              Teacher Feedback:
            </Text>
            <Text style={{ color: "#0284C7" }}>{submissionFeedback}</Text>
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
              {submitting ? "Submitting..." : "Submit Link"}
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
            Link Submitted
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  openLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  openLinkText: {
    marginLeft: 8,
    fontWeight: "600",
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

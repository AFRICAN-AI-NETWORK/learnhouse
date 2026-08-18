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
  Platform,
} from "react-native";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { Terminal, CheckCircle2, Check, X } from "lucide-react-native";

export default function NativeCodeEditorRenderer({
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
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gradingResults, setGradingResults] = useState<any>(null);

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
      let exercises: any[] = [];
      if (res.data) {
        setTaskData(res.data);
        exercises = res.data.contents?.exercises || [];
      }

      // Fetch user's existing submissions (if any)
      const subRes = await apiRequest(
        `/api/v1/assignments/${assignmentUuid}/tasks/${assignmentTaskUuid}/submissions/me`,
        { token: session.accessToken },
      );

      if (subRes.data?.task_submission) {
        const existingSubmissions =
          subRes.data.task_submission.submissions || [];
        // Map existing submissions, filling blanks for missing ones
        const mappedSubmissions = exercises.map((ex: any) => {
          const existing = existingSubmissions.find(
            (s: any) => s.exerciseUUID === ex.exerciseUUID,
          );
          return (
            existing || {
              exerciseUUID: ex.exerciseUUID,
              code: ex.starterCode || "",
            }
          );
        });
        setSubmissions(mappedSubmissions);

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
        // Initialize empty submissions
        setSubmissions(
          exercises.map((ex: any) => ({
            exerciseUUID: ex.exerciseUUID,
            code: ex.starterCode || "",
          })),
        );
        if (onSubmissionStatusChange) onSubmissionStatusChange(false);
      }
    } catch (error) {
      console.error("Failed to load code task:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentTaskUuid, session?.accessToken]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const updateCode = (exerciseUUID: string, newCode: string) => {
    if (hasSubmitted) return;
    setSubmissions((prev) =>
      prev.map((s) =>
        s.exerciseUUID === exerciseUUID ? { ...s, code: newCode } : s,
      ),
    );
  };

  const handleSaveOrSubmit = async (isFinalSubmit: boolean = false) => {
    if (!session?.accessToken || !assignmentTaskUuid) return;

    const payload = {
      assignment_task_uuid: assignmentTaskUuid,
      action: isFinalSubmit ? "SUBMIT" : "SAVE",
      task_submission: {
        submissions: submissions,
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
          Alert.alert("Success", "Code submitted successfully!");
        } else {
          Alert.alert("Saved", "Your progress has been saved.");
        }
      }
    } catch (error) {
      console.error("Failed to submit code", error);
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

  const exercises = taskData?.contents?.exercises || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Theme.colors.background }]}
    >
      <View style={[styles.card, { backgroundColor: Theme.colors.surface }]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Terminal
            size={20}
            color={Theme.colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              styles.title,
              { color: Theme.colors.text, marginBottom: 0 },
            ]}
          >
            Code Editor
          </Text>
        </View>

        {exercises.map((exercise: any, index: number) => {
          const sub = submissions.find(
            (s) => s.exerciseUUID === exercise.exerciseUUID,
          ) || { code: "" };
          return (
            <View key={exercise.exerciseUUID} style={styles.exerciseContainer}>
              <Text
                style={[styles.exerciseTitle, { color: Theme.colors.text }]}
              >
                {index + 1}. {exercise.title}
              </Text>
              <Text
                style={[styles.exerciseDesc, { color: Theme.colors.textMuted }]}
              >
                {exercise.description}
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: `${Theme.colors.primary}15`,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: Theme.colors.primary,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  {exercise.language}
                </Text>
              </View>

              <View
                style={[
                  styles.editorContainer,
                  {
                    borderColor: Theme.colors.border,
                    backgroundColor: hasSubmitted
                      ? Theme.colors.background
                      : "#1e1e1e",
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.editorInput,
                    {
                      color: hasSubmitted ? Theme.colors.textMuted : "#d4d4d4",
                    },
                  ]}
                  multiline
                  placeholder="// Write your code here..."
                  placeholderTextColor="#808080"
                  value={sub.code}
                  onChangeText={(text) =>
                    updateCode(exercise.exerciseUUID, text)
                  }
                  editable={!hasSubmitted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                />
              </View>
            </View>
          );
        })}

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
              {submitting ? "Submitting..." : "Submit Code"}
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
            Code Submitted
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
  exerciseContainer: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  exerciseDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  editorContainer: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 150,
  },
  editorInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlignVertical: "top",
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

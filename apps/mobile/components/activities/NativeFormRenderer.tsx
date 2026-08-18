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
} from "react-native";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { Type, CheckCircle2, Check, X } from "lucide-react-native";

export default function NativeFormRenderer({
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
      let questions: any[] = [];
      if (res.data) {
        setTaskData(res.data);
        questions = res.data.contents?.questions || [];
      }

      // Fetch user's existing submissions (if any)
      const subRes = await apiRequest(
        `/api/v1/assignments/${assignmentUuid}/tasks/${assignmentTaskUuid}/submissions/me`,
        { token: session.accessToken },
      );

      if (subRes.data?.task_submission) {
        setSubmissions(subRes.data.task_submission.submissions || []);

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
      console.error("Failed to load form task:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentTaskUuid, session?.accessToken]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const updateAnswer = (
    questionUUID: string,
    blankUUID: string,
    text: string,
  ) => {
    if (hasSubmitted) return;
    setSubmissions((prev) => {
      const existingIdx = prev.findIndex(
        (s) => s.questionUUID === questionUUID && s.blankUUID === blankUUID,
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].answer = text;
        return next;
      }
      return [...prev, { questionUUID, blankUUID, answer: text }];
    });
  };

  const getAnswer = (questionUUID: string, blankUUID: string) => {
    const sub = submissions.find(
      (s) => s.questionUUID === questionUUID && s.blankUUID === blankUUID,
    );
    return sub ? sub.answer : "";
  };

  const handleSaveOrSubmit = async (isFinalSubmit: boolean = false) => {
    if (!session?.accessToken || !assignmentTaskUuid) return;

    // Clean submissions
    const finalSubmissions = submissions
      .map((s) => ({
        questionUUID: s.questionUUID,
        blankUUID: s.blankUUID,
        answer: s.answer.trim(),
      }))
      .filter((s) => s.answer.length > 0);

    const payload = {
      assignment_task_uuid: assignmentTaskUuid,
      action: isFinalSubmit ? "SUBMIT" : "SAVE",
      task_submission: {
        questions: taskData?.contents?.questions || [],
        submissions: finalSubmissions,
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
          Alert.alert("Success", "Form submitted successfully!");
        } else {
          Alert.alert("Saved", "Your progress has been saved.");
        }
      }
    } catch (error) {
      console.error("Failed to submit form", error);
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

  const questions = taskData?.contents?.questions || [];

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
          <Type
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
            Form Assignment
          </Text>
        </View>

        {questions.map((question: any, index: number) => {
          return (
            <View
              key={question.questionUUID || index}
              style={styles.questionContainer}
            >
              <Text style={[styles.questionText, { color: Theme.colors.text }]}>
                {index + 1}. {question.questionText}
              </Text>

              {question.blanks?.map((blank: any, bIndex: number) => (
                <View
                  key={blank.blankUUID || bIndex}
                  style={styles.blankContainer}
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderColor: Theme.colors.border,
                        color: hasSubmitted
                          ? Theme.colors.textMuted
                          : Theme.colors.text,
                        backgroundColor: hasSubmitted
                          ? Theme.colors.background
                          : "transparent",
                      },
                    ]}
                    placeholder={blank.placeholder || "Enter answer here"}
                    placeholderTextColor={Theme.colors.textMuted}
                    value={getAnswer(question.questionUUID, blank.blankUUID)}
                    onChangeText={(text) =>
                      updateAnswer(question.questionUUID, blank.blankUUID, text)
                    }
                    editable={!hasSubmitted}
                  />
                  {gradingResults?.length > 0 && (
                    <View style={{ marginTop: 4 }}>
                      {/* For auto grading, backend usually returns grading_results arrays per question, but checking overall correctness is easier */}
                    </View>
                  )}
                </View>
              ))}
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
              {submitting ? "Submitting..." : "Submit Form"}
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
            Form Submitted
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
  questionContainer: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  blankContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 45,
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

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { CheckCircle2, Circle, Check, X } from "lucide-react-native";

type QuizOption = {
  optionUUID: string;
  text: string;
  fileID: string;
  type: "text" | "image" | "audio" | "video";
  assigned_right_answer?: boolean;
};

type QuizQuestion = {
  questionUUID: string;
  questionText: string;
  options: QuizOption[];
};

type Submission = {
  questionUUID: string;
  optionUUID: string;
  answer: boolean;
};

type QuizSubmitSchema = {
  questions: QuizQuestion[];
  submissions: Submission[];
  assignment_task_submission_uuid?: string;
  grading_results?: any;
};

export default function NativeQuizRenderer({
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

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<QuizSubmitSchema>({
    questions: [],
    submissions: [],
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gradingResults, setGradingResults] = useState<any>(null);

  const fetchTask = useCallback(async () => {
    if (!session?.accessToken || !assignmentTaskUuid) return;
    try {
      setLoading(true);
      // Fetch the task (questions)
      const res = await apiRequest(
        `/api/v1/assignments/task/${assignmentTaskUuid}`,
        {
          token: session.accessToken,
        },
      );
      if (res.data?.contents?.questions) {
        setQuestions(res.data.contents.questions);
      }

      // Fetch user's existing submissions (if any)
      const subRes = await apiRequest(
        `/api/v1/assignments/${assignmentUuid}/tasks/${assignmentTaskUuid}/submissions/me`,
        { token: session.accessToken },
      );

      if (subRes.data?.task_submission) {
        setUserSubmissions({
          ...subRes.data.task_submission,
          assignment_task_submission_uuid:
            subRes.data.assignment_task_submission_uuid,
        });

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
      console.error("Failed to load quiz:", error);
    } finally {
      setLoading(false);
    }
  }, [assignmentTaskUuid, session?.accessToken]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const chooseOption = (qIndex: number, oIndex: number) => {
    if (hasSubmitted) return; // Locked if already submitted

    const question = questions[qIndex];
    const option = question?.options[oIndex];

    if (!question || !option) return;

    const questionUUID = question.questionUUID;
    const optionUUID = option.optionUUID;

    const updatedSubmissions = [...userSubmissions.submissions];
    const submissionsForOtherQuestions = updatedSubmissions.filter(
      (submission) => submission.questionUUID !== questionUUID,
    );

    const updatedQuestionSubmissions = question.options.map(
      (questionOption) => ({
        questionUUID,
        optionUUID: questionOption.optionUUID || "",
        answer: questionOption.optionUUID === optionUUID,
      }),
    );

    setUserSubmissions({
      ...userSubmissions,
      submissions: [
        ...submissionsForOtherQuestions,
        ...updatedQuestionSubmissions,
      ],
    });
  };

  const handleSaveOrSubmit = async (isFinalSubmit: boolean = false) => {
    if (!session?.accessToken || !assignmentTaskUuid) return;

    // Auto-fill unanswered options with false
    const finalSubmissions: Submission[] = questions.flatMap((question) => {
      return question.options.map((option) => {
        const existing = userSubmissions.submissions.find(
          (s) =>
            s.questionUUID === question.questionUUID &&
            s.optionUUID === option.optionUUID,
        );
        return (
          existing || {
            questionUUID: question.questionUUID,
            optionUUID: option.optionUUID,
            answer: false,
          }
        );
      });
    });

    const payload = {
      assignment_task_uuid: assignmentTaskUuid,
      action: isFinalSubmit ? "SUBMIT" : "SAVE",
      task_submission: {
        questions: questions,
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
          Alert.alert("Success", "Quiz submitted successfully!");
        } else {
          Alert.alert("Saved", "Your progress has been saved.");
        }
      }
    } catch (error) {
      console.error("Failed to submit quiz", error);
      Alert.alert("Error", "Could not save your progress.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Theme.colors.surface }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={{ marginTop: 10, color: Theme.colors.textMuted }}>
          Loading Quiz...
        </Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: Theme.colors.surface }]}>
        <Text style={{ color: Theme.colors.textMuted }}>
          No questions found for this quiz.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Theme.colors.background }]}
    >
      {questions.map((question, qIndex) => {
        const isCorrectQuestion = gradingResults?.find(
          (r: any) => r.questionUUID === question.questionUUID,
        )?.is_correct;

        return (
          <View
            key={question.questionUUID}
            style={[
              styles.questionCard,
              { backgroundColor: Theme.colors.surface },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={[
                  styles.questionText,
                  { color: Theme.colors.text, flex: 1 },
                ]}
              >
                {question.questionText}
              </Text>

              {hasSubmitted && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isCorrectQuestion
                        ? "#E6F4EA"
                        : "#FCE8E6",
                    },
                  ]}
                >
                  {isCorrectQuestion ? (
                    <Check size={16} color="#137333" />
                  ) : (
                    <X size={16} color="#A50E0E" />
                  )}
                </View>
              )}
            </View>

            <View style={styles.optionsContainer}>
              {question.options.map((option, oIndex) => {
                const isSelected = userSubmissions.submissions.find(
                  (s) =>
                    s.questionUUID === question.questionUUID &&
                    s.optionUUID === option.optionUUID,
                )?.answer;

                let optionColor = Theme.colors.text;
                let bgColor = "transparent";

                // If submitted, show the correct answers and highlight wrong ones
                if (hasSubmitted && isSelected) {
                  bgColor = isCorrectQuestion ? "#E6F4EA" : "#FCE8E6";
                  optionColor = isCorrectQuestion ? "#137333" : "#A50E0E";
                }

                return (
                  <TouchableOpacity
                    key={option.optionUUID}
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: bgColor,
                        borderColor: isSelected
                          ? Theme.colors.primary
                          : Theme.colors.border,
                      },
                    ]}
                    onPress={() => chooseOption(qIndex, oIndex)}
                    disabled={hasSubmitted}
                  >
                    {isSelected ? (
                      <CheckCircle2
                        size={20}
                        color={
                          hasSubmitted ? optionColor : Theme.colors.primary
                        }
                      />
                    ) : (
                      <Circle size={20} color={Theme.colors.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            hasSubmitted && isSelected
                              ? optionColor
                              : Theme.colors.text,
                        },
                      ]}
                    >
                      {option.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

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
              {submitting ? "Submitting..." : "Submit Answers"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {hasSubmitted && (
        <View style={[styles.actionRow, { justifyContent: "center" }]}>
          <Text
            style={{
              color: Theme.colors.text,
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Quiz Submitted and Graded
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
  questionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  optionsContainer: {
    marginTop: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
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
  badge: {
    padding: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
});

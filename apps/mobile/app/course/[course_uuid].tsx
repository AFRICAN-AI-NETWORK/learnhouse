import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useCurrency } from "../../context/CurrencyContext";
import { useVideoPlayer, VideoView } from "expo-video";
import { WebView } from "react-native-webview";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest, getApiUrl } from "../../services/api";
import { ChevronLeft, PlayCircle, CheckCircle2 } from "lucide-react-native";
import NativeQuizRenderer from "../../components/activities/NativeQuizRenderer";
import NativeLinkSubmissionRenderer from "../../components/activities/NativeLinkSubmissionRenderer";
import NativeCodeEditorRenderer from "../../components/activities/NativeCodeEditorRenderer";
import NativeFormRenderer from "../../components/activities/NativeFormRenderer";
import NativeFileSubmissionRenderer from "../../components/activities/NativeFileSubmissionRenderer";

export default function CourseViewer() {
  const { course_uuid } = useLocalSearchParams();
  const courseUuidStr = Array.isArray(course_uuid)
    ? course_uuid[0]
    : course_uuid || "";
  const fullUuid = courseUuidStr.startsWith("course_")
    ? courseUuidStr
    : `course_${courseUuidStr}`;

  const { session } = useAuth();
  const isAuthenticated = !!session;
  const { Theme, isDark } = useAppTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [courseData, setCourseData] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [activeActivity, setActiveActivity] = useState<any>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [orgUuid, setOrgUuid] = useState<string>("");
  const [orgId, setOrgId] = useState<number | null>(null);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(
    new Set(),
  );
  const [isCompleting, setIsCompleting] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [assignmentTasks, setAssignmentTasks] = useState<any[]>([]);
  const [assignmentUuid, setAssignmentUuid] = useState<string | null>(null);
  const [isAssignmentSubmitted, setIsAssignmentSubmitted] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [paymentsProducts, setPaymentsProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { currency, setCurrency, convertAmount, exchangeRates } = useCurrency();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please log in to view this course.",
        [{ text: "Log In", onPress: () => router.push("/auth/login") }],
      );
      return;
    }

    const fetchCourseData = async () => {
      try {
        if (!courseData) {
          setLoading(true);
        }

        // Add a 10 second timeout to prevent infinite hanging
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Network request timed out. The backend might be unreachable or hanging.",
                ),
              ),
            10000,
          ),
        );

        const orgSlug = session?.orgSlug || "default";

        // 1. Fetch Meta and Org in parallel
        const metaAndOrgPromises = Promise.all([
          apiRequest(`/api/v1/courses/${fullUuid}/meta`, {
            token: session?.accessToken,
          }),
          apiRequest(`/api/v1/orgs/slug/${orgSlug}`, {
            token: session?.accessToken,
          }),
        ]);

        const [metaRes, orgRes] = await Promise.race([
          metaAndOrgPromises,
          timeoutPromise,
        ]);

        if (metaRes.error) {
          throw new Error(metaRes.error);
        }

        let fetchedOrgUUID = "";
        let fetchedOrgId = null;
        if (!orgRes.error && orgRes.data) {
          fetchedOrgId = orgRes.data.id;
          setOrgId(fetchedOrgId);
          fetchedOrgUUID = orgRes.data.org_uuid;
          if (!fetchedOrgUUID.startsWith("org_"))
            fetchedOrgUUID = "org_" + fetchedOrgUUID;
          setOrgUuid(fetchedOrgUUID);
        }

        // 2. Fetch Trail using the correct org_id endpoint to prevent the 500 backend error
        let trailRes: any = { data: null };
        if (fetchedOrgId) {
          trailRes = await apiRequest(
            `/api/v1/trail/org/${fetchedOrgId}/trail`,
            {
              token: session?.accessToken,
            },
          );
        }

        if (metaRes.data) {
          setCourseData(metaRes.data);
          const chapters = metaRes.data.chapters || [];
          setCurriculum(chapters);

          let targetActivity = null;
          let isUserEnrolled = false;

          // Attempt to resume from the trail progress
          if (trailRes.data && trailRes.data.runs) {
            const courseRun = trailRes.data.runs.find(
              (r: any) => r.course_id === metaRes.data.id,
            );

            if (courseRun) {
              isUserEnrolled = true;

              if (courseRun.steps) {
                const completed = new Set<string>();
                for (const s of courseRun.steps) {
                  if (s.complete) {
                    if (s.activity_uuid)
                      completed.add(s.activity_uuid.replace("activity_", ""));
                    if (s.activity_id) completed.add(s.activity_id.toString());
                  }
                }
                setCompletedActivities(completed);

                // Rely strictly on curriculum order to find the next uncompleted activity
                let foundNext = false;
                for (const chapter of chapters) {
                  if (chapter.activities) {
                    for (const act of chapter.activities) {
                      const cleanActUuid = act.activity_uuid?.replace(
                        "activity_",
                        "",
                      );
                      if (
                        !completed.has(cleanActUuid) &&
                        !completed.has(act.id?.toString())
                      ) {
                        targetActivity = act;
                        foundNext = true;
                        break;
                      }
                    }
                  }
                  if (foundNext) break;
                }
              }
            }
          }

          setIsEnrolled(isUserEnrolled);

          if (!isUserEnrolled && metaRes.data.is_paid) {
            try {
              const pRes = await apiRequest(
                `/api/v1/payments/${fetchedOrgId}/courses/${metaRes.data.id}/products`,
                {
                  token: session?.accessToken,
                },
              );
              if (pRes.data && Array.isArray(pRes.data)) {
                setPaymentsProducts(pRes.data);
                if (pRes.data.length > 0) {
                  setSelectedProduct(pRes.data[0]);
                }
              }
            } catch (e) {
              console.log("Failed to fetch products", e);
            }
          } else {
            // Fallback to first activity if no progress or fully completed
            if (!targetActivity) {
              for (const chapter of chapters) {
                if (chapter.activities && chapter.activities.length > 0) {
                  targetActivity = chapter.activities[0];
                  break;
                }
              }
            }

            if (targetActivity) {
              setActiveActivity(targetActivity);
              if (
                targetActivity.activity_sub_type === "SUBTYPE_VIDEO_HOSTED" &&
                targetActivity.content?.filename
              ) {
                const baseUrl = getApiUrl().replace(/\/$/, "");
                setVideoSource(
                  `${baseUrl}/content/orgs/${fetchedOrgUUID}/courses/${fullUuid}/activities/${targetActivity.activity_uuid}/video/${targetActivity.content.filename}`,
                );
              } else if (targetActivity.content?.uri) {
                setVideoSource(targetActivity.content.uri);
              } else {
                setVideoSource(null);
              }
            }
          }
        }
      } catch (error) {
        Alert.alert("Error", "An error occurred while loading the course.", [
          { text: "Go Back", onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [course_uuid, isAuthenticated]);

  useEffect(() => {
    if (activeActivity?.activity_type === "TYPE_ASSIGNMENT") {
      const fetchAssignment = async () => {
        try {
          const assignmentRes = await apiRequest(
            `/api/v1/assignments/activity/${activeActivity.activity_uuid || activeActivity.id}`,
            {
              token: session?.accessToken,
            },
          );

          if (assignmentRes.data && assignmentRes.data.assignment_uuid) {
            setAssignmentUuid(assignmentRes.data.assignment_uuid);
            const tasksRes = await apiRequest(
              `/api/v1/assignments/${assignmentRes.data.assignment_uuid}/tasks`,
              {
                token: session?.accessToken,
              },
            );
            if (tasksRes.data) {
              setAssignmentTasks(
                Array.isArray(tasksRes.data)
                  ? tasksRes.data
                  : tasksRes.data.assignment_tasks || [],
              );
            }
          }
        } catch (e) {
          console.error("Failed to fetch assignment tasks", e);
        }
      };
      fetchAssignment();
    } else {
      setAssignmentTasks([]);
      setAssignmentUuid(null);
      setIsAssignmentSubmitted(false);
    }
  }, [activeActivity, session?.accessToken]);

  const markAsComplete = async () => {
    if (!activeActivity || !session) return;
    try {
      setIsCompleting(true);
      await apiRequest(
        `/api/v1/trail/add_activity/${activeActivity.activity_uuid || activeActivity.id}`,
        {
          method: "POST",
          token: session.accessToken,
        },
      );
      setCompletedActivities((prev) =>
        new Set(prev).add(
          activeActivity.activity_uuid?.replace("activity_", "") ||
            activeActivity.id?.toString(),
        ),
      );
    } catch (error) {
      console.error("Failed to mark complete", error);
      Alert.alert("Error", "Could not mark activity as complete.");
    } finally {
      setIsCompleting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View
        style={[styles.center, { backgroundColor: Theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[styles.center, { backgroundColor: Theme.colors.background }]}
      >
        {/* Changed color to orange to verify this is our spinner */}
        <ActivityIndicator size="large" color="orange" />
        <Text style={{ marginTop: 10, color: Theme.colors.textMuted }}>
          Loading course data...
        </Text>
      </View>
    );
  }

  const renderActivityContent = () => {
    if (!activeActivity) {
      return (
        <View
          style={[
            styles.videoPlaceholder,
            { backgroundColor: Theme.colors.surface },
          ]}
        >
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      );
    }

    const type = activeActivity.activity_type;
    const subType = activeActivity.activity_sub_type;

    if (type === "TYPE_VIDEO") {
      let videoEl = null;
      if (subType === "SUBTYPE_VIDEO_YOUTUBE" && activeActivity.content?.uri) {
        const youtubeIdMatch = activeActivity.content.uri.match(
          /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/,
        );
        const youtubeId = youtubeIdMatch ? youtubeIdMatch[1] : null;
        if (youtubeId) {
          const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
          if (Platform.OS === "web") {
            videoEl = (
              <iframe
                src={embedUrl}
                style={{ width: "100%", aspectRatio: 16 / 9, border: 0 }}
                allow="fullscreen"
              />
            );
          } else {
            videoEl = (
              <WebView source={{ uri: embedUrl }} style={styles.videoPlayer} />
            );
          }
        }
      } else if (videoSource) {
        videoEl = <VideoView style={styles.videoPlayer} player={player} />;
      } else {
        videoEl = (
          <View
            style={[
              styles.videoPlaceholder,
              { backgroundColor: Theme.colors.surface },
            ]}
          >
            <Text style={{ color: Theme.colors.textMuted }}>
              No video available for this lesson.
            </Text>
          </View>
        );
      }
      return (
        <View>
          {videoEl}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.completeBtn,
                completedActivities.has(
                  activeActivity.activity_uuid?.replace("activity_", "") ||
                    activeActivity.id?.toString(),
                ) && styles.completedBtn,
              ]}
              onPress={markAsComplete}
              disabled={
                isCompleting ||
                completedActivities.has(
                  activeActivity.activity_uuid?.replace("activity_", "") ||
                    activeActivity.id?.toString(),
                )
              }
            >
              <CheckCircle2
                size={18}
                color={
                  completedActivities.has(
                    activeActivity.activity_uuid?.replace("activity_", "") ||
                      activeActivity.id?.toString(),
                  )
                    ? Theme.colors.primary
                    : "#FFF"
                }
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.completeBtnText,
                  completedActivities.has(
                    activeActivity.activity_uuid?.replace("activity_", "") ||
                      activeActivity.id?.toString(),
                  ) && { color: Theme.colors.primary },
                ]}
              >
                {isCompleting
                  ? "Saving..."
                  : completedActivities.has(
                        activeActivity.activity_uuid?.replace(
                          "activity_",
                          "",
                        ) || activeActivity.id?.toString(),
                      )
                    ? "Completed"
                    : "Mark as Complete"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (type === "TYPE_DOCUMENT" && subType === "SUBTYPE_DOCUMENT_PDF") {
      return (
        <View
          style={[
            styles.videoPlaceholder,
            { backgroundColor: Theme.colors.surface, padding: 20 },
          ]}
        >
          <Text
            style={{
              color: Theme.colors.text,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            {activeActivity.name || "Document Lesson"}
          </Text>
          <TouchableOpacity
            style={styles.startLessonBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.startLessonBtnText}>Read Document</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === "TYPE_SMART_ARTICLE") {
      return (
        <View
          style={[
            styles.videoPlaceholder,
            { backgroundColor: Theme.colors.surface, padding: 20 },
          ]}
        >
          <Text
            style={{
              color: Theme.colors.text,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            {activeActivity.name || "Smart Article"}
          </Text>
          <TouchableOpacity
            style={styles.startLessonBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.startLessonBtnText}>Start Lesson</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === "TYPE_ASSIGNMENT") {
      return (
        <View
          style={[
            styles.videoPlaceholder,
            { backgroundColor: Theme.colors.surface, padding: 20 },
          ]}
        >
          <Text
            style={{
              color: Theme.colors.text,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            {activeActivity.name || "Assignment"}
          </Text>
          <TouchableOpacity
            style={styles.startLessonBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.startLessonBtnText}>Start Assignment</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isAssignmentBlock =
      type === "TYPE_ASSIGNMENT" && assignmentTasks.length > 0;
    const isMarkCompleteDisabled =
      isCompleting ||
      completedActivities.has(
        activeActivity.activity_uuid?.replace("activity_", "") ||
          activeActivity.id?.toString(),
      ) ||
      (isAssignmentBlock && !isAssignmentSubmitted);

    return (
      <View
        style={[
          styles.videoPlaceholder,
          { backgroundColor: Theme.colors.surface, padding: 20 },
        ]}
      >
        <Text
          style={{
            color: Theme.colors.text,
            fontSize: 16,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {activeActivity.name || "Activity"}
        </Text>
        <Text style={{ color: Theme.colors.textMuted, textAlign: "center" }}>
          This is a {type ? type.replace("TYPE_", "").toLowerCase() : "custom"}{" "}
          activity. Please open this course on the web platform to fully
          interact with this lesson.
        </Text>
        <View style={[styles.actionRow, { marginTop: 20 }]}>
          <TouchableOpacity
            style={[
              styles.completeBtn,
              completedActivities.has(
                activeActivity.activity_uuid?.replace("activity_", "") ||
                  activeActivity.id?.toString(),
              ) && styles.completedBtn,
              isMarkCompleteDisabled && { opacity: 0.5 },
            ]}
            onPress={markAsComplete}
            disabled={isMarkCompleteDisabled}
          >
            <CheckCircle2
              size={18}
              color={
                completedActivities.has(
                  activeActivity.activity_uuid?.replace("activity_", "") ||
                    activeActivity.id?.toString(),
                )
                  ? Theme.colors.primary
                  : "#FFF"
              }
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.completeBtnText,
                completedActivities.has(
                  activeActivity.activity_uuid?.replace("activity_", "") ||
                    activeActivity.id?.toString(),
                ) && { color: Theme.colors.primary },
              ]}
            >
              {isCompleting
                ? "Saving..."
                : completedActivities.has(
                      activeActivity.activity_uuid?.replace("activity_", "") ||
                        activeActivity.id?.toString(),
                    )
                  ? "Completed"
                  : "Mark as Complete"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderModalContent = () => {
    if (!activeActivity) return null;
    const type = activeActivity.activity_type;
    const subType = activeActivity.activity_sub_type;

    if (type === "TYPE_DOCUMENT" && subType === "SUBTYPE_DOCUMENT_PDF") {
      if (activeActivity.content?.filename) {
        const baseUrl = getApiUrl().replace(/\/$/, "");
        const pdfUrl = `${baseUrl}/content/orgs/${orgUuid}/courses/${fullUuid}/activities/${activeActivity.activity_uuid}/documentpdf/${activeActivity.content.filename}`;

        if (Platform.OS === "web") {
          return (
            <iframe
              src={pdfUrl}
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          );
        }

        // Use Mozilla's robust PDF.js viewer for a perfectly clean native-like UI on Android
        const viewerUrl =
          Platform.OS === "android"
            ? `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}#toolbar=0`
            : pdfUrl;

        return (
          <WebView
            source={{ uri: viewerUrl }}
            style={{ flex: 1 }}
            scalesPageToFit
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        );
      }
    }

    if (type === "TYPE_SMART_ARTICLE") {
      const steps = activeActivity.content?.steps || [];
      return (
        <ScrollView
          style={{
            flex: 1,
            padding: 20,
            backgroundColor: Theme.colors.surface,
          }}
        >
          {steps.map((step: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 30 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  color: Theme.colors.text,
                  marginBottom: 12,
                }}
              >
                {step.title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: Theme.colors.textMuted,
                  lineHeight: 26,
                }}
              >
                {step.content || step.text}
              </Text>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      );
    }

    if (type === "TYPE_ASSIGNMENT") {
      const task = assignmentTasks.length > 0 ? assignmentTasks[0] : null;
      if (task && assignmentUuid) {
        switch (task.assignment_type) {
          case "QUIZ":
            return (
              <NativeQuizRenderer
                assignmentUuid={assignmentUuid}
                assignmentTaskUuid={task.assignment_task_uuid}
                onSubmissionStatusChange={setIsAssignmentSubmitted}
              />
            );
          case "LINK_SUBMISSION":
            return (
              <NativeLinkSubmissionRenderer
                assignmentUuid={assignmentUuid}
                assignmentTaskUuid={task.assignment_task_uuid}
                onSubmissionStatusChange={setIsAssignmentSubmitted}
              />
            );
          case "CODE_EDITOR":
            return (
              <NativeCodeEditorRenderer
                assignmentUuid={assignmentUuid}
                assignmentTaskUuid={task.assignment_task_uuid}
                onSubmissionStatusChange={setIsAssignmentSubmitted}
              />
            );
          case "FORM":
            return (
              <NativeFormRenderer
                assignmentUuid={assignmentUuid}
                assignmentTaskUuid={task.assignment_task_uuid}
                onSubmissionStatusChange={setIsAssignmentSubmitted}
              />
            );
          case "FILE_SUBMISSION":
            return (
              <NativeFileSubmissionRenderer
                assignmentUuid={assignmentUuid}
                assignmentTaskUuid={task.assignment_task_uuid}
                onSubmissionStatusChange={setIsAssignmentSubmitted}
              />
            );
          default:
            return (
              <View
                style={[
                  styles.center,
                  { backgroundColor: Theme.colors.surface },
                ]}
              >
                <Text style={{ color: Theme.colors.textMuted }}>
                  This assignment format ({task.assignment_type}) is currently
                  only supported on the Web platform.
                </Text>
              </View>
            );
        }
      }
      return null;
    }

    return null;
  };

  const handlePayment = async () => {
    if (!selectedProduct || !session || !orgId) return;
    try {
      setIsProcessingPayment(true);
      const redirectUri = encodeURIComponent(
        Linking.createURL(`/course/${fullUuid}?payment=success`),
      );
      const res = await apiRequest(
        `/api/v1/payments/${orgId}/checkout/product/${selectedProduct.id}?redirect_uri=${redirectUri}&currency=${currency}`,
        {
          method: "POST",
          token: session.accessToken,
        },
      );

      if (res.data && res.data.checkout_url) {
        const result = await WebBrowser.openBrowserAsync(res.data.checkout_url);
        // Refresh the page when they return
        Alert.alert(
          "Checking status...",
          "We are refreshing your enrollment status.",
          [
            {
              text: "OK",
              onPress: () => router.replace(`/course/${fullUuid}`),
            },
          ],
        );
      } else {
        Alert.alert("Payment Error", "Could not initialize payment checkout.");
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Payment Error", "Something went wrong.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderLandingView = () => {
    // Generate a sleek dynamic background color based on theme
    const heroBg = isDark ? "#1a1a2e" : "#f0f4f8";

    return (
      <View
        style={[styles.container, { backgroundColor: Theme.colors.background }]}
      >
        <View
          style={[
            styles.header,
            { borderBottomWidth: 0, backgroundColor: heroBg, paddingTop: 60 },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={[styles.landingHero, { backgroundColor: heroBg }]}>
            <Text style={[styles.landingTitle, { color: Theme.colors.text }]}>
              {courseData?.title}
            </Text>
            {courseData?.subtitle && (
              <Text
                style={[
                  styles.landingSubtitle,
                  { color: Theme.colors.textMuted },
                ]}
              >
                {courseData.subtitle}
              </Text>
            )}
          </View>

          <View style={styles.contentWrapper}>
            <View style={styles.currencySection}>
              <Text
                style={[
                  styles.currencyLabel,
                  { color: Theme.colors.textMuted },
                ]}
              >
                Currency
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.currencyScroll}
              >
                {["USD", "NGN", "GHS", "KES", "ZAR", "UGX", "RWF"].map(
                  (currCode) => {
                    if (!exchangeRates[currCode]) return null;
                    const isActive = currency === currCode;
                    return (
                      <TouchableOpacity
                        key={currCode}
                        onPress={() => setCurrency(currCode)}
                        style={[
                          styles.currencyPill,
                          {
                            backgroundColor: isActive
                              ? Theme.colors.primary
                              : Theme.colors.surface,
                          },
                          isActive && styles.currencyPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.currencyPillText,
                            { color: isActive ? "#FFF" : Theme.colors.text },
                          ]}
                        >
                          {currCode}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </ScrollView>
            </View>

            <Text style={[styles.sectionTitle, { color: Theme.colors.text }]}>
              Select your plan
            </Text>

            {paymentsProducts.length === 0 ? (
              <Text style={{ color: Theme.colors.textMuted, marginTop: 16 }}>
                No plans available for this course.
              </Text>
            ) : (
              paymentsProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const price =
                  p.amount === 0
                    ? "Free"
                    : `${currency} ${convertAmount(p.amount).toFixed(2)}`;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.productCard,
                      { backgroundColor: Theme.colors.surface },
                      isSelected && {
                        borderColor: Theme.colors.primary,
                        borderWidth: 2,
                        transform: [{ scale: 1.02 }],
                      },
                      !isSelected && {
                        borderColor: Theme.colors.border,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => setSelectedProduct(p)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={[
                            styles.productName,
                            { color: Theme.colors.text, marginBottom: 0 },
                          ]}
                        >
                          {p.name}
                        </Text>
                        <View
                          style={[
                            styles.badgeContainer,
                            {
                              backgroundColor:
                                p.product_type === "subscription"
                                  ? `${Theme.colors.primary}20`
                                  : `${Theme.colors.text}10`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color:
                                  p.product_type === "subscription"
                                    ? Theme.colors.primary
                                    : Theme.colors.textMuted,
                              },
                            ]}
                          >
                            {p.product_type === "subscription"
                              ? p.interval || "Subscription"
                              : "One Time"}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.productPrice,
                          { color: Theme.colors.primary },
                        ]}
                      >
                        {price}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected
                            ? Theme.colors.primary
                            : Theme.colors.border,
                        },
                        isSelected && { backgroundColor: Theme.colors.primary },
                      ]}
                    >
                      {isSelected && <CheckCircle2 size={16} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[
                styles.enrollBtn,
                {
                  backgroundColor: Theme.colors.primary,
                  opacity: isProcessingPayment || !selectedProduct ? 0.5 : 1,
                },
              ]}
              onPress={handlePayment}
              disabled={!selectedProduct || isProcessingPayment}
              activeOpacity={0.8}
            >
              {isProcessingPayment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.enrollBtnText}>Continue to Checkout</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (isEnrolled === false && courseData?.is_paid) {
    return renderLandingView();
  }

  return (
    <View
      style={[styles.container, { backgroundColor: Theme.colors.background }]}
    >
      <View style={[styles.header, { backgroundColor: Theme.colors.surface }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: Theme.colors.text }]}
          numberOfLines={1}
        >
          {courseData?.title || "Course Viewer"}
        </Text>
      </View>

      <View style={{ width: "100%" }}>{renderActivityContent()}</View>

      <ScrollView style={styles.curriculumContainer}>
        <Text style={[styles.curriculumTitle, { color: Theme.colors.text }]}>
          Curriculum
        </Text>

        {curriculum.map((chapter: any, index: number) => (
          <View
            key={chapter.id || index}
            style={[
              styles.chapterCard,
              { backgroundColor: Theme.colors.surface },
            ]}
          >
            <Text style={[styles.chapterTitle, { color: Theme.colors.text }]}>
              {chapter.title || `Chapter ${index + 1}`}
            </Text>

            {chapter.activities?.map((activity: any, idx: number) => {
              const isActive = activeActivity?.id === activity.id;
              const isCompleted =
                completedActivities.has(
                  activity.activity_uuid?.replace("activity_", ""),
                ) || completedActivities.has(activity.id?.toString());

              return (
                <TouchableOpacity
                  key={activity.id || idx}
                  style={[
                    styles.activityRow,
                    {
                      backgroundColor: isActive
                        ? `${Theme.colors.primary}15`
                        : "transparent",
                    },
                    isActive && {
                      borderColor: Theme.colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    setActiveActivity(activity);
                    if (
                      activity.activity_sub_type === "SUBTYPE_VIDEO_HOSTED" &&
                      activity.content?.filename
                    ) {
                      const baseUrl = getApiUrl().replace(/\/$/, "");
                      setVideoSource(
                        `${baseUrl}/content/orgs/${orgUuid}/courses/${fullUuid}/activities/${activity.activity_uuid}/video/${activity.content.filename}`,
                      );
                    } else if (activity.content?.uri) {
                      setVideoSource(activity.content.uri);
                    } else {
                      setVideoSource(null);
                    }
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} color={Theme.colors.primary} />
                  ) : isActive ? (
                    <PlayCircle
                      size={20}
                      color={Theme.colors.primary}
                      fill={`${Theme.colors.primary}30`}
                    />
                  ) : (
                    <PlayCircle size={20} color={Theme.colors.textMuted} />
                  )}
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={[
                        styles.activityTitle,
                        {
                          color: isActive
                            ? Theme.colors.primary
                            : Theme.colors.text,
                          flex: 1,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {activity.name || activity.title || "Untitled Activity"}
                    </Text>
                    {activity.points ? (
                      <View
                        style={{
                          backgroundColor: Theme.colors.surface,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: Theme.colors.textMuted,
                            fontWeight: "bold",
                          }}
                        >
                          {activity.points} pts
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: Theme.colors.background }}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: Theme.colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Text
                style={{
                  color: Theme.colors.primary,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
            <Text
              style={[styles.modalTitle, { color: Theme.colors.text }]}
              numberOfLines={1}
            >
              {activeActivity?.name || "Reader"}
            </Text>
          </View>

          {renderModalContent()}

          <View
            style={[
              styles.modalFooter,
              {
                borderTopColor: Theme.colors.border,
                backgroundColor: Theme.colors.background,
              },
            ]}
          >
            {(() => {
              const isAssignmentBlock =
                activeActivity?.activity_type === "TYPE_ASSIGNMENT" &&
                assignmentTasks.length > 0;
              const isMarkCompleteDisabled =
                isCompleting ||
                completedActivities.has(
                  activeActivity?.activity_uuid || activeActivity?.id,
                ) ||
                (isAssignmentBlock && !isAssignmentSubmitted);

              return (
                <TouchableOpacity
                  style={[
                    styles.completeBtn,
                    completedActivities.has(
                      activeActivity?.activity_uuid || activeActivity?.id,
                    ) && styles.completedBtn,
                    isMarkCompleteDisabled && { opacity: 0.5 },
                  ]}
                  onPress={markAsComplete}
                  disabled={isMarkCompleteDisabled}
                >
                  <CheckCircle2
                    size={18}
                    color={
                      completedActivities.has(
                        activeActivity?.activity_uuid || activeActivity?.id,
                      )
                        ? Theme.colors.primary
                        : "#FFF"
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.completeBtnText,
                      completedActivities.has(
                        activeActivity?.activity_uuid || activeActivity?.id,
                      ) && { color: Theme.colors.primary },
                    ]}
                  >
                    {isCompleting
                      ? "Saving..."
                      : completedActivities.has(
                            activeActivity?.activity_uuid || activeActivity?.id,
                          )
                        ? "Completed"
                        : "Mark as Complete"}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: "600", flex: 1 },

  // Landing View Styles
  landingHero: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  landingTitle: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
    lineHeight: 40,
  },
  landingSubtitle: { fontSize: 16, lineHeight: 24, opacity: 0.8 },
  contentWrapper: { padding: 24, marginTop: -20 },
  currencySection: { marginBottom: 32 },
  currencyLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  currencyScroll: { paddingRight: 24, gap: 8 },
  currencyPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  currencyPillActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currencyPillText: { fontSize: 14, fontWeight: "700" },
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    flexShrink: 1,
  },
  productPrice: { fontSize: 16, fontWeight: "800" },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  enrollBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  enrollBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  videoPlayer: { width: "100%", aspectRatio: 16 / 9 },
  videoPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    justifyContent: "center",
    alignItems: "center",
  },
  curriculumContainer: { padding: 16 },
  curriculumTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  chapterCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chapterTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityTitle: { fontSize: 14, marginLeft: 12, flex: 1 },
  actionRow: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF", // You can swap with Theme.colors.primary if desired
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  completedBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#007AFF", // Theme.colors.primary
  },
  completeBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  startLessonBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
  },
  startLessonBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    paddingRight: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginRight: 40, // offset for close button to center title
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import { useRouter } from "expo-router";
import {
  Bell,
  MoreVertical,
  Play,
  BookOpen,
  CheckCircle2,
  Clock,
  Activity,
  Calendar,
  Flame,
  Star,
  X,
  CloudOff,
} from "lucide-react-native";
import { useNetwork } from "../../context/NetworkContext";
import {
  getCourseThumbnailMediaDirectory,
  getUserAvatarMediaDirectory,
} from "../../services/media";

export default function HomeScreen() {
  const { Theme, isDark } = useAppTheme();
  const styles = React.useMemo(
    () => makeStyles(Theme, isDark),
    [Theme, isDark],
  );
  const { session } = useAuth();
  const { isConnected } = useNetwork();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [trailRuns, setTrailRuns] = useState<any[]>([]);
  const [stats, setStats] = useState({ enrolled: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [orgUUID, setOrgUUID] = useState<string>("");
  const [courseMetadata, setCourseMetadata] = useState<Record<string, any>>({});
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    async function loadDashboardData() {
      if (!session || !session.accessToken) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      try {
        const orgSlug = session?.orgSlug || "default";

        // 0. Fetch real org context to get correct org_uuid for media URLs
        const orgRes = await apiRequest(`/api/v1/orgs/slug/${orgSlug}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        let fetchedOrgUUID = "";
        let fetchedOrgId = null;
        if (!orgRes.error && orgRes.data) {
          fetchedOrgId = orgRes.data.id;
          fetchedOrgUUID = orgRes.data.org_uuid;
          if (!fetchedOrgUUID.startsWith("org_"))
            fetchedOrgUUID = "org_" + fetchedOrgUUID;
          setOrgUUID(fetchedOrgUUID);
        }

        // 0.5 Fetch user profile to get fresh avatar and user_uuid
        const profileRes = await apiRequest("/api/v1/users/profile", {
          token: session.accessToken,
        });
        if (!profileRes.error && profileRes.data) {
          setUserProfile(profileRes.data);
        }

        // 1. Fetch featured courses
        const coursesRes = await apiRequest(
          `/api/v1/courses/org_slug/${orgSlug}/page/1/limit/10`,
          {
            token: session.accessToken,
          },
        );
        let coursesList: any[] = [];
        if (!coursesRes.error && coursesRes.data) {
          coursesList = Array.isArray(coursesRes.data)
            ? coursesRes.data
            : coursesRes.data.value ||
              coursesRes.data.courses ||
              coursesRes.data.data ||
              [];

          setCourses(coursesList);
        }

        // 2. Fetch user's enrolled trails/progress
        let trailRes: any = null;
        const orgId = session?.user?.orgs?.[0]?.org?.id;
        if (orgId) {
          trailRes = await apiRequest(`/api/v1/trail/org/${orgId}/trail`, {
            token: session.accessToken,
          });
        } else {
          trailRes = await apiRequest(`/api/v1/trail/`, {
            token: session.accessToken,
          });
        }

        if (coursesList.length > 0) {
          setCourses(coursesList);
        }

        if (trailRes && trailRes.data && trailRes.data.runs) {
          const runs = trailRes.data.runs;
          setTrailRuns(runs);
          const completed = runs.filter(
            (r: any) => r.status === "STATUS_COMPLETED",
          ).length;
          setStats({ enrolled: runs.length, completed });
        }

        // Fetch metadata sequentially to prevent connection pool exhaustion (which causes infinite loading when navigating)
        if (coursesList.length > 0) {
          const fetchSequentialMeta = async () => {
            const metaMap: Record<string, any> = {};
            for (const course of coursesList) {
              try {
                const [metaRes, productsRes] = await Promise.all([
                  apiRequest(`/api/v1/courses/${course.course_uuid}/meta`, {
                    token: session.accessToken,
                  }),
                  apiRequest(
                    `/api/v1/payments/${orgId || 1}/courses/${course.id}/products`,
                    { token: session.accessToken },
                  ),
                ]);
                let data = metaRes.data || {};
                if (
                  productsRes.data &&
                  productsRes.data.value &&
                  productsRes.data.value.length > 0
                ) {
                  const product = productsRes.data.value[0];
                  data.priceStr =
                    product.amount === 0 ? "Free" : `$${product.amount}`;
                } else {
                  data.priceStr = course.is_paid ? "Paid" : "Free";
                }
                metaMap[course.course_uuid] = data;

                // Progressively update the UI to avoid blank data while waiting for all
                setCourseMetadata((prev) => ({ ...prev, ...metaMap }));
              } catch (e) {
                // Ignore silent background fail
              }
            }
          };

          fetchSequentialMeta();
        }

        if (trailRes) {
          console.log("tRes exists, data:", trailRes.data);
        }
      } catch (error) {
        if (__DEV__) {
          console.log("Home Data Fetch Error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [session, session?.accessToken]);

  const userName = userProfile?.first_name
    ? `${userProfile.first_name}`
    : session?.user?.first_name
      ? `${session.user.first_name}`
      : session?.user?.email?.split("@")[0] || "Learner";

  const rawProfileImage =
    userProfile?.avatar_image ||
    userProfile?.avatar_url ||
    session?.user?.avatar_url ||
    session?.user?.profile_picture ||
    null;
  const profileImage = getUserAvatarMediaDirectory(
    String(userProfile?.user_uuid || session?.user?.id || ""),
    rawProfileImage || "",
  );

  // Find the most recent active course for the "Continue Learning" section
  const inProgressCourse = trailRuns.find(
    (r: any) => r.status === "STATUS_IN_PROGRESS",
  );
  let continueCourseTitle = "";
  let continueCourseSubtitle = "";
  let progressText = "";
  let progressPercent = 0;
  let continueThumbnail = null;
  let showContinueLearning = !!inProgressCourse;

  if (showContinueLearning && inProgressCourse) {
    continueCourseTitle =
      inProgressCourse.course?.title ||
      inProgressCourse.course?.name ||
      "Untitled Course";
    continueCourseSubtitle =
      inProgressCourse.course?.description ||
      inProgressCourse.course?.about ||
      "";
    const completedSteps = inProgressCourse.steps
      ? inProgressCourse.steps.filter((s: any) => s.complete).length
      : 0;
    const totalSteps = inProgressCourse.course_total_steps || 1;
    progressPercent = Math.min(
      Math.round((completedSteps / totalSteps) * 100),
      100,
    );
    progressText = `${completedSteps} of ${totalSteps} lessons completed`;

    // Use fetched real orgUUID from state
    let continueOrgUUID = orgUUID || "org_4d6e29fe-fbd8-4a88-8e53-dca329fff7e2";
    if (!continueOrgUUID.startsWith("org_"))
      continueOrgUUID = "org_" + continueOrgUUID;

    continueThumbnail = getCourseThumbnailMediaDirectory(
      continueOrgUUID,
      inProgressCourse.course?.course_uuid || "",
      inProgressCourse.course?.thumbnail_image || "",
    );
  }

  // Calculate average progress across all runs
  const totalProgressSum = trailRuns.reduce((sum, r) => {
    let courseProgress = 0;
    if (r.status === "STATUS_COMPLETED") {
      courseProgress = 1;
    } else {
      const completed = r.steps
        ? r.steps.filter((s: any) => s.complete).length
        : 0;
      const total = r.course_total_steps || 1;
      courseProgress = completed / total;
    }
    return sum + courseProgress;
  }, 0);
  const averageProgress =
    trailRuns.length > 0
      ? Math.round((totalProgressSum / trailRuns.length) * 100)
      : 0;

  // Recent Activity Calculation
  const recentActivityRuns = [...trailRuns]
    .filter((r) => r.update_date)
    .sort(
      (a, b) =>
        new Date(b.update_date).getTime() - new Date(a.update_date).getTime(),
    )
    .slice(0, 2);

  // Upcoming Deadlines Calculation
  const upcomingDeadlines = [...trailRuns]
    .filter(
      (r) => r.cohort_start_date && new Date(r.cohort_start_date) > new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.cohort_start_date).getTime() -
        new Date(b.cohort_start_date).getTime(),
    )
    .slice(0, 2);

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!isConnected && courses.length === 0) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: Theme.colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <CloudOff
          size={64}
          color={Theme.colors.textMuted}
          style={{ marginBottom: 24 }}
        />
        <Text
          style={{
            color: Theme.colors.text,
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          You are offline
        </Text>
        <Text
          style={{
            color: Theme.colors.textMuted,
            textAlign: "center",
            paddingHorizontal: 40,
            fontSize: 16,
            lineHeight: 24,
          }}
        >
          Please check your internet connection to load courses and continue
          learning.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNav}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/aina_logo.png")}
              style={[styles.headerLogo, isDark && { tintColor: "#ffffff" }]}
              resizeMode="contain"
            />
          </View>
          <View style={styles.topNavRight}>
            <TouchableOpacity
              style={styles.bellIcon}
              onPress={() => router.push("/user-account/notifications")}
            >
              <Bell size={24} color={Theme.colors.text} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile")}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Welcome back, {userName} 👋</Text>
          <Text style={styles.greetingSubtitle}>
            Let's continue your learning journey
          </Text>

          <View style={styles.pillsRow}>
            <View style={styles.pillBlue}>
              <Text style={styles.pillTextBlue}>AINA Student</Text>
            </View>
            <View style={styles.pillGreen}>
              <Text style={styles.pillTextGreen}>Earn $4 / Referral</Text>
            </View>
          </View>
        </View>

        {/* Continue Learning - Only show if there's an active course */}
        {showContinueLearning && (
          <View style={styles.continueCard}>
            <View style={styles.continueHeaderRow}>
              <Text style={styles.continueLabel}>CONTINUE LEARNING</Text>
              <TouchableOpacity>
                <MoreVertical size={20} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.continueContentRow}>
              <View style={styles.continueIconWrapper}>
                {continueThumbnail && !imageErrors["continue"] ? (
                  <Image
                    source={{ uri: continueThumbnail }}
                    style={styles.continueThumbnail}
                    onError={(e) => {
                      console.warn(
                        "Continue image load error:",
                        continueThumbnail,
                      );
                      setImageErrors((prev) => ({ ...prev, continue: true }));
                    }}
                  />
                ) : (
                  <View style={styles.continueThumbnailFallback}>
                    <Text
                      style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}
                    >
                      AINA
                    </Text>
                  </View>
                )}
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>
                    {progressPercent}%
                  </Text>
                </View>
              </View>

              <View style={styles.continueTextWrapper}>
                <Text style={styles.continueCourseTitle} numberOfLines={1}>
                  {continueCourseTitle}
                </Text>
                <Text style={styles.continueCourseSubtitle} numberOfLines={1}>
                  {continueCourseSubtitle}
                </Text>

                <Text style={styles.progressText}>{progressText}</Text>

                <View style={styles.continueFooterRow}>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%` },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.resumeButton}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (inProgressCourse?.course?.course_uuid) {
                        const cleanUuid =
                          inProgressCourse.course.course_uuid.replace(
                            "course_",
                            "",
                          );
                        router.push(`/course/${cleanUuid}`);
                      }
                    }}
                  >
                    <Play size={14} fill="#ffffff" color="#ffffff" />
                    <Text style={styles.resumeButtonText}>Resume</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Comprehensive Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapperBlue}>
              <BookOpen size={20} color={Theme.colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.enrolled}</Text>
            <Text style={styles.statLabelTop}>Courses</Text>
            <Text style={styles.statLabelBottom}>Enrolled</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapperGreen}>
              <CheckCircle2 size={20} color={Theme.colors.success} />
            </View>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabelTop}>Certificates</Text>
            <Text style={styles.statLabelBottom}>Earned</Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { marginTop: -4 }]}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapperPurple}>
              <Clock size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.statNumber}>12h</Text>
            <Text style={styles.statLabelTop}>Time Spent</Text>
            <Text style={styles.statLabelBottom}>Learning</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapperOrange}>
              <Activity size={20} color="#f97316" />
            </View>
            <Text style={styles.statNumber}>{averageProgress}%</Text>
            <Text style={styles.statLabelTop}>Average</Text>
            <Text style={styles.statLabelBottom}>Progress</Text>
          </View>
        </View>

        {/* Featured Courses */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Courses</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Theme.colors.primary}
            style={{ marginTop: 24, marginBottom: 40 }}
          />
        ) : courses.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={36} color={Theme.colors.textDim} />
            <Text style={styles.emptyTitle}>No Courses Available Yet</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
            snapToInterval={280 + Theme.spacing.md}
            decelerationRate="fast"
          >
            {courses.map((course: any, idx: number) => {
              // Check if enrolled
              const enrolledRun = trailRuns.find(
                (r: any) => r.course_id === course.id,
              );
              let courseProgress = 0;
              if (enrolledRun) {
                if (enrolledRun.status === "STATUS_COMPLETED") {
                  courseProgress = 100;
                } else {
                  const completedSteps = enrolledRun.steps
                    ? enrolledRun.steps.filter((s: any) => s.complete).length
                    : 0;
                  const totalSteps = enrolledRun.course_total_steps || 1;
                  courseProgress = Math.min(
                    Math.round((completedSteps / totalSteps) * 100),
                    100,
                  );
                }
              }

              let lessonCount = 0;
              const courseMeta = courseMetadata[course.course_uuid] || course;
              if (courseMeta.chapters) {
                lessonCount = courseMeta.chapters.reduce(
                  (total: number, chapter: any) =>
                    total + (chapter.activities?.length || 0),
                  0,
                );
              }
              const durationHours = Math.floor((lessonCount * 15) / 60);
              const durationMins = (lessonCount * 15) % 60;
              const durationStr = `${durationHours}h ${durationMins}m`;

              let cardOrgUUID =
                orgUUID || "org_4d6e29fe-fbd8-4a88-8e53-dca329fff7e2";
              if (!cardOrgUUID.startsWith("org_"))
                cardOrgUUID = "org_" + cardOrgUUID;

              const thumbnailUrl = getCourseThumbnailMediaDirectory(
                cardOrgUUID,
                course.course_uuid || "",
                course.thumbnail_image || "",
              );

              return (
                <View
                  key={course.id || course.course_uuid || idx}
                  style={styles.horizontalCourseCard}
                >
                  <View style={styles.horizontalImageWrapper}>
                    {thumbnailUrl && !imageErrors[course.course_uuid] ? (
                      <Image
                        source={{ uri: thumbnailUrl }}
                        style={styles.horizontalImage}
                        resizeMode="cover"
                        onError={(e) => {
                          console.warn(
                            "Featured image load error:",
                            thumbnailUrl,
                          );
                          setImageErrors((prev) => ({
                            ...prev,
                            [course.course_uuid]: true,
                          }));
                        }}
                      />
                    ) : (
                      <View style={styles.horizontalImageFallback}>
                        <Text
                          style={{ color: "#fff", fontSize: 40, opacity: 0.5 }}
                        >
                          AINA
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.horizontalCardContent}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>Programming</Text>
                      </View>
                      <View style={styles.pricePill}>
                        <Text style={styles.pricePillText}>
                          {courseMeta.priceStr ||
                            (course.is_paid ? "Premium" : "Free")}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={styles.horizontalCourseTitle}
                      numberOfLines={1}
                    >
                      {course.title || course.name || "Untitled Course"}
                    </Text>
                    <Text
                      style={styles.horizontalCourseSubtitle}
                      numberOfLines={2}
                    >
                      {courseMeta.priceStr ||
                        (course.is_paid ? "Paid" : "Free")}{" "}
                      • {courseMeta.chapters?.length || 0} modules
                    </Text>

                    <View style={styles.horizontalCardFooter}>
                      <View style={styles.footerItem}>
                        <BookOpen size={14} color={Theme.colors.textMuted} />
                        <Text style={styles.footerText}>
                          {lessonCount} lessons
                        </Text>
                      </View>
                      <View style={styles.footerItem}>
                        <Clock size={14} color={Theme.colors.textMuted} />
                        <Text style={styles.footerText}>{durationStr}</Text>
                      </View>
                    </View>

                    {/* Progress Bar & Start Learning Button */}
                    <View style={styles.cardActionRow}>
                      {enrolledRun ? (
                        <View style={styles.cardProgressContainer}>
                          <View style={styles.cardProgressBarBg}>
                            <View
                              style={[
                                styles.cardProgressBarFill,
                                { width: `${courseProgress}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.cardProgressText}>
                            {courseProgress}%
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flex: 1 }} />
                      )}
                      <TouchableOpacity
                        style={styles.startLearningBtn}
                        onPress={() => {
                          if (course.course_uuid) {
                            const cleanUuid = course.course_uuid.replace(
                              "course_",
                              "",
                            );
                            router.push(`/course/${cleanUuid}`);
                          }
                        }}
                      >
                        <Text style={styles.startLearningBtnText}>
                          {enrolledRun ? "Resume" : "Start learning"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Upcoming Deadlines Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
        </View>
        {upcomingDeadlines.length > 0 ? (
          upcomingDeadlines.map((run: any) => (
            <View key={`deadline-${run.id}`} style={styles.dynamicListCard}>
              <View style={styles.dynamicListIconWrapper}>
                <Calendar size={20} color={Theme.colors.primary} />
              </View>
              <View style={styles.dynamicListContent}>
                <Text style={styles.dynamicListTitle} numberOfLines={1}>
                  {run.course?.title || run.course?.name || "Untitled Course"}
                </Text>
                <Text style={styles.dynamicListSubtitle}>
                  Starts:{" "}
                  {new Date(run.cohort_start_date).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCardSmall}>
            <Calendar size={24} color={Theme.colors.textDim} />
            <Text style={styles.emptyTitleSmall}>No upcoming deadlines</Text>
            <Text style={styles.emptySubtitleSmall}>
              You're all caught up for now!
            </Text>
          </View>
        )}

        {/* Recent Activity Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        {recentActivityRuns.length > 0 ? (
          recentActivityRuns.map((run: any) => (
            <View key={`activity-${run.id}`} style={styles.dynamicListCard}>
              <View style={styles.dynamicListIconWrapper}>
                <Activity size={20} color={Theme.colors.success} />
              </View>
              <View style={styles.dynamicListContent}>
                <Text style={styles.dynamicListTitle} numberOfLines={1}>
                  {run.course?.title || run.course?.name || "Untitled Course"}
                </Text>
                <Text style={styles.dynamicListSubtitle}>
                  Last active:{" "}
                  {new Date(run.update_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCardSmall}>
            <Activity size={24} color={Theme.colors.textDim} />
            <Text style={styles.emptyTitleSmall}>No recent activity</Text>
            <Text style={styles.emptySubtitleSmall}>
              Start a course to see recent activity here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Theme: any, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Theme.colors.background,
    },
    scrollContent: {
      padding: Theme.spacing.lg,
      paddingBottom: 120,
    },
    // Top Navigation
    topNav: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Theme.spacing.xl,
      paddingTop:
        Platform.OS === "android" ? Theme.spacing.lg : Theme.spacing.sm,
    },
    logoWrapper: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerLogo: {
      width: 120, // Increased size per user request
      height: 48, // Increased size per user request
    },
    topNavRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.md,
    },
    bellIcon: {
      position: "relative",
      marginRight: 4,
    },
    notificationDot: {
      position: "absolute",
      top: 2,
      right: 3,
      width: 8,
      height: 8,
      backgroundColor: Theme.colors.primary,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: "#fafafa",
    },
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Theme.colors.surfaceBorder,
    },
    avatarFallback: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarFallbackText: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "600",
    },

    // Greeting
    greetingSection: {
      marginBottom: Theme.spacing.xl,
    },
    greetingTitle: {
      fontSize: 26,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 4,
      letterSpacing: -0.8,
    },
    greetingSubtitle: {
      fontSize: 16,
      color: Theme.colors.textMuted,
      marginBottom: Theme.spacing.xl,
      fontWeight: "500",
    },
    pillsRow: {
      flexDirection: "row",
      gap: 10,
    },
    pillBlue: {
      borderWidth: 1,
      borderColor: "rgba(37, 99, 235, 0.2)",
      backgroundColor: "rgba(37, 99, 235, 0.05)",
      borderRadius: Theme.borderRadius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pillTextBlue: {
      color: Theme.colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    pillGreen: {
      borderWidth: 1,
      borderColor: "rgba(5, 150, 105, 0.2)",
      backgroundColor: "rgba(5, 150, 105, 0.05)",
      borderRadius: Theme.borderRadius.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    pillTextGreen: {
      color: Theme.colors.success,
      fontSize: 12,
      fontWeight: "600",
    },

    // Continue Learning
    continueCard: {
      backgroundColor: Theme.colors.surface,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.04)",
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.lg,
      marginBottom: Theme.spacing.xl,
      ...Theme.shadows.sm,
    },
    continueHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Theme.spacing.md,
    },
    continueLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: Theme.colors.primary,
      letterSpacing: 1.2,
    },
    continueContentRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    continueIconWrapper: {
      position: "relative",
      marginRight: Theme.spacing.md,
    },
    continueThumbnail: {
      width: 80,
      height: 80,
      borderRadius: Theme.borderRadius.lg,
      backgroundColor: Theme.colors.surfaceBorder,
    },
    continueThumbnailFallback: {
      width: 80,
      height: 80,
      borderRadius: Theme.borderRadius.lg,
      backgroundColor: "#0a192f",
      justifyContent: "center",
      alignItems: "center",
    },
    progressBadge: {
      position: "absolute",
      bottom: -8,
      right: -8,
      backgroundColor: Theme.colors.primary,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 2,
      borderColor: "#f4f8ff",
    },
    progressBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "600",
    },
    continueTextWrapper: {
      flex: 1,
      justifyContent: "space-between",
    },
    continueCourseTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 4,
    },
    continueCourseSubtitle: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      marginBottom: 12,
    },
    progressText: {
      fontSize: 11,
      color: Theme.colors.textMuted,
      marginBottom: 8,
    },
    continueFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressBarBg: {
      flex: 1,
      height: 6,
      backgroundColor: "#cbd5e1",
      borderRadius: 3,
      marginRight: 12,
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: Theme.colors.primary,
      borderRadius: 3,
    },
    resumeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Theme.borderRadius.md,
      gap: 6,
    },
    resumeButtonText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "600",
    },

    // Stats Grid
    statsGrid: {
      flexDirection: "row",
      gap: Theme.spacing.md,
      marginBottom: Theme.spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.lg,
      padding: Theme.spacing.md,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.03)",
      alignItems: "flex-start",
      ...Theme.shadows.sm,
    },
    statIconWrapperBlue: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(0, 87, 255, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Theme.spacing.sm,
    },
    statIconWrapperGreen: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Theme.colors.successBackground,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Theme.spacing.sm,
    },
    statIconWrapperOrange: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(249, 115, 22, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Theme.spacing.sm,
    },
    statIconWrapperPurple: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(139, 92, 246, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Theme.spacing.sm,
    },
    statNumber: {
      fontSize: 26,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    statLabelTop: {
      fontSize: 12,
      color: Theme.colors.text,
      fontWeight: "600",
    },
    statLabelBottom: {
      fontSize: 12,
      color: Theme.colors.textMuted,
    },

    // Featured Courses
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Theme.spacing.md,
      marginTop: Theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    horizontalScrollContent: {
      paddingRight: Theme.spacing.lg,
      gap: Theme.spacing.md,
    },
    horizontalCourseCard: {
      width: 280,
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.03)",
      overflow: "hidden",
      padding: Theme.spacing.sm,
      ...Theme.shadows.sm,
    },
    horizontalImageWrapper: {
      width: "100%",
      height: 140,
      position: "relative",
      backgroundColor: "#0a192f",
      borderRadius: Theme.borderRadius.lg,
      overflow: "hidden",
    },
    horizontalImage: {
      width: "100%",
      height: "100%",
    },
    horizontalImageFallback: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#002663",
    },
    horizontalCardContent: {
      padding: Theme.spacing.md,
    },
    categoryPill: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(37, 99, 235, 0.1)",
      borderRadius: Theme.borderRadius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 8,
    },
    categoryPillText: {
      fontSize: 10,
      fontWeight: "600",
      color: Theme.colors.primary,
    },
    pricePill: {
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      borderRadius: Theme.borderRadius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pricePillText: {
      fontSize: 10,
      fontWeight: "600",
      color: "#16a34a",
    },
    horizontalCourseTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 4,
    },
    horizontalCourseSubtitle: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      lineHeight: 18,
      marginBottom: Theme.spacing.md,
      height: 36,
    },
    horizontalCardFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: Theme.spacing.md,
      marginBottom: Theme.spacing.md,
    },
    footerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    footerText: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      fontWeight: "500",
    },
    cardActionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    cardProgressContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      marginRight: 12,
    },
    cardProgressBarBg: {
      flex: 1,
      height: 4,
      backgroundColor: Theme.colors.surfaceBorder,
      borderRadius: 2,
      marginRight: 8,
    },
    cardProgressBarFill: {
      height: "100%",
      backgroundColor: Theme.colors.primary,
      borderRadius: 2,
    },
    cardProgressText: {
      fontSize: 11,
      fontWeight: "600",
      color: Theme.colors.textMuted,
    },
    startLearningBtn: {
      backgroundColor: Theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: Theme.borderRadius.full,
    },
    startLearningBtnText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },

    // Empty Cards for Missing Sections
    emptyCard: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      marginTop: Theme.spacing.md,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.03)",
      ...Theme.shadows.sm,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      marginTop: Theme.spacing.md,
    },
    emptyCardSmall: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.03)",
      marginBottom: Theme.spacing.md,
      ...Theme.shadows.sm,
    },
    emptyTitleSmall: {
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.text,
      marginTop: Theme.spacing.sm,
      marginBottom: 2,
    },
    emptySubtitleSmall: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      textAlign: "center",
    },

    // Dynamic List Cards
    dynamicListCard: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: Theme.spacing.md,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.03)",
      ...Theme.shadows.sm,
    },
    dynamicListIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: Theme.borderRadius.md,
      backgroundColor: "rgba(0,0,0,0.02)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: Theme.spacing.md,
    },
    dynamicListContent: {
      flex: 1,
    },
    dynamicListTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 4,
    },
    dynamicListSubtitle: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      fontWeight: "500",
    },

    // Modal Styles
    modalOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modalContainer: {
      width: "85%",
      backgroundColor: "#fff",
      borderRadius: Theme.borderRadius.xl,
      padding: Theme.spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Theme.spacing.lg,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: Theme.colors.text,
    },
    modalBody: {
      alignItems: "center",
      paddingVertical: Theme.spacing.md,
      marginBottom: Theme.spacing.lg,
    },
    modalBodyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 8,
    },
    modalBodyText: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
    modalButton: {
      backgroundColor: Theme.colors.primary,
      paddingVertical: 14,
      borderRadius: Theme.borderRadius.lg,
      alignItems: "center",
    },
    modalButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });

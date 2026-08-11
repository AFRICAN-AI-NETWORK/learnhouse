import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { apiRequest } from "../../services/api";
import {
  BookOpen,
  Search,
  Star,
  Clock,
  Bookmark,
  BarChart2,
} from "lucide-react-native";
import { getCourseThumbnailMediaDirectory } from "../../services/media";

const CATEGORIES = ["All", "AI & Data", "Programming", "Business", "Design"];

export default function CoursesScreen() {
  const { Theme, isDark } = useAppTheme();
  const styles = React.useMemo(
    () => makeStyles(Theme, isDark),
    [Theme, isDark],
  );
  const { session } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<any[]>([]);
  const [trailRuns, setTrailRuns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [orgUUID, setOrgUUID] = useState<string>("");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [courseMetadata, setCourseMetadata] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchCatalogData() {
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
        if (!orgRes.error && orgRes.data) {
          fetchedOrgUUID = orgRes.data.org_uuid;
          if (!fetchedOrgUUID.startsWith("org_"))
            fetchedOrgUUID = "org_" + fetchedOrgUUID;
          setOrgUUID(fetchedOrgUUID);
        }

        // 1. Fetch catalog courses
        const coursesRes = await apiRequest(
          `/api/v1/courses/org_slug/${orgSlug}/page/1/limit/50`,
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

        if (trailRes && trailRes.data && trailRes.data.runs) {
          setTrailRuns(trailRes.data.runs);
        }

        // Fetch metadata non-blocking (moved after trails so it doesn't bottleneck the queue)
        if (coursesList.length > 0) {
          Promise.all(
            coursesList.map(async (course: any) => {
              try {
                const [metaRes, productsRes] = await Promise.all([
                  apiRequest(`/api/v1/courses/${course.course_uuid}/meta`, {
                    token: session.accessToken,
                  }),
                  apiRequest(
                    `/api/v1/payments/${session?.user?.orgs?.[0]?.org?.id || 1}/courses/${course.id}/products`,
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
                return { uuid: course.course_uuid, data };
              } catch (e) {}
              return null;
            }),
          ).then((results) => {
            const metaMap: Record<string, any> = {};
            results.forEach((res) => {
              if (res) metaMap[res.uuid] = res.data;
            });
            setCourseMetadata(metaMap);
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.log("Courses Tab Error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCatalogData();
  }, [session, session?.accessToken]);

  // Filtering Logic
  const filteredCourses = courses.filter((c: any) => {
    const title = (c.title || c.name || "").toLowerCase();

    // 1. Search Query
    if (searchQuery && !title.includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 2. Category logic (local fallback)
    if (selectedCategory !== "All") {
      const isAI =
        selectedCategory === "AI & Data" &&
        (title.includes("ai") ||
          title.includes("data") ||
          title.includes("machine learning"));
      const isProgramming =
        selectedCategory === "Programming" &&
        (title.includes("programming") ||
          title.includes("code") ||
          title.includes("developer"));
      const isBusiness =
        selectedCategory === "Business" &&
        (title.includes("business") ||
          title.includes("market") ||
          title.includes("sales") ||
          title.includes("manage"));
      const isDesign =
        selectedCategory === "Design" &&
        (title.includes("design") ||
          title.includes("ui") ||
          title.includes("ux") ||
          title.includes("figma"));

      if (!isAI && !isProgramming && !isBusiness && !isDesign) {
        return false;
      }
    }

    return true;
  });

  // Continue Learning Card Logic
  const inProgressCourse = trailRuns.find(
    (r: any) => r.status === "STATUS_IN_PROGRESS",
  );
  let continueCourseTitle = "";
  let continueCourseSubtitle = "";
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

    let continueOrgUUID = orgUUID || "org_4d6e29fe-fbd8-4a88-8e53-dca329fff7e2";
    if (!continueOrgUUID.startsWith("org_"))
      continueOrgUUID = "org_" + continueOrgUUID;

    continueThumbnail = getCourseThumbnailMediaDirectory(
      continueOrgUUID,
      inProgressCourse.course?.course_uuid || "",
      inProgressCourse.course?.thumbnail_image || "",
    );
  }

  // Helper to format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Courses</Text>
          <Text style={styles.headerSubtitle}>
            Explore and enroll in interactive learning paths.
          </Text>

          <View style={styles.searchWrapper}>
            <Search
              size={18}
              color={Theme.colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses..."
              placeholderTextColor={Theme.colors.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* 2. Category Segmenter (Sticky) */}
        <View style={styles.categoryWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    isActive && styles.categoryPillActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isActive && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.contentContainer}>
          {/* 3. Hero Section (Invest in your future) */}
          <View style={styles.heroBanner}>
            <View style={styles.heroBannerContent}>
              <View style={styles.heroIconBadge}>
                <Star size={16} color={Theme.colors.primary} />
              </View>
              <Text style={styles.heroBannerTitle}>Invest in your future</Text>
              <Text style={styles.heroBannerSubtitle}>
                Learn in-demand skills and build real-world projects.
              </Text>
            </View>
            <View style={styles.heroBannerImageWrapper}>
              <Image
                source={require("../../assets/learning_hero.png")}
                style={styles.heroBannerImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* 4. Popular Courses Title */}
          <Text style={styles.sectionTitle}>Popular Courses</Text>

          {/* Course List (Horizontal Cards) */}
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={Theme.colors.primary}
              style={{ marginTop: 32 }}
            />
          ) : filteredCourses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={40} color={Theme.colors.textDim} />
              <Text style={styles.emptyText}>No matching courses found</Text>
            </View>
          ) : (
            filteredCourses.map((course: any, idx: number) => {
              const thumbnailUri = getCourseThumbnailMediaDirectory(
                orgUUID || "org_4d6e29fe-fbd8-4a88-8e53-dca329fff7e2",
                course.course_uuid || "",
                course.thumbnail_image || "",
              );
              const hasError = imageErrors[`course_${course.course_uuid}`];

              // Meta logic for lessons and duration
              let lessonCount = 0;
              const courseMeta = courseMetadata[course.course_uuid] || course;
              if (courseMeta.chapters) {
                lessonCount = courseMeta.chapters.reduce(
                  (total: number, chapter: any) =>
                    total + (chapter.activities?.length || 0),
                  0,
                );
              }

              // Price logic
              const priceStr =
                courseMeta.priceStr || (course.is_paid ? "Premium" : "Free");
              const durationHours = Math.floor((lessonCount * 15) / 60);
              const durationMins = (lessonCount * 15) % 60;
              const durationStr = `${durationHours}h ${durationMins}m`;

              // Try to infer a category for the pill
              let cardCategory = "AI & Data";
              const t = (course.title || "").toLowerCase();
              if (
                t.includes("mobile") ||
                t.includes("flutter") ||
                t.includes("react native")
              )
                cardCategory = "Mobile";
              else if (t.includes("business")) cardCategory = "Business";
              else if (t.includes("design")) cardCategory = "Design";
              else if (t.includes("programming") || t.includes("code"))
                cardCategory = "Programming";

              return (
                <TouchableOpacity
                  key={course.id || course.course_uuid || idx}
                  style={styles.courseCardHorizontal}
                  activeOpacity={0.8}
                >
                  <View style={styles.courseCardLeft}>
                    {!hasError ? (
                      <Image
                        source={{ uri: thumbnailUri || "" }}
                        style={styles.courseCardImage}
                        onError={() =>
                          setImageErrors((prev) => ({
                            ...prev,
                            [`course_${course.course_uuid}`]: true,
                          }))
                        }
                      />
                    ) : (
                      <View style={styles.courseCardImageFallback}>
                        <BookOpen size={32} color="#ffffff" />
                      </View>
                    )}
                  </View>

                  <View style={styles.courseCardRight}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardCategoryPill}>
                        <Text style={styles.cardCategoryText}>
                          {cardCategory}
                        </Text>
                      </View>
                      <View style={styles.pricePill}>
                        <Text style={styles.pricePillText}>{priceStr}</Text>
                      </View>
                    </View>

                    <Text style={styles.courseCardTitle} numberOfLines={2}>
                      {course.title || course.name || "Untitled Course"}
                    </Text>
                    <Text style={styles.courseCardDesc} numberOfLines={2}>
                      {course.description ||
                        course.about ||
                        "Learn how to automate workflows using AI tools and platforms."}
                    </Text>

                    <View style={styles.courseCardFooter}>
                      <View style={styles.footerMetrics}>
                        <View style={styles.footerMetric}>
                          <BookOpen size={14} color={Theme.colors.textMuted} />
                          <Text style={styles.footerMetricText}>
                            {lessonCount} lessons
                          </Text>
                        </View>
                        <View style={styles.footerMetric}>
                          <Clock size={14} color={Theme.colors.textMuted} />
                          <Text style={styles.footerMetricText}>
                            {durationStr}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* 5. Continue Learning (Moved to bottom) */}
          {showContinueLearning && (
            <View style={styles.continueSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Continue Learning</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.courseCardHorizontal}>
                <View style={styles.courseCardLeft}>
                  {continueThumbnail && !imageErrors["continue"] ? (
                    <Image
                      source={{ uri: continueThumbnail }}
                      style={styles.courseCardImage}
                      onError={() =>
                        setImageErrors((prev) => ({ ...prev, continue: true }))
                      }
                    />
                  ) : (
                    <View style={styles.courseCardImageFallback}>
                      <BookOpen size={32} color="#ffffff" />
                    </View>
                  )}
                </View>

                <View style={styles.courseCardRight}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.courseCardTitle} numberOfLines={1}>
                      {continueCourseTitle}
                    </Text>
                    <View style={styles.progressPercentPill}>
                      <Text style={styles.progressPercentText}>
                        {progressPercent}%
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.courseCardDesc} numberOfLines={2}>
                    {continueCourseSubtitle}
                  </Text>

                  <View style={styles.continueCardFooter}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progressPercent}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
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
    headerSection: {
      paddingHorizontal: Theme.spacing.lg,
      paddingTop: Theme.spacing.xl,
      paddingBottom: Theme.spacing.md,
      backgroundColor: Theme.colors.surface,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: Theme.colors.text,
      letterSpacing: -0.8,
      marginBottom: 6,
    },
    headerSubtitle: {
      fontSize: 15,
      color: Theme.colors.textMuted,
      fontWeight: "500",
      marginBottom: Theme.spacing.lg,
    },
    searchWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.03)",
      borderRadius: Theme.borderRadius.md,
      paddingHorizontal: Theme.spacing.md,
      height: 48,
    },
    searchIcon: {
      marginRight: Theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: Theme.colors.text,
    },
    categoryWrapper: {
      backgroundColor: Theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.03)",
      paddingVertical: Theme.spacing.sm,
      zIndex: 10,
    },
    categoryScroll: {
      paddingHorizontal: Theme.spacing.lg,
      gap: Theme.spacing.sm,
    },
    categoryPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: Theme.borderRadius.full,
      backgroundColor: Theme.colors.background,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.05)",
    },
    categoryPillActive: {
      backgroundColor: Theme.colors.primary,
      borderColor: Theme.colors.primary,
    },
    categoryPillText: {
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.textMuted,
    },
    categoryPillTextActive: {
      color: "#ffffff",
    },
    contentContainer: {
      padding: Theme.spacing.lg,
      paddingBottom: Theme.spacing.xxl,
    },

    // Hero Banner matching the design
    heroBanner: {
      backgroundColor: isDark ? Theme.colors.surface : "#f3f6fb",
      borderRadius: Theme.borderRadius.xl,
      flexDirection: "row",
      overflow: "hidden",
      marginBottom: Theme.spacing.xl,
      borderWidth: 1,
      borderColor: isDark ? Theme.colors.border : "rgba(0,0,0,0.04)",
    },
    heroBannerContent: {
      flex: 1,
      padding: Theme.spacing.lg,
      justifyContent: "center",
    },
    heroIconBadge: {
      backgroundColor: isDark ? Theme.colors.background : "#ffffff",
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Theme.spacing.md,
      borderWidth: 1,
      borderColor: isDark ? Theme.colors.border : "rgba(0,0,0,0.05)",
      ...Theme.shadows.sm,
    },
    heroBannerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: Theme.colors.text,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    heroBannerSubtitle: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      lineHeight: 20,
      paddingRight: 10,
    },
    heroBannerImageWrapper: {
      width: 130,
      justifyContent: "center",
      alignItems: "flex-end",
    },
    heroBannerImage: {
      width: 155,
      height: 155,
      marginRight: 0,
      marginTop: 35,
    },

    // Section Headers
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: Theme.spacing.md,
      marginTop: Theme.spacing.md,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      letterSpacing: -0.5,
      marginBottom: 0,
    },
    viewAllText: {
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.primary,
    },

    // Horizontal Course Cards matching the design
    courseCardHorizontal: {
      backgroundColor: Theme.colors.surface,
      borderRadius: Theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.05)",
      marginBottom: Theme.spacing.md,
      flexDirection: "row",
      padding: Theme.spacing.sm,
      ...Theme.shadows.sm,
    },
    courseCardLeft: {
      width: 140,
      borderRadius: Theme.borderRadius.lg,
      overflow: "hidden",
      backgroundColor: "#0a192f",
    },
    courseCardImage: {
      width: "100%",
      height: "100%",
    },
    courseCardImageFallback: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(37, 99, 235, 0.8)",
    },
    courseCardRight: {
      flex: 1,
      padding: Theme.spacing.md,
      justifyContent: "space-between",
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    cardCategoryPill: {
      backgroundColor: "rgba(37, 99, 235, 0.08)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Theme.borderRadius.full,
    },
    cardCategoryText: {
      fontSize: 10,
      fontWeight: "600",
      color: Theme.colors.primary,
    },
    pricePill: {
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Theme.borderRadius.full,
    },
    pricePillText: {
      fontSize: 10,
      fontWeight: "600",
      color: "#16a34a",
    },
    courseCardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    courseCardDesc: {
      fontSize: 12,
      color: Theme.colors.textMuted,
      lineHeight: 16,
      marginBottom: 8,
    },
    courseCardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerMetrics: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    footerMetric: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    footerMetricText: {
      fontSize: 11,
      color: Theme.colors.textMuted,
      fontWeight: "500",
    },
    coursePriceText: {
      fontSize: 13,
      fontWeight: "600",
      color: Theme.colors.primary,
    },

    continueSection: {
      marginTop: 0,
    },
    progressPercentPill: {
      backgroundColor: "rgba(37, 99, 235, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Theme.borderRadius.full,
    },
    progressPercentText: {
      fontSize: 11,
      fontWeight: "700",
      color: Theme.colors.primary,
    },
    continueCardFooter: {
      marginTop: 8,
      paddingRight: Theme.spacing.md,
    },
    progressBarBg: {
      width: "100%",
      height: 6,
      backgroundColor: Theme.colors.surfaceBorder,
      borderRadius: 3,
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: Theme.colors.primary,
      borderRadius: 3,
    },

    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: Theme.spacing.xxl,
    },
    emptyText: {
      fontSize: 14,
      color: Theme.colors.textMuted,
      marginTop: Theme.spacing.md,
    },
  });

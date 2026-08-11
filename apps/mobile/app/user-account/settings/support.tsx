import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../../context/ThemeContext";
import { ArrowLeft, Mail, ChevronDown, ChevronUp } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

const FAQS = [
  {
    question: "Do I need prior coding experience?",
    answer:
      "No, our foundational tracks are designed for absolute beginners. We start from the basics and gradually move to advanced concepts.",
  },
  {
    question: "Are the programs fully online?",
    answer:
      "Yes, all our programs are 100% online, combining self-paced learning modules with live cohort-based sessions.",
  },
  {
    question: "How do the internship opportunities work?",
    answer:
      "Upon successful completion of the core tracks and capstone projects, eligible students are matched with our partner organizations for practical internship experience.",
  },
  {
    question: "Is there a certificate upon completion?",
    answer:
      "Yes! You will receive a verifiable digital certificate upon completing your track, which you can add to your resume and LinkedIn profile.",
  },
  {
    question: "How does the laptop giveaway work?",
    answer:
      "We provide laptops to outstanding students who meet specific academic and participation requirements during the foundational stages of the premium programs.",
  },
];

export default function SupportScreen() {
  const { Theme } = useAppTheme();
  const styles = React.useMemo(() => makeStyles(Theme), [Theme]);
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleWhatsApp = async () => {
    const url = "whatsapp://send?phone=+2349073166932";
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "WhatsApp Not Found",
          "It seems WhatsApp is not installed on this device or emulator. Please install it to use this feature.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open in Browser",
              onPress: () => Linking.openURL("https://wa.me/2349073166932"),
            },
          ],
        );
      }
    } catch (error) {
      console.warn("Error opening WhatsApp:", error);
      Linking.openURL("https://wa.me/2349073166932");
    }
  };

  const handleEmail = () => {
    Linking.openURL("mailto:support@africanainetwork.com").catch(() => {
      // Fallback just in case
      console.warn("Mail client not found");
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Contact Us Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionSubtitle}>
            Need immediate assistance? Reach out directly.
          </Text>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <View style={[styles.iconWrapper, { backgroundColor: "#25D366" }]}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  fill="#ffffff"
                />
              </Svg>
            </View>
            <View style={styles.contactTextWrapper}>
              <Text style={styles.contactTitle}>WhatsApp Support</Text>
              <Text style={styles.contactSubtitle}>Fastest response time</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={handleEmail}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: "rgba(37, 99, 235, 0.1)" },
              ]}
            >
              <Mail size={22} color={Theme.colors.primary} />
            </View>
            <View style={styles.contactTextWrapper}>
              <Text style={styles.contactTitle}>Email Us</Text>
              <Text style={styles.contactSubtitle}>
                support@africanainetwork.com
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* FAQs Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>
            Common questions from our community.
          </Text>

          <View style={styles.faqList}>
            {FAQS.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <View key={index} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => setOpenIndex(isOpen ? null : index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.faqQuestion,
                        isOpen && { color: Theme.colors.primary },
                      ]}
                    >
                      {faq.question}
                    </Text>
                    {isOpen ? (
                      <ChevronUp size={20} color={Theme.colors.primary} />
                    ) : (
                      <ChevronDown size={20} color={Theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.faqBody}>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
    scrollContent: {
      padding: Theme.spacing.lg,
      paddingBottom: 40,
    },
    sectionContainer: {
      marginBottom: 32,
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
      marginBottom: 16,
    },

    // Contact Cards
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Theme.colors.surface,
      padding: 16,
      borderRadius: Theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      marginBottom: 12,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    contactTextWrapper: {
      flex: 1,
    },
    contactTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: Theme.colors.text,
      marginBottom: 2,
    },
    contactSubtitle: {
      fontSize: 13,
      color: Theme.colors.textMuted,
    },

    // FAQs
    faqList: {
      marginTop: 8,
    },
    faqItem: {
      backgroundColor: Theme.colors.surface,
      borderWidth: 1,
      borderColor: Theme.colors.surfaceBorder,
      borderRadius: Theme.borderRadius.xl,
      marginBottom: 12,
      overflow: "hidden",
    },
    faqHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
    },
    faqQuestion: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: Theme.colors.text,
      paddingRight: 16,
    },
    faqBody: {
      padding: 16,
      paddingTop: 0,
    },
    faqAnswer: {
      fontSize: 13,
      color: Theme.colors.textMuted,
      lineHeight: 20,
    },
  });

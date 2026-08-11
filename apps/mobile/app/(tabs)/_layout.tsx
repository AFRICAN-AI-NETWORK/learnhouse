import React from "react";
import { Tabs } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import {
  Home,
  BookOpen,
  Gift,
  TrendingUp,
  Handshake,
  User,
} from "lucide-react-native";

export default function TabsLayout() {
  const { Theme } = useAppTheme();
  const { session, isLoading } = useAuth();
  const isMarketer = session?.user?.is_marketer;
  const isPartner = session?.user?.is_partner;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textDim,
        tabBarStyle: {
          backgroundColor: Theme.colors.surface,
          borderTopColor: Theme.colors.surfaceBorder,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="referral"
        options={{
          title: "Earn $4",
          href: isMarketer || isPartner ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Gift size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketer"
        options={{
          title: "Marketer",
          href: isMarketer ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="partner"
        options={{
          title: "Partner",
          href: isPartner ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Handshake size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User size={size || 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

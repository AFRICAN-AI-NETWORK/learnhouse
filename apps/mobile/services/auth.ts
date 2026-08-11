import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "learnhouse_access_token";
const REFRESH_TOKEN_KEY = "learnhouse_refresh_token";
const USER_KEY = "learnhouse_user_data";
const ORG_KEY = "learnhouse_org_slug";

export interface UserSession {
  accessToken: string;
  refreshToken?: string;
  orgSlug: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    is_admin?: boolean;
    is_marketer?: boolean;
    is_partner?: boolean;
    is_student?: boolean;
    referral_code?: string;
    avatar_url?: string;
    profile_picture?: string;
    orgs?: any[];
  };
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return await AsyncStorage.getItem(key);
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return await AsyncStorage.getItem(key);
    }
  }
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  }
}

export async function saveSession(session: UserSession): Promise<void> {
  await setItem(TOKEN_KEY, session.accessToken);
  if (session.refreshToken) {
    await setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  }
  await setItem(ORG_KEY, session.orgSlug);
  await setItem(USER_KEY, JSON.stringify(session.user));
}

export async function getSession(): Promise<UserSession | null> {
  const token = await getItem(TOKEN_KEY);
  const orgSlug = await getItem(ORG_KEY);
  const userJson = await getItem(USER_KEY);
  const refreshToken = await getItem(REFRESH_TOKEN_KEY);

  if (!token || !orgSlug || !userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson);
    return {
      accessToken: token,
      refreshToken: refreshToken || undefined,
      orgSlug,
      user,
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await removeItem(TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
  await removeItem(USER_KEY);
  await removeItem(ORG_KEY);
}

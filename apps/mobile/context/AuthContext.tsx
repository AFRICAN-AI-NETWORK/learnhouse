import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSession,
  saveSession,
  clearSession,
  UserSession,
} from "../services/auth";
import { apiRequest } from "../services/api";

interface AuthContextType {
  session: UserSession | null;
  isLoading: boolean;
  login: (
    orgSlug: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; user?: any }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateSession: (updates: Partial<UserSession>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  refreshSession: async () => {},
  updateSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    try {
      const stored = await getSession();
      setSession(stored);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const appState = useRef(AppState.currentState);
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    loadSession();

    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App has come to the foreground
          const lastActiveStr = await AsyncStorage.getItem(
            "learnhouse_mobile_last_active",
          );
          if (lastActiveStr) {
            const lastActive = parseInt(lastActiveStr, 10);
            if (Date.now() - lastActive >= INACTIVITY_TIMEOUT) {
              await clearSession();
              setSession(null);
            }
          }
        } else if (nextAppState.match(/inactive|background/)) {
          // App goes to background
          await AsyncStorage.setItem(
            "learnhouse_mobile_last_active",
            Date.now().toString(),
          );
        }
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const updateSession = async (updates: Partial<UserSession>) => {
    if (!session) return;
    const newSession = {
      ...session,
      ...updates,
      user: {
        ...(session.user || {}),
        ...(updates.user || {}),
      },
    };
    await saveSession(newSession);
    setSession(newSession);
  };

  const login = async (orgSlug: string, email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email.trim());
    formData.append("password", password);

    const res = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (res.error) {
      return {
        success: false,
        error: typeof res.error === "string" ? res.error : "Login failed",
      };
    }

    const { user } = res.data;
    const access_token = res.data.tokens?.access_token || res.data.access_token;
    const refresh_token =
      res.data.tokens?.refresh_token || res.data.refresh_token;

    if (!access_token) {
      return { success: false, error: "Token missing from response" };
    }

    // Fetch the full user session to get roles and organizations
    const sessionRes = await apiRequest("/api/v1/users/session", {
      method: "GET",
      token: access_token,
    });

    let finalUser = {
      ...user,
      id: user?.id || user?.user_uuid,
      email: user?.email || email,
    };

    if (!sessionRes.error && sessionRes.data) {
      finalUser = {
        ...finalUser,
        roles: sessionRes.data.roles,
        orgs: sessionRes.data.roles?.map((r: any) => ({
          ...r.org,
          role: r.role?.name || r.role?.id || r.role,
        })),
      };
    }

    const newSession: UserSession = {
      accessToken: access_token,
      refreshToken: refresh_token,
      orgSlug,
      user: finalUser,
    };

    await saveSession(newSession);
    setSession(newSession);
    return { success: true, user: newSession.user };
  };

  const logout = async () => {
    await clearSession();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        login,
        logout,
        refreshSession: loadSession,
        updateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

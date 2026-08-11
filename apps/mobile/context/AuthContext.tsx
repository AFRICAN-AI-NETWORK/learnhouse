import React, { createContext, useContext, useState, useEffect } from "react";
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

  useEffect(() => {
    loadSession();
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

    const newSession: UserSession = {
      accessToken: access_token,
      refreshToken: refresh_token,
      orgSlug,
      user: {
        ...user,
        id: user?.id || user?.user_uuid,
        email: user?.email || email,
      },
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

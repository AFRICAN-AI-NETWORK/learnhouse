import { Platform } from "react-native";

let customApiUrl: string | null = null;

export const setApiUrl = (url: string) => {
  customApiUrl = url;
};

export const getApiUrl = () => {
  if (customApiUrl) return customApiUrl;
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "web") return "http://localhost:8000";
  return "http://10.0.2.2:8000"; // Android emulator default
};

export interface ApiOptions extends Omit<RequestInit, "body"> {
  token?: string;
  body?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<{ data?: T; error?: string }> {
  try {
    const baseUrl = getApiUrl();
    const formattedEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;
    const url = `${baseUrl.replace(/\/$/, "")}${formattedEndpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers,
      body: options.body
        ? typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    };

    const response = await fetch(url, fetchOptions);

    const contentType = response.headers.get("content-type");
    let bodyData: any = null;

    if (contentType && contentType.includes("application/json")) {
      bodyData = await response.json();
    } else {
      bodyData = await response.text();
    }

    if (!response.ok) {
      const errorMsg =
        typeof bodyData === "object" && bodyData?.detail
          ? bodyData.detail
          : typeof bodyData === "string"
            ? bodyData
            : `Request failed with status ${response.status}`;
      return { error: errorMsg };
    }

    return { data: bodyData };
  } catch (err: any) {
    return { error: err?.message || "Network request failed" };
  }
}

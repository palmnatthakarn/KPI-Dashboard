import axios, { type InternalAxiosRequestConfig } from "axios";
import { getToken, clearToken } from "@/lib/auth/token-storage";

/**
 * Typed HTTP client, equivalent to lib/services/api_service.dart.
 * Base URL mirrors --dart-define=BASE_URL:
 *   prod -> https://api.dedepos.com
 *   dev  -> https://api.dev.dedepos.com
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.dedepos.com",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Token invalid/expired server-side -> force re-login, same as the
      // Flutter app's behavior when refresh fails.
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

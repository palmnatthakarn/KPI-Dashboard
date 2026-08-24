import { create } from "zustand";
import * as authService from "@/lib/auth/auth-service";
import {
  clearToken,
  getToken,
  getUsername,
  isTokenExpiredOrExpiring,
} from "@/lib/auth/token-storage";

/**
 * Zustand equivalent of blocs/auth/auth_bloc.dart (events/states collapsed
 * into a single store: status + actions).
 */
export type AuthStatus = "idle" | "authenticating" | "authenticated" | "unauthenticated" | "error";

interface AuthStoreState {
  status: AuthStatus;
  username: string | null;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** Restores session on app start, refreshing the token if it's within the 5-min buffer. */
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  status: "idle",
  username: null,
  error: null,

  login: async (username, password) => {
    set({ status: "authenticating", error: null });
    try {
      await authService.login(username, password);
      set({ status: "authenticated", username, error: null });
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : "Login failed" });
      throw e;
    }
  },

  loginWithGoogle: async () => {
    set({ status: "authenticating", error: null });
    try {
      await authService.loginWithGoogle();
      set({ status: "authenticated", username: authService.getCurrentUsername(), error: null });
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : "Google login failed" });
      throw e;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ status: "unauthenticated", username: null, error: null });
  },

  checkAuth: async () => {
    set({ status: "authenticating", error: null });

    try {
      const token = getToken();
      if (!token) {
        set({ status: "unauthenticated", username: null, error: null });
        return;
      }

      if (isTokenExpiredOrExpiring()) {
        const refreshed = await authService.refreshAccessToken();
        if (!refreshed) {
          clearToken();
          set({ status: "unauthenticated", username: null, error: null });
          return;
        }
      }

      set({ status: "authenticated", username: getUsername(), error: null });
    } catch (error) {
      console.error("Unable to restore authentication session", error);
      clearToken();
      set({
        status: "unauthenticated",
        username: null,
        error: "ไม่สามารถตรวจสอบสิทธิ์ได้ กรุณาเข้าสู่ระบบใหม่",
      });
    }
  },
}));

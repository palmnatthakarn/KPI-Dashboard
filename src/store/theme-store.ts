"use client";

import { create } from "zustand";
import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

export { THEME_STORAGE_KEY };
export type { ThemeMode };

interface ThemeStoreState {
  /** What the user picked. "system" follows the OS setting. */
  mode: ThemeMode;
  /** What is actually painted right now — "system" already resolved. */
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  /** Reads the persisted choice and starts watching the OS setting. Returns a cleanup fn. */
  init: () => () => void;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
}

/** Tailwind is configured with `darkMode: "class"`, so the class on <html> is the switch. */
function applyToDocument(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Keeps native form controls and scrollbars in step with the theme.
  document.documentElement.style.colorScheme = resolved;
}

function readStoredMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  // Server render and first client render must agree, so both start at the
  // documented default. `init` reconciles with storage right after mount, and
  // the inline script in the layout has already painted the correct theme.
  mode: "system",
  resolved: "light",

  setMode: (mode) => {
    const resolved = resolve(mode);
    if (typeof localStorage !== "undefined") localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyToDocument(resolved);
    set({ mode, resolved });
  },

  init: () => {
    const mode = readStoredMode();
    const resolved = resolve(mode);
    applyToDocument(resolved);
    set({ mode, resolved });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      // Only follow the OS while the user is actually on "system".
      if (get().mode !== "system") return;
      const next = systemPrefersDark() ? "dark" : "light";
      applyToDocument(next);
      set({ resolved: next });
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  },
}));

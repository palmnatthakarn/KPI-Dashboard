"use client";

import { create } from "zustand";
import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

export { THEME_STORAGE_KEY };
export type { ThemeMode };

interface ThemeStoreState {
  /** The explicit light/dark choice shown in the sidebar. */
  mode: ThemeMode;
  /** What is actually painted right now. */
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  /** Reads the persisted choice, or captures the OS theme on first use. */
  init: () => () => void;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Tailwind is configured with `darkMode: "class"`, so the class on <html> is the switch. */
function applyToDocument(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Keeps native form controls and scrollbars in step with the theme.
  document.documentElement.style.colorScheme = resolved;
}

function readStoredMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  // First visit (and migration from the removed "system" option): capture
  // the OS preference once, then keep it as an explicit app preference.
  const initialMode: ThemeMode = systemPrefersDark() ? "dark" : "light";
  localStorage.setItem(THEME_STORAGE_KEY, initialMode);
  return initialMode;
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  // Server render and first client render must agree, so both start at the
  // light default. `init` reconciles with storage right after mount, and
  // the inline script in the layout has already painted the correct theme.
  mode: "light",
  resolved: "light",

  setMode: (mode) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyToDocument(mode);
    set({ mode, resolved: mode });
  },

  init: () => {
    const mode = readStoredMode();
    applyToDocument(mode);
    set({ mode, resolved: mode });
    return () => undefined;
  },
}));

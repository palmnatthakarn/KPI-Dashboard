/**
 * Shared theme constants.
 *
 * Deliberately NOT in the Zustand store: the root layout is a server component,
 * and importing a value from a "use client" module there yields a client
 * reference proxy rather than the value itself — which silently turned the
 * storage key into `{}` inside the inline no-flash script.
 */
export const THEME_STORAGE_KEY = "vat-dashboard-theme";

export type ThemeMode = "light" | "dark" | "system";

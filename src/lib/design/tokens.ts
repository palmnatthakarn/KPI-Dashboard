/**
 * Design tokens for the places that genuinely cannot use a CSS class:
 * SVG chart fills, dynamically-built gradients, and PDF export (which renders
 * outside the DOM entirely, so CSS variables are unavailable there).
 *
 * PREFER THE TAILWIND CLASSES. `bg-status-safe-soft` / `text-status-safe-strong`
 * resolve through CSS variables and therefore follow the active theme; the hex
 * values below are LIGHT-MODE ONLY and will not adapt when dark mode is on.
 * Reach for these only when no class can do the job.
 *
 * The authoritative values live in `src/app/globals.css` (`:root` and `.dark`).
 * The light values here mirror that file — change one, change the other.
 *
 * Never hardcode a hex in a component. The same "safe" status rendering in two
 * different greens is exactly what this file exists to prevent.
 */

/**
 * Semantic status colors, mapped to the income thresholds in AppConstants.
 *
 * - `base`   decorative use: icons, borders, chart fills. Not for text.
 * - `strong` text on a light background — meets WCAG AA (>= 4.5:1) at normal size.
 * - `soft`   tinted background for badges/pills, pairs with `strong` text.
 */
export const statusPalette = {
  safe: { base: "#16A34A", strong: "#15803D", soft: "#DCFCE7" },
  warning: { base: "#D97706", strong: "#B45309", soft: "#FEF3C7" },
  exceeded: { base: "#DC2626", strong: "#B91C1C", soft: "#FEE2E2" },
} as const;

/** Non-status accents: `info` for neutral emphasis, `neutral` for "no meaning". */
export const accentPalette = {
  info: { base: "#2563EB", strong: "#1D4ED8", soft: "#DBEAFE" },
  neutral: { base: "#64748B", strong: "#334155", soft: "#F1F5F9" },
} as const;

/**
 * Categorical palette — for tiles/series that only need to be TELLABLE APART
 * and carry no inherent meaning (e.g. the six KPI summary tiles).
 *
 * Do not use these for anything status-bearing; use `statusPalette` so the
 * color keeps meaning it.
 *
 * Every entry clears 4.5:1 against white (measured range 5.18–6.29), which
 * also makes them safe as avatar backgrounds behind white initials — the
 * contrast formula is identical in both directions. Keep any replacement at
 * the 600–700 end of its ramp; the 500-level shades of these same hues land
 * around 2.2–3.7:1 and fail.
 */
export const categoricalPalette = [
  "#4F46E5", // indigo-600
  "#0369A1", // sky-700
  "#C2410C", // orange-700
  "#0F766E", // teal-700
  "#7C3AED", // violet-600
  "#BE185D", // pink-700
] as const;

export type StatusKey = keyof typeof statusPalette;
export type AccentKey = StatusKey | keyof typeof accentPalette;

/** Every accent in one lookup, for components that accept any accent. */
export const accents = { ...statusPalette, ...accentPalette } as const;

/** Resolve an accent key to its hex triple. */
export function accentColors(accent: AccentKey) {
  return accents[accent];
}

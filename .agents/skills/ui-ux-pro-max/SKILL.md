---
name: ui-ux-pro-max
description: Repo-local UI/UX design intelligence adapted from nextlevelbuilder/ui-ux-pro-max-skill for this dashboard project. Use when designing, reviewing, or refining interface details, loading states, dense dashboard layouts, accessibility, and interaction quality.
source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
---

# UI/UX Pro Max

Use this skill whenever the user asks to improve, review, or implement UI/UX in this dashboard.

This repo-local version is a practical adapter for the current project. It is not a full clone of the upstream package; it captures the working rules that matter most for this operational dashboard until the full upstream bundle can be installed.

## Product Context

This project is an operational VAT/status dashboard. The interface should feel:

- dense but calm;
- scan-friendly;
- stable while data changes;
- precise with counts, statuses, dates, and document previews;
- usable for repeated back-office work.

Avoid marketing-style UI, decorative hero sections, oversized cards, heavy gradients, and ornamental effects. Prioritize clear hierarchy, predictable controls, compact spacing, and reliable feedback.

## Design Priorities

1. Make state visible.
   Loading, empty, error, partial, and completed states should be explicit enough that users understand what is happening without guessing.

2. Preserve layout stability.
   Skeletons, counters, badges, date inputs, tables, and cards should reserve stable space so the UI does not jump during loading or refresh.

3. Keep dashboard density useful.
   Prefer compact controls, restrained shadows, clear grouping, and readable tables. Do not make repeated data surfaces feel like floating marketing cards.

4. Make counts trustworthy.
   If a number represents a grouped document set, uploaded image, physical file, or GL-linked document, label and structure it so the user can understand the counting model.

5. Design for fast correction.
   Filters, date entry, pagination, popup previews, keyboard navigation, and close/back actions should work predictably because users will repeat them many times.

## Components

### Loading

- Pair skeleton blocks with a clear progress or loading cue when the loading surface is small or easy to miss.
- Use `role="status"` and screen-reader text for loading regions.
- Keep skeleton dimensions close to the final content dimensions.
- Avoid full-page blocking loaders unless the user cannot interact with anything meaningful.

### Tables

- Keep column alignment consistent across loading and loaded states.
- Use short labels and predictable numeric alignment.
- Avoid color-only status meaning; pair color with icons or text where possible.
- Empty dashes should mean "no data", not "still loading".

### Cards

- Use cards for repeated items or compact metrics only.
- Keep card radius, spacing, and shadows consistent with existing design tokens.
- Reserve room for icon, label, value, and loading state.

### Popups And Previews

- Opening a file should keep users in context whenever possible.
- Preview overlays should support previous/next navigation through all visible items.
- Keyboard navigation should mirror click navigation.
- Grouped document sets should still allow navigation into individual files when previewing.

### Dates And Filters

- Typed date entry should normalize user input after confirmation.
- Enter should commit the field and move focus to the next logical field when applicable.
- Invalid dates should be blocked clearly without silently changing the query.

## Accessibility Checklist

- Interactive elements are keyboard reachable.
- Focus states remain visible.
- Icon-only buttons have accessible names.
- Loading regions use status semantics.
- Color is not the only signal for status.
- Text does not clip at common zoom levels.
- Badges and chips have enough contrast against their background.

## React/Next.js Implementation Notes

- Prefer existing components and design tokens before adding new abstractions.
- Keep client components scoped to actual interactivity.
- Avoid re-render-heavy derived arrays in render paths when data can be memoized cleanly.
- Do not add animation that changes semantic state or makes rapid interactions unreliable.
- Respect `prefers-reduced-motion` for non-essential motion.

## Before Finishing UI Work

Check:

- loading state is visible and does not cause layout shift;
- empty/error states make sense;
- keyboard interactions still work;
- responsive widths do not clip labels or counters;
- counts match the data model the user expects;
- the change fits the dashboard's restrained operational style.

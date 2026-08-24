import { cn } from "@/lib/utils";
import type { AccentKey } from "@/lib/design/tokens";

/**
 * Status pill. Uses the `soft` background + `strong` text pairing from the
 * design tokens, which is contrast-checked for WCAG AA — do not swap in a
 * lighter text shade.
 */
const ACCENT_CLASSES: Record<AccentKey, string> = {
  safe: "bg-status-safe-soft text-status-safe-strong",
  warning: "bg-status-warning-soft text-status-warning-strong",
  exceeded: "bg-status-exceeded-soft text-status-exceeded-strong",
  info: "bg-info-soft text-info-strong",
  neutral: "bg-secondary text-muted-foreground",
};

export function Badge({
  accent = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { accent?: AccentKey }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        ACCENT_CLASSES[accent],
        className
      )}
      {...props}
    />
  );
}

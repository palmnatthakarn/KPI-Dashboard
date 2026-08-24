"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore, type ThemeMode } from "@/store/theme-store";

const OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "สว่าง", icon: Sun },
  { mode: "dark", label: "มืด", icon: Moon },
  { mode: "system", label: "ตามระบบ", icon: Monitor },
];

/**
 * Three-way theme control. A plain on/off switch would strand the user who
 * wants the app to follow their OS — "system" is the default, so it needs to
 * be reachable again after someone tries the other two.
 *
 * `collapsed` renders only the icon for the narrow sidebar rail.
 */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  if (collapsed) {
    // Cycles light -> dark -> system so every mode stays reachable from the rail.
    const next: ThemeMode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[2];
    const Icon = current.icon;
    return (
      <button
        type="button"
        onClick={() => setMode(next)}
        aria-label={`ธีม: ${current.label} — เปลี่ยนเป็น ${OPTIONS.find((o) => o.mode === next)?.label}`}
        title={`ธีม: ${current.label}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="ธีมการแสดงผล"
      className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(option.mode)}
            title={option.label}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

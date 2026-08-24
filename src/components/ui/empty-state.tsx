import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one empty state. Replaces three near-identical hand-rolled versions
 * that disagreed on icon size, padding and circle background.
 *
 * `size="inline"` fits inside a card or table body; `size="page"` is for a
 * whole route with nothing to show yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "inline",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "inline" | "page";
  className?: string;
}) {
  const isPage = size === "page";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isPage ? "gap-4 py-20" : "gap-3 py-12",
        className
      )}
    >
      <div className={cn("rounded-full bg-secondary", isPage ? "p-5" : "p-3.5")}>
        <Icon className={cn("text-muted-foreground/50", isPage ? "h-10 w-10" : "h-6 w-6")} />
      </div>
      <div className="space-y-1">
        <p className={cn("font-semibold text-foreground", isPage ? "text-base" : "text-sm")}>{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

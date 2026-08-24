import { cn } from "@/lib/utils";

/**
 * The app's one card surface. Every panel, tile and table shell should be
 * built on this so radius/border/elevation stay identical everywhere —
 * before this existed the app shipped three different card radii (xl, 2xl,
 * 3xl) with three different shadow recipes.
 *
 * `interactive` adds hover affordance; only use it when the whole card is
 * actually clickable.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm",
        interactive &&
          "cursor-pointer transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  );
}

/** Standard card padding. Kept separate so tables can opt out of it. */
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 border-b border-border px-4 py-3", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
}

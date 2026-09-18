import { Loader2 } from "lucide-react";

const SKELETON_ROWS = ["row-1", "row-2", "row-3", "row-4"] as const;

export function KpiLoadingState() {
  return (
    <div
      className="flex min-h-[24rem] flex-col justify-center px-4 py-10 md:px-6"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-auto flex max-w-xl items-start gap-3 text-center md:text-left">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Loader2
            className="h-5 w-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">กำลังรวบรวมข้อมูล KPI</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            กำลังรวมข้อมูลงานและ GL จากร้านที่เลือก กรุณารอสักครู่
          </p>
        </div>
      </div>

      <div
        className="mx-auto mt-8 w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card"
        aria-hidden="true"
      >
        <div className="grid grid-cols-[1.4fr_repeat(2,minmax(0,0.7fr))] gap-4 bg-secondary/70 px-4 py-3 md:grid-cols-[1.4fr_repeat(3,minmax(0,0.7fr))]">
          <div className="h-3 w-28 max-w-full rounded bg-muted-foreground/15" />
          <div className="h-3 w-14 justify-self-end rounded bg-muted-foreground/15" />
          <div className="h-3 w-14 justify-self-end rounded bg-muted-foreground/15" />
          <div className="hidden h-3 w-14 justify-self-end rounded bg-muted-foreground/15 md:block" />
        </div>

        {SKELETON_ROWS.map((row, index) => (
          <div
            key={row}
            className="grid grid-cols-[1.4fr_repeat(2,minmax(0,0.7fr))] gap-4 border-t border-border px-4 py-4 md:grid-cols-[1.4fr_repeat(3,minmax(0,0.7fr))]"
          >
            <div
              className="h-4 max-w-full animate-pulse rounded bg-secondary motion-reduce:animate-none"
              style={{ width: `${72 - index * 7}%` }}
            />
            <div className="h-4 w-12 animate-pulse justify-self-end rounded bg-secondary motion-reduce:animate-none" />
            <div className="h-4 w-12 animate-pulse justify-self-end rounded bg-secondary motion-reduce:animate-none" />
            <div className="hidden h-4 w-12 animate-pulse justify-self-end rounded bg-secondary motion-reduce:animate-none md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

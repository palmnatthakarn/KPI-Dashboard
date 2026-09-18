import { Files, ImageUp, ListChecks, Eye, ClipboardList, KeyRound } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { categoricalPalette } from "@/lib/design/tokens";

/**
 * These six tiles are peers — none of them is a "status", they just need to be
 * tellable apart, so they draw from the categorical palette rather than the
 * status colors. Reusing status green/amber/red here would make the numbers
 * look like judgements they aren't.
 */
const CARDS = [
  { label: "จำนวนบิลทั้งหมด", key: "totalDocuments", icon: Files },
  { label: "รูปที่อัปโหลด", key: "totalUploaded", icon: ImageUp },
  { label: "คงเหลือ", key: "remainingDocuments", icon: ListChecks },
  { label: "รอตรวจ", key: "waitingVerify", icon: Eye },
  { label: "ต้องบันทึกทั้งหมด", key: "requiredToRecordDocuments", icon: ClipboardList },
  { label: "คีย์รวม", key: "totalJournalsCombined", icon: KeyRound },
] as const;

/** Ported from KpiCombinedPage's summary card row (6 visible cards). */
export function KpiSummaryCards(props: {
  totalDocuments: number;
  totalUploaded: number;
  remainingDocuments: number;
  waitingVerify: number;
  requiredToRecordDocuments: number;
  totalJournalsCombined: number;
  ready: boolean;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      aria-busy={!props.ready}
    >
      {CARDS.map((card, index) => {
        const base = categoricalPalette[index % categoricalPalette.length];

        if (!props.ready) {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-2xl border border-border bg-card p-4 text-left shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${base}1A`, color: base }}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div
                className="mt-3 h-8 w-24 max-w-full animate-pulse rounded-lg bg-secondary motion-reduce:animate-none"
                aria-hidden="true"
              />
            </div>
          );
        }

        return (
          <StatTile
            key={card.key}
            label={card.label}
            value={props[card.key]}
            icon={card.icon}
            // Categorical entries are single hexes; the tile needs the triple,
            // so the tint is derived from the same base color.
            accent={{ base, strong: base, soft: `${base}1A` }}
          />
        );
      })}
    </div>
  );
}

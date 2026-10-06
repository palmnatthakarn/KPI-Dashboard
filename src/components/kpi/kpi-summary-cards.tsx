import { Files, ImageUp, ListChecks, Eye, ClipboardList, KeyRound, ScanText } from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { categoricalPalette } from "@/lib/design/tokens";

/**
 * These seven tiles are peers — none of them is a "status", they just need to be
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
  // The categorical palette has six entries (also used for avatars), so the
  // seventh tile carries its own distinct hue instead of repeating indigo.
  { label: "AI วิเคราะห์แล้ว", key: "totalOcrAnalyzed", icon: ScanText, color: "#4D7C0F" },
] as const;

/** Ported from KpiCombinedPage's summary card row, plus the OCR AI tile. */
export function KpiSummaryCards(props: {
  totalDocuments: number;
  totalUploaded: number;
  remainingDocuments: number;
  waitingVerify: number;
  requiredToRecordDocuments: number;
  totalJournalsCombined: number;
  totalOcrAnalyzed: number;
  ready: boolean;
}) {
  return (
    <div
      // Seven tiles in one row only where each still has room for its Thai
      // label beside the icon (2xl ≥ 1600px); narrower screens wrap them.
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7"
      aria-busy={!props.ready}
    >
      {CARDS.map((card, index) => {
        const base =
          "color" in card ? card.color : categoricalPalette[index % categoricalPalette.length];

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

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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {CARDS.map((card, index) => {
        const base = categoricalPalette[index % categoricalPalette.length];
        return (
          <StatTile
            key={card.key}
            label={card.label}
            value={props[card.key]}
            icon={card.icon}
            // Categorical entries are single hexes; the tile needs the triple,
            // so the tint is derived from the same base color.
            accent={{ base, strong: base, soft: `${base}1A` }}
            loading={!props.ready}
          />
        );
      })}
    </div>
  );
}

import { Files, ImageUp, ListChecks, Eye, ClipboardList, KeyRound } from "lucide-react";

/** Ported from KpiCombinedPage's summary card row (6 visible cards). */
export function KpiSummaryCards({
  totalDocuments,
  totalUploaded,
  remainingDocuments,
  waitingVerify,
  requiredToRecordDocuments,
  totalJournalsCombined,
  ready,
}: {
  totalDocuments: number;
  totalUploaded: number;
  remainingDocuments: number;
  waitingVerify: number;
  requiredToRecordDocuments: number;
  totalJournalsCombined: number;
  ready: boolean;
}) {
  const cards = [
    { label: "จำนวนบิลทั้งหมด", value: totalDocuments, icon: Files, color: "#6366F1" },
    { label: "รูปที่อัปโหลด", value: totalUploaded, icon: ImageUp, color: "#3B82F6" },
    { label: "คงเหลือ", value: remainingDocuments, icon: ListChecks, color: "#F97316" },
    { label: "รอตรวจ", value: waitingVerify, icon: Eye, color: "#F59E0B" },
    { label: "ต้องบันทึกทั้งหมด", value: requiredToRecordDocuments, icon: ClipboardList, color: "#10B981" },
    { label: "คีย์รวม", value: totalJournalsCombined, icon: KeyRound, color: "#8B5CF6" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="group relative overflow-hidden rounded-3xl border border-[#E2E8F0]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(248,250,252,0.66))] p-4 shadow-[0_14px_38px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_20px_48px_rgba(15,23,42,0.10)]"
        >
          <div
            className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-14 transition group-hover:scale-110 group-hover:opacity-20"
            style={{ backgroundColor: c.color }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide text-[#64748B]">{c.label}</p>
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-[#E2E8F0]"
              style={{ color: c.color }}
            >
              <c.icon className="h-4 w-4" />
            </span>
          </div>
          {ready ? (
            <div className="relative mt-4">
              <p className="text-3xl font-black leading-none tracking-tight text-[#0F172A] tabular-nums">{c.value.toLocaleString("th-TH")}</p>
            </div>
          ) : (
            <div className="relative mt-4 space-y-3">
              <div className="h-8 w-20 animate-pulse rounded-xl bg-[#E2E8F0]" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

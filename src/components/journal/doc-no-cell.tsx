"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Ported from DocNoCell (doc_no_cell.dart). */
export function DocNoCell({ docNo, onCopy }: { docNo: string; onCopy?: (docNo: string) => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(docNo).catch(() => {});
    }
    setCopied(true);
    onCopy?.(docNo);
    setTimeout(() => setCopied(false), 2000);
  }

  const color = copied ? "text-emerald-600" : "text-info-strong";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded px-1 py-1.5 text-[13px] font-semibold ${color} hover:bg-black/5`}
    >
      {docNo}
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface DropdownItem {
  id: string;
  label: string;
}

/** Ported from SearchableMultiDropdown (searchable_dropdown.dart), chipStyle variant. */
export function SearchableMultiDropdown({
  items,
  selectedIds,
  onChange,
  placeholder,
  allLabel,
}: {
  items: DropdownItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  /** Label shown on the trigger when nothing is selected, e.g. "พนักงานทั้งหมด". */
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  const triggerLabel = selectedIds.length === 0 ? allLabel : `${selectedIds.length} รายการ`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[38px] w-full items-center justify-between gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[12px] font-medium text-foreground shadow-sm"
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[42px] z-50 max-h-72 w-72 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm outline-none"
              />
              {selectedIds.length > 0 && (
                <button type="button" onClick={() => onChange([])} className="text-xs text-muted-foreground hover:text-foreground">
                  ล้าง
                </button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">ไม่พบรายการ</p>
              ) : (
                filtered.map((item) => {
                  const checked = selectedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary" : "border-border"}`}
                      >
                        {checked && <span className="h-2 w-2 rounded-sm bg-primary-foreground" />}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-1.5 h-6 overflow-hidden">
        {selectedIds.length > 0 && (
        <div className="flex h-full items-center gap-1 overflow-x-auto overflow-y-hidden whitespace-nowrap pr-1">
          {selectedIds.map((id) => {
            const item = items.find((i) => i.id === id);
            if (!item) return null;
            return (
              <span
                key={id}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
              >
                {item.label}
                <button type="button" onClick={() => toggle(id)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { LineChart as ShowChart } from "lucide-react";
import type { Journal } from "@/types/journal";
import { journalDisplayDate, formatCompact } from "@/lib/journal/journal-helpers";
import { accountClassFromString, accountClassDisplayName, accountClassColor, type AccountClass } from "@/lib/journal/account-class";

/**
 * Simplified port of JournalChart (journal_chart.dart, fl_chart-based).
 * Aggregates debit+credit amount by date and account-class into a stacked
 * bar chart using Recharts rather than a 1:1 port of the animated fl_chart
 * bar chart, since the value here is the data shape, not the animation.
 */
export function JournalChart({ rows }: { rows: Journal[] }) {
  const { data, classes, totalAmount } = useMemo(() => {
    const daily = new Map<string, Record<string, number>>();
    const classSet = new Set<AccountClass>();
    let total = 0;

    for (const j of rows) {
      const date = journalDisplayDate(j);
      const cls = accountClassFromString(j.accounttype);
      classSet.add(cls);
      const amount = (j.debit ?? 0) + (j.credit ?? 0);
      const entry = daily.get(date) ?? {};
      entry[cls] = (entry[cls] ?? 0) + amount;
      daily.set(date, entry);
      total += amount;
    }

    const rowsOut = Array.from(daily.keys()).map((date) => ({ date, ...daily.get(date) }));
    return { data: rowsOut, classes: Array.from(classSet), totalAmount: total };
  }, [rows]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-[#EEF2FF] p-6">
          <ShowChart className="h-12 w-12 text-[#818CF8]" />
        </div>
        <p className="text-sm text-muted-foreground">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF]/50 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">ยอดรวมทั้งหมด</p>
          <p className="text-xl font-extrabold text-foreground">{formatCompact(totalAmount)}</p>
        </div>
        <p className="text-xs text-muted-foreground">{data.length} วันที่มีรายการ</p>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompact(v)} />
            <Tooltip formatter={(v: number) => formatCompact(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {classes.map((cls) => (
              <Bar
                key={cls}
                dataKey={cls}
                name={accountClassDisplayName(cls)}
                stackId="amount"
                fill={accountClassColor(cls)}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

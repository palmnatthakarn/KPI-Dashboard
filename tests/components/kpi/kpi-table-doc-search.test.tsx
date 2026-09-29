import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KpiTable } from "@/components/kpi/kpi-table";
import { filterEmployeesByDocSearch } from "@/lib/kpi/kpi-doc-search";
import type { KpiCombinedShopStat, KpiCombinedTaskItem } from "@/types/kpi-combined";
import { makeEmployee } from "../../utils/kpi-fixtures";

vi.mock("@/lib/employee/employee-mapping-service", () => ({
  useEmployeeMappings: vi.fn(() => ({})),
  getDisplayName: (name: string) => name,
}));

const zeroStats = {
  totalDocuments: 0,
  waitingVerify: 0,
  passed: 0,
  cancelled: 0,
  notRecorded: 0,
  notRequiredApproval: 0,
  requiredToRecord: 0,
  recorded: 0,
  remaining: 0,
  completed: 0,
  journalRequiredDocs: 0,
  journalCount: 0,
  journalCountNoPhoto: 0,
  journalChecked: 0,
  journalUpdated: 0,
  uploadedCount: 0,
};

const journal = (docNo: string) =>
  ({ docNo, accountName: "", debit: 0, credit: 0, createdBy: "keyer", keyedAt: null }) as never;

const task = (taskName: string, docNos: string[]) =>
  ({
    ...zeroStats,
    taskName,
    status: 6,
    totalDocument: 0,
    ownerAt: new Date(2026, 8, 16),
    isOwner: true,
    uploadedByThisEmployee: 0,
    uploadedImages: [],
    journalEntries: docNos.map(journal),
  }) as unknown as KpiCombinedTaskItem;

const shop = (shopName: string, tasks: KpiCombinedTaskItem[], orphans: string[] = []) =>
  ({ ...zeroStats, shopName, tasks, orphanJournalEntries: orphans.map(journal), uploadedImages: [] }) as unknown as KpiCombinedShopStat;

const employees = [
  makeEmployee("keyer-a", {
    shopStats: [
      shop("ร้าน A", [task("ขาย เดือน08.69", ["TR-6909-0377", "TR-6909-0376"]), task("ซื้อ A", ["PV-0009"])], ["JV-0001"]),
    ],
  }),
  makeEmployee("keyer-b", { shopStats: [shop("ร้าน B", [task("ซื้อ", ["PV-0001"])])] }),
];

describe("KpiTable document-number search", () => {
  it("opens the matching employee, shop and task and shows only the matching journal", () => {
    const docSearch = { docNo: "0377", link: "all" } as const;
    render(
      <KpiTable employees={filterEmployeesByDocSearch(employees, docSearch)} fontScale={1} docSearch={docSearch} />
    );

    expect(screen.queryByText("keyer-b")).toBeNull();
    expect(screen.getAllByText("ร้าน A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ขาย เดือน08.69").length).toBeGreaterThan(0);
    expect(screen.getByText("รายการบันทึกบัญชี (1 จาก 2)")).toBeTruthy();
    expect(screen.getByText(/TR-6909-0377/)).toBeTruthy();
    expect(screen.queryByText(/TR-6909-0376/)).toBeNull();
    expect(screen.queryAllByText("ซื้อ A")).toHaveLength(0);
    expect(screen.queryByText(/รายการที่ไม่ผูกกับงาน/)).toBeNull();
  });

  it("shows only the unassigned journals in unlinked mode", () => {
    const docSearch = { docNo: "", link: "unlinked" } as const;
    render(
      <KpiTable employees={filterEmployeesByDocSearch(employees, docSearch)} fontScale={1} docSearch={docSearch} />
    );

    expect(screen.getByText("รายการที่ไม่ผูกกับงาน (1)")).toBeTruthy();
    expect(screen.getByText(/JV-0001/)).toBeTruthy();
    expect(screen.queryAllByText("ขาย เดือน08.69")).toHaveLength(0);
    expect(screen.queryByText("keyer-b")).toBeNull();
  });

  it("shows only tasks and hides unassigned journals in linked mode", () => {
    const docSearch = { docNo: "", link: "linked" } as const;
    render(
      <KpiTable employees={filterEmployeesByDocSearch(employees, docSearch)} fontScale={1} docSearch={docSearch} />
    );

    expect(screen.getAllByText("ขาย เดือน08.69").length).toBeGreaterThan(0);
    expect(screen.queryByText(/รายการที่ไม่ผูกกับงาน/)).toBeNull();
  });

  it("keeps rows collapsed when not searching", () => {
    render(<KpiTable employees={employees} fontScale={1} />);

    expect(screen.queryByText(/รายการบันทึกบัญชี/)).toBeNull();
  });
});

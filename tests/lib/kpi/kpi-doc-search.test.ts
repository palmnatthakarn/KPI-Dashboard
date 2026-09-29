import { describe, expect, it } from "vitest";
import {
  collectMatchedJournals,
  describeDocSearch,
  filterEmployeesByDocSearch,
  type DocSearch,
} from "@/lib/kpi/kpi-doc-search";
import type { KpiCombinedEmployee } from "@/types/kpi-combined";

const journal = (docNo: string) => ({ docNo }) as never;
const task = (name: string, docNos: string[]) => ({ taskName: name, journalEntries: docNos.map(journal) }) as never;
const employee = (name: string, shops: { name: string; tasks: never[]; orphans?: string[] }[]) =>
  ({
    name,
    totalDocuments: 99,
    shopStats: shops.map((shop) => ({
      shopName: shop.name,
      tasks: shop.tasks,
      orphanJournalEntries: (shop.orphans ?? []).map(journal),
    })),
  }) as unknown as KpiCombinedEmployee;

const employees = [
  employee("a", [
    { name: "s1", tasks: [task("t1", ["TR-6909-0377", "TR-6909-0376"]), task("t2", ["TR-6909-0100"])] },
    { name: "s2", tasks: [task("t3", ["PV-0001"])] },
  ]),
  employee("b", [{ name: "s3", tasks: [], orphans: ["TR-6909-0377-X"] }]),
  employee("c", [{ name: "s4", tasks: [task("t4", ["RV-0002"])] }]),
];

const search = (docNo: string, link: DocSearch["link"] = "all"): DocSearch => ({ docNo, link });
const shopNames = (result: KpiCombinedEmployee[]) =>
  result.map((e) => `${e.name}:${e.shopStats.map((s) => s.shopName).join("+")}`);

describe("filterEmployeesByDocSearch", () => {
  it("returns everything unchanged when no search is active", () => {
    expect(filterEmployeesByDocSearch(employees, search("   "))).toBe(employees);
  });

  it("keeps employees and shops with a partial, case-insensitive document match, linked or not", () => {
    expect(shopNames(filterEmployeesByDocSearch(employees, search(" tr-6909-0377 ")))).toEqual(["a:s1", "b:s3"]);
  });

  it("keeps the real KPI totals and task lists on matched rows", () => {
    const [first] = filterEmployeesByDocSearch(employees, search("0377"));
    expect(first.totalDocuments).toBe(99);
    expect(first.shopStats[0].tasks).toHaveLength(2);
  });

  it("finds only documents tied to a task in linked mode", () => {
    expect(shopNames(filterEmployeesByDocSearch(employees, search("", "linked")))).toEqual([
      "a:s1+s2",
      "c:s4",
    ]);
    expect(shopNames(filterEmployeesByDocSearch(employees, search("0377", "linked")))).toEqual(["a:s1"]);
  });

  it("finds only documents not tied to any task in unlinked mode", () => {
    expect(shopNames(filterEmployeesByDocSearch(employees, search("", "unlinked")))).toEqual(["b:s3"]);
    expect(filterEmployeesByDocSearch(employees, search("PV-0001", "unlinked"))).toEqual([]);
  });

  it("returns no rows when nothing matches", () => {
    expect(filterEmployeesByDocSearch(employees, search("ZZZ"))).toEqual([]);
  });
});

describe("collectMatchedJournals", () => {
  const docNos = (employee: KpiCombinedEmployee, s: DocSearch) =>
    collectMatchedJournals(employee, s).map((m) => `${m.taskName ?? "-"}:${m.journal.docNo}`);

  it("lists the matching journals with their task, or '-' when unassigned", () => {
    expect(docNos(employees[0], search("tr-6909-03"))).toEqual(["t1:TR-6909-0377", "t1:TR-6909-0376"]);
    expect(docNos(employees[1], search("0377"))).toEqual(["-:TR-6909-0377-X"]);
  });

  it("lists every unassigned journal in unlinked mode and nothing for linked mode alone", () => {
    expect(docNos(employees[1], search("", "unlinked"))).toEqual(["-:TR-6909-0377-X"]);
    expect(docNos(employees[0], search("", "linked"))).toEqual([]);
  });

  it("describes the active search", () => {
    expect(describeDocSearch(search(" 0377 ", "unlinked"))).toBe('เลขที่เอกสาร "0377" · ไม่ผูกงาน');
  });
});

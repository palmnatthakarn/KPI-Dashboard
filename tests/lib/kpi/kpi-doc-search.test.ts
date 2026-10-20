import { describe, expect, it } from "vitest";
import {
  collectMatchedJournals,
  describeDocSearch,
  filterEmployeesByDocSearch,
  groupUploadsByUploader,
  type DocSearch,
} from "@/lib/kpi/kpi-doc-search";
import type { KpiCombinedEmployee, KpiShopUpload } from "@/types/kpi-combined";

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

const search = (docNo: string, link: DocSearch["link"] = "all", uploadFrom = "", uploadTo = ""): DocSearch => ({
  docNo,
  link,
  uploadFrom,
  uploadTo,
});
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

describe("groupUploadsByUploader", () => {
  const upload = (shopName: string, uploadedBy: string, uploadedAt: string | null, imageId: string) =>
    ({ shopName, image: { imageId, uploadedBy, uploadedAt } }) as unknown as KpiShopUpload;
  const uploads = [
    upload("s1", "anna", "2026-10-01T02:00:00Z", "1"),
    upload("s1", "anna", "2026-10-05T02:00:00Z", "2"),
    upload("s2", "anna", "2026-10-05T03:00:00Z", "3"),
    upload("s1", "ben", "2026-10-05T04:00:00Z", "4"),
    upload("s1", "ben", "2026-09-30T04:00:00Z", "5"),
    upload("s1", "", "2026-10-05T04:00:00Z", "6"),
    upload("s1", "cid", null, "7"),
  ];
  const summary = (s: DocSearch, employees?: string[]) =>
    groupUploadsByUploader(uploads, s, employees).map(
      (row) => `${row.uploader}:${row.imageCount}:${row.shops.map((shop) => `${shop.shopName}=${shop.images.length}`).join("+")}`
    );

  it("groups images uploaded in the inclusive day range by uploader and shop, most uploads first", () => {
    expect(summary(search("", "all", "2026-10-01", "2026-10-05"))).toEqual(["anna:3:s1=2+s2=1", "ben:1:s1=1"]);
  });

  it("supports open-ended ranges and skips images with no uploader or upload time", () => {
    expect(summary(search("", "all", "", "2026-09-30"))).toEqual(["ben:1:s1=1"]);
    expect(summary(search("", "all", "2026-10-02", ""))).toEqual(["anna:2:s1=1+s2=1", "ben:1:s1=1"]);
  });

  it("narrows to the selected employees", () => {
    expect(summary(search("", "all", "2026-10-01", ""), ["ben"])).toEqual(["ben:1:s1=1"]);
  });

  it("describes the upload range", () => {
    expect(describeDocSearch(search("", "all", "2026-10-01", "2026-10-05"))).toBe("อัปโหลด 01/10/2026 – 05/10/2026");
    expect(describeDocSearch(search("", "all", "2026-10-01", ""))).toBe("อัปโหลดตั้งแต่ 01/10/2026");
    expect(describeDocSearch(search("", "all", "", "2026-10-05"))).toBe("อัปโหลดถึง 05/10/2026");
  });
});

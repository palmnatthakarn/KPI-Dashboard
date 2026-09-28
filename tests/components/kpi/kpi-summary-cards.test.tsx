import { renderToStaticMarkup } from "react-dom/server";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiSummaryCards } from "../../../src/components/kpi/kpi-summary-cards";

const labels = [
  "จำนวนบิลทั้งหมด",
  "รูปที่อัปโหลด",
  "คงเหลือ",
  "รอตรวจ",
  "ต้องบันทึกทั้งหมด",
  "คีย์รวม",
  "AI วิเคราะห์แล้ว",
];

const values = {
  totalDocuments: 111_111,
  totalUploaded: 222_222,
  remainingDocuments: 333_333,
  waitingVerify: 444_444,
  requiredToRecordDocuments: 555_555,
  totalJournalsCombined: 666_666,
  totalOcrAnalyzed: 777_777,
};

describe("KpiSummaryCards", () => {
  it("keeps all KPI labels visible without showing values or fake progress while loading", () => {
    const html = renderToStaticMarkup(<KpiSummaryCards {...values} ready={false} />);

    expect(html).toContain('aria-busy="true"');
    for (const label of labels) expect(html).toContain(label);
    for (const value of Object.values(values)) {
      expect(html).not.toContain(value.toLocaleString("th-TH"));
    }
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toContain("w-2/3");
  });

  it("renders all values when the summary is ready", () => {
    const html = renderToStaticMarkup(<KpiSummaryCards {...values} ready />);

    expect(html).toContain('aria-busy="false"');
    for (const label of labels) expect(html).toContain(label);
    for (const value of Object.values(values)) {
      expect(html).toContain(value.toLocaleString("th-TH"));
    }
  });

  // Gap identified in review: the two tests above only render two separate
  // static snapshots, so a key-mismatch bug (React failing to swap the
  // skeleton node for the value node on the SAME instance) would slip
  // through. This re-renders one live instance across the transition.
  it("replaces the loading skeletons with real values when the same instance transitions from not-ready to ready", () => {
    const { rerender, container } = render(<KpiSummaryCards {...values} ready={false} />);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    for (const value of Object.values(values)) {
      expect(container.textContent).not.toContain(value.toLocaleString("th-TH"));
    }

    rerender(<KpiSummaryCards {...values} ready />);

    expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
    for (const value of Object.values(values)) {
      expect(container.textContent).toContain(value.toLocaleString("th-TH"));
    }
  });
});

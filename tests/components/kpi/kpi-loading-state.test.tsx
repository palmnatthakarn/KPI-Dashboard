import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KpiLoadingState } from "../../../src/components/kpi/kpi-loading-state";

describe("KpiLoadingState", () => {
  it("announces a clear polite loading status and hides decorative skeletons", () => {
    const html = renderToStaticMarkup(<KpiLoadingState />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("กำลังรวบรวมข้อมูล KPI");
    expect(html).toMatch(/งาน|task/);
    expect(html).toMatch(/GL|บัญชี/);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("animate-pulse");
    expect(html).not.toContain('role="progressbar"');
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { KpiFilterBar } from "@/components/kpi/kpi-filter-bar";
import { EMPTY_DOC_SEARCH } from "@/lib/kpi/kpi-doc-search";

function renderBar() {
  const onSearch = vi.fn();
  const onDocSearchChange = vi.fn();
  render(
    <KpiFilterBar
      employeeItems={[]}
      shops={[]}
      shopIds={[]}
      employeeNames={[]}
      startDate={new Date(2026, 8, 1)}
      endDate={new Date(2026, 8, 30)}
      isSearching={false}
      onSearch={onSearch}
      docSearch={EMPTY_DOC_SEARCH}
      onDocSearchChange={onDocSearchChange}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "ค้นหาเพิ่มเติม" }));
  return { onSearch, onDocSearchChange };
}

describe("KpiFilterBar advanced document search", () => {
  it("keeps edits as a draft until the search button is pressed", () => {
    const { onSearch, onDocSearchChange } = renderBar();

    fireEvent.change(screen.getByLabelText("เลขที่เอกสาร"), { target: { value: "0377" } });
    fireEvent.click(screen.getByRole("radio", { name: "ไม่ผูกงาน" }));
    expect(onDocSearchChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^ค้นหา$/ }));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onDocSearchChange).toHaveBeenCalledWith({ docNo: "0377", link: "unlinked" });
  });

  it("applies the draft when Enter is pressed in the document number field", () => {
    const { onDocSearchChange } = renderBar();
    const input = screen.getByLabelText("เลขที่เอกสาร");

    fireEvent.change(input, { target: { value: "TR-6909" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onDocSearchChange).toHaveBeenCalledWith({ docNo: "TR-6909", link: "all" });
  });
});

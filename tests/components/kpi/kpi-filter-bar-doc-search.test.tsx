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
    expect(onDocSearchChange).toHaveBeenCalledWith({ ...EMPTY_DOC_SEARCH, docNo: "0377", link: "unlinked" });
  });

  it("applies the draft when Enter is pressed in the document number field", () => {
    const { onDocSearchChange } = renderBar();
    const input = screen.getByLabelText("เลขที่เอกสาร");

    fireEvent.change(input, { target: { value: "TR-6909" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onDocSearchChange).toHaveBeenCalledWith({ ...EMPTY_DOC_SEARCH, docNo: "TR-6909" });
  });

  it("applies a typed upload-date range and allows clearing one side", () => {
    const { onDocSearchChange } = renderBar();
    const from = screen.getByRole("textbox", { name: "อัปโหลดตั้งแต่" });
    const to = screen.getByRole("textbox", { name: "อัปโหลดถึง" });

    fireEvent.change(from, { target: { value: "01/10/2026" } });
    fireEvent.blur(from);
    fireEvent.change(to, { target: { value: "05/10/2026" } });
    fireEvent.blur(to);
    fireEvent.click(screen.getByRole("button", { name: /^ค้นหา$/ }));
    expect(onDocSearchChange).toHaveBeenLastCalledWith({ ...EMPTY_DOC_SEARCH, uploadFrom: "2026-10-01", uploadTo: "2026-10-05" });

    fireEvent.click(screen.getByRole("button", { name: "ล้างอัปโหลดตั้งแต่" }));
    fireEvent.click(screen.getByRole("button", { name: /^ค้นหา$/ }));
    expect(onDocSearchChange).toHaveBeenLastCalledWith({ ...EMPTY_DOC_SEARCH, uploadTo: "2026-10-05" });
  });

  it("blocks the search while an upload date is invalid", () => {
    renderBar();
    fireEvent.change(screen.getByRole("textbox", { name: "อัปโหลดถึง" }), { target: { value: "99/99/2026" } });
    expect(screen.getByRole("button", { name: /^ค้นหา$/ })).toBeDisabled();
  });

  it("searches from the upload-from day to today instead of the keyed-date range", () => {
    const { onSearch } = renderBar();
    const from = screen.getByRole("textbox", { name: "อัปโหลดตั้งแต่" });
    fireEvent.change(from, { target: { value: "01/10/2026" } });
    fireEvent.blur(from);

    expect(screen.getAllByRole("textbox", { name: "กรอกวันที่" }).every((input) => (input as HTMLInputElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /^ค้นหา$/ }));
    const { startDate, endDate } = onSearch.mock.calls[0][0];
    expect(startDate).toEqual(new Date(2026, 9, 1));
    expect(endDate.toDateString()).toBe(new Date().toDateString());
  });
});

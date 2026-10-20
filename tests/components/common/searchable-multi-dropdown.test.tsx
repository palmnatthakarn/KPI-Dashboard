import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { SearchableMultiDropdown } from "@/components/common/searchable-multi-dropdown";

const items = [
  { id: "a", label: "ณัฐกานต์" },
  { id: "b", label: "พัชรี" },
  { id: "c", label: "สมชาย" },
];

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <SearchableMultiDropdown items={items} selectedIds={selected} onChange={setSelected} placeholder="ค้นหาพนักงาน..." allLabel="พนักงานทั้งหมด" />
  );
}

describe("SearchableMultiDropdown search text", () => {
  it("clears the typed search after picking an item, keeping the list open for the next search", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /พนักงานทั้งหมด/ }));
    const input = screen.getByPlaceholderText("ค้นหาพนักงาน...");

    fireEvent.change(input, { target: { value: "พัช" } });
    expect(screen.queryByRole("button", { name: "ณัฐกานต์" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "พัชรี" }));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "ณัฐกานต์" })).toBeInTheDocument();
  });

  it("starts with an empty search when reopened", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: /พนักงานทั้งหมด/ });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText("ค้นหาพนักงาน..."), { target: { value: "สม" } });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.getByPlaceholderText("ค้นหาพนักงาน...")).toHaveValue("");
  });
});

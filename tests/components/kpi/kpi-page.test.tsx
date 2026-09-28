import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useKpiCombined } from "@/hooks/use-kpi-combined";
import KpiPage from "@/app/(app)/kpi/page";
import { makeEmployee } from "../../utils/kpi-fixtures";

vi.mock("@/hooks/use-kpi-combined", () => ({ useKpiCombined: vi.fn() }));

vi.mock("@/lib/employee/employee-mapping-service", () => ({
  useEmployeeMappings: vi.fn(() => ({})),
  getDisplayName: (name: string) => name,
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (state: { username: string | null }) => unknown) =>
    selector({ username: "tester" }),
}));

// KpiFilterBar and KpiTable are heavy presentational components (calendar
// popovers, react-hook-form, tanstack table) with no bearing on the
// page-level branching under test here (loading/error/retry-banner/stale
// data), so they're stubbed to keep these tests focused and fast.
vi.mock("@/components/kpi/kpi-filter-bar", () => ({
  KpiFilterBar: () => <div data-testid="kpi-filter-bar" />,
}));
vi.mock("@/components/kpi/kpi-table", () => ({
  KpiTable: ({ employees }: { employees: Array<{ name: string }> }) => (
    <div data-testid="kpi-table">{employees.map((e) => e.name).join(",")}</div>
  ),
}));

const mockedUseKpiCombined = vi.mocked(useKpiCombined);

const DEFAULT_FILTERS = {
  shopIds: [] as string[],
  shopNames: [] as string[],
  startDate: new Date(2024, 0, 1),
  endDate: new Date(2024, 0, 31),
  employeeNames: [] as string[],
};

const ZERO_SUMMARY = {
  totalDocuments: 0,
  totalUploaded: 0,
  remainingDocuments: 0,
  waitingVerify: 0,
  requiredToRecordDocuments: 0,
  totalJournalsCombined: 0,
  totalOcrAnalyzed: 0,
};

function mockHook(overrides: Partial<ReturnType<typeof useKpiCombined>> = {}) {
  mockedUseKpiCombined.mockReturnValue({
    filters: DEFAULT_FILTERS,
    setFilters: vi.fn(),
    applyFilters: vi.fn(),
    resetFilters: vi.fn(),
    refresh: vi.fn(),
    hasSearched: true,
    shops: [],
    shopsLoading: false,
    employees: [],
    employeeNames: [],
    filteredEmployees: [],
    summary: ZERO_SUMMARY,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    incompleteShops: [],
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("KpiPage", () => {
  it("shows the KPI loading skeleton while the initial search is in flight", () => {
    mockHook({ isLoading: true });

    render(<KpiPage />);

    expect(screen.getByText("กำลังรวบรวมข้อมูล KPI")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-table")).not.toBeInTheDocument();
  });

  it("shows the full-page error state (not the table) when a search fails with no cached data", () => {
    const refresh = vi.fn();
    mockHook({
      isError: true,
      error: new Error("network down"),
      employees: [],
      filteredEmployees: [],
      refresh,
    });

    render(<KpiPage />);

    expect(screen.getByText("โหลดข้อมูลไม่สำเร็จ")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-table")).not.toBeInTheDocument();
    // The (!isError || hasCachedKpiData) gate must hide the summary cards too.
    expect(screen.queryByText("จำนวนบิลทั้งหมด")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps showing stale summary/table data behind a retry banner when a refresh fails", () => {
    const refresh = vi.fn();
    const staleEmployees = [makeEmployee("Alice", { totalDocuments: 42 })];
    mockHook({
      isError: true,
      isLoading: false,
      employees: staleEmployees,
      filteredEmployees: staleEmployees,
      summary: { ...ZERO_SUMMARY, totalDocuments: 42 },
      refresh,
    });

    render(<KpiPage />);

    // Full-page error must NOT show — stale data takes over instead.
    expect(screen.queryByText("โหลดข้อมูลไม่สำเร็จ")).not.toBeInTheDocument();

    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner).toHaveTextContent("อัปเดตข้อมูลล่าสุดไม่สำเร็จ");
    expect(banner).toHaveTextContent("กำลังแสดงข้อมูลก่อนหน้า");

    // Stale table data is still rendered underneath the banner.
    expect(screen.getByTestId("kpi-table")).toHaveTextContent("Alice");
    // Summary cards render too (ready, since isLoading is false), with the
    // stale total still showing.
    expect(screen.getByText("จำนวนบิลทั้งหมด")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();

    fireEvent.click(within(banner).getByRole("button", { name: "ลองใหม่" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the empty 'search to begin' state before any search has run", () => {
    mockHook({ hasSearched: false });

    render(<KpiPage />);

    expect(screen.getByText("เลือกช่วงวันที่แล้วกดค้นหาเพื่อดู KPI")).toBeInTheDocument();
    expect(screen.queryByTestId("kpi-table")).not.toBeInTheDocument();
  });
});

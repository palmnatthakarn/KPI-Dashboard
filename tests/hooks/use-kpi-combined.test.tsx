import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useKpiCombined } from "@/hooks/use-kpi-combined";
import {
  fetchKpiCombinedData,
  getCurrentMonthRange,
  listKpiShops,
} from "@/lib/kpi/kpi-combined-service";
import { useKnownEmployees } from "@/lib/employee/employee-mapping-service";
import { makeEmployee } from "../utils/kpi-fixtures";

vi.mock("@/lib/kpi/kpi-combined-service", () => ({
  fetchKpiCombinedData: vi.fn(),
  listKpiShops: vi.fn(),
  getCurrentMonthRange: vi.fn(),
}));

vi.mock("@/lib/employee/employee-mapping-service", () => ({
  useKnownEmployees: vi.fn(),
}));

const mockedFetchKpiCombinedData = vi.mocked(fetchKpiCombinedData);
const mockedListKpiShops = vi.mocked(listKpiShops);
const mockedGetCurrentMonthRange = vi.mocked(getCurrentMonthRange);
const mockedUseKnownEmployees = vi.mocked(useKnownEmployees);

const FIXED_RANGE = {
  startDate: new Date(2024, 0, 1),
  endDate: new Date(2024, 0, 31),
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.resetAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockedGetCurrentMonthRange.mockReturnValue(FIXED_RANGE);
  mockedListKpiShops.mockResolvedValue([]);
  mockedUseKnownEmployees.mockReturnValue([]);
});

describe("useKpiCombined", () => {
  // Gap identified in review: the "all employees show on load" fix relies on
  // employeeNames being the union of the reactive Firestore-backed
  // useKnownEmployees() store and the (search-gated) dataQuery results. This
  // asserts the union works with an empty dataQuery, i.e. before any search.
  it("populates employeeNames from the Firestore-backed store before any search has run", () => {
    mockedUseKnownEmployees.mockReturnValue(["Bob", "Alice"]);

    const { result } = renderHook(() => useKpiCombined(), { wrapper });

    expect(result.current.hasSearched).toBe(false);
    expect(result.current.employees).toEqual([]);
    expect(result.current.employeeNames).toEqual(["Alice", "Bob"]);
    expect(mockedFetchKpiCombinedData).not.toHaveBeenCalled();
  });

  it("merges known employees with fetched employees and dedupes/sorts them once a search has run", async () => {
    mockedUseKnownEmployees.mockReturnValue(["Zoe"]);
    mockedFetchKpiCombinedData.mockResolvedValue({
      employees: [makeEmployee("Alice"), makeEmployee("Zoe")],
      activeDocumentTotal: 0,
      shops: [],
      incompleteShops: [],
    });

    const { result } = renderHook(() => useKpiCombined(), { wrapper });

    act(() => {
      result.current.applyFilters({});
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // "Zoe" appears in both sources and must not be duplicated.
    expect(result.current.employeeNames).toEqual(["Alice", "Zoe"]);
  });

  // Gap identified in review: applyFilters() shallow-merges `next` into the
  // existing filters, so a date-only re-search must not silently drop a
  // previously selected employee filter.
  it("keeps the selected employee filter intact when only the date range is changed afterwards", async () => {
    mockedFetchKpiCombinedData.mockResolvedValue({
      employees: [makeEmployee("Alice"), makeEmployee("Bob")],
      activeDocumentTotal: 0,
      shops: [],
      incompleteShops: [],
    });

    const { result } = renderHook(() => useKpiCombined(), { wrapper });

    act(() => {
      result.current.applyFilters({ employeeNames: ["Alice"] });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filters.employeeNames).toEqual(["Alice"]);
    expect(result.current.filteredEmployees.map((e) => e.name)).toEqual(["Alice"]);

    act(() => {
      result.current.applyFilters({
        startDate: new Date(2024, 1, 1),
        endDate: new Date(2024, 1, 29),
      });
    });

    await waitFor(() => expect(mockedFetchKpiCombinedData).toHaveBeenCalledTimes(2));
    // The date-range change produces a new query key, so the query goes
    // through a fresh loading phase before `employees`/`filteredEmployees`
    // repopulate — wait for that to settle before asserting on them.
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filters.employeeNames).toEqual(["Alice"]);
    expect(result.current.filteredEmployees.map((e) => e.name)).toEqual(["Alice"]);
  });

  it("no-ops refresh() before a search has run", () => {
    const { result } = renderHook(() => useKpiCombined(), { wrapper });

    act(() => {
      result.current.refresh();
    });

    expect(mockedFetchKpiCombinedData).not.toHaveBeenCalled();
  });

  // Gap identified in review: refresh() used to bump forceRefreshToken into
  // the query key, which created a brand-new cache entry (losing the old
  // data on the very first render of a refetch). It now writes to a ref the
  // queryFn reads once and refetches the SAME key. This proves the fix:
  // the stale data must remain visible (React Query's default
  // keep-previous-data-during-refetch behavior) while the refetch is in
  // flight, and forceRefresh must be true only on the refresh() call.
  it("refetches on the same query key and keeps the previous data visible while refresh() is in flight", async () => {
    const firstBatch = [makeEmployee("Alice", { totalDocuments: 5 })];
    const secondBatch = [makeEmployee("Alice", { totalDocuments: 9 })];

    mockedFetchKpiCombinedData.mockResolvedValueOnce({
      employees: firstBatch,
      activeDocumentTotal: 0,
      shops: [],
      incompleteShops: [],
    });

    const { result } = renderHook(() => useKpiCombined(), { wrapper });

    act(() => {
      result.current.applyFilters({});
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.employees).toEqual(firstBatch);
    expect(mockedFetchKpiCombinedData).toHaveBeenCalledTimes(1);
    expect(mockedFetchKpiCombinedData.mock.calls[0]![0].forceRefresh).toBe(false);

    let resolveSecond!: (value: Awaited<ReturnType<typeof fetchKpiCombinedData>>) => void;
    const secondPromise = new Promise<Awaited<ReturnType<typeof fetchKpiCombinedData>>>((resolve) => {
      resolveSecond = resolve;
    });
    mockedFetchKpiCombinedData.mockImplementationOnce(() => secondPromise);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.isFetching).toBe(true));

    // Still the SAME query key => the old data must not be cleared while
    // the refetch is pending.
    expect(result.current.employees).toEqual(firstBatch);
    expect(result.current.isLoading).toBe(false);
    expect(mockedFetchKpiCombinedData).toHaveBeenCalledTimes(2);
    expect(mockedFetchKpiCombinedData.mock.calls[1]![0].forceRefresh).toBe(true);

    await act(async () => {
      resolveSecond({
        employees: secondBatch,
        activeDocumentTotal: 0,
        shops: [],
        incompleteShops: [],
      });
      await secondPromise;
    });

    await waitFor(() => expect(result.current.employees).toEqual(secondBatch));
    expect(result.current.isFetching).toBe(false);
  });
});

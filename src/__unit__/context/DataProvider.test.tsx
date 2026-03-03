import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DataProvider } from "../../context/DataProvider";
import { useDataContext } from "../../context/useDataContext";
import type { LatLngPoint } from "../../types";

vi.mock("../../api/overpass", () => ({
  overpassProvider: {
    fetchMultipleCategories: vi.fn(),
    availableCategories: vi.fn(() => ["restaurant", "cafe"]),
  },
}));

import { overpassProvider } from "../../api/overpass";
const mockFetchMultiple = vi.mocked(overpassProvider.fetchMultipleCategories);

function TestConsumer({ category }: { category: string }) {
  const { getPoints, loading, error } = useDataContext();
  const points = getPoints(category);
  return (
    <div>
      <span data-testid="count">{points.length}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ?? "none"}</span>
    </div>
  );
}

const DEBOUNCE_MS = 150;

async function flushDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
}

describe("DataContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches data for enabled layers after debounce", async () => {
    const points = new Map<string, LatLngPoint[]>([
      ["restaurant", [[51.5, -0.1]]],
    ]);
    mockFetchMultiple.mockResolvedValue(points);

    render(
      <DataProvider categories={["restaurant"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    // Before debounce fires, no fetch yet
    expect(mockFetchMultiple).not.toHaveBeenCalled();

    await flushDebounce();

    expect(mockFetchMultiple).toHaveBeenCalledOnce();
    expect(mockFetchMultiple.mock.calls[0][0]).toEqual(["restaurant"]);
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("does not fetch for disabled layers", async () => {
    render(
      <DataProvider categories={[]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(mockFetchMultiple).not.toHaveBeenCalled();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("batches multiple enabled categories into one fetch", async () => {
    const points = new Map<string, LatLngPoint[]>([
      ["restaurant", [[51.5, -0.1]]],
      ["cafe", [[51.6, 0.0]]],
    ]);
    mockFetchMultiple.mockResolvedValue(points);

    render(
      <DataProvider categories={["restaurant", "cafe"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(mockFetchMultiple).toHaveBeenCalledOnce();
    expect(mockFetchMultiple.mock.calls[0][0]).toEqual(["restaurant", "cafe"]);
  });

  it("serves cached data without re-fetching", async () => {
    const points = new Map<string, LatLngPoint[]>([
      ["restaurant", [[51.5, -0.1]]],
    ]);
    mockFetchMultiple.mockResolvedValue(points);

    const { rerender } = render(
      <DataProvider categories={["restaurant"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(mockFetchMultiple).toHaveBeenCalledOnce();

    // Disable then re-enable — should use cache
    rerender(
      <DataProvider categories={[]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );
    rerender(
      <DataProvider categories={["restaurant"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    // Still only one fetch — data was cached
    expect(mockFetchMultiple).toHaveBeenCalledOnce();
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("sets error on fetch failure", async () => {
    mockFetchMultiple.mockRejectedValue(new Error("Network error"));

    render(
      <DataProvider categories={["restaurant"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(screen.getByTestId("error").textContent).toBe("Network error");
  });

  it("passes AbortSignal to the provider", async () => {
    mockFetchMultiple.mockResolvedValue(new Map());

    render(
      <DataProvider categories={["restaurant"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(mockFetchMultiple).toHaveBeenCalledOnce();
    const signal = mockFetchMultiple.mock.calls[0][2];
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("ignores fetch result when signal is aborted before resolution", async () => {
    let resolvePromise!: (value: Map<string, LatLngPoint[]>) => void;
    mockFetchMultiple.mockImplementation(
      () => new Promise<Map<string, LatLngPoint[]>>((resolve) => { resolvePromise = resolve; })
    );

    const { unmount } = render(
      <DataProvider categories={["restaurant"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce(); // triggers the fetch

    // Abort by unmounting (cleanup effect calls abort.current?.abort())
    unmount();

    // Resolve after abort — the early return prevents any state update
    await act(async () => {
      resolvePromise(new Map([["restaurant", [[51.5, -0.1]]]]));
    });
  });

  it("ignores fetch error when signal is aborted before rejection", async () => {
    let rejectPromise!: (error: Error) => void;
    mockFetchMultiple.mockImplementation(
      () => new Promise<Map<string, LatLngPoint[]>>((_, reject) => { rejectPromise = reject; })
    );

    const { unmount } = render(
      <DataProvider categories={["restaurant"]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce(); // triggers the fetch

    // Abort by unmounting (cleanup effect calls abort.current?.abort())
    unmount();

    // Reject after abort — the early return prevents setError from being called
    await act(async () => {
      rejectPromise(new Error("Network error"));
    });
  });

  it("throws when useDataContext is used outside a DataProvider", () => {
    expect(() => {
      const TestError = () => {
        useDataContext();
        return null;
      };
      render(<TestError />);
    }).toThrow("useDataContext must be used within a DataProvider");
  });
});

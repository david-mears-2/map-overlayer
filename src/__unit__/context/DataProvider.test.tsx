import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { DataProvider } from "../../context/DataProvider";
import { useDataContext } from "../../context/useDataContext";
import type { HeatLayer, LatLngPoint } from "../../types";

vi.mock("../../api", () => ({
  activeProvider: {
    fetchMultipleCategories: vi.fn(),
    fetchPoints: vi.fn(),
    availableCategories: vi.fn(() => ["restaurant", "cafe"]),
  },
}));

import { activeProvider } from "../../api";
const mockFetchMultiple = vi.mocked(activeProvider.fetchMultipleCategories);

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

function makeLayer(overrides: Partial<HeatLayer> = {}): HeatLayer {
  return {
    id: "test",
    label: "Test",
    category: "restaurant",
    colour: "#ff0000",
    opacity: 0.8,
    enabled: true,
    ...overrides,
  };
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

    const layers = [makeLayer()];
    render(
      <DataProvider layers={layers}>
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
    const layers = [makeLayer({ enabled: false })];
    render(
      <DataProvider layers={layers}>
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

    const layers = [
      makeLayer({ id: "r", category: "restaurant" }),
      makeLayer({ id: "c", category: "cafe" }),
    ];
    render(
      <DataProvider layers={layers}>
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

    const layers = [makeLayer()];
    const { rerender } = render(
      <DataProvider layers={layers}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(mockFetchMultiple).toHaveBeenCalledOnce();

    // Disable then re-enable — should use cache
    rerender(
      <DataProvider layers={[makeLayer({ enabled: false })]}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );
    rerender(
      <DataProvider layers={[makeLayer({ enabled: true })]}>
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

    const layers = [makeLayer()];
    render(
      <DataProvider layers={layers}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(screen.getByTestId("error").textContent).toBe("Network error");
  });

  it("passes AbortSignal to the provider", async () => {
    mockFetchMultiple.mockResolvedValue(new Map());

    const layers = [makeLayer()];
    render(
      <DataProvider layers={layers}>
        <TestConsumer category="restaurant" />
      </DataProvider>
    );

    await flushDebounce();

    expect(mockFetchMultiple).toHaveBeenCalledOnce();
    const signal = mockFetchMultiple.mock.calls[0][2];
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});

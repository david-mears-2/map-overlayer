import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDataLayer } from "../../hooks/useDataLayer";
import type { LatLngPoint } from "../../types";

vi.mock("../../api", () => ({
  activeProvider: {
    fetchPoints: vi.fn(),
    availableCategories: vi.fn(() => ["restaurant"]),
  },
}));

import { activeProvider } from "../../api";
const mockFetchPoints = vi.mocked(activeProvider.fetchPoints);

const bbox: [number, number, number, number] = [51.28, -0.51, 51.7, 0.33];

describe("useDataLayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty state", () => {
    mockFetchPoints.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useDataLayer("restaurant", bbox, true));

    expect(result.current.points).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("fetches points on mount when enabled", async () => {
    const points: LatLngPoint[] = [
      [51.5, -0.1],
      [51.6, 0.0],
    ];
    mockFetchPoints.mockResolvedValue(points);

    const { result } = renderHook(() => useDataLayer("restaurant", bbox, true));

    await waitFor(() => {
      expect(result.current.points).toEqual(points);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetchPoints).toHaveBeenCalledWith("restaurant", bbox);
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHook(() =>
      useDataLayer("restaurant", bbox, false)
    );

    expect(mockFetchPoints).not.toHaveBeenCalled();
    expect(result.current.points).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("sets error on fetch failure", async () => {
    mockFetchPoints.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useDataLayer("restaurant", bbox, true));

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.points).toEqual([]);
  });

  it("ignores a successful response after the effect is cancelled", async () => {
    let resolveFetch!: (value: LatLngPoint[]) => void;
    mockFetchPoints.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const { result, rerender } = renderHook(
      ({ enabled }) => useDataLayer("restaurant", bbox, enabled),
      { initialProps: { enabled: true } }
    );

    // Disable the layer — cancels the in-flight fetch
    rerender({ enabled: false });

    // Now the pending promise resolves, but the effect has been cancelled
    resolveFetch([[51.5, -0.1]]);
    await vi.waitFor(() => {});

    // Points should NOT have been updated — the late response was ignored
    expect(result.current.points).toEqual([]);
  });

  it("ignores a failed response after the effect is cancelled", async () => {
    let rejectFetch!: (reason: Error) => void;
    mockFetchPoints.mockImplementation(
      () => new Promise((_, reject) => { rejectFetch = reject; })
    );

    const { result, rerender } = renderHook(
      ({ enabled }) => useDataLayer("restaurant", bbox, enabled),
      { initialProps: { enabled: true } }
    );

    // Disable the layer — cancels the in-flight fetch
    rerender({ enabled: false });

    // Now the pending promise rejects, but the effect has been cancelled
    rejectFetch(new Error("late error"));
    await vi.waitFor(() => {});

    // Error should NOT have been set — the late rejection was ignored
    expect(result.current.error).toBeNull();
  });

  it("refetches when category changes", async () => {
    const restaurantPoints: LatLngPoint[] = [[51.5, -0.1]];
    const cafePoints: LatLngPoint[] = [[51.6, 0.0]];

    mockFetchPoints
      .mockResolvedValueOnce(restaurantPoints)
      .mockResolvedValueOnce(cafePoints);

    const { result, rerender } = renderHook(
      ({ category }) => useDataLayer(category, bbox, true),
      { initialProps: { category: "restaurant" } }
    );

    await waitFor(() => {
      expect(result.current.points).toEqual(restaurantPoints);
    });

    rerender({ category: "cafe" });

    await waitFor(() => {
      expect(result.current.points).toEqual(cafePoints);
    });
    expect(mockFetchPoints).toHaveBeenCalledTimes(2);
  });
});

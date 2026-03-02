import type { LatLngPoint } from "../types";

// A common interface for data providers, e.g. Overpass, Google.
// This allows us to swap out the underlying data source.

export interface MapDataProvider {
  fetchPoints(
    category: string,
    bbox: [number, number, number, number]
  ): Promise<LatLngPoint[]>;

  fetchMultipleCategories(
    categories: string[],
    bbox: [number, number, number, number],
    signal?: AbortSignal
  ): Promise<Map<string, LatLngPoint[]>>;

  availableCategories(): string[];
}

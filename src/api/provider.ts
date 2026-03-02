import type { LatLngPoint } from "../types";

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

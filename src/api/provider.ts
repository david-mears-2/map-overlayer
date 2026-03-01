import type { LatLngPoint } from "../types";

export interface MapDataProvider {
  fetchPoints(
    category: string,
    bbox: [number, number, number, number]
  ): Promise<LatLngPoint[]>;

  availableCategories(): string[];
}

import type { MapDataProvider } from "./provider";
import type { LatLngPoint } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const CATEGORIES = [
  "restaurant",
  "cafe",
  "pub",
  "bar",
  "hospital",
  "school",
  "pharmacy",
  "park",
  "bicycle_parking",
  "place_of_worship",
];

interface OverpassElement {
  lat: number;
  lon: number;
  tags?: { amenity?: string };
}

export const overpassProvider: MapDataProvider = {
  async fetchPoints(
    category: string,
    bbox: [number, number, number, number]
  ): Promise<LatLngPoint[]> {
    const result = await this.fetchMultipleCategories([category], bbox);
    return result.get(category) ?? [];
  },

  async fetchMultipleCategories(
    categories: string[],
    bbox: [number, number, number, number],
    signal?: AbortSignal
  ): Promise<Map<string, LatLngPoint[]>> {
    const [south, west, north, east] = bbox;
    const unionParts = categories
      .map((c) => `node["amenity"="${c}"](${south},${west},${north},${east});`)
      .join("");
    // Overpass QL union: (...;...;) merges results from all sub-queries
    // into one response.  `out body` includes element tags so we can
    // split results by amenity type below.
    const query = `[out:json][timeout:25];(${unionParts});out body;`;

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    const result = new Map<string, LatLngPoint[]>();
    for (const category of categories) {
      result.set(category, []);
    }

    for (const el of data.elements as OverpassElement[]) {
      const amenity = el.tags?.amenity;
      if (amenity && result.has(amenity)) {
        result.get(amenity)!.push([el.lat, el.lon] as LatLngPoint);
      }
    }

    return result;
  },

  availableCategories(): string[] {
    return CATEGORIES;
  },
};

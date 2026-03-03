import type { MapDataProvider } from "./provider";
import type { LatLngPoint } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface CategoryDef {
  tag: string;
  value: string;
}

const CATEGORY_DEFS: Record<string, CategoryDef> = {
  restaurant: { tag: "amenity", value: "restaurant" },
  cafe: { tag: "amenity", value: "cafe" },
  pub: { tag: "amenity", value: "pub" },
  bar: { tag: "amenity", value: "bar" },
  music_venue: { tag: "amenity", value: "music_venue" },
  nature_reserve: { tag: "leisure", value: "nature_reserve" },
  park: { tag: "leisure", value: "park" },
  playground: { tag: "leisure", value: "playground" },
  station: { tag: "public_transport", value: "station" },
};

interface OverpassElement {
  lat: number;
  lon: number;
  tags?: Record<string, string>;
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
      .map((c) => {
        const def = CATEGORY_DEFS[c];
        if (!def) throw new Error(`Unknown category: ${c}`);
        return `node["${def.tag}"="${def.value}"](${south},${west},${north},${east});`;
      })
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
      throw new Error(`Overpass API error: ${response.status}, ${response.statusText}`);
    }

    const data = await response.json();

    const result = new Map<string, LatLngPoint[]>();
    for (const category of categories) {
      result.set(category, []);
    }

    for (const el of data.elements as OverpassElement[]) {
      for (const category of categories) {
        const def = CATEGORY_DEFS[category];
        if (def && el.tags?.[def.tag] === def.value) {
          result.get(category)!.push([el.lat, el.lon] as LatLngPoint);
        }
      }
    }

    return result;
  },

  availableCategories(): string[] {
    return Object.keys(CATEGORY_DEFS);
  },
};

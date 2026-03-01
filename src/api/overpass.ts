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

export const overpassProvider: MapDataProvider = {
  async fetchPoints(
    category: string,
    bbox: [number, number, number, number]
  ): Promise<LatLngPoint[]> {
    const [south, west, north, east] = bbox;
    const query = `[out:json][timeout:25];node["amenity"="${category}"](${south},${west},${north},${east});out body;`;

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    return data.elements.map(
      (el: { lat: number; lon: number }) => [el.lat, el.lon] as LatLngPoint
    );
  },

  availableCategories(): string[] {
    return CATEGORIES;
  },
};

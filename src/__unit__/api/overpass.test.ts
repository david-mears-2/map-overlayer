import { describe, it, expect, vi, beforeEach } from "vitest";
import { overpassProvider } from "../../api/overpass";

const bbox: [number, number, number, number] = [51.28, -0.51, 51.7, 0.33];

describe("overpassProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("availableCategories", () => {
    it("returns a non-empty list of strings", () => {
      const categories = overpassProvider.availableCategories();
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach((c) => expect(typeof c).toBe("string"));
    });

    it("includes common amenity types", () => {
      const categories = overpassProvider.availableCategories();
      expect(categories).toContain("restaurant");
      expect(categories).toContain("cafe");
      expect(categories).toContain("pub");
    });

    it("includes leisure and public_transport types", () => {
      const categories = overpassProvider.availableCategories();
      expect(categories).toContain("park");
      expect(categories).toContain("nature_reserve");
      expect(categories).toContain("station");
    });
  });

  describe("fetchMultipleCategories", () => {
    it("sends a union query for multiple categories", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ elements: [] }), { status: 200 })
      );

      await overpassProvider.fetchMultipleCategories(["restaurant", "cafe"], bbox);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://overpass-api.de/api/interpreter");
      expect(options?.method).toBe("POST");

      const body = options?.body as string;
      const decoded = decodeURIComponent(body.replace("data=", ""));
      expect(decoded).toContain("[out:json]");
      expect(decoded).toContain('"amenity"="restaurant"');
      expect(decoded).toContain('"amenity"="cafe"');
      expect(decoded).toMatch(/\(node.*node.*\);out body;/);
    });

    it("sends correct tag keys for non-amenity categories", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ elements: [] }), { status: 200 })
      );

      await overpassProvider.fetchMultipleCategories(["park", "station"], bbox);

      const body = mockFetch.mock.calls[0][1]?.body as string;
      const decoded = decodeURIComponent(body.replace("data=", ""));
      expect(decoded).toContain('"leisure"="park"');
      expect(decoded).toContain('"public_transport"="station"');
    });

    it("splits response elements by their tag key and value", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            elements: [
              { type: "node", id: 1, lat: 51.5, lon: -0.1, tags: { amenity: "restaurant" } },
              { type: "node", id: 2, lat: 51.6, lon: 0.0, tags: { amenity: "cafe" } },
              { type: "node", id: 3, lat: 51.7, lon: 0.1, tags: { amenity: "restaurant" } },
              { type: "node", id: 4, lat: 51.8, lon: 0.2, tags: { leisure: "park" } },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await overpassProvider.fetchMultipleCategories(
        ["restaurant", "cafe", "park"],
        bbox
      );

      expect(result.get("restaurant")).toEqual([
        [51.5, -0.1],
        [51.7, 0.1],
      ]);
      expect(result.get("cafe")).toEqual([[51.6, 0.0]]);
      expect(result.get("park")).toEqual([[51.8, 0.2]]);
    });

    it("returns empty arrays for categories with no matching elements", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ elements: [] }), { status: 200 })
      );

      const result = await overpassProvider.fetchMultipleCategories(
        ["restaurant", "cafe"],
        bbox
      );

      expect(result.get("restaurant")).toEqual([]);
      expect(result.get("cafe")).toEqual([]);
    });

    it("throws when given an unknown category", async () => {
      await expect(
        overpassProvider.fetchMultipleCategories(["unknown_category"], bbox)
      ).rejects.toThrow("Unknown category: unknown_category");
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Too many requests", { status: 429 })
      );

      await expect(
        overpassProvider.fetchMultipleCategories(["restaurant"], bbox)
      ).rejects.toThrow("Overpass API error: 429");
    });

    it("passes the abort signal to fetch", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ elements: [] }), { status: 200 })
      );

      const controller = new AbortController();
      await overpassProvider.fetchMultipleCategories(["restaurant"], bbox, controller.signal);

      expect(mockFetch.mock.calls[0][1]?.signal).toBe(controller.signal);
    });

    it("ignores elements whose tags do not match any requested category", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            elements: [
              { type: "node", id: 1, lat: 51.5, lon: -0.1, tags: { amenity: "hospital" } },
              { type: "node", id: 2, lat: 51.6, lon: 0.0, tags: { leisure: "pitch" } },
              { type: "node", id: 3, lat: 51.7, lon: 0.1, tags: {} },
              { type: "node", id: 4, lat: 51.8, lon: 0.2 },
            ],
          }),
          { status: 200 }
        )
      );

      const result = await overpassProvider.fetchMultipleCategories(["restaurant", "park"], bbox);
      expect(result.get("restaurant")).toEqual([]);
      expect(result.get("park")).toEqual([]);
    });
  });

  describe("fetchPoints", () => {
    it("delegates to fetchMultipleCategories and returns points for the category", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            elements: [
              { type: "node", id: 1, lat: 51.5, lon: -0.1, tags: { amenity: "cafe" } },
            ],
          }),
          { status: 200 }
        )
      );

      const points = await overpassProvider.fetchPoints("cafe", bbox);
      expect(points).toEqual([[51.5, -0.1]]);
    });

    it("returns empty array when the category is absent from the result map", async () => {
      vi.spyOn(overpassProvider, "fetchMultipleCategories").mockResolvedValue(new Map());

      const points = await overpassProvider.fetchPoints("restaurant", bbox);
      expect(points).toEqual([]);
    });
  });
});

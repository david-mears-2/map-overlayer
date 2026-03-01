import { describe, it, expect, vi, beforeEach } from "vitest";
import { overpassProvider } from "../../api/overpass";

describe("overpassProvider", () => {
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
      expect(categories).toContain("hospital");
    });
  });

  describe("fetchPoints", () => {
    const bbox: [number, number, number, number] = [51.28, -0.51, 51.7, 0.33];

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("sends a POST request with the correct Overpass QL query", async () => {
      const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ elements: [] }), { status: 200 })
      );

      await overpassProvider.fetchPoints("restaurant", bbox);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://overpass-api.de/api/interpreter");
      expect(options?.method).toBe("POST");

      const body = options?.body as string;
      const decoded = decodeURIComponent(body.replace("data=", ""));
      expect(decoded).toContain('"amenity"="restaurant"');
      expect(decoded).toContain("51.28,-0.51,51.7,0.33");
      expect(decoded).toContain("[out:json]");
    });

    it("extracts lat/lon from response elements", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            elements: [
              { type: "node", id: 1, lat: 51.5, lon: -0.1 },
              { type: "node", id: 2, lat: 51.6, lon: 0.0 },
            ],
          }),
          { status: 200 }
        )
      );

      const points = await overpassProvider.fetchPoints("cafe", bbox);

      expect(points).toEqual([
        [51.5, -0.1],
        [51.6, 0.0],
      ]);
    });

    it("returns an empty array when no elements are found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ elements: [] }), { status: 200 })
      );

      const points = await overpassProvider.fetchPoints("hospital", bbox);
      expect(points).toEqual([]);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Too many requests", { status: 429 })
      );

      await expect(
        overpassProvider.fetchPoints("restaurant", bbox)
      ).rejects.toThrow("Overpass API error: 429");
    });
  });
});

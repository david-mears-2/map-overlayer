import { test, expect } from "@playwright/test";

const MOCK_OVERPASS_RESPONSE = {
  elements: [
    { type: "node", id: 1, lat: 51.51, lon: -0.12, tags: { amenity: "restaurant" } },
    { type: "node", id: 2, lat: 51.52, lon: -0.08, tags: { amenity: "restaurant" } },
    { type: "node", id: 3, lat: 51.50, lon: -0.10, tags: { amenity: "restaurant" } },
  ],
};

/** Intercept Overpass API calls and return mock data immediately. */
async function mockOverpassApi(page: import("@playwright/test").Page) {
  await page.route("**/overpass-api.de/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_OVERPASS_RESPONSE),
    })
  );
}

test.describe("Map Overlayer", () => {
  test.beforeEach(async ({ page }) => {
    await mockOverpassApi(page);
  });

  test("loads the map and shows the layer panel", async ({ page }) => {
    await page.goto("/");

    // Layer panel renders
    await expect(page.getByText("Layers")).toBeVisible();
    await expect(page.getByText("Restaurants")).toBeVisible();

    // Map container renders with Leaflet tiles
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible();

    // Leaflet tile layer loads at least some tiles
    const tiles = page.locator(".leaflet-tile-loaded");
    await expect(tiles.first()).toBeVisible({ timeout: 10_000 });
  });

  test("checkbox toggles the layer off and on", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Restaurants")).toBeVisible();

    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeChecked();

    // Opacity slider is visible when layer is enabled
    const slider = page.getByRole("slider");
    await expect(slider).toBeVisible();

    // Toggle off
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();

    // Slider disappears when layer is disabled
    await expect(slider).not.toBeVisible();

    // Toggle back on
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(slider).toBeVisible();
  });

  test("opacity slider changes value", async ({ page }) => {
    await page.goto("/");

    const slider = page.getByRole("slider");
    await expect(slider).toBeVisible();

    // Default opacity is 0.8
    await expect(slider).toHaveValue("0.8");

    // Change opacity via fill
    await slider.fill("0.3");
    await expect(slider).toHaveValue("0.3");
  });

  test("heatmap canvas appears after data loads", async ({ page }) => {
    await page.goto("/");

    // Wait for the heatmap canvas to be added to the map
    // leaflet.heat creates a <canvas> inside the map pane
    const heatCanvas = page.locator(".leaflet-overlay-pane canvas");
    await expect(heatCanvas.first()).toBeAttached({ timeout: 5_000 });
  });
});

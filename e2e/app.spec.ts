import { test, expect } from "@playwright/test";

const MOCK_OVERPASS_RESTAURANT_RESPONSE = {
  elements: [
    { type: "node", id: 1, lat: 51.51, lon: -0.12, tags: { amenity: "restaurant" } },
    { type: "node", id: 2, lat: 51.52, lon: -0.08, tags: { amenity: "restaurant" } },
    { type: "node", id: 3, lat: 51.50, lon: -0.10, tags: { amenity: "restaurant" } },
  ],
};

const MOCK_OVERPASS_CAFE_RESPONSE = {
  elements: [
    { type: "node", id: 4, lat: 51.51, lon: -0.11, tags: { amenity: "cafe" } },
    { type: "node", id: 5, lat: 51.53, lon: -0.09, tags: { amenity: "cafe" } },
  ],
};

const MOCK_OVERPASS_CAFE_AND_RESTAURANT_RESPONSE = {
  elements: [
    ...MOCK_OVERPASS_RESTAURANT_RESPONSE.elements,
    ...MOCK_OVERPASS_CAFE_RESPONSE.elements,
  ],
};

/** Intercept Overpass API calls and return mock data immediately. */
async function mockOverpassApi(page: import("@playwright/test").Page) {
  await page.route("**/overpass-api.de/**", async (route) => {
    const request = route.request();

    // overpass.ts sends POST body as form data: data=<overpass query>
    const postData = request.postData() ?? "";
    const form = new URLSearchParams(postData);
    const rawQuery = form.get("data") ?? postData;
    const query = decodeURIComponent(rawQuery).toLowerCase();

    const wantsCafe =
      query.includes('"amenity"="cafe"') || query.includes("amenity=cafe");
    const wantsRestaurant =
      query.includes('"amenity"="restaurant"') || query.includes("amenity=restaurant");

    const response =
      wantsCafe && wantsRestaurant
        ? MOCK_OVERPASS_CAFE_AND_RESTAURANT_RESPONSE
        : wantsCafe
        ? MOCK_OVERPASS_CAFE_RESPONSE
        : wantsRestaurant
        ? MOCK_OVERPASS_RESTAURANT_RESPONSE
        : { elements: [] };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
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
    await expect(page.getByText("Cafés")).toBeVisible();

    // Map container renders with Leaflet tiles
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible();

    // Leaflet tile layer loads at least some tiles
    const tiles = page.locator(".leaflet-tile-loaded");
    await expect(tiles.first()).toBeVisible({ timeout: 10_000 });
  });

  test("checkbox toggles the layer off and on", async ({ page }) => {
    await page.goto("/");

    const restaurantCheckbox = page.getByRole("checkbox", { name: "Restaurants" });
    await expect(restaurantCheckbox).toBeChecked();

    const cafeCheckbox = page.getByRole("checkbox", { name: "Cafés" });
    await expect(cafeCheckbox).not.toBeChecked();

    // Opacity slider is visible when layer is enabled.
    // Only one layer is enabled, so only one slider is visible.
    const slider = page.getByRole("slider");
    await expect(slider).toBeVisible();

    // Toggle off
    await restaurantCheckbox.click();
    await expect(restaurantCheckbox).not.toBeChecked();

    // Slider disappears when layer is disabled
    await expect(slider).not.toBeVisible();

    // Heatmap layer is removed from the map when disabled
    const heatCanvas = page.locator(".leaflet-overlay-pane canvas");
    await expect(heatCanvas.first()).not.toBeAttached({ timeout: 5_000 });

    // Toggle back on
    await restaurantCheckbox.click();
    await expect(restaurantCheckbox).toBeChecked();
    await expect(slider).toBeVisible();
    await expect(heatCanvas.first()).toBeAttached({ timeout: 5_000 });
  });

  test("multiple layers can be enabled simultaneously", async ({ page }) => {
    await page.goto("/");

    // Enable second layer
    const cafeCheckbox = page.getByRole("checkbox", { name: "Cafés" });
    await cafeCheckbox.click();
    await expect(cafeCheckbox).toBeChecked();

    // Both heatmap layers are present on the map
    const heatCanvas = page.locator(".leaflet-overlay-pane canvas");
    await expect(heatCanvas.nth(0)).toBeAttached({ timeout: 5_000 });
    await expect(heatCanvas.nth(1)).toBeAttached({ timeout: 5_000 });
  });

  test("opacity slider changes value", async ({ page }) => {
    await page.goto("/");

    const slider = page.getByRole("slider");
    await expect(slider).toBeVisible();

    // Default opacity is 0.8
    await expect(slider).toHaveValue("0.8");
    const heatCanvas = page.locator(".leaflet-overlay-pane canvas").first();
    await expect(heatCanvas).toHaveCSS("opacity", "0.8");

    // Change opacity via fill
    await slider.fill("0.3");
    await expect(slider).toHaveValue("0.3");
    await expect(heatCanvas).toHaveCSS("opacity", "0.3");
  });

  test("heatmap canvas appears after data loads", async ({ page }) => {
    await page.goto("/");

    // Wait for the heatmap canvas to be added to the map
    // leaflet.heat creates a <canvas> inside the map pane
    const heatCanvas = page.locator(".leaflet-overlay-pane canvas");
    await expect(heatCanvas.first()).toBeAttached({ timeout: 5_000 });
  });
});

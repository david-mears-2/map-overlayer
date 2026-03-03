import { test, expect } from "@playwright/test";

/** Maps category ID → { tag key, mock elements } for the Overpass mock. */
const MOCK_CATEGORIES: Record<string, { tag: string; elements: object[] }> = {
  restaurant: {
    tag: "amenity",
    elements: [
      { type: "node", id: 1, lat: 51.51, lon: -0.12, tags: { amenity: "restaurant" } },
      { type: "node", id: 2, lat: 51.52, lon: -0.08, tags: { amenity: "restaurant" } },
      { type: "node", id: 3, lat: 51.50, lon: -0.10, tags: { amenity: "restaurant" } },
    ],
  },
  cafe: {
    tag: "amenity",
    elements: [
      { type: "node", id: 4, lat: 51.51, lon: -0.11, tags: { amenity: "cafe" } },
      { type: "node", id: 5, lat: 51.53, lon: -0.09, tags: { amenity: "cafe" } },
    ],
  },
  pub: {
    tag: "amenity",
    elements: [
      { type: "node", id: 6, lat: 51.49, lon: -0.13, tags: { amenity: "pub" } },
    ],
  },
  park: {
    tag: "leisure",
    elements: [
      { type: "node", id: 7, lat: 51.48, lon: -0.07, tags: { leisure: "park" } },
      { type: "node", id: 8, lat: 51.54, lon: -0.05, tags: { leisure: "park" } },
    ],
  },
};

/** Intercept Overpass API calls and return only the elements matching the requested categories. */
async function mockOverpassApi(page: import("@playwright/test").Page) {
  await page.route("**/overpass-api.de/**", async (route) => {
    const postData = route.request().postData() ?? "";
    const form = new URLSearchParams(postData);
    const rawQuery = form.get("data") ?? postData;
    const query = decodeURIComponent(rawQuery).toLowerCase();

    const elements = Object.entries(MOCK_CATEGORIES)
      .filter(([category, { tag }]) =>
        query.includes(`"${tag}"="${category}"`) || query.includes(`${tag}=${category}`)
      )
      .flatMap(([, { elements: els }]) => els);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ elements }),
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
    await expect(page.getByText("Pubs")).toBeVisible();
    await expect(page.getByText("Parks")).toBeVisible();
    await expect(page.getByText("Stations")).toBeVisible();

    // Map container renders with Leaflet tiles
    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible();

    // Leaflet tile layer loads at least some tiles
    const tiles = page.locator(".leaflet-tile-loaded");
    await expect(tiles.first()).toBeVisible({ timeout: 10_000 });
  });

  test("checkbox toggles the layer off and on", async ({ page }) => {
    await page.goto("/");

    const checkboxes = page.getByRole("checkbox");
    const restaurantCheckbox = checkboxes.nth(0);
    await expect(restaurantCheckbox).toBeChecked();

    // Circle markers appear for enabled layers
    const overlayPaths = page.locator(".leaflet-overlay-pane path");
    await expect(overlayPaths.first()).toBeAttached({ timeout: 5_000 });
    const initialCount = await overlayPaths.count();
    expect(initialCount).toBeGreaterThan(0);

    // Toggle off
    await restaurantCheckbox.click();
    await expect(restaurantCheckbox).not.toBeChecked();

    // Some markers should be removed (3 restaurant markers gone)
    await expect(overlayPaths).toHaveCount(initialCount - 3, { timeout: 5_000 });

    // Toggle back on
    await restaurantCheckbox.click();
    await expect(restaurantCheckbox).toBeChecked();
    await expect(overlayPaths).toHaveCount(initialCount, { timeout: 5_000 });
  });

  test("style options expand and collapse", async ({ page }) => {
    await page.goto("/");

    // Style options buttons are visible for enabled layers
    const styleButtons = page.getByRole("button", { name: "Style options" });
    await expect(styleButtons.first()).toBeVisible();

    // No sliders visible initially
    await expect(page.getByRole("slider")).not.toBeVisible();

    // Click Style options to expand
    await styleButtons.first().click();

    // Opacity and radius sliders appear
    const sliders = page.getByRole("slider");
    await expect(sliders.nth(0)).toBeVisible();
    await expect(sliders.nth(1)).toBeVisible();

    // Click again to collapse
    await styleButtons.first().click();
    await expect(sliders.nth(0)).not.toBeVisible();
  });

  test("opacity slider changes value", async ({ page }) => {
    await page.goto("/");

    // Expand style options for first layer
    const styleButtons = page.getByRole("button", { name: "Style options" });
    await styleButtons.first().click();

    const slider = page.getByRole("slider").first();
    await expect(slider).toBeVisible();

    // Default opacity is 0.8 but max is 0.75, so browser clamps to 0.75
    await expect(slider).toHaveValue("0.75");

    // Change opacity (must be a valid step from min=0.025, step=0.025)
    await slider.fill("0.25");
    await expect(slider).toHaveValue("0.25");
  });

  test("radius slider changes value", async ({ page }) => {
    await page.goto("/");

    // Expand style options for first layer
    const styleButtons = page.getByRole("button", { name: "Style options" });
    await styleButtons.first().click();

    // Second slider is radius
    const radiusSlider = page.getByRole("slider").nth(1);
    await expect(radiusSlider).toBeVisible();

    // Default radius is 2
    await expect(radiusSlider).toHaveValue("2");

    // Change radius
    await radiusSlider.fill("7");
    await expect(radiusSlider).toHaveValue("7");
  });

  test("toggling a layer off removes its markers and toggling back on restores them", async ({ page }) => {
    await page.goto("/");

    const overlayPaths = page.locator(".leaflet-overlay-pane path");
    await expect(overlayPaths.first()).toBeAttached({ timeout: 5_000 });
    const countBefore = await overlayPaths.count();

    // Disable the third layer (Pubs — enabled by default)
    const pubsCheckbox = page.getByRole("checkbox").nth(2);
    await expect(pubsCheckbox).toBeChecked();
    await pubsCheckbox.click();
    await expect(pubsCheckbox).not.toBeChecked();

    // One pub marker should disappear
    await expect(overlayPaths).toHaveCount(countBefore - 1, { timeout: 5_000 });

    // Re-enable — markers should return
    await pubsCheckbox.click();
    await expect(pubsCheckbox).toBeChecked();
    await expect(overlayPaths).toHaveCount(countBefore, { timeout: 5_000 });
  });

  test("toggling a non-amenity layer (parks) off removes its markers and toggling back on restores them", async ({ page }) => {
    await page.goto("/");

    const overlayPaths = page.locator(".leaflet-overlay-pane path");
    await expect(overlayPaths.first()).toBeAttached({ timeout: 5_000 });
    const countBefore = await overlayPaths.count();

    // Disable Parks layer (uses leisure tag, not amenity)
    const parksCheckbox = page.getByRole("checkbox", { name: "Parks" });
    await expect(parksCheckbox).toBeChecked();
    await parksCheckbox.click();
    await expect(parksCheckbox).not.toBeChecked();

    // Two park markers should disappear
    await expect(overlayPaths).toHaveCount(countBefore - 2, { timeout: 5_000 });

    // Re-enable — markers should return
    await parksCheckbox.click();
    await expect(parksCheckbox).toBeChecked();
    await expect(overlayPaths).toHaveCount(countBefore, { timeout: 5_000 });
  });

  test("circle markers appear after data loads", async ({ page }) => {
    await page.goto("/");

    // Wait for circle marker paths to appear in the overlay pane
    const overlayPaths = page.locator(".leaflet-overlay-pane path");
    await expect(overlayPaths.first()).toBeAttached({ timeout: 5_000 });
  });
});

import { test, expect } from "@playwright/test";

const MOCK_ELEMENTS = {
  restaurant: [
    { type: "node", id: 1, lat: 51.51, lon: -0.12, tags: { amenity: "restaurant" } },
    { type: "node", id: 2, lat: 51.52, lon: -0.08, tags: { amenity: "restaurant" } },
    { type: "node", id: 3, lat: 51.50, lon: -0.10, tags: { amenity: "restaurant" } },
  ],
  cafe: [
    { type: "node", id: 4, lat: 51.51, lon: -0.11, tags: { amenity: "cafe" } },
    { type: "node", id: 5, lat: 51.53, lon: -0.09, tags: { amenity: "cafe" } },
  ],
  pub: [
    { type: "node", id: 6, lat: 51.49, lon: -0.13, tags: { amenity: "pub" } },
  ],
};

/** Intercept Overpass API calls and return only the elements matching the requested categories. */
async function mockOverpassApi(page: import("@playwright/test").Page) {
  await page.route("**/overpass-api.de/**", async (route) => {
    const postData = route.request().postData() ?? "";
    const form = new URLSearchParams(postData);
    const rawQuery = form.get("data") ?? postData;
    const query = decodeURIComponent(rawQuery).toLowerCase();

    const elements = Object.entries(MOCK_ELEMENTS)
      .filter(([category]) =>
        query.includes(`"amenity"="${category}"`) || query.includes(`amenity=${category}`)
      )
      .flatMap(([, els]) => els);

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

  test("enabling a disabled layer adds its markers to the map", async ({ page }) => {
    await page.goto("/");

    const overlayPaths = page.locator(".leaflet-overlay-pane path");
    await expect(overlayPaths.first()).toBeAttached({ timeout: 5_000 });
    const countBefore = await overlayPaths.count();

    // Enable the third layer (Pubs — disabled by default)
    const pubsCheckbox = page.getByRole("checkbox").nth(2);
    await expect(pubsCheckbox).not.toBeChecked();
    await pubsCheckbox.click();
    await expect(pubsCheckbox).toBeChecked();

    // One additional pub marker should appear
    await expect(overlayPaths).toHaveCount(countBefore + 1, { timeout: 5_000 });
  });

  test("circle markers appear after data loads", async ({ page }) => {
    await page.goto("/");

    // Wait for circle marker paths to appear in the overlay pane
    const overlayPaths = page.locator(".leaflet-overlay-pane path");
    await expect(overlayPaths.first()).toBeAttached({ timeout: 5_000 });
  });
});

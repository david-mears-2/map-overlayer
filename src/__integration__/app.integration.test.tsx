/**
 * Integration tests: render the real App component tree with only the
 * network boundary (fetch) mocked. This exercises the wiring between
 * App → MapView → DataProvider → overpassProvider → fetch.
 *
 * Leaflet's canvas-based rendering won't produce visible pixels in jsdom,
 * but we can verify that:
 *   - the layer panel renders with the correct initial state
 *   - toggling/opacity controls update state correctly
 *   - fetch is called with a batched Overpass union query when layers are enabled
 *   - disabling a layer does not trigger a new fetch
 *   - re-enabling a layer uses cached data without re-fetching
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../App";

const OVERPASS_RESPONSE = {
  elements: [
    { type: "node", id: 1, lat: 51.51, lon: -0.12, tags: { amenity: "restaurant" } },
    { type: "node", id: 2, lat: 51.52, lon: -0.08, tags: { amenity: "restaurant" } },
    { type: "node", id: 3, lat: 51.50, lon: -0.10, tags: { amenity: "restaurant" } },
  ],
};

const OVERPASS_MULTI_RESPONSE = {
  elements: [
    { type: "node", id: 1, lat: 51.51, lon: -0.12, tags: { amenity: "restaurant" } },
    { type: "node", id: 2, lat: 51.52, lon: -0.08, tags: { amenity: "restaurant" } },
    { type: "node", id: 4, lat: 51.51, lon: -0.11, tags: { amenity: "cafe" } },
    { type: "node", id: 5, lat: 51.53, lon: -0.09, tags: { amenity: "cafe" } },
  ],
};

const DEBOUNCE_MS = 150;

beforeEach(() => {
  vi.useFakeTimers();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

function mockFetchSuccess() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(OVERPASS_RESPONSE), { status: 200 })
  );
}

async function flushDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
}

/** Get the checkbox for a named layer (e.g. "Restaurants"). */
function getCheckbox(layerName: string) {
  return screen.getByRole("checkbox", { name: layerName });
}

describe("App integration", () => {
  it("renders the layer panel with both layers", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<App />);

    expect(screen.getByText("Layers")).toBeInTheDocument();
    expect(screen.getByText("Restaurants")).toBeInTheDocument();
    expect(screen.getByText("Cafés")).toBeInTheDocument();
    expect(getCheckbox("Restaurants")).toBeChecked();
    expect(getCheckbox("Cafés")).not.toBeChecked();
    // Only the enabled layer shows an opacity slider
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("fetches restaurant data from Overpass on mount", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await flushDebounce();

    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    const body = decodeURIComponent((options?.body as string).replace("data=", ""));
    expect(body).toContain('"amenity"="restaurant"');
    expect(body).toContain("[out:json]");
  });

  it("does not fetch when the layer is toggled off", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await flushDebounce();

    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockClear();

    // Toggle restaurants off
    fireEvent.click(getCheckbox("Restaurants"));

    // Slider should disappear when no layers are enabled
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    await flushDebounce();

    // No new fetch should have been made
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("re-enables the layer and uses cached data without re-fetching", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await flushDebounce();

    expect(fetchSpy).toHaveBeenCalledOnce();

    // Toggle restaurants off then on
    fireEvent.click(getCheckbox("Restaurants"));
    fireEvent.click(getCheckbox("Restaurants"));

    await flushDebounce();

    // Still only one fetch — data was cached
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("opacity slider updates without re-fetching", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await flushDebounce();

    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockClear();

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.5" } });

    // Slider value should update
    expect(slider).toHaveValue("0.5");

    await flushDebounce();

    // No additional fetch
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows a loading indicator while data is being fetched", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {})); // never resolves
    render(<App />);

    await flushDebounce();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("hides the loading indicator after data finishes loading", async () => {
    mockFetchSuccess();
    render(<App />);

    await flushDebounce();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("enabling multiple layers sends a single batched fetch for all categories", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(OVERPASS_MULTI_RESPONSE), { status: 200 })
    );
    render(<App />);

    // Enable the second layer (Cafés)
    fireEvent.click(screen.getByRole("checkbox", { name: "Cafés" }));

    await flushDebounce();

    // A single fetch should be made containing both categories
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    const body = decodeURIComponent((options?.body as string).replace("data=", ""));
    expect(body).toContain('"amenity"="restaurant"');
    expect(body).toContain('"amenity"="cafe"');

    // Both layers should show opacity sliders
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });
});

/**
 * Integration tests: render the real App component tree with only the
 * network boundary (fetch) mocked. This exercises the wiring between
 * App → MapView → DataProvider → overpassProvider → fetch.
 *
 * Leaflet's rendering won't produce visible pixels in jsdom,
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
import type { HeatLayer } from "../types";

/** A minimal two-layer fixture for focused integration tests. */
const TWO_LAYERS: HeatLayer[] = [
  {
    id: "restaurants",
    label: "Restaurants",
    category: "restaurant",
    colour: "red",
    opacity: 0.8,
    pointRadius: 2,
    enabled: true,
  },
  {
    id: "cafes",
    label: "Cafés",
    category: "cafe",
    colour: "blue",
    opacity: 0.8,
    pointRadius: 2,
    enabled: false,
  },
];

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

describe("App integration", () => {
  it("renders the layer panel with all layers", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<App initialLayers={TWO_LAYERS} />);

    expect(screen.getByText("Layers")).toBeInTheDocument();
    expect(screen.getByText("Restaurants")).toBeInTheDocument();
    expect(screen.getByText("Cafés")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();

    // Style options button only shown for the enabled layer
    const styleButtons = screen.getAllByRole("button", { name: "Style options" });
    expect(styleButtons).toHaveLength(1);

    // No sliders visible until Style options is clicked
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("fetches restaurant data from Overpass on mount", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App initialLayers={TWO_LAYERS} />);

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
    render(<App initialLayers={TWO_LAYERS} />);

    await flushDebounce();

    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockClear();

    // Toggle restaurants off
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    // Style options button should disappear when no layers are enabled
    expect(screen.queryByRole("button", { name: "Style options" })).not.toBeInTheDocument();

    await flushDebounce();

    // No new fetch should have been made
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("re-enables the layer and uses cached data without re-fetching", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App initialLayers={TWO_LAYERS} />);

    await flushDebounce();

    expect(fetchSpy).toHaveBeenCalledOnce();

    // Toggle restaurants off then on
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[0]);

    await flushDebounce();

    // Still only one fetch — data was cached
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("opacity slider updates without re-fetching", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App initialLayers={TWO_LAYERS} />);

    await flushDebounce();

    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockClear();

    // Open style options to reveal sliders
    fireEvent.click(screen.getByRole("button", { name: "Style options" }));

    const sliders = screen.getAllByRole("slider");
    // First slider is opacity
    fireEvent.change(sliders[0], { target: { value: "0.5" } });

    expect(sliders[0]).toHaveValue("0.5");

    await flushDebounce();

    // No additional fetch
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows a loading indicator while data is being fetched", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {})); // never resolves
    render(<App initialLayers={TWO_LAYERS} />);

    await flushDebounce();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("hides the loading indicator after data finishes loading", async () => {
    mockFetchSuccess();
    render(<App initialLayers={TWO_LAYERS} />);

    await flushDebounce();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("enabling multiple layers sends a single batched fetch for all categories", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(OVERPASS_MULTI_RESPONSE), { status: 200 })
    );
    render(<App initialLayers={TWO_LAYERS} />);

    // Enable the second layer (Cafés)
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    await flushDebounce();

    // A single fetch should be made containing both categories
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    const body = decodeURIComponent((options?.body as string).replace("data=", ""));
    expect(body).toContain('"amenity"="restaurant"');
    expect(body).toContain('"amenity"="cafe"');

    // Both layers now have Style options buttons
    expect(screen.getAllByRole("button", { name: "Style options" })).toHaveLength(2);
  });
});

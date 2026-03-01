/**
 * Integration tests: render the real App component tree with only the
 * network boundary (fetch) mocked. This exercises the wiring between
 * App → MapView → DataLayer → useDataLayer → overpassProvider → fetch.
 *
 * Leaflet's canvas-based rendering won't produce visible pixels in jsdom,
 * but we can verify that:
 *   - the layer panel renders with the correct initial state
 *   - toggling/opacity controls update state correctly
 *   - fetch is called with the right Overpass query when a layer is enabled
 *   - disabling a layer does not trigger a fetch
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../App";

const OVERPASS_RESPONSE = {
  elements: [
    { type: "node", id: 1, lat: 51.51, lon: -0.12 },
    { type: "node", id: 2, lat: 51.52, lon: -0.08 },
    { type: "node", id: 3, lat: 51.50, lon: -0.10 },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetchSuccess() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(OVERPASS_RESPONSE), { status: 200 })
  );
}

describe("App integration", () => {
  it("renders the layer panel with the default restaurant layer", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<App />);

    expect(screen.getByText("Layers")).toBeInTheDocument();
    expect(screen.getByText("Restaurants")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("fetches restaurant data from Overpass on mount", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://overpass-api.de/api/interpreter");
    const body = decodeURIComponent((options?.body as string).replace("data=", ""));
    expect(body).toContain('"amenity"="restaurant"');
    expect(body).toContain("[out:json]");
  });

  it("does not fetch when the layer is toggled off", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    fetchSpy.mockClear();

    // Toggle the layer off
    fireEvent.click(screen.getByRole("checkbox"));

    // Slider should disappear when layer is disabled
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    // No new fetch should have been made
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("re-enables the layer and re-fetches", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    // Toggle off then on
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("opacity slider updates without re-fetching", async () => {
    const fetchSpy = mockFetchSuccess();
    render(<App />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    fetchSpy.mockClear();

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.5" } });

    // Slider value should update
    expect(slider).toHaveValue("0.5");
    // No additional fetch
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

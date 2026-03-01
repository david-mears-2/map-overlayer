import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../App";
import type { HeatLayer } from "../types";

// Mock MapView to avoid Leaflet canvas dependencies in unit tests
vi.mock("../components/MapView", () => ({
  MapView: () => <div data-testid="map-view" />,
}));

const TWO_LAYERS: HeatLayer[] = [
  {
    id: "restaurants",
    label: "Restaurants",
    category: "restaurant",
    colour: "#e63946",
    opacity: 0.8,
    enabled: true,
  },
  {
    id: "cafes",
    label: "Cafes",
    category: "cafe",
    colour: "#457b9d",
    opacity: 0.6,
    enabled: true,
  },
];

describe("App with multiple layers", () => {
  it("toggles only the targeted layer, leaving others unchanged", () => {
    render(<App initialLayers={TWO_LAYERS} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();

    // Toggle only "Restaurants" — exercises both branches of the ternary
    fireEvent.click(checkboxes[0]);

    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it("changes opacity of only the targeted layer, leaving others unchanged", () => {
    render(<App initialLayers={TWO_LAYERS} />);

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);

    fireEvent.change(sliders[0], { target: { value: "0.2" } });

    expect(sliders[0]).toHaveValue("0.2");
    expect(sliders[1]).toHaveValue("0.6");
  });
});

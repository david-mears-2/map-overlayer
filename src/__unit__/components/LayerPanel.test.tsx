import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LayerPanel } from "../../components/LayerPanel";
import type { HeatLayer } from "../../types";

const makeLayer = (overrides: Partial<HeatLayer> = {}): HeatLayer => ({
  id: "restaurants",
  label: "Restaurants",
  category: "restaurant",
  colour: "#e63946",
  opacity: 0.8,
  enabled: true,
  ...overrides,
});

describe("LayerPanel", () => {
  it("renders layer labels", () => {
    const layers = [makeLayer(), makeLayer({ id: "cafes", label: "Cafes" })];
    render(
      <LayerPanel layers={layers} onToggle={vi.fn()} onOpacityChange={vi.fn()} />
    );

    expect(screen.getByText("Restaurants")).toBeInTheDocument();
    expect(screen.getByText("Cafes")).toBeInTheDocument();
  });

  it("renders a checked checkbox for enabled layers", () => {
    render(
      <LayerPanel
        layers={[makeLayer({ enabled: true })]}
        onToggle={vi.fn()}
        onOpacityChange={vi.fn()}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("renders an unchecked checkbox for disabled layers", () => {
    render(
      <LayerPanel
        layers={[makeLayer({ enabled: false })]}
        onToggle={vi.fn()}
        onOpacityChange={vi.fn()}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("calls onToggle with the layer id when checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        layers={[makeLayer({ id: "pubs" })]}
        onToggle={onToggle}
        onOpacityChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("pubs");
  });

  it("shows opacity slider only for enabled layers", () => {
    render(
      <LayerPanel
        layers={[
          makeLayer({ id: "a", label: "Enabled", enabled: true }),
          makeLayer({ id: "b", label: "Disabled", enabled: false }),
        ]}
        onToggle={vi.fn()}
        onOpacityChange={vi.fn()}
      />
    );

    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(1);
  });

  it("calls onOpacityChange when slider value changes", () => {
    const onOpacityChange = vi.fn();
    render(
      <LayerPanel
        layers={[makeLayer({ id: "restaurants", opacity: 0.8 })]}
        onToggle={vi.fn()}
        onOpacityChange={onOpacityChange}
      />
    );

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0.5" } });
    expect(onOpacityChange).toHaveBeenCalledWith("restaurants", 0.5);
  });
});

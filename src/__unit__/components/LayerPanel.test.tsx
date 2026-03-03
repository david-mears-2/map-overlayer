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
  pointRadius: 2,
  enabled: true,
  ...overrides,
});

describe("LayerPanel", () => {
  it("renders layer labels", () => {
    const layers = [makeLayer(), makeLayer({ id: "cafes", label: "Cafes" })];
    render(
      <LayerPanel layers={layers} onToggle={vi.fn()} onOpacityChange={vi.fn()} onRadiusChange={vi.fn()} />
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
        onRadiusChange={vi.fn()}
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
        onRadiusChange={vi.fn()}
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
        onRadiusChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("pubs");
  });

  it("does not show Style options button for disabled layers", () => {
    render(
      <LayerPanel
        layers={[
          makeLayer({ id: "a", label: "Enabled", enabled: true }),
          makeLayer({ id: "b", label: "Disabled", enabled: false }),
        ]}
        onToggle={vi.fn()}
        onOpacityChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />
    );

    // Only one "Style options" button (for the enabled layer)
    const buttons = screen.getAllByRole("button", { name: "Style options" });
    expect(buttons).toHaveLength(1);
  });

  it("shows sliders after clicking Style options", () => {
    render(
      <LayerPanel
        layers={[makeLayer({ id: "restaurants", opacity: 0.8 })]}
        onToggle={vi.fn()}
        onOpacityChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />
    );

    // No sliders visible initially
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    // Click Style options to expand
    fireEvent.click(screen.getByRole("button", { name: "Style options" }));

    // Now both opacity and radius sliders appear
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
  });

  it("calls onOpacityChange when opacity slider value changes", () => {
    const onOpacityChange = vi.fn();
    render(
      <LayerPanel
        layers={[makeLayer({ id: "restaurants", opacity: 0.8 })]}
        onToggle={vi.fn()}
        onOpacityChange={onOpacityChange}
        onRadiusChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Style options" }));

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "0.5" } });
    expect(onOpacityChange).toHaveBeenCalledWith("restaurants", 0.5);
  });

  it("calls onRadiusChange when radius slider value changes", () => {
    const onRadiusChange = vi.fn();
    render(
      <LayerPanel
        layers={[makeLayer({ id: "restaurants", pointRadius: 2 })]}
        onToggle={vi.fn()}
        onOpacityChange={vi.fn()}
        onRadiusChange={onRadiusChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Style options" }));

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[1], { target: { value: "5" } });
    expect(onRadiusChange).toHaveBeenCalledWith("restaurants", 5);
  });

  it("collapses style options when clicking Style options again", () => {
    render(
      <LayerPanel
        layers={[makeLayer()]}
        onToggle={vi.fn()}
        onOpacityChange={vi.fn()}
        onRadiusChange={vi.fn()}
      />
    );

    const button = screen.getByRole("button", { name: "Style options" });

    // Expand
    fireEvent.click(button);
    expect(screen.getAllByRole("slider")).toHaveLength(2);

    // Collapse
    fireEvent.click(button);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
});

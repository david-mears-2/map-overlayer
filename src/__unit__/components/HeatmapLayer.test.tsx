import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MapContainer } from "react-leaflet";
import { HeatmapLayer } from "../../components/HeatmapLayer";
import type { LatLngPoint } from "../../types";

function renderInMap(ui: React.ReactElement) {
  return render(
    <MapContainer center={[51.505, -0.09]} zoom={12} style={{ height: 200, width: 200 }}>
      {ui}
    </MapContainer>
  );
}

describe("HeatmapLayer", () => {
  it("renders nothing and does not crash with empty points", () => {
    const { container } = renderInMap(
      <HeatmapLayer points={[]} colour="#ff0000" opacity={0.8} />
    );
    expect(container).toBeDefined();
  });

  it("renders a canvas when given points", () => {
    const points: LatLngPoint[] = [
      [51.5, -0.1],
      [51.6, 0.0],
    ];
    const { container } = renderInMap(
      <HeatmapLayer points={points} colour="#ff0000" opacity={0.8} />
    );
    // leaflet.heat adds a canvas to the overlay pane
    const canvas = container.querySelector(".leaflet-overlay-pane canvas");
    expect(canvas).not.toBeNull();
  });

  it("applies opacity to the canvas", () => {
    const points: LatLngPoint[] = [[51.5, -0.1]];
    const { container } = renderInMap(
      <HeatmapLayer points={points} colour="#ff0000" opacity={0.5} />
    );
    const canvas = container.querySelector(".leaflet-overlay-pane canvas");
    expect(canvas).not.toBeNull();
    expect((canvas as HTMLElement).style.opacity).toBe("0.5");
  });
});

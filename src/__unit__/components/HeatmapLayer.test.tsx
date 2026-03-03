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
      <HeatmapLayer points={[]} colour="#ff0000" opacity={0.8} pointRadius={2} />
    );
    expect(container).toBeDefined();
  });

  it("adds circle markers to the map when given points", () => {
    const points: LatLngPoint[] = [
      [51.5, -0.1],
      [51.6, 0.0],
    ];
    const { container } = renderInMap(
      <HeatmapLayer points={points} colour="#ff0000" opacity={0.8} pointRadius={2} />
    );
    // L.circleMarker renders SVG path elements inside the overlay pane
    const paths = container.querySelectorAll(".leaflet-overlay-pane path");
    expect(paths.length).toBe(2);
  });

  it("applies colour to circle markers", () => {
    const points: LatLngPoint[] = [[51.5, -0.1]];
    const { container } = renderInMap(
      <HeatmapLayer points={points} colour="#ff0000" opacity={0.5} pointRadius={3} />
    );
    const path = container.querySelector(".leaflet-overlay-pane path");
    expect(path).not.toBeNull();
    expect(path!.getAttribute("stroke")).toBe("#ff0000");
    expect(path!.getAttribute("fill")).toBe("#ff0000");
  });
});

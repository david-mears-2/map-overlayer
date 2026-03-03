import { useState } from "react";
import { MapView } from "./components/MapView";
import { LayerPanel } from "./components/LayerPanel";
import type { HeatLayer } from "./types";

const DEFAULT_OPACITY: Readonly<number> = 0.8;
const DEFAULT_POINT_RADIUS: Readonly<number> = 2;

// TODO: Derive these from availableCategories()
const DEFAULT_LAYERS: HeatLayer[] = [
  {
    id: "restaurants",
    label: "Restaurants",
    category: "restaurant",
    colour: "red",
    opacity: DEFAULT_OPACITY,
    pointRadius: DEFAULT_POINT_RADIUS,
    enabled: true,
  },
  {
    id: "cafes",
    label: "Cafés",
    category: "cafe",
    colour: "blue",
    opacity: DEFAULT_OPACITY,
    pointRadius: DEFAULT_POINT_RADIUS,
    enabled: true,
  },
  {
    id: "parks",
    label: "Parks",
    category: "park",
    colour: "green",
    opacity: DEFAULT_OPACITY,
    pointRadius: DEFAULT_POINT_RADIUS,
    enabled: true,
  },
  {
    id: "pubs",
    label: "Pubs",
    category: "pub",
    colour: "orange",
    opacity: DEFAULT_OPACITY,
    pointRadius: DEFAULT_POINT_RADIUS,
    enabled: true,
  },
];

export default function App({ initialLayers = DEFAULT_LAYERS }: { initialLayers?: HeatLayer[] } = {}) {
  const [layers, setLayers] = useState<HeatLayer[]>(initialLayers);

  function handleToggle(id: string) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  }

  function handleOpacityChange(id: string, opacity: number) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  }

  function handleRadiusChange(id: string, pointRadius: number) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, pointRadius } : l))
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <LayerPanel
        layers={layers}
        onToggle={handleToggle}
        onOpacityChange={handleOpacityChange}
        onRadiusChange={handleRadiusChange}
      />
      <div style={{ flex: 1 }}>
        <MapView layers={layers} />
      </div>
    </div>
  );
}

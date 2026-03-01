import { useState } from "react";
import { MapView } from "./components/MapView";
import { LayerPanel } from "./components/LayerPanel";
import type { HeatLayer } from "./types";

const DEFAULT_LAYERS: HeatLayer[] = [
  {
    id: "restaurants",
    label: "Restaurants",
    category: "restaurant",
    colour: "#e63946",
    opacity: 0.8,
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

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <LayerPanel
        layers={layers}
        onToggle={handleToggle}
        onOpacityChange={handleOpacityChange}
      />
      <div style={{ flex: 1 }}>
        <MapView layers={layers} />
      </div>
    </div>
  );
}

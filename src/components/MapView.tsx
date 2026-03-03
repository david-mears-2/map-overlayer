import { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { HeatmapLayer } from "./HeatmapLayer";
import { DataProvider } from "../context/DataProvider";
import { useDataContext } from "../context/useDataContext";
import type { HeatLayer } from "../types";
import { LONDON_CENTER } from "../types";
import "leaflet/dist/leaflet.css";

interface Props {
  layers: HeatLayer[];
}

function DataLayer({ layer }: { layer: HeatLayer }) {
  const { getPoints } = useDataContext();
  const points = getPoints(layer.category);
  if (!layer.enabled || points.length === 0) return null;
  return (
    <HeatmapLayer
      points={points}
      colour={layer.colour}
      opacity={layer.opacity}
      pointRadius={layer.pointRadius}
    />
  );
}

function LoadingOverlay() {
  const { loading } = useDataContext();
  if (!loading) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.6)",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      Loading…
    </div>
  );
}

export function MapView({ layers }: Props) {
  // Stabilize the categories reference so that opacity-only changes to
  // `layers` don't cause DataProvider to re-run its fetch effect.
  // Strings are compared by value, so categoriesKey only changes when the
  // actual set of enabled categories changes.
  const categoriesKey = layers
    .filter((l) => l.enabled)
    .map((l) => l.category)
    .join(",");
  const stableCategories = useMemo(() => categoriesKey.split(",").filter(Boolean), [categoriesKey]);

  return (
    <DataProvider categories={stableCategories}>
      <div style={{ position: "relative", height: "100%", width: "100%" }}>
        <MapContainer
          center={LONDON_CENTER}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {layers.map((layer) => (
            <DataLayer key={layer.id} layer={layer} />
          ))}
        </MapContainer>
        <LoadingOverlay />
      </div>
    </DataProvider>
  );
}

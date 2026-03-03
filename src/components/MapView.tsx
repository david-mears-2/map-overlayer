import { useCallback, useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { PointMarkerLayer } from "./PointMarkerLayer";
import { DataProvider } from "../context/DataProvider";
import { useDataContext } from "../context/useDataContext";
import type { HeatLayer } from "../types";
import { LONDON_CENTER } from "../types";
import "leaflet/dist/leaflet.css";

interface Props {
  layers: HeatLayer[];
}

function DataLayer({ layer, onRenderingChange }: { layer: HeatLayer; onRenderingChange: (rendering: boolean) => void }) {
  const { getPoints } = useDataContext();
  const points = getPoints(layer.category);
  if (!layer.enabled || points.length === 0) return null;
  return (
    <PointMarkerLayer
      points={points}
      colour={layer.colour}
      opacity={layer.opacity}
      pointRadius={layer.pointRadius}
      onRenderingChange={onRenderingChange}
    />
  );
}

function StatusOverlay({ rendering }: { rendering: boolean }) {
  const { loading } = useDataContext();
  if (!loading && !rendering) return null;
  const message = loading ? "Loading…" : "Rendering…";
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
      {message}
    </div>
  );
}

function ErrorBanner() {
  const { error } = useDataContext();
  if (!error) return null;
  return (
    <div
      role="alert"
      style={{
        position: "absolute",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#e63946",
        color: "white",
        padding: "8px 16px",
        borderRadius: 4,
        zIndex: 1001,
        pointerEvents: "none",
      }}
    >
      {error}
    </div>
  );
}

export function MapView({ layers }: Props) {
  const [renderingCount, setRenderingCount] = useState(0);

  const onRenderingChange = useCallback((isRendering: boolean) => {
    setRenderingCount((prev) => prev + (isRendering ? 1 : -1));
  }, []);

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
        <ErrorBanner />
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
            <DataLayer key={layer.id} layer={layer} onRenderingChange={onRenderingChange} />
          ))}
        </MapContainer>
        <StatusOverlay rendering={renderingCount > 0} />
      </div>
    </DataProvider>
  );
}

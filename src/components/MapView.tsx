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
    />
  );
}

export function MapView({ layers }: Props) {
  return (
    <DataProvider layers={layers}>
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
    </DataProvider>
  );
}

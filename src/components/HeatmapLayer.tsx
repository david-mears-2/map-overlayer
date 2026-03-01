import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { LatLngPoint } from "../types";

interface Props {
  points: LatLngPoint[];
  colour: string;
  opacity: number;
}

function colourGradient(hex: string): Record<number, string> {
  return { 0.4: "transparent", 0.65: hex + "88", 1.0: hex };
}

export function HeatmapLayer({ points, colour, opacity }: Props) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      gradient: colourGradient(colour),
    });
    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      map.removeLayer(heat);
      layerRef.current = null;
    };
  }, [map, points, colour]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer._canvas.style.opacity = String(opacity);
  }, [opacity]);

  return null;
}

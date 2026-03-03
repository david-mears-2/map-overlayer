import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import type { LatLngPoint } from "../types";

interface Props {
  points: LatLngPoint[];
  colour: string;
  opacity: number;
  pointRadius: number;
}

export function HeatmapLayer({ points, colour, opacity, pointRadius }: Props) {
  const map = useMap();
  const pointMarkersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    if (points.length === 0) return;

    pointMarkersRef.current = points.map((p) =>
      L.circleMarker(p, {
        radius: pointRadius,
        weight: 1,
        fillColor: colour,
        color: colour,
        opacity: opacity,
        fillOpacity: opacity,
      }).addTo(map)
    );

    return () => {
      pointMarkersRef.current.forEach((marker) => map.removeLayer(marker));
      pointMarkersRef.current = [];
    };
  }, [map, points, colour, opacity, pointRadius]);

  useEffect(() => {
    if (pointMarkersRef.current[0]?.options.opacity === opacity) return;
    pointMarkersRef.current.forEach((marker) => {
      marker.setStyle({ opacity, fillOpacity: opacity });
    });
  }, [opacity]);

  useEffect(() => {
    if (pointMarkersRef.current[0]?.getRadius() === pointRadius) return;
    pointMarkersRef.current.forEach((marker) => {
      marker.setRadius(pointRadius);
    });
  }, [pointRadius]);

  return null;
}

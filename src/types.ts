export interface HeatLayer {
  id: string;
  label: string;
  category: string;
  colour: string;
  opacity: number;
  pointRadius: number;
  enabled: boolean;
}

export type LatLngPoint = [number, number];

export const LONDON_CENTER: LatLngPoint = [51.505, -0.09];
export const LONDON_BBOX: [number, number, number, number] = [51.28, -0.51, 51.7, 0.33];

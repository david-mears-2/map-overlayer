// React context for sharing fetched heatmap point data between the
// DataProvider (which fetches) and individual DataLayer components
// (which render heatmaps).
//
// Separated from DataProvider.tsx because the react-refresh lint rule
// requires that files exporting React components only export components,
// not hooks or other values.
import { createContext, useContext } from "react";
import type { LatLngPoint } from "../types";

export interface DataContextValue {
  getPoints(category: string): LatLngPoint[];
  loading: boolean;
  error: string | null;
}

export const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used within a DataProvider");
  return ctx;
}

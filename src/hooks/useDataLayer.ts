import { useEffect, useReducer } from "react";
import { activeProvider } from "../api";
import type { LatLngPoint } from "../types";

interface State {
  points: LatLngPoint[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "fetch" }
  | { type: "success"; points: LatLngPoint[] }
  | { type: "failure"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "fetch":
      return { ...state, loading: true, error: null };
    case "success":
      return { points: action.points, loading: false, error: null };
    case "failure":
      return { ...state, loading: false, error: action.error };
  }
}

const INITIAL_STATE: State = { points: [], loading: false, error: null };

export function useDataLayer(
  category: string,
  bbox: [number, number, number, number],
  enabled: boolean
) {
  const [south, west, north, east] = bbox;
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    dispatch({ type: "fetch" });

    activeProvider
      .fetchPoints(category, [south, west, north, east])
      .then((points) => {
        if (!cancelled) dispatch({ type: "success", points });
      })
      .catch((err) => {
        if (!cancelled) dispatch({ type: "failure", error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [category, south, west, north, east, enabled]);

  return state;
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapView } from "../../components/MapView";
import type { HeatLayer } from "../../types";

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
}));

vi.mock("../../context/DataProvider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../../components/HeatmapLayer", () => ({
  HeatmapLayer: () => <div data-testid="heatmap-layer" />,
}));

vi.mock("../../context/useDataContext");
import { useDataContext } from "../../context/useDataContext";
const mockUseDataContext = vi.mocked(useDataContext);

const NO_LAYERS: HeatLayer[] = [];
const ENABLED_LAYER: HeatLayer = {
  id: "1",
  label: "Pubs",
  category: "pub",
  colour: "blue",
  opacity: 0.5,
  pointRadius: 2,
  enabled: true,
};

describe("MapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading indicator when data is loading", () => {
    mockUseDataContext.mockReturnValue({
      getPoints: () => [],
      loading: true,
      error: null,
    });

    render(<MapView layers={NO_LAYERS} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("hides the loading indicator when data is not loading", () => {
    mockUseDataContext.mockReturnValue({
      getPoints: () => [],
      loading: false,
      error: null,
    });

    render(<MapView layers={NO_LAYERS} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an error alert when there is an error", () => {
    mockUseDataContext.mockReturnValue({
      getPoints: () => [],
      loading: false,
      error: "Network error",
    });

    render(<MapView layers={NO_LAYERS} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
  });

  it("hides the error alert when there is no error", () => {
    mockUseDataContext.mockReturnValue({
      getPoints: () => [],
      loading: false,
      error: null,
    });

    render(<MapView layers={NO_LAYERS} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders a heatmap layer when a layer is enabled and has points", () => {
    mockUseDataContext.mockReturnValue({
      getPoints: () => [[51.5, -0.1]],
      loading: false,
      error: null,
    });

    render(<MapView layers={[ENABLED_LAYER]} />);

    expect(screen.getByTestId("heatmap-layer")).toBeInTheDocument();
  });

  it("does not render a heatmap layer when the layer has no points", () => {
    mockUseDataContext.mockReturnValue({
      getPoints: () => [],
      loading: false,
      error: null,
    });

    render(<MapView layers={[ENABLED_LAYER]} />);

    expect(screen.queryByTestId("heatmap-layer")).not.toBeInTheDocument();
  });
});

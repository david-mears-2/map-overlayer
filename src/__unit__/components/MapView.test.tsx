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

vi.mock("../../context/useDataContext");
import { useDataContext } from "../../context/useDataContext";
const mockUseDataContext = vi.mocked(useDataContext);

const NO_LAYERS: HeatLayer[] = [];

describe("MapView loading indicator", () => {
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
});

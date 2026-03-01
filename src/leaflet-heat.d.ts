import "leaflet";

declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number] | [number, number, number]>,
    options?: HeatLayerOptions
  ): HeatLayer;

  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    gradient?: Record<number, string>;
    minOpacity?: number;
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: Array<[number, number]>): this;
    addLatLng(latlng: [number, number]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
    _canvas: HTMLCanvasElement;
  }
}

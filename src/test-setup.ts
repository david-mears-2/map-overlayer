import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// Stub canvas 2D context for jsdom — Leaflet and leaflet.heat require it
// but integration tests only verify data flow, not pixel output.
const noop = () => {};
HTMLCanvasElement.prototype.getContext = (() => {
  const ctx = {
    canvas: document.createElement("canvas"),
    clearRect: noop,
    fillRect: noop,
    getImageData: () => ({ data: new Uint8ClampedArray(0) }),
    putImageData: noop,
    createImageData: () => ({ data: new Uint8ClampedArray(0) }),
    setTransform: noop,
    resetTransform: noop,
    drawImage: noop,
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    stroke: noop,
    fill: noop,
    arc: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    clip: noop,
    rect: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    set fillStyle(_: unknown) {},
    set strokeStyle(_: unknown) {},
    set globalAlpha(_: unknown) {},
    set globalCompositeOperation(_: unknown) {},
    set lineWidth(_: unknown) {},
    set lineCap(_: unknown) {},
    set lineJoin(_: unknown) {},
    set font(_: unknown) {},
    set textAlign(_: unknown) {},
    set textBaseline(_: unknown) {},
    set shadowColor(_: unknown) {},
    set shadowBlur(_: unknown) {},
    set shadowOffsetX(_: unknown) {},
    set shadowOffsetY(_: unknown) {},
  };
  return () => ctx;
})() as unknown as typeof HTMLCanvasElement.prototype.getContext;

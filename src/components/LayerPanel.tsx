import { useState } from "react";
import type { HeatLayer } from "../types";

interface Props {
  layers: HeatLayer[];
  onToggle: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onRadiusChange: (id: string, radius: number) => void;
}

export function LayerPanel({ layers, onToggle, onOpacityChange, onRadiusChange }: Props) {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  function toggleStyleOptions(id: string) {
    setExpandedLayerId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ padding: 16, width: 260, overflowY: "auto" }}>
      <h2 style={{ margin: "0 0 12px" }}>Layers</h2>
      <h4 style={{ margin: "0 0 8px" }}>Points of Interest</h4>
      {layers.map((layer) => (
        <div
          key={layer.id}
          style={{
            marginBottom: 16,
            opacity: layer.enabled ? 1 : 0.5,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={layer.enabled}
              onChange={() => onToggle(layer.id)}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: layer.colour,
                display: "inline-block",
              }}
            />
            {layer.label}
            {layer.enabled && (
              <button
                style={{ marginLeft: "auto" }}
                onClick={() => {
                  toggleStyleOptions(layer.id);
                }}
              >
                Style options
              </button>
            )}
          </label>
          {layer.enabled && expandedLayerId === layer.id && (
            <div style={{ marginTop: 8 }}>
              <label>Opacity ({ layer.opacity })</label>
              <input
                type="range"
                min={0.025}
                max={0.75}
                step={0.025}
                value={layer.opacity}
                onChange={(e) =>
                  onOpacityChange(layer.id, parseFloat(e.target.value))
                }
                style={{ width: "100%", marginTop: 4, color: layer.colour }}
              />
              <label>Point radius ({ layer.pointRadius } px)</label>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={layer.pointRadius}
                onChange={(e) =>
                  onRadiusChange(layer.id, parseInt(e.target.value))
                }
                style={{ width: "100%", marginTop: 4 }}
              />
            </div>
          )}
        </div>
      ))}
      <p style={{ fontStyle: "italic", margin: "0 0 12px" }}>
        Cool Tip: You can approximate a 'heat-map' for points of interest by clicking 'Style' and setting opacity low and radius high!
      </p>
    </div>
  );
}

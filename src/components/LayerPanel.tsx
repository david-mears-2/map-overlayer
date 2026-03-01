import type { HeatLayer } from "../types";

interface Props {
  layers: HeatLayer[];
  onToggle: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}

export function LayerPanel({ layers, onToggle, onOpacityChange }: Props) {
  return (
    <div style={{ padding: 16, width: 260, overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 12px" }}>Layers</h3>
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
          </label>
          {layer.enabled && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layer.opacity}
              onChange={(e) =>
                onOpacityChange(layer.id, parseFloat(e.target.value))
              }
              style={{ width: "100%", marginTop: 4 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

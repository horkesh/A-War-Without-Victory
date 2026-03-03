/**
 * MapModeToolbar + MapLayerToggles (Phase C2).
 * Compact bottom toolbar with optional layer popover.
 * Styled per HOI §9.2 warm palette.
 */
import { useState } from 'react';
import { useGameStore, type MapMode } from '../store/gameStore';

const MAP_MODES: { id: MapMode; label: string }[] = [
  { id: 'political', label: 'Political' },
  { id: 'ethnic', label: 'Ethnic' },
  { id: 'supply', label: 'Supply' },
  { id: 'pressure', label: 'Pressure' },
  { id: 'density', label: 'Density' },
];

export function MapModeToolbar() {
  const [layersOpen, setLayersOpen] = useState(false);
  const mapMode = useGameStore((s) => s.mapMode);
  const setMapMode = useGameStore((s) => s.setMapMode);
  const frontsVisible = useGameStore((s) => s.frontsVisible);
  const setFrontsVisible = useGameStore((s) => s.setFrontsVisible);
  const formationsVisible = useGameStore((s) => s.formationsVisible);
  const setFormationsVisible = useGameStore((s) => s.setFormationsVisible);
  const labelsVisible = useGameStore((s) => s.labelsVisible);
  const setLabelsVisible = useGameStore((s) => s.setLabelsVisible);
  const sectorsVisible = useGameStore((s) => s.sectorsVisible);
  const setSectorsVisible = useGameStore((s) => s.setSectorsVisible);
  const minimapVisible = useGameStore((s) => s.minimapVisible);
  const setMinimapVisible = useGameStore((s) => s.setMinimapVisible);

  return (
    <div
      className="absolute left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1 font-sans text-xs"
      style={{
        bottom: '2.25rem',
        direction: 'ltr',
      }}
    >
      {layersOpen && (
        <div
          className="w-52 p-2 rounded-md border shadow-lg bg-panel-bg/95 backdrop-blur-sm"
          style={{ borderColor: 'rgba(180, 160, 130, 0.2)' }}
        >
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#c4a35a' }}>
            Layers
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-2">
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: '#ddd5c8' }}>
              <input
                type="checkbox"
                checked={frontsVisible}
                onChange={(e) => setFrontsVisible(e.target.checked)}
                className="rounded border-panel-border"
              />
              Fronts
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: '#ddd5c8' }}>
              <input
                type="checkbox"
                checked={formationsVisible}
                onChange={(e) => setFormationsVisible(e.target.checked)}
                className="rounded border-panel-border"
              />
              Formations
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: '#ddd5c8' }}>
              <input
                type="checkbox"
                checked={labelsVisible}
                onChange={(e) => setLabelsVisible(e.target.checked)}
                className="rounded border-panel-border"
              />
              Labels
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: '#ddd5c8' }}>
              <input
                type="checkbox"
                checked={sectorsVisible}
                onChange={(e) => setSectorsVisible(e.target.checked)}
                className="rounded border-panel-border"
              />
              Sectors
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: '#ddd5c8' }}>
              <input
                type="checkbox"
                checked={minimapVisible}
                onChange={(e) => setMinimapVisible(e.target.checked)}
                className="rounded border-panel-border"
              />
              Minimap
            </label>
          </div>
        </div>
      )}

      {/* Discreet bottom mode bar */}
      <div
        className="flex flex-wrap items-center justify-center gap-1 px-2 py-1 rounded-full border shadow"
        style={{
          backgroundColor: 'rgba(28, 26, 23, 0.78)',
          borderColor: 'rgba(180, 160, 130, 0.2)',
        }}
      >
        {MAP_MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMapMode(id)}
            className="px-2 py-0.5 rounded-full border transition-colors text-[11px]"
            style={{
              backgroundColor: mapMode === id ? '#3a3020' : '#252220',
              color: mapMode === id ? '#c4a35a' : '#ddd5c8',
              borderColor: mapMode === id ? 'rgba(196, 163, 90, 0.4)' : 'rgba(180, 160, 130, 0.2)',
            }}
            title={`Map mode: ${label}`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setLayersOpen((v) => !v)}
          className="px-2 py-0.5 rounded-full border text-[11px] transition-colors"
          style={{
            backgroundColor: layersOpen ? '#3a3020' : '#252220',
            color: layersOpen ? '#c4a35a' : '#ddd5c8',
            borderColor: layersOpen ? 'rgba(196, 163, 90, 0.4)' : 'rgba(180, 160, 130, 0.2)',
          }}
          title="Toggle layer controls"
        >
          {layersOpen ? 'Hide layers' : 'Layers'}
        </button>
      </div>
    </div>
  );
}

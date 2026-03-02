/**
 * MapModeToolbar + MapLayerToggles (Phase C2).
 * Floating button cluster bottom-right above minimap (HOI spec §3.2).
 * Styled per HOI §9.2 warm palette.
 */
import { useGameStore, type MapMode } from '../store/gameStore';

const MAP_MODES: { id: MapMode; label: string }[] = [
  { id: 'political', label: 'Political' },
  { id: 'ethnic', label: 'Ethnic' },
  { id: 'supply', label: 'Supply' },
  { id: 'pressure', label: 'Pressure' },
  { id: 'density', label: 'Density' },
];

export function MapModeToolbar() {
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
      className="flex flex-col gap-2 font-sans text-xs z-10 rounded border shadow-lg"
      style={{
        position: 'absolute',
        right: 16,
        bottom: 200,
        left: 'auto',
        top: 'auto',
        width: 'auto',
        direction: 'ltr',
        backgroundColor: '#1c1a17',
        borderColor: 'rgba(180, 160, 130, 0.15)',
      }}
    >
      {/* Map mode buttons (Political / Ethnic / Supply / Pressure) */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-panel-border" style={{ borderColor: 'rgba(180, 160, 130, 0.15)' }}>
        <span className="w-full text-accent-gold font-semibold uppercase tracking-wider mb-1 flex items-center justify-between" style={{ color: '#c4a35a' }}>
          <span>Map mode</span>
          <span className="text-[10px] normal-case tracking-normal opacity-80" style={{ color: '#a09070' }} title="Keys 1–4">
            1–4
          </span>
        </span>
        {MAP_MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMapMode(id)}
            className="px-2 py-1 rounded border transition-colors"
            style={{
              backgroundColor: mapMode === id ? '#3a3020' : '#252220',
              color: mapMode === id ? '#c4a35a' : '#ddd5c8',
              borderColor: 'rgba(180, 160, 130, 0.15)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Layer toggles */}
      <div className="flex flex-col gap-1 p-2">
        <span className="text-accent-gold font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#c4a35a' }}>
          Layers
        </span>
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#ddd5c8' }}>
          <input
            type="checkbox"
            checked={frontsVisible}
            onChange={(e) => setFrontsVisible(e.target.checked)}
            className="rounded border-panel-border"
          />
          Fronts
        </label>
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#ddd5c8' }}>
          <input
            type="checkbox"
            checked={formationsVisible}
            onChange={(e) => setFormationsVisible(e.target.checked)}
            className="rounded border-panel-border"
          />
          Formations
        </label>
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#ddd5c8' }}>
          <input
            type="checkbox"
            checked={labelsVisible}
            onChange={(e) => setLabelsVisible(e.target.checked)}
            className="rounded border-panel-border"
          />
          Labels
        </label>
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#ddd5c8' }}>
          <input
            type="checkbox"
            checked={sectorsVisible}
            onChange={(e) => setSectorsVisible(e.target.checked)}
            className="rounded border-panel-border"
          />
          Sectors
        </label>
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#ddd5c8' }}>
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
  );
}

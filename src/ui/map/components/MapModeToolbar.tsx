/**
 * MapModeToolbar + MapLayerToggles (Phase C2).
 * Horizontal bar centered at bottom, above BottomStatusStrip.
 * Styled per HOI §9.2 warm palette.
 */
import { useGameStore, type MapMode } from '../store/gameStore';

const MAP_MODES: { id: MapMode; label: string; key: string }[] = [
  { id: 'political', label: 'Political', key: '1' },
  { id: 'ethnic', label: 'Ethnic', key: '2' },
  { id: 'supply', label: 'Supply', key: '3' },
  { id: 'pressure', label: 'Pressure', key: '4' },
  { id: 'density', label: 'Density', key: '5' },
];

const LAYER_TOGGLES = [
  { key: 'frontsVisible', setKey: 'setFrontsVisible', label: 'Fronts' },
  { key: 'formationsVisible', setKey: 'setFormationsVisible', label: 'Units' },
  { key: 'labelsVisible', setKey: 'setLabelsVisible', label: 'Labels' },
  { key: 'sectorsVisible', setKey: 'setSectorsVisible', label: 'Sectors' },
  { key: 'minimapVisible', setKey: 'setMinimapVisible', label: 'Minimap' },
  { key: 'fogVisible', setKey: 'setFogVisible', label: 'Fog' },
  { key: 'battlesVisible', setKey: 'setBattlesVisible', label: 'Battles' },
  { key: 'strategicVisible', setKey: 'setStrategicVisible', label: 'Points' },
] as const;

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
  const fogVisible = useGameStore((s) => s.fogVisible);
  const setFogVisible = useGameStore((s) => s.setFogVisible);
  const battlesVisible = useGameStore((s) => s.battlesVisible);
  const setBattlesVisible = useGameStore((s) => s.setBattlesVisible);
  const strategicVisible = useGameStore((s) => s.strategicVisible);
  const setStrategicVisible = useGameStore((s) => s.setStrategicVisible);

  const toggles: Record<string, { value: boolean; set: (v: boolean) => void }> = {
    frontsVisible: { value: frontsVisible, set: setFrontsVisible },
    formationsVisible: { value: formationsVisible, set: setFormationsVisible },
    labelsVisible: { value: labelsVisible, set: setLabelsVisible },
    sectorsVisible: { value: sectorsVisible, set: setSectorsVisible },
    minimapVisible: { value: minimapVisible, set: setMinimapVisible },
    fogVisible: { value: fogVisible, set: setFogVisible },
    battlesVisible: { value: battlesVisible, set: setBattlesVisible },
    strategicVisible: { value: strategicVisible, set: setStrategicVisible },
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        direction: 'ltr',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'rgba(28, 26, 23, 0.92)',
          border: '1px solid rgba(180, 160, 130, 0.18)',
          borderRadius: 6,
          padding: '4px 6px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Map mode pill group */}
        {MAP_MODES.map(({ id, label, key }) => {
          const active = mapMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMapMode(id)}
              title={`${label} (${key})`}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: active ? 'rgba(196, 163, 90, 0.18)' : 'transparent',
                color: active ? '#c4a35a' : '#a09080',
              }}
            >
              {label}
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ width: 1, height: 20, backgroundColor: 'rgba(180, 160, 130, 0.18)', margin: '0 4px' }} />

        {/* Layer toggles */}
        {LAYER_TOGGLES.map(({ key, label }) => {
          const t = toggles[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => t.set(!t.value)}
              title={`Toggle ${label}`}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: 'none',
                fontSize: 11,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: t.value ? 'rgba(196, 163, 90, 0.12)' : 'transparent',
                color: t.value ? '#ddd5c8' : '#605848',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

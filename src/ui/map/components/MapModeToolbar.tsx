/**
 * MapModeToolbar + MapLayerToggles (Phase C2).
 * Horizontal bar centered at bottom, above BottomStatusStrip.
 * Styled per HOI §9.2 warm palette.
 */
import { useGameStore, type MapMode } from '../store/gameStore';

const MAP_MODES: { id: MapMode; label: string; key: string }[] = [
  { id: 'political', label: '1: Political', key: '1' },
  { id: 'ethnic', label: '2: Ethnic', key: '2' },
  { id: 'supply', label: '3: Supply', key: '3' },
  { id: 'casualties', label: '4: Casualties', key: '4' },
  { id: 'morale', label: '5: Morale', key: '5' },
  { id: 'operations', label: '6: Operations', key: '6' },
  { id: 'defense', label: '7: Defense', key: '7' },
];

const DEV_LAYER_TOGGLES = [
  { key: 'frontsVisible', setKey: 'setFrontsVisible', label: 'Fronts' },
  { key: 'formationsVisible', setKey: 'setFormationsVisible', label: 'Units' },
  { key: 'labelsVisible', setKey: 'setLabelsVisible', label: 'Labels' },
  { key: 'sectorsVisible', setKey: 'setSectorsVisible', label: 'Sectors' },
  { key: 'minimapVisible', setKey: 'setMinimapVisible', label: 'Minimap' },
  { key: 'fogVisible', setKey: 'setFogVisible', label: 'Fog' },
  { key: 'battlesVisible', setKey: 'setBattlesVisible', label: 'Battles' },
  { key: 'strategicVisible', setKey: 'setStrategicVisible', label: 'Points' },
] as const;

// Live mode: no separate "Fronts" toggle — front lines ARE sectors.
// "Front" toggle controls sectorsVisible (which drives front line visibility).
const LIVE_LAYER_TOGGLES = [
  { key: 'sectorsVisible', setKey: 'setSectorsVisible', label: 'Front' },
  { key: 'formationsVisible', setKey: 'setFormationsVisible', label: 'Units' },
  { key: 'labelsVisible', setKey: 'setLabelsVisible', label: 'Labels' },
  { key: 'minimapVisible', setKey: 'setMinimapVisible', label: 'Minimap' },
  { key: 'fogVisible', setKey: 'setFogVisible', label: 'Fog' },
  { key: 'battlesVisible', setKey: 'setBattlesVisible', label: 'Battles' },
  { key: 'strategicVisible', setKey: 'setStrategicVisible', label: 'Points' },
] as const;

export function MapModeToolbar() {
  const devMode = useGameStore((s) => s.devMode);
  const LAYER_TOGGLES = devMode ? DEV_LAYER_TOGGLES : LIVE_LAYER_TOGGLES;
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
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 bg-glass border border-white/10 rounded-lg shadow-2xl backdrop-blur-md">
      {/* Map mode pill group */}
      <div className="flex items-center gap-0.5 px-1">
        {MAP_MODES.map(({ id, label, key }) => {
          const active = mapMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMapMode(id)}
              title={`${label} (${key})`}
              className={`px-3 py-1.5 rounded text-[10px] font-mono tracking-widest transition-all duration-200 uppercase ${active
                ? 'bg-accent-gold/20 text-accent-gold shadow-glow-sm font-bold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                }`}
            >
              {label.split(': ')[1]}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-[1px] h-4 bg-white/10 mx-1" />

      {/* Layer toggles */}
      <div className="flex items-center gap-0.5 px-1">
        {LAYER_TOGGLES.map(({ key, label }) => {
          const t = toggles[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => t.set(!t.value)}
              title={`Toggle ${label}`}
              className={`px-2 py-1 rounded text-[9px] font-mono tracking-[0.1em] transition-all duration-200 uppercase ${t.value
                ? 'bg-interactive/10 text-text-primary border border-interactive/30'
                : 'text-text-secondary/50 hover:text-text-secondary'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

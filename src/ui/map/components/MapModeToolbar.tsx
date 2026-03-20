/**
 * MapModeToolbar + MapLayerToggles (Phase C2).
 * Horizontal bar centered at bottom, above BottomStatusStrip.
 * Styled per HOI §9.2 warm palette.
 */
import { useGameStore } from '../store/gameStore';
import { MAP_MODES, DEV_LAYER_TOGGLES, LIVE_LAYER_TOGGLES } from '../utils/mapModes';

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
  const municipalityBordersVisible = useGameStore((s) => s.municipalityBordersVisible);
  const setMunicipalityBordersVisible = useGameStore((s) => s.setMunicipalityBordersVisible);

  const toggles: Record<string, { value: boolean; set: (v: boolean) => void }> = {
    frontsVisible: { value: frontsVisible, set: setFrontsVisible },
    formationsVisible: { value: formationsVisible, set: setFormationsVisible },
    labelsVisible: { value: labelsVisible, set: setLabelsVisible },
    sectorsVisible: { value: sectorsVisible, set: setSectorsVisible },
    minimapVisible: { value: minimapVisible, set: setMinimapVisible },
    fogVisible: { value: fogVisible, set: setFogVisible },
    battlesVisible: { value: battlesVisible, set: setBattlesVisible },
    municipalityBordersVisible: { value: municipalityBordersVisible, set: setMunicipalityBordersVisible },
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
              title={`${key}: ${label}`}
              className={`px-3 py-1.5 rounded text-[10px] font-mono tracking-widest transition-all duration-200 uppercase ${active
                ? 'bg-accent-gold/20 text-accent-gold shadow-glow-sm font-bold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                }`}
            >
              {label}
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
              title={
                key === 'municipalityBordersVisible'
                  ? 'Toggle municipality boundaries: mun-borders (adm3 1990) + osid-control-outline'
                  : `Toggle ${label}`
              }
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

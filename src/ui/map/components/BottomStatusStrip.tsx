import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { MAP_MODES, DEV_LAYER_TOGGLES, LIVE_LAYER_TOGGLES } from '../utils/mapModes';
import osidAreasData from '../../../../data/derived/operational/osid_areas.json';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

/**
 * Unified bottom bar: map mode pills | territory control | layer toggles.
 */
export function BottomStatusStrip() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  // Territory control — area-weighted (km²)
  const controlBySettlement = loadedGameState?.controlBySettlement ?? {};
  const areaTotals = { RS: 0, RBiH: 0, HRHB: 0 };
  const totalArea = osidAreas.total_area_km2;
  for (const [osid, faction] of Object.entries(controlBySettlement)) {
    if (faction === 'RS' || faction === 'RBiH' || faction === 'HRHB') {
      areaTotals[faction] += osidAreas.areas[osid] ?? 0;
    }
  }
  const territoryPct = {
    RS: totalArea > 0 ? (areaTotals.RS / totalArea) * 100 : 0,
    RBiH: totalArea > 0 ? (areaTotals.RBiH / totalArea) * 100 : 0,
    HRHB: totalArea > 0 ? (areaTotals.HRHB / totalArea) * 100 : 0,
  };

  // Map mode
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
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-1 px-2 py-1 bg-glass border-t border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
    >
      {/* 1. Map mode pills */}
      <div className="flex items-center gap-0.5 px-1 shrink-0">
        {MAP_MODES.map(({ id, label, key }) => {
          const active = mapMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMapMode(id)}
              title={`${label} (${key})`}
              className={`px-2 py-1 rounded text-[9px] font-mono tracking-widest transition-all duration-200 uppercase ${active
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
      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* 2. Territory control (center) */}
      <div className="hidden md:flex items-center gap-3 px-3 shrink-0">
        <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest">
          <span className={`${FACTION_COLORS_SUBTLE['RS'] ?? 'text-text-primary'} tabular-nums`}>
            RS {territoryPct.RS.toFixed(1)}%
          </span>
          <div className="h-3 w-px bg-white/10" />
          <span className={`${FACTION_COLORS_SUBTLE['RBiH'] ?? 'text-text-primary'} tabular-nums`}>
            RBiH {territoryPct.RBiH.toFixed(1)}%
          </span>
          <div className="h-3 w-px bg-white/10" />
          <span className={`${FACTION_COLORS_SUBTLE['HRHB'] ?? 'text-text-primary'} tabular-nums`}>
            HRHB {territoryPct.HRHB.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* 3. Layer toggles */}
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

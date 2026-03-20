import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { MAP_MODES, DEV_LAYER_TOGGLES, LIVE_LAYER_TOGGLES } from '../utils/mapModes';
import { Icon } from './icons/Icon';
import osidAreasData from '../../../../data/derived/operational/osid_areas.json';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

/**
 * Unified bottom bar: map mode pills | territory control | layer toggles.
 */
export function BottomStatusStrip() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  // Territory control — area-weighted (km²), memoized to avoid 744-entry loop on every render
  const controlBySettlement = loadedGameState?.controlBySettlement;
  const territoryPct = useMemo(() => {
    const cbs = controlBySettlement ?? {};
    const totals = { RS: 0, RBiH: 0, HRHB: 0 };
    const totalArea = osidAreas.total_area_km2;
    for (const [osid, faction] of Object.entries(cbs)) {
      if (faction === 'RS' || faction === 'RBiH' || faction === 'HRHB') {
        totals[faction] += osidAreas.areas[osid] ?? 0;
      }
    }
    return {
      RS: totalArea > 0 ? (totals.RS / totalArea) * 100 : 0,
      RBiH: totalArea > 0 ? (totals.RBiH / totalArea) * 100 : 0,
      HRHB: totalArea > 0 ? (totals.HRHB / totalArea) * 100 : 0,
    };
  }, [controlBySettlement]);

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

      {/* 2.5 Macro indicators */}
      <div className="hidden lg:flex items-center gap-2.5 px-2 shrink-0 text-[10px] font-mono tabular-nums">
        {/* Turn counter */}
        {loadedGameState && (
          <span className="flex items-center gap-1 text-text-secondary" title={`Turn ${loadedGameState.turn}${loadedGameState.metadata?.date ? ` (${loadedGameState.metadata.date})` : ''}`}>
            <span className="text-text-primary font-semibold">w{loadedGameState.turn}</span>
            {loadedGameState.metadata?.date && (
              <span className="text-text-secondary/60">{loadedGameState.metadata.date}</span>
            )}
          </span>
        )}

        <div className="h-3 w-px bg-white/8" />

        {/* Active operations */}
        {loadedGameState?.operations && loadedGameState.operations.length > 0 && (
          <span className="flex items-center gap-1 text-accent-gold" title={`${loadedGameState.operations.length} active operation${loadedGameState.operations.length !== 1 ? 's' : ''}`}>
            <Icon name="operation" size={10} color="#c4a35a" />
            <span>{loadedGameState.operations.length}</span>
          </span>
        )}

        {/* Battles this turn */}
        {loadedGameState?.latestTurnSummary?.battles && loadedGameState.latestTurnSummary.battles.length > 0 && (
          <span className="flex items-center gap-1 text-faction-rs" title={`${loadedGameState.latestTurnSummary.battles.length} battle${loadedGameState.latestTurnSummary.battles.length !== 1 ? 's' : ''} this turn`}>
            <Icon name="offensive" size={10} color="#e05050" />
            <span>{loadedGameState.latestTurnSummary.battles.length}</span>
          </span>
        )}

        {/* Alliance status (RBiH-HRHB) */}
        {loadedGameState?.war_alliance_rbih_hrhb != null && (() => {
          const a = loadedGameState.war_alliance_rbih_hrhb!;
          const status = a <= 0.10 ? 'WAR' : a <= 0.20 ? 'MOBILIZING' : a <= 0.45 ? 'STRAINED' : 'ALLIED';
          const color = status === 'WAR' ? '#e05050' : status === 'MOBILIZING' ? '#d4a055' : status === 'STRAINED' ? '#d4d455' : '#50b850';
          return (
            <span className="flex items-center gap-1" title={`RBiH-HRHB Alliance: ${(a * 100).toFixed(0)}%`}>
              <Icon name="balanced" size={10} color={color} />
              <span style={{ color }} className="font-bold uppercase text-[9px] tracking-wider">{status}</span>
            </span>
          );
        })()}
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

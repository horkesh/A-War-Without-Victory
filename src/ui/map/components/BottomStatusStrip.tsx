import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { MAP_MODES, DEV_LAYER_TOGGLES, LIVE_LAYER_TOGGLES } from '../utils/mapModes';
import { Icon } from './icons/Icon';
import osidAreasData from '../../../../data/derived/operational/osid_areas.json';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

/** Primary modes shown as pills. The rest go in "+More" dropdown. */
const PRIMARY_MODES = ['political', 'ethnic', 'supply', 'operations'];

/**
 * Redesigned bottom bar — president's map controls.
 * Primary map modes | player territory (prominent) | faction indicator | layer gear
 */
export function BottomStatusStrip() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const playerFaction = loadedGameState?.player_faction ?? 'RS';

  // Territory control — area-weighted
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

  const [moreOpen, setMoreOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);

  const primaryModes = MAP_MODES.filter(m => PRIMARY_MODES.includes(m.id));
  const secondaryModes = MAP_MODES.filter(m => !PRIMARY_MODES.includes(m.id));

  // Faction-specific ordering: player faction first
  const factions: Array<'RS' | 'RBiH' | 'HRHB'> = ['RS', 'RBiH', 'HRHB'];
  const orderedFactions = [playerFaction as 'RS' | 'RBiH' | 'HRHB', ...factions.filter(f => f !== playerFaction)];

  // Faction-contextual indicator
  const alliance = loadedGameState?.war_alliance_rbih_hrhb;
  const showAlliance = playerFaction === 'RBiH' || playerFaction === 'HRHB';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 px-3 py-1.5 bg-glass border-t border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">

      {/* 1. Map mode pills (primary) */}
      <div className="flex items-center gap-0.5 shrink-0">
        {primaryModes.map(({ id, label }) => {
          const active = mapMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMapMode(id)}
              className={`px-2.5 py-1 rounded text-[9px] font-mono tracking-widest transition-all duration-200 uppercase ${active
                ? 'bg-accent-gold/20 text-accent-gold shadow-glow-sm font-bold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          );
        })}

        {/* +More dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={`px-2 py-1 rounded text-[9px] font-mono tracking-widest uppercase transition-all ${
              secondaryModes.some(m => m.id === mapMode)
                ? 'bg-accent-gold/20 text-accent-gold font-bold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
            }`}
          >
            {secondaryModes.find(m => m.id === mapMode)?.label ?? '+MORE'}
          </button>
          {moreOpen && (
            <div className="absolute bottom-full left-0 mb-1 bg-[#0c0c18]/95 backdrop-blur-md border border-white/10 rounded-md shadow-xl overflow-hidden">
              {secondaryModes.map(({ id, label, key }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setMapMode(id); setMoreOpen(false); }}
                  className={`block w-full px-4 py-1.5 text-left text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    mapMode === id ? 'text-accent-gold bg-accent-gold/10' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                  }`}
                >
                  {label} <span className="text-white/20 ml-1">{key}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* 2. Territory — player faction prominent, others compact */}
      <div className="hidden md:flex items-center gap-2 px-2 shrink-0">
        {orderedFactions.map((faction, idx) => {
          const pct = territoryPct[faction];
          const isPlayer = faction === playerFaction;
          const color = FACTION_COLORS_SUBTLE[faction] ?? 'text-text-primary';
          return (
            <span key={faction} className={`flex items-center gap-1 font-mono tabular-nums ${color}`}>
              {idx > 0 && <span className="text-white/10 mr-1">|</span>}
              {isPlayer ? (
                <span className="text-[12px] font-bold">{faction} {pct.toFixed(1)}%</span>
              ) : (
                <span className="text-[9px]">{faction} {pct.toFixed(1)}%</span>
              )}
            </span>
          );
        })}
      </div>

      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* 3. Faction-contextual indicator */}
      <div className="hidden lg:flex items-center gap-2 px-2 shrink-0 text-[10px] font-mono">
        {showAlliance && alliance != null && (() => {
          const a = alliance;
          const status = a <= 0.10 ? 'WAR' : a <= 0.20 ? 'MOBILIZING' : a <= 0.45 ? 'STRAINED' : 'ALLIED';
          const color = status === 'WAR' ? '#e05050' : status === 'MOBILIZING' ? '#d4a055' : status === 'STRAINED' ? '#d4d455' : '#50b850';
          return (
            <span className="flex items-center gap-1.5">
              <Icon name="balanced" size={10} color={color} />
              <span style={{ color }} className="font-bold uppercase text-[9px] tracking-wider">{status}</span>
            </span>
          );
        })()}
        {!showAlliance && loadedGameState && (() => {
          // RS: show patron confidence from dimensions
          const dims = loadedGameState.strategicDimensions?.[playerFaction];
          const patronValue = dims?.patron_confidence?.effective_value ?? 50;
          const status = patronValue >= 70 ? 'SUPPORTIVE' : patronValue >= 40 ? 'CAUTIOUS' : 'WAVERING';
          const color = status === 'SUPPORTIVE' ? '#50b850' : status === 'CAUTIOUS' ? '#d4d455' : '#e05050';
          return (
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/40 uppercase">Belgrade:</span>
              <span style={{ color }} className="font-bold uppercase text-[9px] tracking-wider">{status}</span>
            </span>
          );
        })()}

        {/* Active operations count */}
        {loadedGameState?.operations && loadedGameState.operations.length > 0 && (
          <>
            <span className="text-white/10">|</span>
            <span className="flex items-center gap-1 text-accent-gold">
              <Icon name="operation" size={10} color="#c4a35a" />
              <span className="text-[9px]">{loadedGameState.operations.length} ops</span>
            </span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* 4. Layer toggles — gear dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setLayersOpen(!layersOpen)}
          className={`px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${
            layersOpen ? 'bg-white/10 text-text-primary' : 'text-text-secondary/50 hover:text-text-secondary'
          }`}
        >
          LAYERS
        </button>
        {layersOpen && (
          <div className="absolute bottom-full right-0 mb-1 bg-[#0c0c18]/95 backdrop-blur-md border border-white/10 rounded-md shadow-xl overflow-hidden min-w-[120px]">
            {LAYER_TOGGLES.map(({ key, label }) => {
              const t = toggles[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => t.set(!t.value)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    t.value ? 'text-text-primary' : 'text-text-secondary/50'
                  } hover:bg-white/5`}
                >
                  <span className={`w-2 h-2 rounded-sm ${t.value ? 'bg-interactive' : 'bg-white/10 border border-white/20'}`} />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

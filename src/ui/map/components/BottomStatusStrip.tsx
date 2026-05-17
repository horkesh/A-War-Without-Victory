import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS_SUBTLE, FACTION_HEX_COLORS } from '../utils/theme';
import { MAP_MODES, DEV_LAYER_TOGGLES, LIVE_LAYER_TOGGLES } from '../utils/mapModes';
import { Icon } from './icons/Icon';
import osidAreasData from '../../../../data/derived/operational/osid_areas.json';
import { getPlayerFacingFaction } from '../../shared/playerFacingLabels';
import { filterPlayerFacingOperations } from '../../shared/playerVisibility';
import { Z } from '../../shared/zIndex';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

/** Primary modes shown as pills. The rest go in "+More" inline extension. */
const PRIMARY_MODES = ['political', 'ethnic', 'supply', 'operations'];
const primaryModes = MAP_MODES.filter(m => PRIMARY_MODES.includes(m.id));
const secondaryModes = MAP_MODES.filter(m => !PRIMARY_MODES.includes(m.id));

/**
 * Redesigned bottom bar — president's warroom situation ticker.
 * R6: Territory stacked bar with trend arrows. R8: Persistent +MORE expansion.
 */
export function BottomStatusStrip() {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const playerFaction = getPlayerFacingFaction(loadedGameState);
  const playerOperations = useMemo(
    () => filterPlayerFacingOperations(loadedGameState),
    [loadedGameState],
  );

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

  // R6: Territory trend from latestTurnSummary.territory_net
  const territoryNet = loadedGameState?.latestTurnSummary?.territory_net;
  const getTrendArrow = useCallback((faction: 'RS' | 'RBiH' | 'HRHB'): string => {
    if (!territoryNet) return '';
    const net = (territoryNet as Partial<Record<string, number>>)[faction] ?? 0;
    if (net > 0) return ' \u2191'; // up arrow
    if (net < 0) return ' \u2193'; // down arrow
    return ' \u2192'; // right arrow (stable)
  }, [territoryNet]);
  const playerTerritoryPct = playerFaction ? territoryPct[playerFaction] ?? 0 : 0;
  const hostileHeldPct = Math.max(0, 100 - playerTerritoryPct);
  const playerTerritoryTrend = playerFaction ? getTrendArrow(playerFaction) : '';

  // Map mode
  const setStrategicDashboardOpen = useGameStore((s) => s.setStrategicDashboardOpen);
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
  const ghostMapVisible = useGameStore((s) => s.ghostMapVisible);
  const setGhostMapVisible = useGameStore((s) => s.setGhostMapVisible);

  const toggles: Record<string, { value: boolean; set: (v: boolean) => void }> = {
    frontsVisible: { value: frontsVisible, set: setFrontsVisible },
    formationsVisible: { value: formationsVisible, set: setFormationsVisible },
    labelsVisible: { value: labelsVisible, set: setLabelsVisible },
    sectorsVisible: { value: sectorsVisible, set: setSectorsVisible },
    minimapVisible: { value: minimapVisible, set: setMinimapVisible },
    fogVisible: { value: fogVisible, set: setFogVisible },
    battlesVisible: { value: battlesVisible, set: setBattlesVisible },
    municipalityBordersVisible: { value: municipalityBordersVisible, set: setMunicipalityBordersVisible },
    ghostMapVisible: { value: ghostMapVisible, set: setGhostMapVisible },
  };

  // R8: +MORE expansion — persistent, not ephemeral
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // R8: Close +MORE when clicking outside
  useEffect(() => {
    if (!moreExpanded) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreExpanded]);

  // Faction-contextual indicator
  const alliance = loadedGameState?.war_alliance_rbih_hrhb;
  const showAlliance = playerFaction === 'RBiH' || playerFaction === 'HRHB';
  const patronStatus = useMemo(() => {
    if (!playerFaction || (playerFaction !== 'RS' && playerFaction !== 'HRHB')) return null;
    const dims = loadedGameState?.strategicDimensions?.[playerFaction];
    const patronValue = dims?.patron_confidence?.effective_value ?? 50;
    const status = patronValue >= 70 ? 'SUPPORTIVE' : patronValue >= 40 ? 'CAUTIOUS' : 'WAVERING';
    const color = status === 'SUPPORTIVE' ? '#50b850' : status === 'CAUTIOUS' ? '#d4d455' : '#e05050';
    return {
      label: playerFaction === 'HRHB' ? 'Zagreb:' : 'Belgrade:',
      status,
      color,
    };
  }, [loadedGameState?.strategicDimensions, playerFaction]);
  const internationalStatus = useMemo(() => {
    if (playerFaction !== 'RBiH') return null;
    const pressure = loadedGameState?.internationalVisibilityPressure?.composite_ivp
      ?? loadedGameState?.internationalVisibilityPressure?.negotiation_momentum
      ?? null;
    if (pressure == null) return null;
    const status = pressure >= 0.66 ? 'HIGH' : pressure >= 0.33 ? 'ACTIVE' : 'QUIET';
    const color = status === 'HIGH' ? '#d4a055' : status === 'ACTIVE' ? '#d4d455' : '#50b850';
    return { status, color };
  }, [loadedGameState?.internationalVisibilityPressure, playerFaction]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 px-3 py-1.5 bg-glass border-t border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
      style={{ zIndex: Z.SHELL_FLOATING }}
    >

      {/* 1. Map mode pills (primary) + R8: inline secondary expansion */}
      <div className="flex items-center gap-0.5 shrink-0" ref={moreRef}>
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

        {/* R8: +MORE toggle — expands inline instead of ephemeral popup */}
        <button
          type="button"
          onClick={() => setMoreExpanded(prev => !prev)}
          className={`px-2 py-1 rounded text-[9px] font-mono tracking-widest uppercase transition-all ${
            moreExpanded || secondaryModes.some(m => m.id === mapMode)
              ? 'bg-accent-gold/20 text-accent-gold font-bold'
              : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
          }`}
        >
          {moreExpanded ? 'LESS' : secondaryModes.find(m => m.id === mapMode)?.label ?? '+MORE'}
        </button>

        {/* R8: Secondary modes — persistent inline extension */}
        {moreExpanded && secondaryModes.map(({ id, label, key }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setMapMode(id); }}
            className={`px-2.5 py-1 rounded text-[9px] font-mono tracking-widest transition-all duration-200 uppercase ${
              mapMode === id
                ? 'bg-accent-gold/20 text-accent-gold shadow-glow-sm font-bold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
            }`}
            title={`${key}: ${label}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* R6: Territory — stacked horizontal progress bar. R14: Click opens Strategic Dashboard. */}
      <button
        type="button"
        className="hidden md:flex items-center gap-2 px-2 shrink-0 cursor-pointer hover:bg-white/5 rounded transition-colors"
        onClick={() => setStrategicDashboardOpen(true)}
        aria-label="Open Strategic Dashboard"
        title="Open Strategic Dashboard"
      >
        {/* Player-safe bar */}
        <div className="flex h-[14px] rounded-sm overflow-hidden w-[180px] border border-white/10" title="Territory control (area-weighted)">
          <div
            className="h-full transition-all duration-500 relative group"
            style={{ width: `${playerTerritoryPct}%`, backgroundColor: playerFaction ? (FACTION_HEX_COLORS[playerFaction] ?? '#888') : '#888' }}
          >
            {playerTerritoryPct > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white/90 tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {playerTerritoryPct.toFixed(0)}%
              </span>
            )}
          </div>
          <div
            className="h-full transition-all duration-500 relative group bg-white/10"
            style={{ width: `${hostileHeldPct}%` }}
          >
            {hostileHeldPct > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-white/70 tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {hostileHeldPct.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Player-safe labels */}
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-0.5 font-mono tabular-nums ${playerFaction ? (FACTION_COLORS_SUBTLE[playerFaction] ?? 'text-text-primary') : 'text-text-primary'}`}>
            <span className="text-[11px] font-bold">
              Friendly {playerTerritoryPct.toFixed(1)}%
              {playerTerritoryTrend && (
                <span className={`ml-0.5 ${playerTerritoryTrend.includes('\u2191') ? 'text-emerald-400' : playerTerritoryTrend.includes('\u2193') ? 'text-red-400' : 'text-text-secondary/50'}`}>
                  {playerTerritoryTrend}
                </span>
              )}
            </span>
          </span>
          <span className="text-white/10">|</span>
          <span className="flex items-center gap-0.5 font-mono tabular-nums text-text-secondary">
            <span className="text-[9px]">Hostile-held {hostileHeldPct.toFixed(1)}%</span>
          </span>
        </div>
      </button>

      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* 3. Faction-contextual indicator — R6: more prominent */}
      <div className="hidden lg:flex items-center gap-2 px-2 shrink-0 text-[10px] font-mono">
        {showAlliance && alliance != null && (() => {
          const a = alliance;
          const status = a <= 0.10 ? 'WAR' : a <= 0.20 ? 'MOBILIZING' : a <= 0.45 ? 'STRAINED' : 'ALLIED';
          const color = status === 'WAR' ? '#e05050' : status === 'MOBILIZING' ? '#d4a055' : status === 'STRAINED' ? '#d4d455' : '#50b850';
          return (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-panel-bg/50">
              <Icon name="balanced" size={10} color={color} />
              <span style={{ color }} className="font-bold uppercase text-[9px] tracking-wider">{status}</span>
            </span>
          );
        })()}
        {patronStatus && (
          <>
            {showAlliance && <span className="text-white/10">|</span>}
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-panel-bg/50">
              <span className="text-[9px] text-white/50 uppercase font-semibold">{patronStatus.label}</span>
              <span style={{ color: patronStatus.color }} className="font-bold uppercase text-[10px] tracking-wider">{patronStatus.status}</span>
            </span>
          </>
        )}
        {internationalStatus && (
          <>
            {showAlliance && <span className="text-white/10">|</span>}
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-panel-bg/50">
              <span className="text-[9px] text-white/50 uppercase font-semibold">International:</span>
              <span style={{ color: internationalStatus.color }} className="font-bold uppercase text-[10px] tracking-wider">{internationalStatus.status}</span>
            </span>
          </>
        )}

        {/* Active operations count */}
        {playerOperations.length > 0 && (
          <>
            <span className="text-white/10">|</span>
            <span className="flex items-center gap-1 text-accent-gold">
              <Icon name="operation" size={10} color="#c4a35a" />
              <span className="text-[9px]">{playerOperations.length} ops</span>
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
          <div
            className="absolute bottom-full right-0 mb-1 bg-[#0c0c18]/95 backdrop-blur-md border border-white/10 rounded-md shadow-xl overflow-hidden min-w-[120px]"
            style={{ zIndex: Z.SHELL_FLOATING }}
          >
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

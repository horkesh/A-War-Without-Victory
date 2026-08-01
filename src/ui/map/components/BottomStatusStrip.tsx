import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS_SUBTLE, FACTION_HEX_COLORS } from '../utils/theme';
import { MAP_MODES, DEV_LAYER_TOGGLES, LIVE_LAYER_TOGGLES } from '../utils/mapModes';
import { Icon } from './icons/Icon';
import osidAreasData from '../../../../data/derived/operational/osid_areas.json';
import { getPlayerFacingFaction } from '../../shared/playerFacingLabels';
import { filterPlayerFacingOperations } from '../../shared/playerVisibility';
import { Z } from '../../shared/zIndex';
import { t } from '../i18n';
import { openArmyHQRecordsSubTab } from '../utils/shellNavigation';
import { BranchTagBadgeRow } from './BranchTagBadgeRow';
import type { EventDefinition } from '../../../sim/events/event_types';
import { shouldNarrateTerritorySummary } from '../data/territorySummaryGuard';

const osidAreas = osidAreasData as { total_area_km2: number; areas: Record<string, number> };

/** Primary modes shown as pills. The rest go in "+More" inline extension. */
const PRIMARY_MODES = ['political', 'ethnic', 'supply', 'operations'];
const primaryModes = MAP_MODES.filter(m => PRIMARY_MODES.includes(m.id));
const secondaryModes = MAP_MODES.filter(m => !PRIMARY_MODES.includes(m.id));
const ALLIANCE_STATUS_LABEL_KEYS = {
  WAR: 'statusStrip.allianceStatus.war',
  MOBILIZING: 'statusStrip.allianceStatus.mobilizing',
  STRAINED: 'statusStrip.allianceStatus.strained',
  ALLIED: 'statusStrip.allianceStatus.allied',
} as const;
const PATRON_STATUS_LABEL_KEYS = {
  SUPPORTIVE: 'statusStrip.patronStatus.supportive',
  CAUTIOUS: 'statusStrip.patronStatus.cautious',
  WAVERING: 'statusStrip.patronStatus.wavering',
} as const;
const INTERNATIONAL_STATUS_LABEL_KEYS = {
  HIGH: 'statusStrip.internationalStatus.high',
  ACTIVE: 'statusStrip.internationalStatus.active',
  QUIET: 'statusStrip.internationalStatus.quiet',
} as const;

/**
 * Phase H Packet 7 — props for catalog wiring.
 *
 * `eventCatalog` is supplied from `App.tsx` (boot-time load via
 * `loadEventDefinitionsFull`). When provided alongside a player faction
 * AND a raw GameState handle in `loadedGameState.rawGameState`, the
 * H4 `BranchTagBadgeRow` is rendered inline in the faction-contextual
 * indicator zone. Optional + degrades gracefully: existing callers that
 * mount the strip without props (legacy / test harnesses) continue to
 * render unchanged.
 */
export interface BottomStatusStripProps {
  eventCatalog?: ReadonlyMap<string, EventDefinition>;
}

/**
 * Redesigned bottom bar — president's warroom situation ticker.
 * R6: Territory stacked bar with trend arrows. R8: Persistent +MORE expansion.
 */
export function BottomStatusStrip({ eventCatalog }: BottomStatusStripProps = {}) {
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const turnAftermathDigest = useGameStore((s) => s.turnAftermathDigest);
  const setTurnAftermathOpen = useGameStore((s) => s.setTurnAftermathOpen);
  const setTurnAftermathDigest = useGameStore((s) => s.setTurnAftermathDigest);
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
  const territoryNet = shouldNarrateTerritorySummary(loadedGameState?.latestTurnSummary)
    ? loadedGameState?.latestTurnSummary?.territory_net
    : undefined;
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
  const activeSecondaryMode = secondaryModes.find(m => m.id === mapMode);

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
      label: playerFaction === 'HRHB' ? t('statusStrip.patron.zagreb') : t('statusStrip.patron.belgrade'),
      status,
      statusLabel: t(PATRON_STATUS_LABEL_KEYS[status]),
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
    return { status, statusLabel: t(INTERNATIONAL_STATUS_LABEL_KEYS[status]), color };
  }, [loadedGameState?.internationalVisibilityPressure, playerFaction]);

  return (
    <div
      data-testid="bottom-status-strip"
      data-awwv-counter-occluder="true"
      className="absolute bottom-0 left-0 right-0 flex items-center justify-start gap-2 overflow-hidden px-3 py-1.5 bg-glass border-t border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
      style={{ zIndex: Z.SHELL_FLOATING }}
    >

      {/* 1. Map mode pills (primary) + R8: inline secondary expansion */}
      <div className="flex items-center gap-0.5 shrink-0" ref={moreRef}>
        {primaryModes.map(({ id, labelKey }) => {
          const active = mapMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMapMode(id)}
              className={`px-2.5 py-1 rounded text-xs font-mono tracking-widest transition-all duration-200 uppercase ${active
                ? 'bg-accent-gold/20 text-accent-gold shadow-glow-sm font-bold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
              }`}
            >
              {t(labelKey)}
            </button>
          );
        })}

        {/* R8: +MORE toggle — expands inline instead of ephemeral popup */}
        <button
          type="button"
          onClick={() => setMoreExpanded(prev => !prev)}
          className={`px-2 py-1 rounded text-xs font-mono tracking-widest uppercase transition-all ${
            moreExpanded || secondaryModes.some(m => m.id === mapMode)
              ? 'bg-accent-gold/20 text-accent-gold font-bold'
              : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
          }`}
        >
          {moreExpanded ? t('statusStrip.less') : activeSecondaryMode ? t(activeSecondaryMode.labelKey) : t('statusStrip.more')}
        </button>

        {/* R8: Secondary modes — persistent inline extension */}
        {moreExpanded && secondaryModes.map(({ id, labelKey, key }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setMapMode(id); }}
            className={`px-2.5 py-1 rounded text-xs font-mono tracking-widest transition-all duration-200 uppercase ${
              mapMode === id
                ? 'bg-accent-gold/20 text-accent-gold shadow-glow-sm font-bold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
            }`}
            title={`${key}: ${t(labelKey)}`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* R6: Territory — stacked horizontal progress bar. Click opens The War's
          Record (Army HQ RECORDS tab), home of the territory-over-time trend
          chart re-hosted from the retired Strategic Dashboard. */}
      <button
        type="button"
        className="hidden md:flex items-center gap-2 px-2 shrink-0 cursor-pointer hover:bg-white/5 rounded transition-colors"
        onClick={() => openArmyHQRecordsSubTab(useGameStore.getState(), 'aftermath')}
        aria-label={t('statusStrip.openWarRecord')}
        title={t('statusStrip.openWarRecord')}
      >
        {/* Player-safe bar */}
        <div className="flex h-[14px] rounded-sm overflow-hidden w-[180px] border border-white/10" title={t('statusStrip.territoryControlTitle')}>
          <div
            className="h-full transition-all duration-500 relative group"
            style={{ width: `${playerTerritoryPct}%`, backgroundColor: playerFaction ? (FACTION_HEX_COLORS[playerFaction] ?? '#888') : '#888' }}
          >
            {playerTerritoryPct > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white/90 tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {playerTerritoryPct.toFixed(0)}%
              </span>
            )}
          </div>
          <div
            className="h-full transition-all duration-500 relative group bg-white/10"
            style={{ width: `${hostileHeldPct}%` }}
          >
            {hostileHeldPct > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white/70 tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {hostileHeldPct.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Player-safe labels */}
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-0.5 font-mono tabular-nums ${playerFaction ? (FACTION_COLORS_SUBTLE[playerFaction] ?? 'text-text-primary') : 'text-text-primary'}`}>
            <span className="text-xs font-bold">
              {t('statusStrip.friendlyPct', { pct: playerTerritoryPct.toFixed(1) })}
              {playerTerritoryTrend && (
                <span className={`ml-0.5 ${playerTerritoryTrend.includes('\u2191') ? 'text-emerald-400' : playerTerritoryTrend.includes('\u2193') ? 'text-red-400' : 'text-text-secondary/50'}`}>
                  {playerTerritoryTrend}
                </span>
              )}
            </span>
          </span>
          <span className="text-white/10">|</span>
          <span className="flex items-center gap-0.5 font-mono tabular-nums text-text-secondary">
            <span className="text-xs">{t('statusStrip.hostileHeldPct', { pct: hostileHeldPct.toFixed(1) })}</span>
          </span>
        </div>
      </button>

      <div className="w-[1px] h-4 bg-white/10 shrink-0" />

      {/* 3. Faction-contextual indicator — R6: more prominent */}
      <div className="hidden lg:flex min-w-16 flex-1 items-center gap-2 overflow-hidden px-2 text-xs font-mono">
        <div
          data-testid="status-strip-secondary-telemetry"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
        >
        {showAlliance && alliance != null && (() => {
          const a = alliance;
          const status = a <= 0.10 ? 'WAR' : a <= 0.20 ? 'MOBILIZING' : a <= 0.45 ? 'STRAINED' : 'ALLIED';
          const color = status === 'WAR' ? '#e05050' : status === 'MOBILIZING' ? '#d4a055' : status === 'STRAINED' ? '#d4d455' : '#50b850';
          return (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-panel-bg/50">
              <Icon name="balanced" size={10} color={color} />
              <span style={{ color }} className="font-bold uppercase text-xs tracking-wider">{t(ALLIANCE_STATUS_LABEL_KEYS[status])}</span>
            </span>
          );
        })()}
        {patronStatus && (
          <>
            {showAlliance && <span className="text-white/10">|</span>}
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-panel-bg/50">
              <span className="text-xs text-white/50 uppercase font-semibold">{patronStatus.label}</span>
              <span style={{ color: patronStatus.color }} className="font-bold uppercase text-xs tracking-wider">{patronStatus.statusLabel}</span>
            </span>
          </>
        )}
        {internationalStatus && (
          <>
            {showAlliance && <span className="text-white/10">|</span>}
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/10 bg-panel-bg/50">
              <span className="text-xs text-white/50 uppercase font-semibold">{t('statusStrip.international')}:</span>
              <span style={{ color: internationalStatus.color }} className="font-bold uppercase text-xs tracking-wider">{internationalStatus.statusLabel}</span>
            </span>
          </>
        )}

        {/* Active operations count */}
        {playerOperations.length > 0 && (
          <>
            <span className="text-white/10">|</span>
            <span className="flex shrink-0 whitespace-nowrap items-center gap-1 text-xs text-accent-gold">
              <Icon name="operation" size={10} color="#c4a35a" />
              <span>{t('statusStrip.opsCount', { count: playerOperations.length })}</span>
            </span>
          </>
        )}
        </div>

        {/* Phase H Packet 7 — H4 Branch-tag faction badge row mount.
            The component self-degrades when state / catalog absent or no
            tags active, so the surrounding divider is conditional on the
            child rendering. Mount lives inside the faction-contextual
            indicator zone per H1 §4.2D guidance. */}
        {playerFaction && eventCatalog && loadedGameState?.rawGameState && (
          <BranchTagBadgeRow
            faction={playerFaction}
            eventCatalog={eventCatalog}
            state={loadedGameState.rawGameState}
          />
        )}
      </div>

      {/* 4. Layer toggles — gear dropdown */}
      {turnAftermathDigest && (
        <div className="hidden min-w-0 max-w-[38vw] items-center gap-2 border border-white/10 bg-panel-card/70 px-2 py-0.5 text-xs text-text-secondary shadow-sm lg:flex">
          <span className="truncate">{turnAftermathDigest.headline}</span>
          <button
            type="button"
            onClick={() => setTurnAftermathOpen(true)}
            className="shrink-0 text-xs font-bold uppercase tracking-wider text-accent-gold hover:text-amber-200"
            aria-label={t('aftermath.digest.reviewAria')}
          >
            {t('aftermath.digest.review')}
          </button>
          <button
            type="button"
            onClick={() => setTurnAftermathDigest(null)}
            className="shrink-0 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary"
            aria-label={t('aftermath.digest.dismissAria')}
          >
            {t('aftermath.digest.dismiss')}
          </button>
        </div>
      )}

      <div className="relative ml-auto shrink-0">
        <button
          type="button"
          onClick={() => setLayersOpen(!layersOpen)}
          className={`px-2 py-1 rounded text-xs font-mono uppercase tracking-wider transition-all ${
            layersOpen ? 'bg-white/10 text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {t('statusStrip.layers')}
        </button>
        {layersOpen && (
          <div
            className="absolute bottom-full right-0 mb-1 bg-[#0c0c18]/95 backdrop-blur-md border border-white/10 rounded-md shadow-xl overflow-hidden min-w-[120px]"
            style={{ zIndex: Z.SHELL_FLOATING }}
          >
            {LAYER_TOGGLES.map(({ key, labelKey }) => {
              const toggle = toggles[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle.set(!toggle.value)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs font-mono uppercase tracking-wider transition-colors ${
                    toggle.value ? 'text-text-primary' : 'text-text-secondary'
                  } hover:bg-white/5`}
                >
                  <span className={`w-2 h-2 rounded-sm ${toggle.value ? 'bg-interactive' : 'bg-white/10 border border-white/20'}`} />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

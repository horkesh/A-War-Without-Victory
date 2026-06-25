import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CorpsCard } from './CorpsCard';
import { FACTION_COLORS } from '../utils/theme';
import type { CorpsFrontSectorView, FormationView, OperationView } from '../data/types';
import { SituationTab } from './SituationTab';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { AccordionHeader } from './AccordionHeader';
import { toTitleCase } from '../utils/formatters';
import {
  getPlayerSafeCorpsName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeMunicipalityName,
  getPlayerSafeOperationPhaseLabel,
  getPlayerSafeDisplayLabel,
  getPlayerSafeSectorStrengthLabel,
} from '../utils/playerSafeText';
import { getArmyCrest, getArmyName } from '../utils/factionAssets';
import { getFactionArmyCommander, getSyntheticJnaCommandPresentation, resolveCorpsCommanderDisplay } from '../utils/officerUtils';
import { formatRank } from '../utils/officerCharacter';
import { inspectOnField } from '../utils/shellNavigation';
import { getPlayerFacingFaction, getPlayerFacingSectorName, getPlayerVisibleFactions } from '../../shared/playerFacingLabels';
import { filterPlayerFacingOperations, isFieldedTacticalFormation } from '../../shared/playerVisibility';
import { isSectorAssignmentExemptCorpsId } from '../../../sim/combat/corps_front_sectors_constants.js';
import { t, useLocale } from '../i18n';
import { compareLocalizedFormationNames, getLocalizedFormationName } from '../data/formationNameLocalizations';
import { buildSectorFormationAssignment, getSectorCoverageTier, type SectorCoverageTier } from '../utils/sectorUtils';

const FACTION_ORDER = ['RS', 'RBiH', 'HRHB'] as const;

const SECTOR_COVERAGE_KEYS: Record<SectorCoverageTier, Parameters<typeof t>[0]> = {
  uncovered: 'oob.sectorCoverage.uncovered',
  thin: 'oob.sectorCoverage.thin',
  held: 'oob.sectorCoverage.held',
  dense: 'oob.sectorCoverage.dense',
};

function sectorCoverageLabel(tier: SectorCoverageTier): string {
  return t(SECTOR_COVERAGE_KEYS[tier]);
}

function formatReportedWhole(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value)).toLocaleString()
    : t('orbat.metricUnreported');
}

function formatReportedPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.max(0, value).toFixed(1)}%`
    : t('orbat.metricUnreported');
}

function pickOobSectorInspectAnchorOsid(sector: CorpsFrontSectorView): string | undefined {
  for (const segment of sector.sub_segments ?? []) {
    const osid = segment.friendly_osids?.[0] ?? segment.enemy_osids?.[0];
    if (osid) return osid;
  }
  return undefined;
}

function groupFormationsByCorps(formations: FormationView[], locale: ReturnType<typeof useLocale>[0]): Map<string, FormationView[]> {
  const byCorps = new Map<string, FormationView[]>();
  for (const f of formations) {
    const key = f.corps_id ?? '_ungrouped';
    const list = byCorps.get(key) ?? [];
    list.push(f);
    byCorps.set(key, list);
  }
  for (const list of byCorps.values()) {
    list.sort((a, b) => compareLocalizedFormationNames(a, b, locale));
  }
  return byCorps;
}





const STRENGTH_BADGE_STYLES: Record<string, string> = {
  fortress: 'text-green-400 font-bold',
  strong: 'text-green-400',
  adequate: 'text-amber-400',
  thin: 'text-orange-400',
  critical: 'text-red-400 font-bold',
};

function SectorStrengthBadge({ strengthClass }: { strengthClass: string }) {
  const style = STRENGTH_BADGE_STYLES[strengthClass] ?? 'text-text-secondary';
  const label = getPlayerSafeSectorStrengthLabel(strengthClass);
  return (
    <span className={`text-[9px] uppercase tracking-tight shrink-0 ${style}`}>
      {label}
    </span>
  );
}

// TODO: Fog coverage indicator — compute visibleEnemyOsids.length / totalEnemyOsids * 100
// from loadedGameState.fogOfWar and display as "Intel: XX%" in the sidebar footer.
// Deferred: requires determining totalEnemyOsids which needs cross-referencing controlBySettlement.

/**
 * Left sidebar: Collapsible accordion sections — Situation, Army, Sectors.
 */
export function OOBSidebar() {
  const [locale] = useLocale();
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const selectedCorpsFrontSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
  const setSelectedArmyHqId = useGameStore((s) => s.setSelectedArmyHqId);
  const setSelectedOperationKey = useGameStore((s) => s.setSelectedOperationKey);
  const selectedOperationKey = useGameStore((s) => s.selectedOperationKey);
  const setSelectedOrbatCorpsId = useGameStore((s) => s.setSelectedOrbatCorpsId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setHoveredCorpsId = useGameStore((s) => s.setHoveredCorpsId);
  const setHoveredSectorId = useGameStore((s) => s.setHoveredSectorId);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    situation: true,
    army: true,
    mobilization: false,
    operations: false,
    sectors: false,
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const playerFaction = loadedGameState ? getPlayerFacingFaction(loadedGameState) : null;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };



  const corpsFormationById = useMemo(() => {
    const map = new Map<string, FormationView>();
    if (!loadedGameState?.formations) return map;
    for (const formation of getPlayerVisibleFactions(loadedGameState.formations, playerFaction)) {
      if (formation.kind === 'corps' || formation.kind === 'corps_asset' || formation.kind === 'army_hq') {
        map.set(formation.id, formation);
      }
    }
    return map;
  }, [loadedGameState?.formations, playerFaction]);

  const phantomCommandFormationsByFaction = useMemo(() => {
    const map = new Map<string, FormationView[]>();
    if (!loadedGameState?.formations) return map;
    const visibleFormations = getPlayerVisibleFactions(loadedGameState.formations, playerFaction);
    const commandById = new Map<string, FormationView>();
    for (const formation of visibleFormations) {
      if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
        commandById.set(formation.id, formation);
      }
    }
    const phantomCommandIds = new Set<string>();
    for (const formation of visibleFormations) {
      if (formation.kind !== 'jna_phantom' && !formation.tags?.includes('jna_phantom')) continue;
      if (formation.corps_id && commandById.has(formation.corps_id)) {
        phantomCommandIds.add(formation.corps_id);
      }
    }
    for (const commandId of phantomCommandIds) {
      const formation = commandById.get(commandId);
      if (!formation) continue;
      const list = map.get(formation.faction) ?? [];
      list.push(formation);
      map.set(formation.faction, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareLocalizedFormationNames(a, b, locale));
    }
    return map;
  }, [loadedGameState?.formations, playerFaction, locale]);

  const reserveByFaction = useMemo(() => {
    const map = new Map<string, FormationView[]>();
    if (!loadedGameState || !loadedGameState.formations || !playerFaction) return map;
    for (const formation of getPlayerVisibleFactions(loadedGameState.formations, playerFaction)) {
      if (!isFieldedTacticalFormation(formation)) continue;
      const isReserve = !formation.corps_id || isSectorAssignmentExemptCorpsId(formation.corps_id);
      if (!isReserve) continue;
      const list = map.get(formation.faction) ?? [];
      list.push(formation);
      map.set(formation.faction, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareLocalizedFormationNames(a, b, locale));
    }
    return map;
  }, [loadedGameState, playerFaction, locale]);

  const armyByFaction = useMemo(() => {
    if (!loadedGameState || !loadedGameState.formations || !playerFaction) return new Map<string, FormationView[]>();
    const map = new Map<string, FormationView[]>();
    const reserveIds = new Set(Array.from(reserveByFaction.values()).flatMap((formations) => formations.map((f) => f.id)));
    for (const f of getPlayerVisibleFactions(loadedGameState.formations, playerFaction)) {
      if (!isFieldedTacticalFormation(f)) continue;
      if (reserveIds.has(f.id)) continue;
      const list = map.get(f.faction) ?? [];
      list.push(f);
      map.set(f.faction, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.corps_id ?? '').localeCompare(b.corps_id ?? '', 'en-US', { numeric: true, sensitivity: 'base' }) || compareLocalizedFormationNames(a, b, locale));
    }
    return map;
  }, [loadedGameState, reserveByFaction, playerFaction, locale]);

  const corpsColorMap = useMemo(
    () => (loadedGameState?.corpsFrontSectors ? buildCorpsColorMap(loadedGameState.corpsFrontSectors) : {}),
    [loadedGameState?.corpsFrontSectors]
  );

  // Group operations by faction
  const operationsByFaction = useMemo(() => {
    const ops = loadedGameState ? filterPlayerFacingOperations(loadedGameState) : null;
    if (!ops || ops.length === 0) return null;
    const map = new Map<string, OperationView[]>();
    for (const op of ops) {
      const list = map.get(op.faction) ?? [];
      list.push(op);
      map.set(op.faction, list);
    }
    return map;
  }, [loadedGameState]);

  // Group sectors by faction for the Sectors accordion
  const sectorsByFaction = useMemo(() => {
    const sectors = loadedGameState ? getPlayerVisibleFactions(loadedGameState.corpsFrontSectors ?? [], playerFaction) : null;
    if (!sectors || sectors.length === 0) return null;
    const map = new Map<string, typeof sectors>();
    for (const s of sectors) {
      const list = map.get(s.faction) ?? [];
      list.push(s);
      map.set(s.faction, list);
    }
    return map;
  }, [loadedGameState?.corpsFrontSectors, playerFaction]);

  useEffect(() => {
    if (!expandedSections.army) return;
    const root = sidebarRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [expandedSections.army, selectedFormationId, selectedOsid]);

  // C.2: Auto-expand Sectors accordion + scroll to selected sector
  useEffect(() => {
    if (!selectedCorpsFrontSectorId) return;
    setExpandedSections((prev) => (prev.sectors ? prev : { ...prev, sectors: true }));
    // Defer scroll to allow DOM to update after expansion
    requestAnimationFrame(() => {
      const root = sidebarRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-sector-id="${selectedCorpsFrontSectorId}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }, [selectedCorpsFrontSectorId]);

  const toggle = (faction: string) => {
    setCollapsed((prev) => ({ ...prev, [faction]: !prev[faction] }));
  };

  const getCorpsStance = (corpsId: string, faction: string) => {
    const corpsFormation = corpsFormationById.get(corpsId);
    return corpsFormation?.corpsStance ?? loadedGameState?.armyStance?.[faction];
  };

  const totalFormations = useMemo(() => {
    let n = 0;
    if (armyByFaction && typeof armyByFaction.values === 'function') {
      for (const list of armyByFaction.values()) n += list.length;
    }
    if (reserveByFaction && typeof reserveByFaction.values === 'function') {
      for (const list of reserveByFaction.values()) n += list.length;
    }
    return n;
  }, [armyByFaction, reserveByFaction]);
  const totalOperations = loadedGameState ? filterPlayerFacingOperations(loadedGameState).length : 0;
  const totalSectors = loadedGameState ? getPlayerVisibleFactions(loadedGameState.corpsFrontSectors ?? [], playerFaction).length : 0;
  const mobilizationSummary = loadedGameState?.mobilizationSummary;

  if (!loadedGameState) {
    return (
      <div
        className="absolute left-0 z-10 w-[15.5rem] flex flex-col bg-panel-bg/95 backdrop-blur-sm border-r border-panel-border overflow-hidden"
        style={{ direction: 'ltr', top: 'var(--awwv-toolbar-clearance, 5.5rem)', bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)' }}
      >
        <div className="px-2.5 py-1.5 font-sans text-[11px] text-accent-gold uppercase tracking-[0.14em] font-semibold border-b border-panel-border glow-text">
          {t('oob.command')}
        </div>
        <div className="px-2.5 py-2 text-[11px] text-text-secondary italic">{t('oob.loadSaveHelp')}</div>
      </div>
    );
  }

  return (
    <div
        className="absolute left-0 z-10 w-[15.5rem] flex flex-col bg-panel-bg/95 backdrop-blur-sm border-r border-panel-border overflow-hidden"
      style={{ direction: 'ltr', top: 'var(--awwv-toolbar-clearance, 5.5rem)', bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)' }}
    >
      {/* Overlay — explicitly absolute to avoid flex-item space consumption */}
      <div className="px-2.5 py-1.5 font-sans text-[11px] text-accent-gold uppercase tracking-[0.14em] font-semibold border-b border-panel-border shrink-0 relative z-10 glow-text">
        {t('oob.command')}
      </div>

      {/* Main Container — must be relative and flex-grow to fill the remaining sidebar height */}
      <div
        className="flex-grow flex flex-col min-h-0 min-w-0 relative z-10"
      >
        <div
          className="flex-1 overflow-auto min-h-0 min-w-0"
          ref={sidebarRef}
        >
          {/* ── Situation ── */}
          <AccordionHeader
            label={t('inbox.situation')}
            expanded={expandedSections.situation}
            onToggle={() => toggleSection('situation')}
          />
          {expandedSections.situation && (
            <SituationTab state={loadedGameState} />
          )}

          {/* ── Army ── */}
          <AccordionHeader
            label={t('oob.army')}
            count={totalFormations}
            expanded={expandedSections.army}
            onToggle={() => toggleSection('army')}
          />
          {expandedSections.army && (
            <div className="p-2 space-y-2">
              {!armyByFaction || (armyByFaction.size === 0 && reserveByFaction.size === 0 && phantomCommandFormationsByFaction.size === 0) ? (
                <div className="text-xs text-text-secondary italic">{t('oob.noFormations')}</div>
              ) : (
                FACTION_ORDER.filter((f) => f === playerFaction && (armyByFaction.has(f) || reserveByFaction.has(f) || phantomCommandFormationsByFaction.has(f))).map((faction, factionIndex) => {
                  const formations = armyByFaction.get(faction) ?? [];
                  const reserves = reserveByFaction.get(faction) ?? [];
                  const phantomCommandFormations = phantomCommandFormationsByFaction.get(faction) ?? [];
                  const isCollapsed = collapsed[faction];
                  const byCorps = groupFormationsByCorps(formations, locale);
                  const reserveByCorps = groupFormationsByCorps(reserves, locale);
                  // Separate army HQ groups from real corps — HQ units render first with distinct styling
                  const armyHqIds = new Set(
                    loadedGameState.formations
                      .filter(f => f.faction === faction && f.kind === 'army_hq')
                      .map(f => f.id)
                  );
                  const hqEntries = Array.from(reserveByCorps.entries()).filter(([id]) => armyHqIds.has(id));
                  const corpsEntriesById = new Map(Array.from(byCorps.entries()).filter(([id]) => !armyHqIds.has(id)));
                  for (const command of phantomCommandFormations) {
                    if (corpsEntriesById.has(command.id)) continue;
                    corpsEntriesById.set(command.id, []);
                  }
                  const corpsEntries = Array.from(corpsEntriesById.entries())
                    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

                  const FACTION_DIVIDER_BG: Record<string, string> = {
                    RS: 'bg-faction-rs/8',
                    RBiH: 'bg-faction-rbih/8',
                    HRHB: 'bg-faction-hrhb/8',
                  };
                  const FACTION_DIVIDER_BORDER: Record<string, string> = {
                    RS: 'border-faction-rs/25',
                    RBiH: 'border-faction-rbih/25',
                    HRHB: 'border-faction-hrhb/25',
                  };

                  return (
                    <div key={faction} className="space-y-1.5">
                      {/* Faction divider — prominent separator between army sections */}
                      {factionIndex > 0 && (
                        <div className="h-px bg-panel-border mt-1.5 mb-1" />
                      )}
                      <div className={`flex items-center justify-center gap-1.5 py-1 -mx-2 px-2 border-y ${FACTION_DIVIDER_BORDER[faction] ?? 'border-panel-border'} ${FACTION_DIVIDER_BG[faction] ?? 'bg-panel-card'}`}>
                        {getArmyCrest(faction) && (
                          <img src={getArmyCrest(faction)} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />
                        )}
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.16em] ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>
                          {getArmyName(faction) ?? faction}
                        </span>
                        {getArmyCrest(faction) && (
                          <img src={getArmyCrest(faction)} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />
                        )}
                      </div>
                      <div className="w-full flex items-stretch justify-between gap-1 rounded font-mono text-[11px] font-medium bg-panel-card border border-panel-border text-left group/faction">
                        <button
                          type="button"
                          onClick={() => setSelectedArmyId(faction)}
                          className="flex flex-1 flex-col gap-0.5 min-w-0 px-2 py-1 text-left hover:bg-panel-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold"
                          title={t('oob.viewArmySummary', { faction: getPlayerSafeMilitaryFactionName(faction) })}
                        >
                          <span className="flex items-center gap-1.5">
                            {getArmyCrest(faction) && (
                              <img src={getArmyCrest(faction)} alt="" className="w-4.5 h-4.5 object-contain" />
                            )}
                            <span className={`${FACTION_COLORS[faction] ?? 'text-text-primary'} truncate`}>
                              {getArmyName(faction) ? `${getArmyName(faction)} / ${getPlayerSafeMilitaryFactionName(faction)}` : getPlayerSafeMilitaryFactionName(faction)}
                            </span>
                          </span>
                          {(() => {
                            const commander = getFactionArmyCommander(faction, loadedGameState);
                            if (commander) {
                              return (
                                <span className="block text-[9px] text-text-secondary pl-6">
                                  <span className="block">{t('oob.co')}</span>
                                  <span className="block text-accent-gold font-semibold">{formatRank(commander.rank)} {commander.name}</span>
                                  <span className="block mt-0.5 leading-snug text-text-secondary">
                                    {commander.bio_short ?? t('oob.serviceRecordPending')}
                                  </span>
                                  {commander.command_style && (
                                    <span className="block mt-0.5 text-[8px] uppercase tracking-wide text-text-secondary/80">
                                      {t('oob.style')} <span className="normal-case tracking-normal text-text-secondary">{commander.command_style}</span>
                                    </span>
                                  )}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(faction)}
                          className="flex shrink-0 items-center gap-1.5 px-2 py-1 text-left hover:bg-panel-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold"
                          aria-expanded={!isCollapsed}
                          aria-label={isCollapsed
                            ? t('oob.expandFaction', { faction: getPlayerSafeMilitaryFactionName(faction) })
                            : t('oob.collapseFaction', { faction: getPlayerSafeMilitaryFactionName(faction) })}
                        >
                          <span className="text-text-secondary tabular-nums text-[9px]">{t('oob.formationCount', { count: formations.length + reserves.length })}</span>
                          <span
                            className="text-text-secondary group-hover/faction:text-text-primary transition-colors"
                          >
                            {isCollapsed ? '\u25B6' : '\u25BC'}
                          </span>
                        </button>
                      </div>
                      {!isCollapsed && (
                        <>
                          {/* HQ Reserve Units — rendered above corps with distinct styling */}
                          {hqEntries.map(([hqId, hqBrigades]) => {
                            const hqFormation = corpsFormationById.get(hqId);
                            const hqName = hqFormation ? getLocalizedFormationName(hqFormation, locale) : 'Main Staff';
                            return (
                              <div
                                key={hqId}
                                className="w-full text-left ml-2 px-2 py-1.5 rounded border border-accent-gold/20 bg-accent-gold/5"
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between text-left hover:text-amber-200 transition-colors"
                                  onClick={() => setSelectedArmyHqId(hqId)}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[9px] text-accent-gold font-bold uppercase tracking-wider">{t('oob.reserveHq', { name: hqName })}</span>
                                  </div>
                                  <span className="text-[10px] text-text-secondary tabular-nums shrink-0">{t('oob.unitCount', { count: hqBrigades.length })}</span>
                                </button>
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {hqBrigades.map(b => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      data-testid="oob-hq-reserve-brigade"
                                      data-formation-id={b.id}
                                      data-army-hq-id={hqId}
                                      className="text-[9px] text-accent-gold/70 truncate hover:text-accent-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold/70"
                                      onClick={() => inspectOnField(useGameStore.getState(), {
                                        kind: 'field-formation-in-army-reserve',
                                        formationId: b.id,
                                        armyHqId: hqId,
                                        osid: b.location_osid ?? null,
                                      })}
                                    >
                                      {getLocalizedFormationName(b, locale)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {corpsEntries.map(([corpsId, brigades]) => {
                            const corpsSectors = loadedGameState?.corpsFrontSectors?.filter((s) => s.corps_id === corpsId) ?? [];
                            const corpsOps = filterPlayerFacingOperations(loadedGameState).filter((op) => op.corps_id === corpsId);
                            const activeOp = corpsOps.find((op) => op.phase === 'execution');
                            const displayedOp = activeOp ?? corpsOps.find((op) => op.phase === 'planning');
                            const commander = loadedGameState
                              ? resolveCorpsCommanderDisplay(corpsId, faction, loadedGameState)
                              : null;
                            const corpsFormation = corpsFormationById.get(corpsId);
                            const syntheticCommand = commander?.source === 'synthetic' && corpsFormation && loadedGameState
                              ? getSyntheticJnaCommandPresentation(corpsFormation, corpsOps, loadedGameState)
                              : null;
                            return (
                              <CorpsCard
                                key={corpsId}
                                corpsId={corpsId}
                                corpsName={corpsId === '_ungrouped'
                                  ? 'Ungrouped'
                                  : getPlayerSafeCorpsName(corpsFormationById.get(corpsId)?.name, corpsId)}
                                brigades={brigades}
                                faction={faction}
                                stance={getCorpsStance(corpsId, faction)}
                                onHeaderClick={() => {
                                  if (corpsId !== '_ungrouped') {
                                    setSelectedCorpsId(corpsId);
                                  } else {
                                    const first = [...brigades].sort((a, b) => a.id.localeCompare(b.id))[0];
                                    if (first) setSelectedFormationId(first.id);
                                  }
                                }}
                                onHoverOsidsChange={(osids) => setHoveredOsids(osids)}
                                onMouseEnter={() => setHoveredCorpsId(corpsId)}
                                onMouseLeave={() => setHoveredCorpsId(null)}
                                onOrbatClick={() => setSelectedOrbatCorpsId(corpsId)}
                                sectorCount={corpsSectors.length}
                                activeOperationName={displayedOp?.display_name}
                                activeOperationPhase={displayedOp?.phase}
                                commanderName={syntheticCommand?.commanderName ?? commander?.name}
                                commanderActing={syntheticCommand ? false : commander?.acting}
                                commanderLabel={syntheticCommand ? t('corpsCard.operationCommander') : undefined}
                                commanderDetail={syntheticCommand ? t('corpsCard.syntheticJnaStaff', {
                                  operation: syntheticCommand.operationName ?? t('corpsCard.syntheticJnaOperationFallback'),
                                }) : undefined}
                              />
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Operations ── */}
          <AccordionHeader
            label={t('oob.mobilization')}
            count={mobilizationSummary ? Object.keys(mobilizationSummary).length : undefined}
            expanded={expandedSections.mobilization}
            onToggle={() => toggleSection('mobilization')}
            testId="oob-section-mobilization-toggle"
          />
          {expandedSections.mobilization && (
            <div className="p-2 space-y-1.5 text-[11px]">
              {!mobilizationSummary ? (
                <div className="text-text-secondary italic px-1">{t('oob.noMobilizationData')}</div>
              ) : (
                FACTION_ORDER.filter((faction) => faction === playerFaction && Boolean(mobilizationSummary[faction])).map((faction) => {
                  const summary = mobilizationSummary[faction]!;
                  return (
                    <div key={faction} className="rounded border border-panel-border bg-panel-card p-1.5 space-y-1">
                      <div className={`font-mono text-[10px] font-medium ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>
                        {getPlayerSafeMilitaryFactionName(faction)}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <span className="text-text-secondary">{t('oob.available')}</span>
                        <span className="text-text-primary tabular-nums">{formatReportedWhole(summary.total_available)}</span>
                        <span className="text-text-secondary">{t('oob.committed')}</span>
                        <span className="text-text-primary tabular-nums">{formatReportedWhole(summary.total_committed)}</span>
                        <span className="text-text-secondary">{t('oob.exhausted')}</span>
                        <span className="text-text-primary tabular-nums">{formatReportedWhole(summary.total_exhausted)}</span>
                        <span className="text-text-secondary">{t('corpsDetail.exhaustion')}</span>
                        <span className="text-text-primary tabular-nums">{formatReportedPercent(summary.exhaustion_pct)}</span>
                        <span className="text-text-secondary">{t('oob.strategicReserve')}</span>
                        <span className="text-text-primary tabular-nums">{formatReportedWhole(summary.strategic_reserve)}</span>
                      </div>
                      {Array.isArray(summary.top_pools) && summary.top_pools.length > 0 && (
                        <div className="pt-1 border-t border-panel-border/50">
                          <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">{t('oob.topPools')}</div>
                          <div className="space-y-1">
                            {summary.top_pools.map((pool) => (
                              <div key={`${faction}-${pool.mun_id}`} className="flex items-center justify-between text-[11px]">
                                <span className="text-text-secondary">{getPlayerSafeMunicipalityName(pool.mun_id)}</span>
                                <span className="text-text-primary tabular-nums">{formatReportedWhole(pool.available)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          <AccordionHeader
            label={t('operationHistory.title')}
            count={totalOperations > 0 ? totalOperations : undefined}
            expanded={expandedSections.operations}
            onToggle={() => toggleSection('operations')}
          />
          {expandedSections.operations && (
            <div className="p-2 space-y-1.5 text-[11px]">
              {!operationsByFaction ? (
                <div className="text-text-secondary italic px-1">{t('operationHistory.noActive')}</div>
              ) : (
                FACTION_ORDER.filter((f) => f === playerFaction && operationsByFaction.has(f)).map((faction) => {
                  const ops = operationsByFaction.get(faction)!;
                  return (
                    <div key={faction} className="space-y-1">
                      <div className={`font-mono text-[10px] font-medium px-1 ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>
                        {getPlayerSafeMilitaryFactionName(faction)}
                      </div>
                      {ops.map((op) => {
                        const phaseBg = op.phase === 'execution' ? 'bg-red-800/60' : op.phase === 'planning' ? 'bg-yellow-700/60' : 'bg-neutral-600/60';
                        const objTotal = op.objectives?.length ?? 0;
                        const objDisplayCurrent = objTotal > 0 && typeof op.current_objective_index === 'number'
                          ? Math.min(objTotal, Math.max(1, op.current_objective_index + 1))
                          : null;
                        const opKey = `${op.corps_id}|${op.name}`;
                        const isSelected = selectedOperationKey === opKey;
                        return (
                          <button
                            key={opKey}
                            type="button"
                            onClick={() => setSelectedOperationKey(isSelected ? null : opKey)}
                            className={`w-full text-left rounded border px-2 py-1.5 space-y-1 transition-colors ${isSelected ? 'border-accent-gold bg-panel-active' : 'border-panel-border bg-panel-card hover:bg-panel-hover'}`}
                          >
                            <div className={`font-sans text-[11px] font-semibold ${FACTION_COLORS[op.faction] ?? 'text-text-primary'}`}>
                              {op.display_name}
                            </div>
                            <div className="text-text-secondary text-[10px]">
                              {getPlayerSafeCorpsName(op.corps_name, op.corps_id)} / {getPlayerSafeMilitaryFactionName(op.faction)}
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded text-white uppercase font-semibold ${phaseBg}`}>
                                {getPlayerSafeOperationPhaseLabel(op.phase)}
                              </span>
                              {op.momentum != null && (
                                <span className="text-text-secondary">{t('operationsSection.momShort')} {op.momentum}</span>
                              )}
                            </div>
                            <div className="text-[10px] tabular-nums flex items-center gap-1 flex-wrap">
                              {objTotal > 0 && (
                                <span className="text-text-secondary">
                                  {objDisplayCurrent == null
                                    ? t('operationsSection.objectiveProgressUnreported')
                                    : `${t('operationsPanel.objShort')} ${objDisplayCurrent}/${objTotal}`}
                                </span>
                              )}
                              <span className="text-text-secondary">{objTotal > 0 ? ' - ' : ''}{t('operationsPanel.supply')} </span>
                              {op.supply_readiness != null ? (
                                <span className={op.supply_readiness < 0.3 ? 'text-red-400 font-semibold' : op.supply_readiness < 0.7 ? 'text-amber-400' : 'text-green-400'}>
                                  {(op.supply_readiness * 100).toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-text-secondary italic" title={t('operationsPanel.supplyNotAssessed')}>{t('operationsPanel.na')}</span>
                              )}
                              <span className="text-text-secondary"> - {t('corpsDetail.brigadeCount', { count: op.participating_brigade_count })}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Sectors ── */}
          <AccordionHeader
            label={t('sectorsSection.title')}
            count={totalSectors > 0 ? totalSectors : undefined}
            expanded={expandedSections.sectors}
            onToggle={() => toggleSection('sectors')}
            testId="oob-section-sectors-toggle"
          />
          {expandedSections.sectors && (
            <div className="p-2.5 space-y-1.5 text-[11px]">
              {!sectorsByFaction ? (
                <div className="text-text-secondary italic px-1">{t('oob.noSectorData')}</div>
              ) : (
                FACTION_ORDER.filter((f) => f === playerFaction && sectorsByFaction.has(f)).map((faction) => {
                  const sectors = sectorsByFaction.get(faction)!;
                  return (
                    <div key={faction} className="space-y-1">
                      <div className={`font-mono text-[10px] font-medium px-1 ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>
                        {getPlayerSafeMilitaryFactionName(faction)}
                      </div>
                      {sectors.map((sector) => {
                        const color = corpsColorMap[sector.corps_id] ?? '#888';
                        const sectorAssignment = buildSectorFormationAssignment(
                          sector,
                          loadedGameState.formations,
                          loadedGameState.corpsFrontSectors ?? [],
                        );
                        const coverageTier = getSectorCoverageTier(sector.density, sectorAssignment);
                        const owner = loadedGameState.formations.find((f) => f.id === sector.corps_id);
                        const ownerName = owner
                          ? getLocalizedFormationName(owner, locale)
                          : getPlayerSafeDisplayLabel(sector.corps_id, t('formationDetail.corps'));
                        const sectorLabel = getPlayerFacingSectorName(sector.sector_id, [sector]);
                        const inspectSectorLabel = t('oob.inspectSectorOnField', {
                          sector: sectorLabel,
                          corps: ownerName,
                        });
                        return (
                          <button
                            key={sector.sector_id}
                            type="button"
                            data-testid="oob-sector-row"
                            data-sector-id={sector.sector_id}
                            data-coverage-tier={coverageTier}
                            data-current-brigade-count={sectorAssignment.allCurrentIds.length}
                            data-frontline-brigade-count={sectorAssignment.frontlineIds.length}
                            data-reserve-brigade-count={sectorAssignment.reserveIds.length}
                            data-rear-brigade-count={sectorAssignment.rearIds.length}
                            data-command-directed-brigade-count={sectorAssignment.overrideIds.length}
                            data-selected={selectedCorpsFrontSectorId === sector.sector_id ? 'true' : 'false'}
                            aria-label={inspectSectorLabel}
                            title={inspectSectorLabel}
                            onClick={() => inspectOnField(useGameStore.getState(), {
                              kind: 'field-sector-in-corps',
                              sectorId: sector.sector_id,
                              corpsId: sector.corps_id,
                              osid: pickOobSectorInspectAnchorOsid(sector),
                            })}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded border transition-colors text-left ${selectedCorpsFrontSectorId === sector.sector_id
                              ? 'border-accent-gold bg-panel-active'
                              : 'border-panel-border bg-panel-card hover:bg-panel-hover'
                              }`}
                            onMouseEnter={() => setHoveredSectorId(sector.sector_id)}
                            onMouseLeave={() => setHoveredSectorId(null)}
                          >
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-text-primary truncate text-[11px] flex items-center gap-1.5">
                                <span className="truncate">{sectorLabel}</span>
                                {sectorAssignment.lineHoldingIds.length > 0 && sector.combat_strength_class && (
                                  <SectorStrengthBadge strengthClass={sector.combat_strength_class} />
                                )}
                              </div>
                              <div className="text-text-secondary/80 text-[10px] truncate">
                                {t('oob.sectorOwner', { corps: ownerName })}
                              </div>
                              <div className="text-text-secondary text-[10px] tabular-nums">
                                {t('oob.sectorLineCount', { count: sectorAssignment.frontlineIds.length.toString() })}
                                {sectorAssignment.reserveIds.length > 0 && ` + ${t('oob.sectorHeldBackCount', { count: sectorAssignment.reserveIds.length.toString() })}`}
                                {sectorAssignment.rearIds.length > 0 && ` + ${t('oob.sectorRearSupportCount', { count: sectorAssignment.rearIds.length.toString() })}`}
                                {sectorAssignment.overrideIds.length > 0 && ` + ${t('oob.sectorDirectedCount', { count: sectorAssignment.overrideIds.length.toString() })}`}
                                {' \u00B7 '}{t('oob.sectorFrontSegments', { count: sector.length_edges.toString() })}
                                {' \u00B7 '}{sectorCoverageLabel(coverageTier)}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

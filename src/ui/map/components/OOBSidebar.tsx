import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CorpsCard } from './CorpsCard';
import { OwnForceReportGapNotice } from './OwnForceReportGapNotice';
import { TabBar, tabId, tabPanelId } from './TabBar';
import { SURFACE_CHIP, SURFACE_LABEL_MUTED, SURFACE_TONE, SurfaceSection } from './surface/Surface';
import { MAP_RAIL_ROW, MAP_RAIL_ROW_SELECTED, MapRailHeader, MapRailNote, MapRailStat, MapRailStats } from './surface/MapRail';
import type { CorpsFrontSectorView, FormationView, OperationView } from '../data/types';
import { SituationTab } from './SituationTab';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { toTitleCase } from '../utils/formatters';
import {
  getPlayerSafeCorpsName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeMunicipalityName,
  getPlayerSafeDisplayLabel,
  getPlayerSafeSectorStrengthLabel,
} from '../utils/playerSafeText';
import { getOperationPhaseLabel } from '../utils/operations';
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

type OobSection = 'army' | 'sectors' | 'operations' | 'situation';

/** The command sidebar column: the rail plane, flush to the left edge. */
const OOB_SIDEBAR_PLANE =
  'absolute left-0 z-10 w-[17rem] flex flex-col overflow-hidden border-r border-accent-gold/35 bg-[#11141b] text-text-primary';
const OOB_SIDEBAR_STYLE = {
  direction: 'ltr',
  top: 'var(--awwv-toolbar-clearance, 5.5rem)',
  bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
} as const;

const SECTOR_COVERAGE_KEYS: Record<SectorCoverageTier, Parameters<typeof t>[0]> = {
  uncovered: 'oob.sectorCoverage.uncovered',
  thin: 'oob.sectorCoverage.thin',
  held: 'oob.sectorCoverage.held',
  dense: 'oob.sectorCoverage.dense',
};

function sectorCoverageLabel(tier: SectorCoverageTier): string {
  return t(SECTOR_COVERAGE_KEYS[tier]);
}

function formatFactionFormationCount(fieldedCount: number, reserveCount: number): string {
  return t('oob.factionFormationSplit', { fielded: fieldedCount, reserve: reserveCount });
}

function formatReportedWhole(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value)).toLocaleString()
    : '--';
}

function formatReportedPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.max(0, value).toFixed(1)}%`
    : '--';
}

function isReportedNumber(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function pickOobSectorInspectAnchorOsid(sector: CorpsFrontSectorView): string | undefined {
  for (const segment of sector.sub_segments ?? []) {
    const osid = segment.friendly_osids?.[0];
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
    <span className={`text-[13px] uppercase tracking-tight shrink-0 ${style}`}>
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
  // Map rail system (owner review 2026-11-11): the old accordion stack is four rail tabs.
  const [activeSection, setActiveSection] = useState<OobSection>('army');
  const [mobilizationOpen, setMobilizationOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const playerFaction = loadedGameState ? getPlayerFacingFaction(loadedGameState) : null;



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
    if (activeSection !== 'army') return;
    const root = sidebarRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>('[data-highlighted="true"]');
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeSection, selectedFormationId, selectedOsid]);

  // C.2: Show the OGs tab + scroll to the selected sector
  useEffect(() => {
    if (!selectedCorpsFrontSectorId) return;
    setActiveSection('sectors');
    // Defer scroll to allow DOM to update after expansion
    requestAnimationFrame(() => {
      const root = sidebarRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-sector-id="${selectedCorpsFrontSectorId}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }, [selectedCorpsFrontSectorId]);

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
        data-awwv-counter-occluder="true"
        className={OOB_SIDEBAR_PLANE}
        style={OOB_SIDEBAR_STYLE}
      >
        <MapRailHeader eyebrow={t('mapRail.eyebrow.orderOfBattle')} title={t('oob.command')} className="px-4" />
        <div className="px-4 py-3 text-[15px] text-[#b9ad94]">{t('oob.loadSaveHelp')}</div>
      </div>
    );
  }

  const playerCrest = playerFaction ? getArmyCrest(playerFaction) : undefined;
  const playerArmyTitle = playerFaction
    ? (getArmyName(playerFaction) ?? getPlayerSafeMilitaryFactionName(playerFaction))
    : t('oob.command');
  const playerArmyCommander = playerFaction ? getFactionArmyCommander(playerFaction, loadedGameState) : null;
  const oobTabs: { id: OobSection; label: string; count?: number; countLabel?: string; testId: string }[] = [
    { id: 'army', label: t('mapRail.oobTab.army'), count: totalFormations, countLabel: t('oob.unitCount', { count: totalFormations }), testId: 'oob-section-army-toggle' },
    { id: 'sectors', label: t('mapRail.oobTab.ogs'), count: totalSectors, testId: 'oob-section-sectors-toggle' },
    { id: 'operations', label: t('mapRail.oobTab.operations'), count: totalOperations, testId: 'oob-section-operations-toggle' },
    { id: 'situation', label: t('mapRail.oobTab.situation'), testId: 'oob-section-situation-toggle' },
  ];

  return (
    <div
      data-awwv-counter-occluder="true"
      className={OOB_SIDEBAR_PLANE}
      style={OOB_SIDEBAR_STYLE}
    >
      <MapRailHeader
        className="px-4"
        mark={playerCrest ? <img src={playerCrest} alt="" className="h-4 w-4 object-contain" /> : undefined}
        eyebrow={t('mapRail.eyebrow.orderOfBattle')}
        title={(
          <button
            type="button"
            onClick={() => playerFaction && setSelectedArmyId(playerFaction)}
            disabled={!playerFaction}
            className="kbd-focus rounded text-left hover:text-accent-gold"
            title={playerFaction ? t('oob.viewArmySummary', { faction: getPlayerSafeMilitaryFactionName(playerFaction) }) : undefined}
          >
            {playerArmyTitle}
          </button>
        )}
        subtitle={playerArmyCommander ? `${t('oob.co')} ${formatRank(playerArmyCommander.rank)} ${playerArmyCommander.name}` : undefined}
      />

      <TabBar
        tabs={oobTabs}
        activeTab={activeSection}
        onTabChange={setActiveSection}
        idPrefix="oob"
        ariaLabel={t('mapRail.oobTabs')}
        dense
      />

      <div
        data-testid="oob-sidebar-scroll-region"
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0"
        ref={sidebarRef}
        role="tabpanel"
        id={tabPanelId('oob', activeSection)}
        aria-labelledby={tabId('oob', activeSection)}
      >
          {/* ── Situation ── */}
          {activeSection === 'situation' && (
            <SituationTab state={loadedGameState} />
          )}

          {/* ── Army ── */}
          {activeSection === 'army' && (
            <div className="space-y-2.5 p-3">
              {!armyByFaction || (armyByFaction.size === 0 && reserveByFaction.size === 0 && phantomCommandFormationsByFaction.size === 0) ? (
                <MapRailNote>{t('oob.noFormations')}</MapRailNote>
              ) : (
                FACTION_ORDER.filter((f) => f === playerFaction && (armyByFaction.has(f) || reserveByFaction.has(f) || phantomCommandFormationsByFaction.has(f))).map((faction) => {
                  const formations = armyByFaction.get(faction) ?? [];
                  const reserves = reserveByFaction.get(faction) ?? [];
                  const phantomCommandFormations = phantomCommandFormationsByFaction.get(faction) ?? [];
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
                  const ungroupedReserveBrigades = reserveByCorps.get('_ungrouped') ?? [];
                  if (ungroupedReserveBrigades.length > 0) {
                    corpsEntriesById.set('_ungrouped', ungroupedReserveBrigades);
                  }
                  for (const command of phantomCommandFormations) {
                    if (corpsEntriesById.has(command.id)) continue;
                    corpsEntriesById.set(command.id, []);
                  }
                  const corpsEntries = Array.from(corpsEntriesById.entries())
                    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

                  return (
                    <div key={faction} className="space-y-2">
                      {/* Army summary: one plain row (the rail header already names the army) */}
                      <button
                        type="button"
                        onClick={() => setSelectedArmyId(faction)}
                        className={`${MAP_RAIL_ROW} flex items-center justify-between gap-2`}
                        title={t('oob.viewArmySummary', { faction: getPlayerSafeMilitaryFactionName(faction) })}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[15px] font-semibold text-[#f1e6c8]">{t('mapRail.armySummary')}</span>
                          <span className="text-[13px] tabular-nums text-[#b9ad94]">{formatFactionFormationCount(formations.length, reserves.length)}</span>
                        </span>
                        <span aria-hidden="true" className="text-[18px] text-[#c9a75c]">›</span>
                      </button>
                      {(
                        <>
                          {/* HQ Reserve Units — rendered above corps with distinct styling */}
                          {hqEntries.map(([hqId, hqBrigades]) => {
                            const hqFormation = corpsFormationById.get(hqId);
                            const hqName = hqFormation ? getLocalizedFormationName(hqFormation, locale) : 'Main Staff';
                            return (
                              <div
                                key={hqId}
                                className="w-full rounded-md border border-[#c9a75c]/30 bg-[#161a22] px-3 py-2 text-left"
                              >
                                <button
                                  type="button"
                                  className="kbd-focus flex w-full items-center justify-between gap-2 rounded text-left transition-colors hover:text-[#f6ecd2]"
                                  onClick={() => setSelectedArmyHqId(hqId)}
                                >
                                  <span className="min-w-0 text-[15px] font-semibold text-[#e0c27a]">{t('oob.reserveHq', { name: hqName })}</span>
                                  <span className="shrink-0 text-[13px] tabular-nums text-[#b9ad94]">{t('oob.unitCount', { count: hqBrigades.length })}</span>
                                </button>
                                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                  {hqBrigades.map(b => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      data-testid="oob-hq-reserve-brigade"
                                      data-formation-id={b.id}
                                      data-army-hq-id={hqId}
                                      className="kbd-focus max-w-full truncate rounded text-[14px] text-[#ddd1b3] underline decoration-dotted underline-offset-2 hover:text-accent-gold"
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
                            const corpsFormation = corpsFormationById.get(corpsId);
                            const commander = loadedGameState && corpsFormation
                              ? resolveCorpsCommanderDisplay(corpsId, faction, loadedGameState)
                              : null;
                            const syntheticCommand = commander?.source === 'synthetic' && corpsFormation && loadedGameState
                              ? getSyntheticJnaCommandPresentation(corpsFormation, corpsOps, loadedGameState)
                              : null;
                            return (
                              <div key={corpsId} className="space-y-1">
                                <CorpsCard
                                  corpsId={corpsId}
                                  corpsName={corpsId === '_ungrouped'
                                    ? 'Ungrouped'
                                    : getPlayerSafeCorpsName(corpsFormationById.get(corpsId)?.name, corpsId)}
                                  brigades={brigades}
                                  faction={faction}
                                  stance={getCorpsStance(corpsId, faction)}
                                  onHeaderClick={corpsId !== '_ungrouped'
                                    ? syntheticCommand && displayedOp
                                      ? () => setSelectedOperationKey(`${displayedOp.corps_id}|${displayedOp.name}`)
                                      : () => setSelectedCorpsId(corpsId)
                                    : undefined}
                                  onHoverOsidsChange={(osids) => setHoveredOsids(osids)}
                                  onMouseEnter={() => setHoveredCorpsId(corpsId)}
                                  onMouseLeave={() => setHoveredCorpsId(null)}
                                  onOrbatClick={corpsId !== '_ungrouped'
                                    ? () => setSelectedOrbatCorpsId(corpsId)
                                    : undefined}
                                  sectorCount={corpsSectors.length}
                                  activeOperationName={displayedOp?.display_name}
                                  activeOperationPhase={displayedOp?.phase}
                                  activeOperationPhaseUnreported={displayedOp?.phase_unreported}
                                  commanderName={syntheticCommand?.commanderName ?? commander?.name}
                                  commanderSourceUnreported={commander?.source === 'unreported'}
                                  commanderActing={syntheticCommand ? false : commander?.acting}
                                  commanderLabel={syntheticCommand ? t('corpsCard.operationCommander') : undefined}
                                  commanderDetail={syntheticCommand ? t('corpsCard.syntheticJnaStaff', {
                                    operation: syntheticCommand.operationName ?? t('corpsCard.syntheticJnaOperationFallback'),
                                  }) : undefined}
                                />
                                {corpsId === '_ungrouped' && brigades.length > 0 && (
                                  <div className="ml-2 border-l border-panel-border/60 pl-2 space-y-0.5">
                                    {brigades.map((brigade) => {
                                      const brigadeName = getLocalizedFormationName(brigade, locale);
                                      const inspectLabel = t('orbat.inspectOnField', { formation: brigadeName });
                                      return (
                                        <button
                                          key={brigade.id}
                                          type="button"
                                          data-testid="oob-ungrouped-brigade"
                                          data-formation-id={brigade.id}
                                          aria-label={inspectLabel}
                                          title={inspectLabel}
                                          className="block w-full truncate rounded border border-panel-border/50 bg-panel-bg/70 px-2 py-1 text-left text-[13px] text-accent-gold/80 hover:border-accent-gold/50 hover:text-accent-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold/70"
                                          onMouseEnter={() => setHoveredOsids(brigade.location_osid ? [brigade.location_osid] : [])}
                                          onMouseLeave={() => setHoveredOsids([])}
                                          onClick={() => inspectOnField(useGameStore.getState(), brigade.location_osid
                                            ? { kind: 'field-formation-at-settlement', formationId: brigade.id, osid: brigade.location_osid }
                                            : { kind: 'field-formation', formationId: brigade.id })}
                                        >
                                          {brigadeName}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })
              )}

              {/* Manpower (was the Mobilization accordion): figures on demand */}
              <SurfaceSection
                label={t('mapRail.section.mobilization')}
                className="pt-3"
                action={(
                  <button
                    type="button"
                    data-testid="oob-section-mobilization-toggle"
                    aria-expanded={mobilizationOpen}
                    aria-label={mobilizationOpen
                      ? t('oob.collapseSection', { label: t('mapRail.section.mobilization') })
                      : t('oob.expandSection', { label: t('mapRail.section.mobilization') })}
                    onClick={() => setMobilizationOpen((open) => !open)}
                    className="kbd-focus rounded border border-[#3a4150] bg-[#1b2029] px-2.5 py-1 text-[13px] font-semibold text-[#e8dcbc] hover:border-accent-gold/60"
                  >
                    {mobilizationOpen ? t('mapRail.hide') : t('mapRail.show')}
                  </button>
                )}
              >
          {mobilizationOpen && (
            <div className="space-y-2">
              {!mobilizationSummary ? (
                <MapRailNote>{t('oob.noMobilizationData')}</MapRailNote>
              ) : (
                FACTION_ORDER.filter((faction) => faction === playerFaction && Boolean(mobilizationSummary[faction])).map((faction) => {
                  const summary = mobilizationSummary[faction]!;
                  const mobilizationReportGaps = [
                    !isReportedNumber(summary.total_available) ? t('oob.available') : null,
                    !isReportedNumber(summary.total_committed) ? t('oob.committed') : null,
                    !isReportedNumber(summary.total_exhausted) ? t('oob.exhausted') : null,
                    !isReportedNumber(summary.exhaustion_pct) ? t('corpsDetail.exhaustion') : null,
                    !isReportedNumber(summary.strategic_reserve) ? t('oob.strategicReserve') : null,
                  ].filter((field): field is string => Boolean(field));
                  return (
                    <div key={faction} className="space-y-2">
                      <MapRailStats>
                        <MapRailStat label={t('oob.available')} value={formatReportedWhole(summary.total_available)} />
                        <MapRailStat label={t('oob.committed')} value={formatReportedWhole(summary.total_committed)} />
                        <MapRailStat label={t('oob.exhausted')} value={formatReportedWhole(summary.total_exhausted)} />
                        <MapRailStat label={t('corpsDetail.exhaustion')} value={formatReportedPercent(summary.exhaustion_pct)} />
                        <MapRailStat label={t('oob.strategicReserve')} value={formatReportedWhole(summary.strategic_reserve)} />
                      </MapRailStats>
                      <OwnForceReportGapNotice fields={mobilizationReportGaps} />
                      {Array.isArray(summary.top_pools) && summary.top_pools.length > 0 && (
                        <div className="space-y-1">
                          <div className={SURFACE_LABEL_MUTED}>{t('oob.topPools')}</div>
                          <MapRailStats>
                            {summary.top_pools.map((pool) => (
                              <MapRailStat
                                key={`${faction}-${pool.mun_id}`}
                                label={getPlayerSafeMunicipalityName(pool.mun_id)}
                                value={formatReportedWhole(pool.available)}
                              />
                            ))}
                          </MapRailStats>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
              </SurfaceSection>
            </div>
          )}

          {/* ── Operations ── */}
          {activeSection === 'operations' && (
            <div className="space-y-2 p-3">
              {!operationsByFaction ? (
                <MapRailNote>{t('operationHistory.noActive')}</MapRailNote>
              ) : (
                FACTION_ORDER.filter((f) => f === playerFaction && operationsByFaction.has(f)).map((faction) => {
                  const ops = operationsByFaction.get(faction)!;
                  return (
                    <div key={faction} className="space-y-2">
                      {ops.map((op) => {
                        const phaseTone = op.phase_unreported ? SURFACE_TONE.neutral : op.phase === 'execution' ? SURFACE_TONE.danger : op.phase === 'planning' ? SURFACE_TONE.warn : SURFACE_TONE.neutral;
                        const phaseLabel = getOperationPhaseLabel(op);
                        const objTotal = op.objectives?.length ?? 0;
                        const objDisplayCurrent = objTotal > 0 && typeof op.current_objective_index === 'number'
                          ? Math.min(objTotal, Math.max(1, op.current_objective_index + 1))
                          : null;
                        const operationReportGaps = [
                          op.momentum == null ? t('operationsSection.momShort') : null,
                          objTotal > 0 && objDisplayCurrent == null ? t('operationsPanel.objShort') : null,
                          op.supply_readiness == null ? t('operationsPanel.supply') : null,
                        ].filter((field): field is string => Boolean(field));
                        const opKey = `${op.corps_id}|${op.name}`;
                        const isSelected = selectedOperationKey === opKey;
                        return (
                          <button
                            key={opKey}
                            type="button"
                            onClick={() => setSelectedOperationKey(isSelected ? null : opKey)}
                            className={`${MAP_RAIL_ROW} space-y-1.5 ${isSelected ? MAP_RAIL_ROW_SELECTED : ''}`}
                          >
                            <div className="text-[15px] font-semibold leading-snug text-[#f1e6c8]">
                              {op.display_name}
                            </div>
                            <div className="text-[13px] text-[#b9ad94]">
                              {getPlayerSafeCorpsName(op.corps_name, op.corps_id)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                              <span className={`${SURFACE_CHIP} !px-2 !py-0.5 !text-[13px] ${phaseTone}`}>
                                {phaseLabel}
                              </span>
                              {op.momentum != null && (
                                <span className="text-[#b9ad94]">{t('operationsSection.momShort')} {op.momentum}</span>
                              )}
                            </div>
                            <div className="text-[13px] tabular-nums flex items-center gap-1 flex-wrap">
                              {objTotal > 0 && (
                                <span className="text-text-secondary">
                                  {objDisplayCurrent == null
                                    ? '--'
                                    : `${t('operationsPanel.objShort')} ${objDisplayCurrent}/${objTotal}`}
                                </span>
                              )}
                              <span className="text-text-secondary">{objTotal > 0 ? ' - ' : ''}{t('operationsPanel.supply')} </span>
                              {op.supply_readiness != null ? (
                                <span className={op.supply_readiness < 0.3 ? 'text-red-400 font-semibold' : op.supply_readiness < 0.7 ? 'text-amber-400' : 'text-green-400'}>
                                  {(op.supply_readiness * 100).toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-text-secondary italic" title={t('operationsPanel.supplyNotAssessed')}>--</span>
                              )}
                              <span className="text-text-secondary"> - {t('corpsDetail.brigadeCount', { count: op.participating_brigade_count })}</span>
                            </div>
                            <OwnForceReportGapNotice fields={operationReportGaps} />
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── OGs ── */}
          {activeSection === 'sectors' && (
            <div className="space-y-2 p-3">
              {!sectorsByFaction ? (
                <MapRailNote>{t('oob.noSectorData')}</MapRailNote>
              ) : (
                FACTION_ORDER.filter((f) => f === playerFaction && sectorsByFaction.has(f)).map((faction) => {
                  const sectors = sectorsByFaction.get(faction)!;
                  return (
                    <div key={faction} className="space-y-1.5">
                      {sectors.map((sector) => {
                        const color = corpsColorMap[sector.corps_id] ?? '#888';
                        const sectorAssignment = buildSectorFormationAssignment(
                          sector,
                          loadedGameState.formations,
                          loadedGameState.corpsFrontSectors ?? [],
                        );
                        const coverageTier = getSectorCoverageTier(sector.density, sectorAssignment, sector.length_edges);
                        const owner = loadedGameState.formations.find((f) => f.id === sector.corps_id);
                        const ownerName = getPlayerSafeCorpsName(owner?.name, sector.corps_id);
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
                            className={`${MAP_RAIL_ROW} flex items-start gap-2 ${selectedCorpsFrontSectorId === sector.sector_id ? MAP_RAIL_ROW_SELECTED : ''}`}
                            onMouseEnter={() => setHoveredSectorId(sector.sector_id)}
                            onMouseLeave={() => setHoveredSectorId(null)}
                          >
                            <span
                              className="mt-1.5 inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[15px] font-semibold text-[#f1e6c8]">
                                <span className="truncate">{sectorLabel}</span>
                                {sectorAssignment.lineHoldingIds.length > 0 && sector.combat_strength_class && (
                                  <SectorStrengthBadge strengthClass={sector.combat_strength_class} />
                                )}
                              </div>
                              <div className="truncate text-[13px] text-[#b9ad94]">
                                {t('oob.sectorOwner', { corps: ownerName })}
                              </div>
                              <div className="text-[13px] tabular-nums text-[#b9ad94]">
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
  );
}

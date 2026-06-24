import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoadedGameState, NamedOfficerView, OperationView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { DETAIL_PANEL_STYLE } from './panelRail';
import {
  getOperationId,
  getOperationPhaseBadgeClass,
  getOperationPhaseTone,
  OPERATION_PHASE_TIMELINE,
} from '../utils/operations';
import { FACTION_COLORS } from '../utils/theme';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { turnToDateString, formatOperationType, toTitleCase } from '../utils/formatters';
import { OfficerProfile } from './OfficerProfile';
import { filterPlayerFacingOperations } from '../../shared/playerVisibility';
import {
  getPlayerSafeBrigadeName,
  getPlayerSafeCorpsName,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafeOperationPhaseLabel,
} from '../utils/playerSafeText';
import { inspectOnField, openArmyHQBriefingForCorps } from '../utils/shellNavigation';
import { resolveCurrentSectorForFormation } from '../utils/sectorUtils';
import { t } from '../i18n';

function compareOperations(a: OperationView, b: OperationView): number {
  return (
    a.faction.localeCompare(b.faction) ||
    a.corps_id.localeCompare(b.corps_id) ||
    a.name.localeCompare(b.name)
  );
}

function getOperationHealthSummary(operation: OperationView): { label: string; className: string } {
  const supplyReadiness = operation.supply_readiness;
  if ((supplyReadiness != null && supplyReadiness < 0.4) || (operation.consecutive_failures_on_current ?? 0) >= 2) {
    return { label: t('operationsPanel.health.fragile'), className: 'text-red-300' };
  }
  if ((supplyReadiness != null && supplyReadiness < 0.6) || (operation.failure_count ?? 0) > 0) {
    return { label: t('operationsPanel.health.strained'), className: 'text-amber-300' };
  }
  if (supplyReadiness == null) {
    return { label: t('operationsPanel.health.unassessed'), className: 'text-text-secondary' };
  }
  return { label: t('operationsPanel.health.stable'), className: 'text-green-300' };
}

function getOperationOutcomeThresholdLabel(outcome: string): string {
  switch (outcome) {
    case 'decisive_victory':
      return t('aar.outcome.decisive');
    case 'victory':
      return t('aar.outcome.victory');
    case 'costly_victory':
      return t('aar.outcome.costly');
    case 'stalemate':
      return t('aar.outcome.stalemate');
    case 'repulsed':
      return t('aar.outcome.repulsed');
    case 'catastrophic':
      return t('aar.outcome.collapse');
    default:
      return t('operationsPanel.minimumOutcomeFallback');
  }
}

function getOperationTempoLabel(tempo: string): string {
  switch (tempo) {
    case 'all_out':
      return t('operationsPanel.allOut');
    case 'methodical':
      return t('operationsPanel.tempo.methodical');
    case 'normal':
      return t('operationsPanel.tempo.normal');
    default:
      return t('operationsPanel.tempo.unreported');
  }
}

function getOperationCommander(operation: OperationView, state: LoadedGameState): NamedOfficerView | null {
  const commanderId = operation.commander_officer_id;
  if (!commanderId) return null;
  return state.namedOfficerData?.find((officer) => officer.id === commanderId) ?? null;
}

export function OperationsPanel() {
  const isOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const setIsOpen = useGameStore((s) => s.setIsOperationsPanelOpen);
  const selectedOperationKey = useGameStore((s) => s.selectedOperationKey);
  const setSelectedOperationKey = useGameStore((s) => s.setSelectedOperationKey);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setOperationTargetOsids = useGameStore((s) => s.setOperationTargetOsids);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const panToOsid = useGameStore((s) => s.panToOsid);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
  const setArmyHQOpen = useGameStore((s) => s.setArmyHQOpen);
  const setArmyHQTab = useGameStore((s) => s.setArmyHQTab);
  const setArmyHQRecordsSubTab = useGameStore((s) => s.setArmyHQRecordsSubTab);
  const setArmyHQExpandedCorpsId = useGameStore((s) => s.setArmyHQExpandedCorpsId);
  const setCodexOpen = useGameStore((s) => s.setCodexOpen);
  const setChronicleOpen = useGameStore((s) => s.setChronicleOpen);
  const lastAutoFocusOperationKeyRef = useRef<string | null>(null);
  const operationCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const objectiveButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [objectiveHoverOsid, setObjectiveHoverOsid] = useState<string | null>(null);

  const operations = useMemo(
    () => loadedGameState
      ? filterPlayerFacingOperations(loadedGameState).sort(compareOperations)
      : [],
    [loadedGameState]
  );

  const selectedOperation = useMemo(() => {
    if (selectedOperationKey == null) return null;
    return operations.find((op) => getOperationId(op) === selectedOperationKey) ?? null;
  }, [operations, selectedOperationKey]);
  const selectedOperationCorpsLabel = selectedOperation
    ? getPlayerSafeCorpsName(selectedOperation.corps_name ?? null, selectedOperation.corps_id, 'This corps')
    : null;

  // Auto-select first operation ONLY when the panel first opens with no selection
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    if (!justOpened || operations.length === 0) return;
    if (selectedOperationKey != null && operations.some((op) => getOperationId(op) === selectedOperationKey)) return;
    const first = operations[0];
    if (first) setSelectedOperationKey(getOperationId(first));
  }, [isOpen, operations, selectedOperationKey, setSelectedOperationKey]);

  // Sync hoveredOsids + operationTargetOsids with current selection / objective hover.
  // Show operation targets (military crosshairs) whenever an operation is selected, even when the panel is closed.
  useEffect(() => {
    if (!selectedOperation) {
      setHoveredOsids([]);
      setOperationTargetOsids([]);
      return;
    }
    if (isOpen && objectiveHoverOsid) {
      setHoveredOsids([objectiveHoverOsid]);
      setOperationTargetOsids([objectiveHoverOsid]);
      return;
    }
    const objectives = selectedOperation.objectives ?? [];
    setHoveredOsids(objectives);
    setOperationTargetOsids(objectives);
  }, [isOpen, selectedOperation, objectiveHoverOsid, setHoveredOsids, setOperationTargetOsids]);

  // Clear objective hover when selection changes
  useEffect(() => {
    setObjectiveHoverOsid(null);
  }, [selectedOperationKey]);

  // Pan map to operation area whenever an operation is selected (from sidebar, command briefing, or operations list)
  useEffect(() => {
    if (!selectedOperation || !panToOsid) return;
    const operationKey = getOperationId(selectedOperation);
    if (lastAutoFocusOperationKeyRef.current === operationKey) return;
    const primaryFocus =
      selectedOperation.objectives?.[selectedOperation.current_objective_index ?? 0] ??
      selectedOperation.objectives?.[0] ??
      selectedOperation.staging_osid;
    if (!primaryFocus) return;
    panToOsid(primaryFocus);
    lastAutoFocusOperationKeyRef.current = operationKey;
  }, [selectedOperation, panToOsid]);

  if (!isOpen) return null;

  if (!loadedGameState) {
    return (
      <div
        className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl overflow-hidden paper-grain"
        style={{ ...DETAIL_PANEL_STYLE, width: '24rem' }}
      >
        <div className="h-10 bg-panel-card border-b border-panel-border panel-shimmer" />
        <div className="flex-1 grid grid-cols-12">
          <div className="col-span-5 border-r border-panel-border p-2 space-y-2">
            <div className="h-12 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-12 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-12 w-full bg-panel-card rounded panel-shimmer" />
          </div>
          <div className="col-span-7 p-2.5 space-y-3">
            <div className="h-6 w-3/4 bg-panel-card rounded panel-shimmer" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
              <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
            </div>
            <div className="h-32 w-full bg-panel-card rounded panel-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const selectedObjectiveCount = selectedOperation?.objectives?.length ?? 0;
  const selectedObjectiveIndex = selectedOperation?.current_objective_index ?? 0;
  const objectiveProgress =
    selectedObjectiveCount > 0
      ? Math.max(0, Math.min(1, (selectedObjectiveIndex + 1) / selectedObjectiveCount))
      : 0;

  const momentumTone =
    selectedOperation?.momentum == null
      ? 'text-text-secondary'
      : selectedOperation.momentum >= 0
        ? 'text-green-300'
        : 'text-red-300';
  const supplyPct = selectedOperation?.supply_readiness != null
    ? Math.round(selectedOperation.supply_readiness * 100)
    : null;
  const phaseTurnCount = selectedOperation
    ? Math.max(1, loadedGameState.turn - (selectedOperation.phase_started_turn ?? selectedOperation.started_turn) + 1)
    : null;
  const readiness = selectedOperation?.readiness;
  const cohesionPct = selectedOperation?.avg_cohesion != null ? Math.round(selectedOperation.avg_cohesion) : null;
  const avgPersonnelPct = selectedOperation?.avg_personnel_pct != null ? Math.round(selectedOperation.avg_personnel_pct * 100) : null;

  const readinessTone = (value: number) =>
    value >= 0.7 ? 'bg-green-500/80' : value >= 0.4 ? 'bg-amber-400/80' : 'bg-red-500/80';

  const handleOperationCardKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    if (operations.length === 0) return;
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = Math.min(operations.length - 1, index + 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = operations.length - 1;
    operationCardRefs.current[nextIndex]?.focus();
    const nextOperation = operations[nextIndex];
    if (nextOperation) setSelectedOperationKey(getOperationId(nextOperation));
  };

  const handleObjectiveKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number, objectiveOsid: string) => {
    const objectiveCount = selectedOperation?.objectives?.length ?? 0;
    if (objectiveCount === 0) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = Math.min(objectiveCount - 1, index + 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = objectiveCount - 1;
    objectiveButtonRefs.current[nextIndex]?.focus();
    const nextObjective = selectedOperation?.objectives?.[nextIndex] ?? objectiveOsid;
    setObjectiveHoverOsid(nextObjective);
  };

  const close = () => {
    setIsOpen(false);
    setSelectedOperationKey(null);
    setHoveredOsids([]);
    setOperationTargetOsids([]);
  };

  const openHQReview = () => {
    openArmyHQBriefingForCorps({
      loadedGameState,
      setSelectedArmyId,
      setArmyHQOpen,
      setArmyHQTab,
      setArmyHQRecordsSubTab,
      setArmyHQExpandedCorpsId,
      setCodexOpen,
      setChronicleOpen,
    }, selectedOperation?.corps_id ?? null);
  };

  return (
    <div
      className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl overflow-hidden paper-grain relative"
      style={{ ...DETAIL_PANEL_STYLE, width: '24rem' }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0 relative z-10 glow-text text-accent-gold uppercase text-xs font-semibold">
        <div className="flex flex-col">
          <span>{t('operationsPanel.title')}</span>
          <span className="text-[9px] font-mono text-text-secondary normal-case tracking-[0.12em]">
            {t('operationsPanel.subtitle')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openHQReview}
            disabled={!selectedOperation}
            className="kbd-focus rounded border border-accent-gold/30 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-accent-gold hover:bg-accent-gold/10 disabled:opacity-30"
          >
            {t('operationsPanel.hqReview')}
          </button>
          <button
          onClick={close}
          aria-label={t('operationsPanel.closePanel')}
          className="kbd-focus text-text-secondary hover:text-interactive text-sm leading-none rounded"
        >
          ✕
          </button>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="p-4 text-xs text-text-secondary italic">
          {t('operationHistory.noActive')}
        </div>
      ) : (
        <div className="grid grid-cols-12 min-h-0 flex-1">
          {/* Left: operation list */}
          <div className="col-span-5 border-r border-panel-border overflow-auto">
            <div
              className="p-1.5 space-y-1"
              role="listbox"
              aria-label={t('operationsPanel.operationsListAria')}
            >
              {operations.map((op, index) => {
                const id = getOperationId(op);
                const selected =
                  selectedOperation != null &&
                  id === getOperationId(selectedOperation);
                const phaseBadgeClass = getOperationPhaseBadgeClass(op.phase);
                const health = getOperationHealthSummary(op);
                const opSupplyPct = op.supply_readiness != null ? Math.round(op.supply_readiness * 100) : null;
                const opPhaseTurn = Math.max(1, loadedGameState.turn - (op.phase_started_turn ?? op.started_turn) + 1);
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={t('operationsPanel.operationCardAria', {
                      name: op.display_name,
                      phase: getPlayerSafeOperationPhaseLabel(op.phase),
                      brigades: op.participating_brigade_count,
                    })}
                    ref={(el) => {
                      operationCardRefs.current[index] = el;
                    }}
                    onClick={() => setSelectedOperationKey(id)}
                    onKeyDown={(event) => handleOperationCardKeyDown(event, index)}
                    className={`kbd-focus w-full text-left rounded border px-2 py-1 transition-all duration-200 ease-out hover:-translate-y-[1px] ${selected
                      ? 'border-accent-gold bg-panel-active shadow-[0_0_0_1px_rgba(212,175,55,0.22)]'
                      : 'border-panel-border bg-panel-card hover:bg-panel-hover'
                      }`}
                  >
                    <div className={`text-[11px] font-semibold truncate ${FACTION_COLORS[op.faction] ?? 'text-text-primary'} transition-colors`}>
                      {op.display_name}
                    </div>
                    <div className="text-[10px] text-text-secondary truncate">
                      {getPlayerSafeCorpsName(op.corps_name ?? null, op.corps_id, 'This corps')}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`px-1 py-0.5 rounded text-white text-[10px] uppercase font-semibold ${phaseBadgeClass}`}>
                        {getPlayerSafeOperationPhaseLabel(op.phase)}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wide ${health.className}`}>
                        {health.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px]">
                      <span className="px-1 py-0.5 rounded border border-panel-border bg-panel-bg/70 text-text-secondary tabular-nums">
                        {t('operationsPanel.phaseAge', { count: opPhaseTurn })}
                      </span>
                      <span className="px-1 py-0.5 rounded border border-panel-border bg-panel-bg/70 text-text-secondary tabular-nums">
                        {t('operationsPanel.bdeCount', { count: op.participating_brigade_count })}
                      </span>
                      <span className={`px-1 py-0.5 rounded border border-panel-border bg-panel-bg/70 tabular-nums ${
                        opSupplyPct == null ? 'text-text-secondary' : opSupplyPct < 30 ? 'text-red-300' : opSupplyPct < 70 ? 'text-amber-300' : 'text-green-300'
                      }`}>
                        {opSupplyPct == null ? t('operationsPanel.supplyNA') : t('operationsPanel.supplyPct', { pct: opSupplyPct })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: detail */}
          <div className="col-span-7 overflow-auto p-2.5 space-y-1.5">
            {selectedOperation ? (
              <>
                <div className={`text-sm font-semibold ${FACTION_COLORS[selectedOperation.faction] ?? 'text-text-primary'}`}>
                  {selectedOperation.display_name}
                </div>
                <div className="text-xs text-text-secondary">
                  {selectedOperationCorpsLabel} / {getPlayerSafeMilitaryFactionName(selectedOperation.faction)}
                </div>


                {/* Phase timeline */}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-panel-border">
                  {OPERATION_PHASE_TIMELINE.map((phase) => {
                    const active = selectedOperation.phase === phase;
                    const tone = getOperationPhaseTone(phase);
                    return (
                      <span
                        key={phase}
                        className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide font-semibold ${tone} ${active ? 'ring-1 ring-accent-gold/60' : 'opacity-80'}`}
                      >
                        {getPlayerSafeOperationPhaseLabel(phase)}
                      </span>
                    );
                  })}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-panel-border">
                  <div>
                    <span className="text-text-secondary">{t('operationsPanel.type')} </span>
                    <span className="text-text-primary">{formatOperationType(selectedOperation.type)}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">{t('operationsPanel.phase')} </span>
                    <span className="text-text-primary">
                      {getPlayerSafeOperationPhaseLabel(selectedOperation.phase)}{phaseTurnCount != null ? ` - ${t('operationsPanel.phaseAge', { count: phaseTurnCount })}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">{t('operationsPanel.brigades')} </span>
                    <span className="text-text-primary tabular-nums">{selectedOperation.participating_brigade_count}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">{t('operationsPanel.started')} </span>
                    <span className="text-text-primary text-[11px] whitespace-nowrap">{turnToDateString(selectedOperation.started_turn)}</span>
                  </div>
                  {selectedOperation.momentum != null && (
                    <div>
                      <span className="text-text-secondary">{t('operationsPanel.momentum')} </span>
                      <span className={`tabular-nums ${momentumTone}`}>{selectedOperation.momentum}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-secondary">{t('operationsPanel.supply')} </span>
                    {supplyPct != null ? (
                      <span className={`tabular-nums ${supplyPct < 30 ? 'text-red-400 font-semibold' : supplyPct < 70 ? 'text-amber-300' : 'text-green-400'}`}>{supplyPct}%</span>
                    ) : (
                      <span className="text-text-secondary italic" title={t('operationsPanel.supplyNotAssessed')}>{t('operationsPanel.na')}</span>
                    )}
                  </div>
                  {selectedOperation.consecutive_failures_on_current != null && (
                    <div>
                      <span className="text-text-secondary">{t('operationsPanel.failures')} </span>
                      <span className={selectedOperation.consecutive_failures_on_current >= 2 ? 'text-red-300 tabular-nums' : 'text-text-primary tabular-nums'}>
                        {selectedOperation.consecutive_failures_on_current}
                      </span>
                    </div>
                  )}
                  {cohesionPct != null && (
                    <div>
                      <span className="text-text-secondary">{t('operationsPanel.avgCohesion')} </span>
                      <span className="text-text-primary tabular-nums">{cohesionPct}%</span>
                    </div>
                  )}
                  {avgPersonnelPct != null && (
                    <div>
                      <span className="text-text-secondary">{t('operationsPanel.avgHealth')} </span>
                      <span className="text-text-primary tabular-nums">{avgPersonnelPct}%</span>
                    </div>
                  )}
                  {selectedOperation.tempo && (
                    <div>
                      <span className="text-text-secondary">{t('operationsPanel.tempo')} </span>
                      <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        selectedOperation.tempo === 'all_out' ? 'bg-red-700/60 text-red-200' :
                        selectedOperation.tempo === 'methodical' ? 'bg-blue-700/60 text-blue-200' :
                        'bg-neutral-600/60 text-neutral-300'
                      }`}>
                        {getOperationTempoLabel(selectedOperation.tempo)}
                      </span>
                    </div>
                  )}
                  {selectedOperation.min_attack_outcome && (
                    <div>
                      <span className="text-text-secondary">{t('operationsPanel.minimum')} </span>
                      <span className="text-text-primary">{getOperationOutcomeThresholdLabel(selectedOperation.min_attack_outcome)}</span>
                    </div>
                  )}
                  {(selectedOperation.postponement_count ?? 0) > 0 && (
                    <div>
                      <span className="text-text-secondary">{t('operationsPanel.postponed')} </span>
                      <span className="text-amber-300 tabular-nums">&times;{selectedOperation.postponement_count}</span>
                    </div>
                  )}
                </div>

                {/* Commander */}
                {(() => {
                  const commander = getOperationCommander(selectedOperation, loadedGameState);
                  if (!commander) return null;
                  return (
                    <div className="pt-2 border-t border-panel-border">
                      <OfficerProfile officer={commander} label={t('operationsPanel.operationCommander')} />
                    </div>
                  );
                })()}

                {/* Participating Brigades */}
                {selectedOperation.participating_brigade_ids && selectedOperation.participating_brigade_ids.length > 0 && (
                  <div className="pt-2 border-t border-panel-border">
                    <div className="text-[11px] text-text-secondary mb-1 uppercase tracking-wide">{t('operationsPanel.allocatedAssets')}</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedOperation.participating_brigade_ids.map(bId => {
                        const formation = loadedGameState.formations.find(f => f.id === bId) ?? null;
                        const sector = resolveCurrentSectorForFormation(formation, loadedGameState.corpsFrontSectors);
                        const bName = getPlayerSafeBrigadeName(formation?.name ?? null);
                        return (
                          <button
                            key={bId}
                            onClick={() => {
                                  inspectOnField(useGameStore.getState(), sector
                                ? {
                                    kind: 'field-formation-in-sector',
                                    corpsId: selectedOperation.corps_id,
                                    sectorId: sector.sector_id,
                                    formationId: bId,
                                    osid: formation?.location_osid ?? undefined,
                                  }
                                : {
                                    kind: 'field-formation-in-corps',
                                    corpsId: selectedOperation.corps_id,
                                    formationId: bId,
                                    osid: formation?.location_osid ?? undefined,
                                  });
                            }}
                            className="px-1.5 py-0.5 bg-panel-card hover:bg-panel-hover border border-panel-border rounded text-[10px] text-text-primary transition-colors"
                          >
                            {bName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AAR Strip */}
                <div className="pt-1 border-t border-panel-border">
                  <div className="text-[11px] text-accent-gold mb-1 uppercase tracking-wide font-semibold">{t('operationsPanel.aarStrip')}</div>
                  <div className="rounded border border-panel-border bg-panel-card/70 p-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-secondary">{t('operationsPanel.objectiveProgress')}</span>
                      <span className="text-text-primary tabular-nums">
                        {selectedObjectiveCount > 0 ? `${Math.min(selectedObjectiveIndex + 1, selectedObjectiveCount)}/${selectedObjectiveCount}` : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded bg-panel-bg overflow-hidden">
                      <div
                        className="h-full bg-accent-gold/80 transition-all duration-300 ease-out"
                        style={{ width: `${Math.round(objectiveProgress * 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded border border-panel-border bg-panel-bg/70 px-1.5 py-1">
                        <span className="text-text-secondary">{t('operationsPanel.momentum')} </span>
                        <span className={`tabular-nums ${momentumTone}`}>
                          {selectedOperation.momentum != null ? selectedOperation.momentum : '—'}
                        </span>
                      </div>
                      <div className="rounded border border-panel-border bg-panel-bg/70 px-1.5 py-1">
                        <span className="text-text-secondary">{t('operationsPanel.supply')} </span>
                        {supplyPct != null ? (
                          <span className={`tabular-nums ${supplyPct < 30 ? 'text-red-400 font-semibold' : supplyPct < 70 ? 'text-amber-300' : 'text-green-400'}`}>{supplyPct}%</span>
                        ) : (
                          <span className="text-text-secondary italic" title={t('operationsPanel.supplyNotAssessed')}>{t('operationsPanel.na')}</span>
                        )}
                      </div>
                    </div>
                    {readiness && (
                      <div className="space-y-1">
                        {([
                          [t('operationsPanel.supply'), readiness.supply],
                          [t('operationsPanel.cohesion'), readiness.cohesion],
                          [t('operationsPanel.intel'), readiness.intel],
                        ] as Array<[string, number]>).map(([label, value]) => (
                          <div key={label} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-text-secondary">{label}</span>
                              <span className="text-text-primary tabular-nums">{Math.round(value * 100)}%</span>
                            </div>
                            <div className="h-1.5 rounded bg-panel-bg overflow-hidden">
                              <div className={`h-full ${readinessTone(value)}`} style={{ width: `${Math.round(value * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Objectives */}
                <div className="pt-1 border-t border-panel-border">
                  <div className="text-[11px] text-text-secondary mb-1 uppercase tracking-wide">{t('operationsPanel.objectives')}</div>
                  {selectedOperation.objectives && selectedOperation.objectives.length > 0 ? (
                    <div
                      className="space-y-1"
                      role="listbox"
                      aria-label={t('operationsPanel.objectivesAria')}
                    >
                      {selectedOperation.objectives.map((obj, index) => {
                        const isDone = index < selectedObjectiveIndex;
                        const isCurrent = index === selectedObjectiveIndex;
                        const objectiveName = getOsidDisplayName(obj, osidDisplayNames);
                        return (
                          <button
                            key={`${obj}-${index}`}
                            type="button"
                            role="option"
                            aria-selected={isCurrent}
                            aria-label={`${isCurrent ? t('operationsPanel.currentObjective') : isDone ? t('operationsPanel.completedObjective') : t('operationsPanel.objective')}: ${objectiveName}`}
                            ref={(el) => {
                              objectiveButtonRefs.current[index] = el;
                            }}
                            onClick={() => panToOsid?.(obj)}
                            onMouseEnter={() => setObjectiveHoverOsid(obj)}
                            onMouseLeave={() => setObjectiveHoverOsid(null)}
                            onFocus={() => setObjectiveHoverOsid(obj)}
                            onBlur={() => setObjectiveHoverOsid(null)}
                            onKeyDown={(event) => handleObjectiveKeyDown(event, index, obj)}
                            className={`kbd-focus w-full text-left rounded border px-2 py-1 transition-colors ${isCurrent
                              ? 'border-accent-gold/70 bg-panel-active/60'
                              : isDone
                                ? 'border-panel-border bg-panel-bg/40 opacity-60'
                                : 'border-panel-border bg-panel-card hover:bg-panel-hover'
                              }`}
                          >
                            <div className="flex items-start gap-1.5">
                              <span className="shrink-0 text-[10px] mt-0.5 w-3 text-center text-text-secondary">
                                {isDone ? '✓' : isCurrent ? '▶' : '○'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="text-[11px] text-text-primary truncate">{objectiveName}</div>
                                  {isCurrent && (
                                    <span className="text-[9px] text-accent-gold font-bold uppercase tracking-tighter animate-pulse shadow-sm px-1 bg-accent-gold/10 rounded border border-accent-gold/30">
                                      {t('operationsPanel.schwerpunkt')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-text-secondary truncate">
                                  {t('operationsPanel.objectiveIndex', { index: index + 1, total: selectedOperation.objectives?.length ?? 0 })}{selectedOperation.schwerpunkt_osid === obj ? ` - ${t('operationsPanel.mainAxis')}` : ''}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-text-secondary italic">{t('operationsPanel.noObjectiveChain')}</div>
                  )}
                </div>

                {/* Open Corps Orders */}
                <div className="pt-1 border-t border-panel-border">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedCorpsId(selectedOperation.corps_id);
                    }}
                    aria-label={t('operationsPanel.openCorpsOrdersAria', { corps: selectedOperationCorpsLabel ?? t('operationsPanel.thisCorps') })}
                    className="kbd-focus w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-interactive hover:bg-panel-hover"
                  >
                    {t('operationsPanel.openCorpsOrders')}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-text-secondary italic">{t('operationsPanel.selectOperation')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

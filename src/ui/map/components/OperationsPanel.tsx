import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { DETAIL_PANEL_STYLE } from './panelRail';
import { useIPC } from '../desktop/useIPC';
import {
  getOperationId,
  getOperationPhaseBadgeClass,
  getOperationPhaseTone,
  OPERATION_PHASE_TIMELINE,
} from '../utils/operations';
import { FACTION_COLORS } from '../utils/theme';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { turnToDateString, formatOperationType, toTitleCase } from '../utils/formatters';
import { getFormationCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { filterPlayerFacingOperations } from '../../shared/playerVisibility';
import { getPlayerSafeBrigadeName } from '../utils/playerSafeText';

function compareOperations(a: OperationView, b: OperationView): number {
  return (
    a.faction.localeCompare(b.faction) ||
    a.corps_id.localeCompare(b.corps_id) ||
    a.name.localeCompare(b.name)
  );
}

function getOperationHealthSummary(operation: OperationView): { label: string; className: string } {
  if ((operation.supply_readiness ?? 1) < 0.4 || (operation.consecutive_failures_on_current ?? 0) >= 2) {
    return { label: 'Fragile', className: 'text-red-300' };
  }
  if ((operation.supply_readiness ?? 1) < 0.6 || (operation.failure_count ?? 0) > 0) {
    return { label: 'Strained', className: 'text-amber-300' };
  }
  return { label: 'Stable', className: 'text-green-300' };
}

export function OperationsPanel() {
  const ipc = useIPC();
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
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const lastAutoFocusOperationKeyRef = useRef<string | null>(null);
  const operationCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const objectiveButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [objectiveHoverOsid, setObjectiveHoverOsid] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
    setActionMessage(null);
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
        <div className="absolute top-0 left-0 w-full h-full crt-overlay pointer-events-none z-50 opacity-40"></div>
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

  const setActionMessageFromResult = (
    result: { ok: boolean; error?: string },
    successMessage: string,
    failureMessage: string
  ) => {
    setActionMessage(result.ok ? successMessage : (result.error ?? failureMessage));
  };

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
    setHoveredOsids([]);
    setOperationTargetOsids([]);
  };

  const haltOperation = async (digInOnHalt: boolean) => {
    if (!selectedOperation) return;
    const result = await ipc.stageOperationHalt({
      corpsId: selectedOperation.corps_id,
      operationName: selectedOperation.name,
      digInOnHalt,
    });
    setActionMessageFromResult(result, 'Halt order staged.', 'Failed to stage halt order.');
  };

  const forceLaunch = async () => {
    if (!selectedOperation) return;
    const result = await ipc.stageOperationForceLaunch({
      corpsId: selectedOperation.corps_id,
      operationName: selectedOperation.name,
    });
    setActionMessageFromResult(result, 'Early launch staged.', 'Failed to stage early launch.');
  };

  return (
    <div
      className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl overflow-hidden paper-grain relative"
      style={{ ...DETAIL_PANEL_STYLE, width: '24rem' }}
    >
      <div className="absolute top-0 left-0 w-full h-full crt-overlay pointer-events-none z-50 opacity-40"></div>

      <div className="flex items-center justify-between px-3 py-2 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0 relative z-10 glow-text text-accent-gold uppercase text-xs font-semibold">
        Operations Center
        <button
          onClick={close}
          aria-label="Close operations panel"
          className="kbd-focus text-text-secondary hover:text-interactive text-sm leading-none rounded"
        >
          ✕
        </button>
      </div>

      {operations.length === 0 ? (
        <div className="p-4 text-xs text-text-secondary italic">
          No active operations.
        </div>
      ) : (
        <div className="grid grid-cols-12 min-h-0 flex-1">
          {/* Left: operation list */}
          <div className="col-span-5 border-r border-panel-border overflow-auto">
            <div
              className="p-1.5 space-y-1"
              role="listbox"
              aria-label="Operations list"
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
                    aria-label={`${op.name}, ${op.phase}, ${op.participating_brigade_count} brigades`}
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
                      {op.name}
                    </div>
                    <div className="text-[10px] text-text-secondary truncate">{op.corps_name}</div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`px-1 py-0.5 rounded text-white text-[10px] uppercase font-semibold ${phaseBadgeClass}`}>
                        {toTitleCase(op.phase)}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wide ${health.className}`}>
                        {health.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px]">
                      <span className="px-1 py-0.5 rounded border border-panel-border bg-panel-bg/70 text-text-secondary tabular-nums">
                        Turn {opPhaseTurn}
                      </span>
                      <span className="px-1 py-0.5 rounded border border-panel-border bg-panel-bg/70 text-text-secondary tabular-nums">
                        {op.participating_brigade_count} bde
                      </span>
                      <span className={`px-1 py-0.5 rounded border border-panel-border bg-panel-bg/70 tabular-nums ${
                        opSupplyPct == null ? 'text-text-secondary' : opSupplyPct < 30 ? 'text-red-300' : opSupplyPct < 70 ? 'text-amber-300' : 'text-green-300'
                      }`}>
                        {opSupplyPct == null ? 'Supply N/A' : `Supply ${opSupplyPct}%`}
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
                  {selectedOperation.name}
                </div>
                <div className="text-xs text-text-secondary">
                  {selectedOperation.corps_name} · {selectedOperation.faction}
                </div>

                {actionMessage && (
                  <div className="text-[10px] text-accent-gold border border-panel-border rounded px-2 py-1 bg-panel-card/70">
                    {actionMessage}
                  </div>
                )}

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
                        {toTitleCase(phase)}
                      </span>
                    );
                  })}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-panel-border">
                  <div>
                    <span className="text-text-secondary">Type: </span>
                    <span className="text-text-primary">{formatOperationType(selectedOperation.type)}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Phase: </span>
                    <span className="text-text-primary">
                      {toTitleCase(selectedOperation.phase)}{phaseTurnCount != null ? ` - Turn ${phaseTurnCount}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Brigades: </span>
                    <span className="text-text-primary tabular-nums">{selectedOperation.participating_brigade_count}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Started: </span>
                    <span className="text-text-primary text-[11px] whitespace-nowrap">{turnToDateString(selectedOperation.started_turn)}</span>
                  </div>
                  {selectedOperation.momentum != null && (
                    <div>
                      <span className="text-text-secondary">Momentum: </span>
                      <span className={`tabular-nums ${momentumTone}`}>{selectedOperation.momentum}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-secondary">Supply: </span>
                    {supplyPct != null ? (
                      <span className={`tabular-nums ${supplyPct < 30 ? 'text-red-400 font-semibold' : supplyPct < 70 ? 'text-amber-300' : 'text-green-400'}`}>{supplyPct}%</span>
                    ) : (
                      <span className="text-text-secondary italic" title="Supply readiness not yet assessed">N/A</span>
                    )}
                  </div>
                  {selectedOperation.consecutive_failures_on_current != null && (
                    <div>
                      <span className="text-text-secondary">Failures: </span>
                      <span className={selectedOperation.consecutive_failures_on_current >= 2 ? 'text-red-300 tabular-nums' : 'text-text-primary tabular-nums'}>
                        {selectedOperation.consecutive_failures_on_current}
                      </span>
                    </div>
                  )}
                  {cohesionPct != null && (
                    <div>
                      <span className="text-text-secondary">Avg cohesion: </span>
                      <span className="text-text-primary tabular-nums">{cohesionPct}%</span>
                    </div>
                  )}
                  {avgPersonnelPct != null && (
                    <div>
                      <span className="text-text-secondary">Avg health: </span>
                      <span className="text-text-primary tabular-nums">{avgPersonnelPct}%</span>
                    </div>
                  )}
                  {selectedOperation.tempo && (
                    <div>
                      <span className="text-text-secondary">Tempo: </span>
                      <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        selectedOperation.tempo === 'all_out' ? 'bg-red-700/60 text-red-200' :
                        selectedOperation.tempo === 'methodical' ? 'bg-blue-700/60 text-blue-200' :
                        'bg-neutral-600/60 text-neutral-300'
                      }`}>
                        {selectedOperation.tempo === 'all_out' ? 'All Out' : toTitleCase(selectedOperation.tempo)}
                      </span>
                    </div>
                  )}
                  {selectedOperation.min_attack_outcome && (
                    <div>
                      <span className="text-text-secondary">Minimum: </span>
                      <span className="text-text-primary">{selectedOperation.min_attack_outcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    </div>
                  )}
                  {(selectedOperation.postponement_count ?? 0) > 0 && (
                    <div>
                      <span className="text-text-secondary">Postponed </span>
                      <span className="text-amber-300 tabular-nums">&times;{selectedOperation.postponement_count}</span>
                    </div>
                  )}
                </div>

                {/* Commander */}
                {(() => {
                  const corpsFormation = loadedGameState.formations.find(f => f.id === selectedOperation.corps_id);
                  const commander = corpsFormation ? getFormationCommander(corpsFormation, loadedGameState) : null;
                  if (!commander) return null;
                  return (
                    <div className="pt-2 border-t border-panel-border">
                      <OfficerProfile officer={commander} label="Operation Commander" />
                    </div>
                  );
                })()}

                {/* Participating Brigades */}
                {selectedOperation.participating_brigade_ids && selectedOperation.participating_brigade_ids.length > 0 && (
                  <div className="pt-2 border-t border-panel-border">
                    <div className="text-[11px] text-text-secondary mb-1 uppercase tracking-wide">Allocated Assets</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedOperation.participating_brigade_ids.map(bId => {
                        const bName = getPlayerSafeBrigadeName(
                          loadedGameState.formations.find(f => f.id === bId)?.name ?? null,
                        );
                        return (
                          <button
                            key={bId}
                            onClick={() => {
                              setSelectedOperationKey(null);
                              setSelectedFormationId(bId);
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
                  <div className="text-[11px] text-accent-gold mb-1 uppercase tracking-wide font-semibold">AAR Strip</div>
                  <div className="rounded border border-panel-border bg-panel-card/70 p-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-secondary">Objective Progress</span>
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
                        <span className="text-text-secondary">Momentum: </span>
                        <span className={`tabular-nums ${momentumTone}`}>
                          {selectedOperation.momentum != null ? selectedOperation.momentum : '—'}
                        </span>
                      </div>
                      <div className="rounded border border-panel-border bg-panel-bg/70 px-1.5 py-1">
                        <span className="text-text-secondary">Supply: </span>
                        {supplyPct != null ? (
                          <span className={`tabular-nums ${supplyPct < 30 ? 'text-red-400 font-semibold' : supplyPct < 70 ? 'text-amber-300' : 'text-green-400'}`}>{supplyPct}%</span>
                        ) : (
                          <span className="text-text-secondary italic" title="Supply readiness not yet assessed">N/A</span>
                        )}
                      </div>
                    </div>
                    {readiness && (
                      <div className="space-y-1">
                        {([
                          ['Supply', readiness.supply],
                          ['Cohesion', readiness.cohesion],
                          ['Intel', readiness.intel],
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
                  <div className="text-[11px] text-text-secondary mb-1 uppercase tracking-wide">Objectives</div>
                  {selectedOperation.objectives && selectedOperation.objectives.length > 0 ? (
                    <div
                      className="space-y-1"
                      role="listbox"
                      aria-label="Operation objectives"
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
                            aria-label={`${isCurrent ? 'Current objective' : isDone ? 'Completed objective' : 'Objective'}: ${objectiveName}`}
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
                                      Schwerpunkt
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-text-secondary truncate">
                                  Objective {index + 1}/{selectedOperation.objectives?.length ?? 0}{selectedOperation.schwerpunkt_osid === obj ? ' - Main Axis' : ''}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-text-secondary italic">No objective chain recorded.</div>
                  )}
                </div>

                {/* Open Corps Orders */}
                <div className="pt-1 border-t border-panel-border">
                  {selectedOperation.phase === 'execution' && (
                    <div className="mb-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void haltOperation(false)}
                        className="kbd-focus text-xs font-sans px-2 py-2 rounded border border-panel-border text-text-primary hover:bg-panel-hover"
                      >
                        Halt
                      </button>
                      <button
                        type="button"
                        onClick={() => void haltOperation(true)}
                        className="kbd-focus text-xs font-sans px-2 py-2 rounded border border-panel-border text-text-primary hover:bg-panel-hover"
                      >
                        Halt + Dig In
                      </button>
                    </div>
                  )}
                  {selectedOperation.phase === 'planning' && phaseTurnCount != null && phaseTurnCount >= 2 && (
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={() => void forceLaunch()}
                        className="kbd-focus w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-text-primary hover:bg-panel-hover"
                      >
                        Launch Now
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedCorpsId(selectedOperation.corps_id);
                    }}
                    aria-label={`Open corps orders for ${selectedOperation.corps_name}`}
                    className="kbd-focus w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-interactive hover:bg-panel-hover"
                  >
                    Open Corps Orders
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-text-secondary italic">Select an operation.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

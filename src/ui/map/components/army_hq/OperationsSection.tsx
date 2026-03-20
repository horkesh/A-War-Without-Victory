/**
 * Operations section for expanded corps card.
 * Lists active operations with phase badges, momentum, and action buttons.
 * Click an operation to expand axes, preparation details, and per-brigade status.
 */
import { useMemo, useState } from 'react';
import type { OperationView, FormationView, LoadedGameState } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { formatOsidLabel } from '../../utils/formatters';
import { CollapsibleSection } from './CollapsibleSection';

interface OperationsSectionProps {
    corpsId: string;
    operations: OperationView[];
    gameState: LoadedGameState;
}

const PHASE_BADGE: Record<string, { bg: string; text: string }> = {
    execution: { bg: 'bg-red-900/20 border-red-800/20', text: 'text-red-700' },
    planning: { bg: 'bg-amber-900/20 border-amber-800/20', text: 'text-amber-700' },
    recovery: { bg: 'bg-neutral-400/20 border-neutral-400/20', text: 'text-neutral-600' },
};

const PREP_LABELS: Record<string, string> = {
    intel_gathering: 'Intel Gathering',
    force_staging: 'Force Staging',
    supply_check: 'Supply Check',
    assessment: 'Assessment',
    ready: 'Ready',
};

const AXIS_STATUS_COLOR: Record<string, string> = {
    executing: 'text-red-700', stalled: 'text-amber-700', complete: 'text-green-700',
};

function ReadinessBar({ label, value }: { label: string; value: number }) {
    const pct = Math.round(Math.max(0, Math.min(100, value * 100)));
    const color = pct >= 70 ? '#4a9a55' : pct >= 40 ? '#c4a35a' : '#c24040';
    return (
        <div className="flex items-center gap-2">
            <span className="text-[#8a7a60] w-10 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 rounded bg-[#d4ccc0]">
                <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-[9px] tabular-nums w-7 text-right" style={{ color }}>{pct}%</span>
        </div>
    );
}

function OperationExpandedDetail({ op, gameState }: { op: OperationView; gameState: LoadedGameState }) {
    const axes = op.axes ?? [];
    const objectives = op.objectives ?? [];
    const brigadeIds = op.participating_brigade_ids ?? [];
    const formationMap = useMemo(() => {
        const m = new Map<string, FormationView>();
        for (const f of gameState.formations) m.set(f.id, f);
        return m;
    }, [gameState.formations]);

    return (
        <div className="px-2 py-2 space-y-2 text-[10px] border-t border-[#c8b898]/30 bg-[#e8dcc4]/20"
             style={{ fontFamily: 'Courier New, monospace' }}>
            {/* Preparation details (planning phase) */}
            {op.phase === 'planning' && op.preparation_sub_phase && (
                <div className="space-y-1.5">
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider">Preparation</div>
                    <div className="flex gap-3">
                        <span>Phase: <span className="font-bold text-[#2a2016]">{PREP_LABELS[op.preparation_sub_phase] ?? op.preparation_sub_phase}</span></span>
                        {op.preparation_turns_elapsed != null && (
                            <span>Turn {op.preparation_turns_elapsed}{op.preparation_max_turns != null ? `/${op.preparation_max_turns}` : ''}</span>
                        )}
                        {op.has_active_probe && <span className="text-amber-700 font-bold">PROBE ACTIVE</span>}
                    </div>
                    {op.commander_assessment && (
                        <div>Assessment: <span className={`font-bold ${
                            op.commander_assessment === 'launch' ? 'text-green-700' :
                            op.commander_assessment === 'abort' ? 'text-red-700' : 'text-amber-700'
                        }`}>{op.commander_assessment.toUpperCase()}</span>
                            {op.postponement_count != null && op.postponement_count > 0 && (
                                <span className="text-[#8a7a60] ml-2">({op.postponement_count} postponed)</span>
                            )}
                        </div>
                    )}
                    {/* Readiness bars */}
                    {op.readiness && (
                        <div className="space-y-1 pt-1">
                            <ReadinessBar label="Intel" value={op.readiness.intel} />
                            <ReadinessBar label="Supply" value={op.readiness.supply} />
                            <ReadinessBar label="Cohsn" value={op.readiness.cohesion} />
                        </div>
                    )}
                    {op.force_ratio_estimate != null && (
                        <div>Force ratio: <span className={`font-bold ${op.force_ratio_estimate >= 1.5 ? 'text-green-700' : op.force_ratio_estimate >= 1.0 ? 'text-amber-700' : 'text-red-700'}`}>
                            {op.force_ratio_estimate.toFixed(2)}:1
                        </span></div>
                    )}
                </div>
            )}

            {/* Objectives */}
            {objectives.length > 0 && (
                <div className="space-y-0.5">
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider">Objectives ({objectives.length})</div>
                    {objectives.map((obj, i) => {
                        const isCurrent = i === (op.current_objective_index ?? 0);
                        return (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className={`w-3 text-center ${isCurrent ? 'text-red-700 font-bold' : 'text-[#8a7a60]'}`}>
                                    {isCurrent ? '>' : (i < (op.current_objective_index ?? 0) ? '\u2713' : '\u00B7')}
                                </span>
                                <span className={isCurrent ? 'text-[#2a2016] font-bold' : 'text-[#6a5a40]'}>
                                    {formatOsidLabel(obj)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Axes detail (execution phase) */}
            {axes.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider">Axes ({axes.length})</div>
                    {axes.map((axis) => (
                        <div key={axis.axis_id} className="px-1.5 py-1 rounded bg-[#e8dcc4]/40 border border-[#c8b898]/20">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-[#2a2016]">{axis.name}</span>
                                <span className={`text-[8px] font-bold uppercase ${AXIS_STATUS_COLOR[axis.status] ?? 'text-[#8a7a60]'}`}>
                                    {axis.status}
                                </span>
                            </div>
                            <div className="flex gap-3 text-[#6a5a40]">
                                <span>{axis.assigned_brigades.length} bde</span>
                                <span>Obj {axis.current_objective_index + 1}/{axis.objectives.length}</span>
                                <span className={axis.momentum >= 0 ? 'text-green-700' : 'text-red-700'}>
                                    Mom: {axis.momentum > 0 ? '+' : ''}{axis.momentum.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Participating brigades */}
            {brigadeIds.length > 0 && (
                <div className="space-y-0.5">
                    <div className="text-[8px] font-bold uppercase text-[#8a7a60] tracking-wider">Brigades ({brigadeIds.length})</div>
                    <div className="flex flex-wrap gap-1">
                        {brigadeIds.map((id) => {
                            const brig = formationMap.get(id);
                            if (!brig) return null;
                            const isDisrupted = (brig.disrupted_turns ?? 0) > 0;
                            return (
                                <span key={id} className={`text-[9px] px-1 py-0.5 rounded border ${
                                    isDisrupted ? 'border-red-600/30 text-red-700' : 'border-[#c8b898]/30 text-[#6a5a40]'
                                }`}>
                                    {brig.name}{isDisrupted ? ' DIS' : ''}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Execution stats */}
            {op.phase === 'execution' && (
                <div className="flex gap-3 border-t border-[#c8b898]/30 pt-1.5 text-[#6a5a40]">
                    {op.failure_count != null && op.failure_count > 0 && (
                        <span>Failures: <span className="text-red-700 font-bold">{op.failure_count}</span>/5</span>
                    )}
                    {op.consecutive_failures_on_current != null && op.consecutive_failures_on_current > 0 && (
                        <span>Consec: <span className="text-red-700">{op.consecutive_failures_on_current}</span>/3</span>
                    )}
                    {op.phase_started_turn != null && (
                        <span>Since w{op.phase_started_turn}</span>
                    )}
                </div>
            )}

            {/* Recovery reason */}
            {op.phase === 'recovery' && op.recovery_reason && (
                <div className="text-[#8a7a60] italic">
                    Recovery: {op.recovery_reason.replace(/_/g, ' ') /* simple underscore removal, not OSID */}
                </div>
            )}
        </div>
    );
}

export function OperationsSection({ corpsId, operations, gameState }: OperationsSectionProps) {
    const [expandedOp, setExpandedOp] = useState<string | null>(null);
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);

    const handleForceLaunch = async (opName: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.stageOperationForceLaunch({ corpsId, operationName: opName });
        if (!result.ok) setLoadError(result.error ?? 'Failed to force-launch operation.');
    };

    const handleStandDown = async (opName: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.stageOperationHalt({ corpsId, operationName: opName, digInOnHalt: true });
        if (!result.ok) setLoadError(result.error ?? 'Failed to stand down operation.');
    };

    return (
        <CollapsibleSection sectionKey={`ops-${corpsId}`} title="Operations" count={operations.length}>
            {operations.length === 0 ? (
                <div className="text-[11px] text-[#8a7a60] italic py-1">No active operations</div>
            ) : (
                <div className="space-y-2">
                    {operations.map((op) => {
                        const opKey = `${op.corps_id}|${op.name}`;
                        const badge = PHASE_BADGE[op.phase] ?? PHASE_BADGE.planning;
                        const momentum = op.momentum ?? 0;
                        const cmdOfficer = op.commander_officer_id
                            ? (gameState.namedOfficerData ?? []).find((o) => o.id === op.commander_officer_id)
                            : undefined;
                        const commander = cmdOfficer?.name;
                        const objectives = op.objectives ?? [];
                        const isExpanded = expandedOp === opKey;

                        return (
                            <div key={opKey}>
                                <button
                                    type="button"
                                    onClick={() => setExpandedOp(isExpanded ? null : opKey)}
                                    className={`w-full text-left px-2 py-2 rounded border border-[#c8b898]/30 space-y-1 transition-colors ${
                                        isExpanded ? 'bg-[#e8dcc4]/60' : 'bg-[#e8dcc4]/40 hover:bg-[#e8dcc4]/50'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[7px] text-[#8a7a60]" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>
                                                &#9654;
                                            </span>
                                            <span className="text-[12px] font-bold text-[#2a2016] uppercase"
                                                  style={{ fontFamily: 'Georgia, serif' }}>
                                                {op.name}
                                            </span>
                                        </div>
                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${badge.bg} ${badge.text}`}>
                                            {op.phase}
                                        </span>
                                    </div>
                                    <div className="text-[10px] tabular-nums text-[#6a5a40] flex gap-3"
                                         style={{ fontFamily: 'Courier New, monospace' }}>
                                        <span>{op.participating_brigade_count} bde</span>
                                        <span>{objectives.length} obj</span>
                                        {op.phase === 'execution' && (
                                            <span className={momentum >= 0 ? 'text-green-700' : 'text-red-700'}>
                                                Mom: {momentum > 0 ? '+' : ''}{momentum.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    {commander && (
                                        <div className="text-[9px] text-[#8a7a60]"
                                             style={{ fontFamily: 'Courier New, monospace' }}>
                                            Cmdr: {commander}
                                        </div>
                                    )}
                                </button>
                                {isExpanded && (
                                    <>
                                        <OperationExpandedDetail op={op} gameState={gameState} />
                                        <div className="flex gap-2 px-2 py-1.5 bg-[#e8dcc4]/20 border-t border-[#c8b898]/20 rounded-b">
                                            {(op.preparation_sub_phase === 'assessment' || op.preparation_sub_phase === 'ready') && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); void handleForceLaunch(op.name); }}
                                                    className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-green-600/50 text-green-700 hover:bg-green-900/20 transition-colors">
                                                    Force Launch
                                                </button>
                                            )}
                                            {op.phase === 'execution' && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); void handleStandDown(op.name); }}
                                                    className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-red-600/50 text-red-700 hover:bg-red-900/20 transition-colors">
                                                    Stand Down
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
}

/**
 * Operations section for expanded corps card.
 * NATO Terminal Aesthetic (Option 1).
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

const PHASE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
    execution: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/40' },
    planning: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/40' },
    recovery: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/40' },
};

const PREP_LABELS: Record<string, string> = {
    intel_gathering: 'INTEL GATHERING',
    force_staging: 'FORCE STAGING',
    supply_check: 'SUPPLY CHECK',
    assessment: 'ASSESSMENT',
    ready: 'READY',
};

const AXIS_STATUS_COLOR: Record<string, string> = {
    executing: 'text-red-500', stalled: 'text-amber-500', complete: 'text-[#4af626]',
};

function ReadinessBar({ label, value }: { label: string; value: number }) {
    const pct = Math.round(Math.max(0, Math.min(100, value * 100)));
    const colorClass = pct >= 70 ? 'bg-[#4af626]' : pct >= 40 ? 'bg-accent-gold' : 'bg-red-500';
    const textClass = pct >= 70 ? 'text-[#4af626]' : pct >= 40 ? 'text-accent-gold' : 'text-red-500';

    return (
        <div className="flex items-center gap-3 font-mono">
            <span className="text-[#4af626]/40 w-12 shrink-0 text-[9px] uppercase tracking-tighter">{label}</span>
            <div className="flex-1 h-1 bg-black/40 border border-[#4af626]/10">
                <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[10px] tabular-nums w-8 text-right font-bold ${textClass}`}>{pct}%</span>
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
        <div className="px-5 py-4 space-y-5 text-[11px] border-t border-[#4af626]/10 bg-black/40 font-mono">
            {/* Preparation details (planning phase) */}
            {op.phase === 'planning' && op.preparation_sub_phase && (
                <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase text-[#4af626]/40 tracking-widest border-b border-[#4af626]/5 pb-1">MISSION PREPARATION STATUS</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[#4af626]/40 uppercase">PHASE:</span>
                            <span className="font-bold text-accent-gold">{PREP_LABELS[op.preparation_sub_phase] ?? op.preparation_sub_phase.toUpperCase()}</span>
                        </div>
                        {op.preparation_turns_elapsed != null && (
                            <div className="flex items-center gap-2">
                                <span className="text-[#4af626]/40 uppercase">TIMELINE:</span>
                                <span className="text-[#4af626]/80">T+{op.preparation_turns_elapsed}{op.preparation_max_turns != null ? ` / ${op.preparation_max_turns}` : ''}</span>
                            </div>
                        )}
                        {op.has_active_probe && <span className="text-red-500 font-bold border border-red-500/30 bg-red-500/5 px-1.5 animate-pulse text-[9px]">PROBE ACTIVE</span>}
                    </div>

                    {op.commander_assessment && (
                        <div className="flex items-center gap-2">
                            <span className="text-[#4af626]/40 uppercase">ASSESSMENT:</span>
                            <span className={`font-bold px-2 py-0.5 border ${op.commander_assessment === 'launch' ? 'text-[#4af626] border-[#4af626]/30' :
                                    op.commander_assessment === 'abort' ? 'text-red-500 border-red-500/30' : 'text-amber-500 border-amber-500/30'
                                }`}>{op.commander_assessment.toUpperCase()}</span>
                            {op.postponement_count != null && op.postponement_count > 0 && (
                                <span className="text-red-500/60 ml-2 animate-pulse">(! {op.postponement_count} DELAYS)</span>
                            )}
                        </div>
                    )}

                    {/* Readiness bars */}
                    {op.readiness && (
                        <div className="space-y-2 max-w-sm pt-2">
                            <ReadinessBar label="INTEL" value={op.readiness.intel} />
                            <ReadinessBar label="SUPPLY" value={op.readiness.supply} />
                            <ReadinessBar label="COHESN" value={op.readiness.cohesion} />
                        </div>
                    )}

                    {op.force_ratio_estimate != null && (
                        <div className="pt-1 flex items-center gap-2">
                            <span className="text-[#4af626]/40 uppercase">FORCE RATIO:</span>
                            <span className={`font-bold text-[12px] ${op.force_ratio_estimate >= 1.5 ? 'text-[#4af626]' : op.force_ratio_estimate >= 1.0 ? 'text-accent-gold' : 'text-red-500'}`}>
                                {op.force_ratio_estimate.toFixed(2)} : 1.0
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Objectives */}
            {objectives.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase text-[#4af626]/40 tracking-widest border-b border-[#4af626]/5 pb-1">STRATEGIC OBJECTIVE LISTING ({objectives.length})</div>
                    <div className="grid gap-1">
                        {objectives.map((obj, i) => {
                            const isCurrent = i === (op.current_objective_index ?? 0);
                            const isComplete = i < (op.current_objective_index ?? 0);
                            return (
                                <div key={i} className={`flex items-center gap-3 px-2 py-1 ${isCurrent ? 'bg-[#4af626]/10 border-l-2 border-[#4af626]' : ''}`}>
                                    <span className={`w-4 text-center ${isCurrent ? 'text-[#4af626] font-bold' : isComplete ? 'text-[#4af626]/40' : 'text-white/10'}`}>
                                        {isCurrent ? '>>' : isComplete ? '[#]' : '[ ]'}
                                    </span>
                                    <span className={`uppercase ${isCurrent ? 'text-[#4af626] font-bold' : isComplete ? 'text-[#4af626]/40 line-through' : 'text-[#4af626]/60'}`}>
                                        {formatOsidLabel(obj)}
                                    </span>
                                    {isCurrent && <span className="ml-auto text-[9px] text-[#4af626] font-bold tracking-tighter animate-pulse">PRIMARY OBJ</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Axes detail (execution phase) */}
            {axes.length > 0 && (
                <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase text-[#4af626]/40 tracking-widest border-b border-[#4af626]/5 pb-1">AXIS OF ADVANCE STATUS ({axes.length})</div>
                    <div className="grid gap-2">
                        {axes.map((axis) => (
                            <div key={axis.axis_id} className="px-3 py-2 border border-[#4af626]/10 bg-black/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-[#4af626] uppercase tracking-wider">{axis.name}</span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border border-current bg-current/5 ${AXIS_STATUS_COLOR[axis.status] ?? 'text-[#4af626]/40'}`}>
                                        {axis.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[#4af626]/50 text-[10px] uppercase">
                                    <span className="flex items-center gap-2"><b className="text-[#4af626]/80">{axis.assigned_brigades.length}</b> UNITS DEPLOYED</span>
                                    <span className="flex items-center gap-2">OBJ <b className="text-[#4af626]/80">{axis.current_objective_index + 1} / {axis.objectives.length}</b></span>
                                    <span className={`flex items-center gap-2 ${axis.momentum >= 0 ? 'text-[#4af626]' : 'text-red-500'}`}>MOM <b className="text-current font-bold">{axis.momentum > 0 ? '+' : ''}{axis.momentum.toFixed(1)}</b></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Participating brigades */}
            {brigadeIds.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase text-[#4af626]/40 tracking-widest border-b border-[#4af626]/5 pb-1">OPERATIONAL ORBAT ({brigadeIds.length} UNITS)</div>
                    <div className="flex flex-wrap gap-2">
                        {brigadeIds.map((id) => {
                            const brig = formationMap.get(id);
                            if (!brig) return null;
                            const isDisrupted = (brig.disrupted_turns ?? 0) > 0;
                            return (
                                <span key={id} className={`text-[10px] px-2 py-1 border font-bold uppercase tracking-tighter ${isDisrupted ? 'border-red-500/40 text-red-500 bg-red-500/5 animate-pulse' : 'border-[#4af626]/20 text-[#4af626]/70 bg-black/20'
                                    }`}>
                                    {brig.name}{isDisrupted ? ' // DISRUPTED' : ''}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Execution stats */}
            {op.phase === 'execution' && (
                <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-[#4af626]/10 pt-4 text-[#4af626]/40 text-[10px] uppercase tracking-widest">
                    {op.failure_count != null && op.failure_count > 0 && (
                        <div className="flex items-center gap-2">FATIGUE: <span className="text-red-500 font-bold">{op.failure_count} / 5</span></div>
                    )}
                    {op.consecutive_failures_on_current != null && op.consecutive_failures_on_current > 0 && (
                        <div className="flex items-center gap-2">STALLING: <span className="text-red-500 font-bold">{op.consecutive_failures_on_current} / 3</span></div>
                    )}
                    {op.phase_started_turn != null && (
                        <div className="flex items-center gap-2">DEPLOYED SINCE: <span className="text-[#4af626] font-bold">W{op.phase_started_turn}</span></div>
                    )}
                </div>
            )}

            {/* Recovery info */}
            {op.phase === 'recovery' && op.recovery_reason && (
                <div className="text-blue-400 font-bold italic tracking-widest uppercase border border-blue-400/20 bg-blue-400/5 p-3">
                    [ RECOVERY MODE ] REASON: {op.recovery_reason.toUpperCase().replace(/_/g, ' ')}
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
                <div className="text-[11px] text-[#4af626]/40 italic py-2 font-mono uppercase">NO ACTIVE OPERATIONS DETECTED</div>
            ) : (
                <div className="space-y-3">
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
                            <div key={opKey} className="border border-[#4af626]/10 bg-black/20">
                                <button
                                    type="button"
                                    onClick={() => setExpandedOp(isExpanded ? null : opKey)}
                                    className={`w-full text-left px-4 py-3 space-y-2 transition-all ${isExpanded ? 'bg-[#4af626]/5' : 'hover:bg-[#4af626]/5'
                                        }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] text-[#4af626]/40 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                                                ▶
                                            </span>
                                            <span className="text-[14px] font-bold text-[#4af626]/90 uppercase font-mono tracking-wider"
                                                style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                                                {op.name}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border leading-none tracking-widest ${badge.bg} ${badge.border} ${badge.text}`}>
                                            {op.phase}
                                        </span>
                                    </div>
                                    <div className="text-[10px] tabular-nums font-mono flex flex-wrap gap-x-6 gap-y-1 ml-5 uppercase tracking-tighter">
                                        <span className="text-[#4af626]/50">UNITS: <b className="text-[#4af626]/80">{op.participating_brigade_count}</b></span>
                                        <span className="text-[#4af626]/50">OBJECTIVES: <b className="text-[#4af626]/80">{objectives.length}</b></span>
                                        {op.phase === 'execution' && (
                                            <span className={`flex items-center gap-2 ${momentum >= 0 ? 'text-[#4af626]' : 'text-red-500'}`}>
                                                MOMENTUM: <b className="font-bold">{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}</b>
                                            </span>
                                        )}
                                        {commander && (
                                            <span className="text-[#4af626]/40 border-l border-[#4af626]/10 pl-4 ml-auto">
                                                CMDR: {commander.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="flex flex-col">
                                        <OperationExpandedDetail op={op} gameState={gameState} />
                                        <div className="flex gap-3 px-5 py-3 bg-[#4af626]/5 border-t border-[#4af626]/10">
                                            {(op.preparation_sub_phase === 'assessment' || op.preparation_sub_phase === 'ready') && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); void handleForceLaunch(op.name); }}
                                                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 border border-[#4af626]/40 text-[#4af626] hover:bg-[#4af626]/20 transition-all font-mono">
                                                    [ FORCE LAUNCH ]
                                                </button>
                                            )}
                                            {op.phase === 'execution' && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); void handleStandDown(op.name); }}
                                                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 border border-red-500/40 text-red-500 hover:bg-red-500/20 transition-all font-mono">
                                                    [ STAND DOWN ]
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </CollapsibleSection>
    );
}

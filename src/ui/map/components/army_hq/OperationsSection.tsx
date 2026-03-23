/**
 * Operations section for expanded corps card.
 * Warroom dark palette. Enhanced drill-down: per-brigade status,
 * weekly log, casualty summary, commander personality, grade.
 */
import { useMemo, useState } from 'react';
import type { OperationView, FormationView, LoadedGameState, NamedOfficerView } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { formatOsidLabel } from '../../utils/formatters';
import { CollapsibleSection } from './CollapsibleSection';

type CompletedOp = NonNullable<LoadedGameState['operationHistory']>[number];

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
    executing: 'text-red-500', stalled: 'text-amber-500', complete: 'text-emerald-400',
};

const OUTCOME_COLOR: Record<string, string> = {
    completed: 'text-emerald-400',
    max_failures: 'text-red-500',
    orphaned_sector: 'text-amber-500',
    no_logged_attempt: 'text-text-secondary/60',
    manual_termination: 'text-blue-400',
};

const OUTCOME_LABEL: Record<string, string> = {
    completed: 'OBJECTIVES ACHIEVED',
    max_failures: 'OPERATIONAL FAILURE',
    orphaned_sector: 'SECTOR LOST',
    no_logged_attempt: 'NO ENGAGEMENT',
    manual_termination: 'STOOD DOWN',
};

function ReadinessBar({ label, value }: { label: string; value: number }) {
    const pct = Math.round(Math.max(0, Math.min(100, value * 100)));
    const colorClass = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-accent-gold' : 'bg-red-500';
    const textClass = pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-accent-gold' : 'text-red-500';

    return (
        <div className="flex items-center gap-3 font-mono">
            <span className="text-text-secondary/60 w-12 shrink-0 text-[9px] uppercase tracking-tighter">{label}</span>
            <div className="flex-1 h-1 bg-panel-card border border-panel-border/50">
                <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[10px] tabular-nums w-8 text-right font-bold ${textClass}`}>{pct}%</span>
        </div>
    );
}

function StarRating({ stars, verdict }: { stars: number; verdict: string }) {
    const filled = Math.max(0, Math.min(5, stars));
    return (
        <span className="flex items-center gap-1.5">
            <span className="text-accent-gold text-[12px] tracking-tight">
                {'\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled)}
            </span>
            <span className="text-[9px] text-text-secondary font-mono uppercase">{verdict}</span>
        </span>
    );
}

/** Compact personality descriptor from officer stats. */
function getCommanderPersonality(officer: NamedOfficerView): string {
    const comp = officer.competence;
    const aggr = officer.aggressiveness;
    const parts: string[] = [];

    if (comp >= 0.7) parts.push('HIGHLY COMPETENT');
    else if (comp >= 0.4) parts.push('CAPABLE');
    else parts.push('GREEN');

    if (aggr >= 0.7) parts.push('AGGRESSIVE');
    else if (aggr >= 0.4) parts.push('BALANCED');
    else parts.push('CAUTIOUS');

    if (officer.defensive_skill >= 0.7) parts.push('DEFENSIVE SPECIALIST');
    return parts.join(' / ');
}

/** Brigade status row within operation ORBAT. */
function BrigadeStatusRow({ brig }: { brig: FormationView }) {
    const personnel = brig.personnel ?? 0;
    const cohesion = brig.cohesion;
    const morale = brig.morale ?? 0;
    const isDisrupted = (brig.disrupted_turns ?? 0) > 0;

    const persColor = personnel >= 800 ? 'text-emerald-400' : personnel >= 400 ? 'text-accent-gold' : 'text-red-500';
    const cohColor = cohesion >= 60 ? 'text-emerald-400' : cohesion >= 30 ? 'text-accent-gold' : 'text-red-500';
    const morColor = morale >= 50 ? 'text-emerald-400' : morale >= 25 ? 'text-accent-gold' : 'text-red-500';

    return (
        <div className={`flex items-center gap-2 px-2 py-0.5 text-[10px] font-mono tabular-nums ${isDisrupted ? 'bg-red-500/5 border-l-2 border-red-500/40' : 'border-l-2 border-transparent'}`}>
            <span className={`flex-1 min-w-0 truncate font-bold uppercase tracking-tighter ${isDisrupted ? 'text-red-500' : 'text-text-secondary'}`}>
                {brig.name}
            </span>
            <span className={`w-12 text-right ${persColor}`}>{personnel.toLocaleString()}</span>
            <span className={`w-8 text-right ${cohColor}`}>{Math.round(cohesion)}</span>
            <span className={`w-8 text-right ${morColor}`}>{Math.round(morale)}</span>
            {isDisrupted && <span className="text-red-500 text-[8px] font-bold animate-pulse w-6 text-center">DIS</span>}
            {!isDisrupted && <span className="w-6" />}
        </div>
    );
}

/** Casualty summary block for completed ops. */
function CasualtyBlock({ suffered, inflicted, label }: {
    suffered: { killed: number; wounded: number };
    inflicted: { killed: number; wounded: number };
    label: string;
}) {
    const totalSuffered = suffered.killed + suffered.wounded;
    const totalInflicted = inflicted.killed + inflicted.wounded;
    const ratio = totalSuffered > 0 ? (totalInflicted / totalSuffered) : totalInflicted > 0 ? 999 : 0;
    const ratioColor = ratio >= 2.0 ? 'text-emerald-400' : ratio >= 1.0 ? 'text-accent-gold' : 'text-red-500';

    return (
        <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{label}</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono tabular-nums">
                <div>
                    <span className="text-text-secondary/60 uppercase">SUFFERED: </span>
                    <span className="text-red-500 font-bold">{totalSuffered.toLocaleString()}</span>
                    <span className="text-text-secondary/40 ml-1">({suffered.killed} KIA / {suffered.wounded} WIA)</span>
                </div>
                <div>
                    <span className="text-text-secondary/60 uppercase">INFLICTED: </span>
                    <span className="text-emerald-400 font-bold">{totalInflicted.toLocaleString()}</span>
                    <span className="text-text-secondary/40 ml-1">({inflicted.killed} KIA / {inflicted.wounded} WIA)</span>
                </div>
            </div>
            <div className="text-[10px] font-mono">
                <span className="text-text-secondary/60 uppercase">EXCHANGE RATIO: </span>
                <span className={`font-bold ${ratioColor}`}>{ratio >= 999 ? 'INF' : ratio.toFixed(2)} : 1</span>
            </div>
        </div>
    );
}

/** Compact weekly log timeline for completed operations. */
function WeeklyLogTimeline({ log }: { log: CompletedOp['weekly_log'] }) {
    if (!log || log.length === 0) return null;
    return (
        <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">WEEKLY OPERATIONS LOG ({log.length} TURNS)</div>
            <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-panel-border">
                {log.map((entry, i) => {
                    const cas = entry.casualties_suffered.killed + entry.casualties_suffered.wounded;
                    const inf = entry.casualties_inflicted.killed + entry.casualties_inflicted.wounded;
                    const hasCaptures = entry.objectives_captured_this_turn.length > 0;
                    const hasEvents = entry.notable_events.length > 0;
                    return (
                        <div key={i} className={`flex items-start gap-2 px-2 py-0.5 text-[9px] font-mono tabular-nums ${hasCaptures ? 'bg-emerald-500/5 border-l-2 border-emerald-400/40' : 'border-l-2 border-panel-border/20'}`}>
                            <span className="text-text-secondary/60 w-8 shrink-0">W{entry.turn}</span>
                            <span className="text-text-secondary/40 w-10 shrink-0 uppercase">{entry.phase.slice(0, 5)}</span>
                            {entry.attacks_this_turn > 0 && (
                                <span className="text-red-500/80">{entry.attacks_this_turn} ATK</span>
                            )}
                            {cas > 0 && <span className="text-red-500/60">-{cas}</span>}
                            {inf > 0 && <span className="text-emerald-400/60">+{inf}e</span>}
                            {hasCaptures && (
                                <span className="text-emerald-400 font-bold">
                                    OBJ {entry.objectives_captured_this_turn.map(o => formatOsidLabel(o)).join(', ')}
                                </span>
                            )}
                            {hasEvents && (
                                <span className="text-accent-gold/70 truncate flex-1">
                                    {entry.notable_events[0]}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
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

    const cmdOfficer = useMemo(() => {
        if (!op.commander_officer_id) return undefined;
        return (gameState.namedOfficerData ?? []).find((o) => o.id === op.commander_officer_id);
    }, [op.commander_officer_id, gameState.namedOfficerData]);

    // Find matching completed operation AAR (for recovery phase or grade display)
    const completedAAR = useMemo(() => {
        if (!gameState.operationHistory) return undefined;
        return gameState.operationHistory.find(
            (h) => h.operation_name === op.name && h.corps_id === op.corps_id
        );
    }, [gameState.operationHistory, op.name, op.corps_id]);

    return (
        <div className="px-5 py-4 space-y-5 text-[11px] border-t border-panel-border/50 bg-panel-card font-mono">
            {/* Commander personality card */}
            {cmdOfficer && (
                <div className="flex items-start gap-4 px-3 py-2.5 border border-panel-border/50 bg-panel-bg rounded-md">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-secondary/60 uppercase">OPERATION CMDR:</span>
                            <span className="text-[12px] font-bold text-text-primary uppercase tracking-wider">{cmdOfficer.name}</span>
                            <span className="text-[9px] text-text-secondary/40 uppercase">{cmdOfficer.rank}</span>
                        </div>
                        <div className="text-[9px] text-accent-gold/80 uppercase tracking-wider font-bold">
                            {getCommanderPersonality(cmdOfficer)}
                        </div>
                        <div className="flex gap-4 text-[9px] text-text-secondary/50 uppercase tabular-nums">
                            <span>COMP <b className="text-text-secondary">{(cmdOfficer.competence * 100).toFixed(0)}</b></span>
                            <span>AGGR <b className="text-text-secondary">{(cmdOfficer.aggressiveness * 100).toFixed(0)}</b></span>
                            <span>DEF <b className="text-text-secondary">{(cmdOfficer.defensive_skill * 100).toFixed(0)}</b></span>
                            {cmdOfficer.operations_commanded != null && cmdOfficer.operations_commanded > 0 && (
                                <span>OPS <b className="text-text-secondary">{cmdOfficer.operations_commanded}</b></span>
                            )}
                            {cmdOfficer.battles > 0 && (
                                <span>BATTLES <b className="text-text-secondary">{cmdOfficer.battles}</b> ({cmdOfficer.victories}W)</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preparation details (planning phase) */}
            {op.phase === 'planning' && op.preparation_sub_phase && (
                <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">MISSION PREPARATION STATUS</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary/60 uppercase">PHASE:</span>
                            <span className="font-bold text-accent-gold">{PREP_LABELS[op.preparation_sub_phase] ?? op.preparation_sub_phase.toUpperCase()}</span>
                        </div>
                        {op.preparation_turns_elapsed != null && (
                            <div className="flex items-center gap-2">
                                <span className="text-text-secondary/60 uppercase">TIMELINE:</span>
                                <span className="text-text-secondary">T+{op.preparation_turns_elapsed}{op.preparation_max_turns != null ? ` / ${op.preparation_max_turns}` : ''}</span>
                            </div>
                        )}
                        {op.has_active_probe && <span className="text-red-500 font-bold border border-red-500/30 bg-red-500/5 px-1.5 animate-pulse text-[9px]">PROBE ACTIVE</span>}
                    </div>

                    {op.commander_assessment && (
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary/60 uppercase">ASSESSMENT:</span>
                            <span className={`font-bold px-2 py-0.5 border ${op.commander_assessment === 'launch' ? 'text-emerald-400 border-panel-border' :
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
                            <span className="text-text-secondary/60 uppercase">FORCE RATIO:</span>
                            <span className={`font-bold text-[12px] ${op.force_ratio_estimate >= 1.5 ? 'text-emerald-400' : op.force_ratio_estimate >= 1.0 ? 'text-accent-gold' : 'text-red-500'}`}>
                                {op.force_ratio_estimate.toFixed(2)} : 1.0
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Objectives */}
            {objectives.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">STRATEGIC OBJECTIVE LISTING ({objectives.length})</div>
                    <div className="grid gap-1">
                        {objectives.map((obj, i) => {
                            const isCurrent = i === (op.current_objective_index ?? 0);
                            const isComplete = i < (op.current_objective_index ?? 0);
                            return (
                                <div key={i} className={`flex items-center gap-3 px-2 py-1 ${isCurrent ? 'bg-panel-bg border-l-2 border-amber-400' : ''}`}>
                                    <span className={`w-4 text-center ${isCurrent ? 'text-amber-400 font-bold' : isComplete ? 'text-text-secondary/60' : 'text-white/10'}`}>
                                        {isCurrent ? '>>' : isComplete ? '[#]' : '[ ]'}
                                    </span>
                                    <span className={`uppercase ${isCurrent ? 'text-amber-400 font-bold' : isComplete ? 'text-text-secondary/60 line-through' : 'text-text-secondary'}`}>
                                        {formatOsidLabel(obj)}
                                    </span>
                                    {isCurrent && <span className="ml-auto text-[9px] text-amber-400 font-bold tracking-tighter animate-pulse">PRIMARY OBJ</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Axes detail (execution phase) */}
            {axes.length > 0 && (
                <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">AXIS OF ADVANCE STATUS ({axes.length})</div>
                    <div className="grid gap-2">
                        {axes.map((axis) => (
                            <div key={axis.axis_id} className="px-3 py-2 border border-panel-border/50 bg-panel-card rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-text-primary uppercase tracking-wider">{axis.name}</span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border border-current bg-current/5 ${AXIS_STATUS_COLOR[axis.status] ?? 'text-text-secondary/60'}`}>
                                        {axis.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-text-secondary text-[10px] uppercase">
                                    <span className="flex items-center gap-2"><b className="text-text-secondary">{axis.assigned_brigades.length}</b> UNITS DEPLOYED</span>
                                    <span className="flex items-center gap-2">OBJ <b className="text-text-secondary">{axis.current_objective_index + 1} / {axis.objectives.length}</b></span>
                                    <span className={`flex items-center gap-2 ${axis.momentum >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>MOM <b className="text-current font-bold">{axis.momentum > 0 ? '+' : ''}{axis.momentum.toFixed(1)}</b></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Participating brigades — enhanced with per-brigade status grid */}
            {brigadeIds.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">OPERATIONAL ORBAT ({brigadeIds.length} UNITS)</div>
                    {/* Column headers */}
                    <div className="flex items-center gap-2 px-2 text-[8px] text-text-secondary/40 uppercase tracking-widest font-bold border-l-2 border-transparent">
                        <span className="flex-1 min-w-0">UNIT</span>
                        <span className="w-12 text-right">PERS</span>
                        <span className="w-8 text-right">COH</span>
                        <span className="w-8 text-right">MOR</span>
                        <span className="w-6 text-center">STS</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-panel-border space-y-0">
                        {brigadeIds.map((id) => {
                            const brig = formationMap.get(id);
                            if (!brig) return null;
                            return <BrigadeStatusRow key={id} brig={brig} />;
                        })}
                    </div>
                </div>
            )}

            {/* Execution stats */}
            {op.phase === 'execution' && (
                <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-panel-border/50 pt-4 text-text-secondary/60 text-[10px] uppercase tracking-widest">
                    {op.failure_count != null && op.failure_count > 0 && (
                        <div className="flex items-center gap-2">FATIGUE: <span className="text-red-500 font-bold">{op.failure_count} / 5</span></div>
                    )}
                    {op.consecutive_failures_on_current != null && op.consecutive_failures_on_current > 0 && (
                        <div className="flex items-center gap-2">STALLING: <span className="text-red-500 font-bold">{op.consecutive_failures_on_current} / 3</span></div>
                    )}
                    {op.phase_started_turn != null && (
                        <div className="flex items-center gap-2">DEPLOYED SINCE: <span className="text-text-primary font-bold">W{op.phase_started_turn}</span></div>
                    )}
                </div>
            )}

            {/* Recovery info */}
            {op.phase === 'recovery' && op.recovery_reason && (
                <div className="text-blue-400 font-bold italic tracking-widest uppercase border border-blue-400/20 bg-blue-400/5 p-3">
                    [ RECOVERY MODE ] REASON: {op.recovery_reason.toUpperCase().replace(/_/g, ' ')}
                </div>
            )}

            {/* Completed AAR: Grade + Casualty Summary + Weekly Log */}
            {completedAAR && (
                <div className="space-y-4 border-t border-panel-border/50 pt-4">
                    {/* Grade banner */}
                    <div className="flex items-center justify-between px-3 py-2.5 border border-panel-border/50 bg-panel-bg rounded-md">
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest">AFTER-ACTION ASSESSMENT</div>
                            <div className="flex items-center gap-3">
                                <StarRating stars={completedAAR.grade.stars} verdict={completedAAR.grade.verdict} />
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${OUTCOME_COLOR[completedAAR.outcome] ?? 'text-text-secondary'} border-current/30 bg-current/5`}>
                                    {OUTCOME_LABEL[completedAAR.outcome] ?? completedAAR.outcome}
                                </span>
                            </div>
                        </div>
                        <div className="text-right text-[9px] text-text-secondary/50 font-mono tabular-nums">
                            <div>W{completedAAR.started_turn} - W{completedAAR.ended_turn}</div>
                            <div>{completedAAR.duration_turns} TURNS / {completedAAR.total_attacks} ATTACKS</div>
                            <div>{completedAAR.objectives_captured.length} / {completedAAR.objectives_targeted.length} OBJ TAKEN</div>
                        </div>
                    </div>

                    {/* Grade factors */}
                    {Object.keys(completedAAR.grade.factors).length > 0 && (
                        <div className="flex flex-wrap gap-2 px-1">
                            {Object.entries(completedAAR.grade.factors).map(([key, val]) => (
                                <span key={key} className="text-[8px] text-text-secondary/40 font-mono uppercase border border-panel-border/30 px-1.5 py-0.5 rounded">
                                    {key.replace(/_/g, ' ')}: <span className="text-text-secondary tabular-nums">{typeof val === 'number' ? val.toFixed(0) : String(val)}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Casualty summary */}
                    <CasualtyBlock
                        suffered={completedAAR.casualties_suffered}
                        inflicted={completedAAR.casualties_inflicted}
                        label="CASUALTY SUMMARY"
                    />

                    {/* Equipment losses */}
                    {(completedAAR.equipment_lost.tanks > 0 || completedAAR.equipment_lost.artillery > 0 ||
                      completedAAR.equipment_destroyed.tanks > 0 || completedAAR.equipment_destroyed.artillery > 0) && (
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[9px] font-mono tabular-nums text-text-secondary/50 uppercase">
                            {completedAAR.equipment_lost.tanks > 0 && <span>TANKS LOST: <b className="text-red-500">{completedAAR.equipment_lost.tanks}</b></span>}
                            {completedAAR.equipment_lost.artillery > 0 && <span>ARTY LOST: <b className="text-red-500">{completedAAR.equipment_lost.artillery}</b></span>}
                            {completedAAR.equipment_destroyed.tanks > 0 && <span>TANKS DESTROYED: <b className="text-emerald-400">{completedAAR.equipment_destroyed.tanks}</b></span>}
                            {completedAAR.equipment_destroyed.artillery > 0 && <span>ARTY DESTROYED: <b className="text-emerald-400">{completedAAR.equipment_destroyed.artillery}</b></span>}
                            {completedAAR.equipment_captured.tanks > 0 && <span>TANKS CAPTURED: <b className="text-accent-gold">{completedAAR.equipment_captured.tanks}</b></span>}
                            {completedAAR.equipment_captured.artillery > 0 && <span>ARTY CAPTURED: <b className="text-accent-gold">{completedAAR.equipment_captured.artillery}</b></span>}
                        </div>
                    )}

                    {/* Weekly log timeline */}
                    <WeeklyLogTimeline log={completedAAR.weekly_log} />
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
                <div className="text-[11px] text-text-secondary/60 italic py-2 font-mono uppercase">NO ACTIVE OPERATIONS DETECTED</div>
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
                            <div key={opKey} className="border border-panel-border/50 bg-panel-card rounded-md">
                                <button
                                    type="button"
                                    onClick={() => setExpandedOp(isExpanded ? null : opKey)}
                                    className={`w-full text-left px-4 py-3 space-y-2 transition-all ${isExpanded ? 'bg-panel-bg' : 'hover:bg-panel-bg'
                                        }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] text-text-secondary/60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                                                ▶
                                            </span>
                                            <span className="text-[14px] font-bold text-text-primary uppercase font-mono tracking-wider"
                                                style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                                                {op.name}
                                            </span>
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border leading-none tracking-widest ${badge.bg} ${badge.border} ${badge.text}`}>
                                            {op.phase}
                                        </span>
                                    </div>
                                    <div className="text-[10px] tabular-nums font-mono flex flex-wrap gap-x-6 gap-y-1 ml-5 uppercase tracking-tighter">
                                        <span className="text-text-secondary">UNITS: <b className="text-text-secondary">{op.participating_brigade_count}</b></span>
                                        <span className="text-text-secondary">OBJECTIVES: <b className="text-text-secondary">{objectives.length}</b></span>
                                        {op.phase === 'execution' && (
                                            <span className={`flex items-center gap-2 ${momentum >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                MOMENTUM: <b className="font-bold">{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}</b>
                                            </span>
                                        )}
                                        {commander && (
                                            <span className="text-text-secondary/60 border-l border-panel-border/50 pl-4 ml-auto">
                                                CMDR: {commander.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="flex flex-col">
                                        <OperationExpandedDetail op={op} gameState={gameState} />
                                        <div className="flex gap-3 px-5 py-3 bg-panel-bg border-t border-panel-border/50">
                                            {(op.preparation_sub_phase === 'assessment' || op.preparation_sub_phase === 'ready') && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); void handleForceLaunch(op.name); }}
                                                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 border border-panel-border text-text-primary hover:bg-panel-bg transition-all font-mono">
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

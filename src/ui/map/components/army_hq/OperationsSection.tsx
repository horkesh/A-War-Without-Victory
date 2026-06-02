/**
 * Operations section for expanded corps card.
 * Warroom dark palette. Enhanced drill-down: per-brigade status,
 * weekly log, casualty summary, commander personality, grade.
 */
import { useMemo, useState } from 'react';
import type { OperationView, FormationView, LoadedGameState, NamedOfficerView } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { turnToDateString } from '../../utils/formatters';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { getPlayerSafeBrigadeName } from '../../utils/playerSafeText';
import { getPlayerSafeOperationBalancePresentation } from '../../../../shared/playerSafeOperationBalance';
import { CollapsibleSection } from './CollapsibleSection';
import { deriveOperationOutcomeCategory } from '../../data/command_strain';
import { EmptyState } from '../EmptyState';
import { t, type MessageKey } from '../../i18n';
import { FORCE_LAUNCH_COST, REQUEST_OP_COST } from '../../utils/commandAuthority';
import { buildDirectiveObjection, plainReason, type DirectiveObjectionView } from '../../data/opDirectiveObjection';

type CompletedOp = NonNullable<LoadedGameState['operationHistory']>[number];

interface OperationsSectionProps {
    corpsId: string;
    operations: OperationView[];
    gameState: LoadedGameState;
    /** Command strain score for this corps (derived by adapter, passed from ArmyHQCorpsCard). */
    commandStrain?: number;
    /** Player-facing label for commandStrain. */
    commandStrainLabel?: 'healthy' | 'strained' | 'compromised';
}

/**
 * Inline outcome category badge for executing/recovery op-cards.
 * Silence = healthy: ordinary_compliance returns null (no badge).
 * Only shown when commander_assessment_at_launch snapshot exists (post-feature ops).
 */
function OutcomeCategoryBadge({ assessmentAtLaunch, wasForce }: {
    assessmentAtLaunch: 'launch' | 'postpone' | 'abort' | null | undefined;
    wasForce: boolean;
}) {
    // No snapshot means pre-feature op — no badge
    if (assessmentAtLaunch == null && !wasForce) return null;

    const category = deriveOperationOutcomeCategory(assessmentAtLaunch, wasForce);

    if (category === 'ordinary_compliance') return null; // silence = healthy

    if (category === 'direct_intervention') {
        return (
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-amber-500/60 bg-amber-500/10 text-amber-400">
                {t('operationsSection.directIntervention')}
            </span>
        );
    }
    // reluctant_compliance
    return (
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-amber-400/40 bg-amber-400/5 text-amber-500/80">
            {t('operationsSection.approvedAgainstRecommendation')}
        </span>
    );
}

const PHASE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
    execution: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/40' },
    planning: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/40' },
    recovery: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/40' },
};

const PREP_LABEL_KEYS: Record<string, MessageKey> = {
    intel_gathering: 'operationsSection.prep.intelGathering',
    force_staging: 'operationsSection.prep.forceStaging',
    supply_check: 'operationsSection.prep.supplyCheck',
    assessment: 'operationsSection.prep.assessment',
    ready: 'operationsSection.prep.ready',
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

const OUTCOME_LABEL_KEY: Record<string, MessageKey> = {
    completed: 'operationsSection.outcome.completed',
    max_failures: 'operationsSection.outcome.maxFailures',
    orphaned_sector: 'operationsSection.outcome.orphanedSector',
    no_logged_attempt: 'operationsSection.outcome.noLoggedAttempt',
    manual_termination: 'operationsSection.outcome.manualTermination',
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

    if (comp >= 0.7) parts.push(t('operationsSection.personality.highlyCompetent'));
    else if (comp >= 0.4) parts.push(t('operationsSection.personality.capable'));
    else parts.push(t('operationsSection.personality.green'));

    if (aggr >= 0.7) parts.push(t('operationsSection.personality.aggressive'));
    else if (aggr >= 0.4) parts.push(t('operationsSection.personality.balanced'));
    else parts.push(t('operationsSection.personality.cautious'));

    if (officer.defensive_skill >= 0.7) parts.push(t('operationsSection.personality.defensiveSpecialist'));
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
                {getPlayerSafeBrigadeName(brig.name)}
            </span>
            <span className={`w-12 text-right ${persColor}`}>{personnel.toLocaleString()}</span>
            <span className={`w-8 text-right ${cohColor}`}>{Math.round(cohesion)}</span>
            <span className={`w-8 text-right ${morColor}`}>{Math.round(morale)}</span>
            {isDisrupted && <span className="text-red-500 text-[8px] font-bold animate-pulse w-6 text-center">{t('operationsSection.disruptedShort')}</span>}
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
                    <span className="text-text-secondary/60 uppercase">{t('operationsSection.suffered')} </span>
                    <span className="text-red-500 font-bold">{totalSuffered.toLocaleString()}</span>
                    <span className="text-text-secondary/40 ml-1">({suffered.killed} KIA / {suffered.wounded} WIA)</span>
                </div>
                <div>
                    <span className="text-text-secondary/60 uppercase">{t('operationsSection.inflicted')} </span>
                    <span className="text-emerald-400 font-bold">{totalInflicted.toLocaleString()}</span>
                    <span className="text-text-secondary/40 ml-1">({inflicted.killed} KIA / {inflicted.wounded} WIA)</span>
                </div>
            </div>
            <div className="text-[10px] font-mono">
                <span className="text-text-secondary/60 uppercase">{t('operationsSection.exchangeRatio')} </span>
                <span className={`font-bold ${ratioColor}`}>{ratio >= 999 ? 'INF' : ratio.toFixed(2)} : 1</span>
            </div>
        </div>
    );
}

/** Compact weekly log timeline for completed operations. */
function WeeklyLogTimeline({ log, resolveObjectiveLabel }: { log: CompletedOp['weekly_log']; resolveObjectiveLabel: (osid: string) => string }) {
    if (!log || log.length === 0) return null;
    return (
        <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.weeklyLog', { count: log.length })}</div>
            <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-panel-border">
                {log.map((entry, i) => {
                    const cas = entry.casualties_suffered.killed + entry.casualties_suffered.wounded;
                    const inf = entry.casualties_inflicted.killed + entry.casualties_inflicted.wounded;
                    const hasCaptures = entry.objectives_captured_this_turn.length > 0;
                    const hasEvents = entry.notable_events.length > 0;
                    return (
                        <div key={i} className={`flex items-start gap-2 px-2 py-0.5 text-[9px] font-mono tabular-nums ${hasCaptures ? 'bg-emerald-500/5 border-l-2 border-emerald-400/40' : 'border-l-2 border-panel-border/20'}`}>
                            <span className="text-text-secondary/60 w-16 shrink-0">{turnToDateString(entry.turn).split(' ').slice(1, 3).join(' ')}</span>
                            <span className="text-text-secondary/40 w-10 shrink-0 uppercase">{entry.phase.slice(0, 5)}</span>
                            {entry.attacks_this_turn > 0 && (
                                <span className="text-red-500/80">{entry.attacks_this_turn} ATK</span>
                            )}
                            {cas > 0 && <span className="text-red-500/60">-{cas}</span>}
                            {inf > 0 && <span className="text-emerald-400/60">+{inf}e</span>}
                            {hasCaptures && (
                                <span className="text-emerald-400 font-bold">
                                    OBJ {entry.objectives_captured_this_turn.map(resolveObjectiveLabel).join(', ')}
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
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const resolveObjectiveLabel = (osid: string) => getOsidDisplayName(osid, osidDisplayNames);
    const forceBalance = op.force_ratio_estimate != null
        ? getPlayerSafeOperationBalancePresentation(op.force_ratio_estimate)
        : null;

    return (
        <div className="px-4 py-3 space-y-4 text-[11px] border-t border-panel-border/50 bg-panel-card font-mono">
            {/* Commander personality card */}
            {cmdOfficer && (
                <div className="flex items-start gap-4 px-3 py-2.5 border border-panel-border/50 bg-panel-bg rounded-md">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-secondary/60 uppercase">{t('operationsSection.operationCommander')}</span>
                            <span className="text-[12px] font-bold text-text-primary uppercase tracking-wider">{cmdOfficer.name}</span>
                            <span className="text-[9px] text-text-secondary/40 uppercase">{cmdOfficer.rank}</span>
                        </div>
                        <div className="text-[9px] text-accent-gold/80 uppercase tracking-wider font-bold">
                            {getCommanderPersonality(cmdOfficer)}
                        </div>
                        <div className="flex gap-4 text-[9px] text-text-secondary/50 uppercase tabular-nums">
                            <span>{t('operationsSection.comp')} <b className="text-text-secondary">{(cmdOfficer.competence * 100).toFixed(0)}</b></span>
                            <span>{t('operationsSection.aggr')} <b className="text-text-secondary">{(cmdOfficer.aggressiveness * 100).toFixed(0)}</b></span>
                            <span>{t('operationsSection.def')} <b className="text-text-secondary">{(cmdOfficer.defensive_skill * 100).toFixed(0)}</b></span>
                            {cmdOfficer.operations_commanded != null && cmdOfficer.operations_commanded > 0 && (
                                <span>{t('operationsSection.opsShort')} <b className="text-text-secondary">{cmdOfficer.operations_commanded}</b></span>
                            )}
                            {cmdOfficer.battles > 0 && (
                                <span>{t('operationsSection.battles')} <b className="text-text-secondary">{cmdOfficer.battles}</b> ({t('operationsSection.winsShort', { count: cmdOfficer.victories })})</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preparation details (planning phase) */}
            {op.phase === 'planning' && op.preparation_sub_phase && (
                <div className="space-y-3">
                            <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.missionPrepStatus')}</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary/60 uppercase">{t('operationsSection.phase')}</span>
                            <span className="font-bold text-accent-gold">{PREP_LABEL_KEYS[op.preparation_sub_phase] ? t(PREP_LABEL_KEYS[op.preparation_sub_phase]) : op.preparation_sub_phase.toUpperCase()}</span>
                        </div>
                        {op.preparation_turns_elapsed != null && (
                            <div className="flex items-center gap-2">
                                <span className="text-text-secondary/60 uppercase">{t('operationsSection.timeline')}</span>
                                <span className="text-text-secondary">T+{op.preparation_turns_elapsed}{op.preparation_max_turns != null ? ` / ${op.preparation_max_turns}` : ''}</span>
                            </div>
                        )}
                        {op.has_active_probe && <span className="text-red-500 font-bold border border-red-500/30 bg-red-500/5 px-1.5 animate-pulse text-[9px]">{t('operationsSection.probeActive')}</span>}
                    </div>

                    {op.commander_assessment && (
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary/60 uppercase">{t('operationsSection.assessment')}</span>
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
                            <ReadinessBar label={t('operationsSection.intelShort')} value={op.readiness.intel} />
                            <ReadinessBar label={t('operationsSection.supplyShort')} value={op.readiness.supply} />
                            <ReadinessBar label={t('operationsSection.cohesionShort')} value={op.readiness.cohesion} />
                        </div>
                    )}

                    {forceBalance && (
                        <div className="pt-1 flex items-center gap-2">
                            <span className="text-text-secondary/60 uppercase">{t('operationsSection.forceBalance')}</span>
                            <span className={`font-bold text-[12px] ${forceBalance.toneClass}`}>
                                {forceBalance.label}
                            </span>
                            <span className="text-[10px] text-text-secondary/70 uppercase">{forceBalance.summary}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Objectives */}
            {objectives.length > 0 && (
                <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.strategicObjectiveListing', { count: objectives.length })}</div>
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
                                        {resolveObjectiveLabel(obj)}
                                    </span>
                                    {isCurrent && <span className="ml-auto text-[9px] text-amber-400 font-bold tracking-tighter animate-pulse">{t('operationsSection.primaryObj')}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Axes detail (execution phase) */}
            {axes.length > 0 && (
                <div className="space-y-3">
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.axisOfAdvanceStatus', { count: axes.length })}</div>
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
                                    <span className="flex items-center gap-2"><b className="text-text-secondary">{axis.assigned_brigades.length}</b> {t('operationsSection.unitsDeployed')}</span>
                                    <span className="flex items-center gap-2">{t('operationsSection.objShort')} <b className="text-text-secondary">{axis.current_objective_index + 1} / {axis.objectives.length}</b></span>
                                    <span className={`flex items-center gap-2 ${axis.momentum >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{t('operationsSection.momShort')} <b className="text-current font-bold">{axis.momentum > 0 ? '+' : ''}{axis.momentum.toFixed(1)}</b></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Participating brigades — enhanced with per-brigade status grid */}
            {brigadeIds.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.operationalOrbat', { count: brigadeIds.length })}</div>
                    {/* Column headers */}
                    <div className="flex items-center gap-2 px-2 text-[8px] text-text-secondary/40 uppercase tracking-widest font-bold border-l-2 border-transparent">
                        <span className="flex-1 min-w-0">{t('operationsSection.unit')}</span>
                        <span className="w-12 text-right">{t('operationsSection.persShort')}</span>
                        <span className="w-8 text-right">{t('operationsSection.cohShort')}</span>
                        <span className="w-8 text-right">{t('operationsSection.morShort')}</span>
                        <span className="w-6 text-center">{t('operationsSection.stsShort')}</span>
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
                        <div className="flex items-center gap-2">{t('operationsSection.fatigue')} <span className="text-red-500 font-bold">{op.failure_count} / 5</span></div>
                    )}
                    {op.consecutive_failures_on_current != null && op.consecutive_failures_on_current > 0 && (
                        <div className="flex items-center gap-2">{t('operationsSection.stalling')} <span className="text-red-500 font-bold">{op.consecutive_failures_on_current} / 3</span></div>
                    )}
                    {op.phase_started_turn != null && (
                        <div className="flex items-center gap-2">{t('operationsSection.deployedSince')} <span className="text-text-primary font-bold">{t('operationsSection.weekShort', { week: op.phase_started_turn })}</span></div>
                    )}
                </div>
            )}

            {/* Recovery info */}
            {op.phase === 'recovery' && op.recovery_reason && (
                <div className="text-blue-400 font-bold italic tracking-widest uppercase border border-blue-400/20 bg-blue-400/5 p-3">
                    {t('operationsSection.recoveryModeReason', { reason: op.recovery_reason.toUpperCase().replace(/_/g, ' ') })}
                </div>
            )}

            {/* Completed AAR: Grade + Casualty Summary + Weekly Log */}
            {completedAAR && (
                <div className="space-y-4 border-t border-panel-border/50 pt-4">
                    {/* Grade banner */}
                    <div className="flex items-center justify-between px-3 py-2.5 border border-panel-border/50 bg-panel-bg rounded-md">
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-bold uppercase text-text-secondary/60 tracking-widest">{t('operationsSection.afterActionAssessment')}</div>
                            <div className="flex items-center gap-3">
                                <StarRating stars={completedAAR.grade.stars} verdict={completedAAR.grade.verdict} />
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${OUTCOME_COLOR[completedAAR.outcome] ?? 'text-text-secondary'} border-current/30 bg-current/5`}>
                                    {OUTCOME_LABEL_KEY[completedAAR.outcome] ? t(OUTCOME_LABEL_KEY[completedAAR.outcome]) : completedAAR.outcome}
                                </span>
                            </div>
                        </div>
                        <div className="text-right text-[9px] text-text-secondary/50 font-mono tabular-nums">
                            <div>{t('operationsSection.weekRange', { start: completedAAR.started_turn, end: completedAAR.ended_turn })}</div>
                            <div>{t('operationsSection.aarDurationAttacks', { duration: completedAAR.duration_turns, attacks: completedAAR.total_attacks })}</div>
                            <div>{t('operationsSection.aarObjectivesTaken', { captured: completedAAR.objectives_captured.length, targeted: completedAAR.objectives_targeted.length })}</div>
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
                        label={t('operationsSection.casualtySummary')}
                    />

                    {/* Equipment losses */}
                    {(completedAAR.equipment_lost.tanks > 0 || completedAAR.equipment_lost.artillery > 0 ||
                      completedAAR.equipment_destroyed.tanks > 0 || completedAAR.equipment_destroyed.artillery > 0) && (
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[9px] font-mono tabular-nums text-text-secondary/50 uppercase">
                            {completedAAR.equipment_lost.tanks > 0 && <span>{t('operationsSection.tanksLost')} <b className="text-red-500">{completedAAR.equipment_lost.tanks}</b></span>}
                            {completedAAR.equipment_lost.artillery > 0 && <span>{t('operationsSection.artyLost')} <b className="text-red-500">{completedAAR.equipment_lost.artillery}</b></span>}
                            {completedAAR.equipment_destroyed.tanks > 0 && <span>{t('operationsSection.tanksDestroyed')} <b className="text-emerald-400">{completedAAR.equipment_destroyed.tanks}</b></span>}
                            {completedAAR.equipment_destroyed.artillery > 0 && <span>{t('operationsSection.artyDestroyed')} <b className="text-emerald-400">{completedAAR.equipment_destroyed.artillery}</b></span>}
                            {completedAAR.equipment_captured.tanks > 0 && <span>{t('operationsSection.tanksCaptured')} <b className="text-accent-gold">{completedAAR.equipment_captured.tanks}</b></span>}
                            {completedAAR.equipment_captured.artillery > 0 && <span>{t('operationsSection.artyCaptured')} <b className="text-accent-gold">{completedAAR.equipment_captured.artillery}</b></span>}
                        </div>
                    )}

                    {/* Weekly log timeline */}
                    <WeeklyLogTimeline log={completedAAR.weekly_log} resolveObjectiveLabel={resolveObjectiveLabel} />
                </div>
            )}
        </div>
    );
}

export function OperationsSection({ corpsId, operations, gameState, commandStrain = 0, commandStrainLabel = 'healthy' }: OperationsSectionProps) {
    const [expandedOp, setExpandedOp] = useState<string | null>(null);
    // REQUEST-OP presidential lever (minimal affordance). The president types a target
    // OSID; the engine auto-selects the force + axis and builds the op. Full map-target
    // selection UX is an explicit FOLLOW-UP (see PR notes) — this is the minimal entry.
    const [requestTargetOsid, setRequestTargetOsid] = useState('');
    // Force-op PUSHBACK: when the commander objects to a requested op, hold his
    // disposition-tinted objection here so the player can Force anyway / Stand down.
    // NOTE: this minimal card lives on the Request-op affordance for now; the read-model
    // (buildDirectiveObjection) + consequence wiring are surface-agnostic and will later
    // migrate to the Decision Room directive card.
    const [pendingObjection, setPendingObjection] = useState<{ view: DirectiveObjectionView; targetOsid: string } | null>(null);
    // IMPOSSIBLE directive: the candidate op cannot be built (no force / unreachable /
    // already owned) or the corps has no free operation slot. Such a directive is NOT
    // issuable — we surface "cannot issue: <reason>" and never stage / debit CA.
    const [impossibleReason, setImpossibleReason] = useState<string | null>(null);
    const [objectionLoading, setObjectionLoading] = useState(false);
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const setOperationBriefingContext = useGameStore((s) => s.setOperationBriefingContext);

    const authCurrent = gameState.commandAuthority?.current ?? 100;
    const canForceLaunch = authCurrent >= FORCE_LAUNCH_COST;

    const handleForceLaunch = async (opName: string) => {
        if (!ipc.isAvailable) return;
        if (!canForceLaunch) {
            setLoadError(t('operationsSection.insufficientAuthority', { current: authCurrent, cost: FORCE_LAUNCH_COST }));
            return;
        }
        const result = await ipc.stageOperationForceLaunch({ corpsId, operationName: opName });
        if (!result.ok) setLoadError(result.error ?? t('operationsSection.error.forceLaunch'));
    };

    const handleStandDown = async (opName: string) => {
        if (!ipc.isAvailable) return;
        const result = await ipc.stageOpHaltOrder({ corpsId, opName });
        if (!result.ok) setLoadError(result.error ?? t('operationsSection.error.standDown'));
    };

    const canRequestOp = authCurrent >= REQUEST_OP_COST;

    // Resolve this corps's active commanding officer (for the disposition-tinted objection).
    const corpsCommander = useMemo(
        () => (gameState.namedOfficerData ?? []).find(
            (o) => o.assigned_corps_id === corpsId && o.status === 'active',
        ),
        [gameState.namedOfficerData, corpsId],
    );

    /** Stage the directive (optionally forced past a shown objection). Shared by the
     *  no-objection path and the "Force anyway" button. */
    const stageDirective = async (target: string, forced: boolean) => {
        const result = await ipc.stageOpDirectiveOrder({
            corpsId,
            targetOsid: target,
            ...(forced ? { forced_over_objection: true } : {}),
        });
        if (!result.ok) setLoadError(result.error ?? 'Failed to request operation.');
        else {
            setRequestTargetOsid('');
            setPendingObjection(null);
            setImpossibleReason(null);
        }
    };

    const handleRequestOp = async () => {
        if (!ipc.isAvailable) return;
        const target = requestTargetOsid.trim();
        if (!target) return;
        if (!canRequestOp) {
            setLoadError(t('operationsSection.insufficientAuthority', { current: authCurrent, cost: REQUEST_OP_COST }));
            return;
        }
        setImpossibleReason(null);
        // Ask the commander first. If he objects (recommendedAction !== 'launch'), surface
        // his disposition-tinted pushback BEFORE committing — the president decides whether
        // to force it. If he agrees (or the query is unavailable), stage directly.
        setObjectionLoading(true);
        try {
            const objection = await ipc.queryDirectiveObjection({ corpsId, targetOsid: target });
            if (objection.ok && objection.data) {
                // IMPOSSIBLE (checked FIRST, independent of cowed state / CO presence): the
                // candidate op could not be built or the corps has no free slot. This is NOT
                // forceable — injectOpDirectives would reject it with the same reason. Surface
                // "cannot issue" and do NOT stage / debit command authority.
                if (objection.data.rejectionReason) {
                    setImpossibleReason(objection.data.rejectionReason);
                    return;
                }
                if (objection.data.recommendedAction !== 'launch' && corpsCommander) {
                    const view = buildDirectiveObjection(
                        {
                            name: corpsCommander.name,
                            rank: corpsCommander.rank,
                            competence: corpsCommander.competence,
                            political_reliability: corpsCommander.political_reliability,
                            is_cowed: corpsCommander.is_cowed,
                        },
                        objection.data,
                    );
                    // Only a genuine, forceable objection (issuable) shows the Force-anyway card.
                    if (view.shows_objection && view.issuable) {
                        setPendingObjection({ view, targetOsid: target });
                        return;
                    }
                }
            }
        } finally {
            setObjectionLoading(false);
        }
        // No objection (commander agrees, is cowed, or no CO/query) → stage directly.
        await stageDirective(target, false);
    };

    const handleForceAnyway = async () => {
        if (!pendingObjection) return;
        await stageDirective(pendingObjection.targetOsid, true);
    };

    const handleStandDownObjection = () => {
        setPendingObjection(null);
    };

    return (
        <CollapsibleSection sectionKey={`ops-${corpsId}`} title={t('operationsSection.title')} count={operations.length}>
            {/* REQUEST-OP presidential lever (minimal affordance). Name a strategic objective
                (target OSID); the engine builds the op a commander would — auto-selecting the
                force + axis. The president does NOT pick brigades/axes. Full map-target picker
                is a FOLLOW-UP. */}
            {ipc.isAvailable && (
                <div className="flex items-center gap-2 mb-3 px-1">
                    <input
                        type="text"
                        value={requestTargetOsid}
                        onChange={(e) => { setRequestTargetOsid(e.target.value); if (impossibleReason) setImpossibleReason(null); }}
                        placeholder="Objective OSID (e.g. bihac_1)"
                        aria-label="Request operation objective OSID"
                        className="flex-1 text-[11px] font-mono bg-panel-bg border border-panel-border/50 rounded px-2 py-1 text-text-primary"
                    />
                    <button
                        type="button"
                        onClick={handleRequestOp}
                        disabled={!canRequestOp || requestTargetOsid.trim().length === 0 || objectionLoading || pendingObjection !== null}
                        title={canRequestOp
                            ? `Direct this corps to take the objective (cost ${REQUEST_OP_COST} command authority; current ${authCurrent}). The engine selects the force + axis.`
                            : `Insufficient command authority (need ${REQUEST_OP_COST}, have ${authCurrent}).`}
                        className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-panel-border/50 text-text-primary disabled:opacity-40 hover:bg-panel-bg">
                        {objectionLoading ? 'Consulting…' : `Request op (${REQUEST_OP_COST})`}
                    </button>
                </div>
            )}
            {/* CANNOT ISSUE banner: the directive is IMPOSSIBLE (unbuildable target / no
                force / no free slot). It is not forceable — there is no objection to
                override and no order to stage. Nothing was committed; no command authority
                was spent. */}
            {impossibleReason && (
                <div
                    role="alert"
                    aria-label="Directive cannot be issued"
                    className="mb-3 mx-1 p-3 rounded border border-panel-border/60 bg-panel-bg/60">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                        Cannot issue
                    </p>
                    <p className="text-[11px] text-text-primary">
                        This corps cannot mount that operation — {plainReason(impossibleReason)}. No command authority was spent.
                    </p>
                </div>
            )}
            {/* Force-op PUSHBACK card: the commander objected. Show his disposition-tinted
                judgment (the SOURCE, not a clean %) and let the president Force anyway
                (pays CA + cows/relieves the CO over time) or Stand down. */}
            {pendingObjection && (
                <div
                    role="alertdialog"
                    aria-label="Commander objection"
                    className={`mb-3 mx-1 p-3 rounded border ${
                        pendingObjection.view.severity === 'abort'
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-amber-500/50 bg-amber-500/5'
                    }`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                        {pendingObjection.view.severity === 'abort' ? 'Commander recommends against' : 'Commander urges delay'}
                    </p>
                    <p className="text-[11px] italic text-text-primary mb-2">{pendingObjection.view.prose}</p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleForceAnyway}
                            disabled={pendingObjection.view.rejection_reason !== undefined}
                            title={pendingObjection.view.rejection_reason !== undefined
                                ? 'The operation cannot be formed as ordered — there is nothing to force.'
                                : `Override the commander's judgment and order the operation anyway. He will be cowed by repeated overrides.`}
                            className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-red-500/50 text-red-400 disabled:opacity-40 hover:bg-red-500/10">
                            Force anyway
                        </button>
                        <button
                            type="button"
                            onClick={handleStandDownObjection}
                            className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-panel-border/50 text-text-primary hover:bg-panel-bg">
                            Stand down
                        </button>
                    </div>
                </div>
            )}
            {operations.length === 0 ? (
                <EmptyState
                    message={t('operationsSection.empty')}
                    helpText={t('operationsSection.emptyHelp')}
                    density="compact"
                />
            ) : (
                <div className="space-y-3">
                    {/* Command-risk inline reminder — demoted in Wave 10 (Standing section owns detail).
                        Silence = healthy: no notice at strain 0. */}
                    {commandStrain > 0 && (
                        <p className={`text-[9px] font-mono italic ${
                            commandStrainLabel === 'compromised' ? 'text-red-400/70' : 'text-amber-400/70'
                        }`}>
                            {t('operationsSection.commandStrainNotice')}
                        </p>
                    )}
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
                                            {op.readiness && (
                                                <span className={`inline-block w-2 h-2 rounded-full ${
                                                    Math.min(op.readiness.supply, op.readiness.cohesion, op.readiness.intel) < 0.4
                                                        ? 'bg-red-500'
                                                        : Math.min(op.readiness.supply, op.readiness.cohesion, op.readiness.intel) < 0.7
                                                            ? 'bg-amber-400'
                                                            : 'bg-emerald-400'
                                                }`} title={t('operationsSection.readinessTitle', {
                                                    supply: Math.round(op.readiness.supply * 100),
                                                    cohesion: Math.round(op.readiness.cohesion * 100),
                                                    intel: Math.round(op.readiness.intel * 100),
                                                })} />
                                            )}
                                            <span className="text-[14px] font-bold text-text-primary uppercase font-mono tracking-wider"
                                                style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                                                {op.display_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Outcome category badge — only for executing/recovery ops with a launch snapshot.
                                                Silence = healthy: ordinary_compliance shows no badge. */}
                                            {(op.phase === 'execution' || op.phase === 'recovery') && (
                                                <OutcomeCategoryBadge
                                                    assessmentAtLaunch={op.commander_assessment_at_launch}
                                                    wasForce={op.was_force_launched ?? false}
                                                />
                                            )}
                                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border leading-none tracking-widest ${badge.bg} ${badge.border} ${badge.text}`}>
                                                {op.phase}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] tabular-nums font-mono flex flex-wrap gap-x-6 gap-y-1 ml-5 uppercase tracking-tighter">
                                        <span className="text-text-secondary">{t('operationsSection.units')} <b className="text-text-secondary">{op.participating_brigade_count}</b></span>
                                        <span className="text-text-secondary">{t('operationsSection.objectives')} <b className="text-text-secondary">{objectives.length}</b></span>
                                        {op.phase === 'execution' && (
                                            <span className={`flex items-center gap-2 ${momentum >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                {t('operationsSection.momentum')} <b className="font-bold">{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}</b>
                                            </span>
                                        )}
                                        {commander && (
                                            <span className="text-text-secondary/60 border-l border-panel-border/50 pl-4 ml-auto">
                                                {t('operationsSection.commanderShort')} {commander.toUpperCase()}
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
                                                    disabled={!canForceLaunch}
                                                    className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 border font-mono transition-all ${canForceLaunch ? 'border-panel-border text-text-primary hover:bg-panel-bg' : 'border-panel-border/30 text-text-secondary/40 cursor-not-allowed'}`}
                                                    title={canForceLaunch
                                                        ? t('operationsSection.directInterventionTitle', { cost: FORCE_LAUNCH_COST, current: authCurrent })
                                                        : t('operationsSection.insufficientAuthority', { current: authCurrent, cost: FORCE_LAUNCH_COST })}>
                                                    {t('operationsSection.directInterventionButton', { cost: FORCE_LAUNCH_COST })}
                                                </button>
                                            )}
                                            {/* Review Command Decision — opens OperationBriefingModal for executing/recovery ops.
                                                Only shown when a launch snapshot exists (commander_assessment_at_launch set). */}
                                            {(op.phase === 'execution' || op.phase === 'recovery') && op.commander_assessment_at_launch != null && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); setOperationBriefingContext({ corpsId: op.corps_id, operationName: op.name }); }}
                                                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 border border-panel-border/40 text-text-secondary/70 hover:bg-panel-bg hover:text-text-secondary transition-all font-mono">
                                                    {t('operationsSection.reviewCommandDecision')}
                                                </button>
                                            )}
                                            {op.phase === 'execution' && (
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); void handleStandDown(op.name); }}
                                                    className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 border border-red-500/40 text-red-500 hover:bg-red-500/20 transition-all font-mono">
                                                    {t('operationsSection.standDown')}
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

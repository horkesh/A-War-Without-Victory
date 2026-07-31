/**
 * Operations section for expanded corps card.
 * Warroom dark palette. Enhanced drill-down: per-brigade status,
 * weekly log, casualty summary, commander personality, grade.
 */
import { useMemo, useState } from 'react';
import type { OperationView, FormationView, LoadedGameState, NamedOfficerView } from '../../data/types';
import { useGameStore } from '../../store/gameStore';
import { turnToDateString, toTitleCase } from '../../utils/formatters';
import { getOsidDisplayName } from '../../utils/osidDisplayName';
import { getPlayerSafeBrigadeName, getPlayerSafeOperationPhaseLabel } from '../../utils/playerSafeText';
import { getPlayerSafeOperationBalancePresentation } from '../../../../shared/playerSafeOperationBalance';
import { CollapsibleSection } from './CollapsibleSection';
import { deriveOperationOutcomeCategory, normalizeCommandStrainLabel } from '../../data/command_strain';
import { EmptyState } from '../EmptyState';
import { t, type MessageKey } from '../../i18n';
import { inspectOnField } from '../../utils/shellNavigation';

type CompletedOp = NonNullable<LoadedGameState['operationHistory']>[number];

interface OperationsSectionProps {
    corpsId: string;
    operations: OperationView[];
    gameState: LoadedGameState;
    /** Command strain score for this corps (derived by adapter, passed from ArmyHQCorpsCard). */
    commandStrain?: number;
    /** Player-facing label for commandStrain. */
    commandStrainLabel?: 'healthy' | 'strained' | 'compromised';
    defaultOpen?: boolean;
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
            <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 border border-amber-500/60 bg-amber-500/10 text-amber-400">
                {t('operationsSection.directIntervention')}
            </span>
        );
    }
    // reluctant_compliance
    return (
        <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 border border-amber-400/40 bg-amber-400/5 text-amber-500/80">
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

const WEEKLY_PHASE_LABEL_KEY: Record<string, MessageKey> = {
    planning: 'operationHistory.weekly.phase.planning',
    execution: 'operationHistory.weekly.phase.execution',
    recovery: 'operationHistory.weekly.phase.recovery',
};

/** Player-facing phrasing for a commander's launch recommendation (raw enum). */
const COMMANDER_ASSESSMENT_LABELS: Record<string, string> = {
    launch: 'Recommends launch', postpone: 'Urges delay', abort: 'Advises abort',
};

/** Player-facing phrasing for a recovery-mode reason (raw enum). */
const RECOVERY_REASON_LABELS: Record<string, string> = {
    max_failures: 'Halted after repeated failures',
    orphaned_sector: 'Objective sector lost',
    manual_termination: 'Stood down by order',
    no_logged_attempt: 'No assault attempted',
    tg_cohesion_exhausted: 'Tactical group exhausted',
    tg_max_lifecycle: 'Operational duration reached',
};

/** Player-facing title-case labels for axis status (raw enum). */
const AXIS_STATUS_LABELS: Record<string, string> = {
    executing: 'Executing', stalled: 'Stalled', complete: 'Complete',
};

/** Player-facing labels for AAR grade-factor keys (raw enum). */
const GRADE_FACTOR_LABELS: Record<string, string> = {
    objective_completion: 'Objective progress',
    exchange_ratio: 'Exchange ratio',
    tempo: 'Duration efficiency',
    preservation: 'Ending force vs start',
    objective_capture_rate: 'Objective capture',
    force_ratio: 'Force ratio',
    casualty_ratio: 'Casualty ratio',
    duration_efficiency: 'Duration efficiency',
    momentum: 'Momentum',
};

const OFFICER_RANK_LABEL_KEYS: Record<string, MessageKey> = {
    army_commander: 'personnel.rank.armyCommander',
    corps_commander: 'personnel.rank.corpsCommander',
    brigadier_general: 'personnel.rank.brigadierGeneral',
    tactical_commander: 'personnel.rank.tacticalCommander',
    general: 'personnel.rank.general',
    colonel: 'personnel.rank.colonel',
    major: 'personnel.rank.major',
    deputy: 'personnel.rank.deputy',
};

function formatOfficerRank(rank: string | undefined): string {
    if (!rank) return t('personnel.rank.unspecified');
    return t(OFFICER_RANK_LABEL_KEYS[rank] ?? 'personnel.rank.unspecified');
}

function isUnsafeRawLabel(value: string | null | undefined): boolean {
    if (!value) return false;
    return /(?:^cmd_|_t\d+\b|[a-z]{2,}_[a-z0-9_]+|[:|])/.test(value);
}

function safeFallbackLabel(value: string | null | undefined, fallback: string): string {
    if (!value || isUnsafeRawLabel(value)) return fallback;
    return toTitleCase(value);
}

function safeOperationDisplayName(op: OperationView): string {
    return isUnsafeRawLabel(op.display_name) ? t('operationsSection.staffOperation') : op.display_name;
}

function formatWeeklyPhaseLabel(phase: string | null | undefined): string {
    const key = (phase ?? '').trim().toLowerCase();
    return WEEKLY_PHASE_LABEL_KEY[key] ? t(WEEKLY_PHASE_LABEL_KEY[key]) : t('operationHistory.weekly.phase.pending');
}

function formatWeeklyAttackCount(count: number): string {
    return t(count === 1 ? 'operationHistory.weekly.attack.one' : 'operationHistory.weekly.attack.many', { count: count.toLocaleString() });
}

function formatWeeklyCasualties(count: number): string {
    return t(count === 1 ? 'operationHistory.weekly.casualty.one' : 'operationHistory.weekly.casualty.many', { count: count.toLocaleString() });
}

function formatWeeklyInflicted(count: number): string {
    return t(count === 1 ? 'operationHistory.weekly.inflicted.one' : 'operationHistory.weekly.inflicted.many', { count: count.toLocaleString() });
}

function formatWeeklyHeldObjectives(objectives: string[]): string {
    return t('operationHistory.weekly.heldAtClose', { objectives: objectives.join(', ') });
}

function formatWeeklyNotableEvent(event: string): string {
    return isUnsafeRawLabel(event) ? t('operationHistory.weekly.notableFallback') : safeFallbackLabel(event, t('operationHistory.weekly.notableFallback'));
}

function ReadinessBar({ label, value }: { label: string; value: number | null | undefined }) {
    if (!isReportedNumber(value)) {
        return (
            <div className="flex items-center gap-3 font-mono">
                <span className="text-text-secondary/60 w-24 shrink-0 text-xs uppercase tracking-tighter">{label}</span>
                <div className="flex-1 h-1 bg-panel-card border border-panel-border/50 opacity-50" />
                <span className="text-xs tabular-nums w-20 text-right italic text-text-secondary/60">{t('operationsSection.metricUnreported')}</span>
            </div>
        );
    }
    const pct = Math.round(Math.max(0, Math.min(100, value * 100)));
    const colorClass = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-accent-gold' : 'bg-red-500';
    const textClass = pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-accent-gold' : 'text-red-500';

    return (
        <div className="flex items-center gap-3 font-mono">
            <span className="text-text-secondary/60 w-24 shrink-0 text-xs uppercase tracking-tighter">{label}</span>
            <div className="flex-1 h-1 bg-panel-card border border-panel-border/50">
                <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs tabular-nums w-8 text-right font-bold ${textClass}`}>{pct}%</span>
        </div>
    );
}

function readinessValues(readiness: OperationView['readiness']): number[] {
    if (!readiness) return [];
    return [readiness.supply, readiness.cohesion, readiness.intel].filter(isReportedNumber);
}

function formatReadinessTitle(readiness: OperationView['readiness']): string {
    const format = (value: number | null | undefined) => (
        isReportedNumber(value) ? `${Math.round(value * 100)}%` : t('operationsSection.metricUnreported')
    );
    return t('operationsSection.readinessTitle', {
        supply: format(readiness?.supply),
        cohesion: format(readiness?.cohesion),
        intel: format(readiness?.intel),
    });
}

function StarRating({ stars, verdict }: { stars: number; verdict: string }) {
    const filled = Math.max(0, Math.min(5, stars));
    return (
        <span className="flex items-center gap-1.5">
            <span className="text-accent-gold text-[12px] tracking-tight">
                {'\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled)}
            </span>
            <span className="text-xs text-text-secondary font-mono uppercase">{verdict}</span>
        </span>
    );
}

function getRecordedAarGrade(aar: CompletedOp | null | undefined): CompletedOp['grade'] | null {
    const grade = aar?.grade;
    if (!grade || !Number.isFinite(grade.stars) || typeof grade.verdict !== 'string' || !grade.verdict.trim()) {
        return null;
    }
    return grade;
}

/** Compact personality descriptor from officer stats. */
function getCommanderPersonality(officer: NamedOfficerView): string {
    const comp = officer.competence;
    const aggr = officer.aggressiveness;
    const parts: string[] = [];

    if (!Number.isFinite(comp) || !Number.isFinite(aggr)) return 'Profile unreported';

    if (comp >= 4) parts.push(t('operationsSection.personality.highlyCompetent'));
    else if (comp >= 3) parts.push(t('operationsSection.personality.capable'));
    else parts.push(t('operationsSection.personality.green'));

    if (aggr >= 4) parts.push(t('operationsSection.personality.aggressive'));
    else if (aggr >= 3) parts.push(t('operationsSection.personality.balanced'));
    else parts.push(t('operationsSection.personality.cautious'));

    if (Number.isFinite(officer.defensive_skill) && officer.defensive_skill >= 4) {
        parts.push(t('operationsSection.personality.defensiveSpecialist'));
    }
    return parts.join(' / ');
}

function formatOfficerRating(value: number): string {
    return Number.isFinite(value) ? value.toFixed(1) : t('operationsSection.metricUnreported');
}

function isReportedNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function formatReportedInteger(value: number | null | undefined, options?: { locale?: boolean }): string {
    if (!isReportedNumber(value)) return t('operationsSection.metricUnreported');
    return options?.locale ? Math.round(value).toLocaleString() : String(Math.round(value));
}

function metricTone(value: number | null | undefined, good: number, caution: number): string {
    if (!isReportedNumber(value)) return 'text-text-secondary/60 italic';
    return value >= good ? 'text-emerald-400' : value >= caution ? 'text-accent-gold' : 'text-red-500';
}

function resolveOperationCommander(
    commanderId: string | null | undefined,
    officers: readonly NamedOfficerView[] | null | undefined,
): { kind: 'assigned'; officer: NamedOfficerView } | { kind: 'unassigned' | 'unreported'; label: string } {
    if (!commanderId) return { kind: 'unassigned', label: t('operationsSection.commanderUnassigned') };
    const officer = officers?.find((o) => o.id === commanderId);
    if (!officer) return { kind: 'unreported', label: t('operationsSection.commanderUnreported') };
    return { kind: 'assigned', officer };
}

function operationPhaseLabel(op: OperationView): string {
    return op.phase_unreported
        ? getPlayerSafeOperationPhaseLabel(null)
        : getPlayerSafeOperationPhaseLabel(op.phase);
}

/** Brigade status row within operation ORBAT. */
function BrigadeStatusRow({ brig, corpsId }: { brig: FormationView; corpsId: string }) {
    const personnel = brig.personnel;
    const cohesion = brig.cohesion;
    const morale = brig.morale;
    const isDisrupted = (brig.disrupted_turns ?? 0) > 0;
    const brigadeName = getPlayerSafeBrigadeName(brig.name);

    const persColor = metricTone(personnel, 800, 400);
    const cohColor = metricTone(cohesion, 60, 30);
    const morColor = metricTone(morale, 50, 25);

    return (
        <div className={`flex items-center gap-2 px-2 py-0.5 text-xs font-mono tabular-nums ${isDisrupted ? 'bg-red-500/5 border-l-2 border-red-500/40' : 'border-l-2 border-transparent'}`}>
            <span className={`flex-1 min-w-0 truncate font-bold uppercase tracking-tighter ${isDisrupted ? 'text-red-500' : 'text-text-secondary'}`}>
                {brigadeName}
            </span>
            <span className={`w-20 text-right ${persColor}`}>{formatReportedInteger(personnel, { locale: true })}</span>
            <span className={`w-16 text-right ${cohColor}`}>{formatReportedInteger(cohesion)}</span>
            <span className={`w-14 text-right ${morColor}`}>{formatReportedInteger(morale)}</span>
            {isDisrupted && <span className="text-red-500 text-xs font-bold animate-pulse w-20 text-center">{t('operationsSection.disruptedShort')}</span>}
            {!isDisrupted && <span className="w-20" />}
            <button
                type="button"
                data-testid="army-hq-operation-brigade-inspect"
                data-formation-id={brig.id}
                data-corps-id={corpsId}
                aria-label={t('operationsSection.inspectFormationOnField', { formation: brigadeName })}
                onClick={() => inspectOnField(useGameStore.getState(), {
                    kind: 'field-formation-in-corps',
                    formationId: brig.id,
                    corpsId,
                    osid: brig.location_osid ?? null,
                })}
                className="shrink-0 rounded border border-panel-border/60 bg-black/20 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-400/75 transition-colors hover:border-amber-400/40 hover:text-amber-300"
            >
                {t('operationsSection.inspect')}
            </button>
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
            <div className="text-xs font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{label}</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono tabular-nums">
                <div>
                    <span className="text-text-secondary/60 uppercase">{t('operationsSection.suffered')} </span>
                    <span className="text-red-500 font-bold">{totalSuffered.toLocaleString()}</span>
                    <span className="text-text-secondary/40 ml-1">({t('operationsSection.casualtyBreakdown', { killed: suffered.killed, wounded: suffered.wounded })})</span>
                </div>
                <div>
                    <span className="text-text-secondary/60 uppercase">{t('operationsSection.inflicted')} </span>
                    <span className="text-emerald-400 font-bold">{totalInflicted.toLocaleString()}</span>
                    <span className="text-text-secondary/40 ml-1">({t('operationsSection.casualtyBreakdown', { killed: inflicted.killed, wounded: inflicted.wounded })})</span>
                </div>
            </div>
            <div className="text-xs font-mono">
                <span className="text-text-secondary/60 uppercase">{t('operationsSection.exchangeRatio')} </span>
                <span className={`font-bold ${ratioColor}`}>
                    {ratio >= 999 ? t('operationsSection.exchangeNoFriendlyLosses') : `${ratio.toFixed(2)} : 1`}
                </span>
            </div>
        </div>
    );
}

/** Compact weekly log timeline for completed operations. */
function WeeklyLogTimeline({ log, resolveObjectiveLabel }: { log: CompletedOp['weekly_log']; resolveObjectiveLabel: (osid: string) => string }) {
    if (!log || log.length === 0) return null;
    return (
        <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.weeklyLog', { count: log.length })}</div>
            <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-panel-border">
                {log.map((entry, i) => {
                    const cas = entry.casualties_suffered.killed + entry.casualties_suffered.wounded;
                    const inf = entry.casualties_inflicted.killed + entry.casualties_inflicted.wounded;
                    const hasCaptures = entry.objectives_captured_this_turn.length > 0;
                    const hasEvents = entry.notable_events.length > 0;
                    const heldObjectiveNames = entry.objectives_captured_this_turn.map(resolveObjectiveLabel);
                    return (
                        <div key={i} className={`flex items-start gap-2 px-2 py-0.5 text-xs font-mono tabular-nums ${hasCaptures ? 'bg-emerald-500/5 border-l-2 border-emerald-400/40' : 'border-l-2 border-panel-border/20'}`}>
                            <span className="text-text-secondary/60 w-16 shrink-0">{turnToDateString(entry.turn).split(' ').slice(1, 3).join(' ')}</span>
                            <span className="text-text-secondary/40 w-24 shrink-0 uppercase">{formatWeeklyPhaseLabel(entry.phase)}</span>
                            {entry.attacks_this_turn > 0 && (
                                <span className="text-red-500/80">{formatWeeklyAttackCount(entry.attacks_this_turn)}</span>
                            )}
                            {cas > 0 && <span className="text-red-500/60">{formatWeeklyCasualties(cas)}</span>}
                            {inf > 0 && <span className="text-emerald-400/60">{formatWeeklyInflicted(inf)}</span>}
                            {hasCaptures && (
                                <span className="text-emerald-400 font-bold">
                                    {formatWeeklyHeldObjectives(heldObjectiveNames)}
                                </span>
                            )}
                            {hasEvents && (
                                <span className="text-accent-gold/70 truncate flex-1">
                                    {formatWeeklyNotableEvent(entry.notable_events[0])}
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

    const commanderDisplay = useMemo(() => {
        return resolveOperationCommander(op.commander_officer_id, gameState.namedOfficerData);
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
    const completedAarGrade = getRecordedAarGrade(completedAAR);

    return (
        <div className="px-4 py-3 space-y-4 text-xs border-t border-panel-border/50 bg-panel-card font-mono">
            {/* Commander personality card */}
            {commanderDisplay.kind === 'assigned' ? (
                <div className="flex items-start gap-4 px-3 py-2.5 border border-panel-border/50 bg-panel-bg rounded-md">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary/60 uppercase">{t('operationsSection.operationCommander')}</span>
                            <span className="text-[12px] font-bold text-text-primary uppercase tracking-wider">{commanderDisplay.officer.name}</span>
                            <span className="text-xs text-text-secondary/40 uppercase">{formatOfficerRank(commanderDisplay.officer.rank)}</span>
                        </div>
                        <div className="text-xs text-accent-gold/80 uppercase tracking-wider font-bold">
                            {getCommanderPersonality(commanderDisplay.officer)}
                        </div>
                        <div className="flex gap-4 text-xs text-text-secondary/50 uppercase tabular-nums">
                            <span>{t('operationsSection.comp')} <b className="text-text-secondary">{formatOfficerRating(commanderDisplay.officer.competence)}</b></span>
                            <span>{t('operationsSection.aggr')} <b className="text-text-secondary">{formatOfficerRating(commanderDisplay.officer.aggressiveness)}</b></span>
                            <span>{t('operationsSection.def')} <b className="text-text-secondary">{formatOfficerRating(commanderDisplay.officer.defensive_skill)}</b></span>
                            {commanderDisplay.officer.operations_commanded != null && commanderDisplay.officer.operations_commanded > 0 && (
                                <span>{t('operationsSection.opsShort')} <b className="text-text-secondary">{commanderDisplay.officer.operations_commanded}</b></span>
                            )}
                            {commanderDisplay.officer.battles > 0 && (
                                <span>{t('operationsSection.battles')} <b className="text-text-secondary">{commanderDisplay.officer.battles}</b> ({t('operationsSection.winsShort', { count: commanderDisplay.officer.victories })})</span>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="px-3 py-2.5 border border-panel-border/50 bg-panel-bg rounded-md">
                    <div className="text-xs text-text-secondary/60 uppercase">{t('operationsSection.operationCommander')}</div>
                    <div className="mt-1 text-xs text-text-secondary italic">{commanderDisplay.label}</div>
                </div>
            )}

            {/* Preparation details (planning phase) */}
            {op.phase === 'planning' && op.preparation_sub_phase && (
                <div className="space-y-3">
                            <div className="text-xs font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.missionPrepStatus')}</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary/60 uppercase">{t('operationsSection.phase')}</span>
                            <span className="font-bold text-accent-gold">{PREP_LABEL_KEYS[op.preparation_sub_phase] ? t(PREP_LABEL_KEYS[op.preparation_sub_phase]) : t('operationsSection.prep.unreported')}</span>
                        </div>
                        {op.preparation_turns_elapsed != null && (
                            <div className="flex items-center gap-2">
                                <span className="text-text-secondary/60 uppercase">{t('operationsSection.timeline')}</span>
                                <span className="text-text-secondary">
                                    {op.preparation_max_turns != null
                                        ? t('operationsSection.prepTimelineWithMax', { elapsed: op.preparation_turns_elapsed, max: op.preparation_max_turns })
                                        : t('operationsSection.prepTimelineOpen', { elapsed: op.preparation_turns_elapsed })}
                                </span>
                            </div>
                        )}
                        {op.has_active_probe && <span className="text-red-500 font-bold border border-red-500/30 bg-red-500/5 px-1.5 animate-pulse text-xs">{t('operationsSection.probeActive')}</span>}
                    </div>

                    {op.commander_assessment && (
                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary/60 uppercase">{t('operationsSection.assessment')}</span>
                            <span className={`font-bold px-2 py-0.5 border ${op.commander_assessment === 'launch' ? 'text-emerald-400 border-panel-border' :
                                    op.commander_assessment === 'abort' ? 'text-red-500 border-red-500/30' : 'text-amber-500 border-amber-500/30'
                                }`}>{COMMANDER_ASSESSMENT_LABELS[op.commander_assessment] ?? t('operationsSection.assessmentUnreported')}</span>
                            {op.postponement_count != null && op.postponement_count > 0 && (
                                <span className="text-red-500/70 ml-2">{t('operationsSection.postponementCount', { count: op.postponement_count })}</span>
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
                            <span className="text-xs text-text-secondary/70 uppercase">{forceBalance.summary}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Objectives */}
            {objectives.length > 0 && (
                <div className="space-y-2">
                        <div className="text-xs font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.strategicObjectiveListing', { count: objectives.length })}</div>
                    {op.current_objective_index == null && (
                        <div className="px-2 text-xs italic text-text-secondary/60">{t('operationsSection.objectiveProgressUnreported')}</div>
                    )}
                    <div className="grid gap-1">
                        {objectives.map((obj, i) => {
                            const isCurrent = op.current_objective_index != null && i === op.current_objective_index;
                            const isComplete = op.current_objective_index != null && i < op.current_objective_index;
                            return (
                                <div key={i} className={`flex items-center gap-3 px-2 py-1 ${isCurrent ? 'bg-panel-bg border-l-2 border-amber-400' : ''}`}>
                                    <span className={`w-4 text-center ${isCurrent ? 'text-amber-400 font-bold' : isComplete ? 'text-text-secondary/60' : 'text-white/10'}`}>
                                        {isCurrent ? '>>' : isComplete ? '[#]' : '[ ]'}
                                    </span>
                                    <span className={`uppercase ${isCurrent ? 'text-amber-400 font-bold' : isComplete ? 'text-text-secondary/60 line-through' : 'text-text-secondary'}`}>
                                        {resolveObjectiveLabel(obj)}
                                    </span>
                                    {isCurrent && <span className="ml-auto text-xs text-amber-400 font-bold tracking-tighter animate-pulse">{t('operationsSection.primaryObj')}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Axes detail (execution phase) */}
            {axes.length > 0 && (
                <div className="space-y-3">
                    <div className="text-xs font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.axisOfAdvanceStatus', { count: axes.length })}</div>
                    <div className="grid gap-2">
                        {axes.map((axis) => (
                            <div key={axis.axis_id} className="px-3 py-2 border border-panel-border/50 bg-panel-card rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-text-primary uppercase tracking-wider">{safeFallbackLabel(axis.name, t('operationsSection.axisUnreported'))}</span>
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 border border-current bg-current/5 ${axis.status ? AXIS_STATUS_COLOR[axis.status] : 'text-text-secondary/60'}`}>
                                        {axis.status ? AXIS_STATUS_LABELS[axis.status] : t('operationsSection.statusUnreported')}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-text-secondary text-xs uppercase">
                                    <span className="flex items-center gap-2"><b className="text-text-secondary">{axis.assigned_brigades.length}</b> {t('operationsSection.unitsDeployed')}</span>
                                    <span className="flex items-center gap-2">
                                        {t('operationsSection.objShort')} <b className="text-text-secondary">{axis.current_objective_index != null ? `${axis.current_objective_index + 1} / ${axis.objectives.length}` : t('operationsSection.metricUnreported')}</b>
                                    </span>
                                    <span className={`flex items-center gap-2 ${axis.momentum == null ? 'text-text-secondary/60 italic' : axis.momentum >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                        {t('operationsSection.momShort')} <b className="text-current font-bold">{axis.momentum != null ? `${axis.momentum > 0 ? '+' : ''}${axis.momentum.toFixed(1)}` : t('operationsSection.metricUnreported')}</b>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Participating brigades — enhanced with per-brigade status grid */}
            {brigadeIds.length > 0 && (
                <div className="space-y-2">
                    <div className="text-xs font-bold uppercase text-text-secondary/60 tracking-widest border-b border-panel-border/30 pb-1">{t('operationsSection.operationalOrbat', { count: brigadeIds.length })}</div>
                    {/* Column headers */}
                    <div className="flex items-center gap-2 px-2 text-xs text-text-secondary/40 uppercase tracking-widest font-bold border-l-2 border-transparent">
                        <span className="flex-1 min-w-0">{t('operationsSection.unit')}</span>
                        <span className="w-20 text-right">{t('operationsSection.persShort')}</span>
                        <span className="w-16 text-right">{t('operationsSection.cohShort')}</span>
                        <span className="w-14 text-right">{t('operationsSection.morShort')}</span>
                        <span className="w-20 text-center">{t('operationsSection.stsShort')}</span>
                        <span className="w-10 text-right">{t('operationsSection.inspect')}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-panel-border space-y-0">
                        {brigadeIds.map((id) => {
                            const brig = formationMap.get(id);
                            if (!brig) return null;
                            return <BrigadeStatusRow key={id} brig={brig} corpsId={op.corps_id} />;
                        })}
                    </div>
                </div>
            )}
            {(op.stale_participating_brigade_count ?? 0) > 0 && (
                <div className="text-xs text-amber-300/80 italic">
                    {t(
                        op.stale_participating_brigade_count === 1
                            ? 'operationsSection.staleParticipant.one'
                            : 'operationsSection.staleParticipant.many',
                        { count: op.stale_participating_brigade_count ?? 0 },
                    )}
                </div>
            )}

            {/* Execution stats */}
            {op.phase === 'execution' && (
                <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-panel-border/50 pt-4 text-text-secondary/60 text-xs uppercase tracking-widest">
                    {op.failure_count != null && op.failure_count > 0 && (
                        <div className="flex items-center gap-2">{t('operationsSection.fatigue')} <span className="text-red-500 font-bold">{op.failure_count} / 5</span></div>
                    )}
                    {op.consecutive_failures_on_current != null && op.consecutive_failures_on_current > 0 && (
                        <div className="flex items-center gap-2">{t('operationsSection.stalling')} <span className="text-red-500 font-bold">{op.consecutive_failures_on_current} / 3</span></div>
                    )}
                    {op.phase_started_turn != null && (
                        <div className="flex items-center gap-2">{t('operationsSection.deployedSince')} <span className="text-text-primary font-bold">{turnToDateString(op.phase_started_turn)}</span></div>
                    )}
                </div>
            )}

            {/* Recovery info */}
            {op.phase === 'recovery' && op.recovery_reason && (
                <div className="text-blue-400 font-bold italic tracking-widest uppercase border border-blue-400/20 bg-blue-400/5 p-3">
                    {t('operationsSection.recoveryModeReason', { reason: RECOVERY_REASON_LABELS[op.recovery_reason] ?? t('operationsSection.recoveryUnreported') })}
                </div>
            )}

            {/* Completed AAR: Grade + Casualty Summary + Weekly Log */}
            {completedAAR && (
                <div className="space-y-4 border-t border-panel-border/50 pt-4">
                    {/* Grade banner */}
                    <div className="flex items-center justify-between px-3 py-2.5 border border-panel-border/50 bg-panel-bg rounded-md">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-bold uppercase text-text-secondary/60 tracking-widest">{t('operationsSection.afterActionAssessment')}</div>
                            <div className="flex items-center gap-3">
                                {completedAarGrade ? (
                                    <StarRating stars={completedAarGrade.stars} verdict={completedAarGrade.verdict} />
                                ) : (
                                    <span className="text-xs text-text-secondary font-mono uppercase">{t('operationHistory.gradeUnreported')}</span>
                                )}
                                <span className={`text-xs font-bold uppercase px-2 py-0.5 border ${OUTCOME_COLOR[completedAAR.outcome] ?? 'text-text-secondary'} border-current/30 bg-current/5`}>
                                    {OUTCOME_LABEL_KEY[completedAAR.outcome] ? t(OUTCOME_LABEL_KEY[completedAAR.outcome]) : t('operationsSection.outcome.unreported')}
                                </span>
                            </div>
                        </div>
                        <div className="text-right text-xs text-text-secondary/50 font-mono tabular-nums">
                            <div>{turnToDateString(completedAAR.started_turn)} - {turnToDateString(completedAAR.ended_turn)}</div>
                            <div>{t('operationsSection.aarDurationAttacks', { duration: completedAAR.duration_turns, attacks: completedAAR.total_attacks })}</div>
                            <div>{t('operationsSection.aarObjectivesTaken', { captured: completedAAR.objectives_captured.length, targeted: completedAAR.objectives_targeted.length })}</div>
                        </div>
                    </div>

                    {/* Grade factors */}
                    {completedAarGrade && Object.keys(completedAarGrade.factors).length > 0 && (
                        <div className="flex flex-wrap gap-2 px-1">
                            {Object.entries(completedAarGrade.factors).map(([key, val]) => (
                                <span key={key} className="text-xs text-text-secondary/40 font-mono uppercase border border-panel-border/30 px-1.5 py-0.5 rounded">
                                    {GRADE_FACTOR_LABELS[key] ?? t('operationsSection.factor.other')}: <span className="text-text-secondary tabular-nums">{typeof val === 'number' ? val.toFixed(0) : String(val)}</span>
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
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono tabular-nums text-text-secondary/50 uppercase">
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

export function OperationsSection({ corpsId, operations, gameState, commandStrain, commandStrainLabel, defaultOpen = false }: OperationsSectionProps) {
    const hasReportedCommandStrain = isReportedNumber(commandStrain);
    const normalizedCommandStrainLabel = hasReportedCommandStrain
        ? normalizeCommandStrainLabel(commandStrain, commandStrainLabel)
        : 'healthy';
    const [expandedOp, setExpandedOp] = useState<string | null>(null);
    const setOperationBriefingContext = useGameStore((s) => s.setOperationBriefingContext);

    // FULL DECISION-ROOM CONVERGENCE: the request-op / force-launch / stand-down levers
    // are issued ONLY from the Presidential Decision Room (DirectiveCard); this Army-HQ
    // section is scan/deep-drill only — it lists operations, their ORBAT/AAR detail, and
    // the read-only "Review Command Decision" inspection. No lever-issuing affordances live
    // here anymore.

    return (
        <CollapsibleSection sectionKey={`ops-${corpsId}`} title={t('operationsSection.title')} count={operations.length} defaultOpen={defaultOpen}>
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
                    {hasReportedCommandStrain && commandStrain > 0 && (
                        <p className={`text-xs font-mono italic ${
                            normalizedCommandStrainLabel === 'compromised' ? 'text-red-400/70' : 'text-amber-400/70'
                        }`}>
                            {t('operationsSection.commandStrainNotice')}
                        </p>
                    )}
                    {operations.map((op) => {
                        const opKey = `${op.corps_id}|${op.name}`;
                        const badge = PHASE_BADGE[op.phase] ?? PHASE_BADGE.planning;
                        const momentum = op.momentum;
                        const commander = resolveOperationCommander(op.commander_officer_id, gameState.namedOfficerData);
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
                                            <span className={`text-xs text-text-secondary/60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                                                ▶
                                            </span>
                                            {op.readiness && (
                                                <span className={`inline-block w-2 h-2 rounded-full ${
                                                    readinessValues(op.readiness).length === 0
                                                        ? 'bg-text-secondary/50'
                                                        : Math.min(...readinessValues(op.readiness)) < 0.4
                                                        ? 'bg-red-500'
                                                        : Math.min(...readinessValues(op.readiness)) < 0.7
                                                            ? 'bg-amber-400'
                                                            : 'bg-emerald-400'
                                                }`} title={formatReadinessTitle(op.readiness)} />
                                            )}
                                            <span className="text-[14px] font-bold text-text-primary uppercase font-mono tracking-wider"
                                                style={{ fontFamily: 'IBM Plex Sans Condensed, sans-serif' }}>
                                                {safeOperationDisplayName(op)}
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
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 border leading-none tracking-widest ${badge.bg} ${badge.border} ${badge.text}`}>
                                                {operationPhaseLabel(op)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs tabular-nums font-mono flex flex-wrap gap-x-6 gap-y-1 ml-5 uppercase tracking-tighter">
                                        <span className="text-text-secondary">{t('operationsSection.units')} <b className="text-text-secondary">{op.participating_brigade_count}</b></span>
                                        <span className="text-text-secondary">{t('operationsSection.objectives')} <b className="text-text-secondary">{objectives.length}</b></span>
                                        {op.phase === 'execution' && momentum != null && (
                                            <span className={`flex items-center gap-2 ${momentum >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                {t('operationsSection.momentum')} <b className="font-bold">{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}</b>
                                            </span>
                                        )}
                                        <span className="text-text-secondary/60 border-l border-panel-border/50 pl-4 ml-auto">
                                            {t('operationsSection.commanderShort')} {commander.kind === 'assigned' ? commander.officer.name.toUpperCase() : commander.label}
                                        </span>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="flex flex-col">
                                        <OperationExpandedDetail op={op} gameState={gameState} />
                                        {/* Scan/deep-drill footer: only the read-only "Review Command Decision"
                                            inspection remains. Force-launch + stand-down are issued from the
                                            Presidential Decision Room (DirectiveCard), not from Army HQ. */}
                                        {(op.phase === 'execution' || op.phase === 'recovery') && op.commander_assessment_at_launch != null && (
                                            <div className="flex gap-3 px-5 py-3 bg-panel-bg border-t border-panel-border/50">
                                                <button type="button"
                                                    onClick={(e) => { e.stopPropagation(); setOperationBriefingContext({ corpsId: op.corps_id, operationName: op.name }); }}
                                                    className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 border border-panel-border/40 text-text-secondary/70 hover:bg-panel-bg hover:text-text-secondary transition-all font-mono">
                                                    {t('operationsSection.reviewCommandDecision')}
                                                </button>
                                            </div>
                                        )}
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

/**
 * Operation History Panel — shows completed operation AARs and active ops.
 * Two tabs: Active (in-progress) and History (completed with star grades).
 *
 * Presentation: Command Surface style (player-surface review step 3, 2026-11-12) —
 * opaque cards, mono gold labels, text at 13px or larger, labels in EN and BCS.
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import type { LoadedGameState } from '../data/types';
import {
    filterPlayerFacingFormations,
    resolvePlayerFacingFaction,
} from '../../shared/playerVisibility';
import {
    getPlayerSafeMilitaryFactionName,
    getPlayerSafeOperationName,
    getPlayerSafeOperationPhaseLabel,
} from '../utils/playerSafeText';
import { formatCorpsDisplayName, turnToDateString } from '../utils/formatters';
import { deriveOperationOutcomeCategory, buildOperationTrendSummary } from '../data/command_strain';
import { t, type MessageKey } from '../i18n';
import { projectOperationLifecycle } from '../data/operationLifecycleProjection';
import {
    SurfaceCloseButton,
    SurfaceHeader,
    SURFACE_CHIP,
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SURFACE_TONE,
    type SurfaceTone,
} from './surface/Surface';

// --- Faction tag inks (lightened for the dark surface; same hues as the map) ---
const FACTION_COLOR: Record<string, string> = {
    RS: '#e58a8a',
    RBiH: '#86c890',
    HRHB: '#8bb7e4',
};

const OUTCOME_COLOR: Record<string, string> = {
    success: 'text-emerald-200',
    partial: 'text-amber-200',
    failure: 'text-red-200',
    orphaned: 'text-[#9c917b]',
};

const OUTCOME_LABEL_KEY: Record<string, MessageKey> = {
    success: 'operationHistory.outcome.success',
    partial: 'operationHistory.outcome.partial',
    failure: 'operationHistory.outcome.failure',
    orphaned: 'operationHistory.outcome.orphaned',
};

const RECOVERY_REASON_BADGE: Record<string, { labelKey: MessageKey; tone: SurfaceTone }> = {
    completed: { labelKey: 'operationHistory.recovery.completed', tone: 'good' },
    max_failures: { labelKey: 'operationHistory.recovery.maxFailures', tone: 'danger' },
    orphaned_sector: { labelKey: 'operationHistory.recovery.orphanedSector', tone: 'warn' },
    no_logged_attempt: { labelKey: 'operationHistory.recovery.noLoggedAttempt', tone: 'neutral' },
    manual_termination: { labelKey: 'operationHistory.recovery.manualTermination', tone: 'info' },
    tg_cohesion_exhausted: { labelKey: 'operationHistory.recovery.tgCohesionExhausted', tone: 'danger' },
    tg_max_lifecycle: { labelKey: 'operationHistory.recovery.tgMaxLifecycle', tone: 'warn' },
};

const PHASE_COLOR: Record<string, string> = {
    planning: 'text-sky-200',
    execution: 'text-amber-200',
    recovery: 'text-[#b9ad94]',
};

const WEEKLY_PHASE_LABEL_KEY: Record<string, MessageKey> = {
    planning: 'operationHistory.weekly.phase.planning',
    execution: 'operationHistory.weekly.phase.execution',
    recovery: 'operationHistory.weekly.phase.recovery',
};

const NOTABLE_EVENT_LABEL_KEY: Record<string, MessageKey> = {
    first_blood: 'operationHistory.weekly.notable.firstBlood',
    breakthrough: 'operationHistory.weekly.notable.breakthrough',
    stalled: 'operationHistory.weekly.notable.stalled',
    heavy_losses: 'operationHistory.weekly.notable.heavyLosses',
};

const GRADE_FACTOR_LABEL_KEY: Record<string, MessageKey> = {
    objective_completion: 'operationHistory.gradeFactor.objectiveProgress',
    objective_pct: 'operationHistory.gradeFactor.objectiveProgress',
    exchange_ratio: 'operationHistory.gradeFactor.exchangeRatio',
    attack_tempo: 'operationHistory.gradeFactor.attackTempo',
    tempo: 'operationHistory.gradeFactor.durationEfficiency',
    preservation: 'operationHistory.gradeFactor.preservation',
};

const COMMANDER_ASSESSMENT_LABEL_KEY: Record<string, MessageKey> = {
    launch: 'operationHistory.assessment.launch',
    postpone: 'operationHistory.assessment.postpone',
    abort: 'operationHistory.assessment.abort',
};

const CAPTURE_PROVENANCE_LABEL_KEY: Record<string, MessageKey | null> = {
    no_objectives_held: null,
    logged_capture: null,
    held_without_logged_capture: 'operationHistory.provenanceNotice.heldWithoutLoggedCapture',
    held_without_logged_attack: 'operationHistory.provenanceNotice.heldWithoutLoggedAttack',
    mixed: 'operationHistory.provenanceNotice.mixed',
};

function getOperationDisplayName(
    operationName: string | null | undefined,
    corpsId?: string | null,
    operationDisplayName?: string | null,
): string {
    const displayName = operationDisplayName?.trim();
    if (displayName) return displayName;
    return getPlayerSafeOperationName(operationName, corpsId, t('operationHistory.fallback.operation'));
}

function formatOperationDateRange(startTurn: number, endTurn: number): string {
    const start = turnToDateString(startTurn);
    const end = turnToDateString(endTurn);
    return start === end ? start : `${start} - ${end}`;
}

function formatGradeFactorLabel(key: string): string {
    return t(GRADE_FACTOR_LABEL_KEY[key] ?? 'operationHistory.gradeFactor.fallback');
}

function formatGradeFactorValue(value: unknown): string {
    if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(0);
    if (typeof value === 'string' && value.trim()) return value;
    return t('operationHistory.gradeFactorUnreported');
}

function formatNotableEventLabel(event: string): string {
    return NOTABLE_EVENT_LABEL_KEY[event] ? t(NOTABLE_EVENT_LABEL_KEY[event]) : t('operationHistory.weekly.notableFallback');
}

function formatCommanderAssessmentLabel(assessment: string | null | undefined): string {
    const key = assessment ? COMMANDER_ASSESSMENT_LABEL_KEY[assessment] : undefined;
    return t(key ?? 'operationHistory.assessment.unavailable');
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

function formatWeeklyHeldObjectives(objectives: string[]): string {
    return t('operationHistory.weekly.heldAtClose', { objectives: objectives.join(', ') });
}

const CAPTURE_PROVENANCE_SUMMARY_KEY: Record<string, MessageKey> = {
    no_objectives_held: 'operationHistory.provenanceSummary.noObjectivesHeld',
    logged_capture: 'operationHistory.provenanceSummary.loggedCapture',
    held_without_logged_capture: 'operationHistory.provenanceSummary.finalControl',
    held_without_logged_attack: 'operationHistory.provenanceSummary.finalControlNoAttack',
    mixed: 'operationHistory.provenanceSummary.mixed',
};

// --- Types ---
type CompletedOp = NonNullable<LoadedGameState['operationHistory']>[number];
type ActiveOp = NonNullable<LoadedGameState['activeOperations']>[number];
type Tab = 'active' | 'history';

function getCorpsDisplayName(corpsNameById: Map<string, string>, corpsId: string): string {
    const name = corpsNameById.get(corpsId);
    return name ? formatCorpsDisplayName(name, corpsId, name) : t('operationHistory.fallback.corps');
}

// --- Sub-components ---

/**
 * Three-tier outcome category badge for completed op cards.
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
            <span className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>
                {t('operationHistory.directIntervention')}
            </span>
        );
    }
    // reluctant_compliance
    return (
        <span className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>
            {t('operationHistory.approvedAgainstRecommendation')}
        </span>
    );
}

function FactionTag({ faction }: { faction: string }) {
    return (
        <span
            className="shrink-0 whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[13px] font-semibold"
            style={{ color: FACTION_COLOR[faction] ?? '#aaa', borderColor: `${FACTION_COLOR[faction] ?? '#555'}44` }}
        >
            {getPlayerSafeMilitaryFactionName(faction, t('operationHistory.unknownForce'))}
        </span>
    );
}

function StarRating({ stars, verdict }: { stars: number; verdict: string }) {
    const filled = Math.max(0, Math.min(5, stars));
    return (
        <span className="flex items-center gap-2">
            <span className="text-[17px] tracking-[0.1em] text-[#e0c27a]" aria-hidden="true">
                {'★'.repeat(filled) + '☆'.repeat(5 - filled)}
            </span>
            <span className="text-[15px] text-[#c2b69c]">{verdict}</span>
        </span>
    );
}

function getRecordedGrade(op: CompletedOp): CompletedOp['grade'] | null {
    const grade = (op as { grade?: CompletedOp['grade'] | null }).grade;
    if (!grade || !Number.isFinite(grade.stars) || typeof grade.verdict !== 'string' || !grade.verdict.trim()) {
        return null;
    }
    return grade;
}

function getGradeFactors(grade: CompletedOp['grade'] | null): [string, unknown][] {
    if (!grade?.factors || typeof grade.factors !== 'object') return [];
    return Object.entries(grade.factors);
}

function formatObjectiveChainSummary(captured: number, targeted: number): string {
    if (targeted <= 0) return t('operationHistory.noObjectiveChain');
    return `${captured}/${targeted}`;
}

function isUnsafeRawLabel(value: string | null | undefined): boolean {
    if (!value) return true;
    return /(?:^cmd_|_t\d+\b|[a-z]{2,}_[a-z0-9_]+|[:|])/.test(value);
}

function formatAxisDisplayName(axisName: string | null | undefined, index: number): string {
    const trimmed = axisName?.trim();
    if (!trimmed || isUnsafeRawLabel(trimmed)) return t('operationHistory.axisFallback', { index: index + 1 });
    return trimmed;
}

function CasualtyLine({ label, cas }: { label: string; cas: { killed: number; wounded: number } }) {
    const total = cas.killed + cas.wounded;
    if (total === 0) return null;
    return (
        <div className="text-[15px] tabular-nums text-[#c2b69c]">
            {t('operationHistory.casualtyLine', { label, total: total.toLocaleString(), killed: cas.killed.toLocaleString(), wounded: cas.wounded.toLocaleString() })}
        </div>
    );
}

function ExchangeRatio({ suffered, inflicted }: { suffered: { killed: number; wounded: number }; inflicted: { killed: number; wounded: number } }) {
    const totalSuffered = suffered.killed + suffered.wounded;
    const totalInflicted = inflicted.killed + inflicted.wounded;
    const ratio = totalSuffered > 0 ? (totalInflicted / totalSuffered) : (totalInflicted > 0 ? Infinity : 0);
    const color = ratio >= 2.0 ? 'text-emerald-200' : ratio >= 1.0 ? 'text-amber-200' : 'text-red-200';
    return (
        <span className={`font-mono text-[15px] font-semibold ${color}`}>
            {ratio === Infinity
                ? t('operationHistory.exchangeNoFriendlyLosses')
                : t('operationHistory.exchange', { ratio: ratio.toFixed(2) })}
        </span>
    );
}

function formatOutcome(value: string): string {
    const key = OUTCOME_LABEL_KEY[value];
    const label = key ? t(key) : t('operationHistory.outcomeUnreported');
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function totalCasualties(cas: { killed: number; wounded: number }): number {
    return cas.killed + cas.wounded;
}

function ObjectiveReviewChip({
    label,
    tone,
}: {
    label: string;
    tone: SurfaceTone;
}) {
    return (
        <span className={`inline-flex items-center rounded border px-2.5 py-1 font-mono text-[14px] ${SURFACE_TONE[tone]}`}>
            {label}
        </span>
    );
}

function OperationDeepReview({
    op,
    osidDisplayNames,
}: {
    op: CompletedOp;
    osidDisplayNames: Record<string, string> | null;
}) {
    const captured = new Set(op.objectives_captured);
    const loggedCaptured = op.objectives_logged_captured
        ? new Set(op.objectives_logged_captured)
        : new Set(op.objectives_captured);
    const suffered = totalCasualties(op.casualties_suffered);
    const inflicted = totalCasualties(op.casualties_inflicted);
    const provenance = t(CAPTURE_PROVENANCE_SUMMARY_KEY[op.capture_provenance ?? 'no_objectives_held'] ?? 'operationHistory.provenanceSummary.fallback');
    const grade = getRecordedGrade(op);

    return (
        <div className="flex flex-col gap-3 rounded-md border border-[#2a303c] bg-[#12161e] px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={SURFACE_LABEL}>{t('operationHistory.deepReview')}</span>
                <span className="text-[15px] tabular-nums text-[#c2b69c]">
                    {op.objectives_targeted.length > 0
                        ? t('operationHistory.objectivesHeldCount', { captured: op.objectives_captured.length, targeted: op.objectives_targeted.length })
                        : t('operationHistory.noObjectiveChain')}
                </span>
            </div>
            <div className="grid gap-x-6 gap-y-1.5 text-[15px] text-[#ddd1b3] sm:grid-cols-2">
                <span>{t('operationHistory.result', { outcome: formatOutcome(op.outcome) })}</span>
                <span>{t('operationHistory.attacks', { count: op.total_attacks.toLocaleString() })}</span>
                <span>{t('operationHistory.casualties', { suffered: suffered.toLocaleString(), inflicted: inflicted.toLocaleString() })}</span>
                <span>{grade ? t('operationHistory.grade', { stars: grade.stars, verdict: grade.verdict }) : t('operationHistory.gradeUnreported')}</span>
                <span className="sm:col-span-2">{t('operationHistory.provenance', { provenance })}</span>
            </div>
            {op.objectives_targeted.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {op.objectives_targeted.map((osid) => {
                        const name = getOsidDisplayName(osid, osidDisplayNames);
                        if (loggedCaptured.has(osid)) {
                            return <ObjectiveReviewChip key={osid} label={t('operationHistory.capturedObjective', { name })} tone="good" />;
                        }
                        if (captured.has(osid)) {
                            return <ObjectiveReviewChip key={osid} label={t('operationHistory.heldAtEndObjective', { name })} tone="warn" />;
                        }
                        return <ObjectiveReviewChip key={osid} label={t('operationHistory.notHeldObjective', { name })} tone="danger" />;
                    })}
                </div>
            )}
        </div>
    );
}

// --- Completed operation card ---

function CompletedOpCard({
    op,
    corpsName,
    osidDisplayNames,
    focused,
}: {
    op: CompletedOp;
    corpsName: string;
    osidDisplayNames: Record<string, string> | null;
    focused: boolean;
}) {
    const [expanded, setExpanded] = useState(focused);
    const captured = new Set(op.objectives_captured);
    const objRate = formatObjectiveChainSummary(op.objectives_captured.length, op.objectives_targeted.length);
    const captureProvenanceKey = CAPTURE_PROVENANCE_LABEL_KEY[op.capture_provenance ?? 'no_objectives_held'];
    const captureProvenanceNotice = captureProvenanceKey ? t(captureProvenanceKey) : null;
    const dateRange = formatOperationDateRange(op.started_turn, op.ended_turn);
    const grade = getRecordedGrade(op);
    const gradeFactors = getGradeFactors(grade);
    const recoveryBadge = op.recovery_reason ? RECOVERY_REASON_BADGE[op.recovery_reason] : undefined;

    useEffect(() => {
        if (focused) setExpanded(true);
    }, [focused]);

    return (
        <div
            className={`overflow-hidden rounded-md border bg-[#161a22] ${
                focused ? 'border-[#c9a75c]' : 'border-[#2a303c]'
            }`}
            data-operation-history-id={op.operation_id}
        >
            <button
                type="button"
                aria-current={focused ? 'true' : undefined}
                aria-expanded={expanded}
                className="w-full px-5 py-4 text-left transition-colors hover:bg-[#1b2029]"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <FactionTag faction={op.faction} />
                            <span className="truncate text-[18px] font-semibold text-[#f1e6c8]">{getOperationDisplayName(op.operation_name, op.corps_id, op.operation_display_name)}</span>
                        </div>
                        {op.commander_name && (
                            <div className="text-[15px] text-[#c2b69c]">
                                {t('operationHistory.oic', { commander: `${op.commander_rank ? `${op.commander_rank} ` : ''}${op.commander_name}` })}
                            </div>
                        )}
                        <div className="text-[15px] text-[#b9ad94]">
                            {t('operationHistory.completedMeta', { corps: corpsName, range: dateRange, duration: op.duration_turns, objectives: objRate })}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {grade ? (
                            <StarRating stars={grade.stars} verdict={grade.verdict} />
                        ) : (
                            <span className="text-[15px] text-[#b9ad94]">{t('operationHistory.gradeUnreported')}</span>
                        )}
                        <span className={`font-mono text-[15px] font-semibold ${OUTCOME_COLOR[op.outcome] ?? 'text-[#c2b69c]'}`}>
                            {OUTCOME_LABEL_KEY[op.outcome] ? t(OUTCOME_LABEL_KEY[op.outcome]) : t('operationHistory.outcomeUnreported')}
                        </span>
                        {recoveryBadge && (
                            <span className={`${SURFACE_CHIP} ${SURFACE_TONE[recoveryBadge.tone]}`}>
                                {t(recoveryBadge.labelKey)}
                            </span>
                        )}
                        <OutcomeCategoryBadge
                            assessmentAtLaunch={op.commander_assessment_at_launch}
                            wasForce={op.force_launched ?? false}
                        />
                        {op.force_launched && op.ca_cost_at_launch != null && (
                            <span className="font-mono text-[14px] tabular-nums text-amber-200">{t('operationHistory.caCost', { cost: op.ca_cost_at_launch })}</span>
                        )}
                    </div>
                </div>
            </button>

            {expanded && (
                <div className="flex flex-col gap-4 border-t border-[#262b35] px-5 pb-5 pt-4">
                    <OperationDeepReview op={op} osidDisplayNames={osidDisplayNames} />

                    {/* Casualties */}
                    <div className="flex flex-col gap-1">
                        <CasualtyLine label={t('operationHistory.suffered')} cas={op.casualties_suffered} />
                        <CasualtyLine label={t('operationHistory.inflicted')} cas={op.casualties_inflicted} />
                        <div className="flex gap-3">
                            <ExchangeRatio suffered={op.casualties_suffered} inflicted={op.casualties_inflicted} />
                        </div>
                    </div>

                    {/* Equipment */}
                    {(op.equipment_lost.tanks + op.equipment_lost.artillery > 0 ||
                      op.equipment_destroyed.tanks + op.equipment_destroyed.artillery > 0 ||
                      op.equipment_captured.tanks + op.equipment_captured.artillery > 0) && (
                        <div className="flex flex-col gap-1 text-[15px] text-[#c2b69c]">
                            {(op.equipment_lost.tanks > 0 || op.equipment_lost.artillery > 0) && (
                                <div>{t('operationHistory.equipmentLost', { tanks: op.equipment_lost.tanks, artillery: op.equipment_lost.artillery })}</div>
                            )}
                            {(op.equipment_destroyed.tanks > 0 || op.equipment_destroyed.artillery > 0) && (
                                <div>{t('operationHistory.equipmentDestroyed', { tanks: op.equipment_destroyed.tanks, artillery: op.equipment_destroyed.artillery })}</div>
                            )}
                            {(op.equipment_captured.tanks > 0 || op.equipment_captured.artillery > 0) && (
                                <div className="text-emerald-200">{t('operationHistory.equipmentCaptured', { tanks: op.equipment_captured.tanks, artillery: op.equipment_captured.artillery })}</div>
                            )}
                        </div>
                    )}

                    {/* Grade factors */}
                    {gradeFactors.length > 0 && (
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-[#b9ad94]">
                            {gradeFactors.map(([key, val]) => (
                                <span key={key}>
                                    {formatGradeFactorLabel(key)}: <span className="tabular-nums text-[#f1e6c8]">{formatGradeFactorValue(val)}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Command Record — expanded provenance sentence */}
                    {(op.commander_assessment_at_launch != null || op.force_launched) && (
                        <div className="flex flex-col gap-1 border-t border-[#262b35] pt-3 text-[15px] text-[#c2b69c]">
                            <span className={SURFACE_LABEL_MUTED}>{t('operationHistory.commandRecord')}</span>
                            <span>
                                {t('operationHistory.commanderAssessment')}{' '}
                                <span className="font-semibold text-[#f1e6c8]">{formatCommanderAssessmentLabel(op.commander_assessment_at_launch)}</span>
                                {' — '}
                                {op.force_launched ? (
                                    <>
                                        <span className="font-semibold text-amber-200">{t('operationHistory.directIntervention')}</span>
                                        {op.ca_cost_at_launch != null && (
                                            <span className="text-[#b9ad94]"> {t('operationHistory.caSpent', { cost: op.ca_cost_at_launch })}</span>
                                        )}
                                    </>
                                ) : op.commander_assessment_at_launch === 'postpone' || op.commander_assessment_at_launch === 'abort' ? (
                                    <span className="font-semibold text-amber-200">{t('operationHistory.approvedAgainstRecommendation')}</span>
                                ) : (
                                    <span className="font-semibold text-emerald-200">{t('operationHistory.approved')}</span>
                                )}
                            </span>
                        </div>
                    )}
                    {/* Institutional strain note — only for direct interventions */}
                    {op.force_launched && (
                        <div className="text-[15px] text-amber-100">
                            {t('operationHistory.directInterventionStrainNote')}
                        </div>
                    )}

                    {captureProvenanceNotice && (
                        <div className="flex flex-col gap-1 rounded-md border border-amber-300/40 bg-[#221e14] px-4 py-3 text-[15px] text-amber-100">
                            <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.12em] text-amber-200">{t('operationHistory.aarProvenance')}</span>
                            <span>{captureProvenanceNotice}</span>
                        </div>
                    )}

                    {/* Objectives */}
                    {op.objectives_targeted.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <span className={SURFACE_LABEL_MUTED}>{t('operationHistory.objectivesHeldAtEnd')}</span>
                            <div className="flex flex-col gap-1">
                                {op.objectives_targeted.map(osid => {
                                    const heldAtEnd = op.objectives_captured.includes(osid);
                                    const loggedDuringOperation = op.objectives_logged_captured?.includes(osid) ?? false;
                                    return (
                                        <div key={osid} className="flex items-center gap-2 text-[15px]">
                                            <span aria-hidden="true" className={heldAtEnd ? (loggedDuringOperation ? 'text-emerald-200' : 'text-amber-200') : 'text-red-200'}>
                                                {heldAtEnd ? (loggedDuringOperation ? '✓' : '●') : '✗'}
                                            </span>
                                            <span className="capitalize text-[#f1e6c8]">{getOsidDisplayName(osid, osidDisplayNames)}</span>
                                            {heldAtEnd && !loggedDuringOperation && (
                                                <span className="text-[14px] text-amber-200">{t('operationHistory.heldAtEnd')}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {op.objectives_logged_captured && op.objectives_logged_captured.length > 0 && (
                                <div className="text-[15px] text-[#b9ad94]">
                                    {t('operationHistory.loggedDuringOperation', { objectives: op.objectives_logged_captured.map((osid) => getOsidDisplayName(osid, osidDisplayNames)).join(', ') })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Per-axis breakdown */}
                    {op.axis_summaries && op.axis_summaries.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className={SURFACE_LABEL_MUTED}>{t('operationHistory.axes')}</span>
                            {op.axis_summaries.map((ax, index) => {
                                const axisCaptured = new Set(ax.objectives_captured);
                                return (
                                    <div key={ax.axis_id} className="flex flex-col gap-1 border-l-2 border-[#3a4150] pl-3 text-[15px]">
                                        <div className="font-semibold text-[#f1e6c8]">{formatAxisDisplayName(ax.axis_name, index)}</div>
                                        <div className="text-[#b9ad94]">
                                            {ax.objectives_targeted.length > 0
                                                ? t('operationHistory.axisMeta', { captured: ax.objectives_captured.length, targeted: ax.objectives_targeted.length, attacks: ax.total_attacks })
                                                : t('operationHistory.axisObjectiveChainUnreported', { attacks: ax.total_attacks })}
                                        </div>
                                        {ax.objectives_targeted.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {ax.objectives_targeted.map((osid) => {
                                                    const name = getOsidDisplayName(osid, osidDisplayNames);
                                                    if (axisCaptured.has(osid)) {
                                                        return <ObjectiveReviewChip key={osid} label={t('operationHistory.axisCaptured', { name })} tone="good" />;
                                                    }
                                                    if (captured.has(osid)) {
                                                        return <ObjectiveReviewChip key={osid} label={t('operationHistory.axisHeldElsewhere', { name })} tone="warn" />;
                                                    }
                                                    return <ObjectiveReviewChip key={osid} label={t('operationHistory.axisNotHeld', { name })} tone="danger" />;
                                                })}
                                            </div>
                                        )}
                                        <CasualtyLine label={t('operationHistory.casShort')} cas={ax.casualties_suffered} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Weekly timeline */}
                    {op.weekly_log.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <span className={SURFACE_LABEL_MUTED}>{t('operationHistory.weeklyTimeline')}</span>
                            <div className="flex max-h-56 flex-col gap-1 overflow-auto">
                                {op.weekly_log.map((entry, i) => {
                                    const casualties = entry.casualties_suffered.killed + entry.casualties_suffered.wounded;
                                    const hasCas = casualties > 0;
                                    const hasCaptures = entry.objectives_captured_this_turn.length > 0;
                                    const hasNotable = entry.notable_events.length > 0;
                                    if (!entry.attacks_this_turn && !hasCas && !hasCaptures && !hasNotable) {
                                        return null;
                                    }
                                    const heldObjectiveNames = entry.objectives_captured_this_turn.map(osid => getOsidDisplayName(osid, osidDisplayNames));
                                    return (
                                        <div key={i} className="flex items-start gap-3 text-[15px]">
                                            <span className="w-28 shrink-0 tabular-nums text-[#b9ad94]">{turnToDateString(entry.turn)}</span>
                                            <span className={`min-w-[6rem] shrink-0 ${PHASE_COLOR[entry.phase] ?? 'text-[#b9ad94]'}`}>{formatWeeklyPhaseLabel(entry.phase)}</span>
                                            <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-0.5">
                                                {entry.attacks_this_turn > 0 && (
                                                    <span className="text-[#ddd1b3]">{formatWeeklyAttackCount(entry.attacks_this_turn)}</span>
                                                )}
                                                {hasCaptures && (
                                                    <span className="text-emerald-200">{formatWeeklyHeldObjectives(heldObjectiveNames)}</span>
                                                )}
                                                {hasCas && (
                                                    <span className="text-[#b9ad94]">
                                                        {formatWeeklyCasualties(casualties)}
                                                    </span>
                                                )}
                                                {hasNotable && entry.notable_events.map((evt, j) => (
                                                    <span key={j} className="text-[#e0c27a]">
                                                        {formatNotableEventLabel(evt)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Active operation card ---

function ActiveOpCard({ op, corpsName }: { op: ActiveOp; corpsName: string }) {
    const objRate = formatObjectiveChainSummary(op.objectives_captured, op.objectives_count);
    return (
        <div className="rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <FactionTag faction={op.faction} />
                        <span className="truncate text-[18px] font-semibold text-[#f1e6c8]">{getOperationDisplayName(op.operation_name, op.corps_id, op.operation_display_name)}</span>
                    </div>
                    {op.commander_name && (
                        <div className="text-[15px] text-[#c2b69c]">{t('operationHistory.oic', { commander: op.commander_name })}</div>
                    )}
                    <div className="text-[15px] text-[#b9ad94]">
                        {t('operationHistory.activeMeta', { corps: corpsName, start: turnToDateString(op.started_turn), brigades: op.participating_brigades.length })}
                    </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`font-mono text-[15px] font-semibold ${PHASE_COLOR[op.phase] ?? 'text-[#c2b69c]'}`}>
                        {getPlayerSafeOperationPhaseLabel(op.phase)}
                    </span>
                    <span className="text-[15px] tabular-nums text-[#b9ad94]">
                        {op.objectives_count > 0
                            ? t('operationHistory.activeProgress', { objectives: objRate, attacks: op.attacks })
                            : t('operationHistory.activeProgressNoObjectives', { attacks: op.attacks })}
                    </span>
                </div>
            </div>
        </div>
    );
}

// --- Main panel ---

interface OperationHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    /** When true, renders content only (no modal wrapper/backdrop). */
    embedded?: boolean;
}

export function OperationHistoryPanel({ isOpen, onClose, embedded }: OperationHistoryPanelProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const focusedOperationHistoryId = useGameStore((s) => s.focusedOperationHistoryId);
    const [tab, setTab] = useState<Tab>('active');
    const operationLifecycle = useMemo(() => projectOperationLifecycle(loadedGameState), [loadedGameState]);
    const corpsNameById = useMemo(
        () =>
            new Map(
                filterPlayerFacingFormations(loadedGameState)
                    .filter((f) => f.kind === 'corps' || f.kind === 'army_hq' || f.kind === 'corps_asset')
                    .map((f) => [f.id, f.name]),
            ),
        [loadedGameState?.formations],
    );

    useEffect(() => {
        if (focusedOperationHistoryId) setTab('history');
    }, [focusedOperationHistoryId]);

    if (!isOpen || !loadedGameState) return null;

    const activeRows = operationLifecycle.activeRows;
    const playerFaction = resolvePlayerFacingFaction(loadedGameState) ?? t('operationHistory.playerFaction');
    const sortedHistoryRows = [...operationLifecycle.historyRows].sort((a, b) => (
        b.operation.ended_turn - a.operation.ended_turn || a.rawIndex - b.rawIndex
    ));
    const history = sortedHistoryRows.map((row) => row.operation);

    const tabClass = (value: Tab) =>
        `h-10 rounded-md border px-4 text-[15px] font-semibold transition ${
            tab === value
                ? 'border-[#c9a75c] bg-[#232936] text-[#f1e6c8]'
                : 'border-[#2a303c] bg-[#161a22] text-[#c2b69c] hover:border-[#4a4436] hover:text-[#f1e6c8]'
        }`;

    const body = (
        <div className={embedded ? 'flex flex-col gap-4' : 'flex flex-1 flex-col gap-4 overflow-auto px-7 py-6'}>
            <div className="flex flex-wrap gap-2">
                <button type="button" className={tabClass('active')} aria-pressed={tab === 'active'} onClick={() => setTab('active')}>
                    {t('operationHistory.tab.active')} {activeRows.length > 0 && <span className="ml-1 text-[#b9ad94]">({activeRows.length})</span>}
                </button>
                <button type="button" className={tabClass('history')} aria-pressed={tab === 'history'} onClick={() => setTab('history')}>
                    {t('operationHistory.tab.history')}{' '}
                    {operationLifecycle.counts.archived > 0 && (
                        <span className="ml-1 text-[#b9ad94]">
                            ({operationLifecycle.counts.completed}/{operationLifecycle.counts.archived})
                        </span>
                    )}
                </button>
            </div>
            <div className="flex flex-col gap-3">
                {tab === 'active' && (
                    activeRows.length === 0 ? (
                        <div className="py-8 text-[17px] text-[#c2b69c]">
                            {operationLifecycle.counts.proposed > 0
                                ? t('operationHistory.proposedOnly', { count: operationLifecycle.counts.proposed })
                                : t('operationHistory.noActive')}
                        </div>
                    ) : (
                        activeRows.map((row) => (
                            <ActiveOpCard
                                key={row.id}
                                op={row.operation}
                                corpsName={getCorpsDisplayName(corpsNameById, row.operation.corps_id)}
                            />
                        ))
                    )
                )}
                {tab === 'history' && (
                    <>
                        {sortedHistoryRows.length === 0 && operationLifecycle.excludedHistoryRows.length === 0 && (
                            <div className="py-8 text-[17px] text-[#c2b69c]">
                                {t('operationHistory.noCompleted', { faction: playerFaction })}
                            </div>
                        )}
                        {sortedHistoryRows.length > 0 && (
                            <>
                            {(() => {
                                const trend = buildOperationTrendSummary(history);
                                return trend.trendNotice ? (
                                    <div className="rounded-md border border-amber-300/40 bg-[#221e14] px-4 py-3 text-[15px] text-amber-100">
                                        {t('operationHistory.commandRelationship', { notice: trend.trendNotice })}
                                    </div>
                                ) : null;
                            })()}
                            {sortedHistoryRows.map((row) => (
                                <CompletedOpCard
                                    key={row.id}
                                    op={row.operation}
                                    corpsName={getCorpsDisplayName(corpsNameById, row.operation.corps_id)}
                                    osidDisplayNames={osidDisplayNames}
                                    focused={row.operation.operation_id === focusedOperationHistoryId}
                                />
                            ))}
                            </>
                        )}
                        {operationLifecycle.excludedHistoryRows.length > 0 && (
                            <section className="flex flex-col gap-2 border-t border-[#262b35] pt-3" aria-label={t('operationHistory.exclusions.title')}>
                                <div className="text-[16px] font-semibold text-[#f1e6c8]">
                                    {t('operationHistory.exclusions.summary', {
                                        count: operationLifecycle.excludedHistoryRows.length,
                                        faction: playerFaction,
                                    })}
                                </div>
                                <div className="flex flex-col gap-1">
                                    {operationLifecycle.excludedHistoryRows.map((row) => (
                                        <div
                                            key={row.id}
                                            data-testid="operation-history-exclusion"
                                            data-operation-history-id={row.id}
                                            className="flex items-start justify-between gap-3 border-l-2 border-[#3a4150] px-3 py-1.5 text-[15px]"
                                        >
                                            <span className="text-[#c2b69c]">
                                                {t('operationHistory.exclusions.record', { index: row.rawIndex + 1 })}
                                            </span>
                                            <span className="text-right text-[#b9ad94]">
                                                {row.reason === 'non_player_faction'
                                                    ? t('operationHistory.exclusions.nonPlayerFaction', { faction: row.sourceFaction ?? t('operationHistory.unknownForce') })
                                                    : t('operationHistory.exclusions.invalidRecord')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    if (embedded) return body;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end pointer-events-none">
            {/* A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C: backdrop is now a real <button> for keyboard activation. */}
            <button
                type="button"
                aria-label={t('operationHistory.closePanel')}
                className="absolute inset-0 bg-[#05070a]/70 pointer-events-auto cursor-default"
                onClick={onClose}
            />
            <div className="relative panel-slide-in-right pointer-events-auto mr-4 mt-[4.5rem] flex max-h-[calc(var(--interface-viewport-height,100vh)-6rem)] w-[min(44rem,calc(var(--interface-viewport-width,100vw)-2rem))] flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
                <SurfaceHeader
                    eyebrow={t('operationHistory.title')}
                    title={t('operationHistory.title')}
                    close={<SurfaceCloseButton onClick={onClose} aria-label={t('operationHistory.closePanel')} />}
                />
                {body}
            </div>
        </div>
    );
}

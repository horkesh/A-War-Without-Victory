/**
 * Operation History Panel — shows completed operation AARs and active ops.
 * Two tabs: Active (in-progress) and History (completed with star grades).
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import type { LoadedGameState } from '../data/types';
import {
    filterPlayerFacingActiveOperations,
    filterPlayerFacingFormations,
    filterPlayerFacingOperationHistory,
} from '../../shared/playerVisibility';
import {
    getPlayerSafeMilitaryFactionName,
    getPlayerSafeOperationName,
    getPlayerSafeOperationPhaseLabel,
} from '../utils/playerSafeText';
import { turnToDateString } from '../utils/formatters';
import { deriveOperationOutcomeCategory, buildOperationTrendSummary } from '../data/command_strain';
import { t, type MessageKey } from '../i18n';

// --- Faction styling ---
const FACTION_COLOR: Record<string, string> = {
    RS: '#c04040',
    RBiH: '#4a9a55',
    HRHB: '#4080b8',
};

const OUTCOME_COLOR: Record<string, string> = {
    success: 'text-green-400',
    partial: 'text-amber-400',
    failure: 'text-red-400',
    orphaned: 'text-neutral-500',
};

const OUTCOME_LABEL: Record<string, string> = {
    success: 'Success',
    partial: 'Partial',
    failure: 'Failure',
    orphaned: 'Orphaned',
};

const RECOVERY_REASON_BADGE: Record<string, { label: string; className: string }> = {
    completed: { label: 'COMPLETED', className: 'bg-green-700/60 text-green-200' },
    max_failures: { label: 'FAILED \u2014 MAX FAILURES', className: 'bg-red-700/60 text-red-200' },
    orphaned_sector: { label: 'ENDED \u2014 SECTOR LOST', className: 'bg-amber-700/60 text-amber-200' },
    no_logged_attempt: { label: 'ENDED \u2014 NO CONTACT', className: 'bg-neutral-600/60 text-neutral-300' },
    manual_termination: { label: 'HALTED BY COMMAND', className: 'bg-blue-700/60 text-blue-200' },
};

const PHASE_COLOR: Record<string, string> = {
    planning: 'text-blue-400',
    execution: 'text-amber-400',
    recovery: 'text-neutral-400',
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

const GRADE_FACTOR_LABEL: Record<string, string> = {
    objective_completion: 'Objective progress',
    objective_pct: 'Objective progress',
    exchange_ratio: 'Exchange ratio',
    attack_tempo: 'Attack tempo',
    tempo: 'Tempo',
    preservation: 'Force preservation',
};

const COMMANDER_ASSESSMENT_LABEL: Record<string, string> = {
    launch: 'Recommends launch',
    postpone: 'Urges delay',
    abort: 'Advises abort',
};

const CAPTURE_PROVENANCE_LABEL: Record<string, string | null> = {
    no_objectives_held: null,
    logged_capture: null,
    held_without_logged_capture: 'Objectives were held at finalization but never logged as captured during this operation.',
    held_without_logged_attack: 'Objectives were held at finalization without any logged attacks. This record shows final control, not confirmed combat capture.',
    mixed: 'Some objectives were logged during the operation; others were only held at finalization.',
};

function getOperationDisplayName(
    operationName: string | null | undefined,
    corpsId?: string | null,
    operationDisplayName?: string | null,
): string {
    const displayName = operationDisplayName?.trim();
    if (displayName) return displayName;
    return getPlayerSafeOperationName(operationName, corpsId, 'Operation');
}

function formatOperationDateRange(startTurn: number, endTurn: number): string {
    const start = turnToDateString(startTurn);
    const end = turnToDateString(endTurn);
    return start === end ? start : `${start} - ${end}`;
}

function formatGradeFactorLabel(key: string): string {
    return GRADE_FACTOR_LABEL[key] ?? 'Operational factor';
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
    return assessment ? COMMANDER_ASSESSMENT_LABEL[assessment] ?? 'Recommendation unavailable' : 'Recommendation unavailable';
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

const CAPTURE_PROVENANCE_SUMMARY: Record<string, string> = {
    no_objectives_held: 'no objective held record',
    logged_capture: 'logged capture record',
    held_without_logged_capture: 'final-control record',
    held_without_logged_attack: 'final-control record without logged attack',
    mixed: 'mixed final-control record',
};

// --- Types ---
type CompletedOp = NonNullable<LoadedGameState['operationHistory']>[number];
type ActiveOp = NonNullable<LoadedGameState['activeOperations']>[number];
type Tab = 'active' | 'history';

function getCorpsDisplayName(corpsNameById: Map<string, string>, corpsId: string): string {
    return corpsNameById.get(corpsId) ?? 'Field Command';
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
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/60">
                {t('operationHistory.directIntervention')}
            </span>
        );
    }
    // reluctant_compliance
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-amber-400/5 text-amber-500/80 border border-amber-400/40">
            {t('operationHistory.approvedAgainstRecommendation')}
        </span>
    );
}

function FactionTag({ faction }: { faction: string }) {
    return (
        <span
            className="text-[9px] font-mono px-1 rounded border"
            style={{ color: FACTION_COLOR[faction] ?? '#aaa', borderColor: `${FACTION_COLOR[faction] ?? '#555'}44` }}
        >
            {getPlayerSafeMilitaryFactionName(faction, t('operationHistory.unknownForce'))}
        </span>
    );
}

function StarRating({ stars, verdict }: { stars: number; verdict: string }) {
    const filled = Math.max(0, Math.min(5, stars));
    return (
        <span className="flex items-center gap-1">
            <span className="text-[12px]" style={{ color: '#d4a644' }}>
                {'\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled)}
            </span>
            <span className="text-[9px] text-text-secondary font-mono">{verdict}</span>
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
        <div className="text-[10px] text-text-muted tabular-nums">
            {t('operationHistory.casualtyLine', { label, total: total.toLocaleString(), killed: cas.killed.toLocaleString(), wounded: cas.wounded.toLocaleString() })}
        </div>
    );
}

function ExchangeRatio({ suffered, inflicted }: { suffered: { killed: number; wounded: number }; inflicted: { killed: number; wounded: number } }) {
    const totalSuffered = suffered.killed + suffered.wounded;
    const totalInflicted = inflicted.killed + inflicted.wounded;
    const ratio = totalSuffered > 0 ? (totalInflicted / totalSuffered) : (totalInflicted > 0 ? Infinity : 0);
    const color = ratio >= 2.0 ? 'text-green-400' : ratio >= 1.0 ? 'text-amber-400' : 'text-red-400';
    return (
        <span className={`text-[10px] font-mono ${color}`}>
            {ratio === Infinity
                ? t('operationHistory.exchangeNoFriendlyLosses')
                : t('operationHistory.exchange', { ratio: ratio.toFixed(2) })}
        </span>
    );
}

function formatOutcome(value: string): string {
    const label = OUTCOME_LABEL[value] ?? t('operationHistory.outcomeUnreported');
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function totalCasualties(cas: { killed: number; wounded: number }): number {
    return cas.killed + cas.wounded;
}

function ObjectiveReviewChip({
    label,
    className,
}: {
    label: string;
    className: string;
}) {
    return (
        <span className={`inline-flex items-center rounded border px-2 py-1 text-[10px] font-mono ${className}`}>
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
    const provenance = CAPTURE_PROVENANCE_SUMMARY[op.capture_provenance ?? 'no_objectives_held'] ?? 'AAR record';
    const grade = getRecordedGrade(op);

    return (
        <div className="rounded border border-panel-border/50 bg-panel-bg/60 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-wide text-accent-gold font-semibold">{t('operationHistory.deepReview')}</div>
                <div className="text-[10px] text-text-muted tabular-nums">
                    {op.objectives_targeted.length > 0
                        ? t('operationHistory.objectivesHeldCount', { captured: op.objectives_captured.length, targeted: op.objectives_targeted.length })
                        : t('operationHistory.noObjectiveChain')}
                </div>
            </div>
            <div className="grid gap-1 text-[10px] text-text-secondary sm:grid-cols-2">
                <span>{t('operationHistory.result', { outcome: formatOutcome(op.outcome) })}</span>
                <span>{t('operationHistory.attacks', { count: op.total_attacks.toLocaleString() })}</span>
                <span>{t('operationHistory.casualties', { suffered: suffered.toLocaleString(), inflicted: inflicted.toLocaleString() })}</span>
                <span>{grade ? t('operationHistory.grade', { stars: grade.stars, verdict: grade.verdict }) : t('operationHistory.gradeUnreported')}</span>
                <span className="sm:col-span-2">{t('operationHistory.provenance', { provenance })}</span>
            </div>
            {op.objectives_targeted.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {op.objectives_targeted.map((osid) => {
                        const name = getOsidDisplayName(osid, osidDisplayNames);
                        if (loggedCaptured.has(osid)) {
                            return (
                                <ObjectiveReviewChip
                                    key={osid}
                                    label={t('operationHistory.capturedObjective', { name })}
                                    className="border-green-400/30 bg-green-400/5 text-green-300"
                                />
                            );
                        }
                        if (captured.has(osid)) {
                            return (
                                <ObjectiveReviewChip
                                    key={osid}
                                    label={t('operationHistory.heldAtEndObjective', { name })}
                                    className="border-amber-300/30 bg-amber-300/5 text-amber-200"
                                />
                            );
                        }
                        return (
                            <ObjectiveReviewChip
                                key={osid}
                                label={t('operationHistory.notHeldObjective', { name })}
                                className="border-red-400/30 bg-red-400/5 text-red-300"
                            />
                        );
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
    const captureProvenanceNotice = CAPTURE_PROVENANCE_LABEL[op.capture_provenance ?? 'no_objectives_held'];
    const dateRange = formatOperationDateRange(op.started_turn, op.ended_turn);
    const grade = getRecordedGrade(op);
    const gradeFactors = getGradeFactors(grade);

    useEffect(() => {
        if (focused) setExpanded(true);
    }, [focused]);

    return (
        <div
            className={`border rounded bg-panel-card/50 mb-2 ${
                focused ? 'border-accent-gold/70 shadow-[0_0_0_1px_rgba(212,166,68,0.25)]' : 'border-panel-border/50'
            }`}
            data-operation-history-id={op.operation_id}
        >
            <button
                type="button"
                aria-current={focused ? 'true' : undefined}
                className="w-full text-left px-3 py-2 hover:bg-panel-hover/30 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <FactionTag faction={op.faction} />
                            <span className="text-[11px] text-text-primary font-semibold truncate">{getOperationDisplayName(op.operation_name, op.corps_id, op.operation_display_name)}</span>
                        </div>
                        {op.commander_name && (
                            <div className="text-[9px] text-text-muted">
                                {t('operationHistory.oic', { commander: `${op.commander_rank ? `${op.commander_rank} ` : ''}${op.commander_name}` })}
                            </div>
                        )}
                        <div className="text-[9px] text-text-muted">
                            {t('operationHistory.completedMeta', { corps: corpsName, range: dateRange, duration: op.duration_turns, objectives: objRate })}
                        </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                        {grade ? (
                            <StarRating stars={grade.stars} verdict={grade.verdict} />
                        ) : (
                            <span className="text-[9px] text-text-secondary font-mono uppercase">{t('operationHistory.gradeUnreported')}</span>
                        )}
                        <span className={`text-[10px] font-mono ${OUTCOME_COLOR[op.outcome] ?? 'text-text-secondary'}`}>
                            {OUTCOME_LABEL[op.outcome] ?? t('operationHistory.outcomeUnreported')}
                        </span>
                        {op.recovery_reason && RECOVERY_REASON_BADGE[op.recovery_reason] && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${RECOVERY_REASON_BADGE[op.recovery_reason].className}`}>
                                {RECOVERY_REASON_BADGE[op.recovery_reason].label}
                            </span>
                        )}
                        <OutcomeCategoryBadge
                            assessmentAtLaunch={op.commander_assessment_at_launch}
                            wasForce={op.force_launched ?? false}
                        />
                        {op.force_launched && op.ca_cost_at_launch != null && (
                            <span className="text-[9px] text-amber-300/70 font-mono tabular-nums">{op.ca_cost_at_launch} CA</span>
                        )}
                    </div>
                </div>
            </button>

            {expanded && (
                <div className="px-3 pb-2 pt-1 border-t border-panel-border/30 space-y-1.5">
                    <OperationDeepReview op={op} osidDisplayNames={osidDisplayNames} />

                    {/* Casualties */}
                    <div>
                        <CasualtyLine label={t('operationHistory.suffered')} cas={op.casualties_suffered} />
                        <CasualtyLine label={t('operationHistory.inflicted')} cas={op.casualties_inflicted} />
                        <div className="flex gap-3 mt-0.5">
                            <ExchangeRatio suffered={op.casualties_suffered} inflicted={op.casualties_inflicted} />
                        </div>
                    </div>

                    {/* Equipment */}
                    {(op.equipment_lost.tanks + op.equipment_lost.artillery > 0 ||
                      op.equipment_destroyed.tanks + op.equipment_destroyed.artillery > 0 ||
                      op.equipment_captured.tanks + op.equipment_captured.artillery > 0) && (
                        <div className="text-[10px] text-text-muted space-y-0.5">
                            {(op.equipment_lost.tanks > 0 || op.equipment_lost.artillery > 0) && (
                                <div>{t('operationHistory.equipmentLost', { tanks: op.equipment_lost.tanks, artillery: op.equipment_lost.artillery })}</div>
                            )}
                            {(op.equipment_destroyed.tanks > 0 || op.equipment_destroyed.artillery > 0) && (
                                <div>{t('operationHistory.equipmentDestroyed', { tanks: op.equipment_destroyed.tanks, artillery: op.equipment_destroyed.artillery })}</div>
                            )}
                            {(op.equipment_captured.tanks > 0 || op.equipment_captured.artillery > 0) && (
                                <div className="text-green-400">{t('operationHistory.equipmentCaptured', { tanks: op.equipment_captured.tanks, artillery: op.equipment_captured.artillery })}</div>
                            )}
                        </div>
                    )}

                    {/* Grade factors */}
                    {gradeFactors.length > 0 && (
                        <div className="text-[9px] text-text-muted flex gap-3 flex-wrap">
                            {gradeFactors.map(([key, val]) => (
                                <span key={key}>
                                    {formatGradeFactorLabel(key)}: <span className="text-text-secondary tabular-nums">{formatGradeFactorValue(val)}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Command Record — expanded provenance sentence */}
                    {(op.commander_assessment_at_launch != null || op.force_launched) && (
                        <div className="text-[9px] text-text-muted border-t border-panel-border/30 pt-1.5">
                            <span className="uppercase font-bold text-text-secondary">{t('operationHistory.commandRecord')} </span>
                            {op.force_launched ? (
                                <>
                                    Commander assessment: <span className="font-semibold text-text-primary">{formatCommanderAssessmentLabel(op.commander_assessment_at_launch)}</span>
                                    {' — '}
                                    <span className="text-amber-400 font-bold">{t('operationHistory.directIntervention')}</span>
                                    {op.ca_cost_at_launch != null && (
                                        <span className="text-text-muted"> ({op.ca_cost_at_launch} CA spent)</span>
                                    )}
                                </>
                            ) : op.commander_assessment_at_launch === 'postpone' || op.commander_assessment_at_launch === 'abort' ? (
                                <>
                                    Commander assessment: <span className="font-semibold text-text-primary">{formatCommanderAssessmentLabel(op.commander_assessment_at_launch)}</span>
                                    {' — '}
                                    <span className="text-amber-500/80 font-semibold">{t('operationHistory.approvedAgainstRecommendation')}</span>
                                </>
                            ) : (
                                <>
                                    Commander assessment: <span className="font-semibold text-text-primary">{formatCommanderAssessmentLabel(op.commander_assessment_at_launch)}</span>
                                    {' — '}
                                    <span className="text-green-400 font-semibold">{t('operationHistory.approved')}</span>
                                </>
                            )}
                        </div>
                    )}
                    {/* Institutional strain note — only for direct interventions */}
                    {op.force_launched && (
                        <div className="text-[9px] text-amber-500/80 italic">
                            {t('operationHistory.directInterventionStrainNote')}
                        </div>
                    )}

                    {captureProvenanceNotice && (
                        <div className="text-[9px] text-amber-300/80 border-t border-panel-border/30 pt-1.5">
                            <span className="uppercase font-bold text-amber-300">{t('operationHistory.aarProvenance')} </span>
                            {captureProvenanceNotice}
                        </div>
                    )}

                    {/* Objectives */}
                    {op.objectives_targeted.length > 0 && (
                        <div>
                            <div className="text-[9px] uppercase tracking-wide text-text-secondary mb-0.5">{t('operationHistory.objectivesHeldAtEnd')}</div>
                            <div className="space-y-0.5">
                                {op.objectives_targeted.map(osid => {
                                    const heldAtEnd = op.objectives_captured.includes(osid);
                                    const loggedDuringOperation = op.objectives_logged_captured?.includes(osid) ?? false;
                                    return (
                                        <div key={osid} className="text-[10px] flex items-center gap-1.5">
                                            <span className={heldAtEnd ? (loggedDuringOperation ? 'text-green-400' : 'text-amber-300') : 'text-red-400'}>
                                                {heldAtEnd ? (loggedDuringOperation ? '\u2713' : '\u25cf') : '\u2717'}
                                            </span>
                                            <span className="text-text-primary capitalize">{getOsidDisplayName(osid, osidDisplayNames)}</span>
                                            {heldAtEnd && !loggedDuringOperation && (
                                                <span className="text-[9px] text-amber-300/80 uppercase tracking-wide">{t('operationHistory.heldAtEnd')}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {op.objectives_logged_captured && op.objectives_logged_captured.length > 0 && (
                                <div className="mt-1 text-[9px] text-text-muted">
                                    {t('operationHistory.loggedDuringOperation', { objectives: op.objectives_logged_captured.map((osid) => getOsidDisplayName(osid, osidDisplayNames)).join(', ') })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Per-axis breakdown */}
                    {op.axis_summaries && op.axis_summaries.length > 0 && (
                        <div>
                            <div className="text-[9px] uppercase tracking-wide text-text-secondary mb-0.5">{t('operationHistory.axes')}</div>
                            {op.axis_summaries.map((ax, index) => {
                                const axisCaptured = new Set(ax.objectives_captured);
                                return (
                                    <div key={ax.axis_id} className="text-[10px] border-l-2 border-panel-border/50 pl-2 mb-1">
                                        <div className="text-text-primary font-semibold">{formatAxisDisplayName(ax.axis_name, index)}</div>
                                        <div className="text-text-muted">
                                            {ax.objectives_targeted.length > 0
                                                ? t('operationHistory.axisMeta', { captured: ax.objectives_captured.length, targeted: ax.objectives_targeted.length, attacks: ax.total_attacks })
                                                : t('operationHistory.axisObjectiveChainUnreported', { attacks: ax.total_attacks })}
                                        </div>
                                        {ax.objectives_targeted.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {ax.objectives_targeted.map((osid) => {
                                                    const name = getOsidDisplayName(osid, osidDisplayNames);
                                                    if (axisCaptured.has(osid)) {
                                                        return (
                                                            <ObjectiveReviewChip
                                                                key={osid}
                                                                label={t('operationHistory.axisCaptured', { name })}
                                                                className="border-green-400/30 bg-green-400/5 text-green-300"
                                                            />
                                                        );
                                                    }
                                                    if (captured.has(osid)) {
                                                        return (
                                                            <ObjectiveReviewChip
                                                                key={osid}
                                                                label={t('operationHistory.axisHeldElsewhere', { name })}
                                                                className="border-amber-300/30 bg-amber-300/5 text-amber-200"
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <ObjectiveReviewChip
                                                            key={osid}
                                                            label={t('operationHistory.axisNotHeld', { name })}
                                                            className="border-red-400/30 bg-red-400/5 text-red-300"
                                                        />
                                                    );
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
                        <div>
                            <div className="text-[9px] uppercase tracking-wide text-text-secondary mb-0.5">{t('operationHistory.weeklyTimeline')}</div>
                            <div className="space-y-0.5 max-h-32 overflow-auto">
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
                                        <div key={i} className="text-[9px] flex items-start gap-2">
                                            <span className="text-text-muted tabular-nums shrink-0 w-20">{turnToDateString(entry.turn)}</span>
                                            <span className={`shrink-0 min-w-[5.5rem] ${PHASE_COLOR[entry.phase] ?? 'text-text-muted'}`}>{formatWeeklyPhaseLabel(entry.phase)}</span>
                                            <div className="flex-1 min-w-0 flex flex-wrap gap-x-2 gap-y-0.5">
                                                {entry.attacks_this_turn > 0 && (
                                                    <span className="text-text-secondary">{formatWeeklyAttackCount(entry.attacks_this_turn)}</span>
                                                )}
                                                {hasCaptures && (
                                                    <span className="text-green-400">{formatWeeklyHeldObjectives(heldObjectiveNames)}</span>
                                                )}
                                                {hasCas && (
                                                    <span className="text-text-muted">
                                                        {formatWeeklyCasualties(casualties)}
                                                    </span>
                                                )}
                                                {hasNotable && entry.notable_events.map((evt, j) => (
                                                    <span key={j} className="text-accent-gold ml-1">
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
        <div className="border border-panel-border/50 rounded bg-panel-card/50 mb-2 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <FactionTag faction={op.faction} />
                        <span className="text-[11px] text-text-primary font-semibold truncate">{getOperationDisplayName(op.operation_name, op.corps_id, op.operation_display_name)}</span>
                    </div>
                    {op.commander_name && (
                        <div className="text-[9px] text-text-muted">{t('operationHistory.oic', { commander: op.commander_name })}</div>
                    )}
                    <div className="text-[9px] text-text-muted">
                        {t('operationHistory.activeMeta', { corps: corpsName, start: turnToDateString(op.started_turn), brigades: op.participating_brigades.length })}
                    </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <span className={`text-[10px] font-mono uppercase ${PHASE_COLOR[op.phase] ?? 'text-text-secondary'}`}>
                        {getPlayerSafeOperationPhaseLabel(op.phase)}
                    </span>
                    <span className="text-[10px] text-text-muted tabular-nums">
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

    const history = filterPlayerFacingOperationHistory(loadedGameState);
    const active = filterPlayerFacingActiveOperations(loadedGameState);
    const sortedHistory = [...history].sort((a, b) => b.ended_turn - a.ended_turn);

    const tabClass = (t: Tab) =>
        `px-3 py-1 text-[10px] uppercase tracking-wide font-semibold transition-colors border-b-2 ${
            tab === t
                ? 'text-accent-gold border-accent-gold'
                : 'text-text-secondary border-transparent hover:text-text-primary'
        }`;

    const body = (
        <div>
            <div className="flex border-b border-panel-border mb-3">
                <button type="button" className={tabClass('active')} onClick={() => setTab('active')}>
                    {t('operationHistory.tab.active')} {active.length > 0 && <span className="ml-1 text-text-muted">({active.length})</span>}
                </button>
                <button type="button" className={tabClass('history')} onClick={() => setTab('history')}>
                    {t('operationHistory.tab.history')} {history.length > 0 && <span className="ml-1 text-text-muted">({history.length})</span>}
                </button>
            </div>
            <div>
                {tab === 'active' && (
                    active.length === 0 ? (
                        <div className="text-text-muted text-center py-8 text-[11px]">{t('operationHistory.noActive')}</div>
                    ) : (
                        active.map((op) => (
                            <ActiveOpCard
                                key={`${op.corps_id}:${op.operation_name}:${op.started_turn}`}
                                op={op}
                                corpsName={getCorpsDisplayName(corpsNameById, op.corps_id)}
                            />
                        ))
                    )
                )}
                {tab === 'history' && (
                    sortedHistory.length === 0 ? (
                        <div className="text-text-muted text-center py-8 text-[11px]">{t('operationHistory.noCompleted')}</div>
                    ) : (
                        <>
                            {(() => {
                                const trend = buildOperationTrendSummary(sortedHistory);
                                return trend.trendNotice ? (
                                    <div className="mb-2 px-2 py-1 rounded bg-amber-500/5 border border-amber-500/20 text-[9px] text-amber-400/80">
                                        {t('operationHistory.commandRelationship', { notice: trend.trendNotice })}
                                    </div>
                                ) : null;
                            })()}
                            {sortedHistory.map((op) => (
                                <CompletedOpCard
                                    key={op.operation_id}
                                    op={op}
                                    corpsName={getCorpsDisplayName(corpsNameById, op.corps_id)}
                                    osidDisplayNames={osidDisplayNames}
                                    focused={op.operation_id === focusedOperationHistoryId}
                                />
                            ))}
                        </>
                    )
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
                className="absolute inset-0 bg-black/40 pointer-events-auto cursor-default"
                onClick={onClose}
            />
            <div className="relative panel-slide-in-right pointer-events-auto w-[24rem] max-h-[calc(100vh-4rem)] mt-12 mr-2 flex flex-col bg-panel-bg/97 backdrop-blur-sm border border-panel-border rounded-lg shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border shrink-0">
                    <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">{t('operationHistory.title')}</span>
                    <button type="button" onClick={onClose} aria-label={t('operationHistory.closePanel')} className="text-text-secondary hover:text-interactive text-sm leading-none">&#x2715;</button>
                </div>
                <div className="p-3 overflow-auto flex-1">{body}</div>
            </div>
        </div>
    );
}

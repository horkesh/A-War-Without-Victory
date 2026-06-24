/**
 * Operation Briefing Modal — triggered when a player's operation reaches the assessment sub-phase.
 * Shows commander's assessment, intel summary, force ratio, supply status, and go/no-go decision buttons.
 */
import { useMemo } from 'react';
import type { NamedOfficerView } from '../data/types';
import { useGameStore } from '../store/gameStore';
import { formatRank, getArchetype, formatPips, getRatingColor } from '../utils/officerCharacter';
import { getPlayerSafeOperationBalancePresentation } from '../../../shared/playerSafeOperationBalance';
import { getPlayerSafeCorpsName, getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { findPlayerFacingOperationByKey } from '../../shared/playerVisibility';
import { OrderInterpretationSection } from './army_hq/OrderInterpretationSection';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { t, type MessageKey } from '../i18n';
import { deriveOperationOutcomeCategory, deriveRecommendationExplanation, deriveDelegationContext } from '../data/command_strain';
import type { CommandCopyToken, RecommendationExplanation, ReadinessTrend, DelegationContext } from '../data/command_strain';
import { FORCE_LAUNCH_COST } from '../utils/commandAuthority';

interface OperationBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Player decision callbacks. */
    onLaunch?: () => void;
    onPostpone?: () => void;
    onAbort?: () => void;
    onOrderProbe?: () => void;
    commandBridgeAvailable?: boolean;
}

function ReadinessBar({ label, value, thresholdLabel }: { label: string; value: number; thresholdLabel?: string }) {
    const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
    const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="mb-2">
            <div className="flex justify-between text-[9px] mb-0.5">
                <span className="uppercase font-bold text-neutral-600">{label}</span>
                <span className="text-neutral-500">{pct}%{thresholdLabel ? ` (${t('operationBriefing.need', { threshold: thresholdLabel })})` : ''}</span>
            </div>
            <div className="h-2 bg-panel-border rounded-sm overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function AssessmentBadge({ assessment }: { assessment?: string }) {
    switch (assessment) {
        case 'launch':
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-green-950/40 text-green-200 border border-green-500/50">{t('operationBriefing.recommendsLaunch')}</span>;
        case 'postpone':
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-950/40 text-amber-200 border border-amber-500/50">{t('operationBriefing.recommendsPostpone')}</span>;
        case 'abort':
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-950/40 text-red-200 border border-red-500/50">{t('operationBriefing.recommendsAbort')}</span>;
        default:
            return <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-panel-card text-text-muted border border-panel-border">{t('operationBriefing.pendingAssessment')}</span>;
    }
}

function finiteCommanderRating(value: number | null | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function resolveBriefingCommander(
    operationCommanderId: string | null | undefined,
    officers: readonly NamedOfficerView[] | null | undefined,
): { kind: 'assigned'; officer: NamedOfficerView } | { kind: 'unassigned' | 'unreported'; label: string } {
    if (!operationCommanderId) return { kind: 'unassigned', label: t('operationBriefing.commanderUnassigned') };
    const officer = officers?.find((candidate) => candidate.id === operationCommanderId);
    if (!officer) return { kind: 'unreported', label: t('operationBriefing.commanderUnreported') };
    return { kind: 'assigned', officer };
}

/**
 * Shown on executing/recovery ops that were force-launched AND lack a commander_assessment_at_launch
 * snapshot (i.e. operations launched before this feature was added). Legacy fallback only.
 */
function ForceLaunchBadge({ caCost }: { caCost: number }) {
    return (
        <div className="mx-4 mt-3 mb-1 px-3 py-1.5 border border-amber-400/40 bg-amber-950/30 flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200">{t('operationBriefing.presidentialOverride')}</span>
            <span className="text-[9px] text-amber-300" style={{ opacity: 0.7 }}>{t('operationBriefing.costCa', { cost: caCost })}</span>
        </div>
    );
}

/** Command Record — canonical four-part presidential decision surface.
 *  Shown on executing/recovery ops when commander_assessment_at_launch is available.
 *  Three outcome tiers: ordinary_compliance / reluctant_compliance / direct_intervention. */
function CommandRecord({ assessmentAtLaunch, wasForce, caCost, corpsStrain, corpsStrainLabel }: {
    assessmentAtLaunch: 'launch' | 'postpone' | 'abort';
    wasForce: boolean;
    caCost: number;
    corpsStrain: number;
    corpsStrainLabel: 'healthy' | 'strained' | 'compromised';
}) {
    const outcomeCategory = deriveOperationOutcomeCategory(assessmentAtLaunch, wasForce);

    return (
        <div className="mx-4 mt-3 mb-1 border border-panel-border bg-panel-card/70">
            <div className="px-3 py-1.5 border-b border-panel-border bg-panel-card">
                <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-600">{t('operationBriefing.commandRecord')}</span>
            </div>
            <div className="px-3 py-2 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 w-36 shrink-0">{t('operationBriefing.commanderRecommended')}</span>
                    <AssessmentBadge assessment={assessmentAtLaunch} />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-bold text-neutral-500 w-36 shrink-0">{t('operationBriefing.presidentialDecision')}</span>
                    {outcomeCategory === 'direct_intervention' ? (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-950/40 text-amber-200 border border-amber-400">
                            {t('operationBriefing.directIntervention')}
                        </span>
                    ) : outcomeCategory === 'reluctant_compliance' ? (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-950/30 text-amber-200 border border-amber-500/50">
                            {t('operationBriefing.approvedAgainstRecommendation')}
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-green-950/40 text-green-200 border border-green-500/50">
                            {t('operationBriefing.ordinaryCompliance')}
                        </span>
                    )}
                </div>
                {/* Reluctant compliance explanation — command chain complied under presidential direction, no CA spent */}
                {outcomeCategory === 'reluctant_compliance' && (
                    <div className="flex items-start gap-2 pt-1 border-t border-panel-border mt-1">
                        <span className="text-[9px] uppercase font-bold text-neutral-500 w-36 shrink-0 mt-0.5">{t('operationBriefing.interpretation')}</span>
                        <p className="text-[10px] text-amber-700 leading-snug">
                            {t('operationBriefing.reluctantComplianceDetail', { assessment: assessmentAtLaunch })}
                        </p>
                    </div>
                )}
                {/* CA cost row — only when force-launched (Direct Intervention). Reluctant compliance does NOT show CA cost: no CA was spent. */}
                {wasForce && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold text-neutral-500 w-36 shrink-0">{t('operationBriefing.commandAuthoritySpent')}</span>
                        <span className="text-[10px] font-mono text-amber-700">{caCost} CA</span>
                    </div>
                )}
                {/* Institutional strain follow-through — only when force-launched AND strain > 0 */}
                {wasForce && corpsStrain > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-panel-border mt-1">
                        <span className="text-[9px] uppercase font-bold text-neutral-500 w-36 shrink-0">{t('operationBriefing.commandStrain')}</span>
                        <span className={`text-[10px] font-mono ${corpsStrainLabel === 'compromised' ? 'text-red-700' : 'text-amber-700'}`}>
                            {t(corpsStrainLabel === 'compromised' ? 'operationBriefing.compromised' : 'operationBriefing.strained')} - {t('operationBriefing.strainDamageDetail')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Delegation Visibility Wave 1: Decision Authority Path — pre-decision
// delegation context for planning-phase operations.
// Canonical owner of pre-decision delegation path explanation.
// Silence = healthy: renders null for normal_delegation (commander recommends
// launch, strain = 0). Only fires when delegation status is non-obvious.
// ═══════════════════════════════════════════════════════════════════════════

const DELEGATION_CONFIG: Record<string, { icon: string; borderClass: string; textClass: string } | null> = {
    normal_delegation: null,     // Silence = healthy
    strained_delegation: { icon: '⚡', borderClass: 'border-amber-300/40', textClass: 'text-amber-700' },
    presidential_direction: { icon: '◆', borderClass: 'border-blue-400/40', textClass: 'text-blue-200' },
};

/** Compact delegation path indicator — one line showing who bears the decision burden.
 *  Silence = healthy: renders null for normal delegation (commander carrying burden, no strain). */
function DelegationPathIndicator({ delegation }: { delegation: DelegationContext | undefined }) {
    if (!delegation || !delegation.label) return null;

    const config = DELEGATION_CONFIG[delegation.path];
    if (!config) return null;

    return (
        <div className={`mx-4 my-1 px-3 py-1.5 border ${config.borderClass} bg-panel-card/60`}>
            <div className="flex items-start gap-2">
                <span className={`shrink-0 text-[10px] mt-px ${config.textClass}`}>{config.icon}</span>
                <span className={`text-[10px] leading-snug ${config.textClass}`}>
                    {delegation.labelToken ? t(delegation.labelToken.key, delegation.labelToken.params) : delegation.label}
                </span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Wave 6: Readiness Trend Indicator — directional signal for the player.
// Shows whether the operation is improving, stagnating, or deteriorating.
// Canonical owner of decision-time readiness trend explanation.
// Silence = healthy: renders null when direction is 'nearing_launch' (first-try launch).
// ═══════════════════════════════════════════════════════════════════════════

const TREND_CONFIG: Record<string, { arrow: string; color: string } | null> = {
    nearing_launch: null,  // Silence = healthy
    improving: { arrow: '↑', color: 'text-green-700' },
    building: { arrow: '→', color: 'text-neutral-500' },
    stagnating: { arrow: '→', color: 'text-amber-700' },
    deteriorating: { arrow: '↓', color: 'text-red-700' },
    not_viable: { arrow: '↓', color: 'text-red-700' },
};

/** Compact readiness trend indicator — one line showing direction + optional timeline. */
function ReadinessTrendIndicator({ trend }: { trend: ReadinessTrend | undefined }) {
    if (!trend || !trend.label) return null;

    const config = TREND_CONFIG[trend.direction];
    if (!config) return null;

    return (
        <div className="mx-4 my-1 px-3 py-1.5 border border-panel-border bg-panel-card/60">
            <div className="flex items-start gap-2">
                <span className={`shrink-0 font-bold text-[11px] mt-px ${config.color}`}>{config.arrow}</span>
                <span className="text-[10px] text-neutral-600 leading-snug">{trend.label}</span>
            </div>
            {trend.timelineLabel && (
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-neutral-400 shrink-0">⏱</span>
                    <span className="text-[9px] text-neutral-500">{trend.timelineLabel}</span>
                    {trend.timelineFraction != null && (
                        <div className="flex-1 h-1 bg-panel-border rounded-sm overflow-hidden max-w-[80px]">
                            <div
                                className={`h-full transition-all ${trend.timelineFraction >= 0.75 ? 'bg-amber-500' : 'bg-neutral-400'}`}
                                style={{ width: `${Math.round(trend.timelineFraction * 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Wave 5: Recommendation Driver — explains WHY the commander recommends
// launch/postpone/abort based on the assessment formula's real inputs.
// Canonical owner of decision-time recommendation explanation.
// Silence = healthy: renders null when assessment is 'launch'.
// ═══════════════════════════════════════════════════════════════════════════

const BLOCKER_ICON: Record<string, string> = {
    intel: '🔍',
    force_ratio: '⚔',
    supply: '📦',
};

/** Compact recommendation explanation for the operation decision surface.
 *  Shows WHY the commander recommends postpone/abort and what the main blocker is. */
function RecommendationDriverSection({ explanation }: {
    explanation: RecommendationExplanation | null;
}) {
    if (!explanation || !explanation.recommendationReason) return null;

    return (
        <div className="mx-4 my-2 px-3 py-2 border border-panel-border bg-panel-card/70">
            <div className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider mb-1">{t('operationBriefing.recommendationDriver')}</div>
            <div className="flex items-start gap-2">
                {explanation.mainBlocker && (
                    <span className="shrink-0 text-[11px] mt-px" aria-hidden="true">
                        {BLOCKER_ICON[explanation.mainBlocker] ?? '•'}
                    </span>
                )}
                <span className="text-[10px] text-neutral-700 leading-snug">{explanation.recommendationReason}</span>
            </div>
            {explanation.wouldImproveIf && (
                <div className="flex items-start gap-1.5 mt-1 pl-0.5">
                    <span className="text-neutral-400 shrink-0 mt-px text-[10px]">&rarr;</span>
                    <span className="text-[9px] text-neutral-500 leading-snug">{explanation.wouldImproveIf}</span>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Wave 4: Operation Constraint Context — compact corps-level constraint summary.
// Canonical owner of operation-time constraint explanation.
// Standing explanation lives on CorpsSituationSection (Army HQ corps card).
// This surface shows the same truth at decision-time, more compact.
// Silence = healthy: renders null when primaryConstraint === 'none'.
// ═══════════════════════════════════════════════════════════════════════════

type PrimaryConstraint = 'siege' | 'threat_pressure' | 'defensive_duty' | 'force_condition' | 'institutional_strain' | 'plan_lifecycle' | 'none';

const CONSTRAINT_BADGE_MODAL: Record<PrimaryConstraint, { labelKey: MessageKey; className: string } | null> = {
    siege: { labelKey: 'corpsSituation.constraint.siege', className: 'bg-red-950/40 text-red-200 border-red-500/50' },
    threat_pressure: { labelKey: 'corpsSituation.constraint.threat', className: 'bg-red-950/40 text-red-200 border-red-500/50' },
    defensive_duty: { labelKey: 'corpsSituation.constraint.garrison', className: 'bg-amber-950/40 text-amber-200 border-amber-500/50' },
    force_condition: { labelKey: 'corpsSituation.constraint.readiness', className: 'bg-amber-950/40 text-amber-200 border-amber-500/50' },
    institutional_strain: { labelKey: 'corpsSituation.constraint.institutional', className: 'bg-blue-950/40 text-blue-200 border-blue-500/50' },
    plan_lifecycle: { labelKey: 'corpsSituation.constraint.planning', className: 'bg-panel-card text-text-muted border-panel-border' },
    none: null,
};

/** Compact corps-level constraint context for the operation decision surface.
 *  Shows WHY the commander is leaning a certain way — the operational constraint
 *  that readiness gauges alone don't explain. */
export function OperationConstraintContext({ assessment }: {
    assessment: {
        dominantReason: string | null;
        dominantReasonToken?: CommandCopyToken | null;
        primaryConstraint: PrimaryConstraint;
        reliefPath: string | null;
        reliefPathToken?: CommandCopyToken | null;
    } | undefined;
}) {
    if (!assessment) return null;
    const { dominantReason, dominantReasonToken, primaryConstraint, reliefPath, reliefPathToken } = assessment;
    if (primaryConstraint === 'none' || !dominantReason) return null;

    const badge = CONSTRAINT_BADGE_MODAL[primaryConstraint];

    return (
        <div className="mx-4 my-2 px-3 py-2 border border-panel-border bg-panel-card/70">
            <div className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider mb-1">{t('operationBriefing.corpsConstraint')}</div>
            <div className="flex items-start gap-2">
                {badge && (
                    <span className={`shrink-0 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 border ${badge.className}`}>
                        {t(badge.labelKey)}
                    </span>
                )}
                <span className="text-[10px] text-neutral-700 leading-snug">
                    {dominantReasonToken ? t(dominantReasonToken.key, dominantReasonToken.params) : dominantReason}
                </span>
            </div>
            {reliefPath && (
                <div className="flex items-start gap-1.5 mt-1 pl-0.5">
                    <span className="text-neutral-400 shrink-0 mt-px text-[10px]">&rarr;</span>
                    <span className="text-[9px] text-neutral-500 leading-snug">
                        {reliefPathToken ? t(reliefPathToken.key, reliefPathToken.params) : reliefPath}
                    </span>
                </div>
            )}
        </div>
    );
}

// FULL DECISION-ROOM CONVERGENCE: the force-launch (Level 3 Direct Intervention) lever
// is issued ONLY from the Presidential Decision Room (DirectiveCard, force_launch
// directive). This modal is a read-only commander-decision review — it shows the
// commander's go/no-go assessment, intel/supply/force context, and the player's
// passive go/no-go callbacks (launch/postpone/abort/probe), but it no longer renders
// a force-launch / override-command-chain affordance. The override lives in the
// Decision Room so presidential command stays single-surface.

export function OperationBriefingModal({ isOpen, onClose, onLaunch, onPostpone, onAbort, onOrderProbe, commandBridgeAvailable = true }: OperationBriefingModalProps) {
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const context = useGameStore((s) => s.operationBriefingContext);

    const { operation, commanderDisplay, corpsStrain, corpsStrainLabel, situationAssessment } = useMemo(() => {
        if (!loadedGameState || !context) return { operation: null, commanderDisplay: null, corpsStrain: 0, corpsStrainLabel: 'healthy' as const, situationAssessment: undefined };
        const op = findPlayerFacingOperationByKey(
            loadedGameState,
            `${context.corpsId}|${context.operationName}`,
        );
        const cdr = op ? resolveBriefingCommander(op.commander_officer_id, loadedGameState.namedOfficerData) : null;
        // Look up command strain + situation assessment from the corps formation (derived on-read by adapter)
        const corpsFormation = loadedGameState.formations?.find(f => f.id === context.corpsId);
        const strain = corpsFormation?.commandStrain ?? 0;
        const strainLabel = corpsFormation?.commandStrainLabel ?? 'healthy';
        const sitAssessment = corpsFormation?.situationAssessment;
        return { operation: op, commanderDisplay: cdr, corpsStrain: strain, corpsStrainLabel: strainLabel, situationAssessment: sitAssessment };
    }, [loadedGameState, context]);

    if (!context || !operation) return null;

    const intelConf = operation.intel_confidence_at_assessment ?? operation.readiness?.intel ?? 0;
    const supplyReady = operation.supply_readiness_at_assessment ?? operation.readiness?.supply ?? 0;
    const forceRatio = operation.force_ratio_estimate;
    const forceBalance = forceRatio != null ? getPlayerSafeOperationBalancePresentation(forceRatio) : null;
    const assessment = operation.commander_assessment;
    const postponements = operation.postponement_count ?? 0;
    const corpsLabel = getPlayerSafeCorpsName(
        operation.corps_name ?? null,
        operation.corps_id,
        'This corps',
    );

    // Delegation Visibility Wave 1: Derive pre-decision delegation context (planning phase only)
    const delegationContext = useMemo(() => {
        if (operation.phase !== 'planning' || !assessment) return undefined;
        return deriveDelegationContext(
            assessment as 'launch' | 'postpone' | 'abort',
            corpsStrain,
        );
    }, [operation.phase, assessment, corpsStrain]);

    // Wave 5: Derive recommendation explanation from assessment snapshot + commander personality
    const recommendationExplanation = useMemo(() => {
        if (!assessment || assessment === 'launch') return null;
        return deriveRecommendationExplanation(
            intelConf,
            supplyReady,
            forceRatio,
            finiteCommanderRating(commanderDisplay?.kind === 'assigned' ? commanderDisplay.officer.aggressiveness : undefined, 3),
            finiteCommanderRating(commanderDisplay?.kind === 'assigned' ? commanderDisplay.officer.competence : undefined, 3),
            assessment as 'launch' | 'postpone' | 'abort',
            postponements,
        );
    }, [intelConf, supplyReady, forceRatio, assessment, postponements, commanderDisplay]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="operation-briefing-title"
            backdropClassName="bg-black/60"
            panelClassName="bg-panel-bg border-2 border-panel-border shadow-xl max-w-lg w-full text-text-primary"
        >
            <>
                {/* Header — operation name + stamp */}
                <div className="px-4 py-3 border-b-2 border-panel-border bg-panel-card/80 relative">
                    <div className={`absolute top-1 right-3 opacity-15 font-black text-2xl -rotate-12 select-none uppercase ${assessment === 'launch' ? 'text-green-700' : assessment === 'abort' ? 'text-red-700' : 'text-amber-700'}`}>
                        {t('operationBriefing.stamp')}
                    </div>
                    <div id="operation-briefing-title" className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">{t('operationBriefing.title')}</div>
                    <div className="text-sm font-bold mt-0.5">{operation.display_name}</div>
                    <div className="text-[10px] text-neutral-500">{corpsLabel} / {getPlayerSafeMilitaryFactionName(operation.faction)}</div>
                </div>

                {/* Command Record — canonical decision surface for executing/recovery ops */}
                {operation.phase !== 'planning' && operation.commander_assessment_at_launch != null ? (
                    <CommandRecord
                        assessmentAtLaunch={operation.commander_assessment_at_launch}
                        wasForce={operation.was_force_launched === true}
                        caCost={FORCE_LAUNCH_COST}
                        corpsStrain={corpsStrain}
                        corpsStrainLabel={corpsStrainLabel}
                    />
                ) : (
                    /* Legacy fallback: force-launched ops without a snapshot (pre-feature) */
                    operation.was_force_launched && operation.phase !== 'planning' && (
                        <ForceLaunchBadge caCost={FORCE_LAUNCH_COST} />
                    )
                )}

                {/* Commander info */}
                {commanderDisplay && (
                    <div className="px-4 py-2 border-b border-panel-border bg-panel-card/60">
                        <div className="text-[9px] uppercase font-bold text-neutral-500 mb-1">{t('operationBriefing.opsCommander')}</div>
                        {commanderDisplay.kind === 'assigned' ? (
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="text-[11px] font-bold">{formatRank(commanderDisplay.officer.rank)} {commanderDisplay.officer.name}</div>
                                    <div className="text-[9px] text-text-muted italic">{getArchetype(commanderDisplay.officer)}</div>
                                </div>
                                <div className="flex gap-2 text-[8px]">
                                    <span className={`font-mono ${getRatingColor(commanderDisplay.officer.competence)}`}>{formatPips(commanderDisplay.officer.competence)}</span>
                                    <span className={`font-mono ${getRatingColor(commanderDisplay.officer.aggressiveness)}`}>{formatPips(commanderDisplay.officer.aggressiveness)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-[11px] italic text-text-secondary">{commanderDisplay.label}</div>
                        )}
                    </div>
                )}

                {/* Readiness gauges */}
                <div className="px-4 py-3 space-y-1">
                    <ReadinessBar label={t('operationBriefing.intelligence')} value={intelConf} />
                    <ReadinessBar label={t('operationBriefing.supply')} value={supplyReady} />
                    {operation.readiness?.cohesion != null && (
                        <ReadinessBar label={t('operationBriefing.forceCohesion')} value={operation.readiness.cohesion} />
                    )}

                    {forceBalance && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-panel-border">
                            <span className="text-[9px] uppercase font-bold text-neutral-600">{t('operationBriefing.forceBalanceEstimate')}</span>
                            <span className={`text-[11px] font-bold ${forceBalance.toneClass}`}>
                                {forceBalance.label}
                            </span>
                            <span className="text-[8px] text-neutral-400 uppercase">
                                ({forceBalance.summary})
                            </span>
                        </div>
                    )}
                </div>

                {/* Assessment badge */}
                <div className="px-4 py-2 border-t border-panel-border flex items-center gap-3">
                    <span className="text-[9px] uppercase font-bold text-neutral-500">{t('operationBriefing.commanderAssessment')}</span>
                    <AssessmentBadge assessment={assessment} />
                    {postponements > 0 && (
                        <span className="text-[8px] text-neutral-400">({t(postponements === 1 ? 'operationBriefing.priorPostponements.one' : 'operationBriefing.priorPostponements.many', { count: postponements })})</span>
                    )}
                </div>

                {/* Delegation Visibility Wave 1: Decision Authority Path — shows who bears the
                    decision burden. Silence = healthy: renders null for normal delegation.
                    Only fires for planning-phase operations. */}
                <DelegationPathIndicator delegation={delegationContext} />

                {/* Wave 6: Readiness Trend — directional signal showing whether conditions
                    are improving, stagnating, or deteriorating since last assessment.
                    Silence = healthy: renders null when first-try launch. */}
                <ReadinessTrendIndicator trend={operation.readinessTrend} />

                {/* Wave 5: Recommendation Driver — shows WHY the commander recommends
                    postpone/abort based on real assessment factors (intel, force ratio, supply).
                    Silence = healthy: renders null when assessment is 'launch'. */}
                <RecommendationDriverSection explanation={recommendationExplanation} />

                {/* Wave 4: Corps Constraint Context — shows WHY the commander leans this way.
                    Derived from the same situationAssessment as CorpsSituationSection (Army HQ).
                    Silence = healthy: renders null when primaryConstraint === 'none'. */}
                <OperationConstraintContext assessment={situationAssessment} />

                {/* Order Interpretation Preview — fires even on clean approvals when strain > 0.
                    Only in planning phase (decision-ready). DirectInterventionSection owns
                    the override-cost display; this section owns pre-decision institutional context. */}
                {operation.phase === 'planning' && (
                    <OrderInterpretationSection
                        strain={corpsStrain}
                        commanderAssessment={assessment as 'launch' | 'postpone' | 'abort' | null | undefined}
                        primaryConstraint={situationAssessment?.primaryConstraint}
                        trendDirection={operation.readinessTrend?.direction}
                        postponementCount={postponements}
                    />
                )}

                {/* Force-launch (Level 3 Direct Intervention) is issued from the Presidential
                    Decision Room (DirectiveCard, force_launch directive), not from this review
                    modal. This surface is read-only commander-decision review. */}

                {/* Action buttons */}
                <div className="px-4 py-3 border-t-2 border-panel-border bg-panel-card/70 flex gap-2 flex-wrap">
                    {!commandBridgeAvailable && (
                        <div className="basis-full text-[10px] text-neutral-500 italic">
                            {t('attention.bridgeUnavailableReadOnly')}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onLaunch}
                        disabled={!commandBridgeAvailable}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-green-600 hover:bg-green-700 text-white border border-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {t('operationBriefing.launchOperation')}
                    </button>
                    <button
                        type="button"
                        onClick={onOrderProbe}
                        disabled={!commandBridgeAvailable}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {t('operationBriefing.orderProbe')}
                    </button>
                    <button
                        type="button"
                        onClick={onPostpone}
                        disabled={!commandBridgeAvailable || postponements >= 2}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-amber-950/50 hover:bg-amber-900/60 text-amber-100 border border-amber-500/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {t('operationBriefing.postpone')}{postponements >= 2 ? ` (${t('operationBriefing.maxReached')})` : ''}
                    </button>
                    <button
                        type="button"
                        onClick={onAbort}
                        disabled={!commandBridgeAvailable}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-red-950/50 hover:bg-red-900/60 text-red-100 border border-red-500/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {t('operationBriefing.abortOperation')}
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="kbd-focus px-3 py-1.5 text-[10px] uppercase font-bold bg-panel-card hover:bg-panel-border text-text-primary border border-panel-border transition-colors"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </>
        </Modal>
    );
}

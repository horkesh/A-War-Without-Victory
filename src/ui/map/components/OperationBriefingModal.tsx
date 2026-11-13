/**
 * Operation Briefing Modal — triggered when a player's operation reaches the assessment sub-phase.
 * Shows commander's assessment, intel summary, force ratio, supply status, and go/no-go decision buttons.
 *
 * Presentation: a medium Command Surface modal (player-surface review step 3, 2026-11-12):
 * the shared `Modal` (focus trap, Esc, Z.CRITICAL_MODAL) with the surface panel, header,
 * scrolling body of sections and a fixed action footer.
 */
import { useMemo, type ReactNode } from 'react';
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
import { deriveOperationOutcomeCategory, deriveRecommendationExplanation, deriveDelegationContext, normalizeCommandStrainLabel } from '../data/command_strain';
import type { CommandCopyToken, RecommendationExplanation, ReadinessTrend, DelegationContext } from '../data/command_strain';
import { FORCE_LAUNCH_COST } from '../utils/commandAuthority';
import {
    SurfaceHeader,
    SurfaceModalBody,
    SurfaceModalFooter,
    SurfacePanel,
    SurfaceSection,
    SurfaceStat,
    SURFACE_CHIP,
    SURFACE_LABEL_MUTED,
    SURFACE_MODAL_BACKDROP,
    SURFACE_MODAL_PANEL_MEDIUM,
    SURFACE_PRIMARY_BUTTON_COMPACT,
    SURFACE_SECONDARY_BUTTON,
    SURFACE_TONE,
} from './surface/Surface';

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

/** A plain-language note block (delegation, trend, recommendation, constraint). */
function BriefingNote({ label, tone = 'neutral', children }: { label?: string; tone?: 'neutral' | 'warn' | 'danger' | 'info'; children: ReactNode }) {
    const toneClass = tone === 'danger'
        ? 'border-red-400/45 bg-red-950/30'
        : tone === 'warn'
            ? 'border-amber-300/40 bg-[#221e14]'
            : tone === 'info'
                ? 'border-sky-400/40 bg-[#141c26]'
                : 'border-[#2a303c] bg-[#161a22]';
    return (
        <div className={`flex flex-col gap-1.5 rounded-md border px-5 py-3.5 ${toneClass}`}>
            {label && <span className={SURFACE_LABEL_MUTED}>{label}</span>}
            {children}
        </div>
    );
}

function ReadinessBar({ label, value, thresholdLabel }: { label: string; value: number | null | undefined; thresholdLabel?: string }) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return (
            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-4 text-[16px]">
                    <span className="text-[#b9ad94]">{label}</span>
                    <span className="text-[#9c917b]">{t('operationsSection.metricUnreported')}</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#262b35]" />
            </div>
        );
    }
    const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
    const color = pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-[#c9a75c]' : 'bg-red-400';
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-4 text-[16px]">
                <span className="text-[#b9ad94]">{label}</span>
                <span className="font-mono font-semibold tabular-nums text-[#f1e6c8]">{pct}%{thresholdLabel ? ` (${t('operationBriefing.need', { threshold: thresholdLabel })})` : ''}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#262b35]">
                <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function AssessmentBadge({ assessment }: { assessment?: string }) {
    switch (assessment) {
        case 'launch':
            return <span className={`${SURFACE_CHIP} ${SURFACE_TONE.good}`}>{t('operationBriefing.recommendsLaunch')}</span>;
        case 'postpone':
            return <span className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>{t('operationBriefing.recommendsPostpone')}</span>;
        case 'abort':
            return <span className={`${SURFACE_CHIP} ${SURFACE_TONE.danger}`}>{t('operationBriefing.recommendsAbort')}</span>;
        default:
            return <span className={`${SURFACE_CHIP} ${SURFACE_TONE.neutral}`}>{t('operationBriefing.pendingAssessment')}</span>;
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
        <BriefingNote tone="warn">
            <span className="text-[16px] font-semibold text-amber-100">{t('operationBriefing.presidentialOverride')}</span>
            <span className="text-[15px] text-amber-100/90">{t('operationBriefing.costCa', { cost: caCost })}</span>
        </BriefingNote>
    );
}

/** Command Record — canonical four-part presidential decision surface.
 *  Shown on executing/recovery ops when commander_assessment_at_launch is available.
 *  Three outcome tiers: ordinary_compliance / reluctant_compliance / direct_intervention. */
function CommandRecord({ assessmentAtLaunch, wasForce, caCost, corpsStrain, corpsStrainLabel }: {
    assessmentAtLaunch: 'launch' | 'postpone' | 'abort';
    wasForce: boolean;
    caCost: number;
    corpsStrain: number | undefined;
    corpsStrainLabel: 'healthy' | 'strained' | 'compromised';
}) {
    const outcomeCategory = deriveOperationOutcomeCategory(assessmentAtLaunch, wasForce);

    return (
        <SurfaceSection label={t('operationBriefing.commandRecord')}>
            <SurfacePanel className="flex flex-col gap-1">
                <SurfaceStat label={t('operationBriefing.commanderRecommended')} value={<AssessmentBadge assessment={assessmentAtLaunch} />} />
                <SurfaceStat
                    label={t('operationBriefing.presidentialDecision')}
                    value={outcomeCategory === 'direct_intervention' ? (
                        <span className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>{t('operationBriefing.directIntervention')}</span>
                    ) : outcomeCategory === 'reluctant_compliance' ? (
                        <span className={`${SURFACE_CHIP} ${SURFACE_TONE.warn}`}>{t('operationBriefing.approvedAgainstRecommendation')}</span>
                    ) : (
                        <span className={`${SURFACE_CHIP} ${SURFACE_TONE.good}`}>{t('operationBriefing.ordinaryCompliance')}</span>
                    )}
                />
                {/* Reluctant compliance explanation — command chain complied under presidential direction, no CA spent */}
                {outcomeCategory === 'reluctant_compliance' && (
                    <div className="flex flex-col gap-1 border-b border-[#262b35] py-2">
                        <span className="text-[16px] text-[#b9ad94]">{t('operationBriefing.interpretation')}</span>
                        <p className="m-0 text-[16px] leading-relaxed text-amber-100">
                            {t('operationBriefing.reluctantComplianceDetail', { assessment: assessmentAtLaunch })}
                        </p>
                    </div>
                )}
                {/* CA cost row — only when force-launched (Direct Intervention). Reluctant compliance does NOT show CA cost: no CA was spent. */}
                {wasForce && (
                    <SurfaceStat label={t('operationBriefing.commandAuthoritySpent')} value={caCost} tone="text-amber-100" />
                )}
                {/* Institutional strain follow-through — only when force-launched AND strain > 0 */}
                {wasForce && typeof corpsStrain === 'number' && corpsStrain > 0 && (
                    <div className="flex flex-col gap-1 py-2">
                        <span className="text-[16px] text-[#b9ad94]">{t('operationBriefing.commandStrain')}</span>
                        <span className={`text-[16px] ${corpsStrainLabel === 'compromised' ? 'text-red-200' : 'text-amber-100'}`}>
                            {t(corpsStrainLabel === 'compromised' ? 'operationBriefing.compromised' : 'operationBriefing.strained')}: {t('operationBriefing.strainDamageDetail')}
                        </span>
                    </div>
                )}
            </SurfacePanel>
        </SurfaceSection>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Delegation Visibility Wave 1: Decision Authority Path — pre-decision
// delegation context for planning-phase operations.
// Canonical owner of pre-decision delegation path explanation.
// Silence = healthy: renders null for normal_delegation (commander recommends
// launch, strain = 0). Only fires when delegation status is non-obvious.
// ═══════════════════════════════════════════════════════════════════════════

const DELEGATION_CONFIG: Record<string, { tone: 'warn' | 'info'; textClass: string } | null> = {
    normal_delegation: null,     // Silence = healthy
    strained_delegation: { tone: 'warn', textClass: 'text-amber-100' },
    presidential_direction: { tone: 'info', textClass: 'text-sky-100' },
};

/** Compact delegation path indicator — one line showing who bears the decision burden.
 *  Silence = healthy: renders null for normal delegation (commander carrying burden, no strain). */
function DelegationPathIndicator({ delegation }: { delegation: DelegationContext | undefined }) {
    if (!delegation || !delegation.label) return null;

    const config = DELEGATION_CONFIG[delegation.path];
    if (!config) return null;

    return (
        <BriefingNote tone={config.tone}>
            <span className={`text-[16px] leading-relaxed ${config.textClass}`}>
                {delegation.labelToken ? t(delegation.labelToken.key, delegation.labelToken.params) : delegation.label}
            </span>
        </BriefingNote>
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
    improving: { arrow: '↑', color: 'text-emerald-200' },
    building: { arrow: '→', color: 'text-[#ddd1b3]' },
    stagnating: { arrow: '→', color: 'text-amber-200' },
    deteriorating: { arrow: '↓', color: 'text-red-200' },
    not_viable: { arrow: '↓', color: 'text-red-200' },
};

/** Compact readiness trend indicator — one line showing direction + optional timeline. */
function ReadinessTrendIndicator({ trend }: { trend: ReadinessTrend | undefined }) {
    if (!trend || !trend.label) return null;

    const config = TREND_CONFIG[trend.direction];
    if (!config) return null;

    return (
        <BriefingNote>
            <div className="flex items-start gap-2.5">
                <span aria-hidden="true" className={`shrink-0 text-[17px] font-bold ${config.color}`}>{config.arrow}</span>
                <span className="text-[16px] leading-relaxed text-[#ddd1b3]">{trend.label}</span>
            </div>
            {trend.timelineLabel && (
                <div className="flex items-center gap-3">
                    <span className="text-[15px] text-[#b9ad94]">{trend.timelineLabel}</span>
                    {trend.timelineFraction != null && (
                        <div className="h-1.5 max-w-[8rem] flex-1 overflow-hidden rounded-full bg-[#262b35]">
                            <div
                                className={`h-full transition-all ${trend.timelineFraction >= 0.75 ? 'bg-amber-300' : 'bg-[#8a806c]'}`}
                                style={{ width: `${Math.round(trend.timelineFraction * 100)}%` }}
                            />
                        </div>
                    )}
                </div>
            )}
        </BriefingNote>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Wave 5: Recommendation Driver — explains WHY the commander recommends
// launch/postpone/abort based on the assessment formula's real inputs.
// Canonical owner of decision-time recommendation explanation.
// Silence = healthy: renders null when assessment is 'launch'.
// ═══════════════════════════════════════════════════════════════════════════

/** Compact recommendation explanation for the operation decision surface.
 *  Shows WHY the commander recommends postpone/abort and what the main blocker is. */
function RecommendationDriverSection({ explanation }: {
    explanation: RecommendationExplanation | null;
}) {
    if (!explanation || !explanation.recommendationReason) return null;

    return (
        <BriefingNote label={t('operationBriefing.recommendationDriver')}>
            <p className="m-0 text-[16px] leading-relaxed text-[#ddd1b3]">{explanation.recommendationReason}</p>
            {explanation.wouldImproveIf && (
                <p className="m-0 text-[15px] leading-relaxed text-[#b9ad94]">→ {explanation.wouldImproveIf}</p>
            )}
        </BriefingNote>
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
    siege: { labelKey: 'corpsSituation.constraint.siege', className: SURFACE_TONE.danger },
    threat_pressure: { labelKey: 'corpsSituation.constraint.threat', className: SURFACE_TONE.danger },
    defensive_duty: { labelKey: 'corpsSituation.constraint.garrison', className: SURFACE_TONE.warn },
    force_condition: { labelKey: 'corpsSituation.constraint.readiness', className: SURFACE_TONE.warn },
    institutional_strain: { labelKey: 'corpsSituation.constraint.institutional', className: SURFACE_TONE.info },
    plan_lifecycle: { labelKey: 'corpsSituation.constraint.planning', className: SURFACE_TONE.neutral },
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
        <BriefingNote label={t('operationBriefing.corpsConstraint')}>
            <div className="flex flex-wrap items-start gap-3">
                {badge && (
                    <span className={`${SURFACE_CHIP} ${badge.className}`}>
                        {t(badge.labelKey)}
                    </span>
                )}
                <span className="min-w-0 flex-1 text-[16px] leading-relaxed text-[#ddd1b3]">
                    {dominantReasonToken ? t(dominantReasonToken.key, dominantReasonToken.params) : dominantReason}
                </span>
            </div>
            {reliefPath && (
                <p className="m-0 text-[15px] leading-relaxed text-[#b9ad94]">
                    → {reliefPathToken ? t(reliefPathToken.key, reliefPathToken.params) : reliefPath}
                </p>
            )}
        </BriefingNote>
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
        if (!loadedGameState || !context) return { operation: null, commanderDisplay: null, corpsStrain: undefined, corpsStrainLabel: 'healthy' as const, situationAssessment: undefined };
        const op = findPlayerFacingOperationByKey(
            loadedGameState,
            `${context.corpsId}|${context.operationName}`,
        );
        const cdr = op ? resolveBriefingCommander(op.commander_officer_id, loadedGameState.namedOfficerData) : null;
        // Look up command strain + situation assessment from the corps formation (derived on-read by adapter)
        const corpsFormation = loadedGameState.formations?.find(f => f.id === context.corpsId);
        const strain = typeof corpsFormation?.commandStrain === 'number' && Number.isFinite(corpsFormation.commandStrain)
            ? corpsFormation.commandStrain
            : undefined;
        const strainLabel = strain == null ? 'healthy' : normalizeCommandStrainLabel(strain, corpsFormation?.commandStrainLabel);
        const sitAssessment = corpsFormation?.situationAssessment;
        return { operation: op, commanderDisplay: cdr, corpsStrain: strain, corpsStrainLabel: strainLabel, situationAssessment: sitAssessment };
    }, [loadedGameState, context]);

    if (!context || !operation) return null;

    const reportedIntelConf = operation.intel_confidence_at_assessment ?? operation.readiness?.intel;
    const reportedSupplyReady = operation.supply_readiness_at_assessment ?? operation.readiness?.supply;
    const forceRatio = operation.force_ratio_estimate;
    const forceBalance = forceRatio != null ? getPlayerSafeOperationBalancePresentation(forceRatio) : null;
    const assessment = operation.commander_assessment;
    const postponements = operation.postponement_count ?? 0;
    const isDecisionReady = operation.phase === 'planning';
    const corpsLabel = getPlayerSafeCorpsName(
        operation.corps_name ?? null,
        operation.corps_id,
        t('operationBriefing.corpsFallback'),
    );

    // These two derivations used to be useMemo hooks placed after the early return above.
    // The App wrapper keeps this component mounted while the context is null, so the first
    // open rendered more hooks than the previous render and React threw ("Rendered more
    // hooks"). Plain derivations after the return: same values, no hook-order hazard.

    // Delegation Visibility Wave 1: Derive pre-decision delegation context (planning phase only)
    const delegationContext = (() => {
        if (operation.phase !== 'planning' || !assessment || corpsStrain == null) return undefined;
        return deriveDelegationContext(
            assessment as 'launch' | 'postpone' | 'abort',
            corpsStrain,
        );
    })();

    // Wave 5: Derive recommendation explanation from assessment snapshot + commander personality
    const recommendationExplanation = (() => {
        if (!assessment || assessment === 'launch') return null;
        return deriveRecommendationExplanation(
            reportedIntelConf,
            reportedSupplyReady,
            forceRatio,
            finiteCommanderRating(commanderDisplay?.kind === 'assigned' ? commanderDisplay.officer.aggressiveness : undefined, 3),
            finiteCommanderRating(commanderDisplay?.kind === 'assigned' ? commanderDisplay.officer.competence : undefined, 3),
            assessment as 'launch' | 'postpone' | 'abort',
            postponements,
        );
    })();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="operation-briefing-title"
            backdropClassName={SURFACE_MODAL_BACKDROP}
            panelClassName={SURFACE_MODAL_PANEL_MEDIUM}
        >
            <>
                {/* Header — operation name, corps and force, the commander's call */}
                <SurfaceHeader
                    eyebrow={t('operationBriefing.title')}
                    title={<span id="operation-briefing-title">{operation.display_name}</span>}
                    trailing={<AssessmentBadge assessment={assessment} />}
                >
                    <span className="text-[17px] text-[#c2b69c]">
                        {corpsLabel} · {getPlayerSafeMilitaryFactionName(operation.faction)}
                    </span>
                </SurfaceHeader>

                <SurfaceModalBody className="gap-6">
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
                        <SurfaceSection label={t('operationBriefing.opsCommander')}>
                            {commanderDisplay.kind === 'assigned' ? (
                                <SurfacePanel className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <span className="text-[19px] font-semibold text-[#f1e6c8]">{formatRank(commanderDisplay.officer.rank)} {commanderDisplay.officer.name}</span>
                                        <span className="text-[16px] text-[#c2b69c]">{getArchetype(commanderDisplay.officer)}</span>
                                    </div>
                                    <div className="flex gap-4 font-mono text-[16px]">
                                        <span className={getRatingColor(commanderDisplay.officer.competence)}>{formatPips(commanderDisplay.officer.competence)}</span>
                                        <span className={getRatingColor(commanderDisplay.officer.aggressiveness)}>{formatPips(commanderDisplay.officer.aggressiveness)}</span>
                                    </div>
                                </SurfacePanel>
                            ) : (
                                <p className="m-0 text-[17px] text-[#c2b69c]">{commanderDisplay.label}</p>
                            )}
                        </SurfaceSection>
                    )}

                    {/* Readiness gauges, force balance and the commander's assessment */}
                    <SurfaceSection label={t('operationBriefing.surface.readiness')}>
                        <SurfacePanel className="flex flex-col gap-4">
                            <ReadinessBar label={t('operationBriefing.intelligence')} value={reportedIntelConf} />
                            <ReadinessBar label={t('operationBriefing.supply')} value={reportedSupplyReady} />
                            <ReadinessBar label={t('operationBriefing.forceCohesion')} value={operation.readiness?.cohesion} />
                            <div className="flex flex-col">
                                {forceBalance && (
                                    <SurfaceStat
                                        label={t('operationBriefing.forceBalanceEstimate')}
                                        value={<>{forceBalance.label} <span className="font-sans font-normal text-[#b9ad94]">({forceBalance.summary})</span></>}
                                        tone={forceBalance.toneClass}
                                    />
                                )}
                                <SurfaceStat
                                    label={t('operationBriefing.commanderAssessment')}
                                    value={(
                                        <span className="inline-flex flex-wrap items-center justify-end gap-2">
                                            <AssessmentBadge assessment={assessment} />
                                            {postponements > 0 && (
                                                <span className="font-sans text-[15px] font-normal text-[#b9ad94]">({t(postponements === 1 ? 'operationBriefing.priorPostponements.one' : 'operationBriefing.priorPostponements.many', { count: postponements })})</span>
                                            )}
                                        </span>
                                    )}
                                />
                            </div>
                        </SurfacePanel>
                    </SurfaceSection>

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
                    {operation.phase === 'planning' && corpsStrain != null && (
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
                </SurfaceModalBody>

                {/* Action footer */}
                <SurfaceModalFooter className="justify-between">
                    {!isDecisionReady && (
                        <p className="m-0 basis-full text-[16px] text-[#c2b69c]">
                            {t('operationBriefing.reviewReadOnly')}
                        </p>
                    )}
                    {isDecisionReady && !commandBridgeAvailable && (
                        <p className="m-0 basis-full text-[16px] text-[#c2b69c]">
                            {t('attention.bridgeUnavailableReadOnly')}
                        </p>
                    )}
                    {isDecisionReady && (
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={onLaunch}
                                disabled={!commandBridgeAvailable}
                                className={`kbd-focus ${SURFACE_PRIMARY_BUTTON_COMPACT}`}
                            >
                                {t('operationBriefing.launchOperation')}
                            </button>
                            <button
                                type="button"
                                onClick={onOrderProbe}
                                disabled={!commandBridgeAvailable}
                                className={`kbd-focus ${SURFACE_SECONDARY_BUTTON}`}
                            >
                                {t('operationBriefing.orderProbe')}
                            </button>
                            <button
                                type="button"
                                onClick={onPostpone}
                                disabled={!commandBridgeAvailable || postponements >= 2}
                                className={`kbd-focus ${SURFACE_SECONDARY_BUTTON}`}
                            >
                                {t('operationBriefing.postpone')}{postponements >= 2 ? ` (${t('operationBriefing.maxReached')})` : ''}
                            </button>
                            <button
                                type="button"
                                onClick={onAbort}
                                disabled={!commandBridgeAvailable}
                                className="kbd-focus h-12 rounded-md border border-red-400/60 bg-red-950/50 px-5 text-[16px] font-semibold text-red-100 transition hover:bg-red-900/60 disabled:cursor-default disabled:opacity-45"
                            >
                                {t('operationBriefing.abortOperation')}
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className={`kbd-focus ${SURFACE_SECONDARY_BUTTON}`}
                    >
                        {t('common.close')}
                    </button>
                </SurfaceModalFooter>
            </>
        </Modal>
    );
}

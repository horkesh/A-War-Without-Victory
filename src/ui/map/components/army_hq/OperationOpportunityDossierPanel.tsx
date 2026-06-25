import { useMemo, useState } from 'react';
import type { LoadedGameState, OperationOpportunityAxisState, OperationOpportunityProposalView } from '../../data/types';
import type { BackTheOfficerView } from '../../data/backTheOfficer';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { t, type MessageKey } from '../../i18n';
import { turnToDateString } from '../../utils/formatters';

type OpportunityUiDecision = OperationOpportunityProposalView['available_actions'][number]['id'];
type OpportunityResolveOptions = { redirectVariantId?: string };

interface OperationOpportunityDossierPanelProps {
    gameState: LoadedGameState;
    playerFaction: string;
}

const AXIS_STYLES: Record<OperationOpportunityAxisState, string> = {
    ready: 'border-green-500/30 bg-green-500/10 text-green-300',
    blocked: 'border-red-500/30 bg-red-500/10 text-red-300',
    strained: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    not_applicable: 'border-panel-border bg-panel-bg text-text-secondary',
    unreported: 'border-panel-border bg-panel-bg text-text-secondary',
};

const TRAIT_STYLES: Record<OperationOpportunityProposalView['force_quality_traits'][number]['band'], string> = {
    strong: 'border-green-500/30 bg-green-500/10 text-green-300',
    adequate: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    strained: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    poor: 'border-red-500/30 bg-red-500/10 text-red-300',
};

const OPPORTUNITY_STATUS_KEYS: Partial<Record<OperationOpportunityProposalView['status'], MessageKey>> = {
    eligible_pending_review: 'opportunity.status.pendingReview',
    delayed: 'opportunity.status.delayed',
};

const OPPORTUNITY_RECOMMENDATION_KEYS: Record<string, MessageKey> = {
    approve: 'opportunity.recommendation.approve',
    delay: 'opportunity.recommendation.delay',
    redirect: 'opportunity.recommendation.redirect',
    under_resource: 'opportunity.recommendation.underResource',
    decline: 'opportunity.recommendation.decline',
};

const AXIS_STATE_KEYS: Record<OperationOpportunityAxisState, MessageKey> = {
    ready: 'opportunity.axis.ready',
    blocked: 'opportunity.axis.blocked',
    strained: 'opportunity.axis.strained',
    not_applicable: 'opportunity.axis.notApplicable',
    unreported: 'opportunity.axis.unreported',
};

const TRAIT_BAND_KEYS: Record<OperationOpportunityProposalView['force_quality_traits'][number]['band'], MessageKey> = {
    strong: 'opportunity.trait.strong',
    adequate: 'opportunity.trait.adequate',
    strained: 'opportunity.trait.strained',
    poor: 'opportunity.trait.poor',
};

const OFFICER_RANK_KEYS: Partial<Record<string, MessageKey>> = {
    army_commander: 'officer.rank.armyCommander',
    corps_commander: 'officer.rank.corpsCommander',
    deputy: 'officer.rank.deputy',
    major_general: 'officer.rank.majorGeneral',
};

function knownLabel<T extends string>(value: T, map: Partial<Record<T, MessageKey>>, fallbackKey: MessageKey): string {
    const key = map[value];
    return key ? t(key) : t(fallbackKey);
}

function formatOfficerRank(rank: string | undefined): string {
    if (!rank) return '';
    const key = OFFICER_RANK_KEYS[rank];
    return key ? t(key) : rank.replace(/[_\s]+/g, ' ').trim();
}

function joinNames(items: string[]): string {
    if (items.length <= 1) return items[0] ?? '';
    return `${items.slice(0, -1).join(', ')} ${items[items.length - 1]}`;
}

function formatBackTheOfficerFraming(view: BackTheOfficerView): string {
    const commander = view.commander?.name ?? t('opportunity.backTheOfficer.fieldCommander');
    const identity = view.tg_name ?? view.op_name;
    if (view.donors.length === 0) {
        return t('opportunity.backTheOfficer.framingOwnCorps', { commander, identity });
    }
    const donors = joinNames(view.donors.map((donor) => donor.corps_name));
    if (view.total_personnel_lent > 0) {
        return t('opportunity.backTheOfficer.framingDonorsWithPersonnel', {
            commander,
            identity,
            count: view.total_personnel_lent,
            donors,
        });
    }
    return t('opportunity.backTheOfficer.framingDonors', { commander, identity, donors });
}

function recommendationLabel(recommendation: string): string {
    return knownLabel(recommendation, OPPORTUNITY_RECOMMENDATION_KEYS, 'opportunity.recommendation.review');
}

function opportunityAxisSummary(
    kind: 'required' | 'optional',
    green: number | undefined,
    total: number | undefined,
): string | null {
    if (total == null) return kind === 'required' ? t('opportunity.noRequiredAxes') : null;
    if (green == null) return t(kind === 'required' ? 'opportunity.requiredAxesUnreported' : 'opportunity.optionalAxesUnreported');
    return t(kind === 'required' ? 'opportunity.requiredAxes' : 'opportunity.optionalAxes', { green, total });
}

function actionButtonClass(actionId: OpportunityUiDecision): string {
    if (actionId === 'decline') {
        return 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20';
    }
    if (actionId === 'approve') {
        return 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20';
    }
    if (actionId === 'redirect') {
        return 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20';
    }
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20';
}

function AxisPill({ axis }: { axis: OperationOpportunityProposalView['prerequisite_axes'][number] }) {
    return (
        <div
            className={`rounded border px-2 py-1 ${AXIS_STYLES[axis.state]}`}
            title={axis.reason}
        >
            <div className="text-[8px] font-bold uppercase tracking-[0.12em]">{axis.label}</div>
            <div className="text-[9px] leading-snug opacity-90 line-clamp-2">{axis.reason || t(AXIS_STATE_KEYS[axis.state])}</div>
        </div>
    );
}

function TraitPill({ trait }: { trait: OperationOpportunityProposalView['force_quality_traits'][number] }) {
    return (
        <div
            className={`rounded border px-2 py-1 ${TRAIT_STYLES[trait.band]}`}
            title={trait.reason}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-bold uppercase tracking-[0.12em]">{trait.label}</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.12em] opacity-80">
                    {t(TRAIT_BAND_KEYS[trait.band])}
                </span>
            </div>
            <div className="mt-0.5 text-[9px] leading-snug opacity-90 line-clamp-2">{trait.reason}</div>
        </div>
    );
}

function FootprintPill({ label, muted = false }: { label: string; muted?: boolean }) {
    return (
        <span
            className={`rounded border px-2 py-0.5 text-[9px] leading-snug ${
                muted
                    ? 'border-panel-border bg-panel-card text-text-secondary'
                    : 'border-sky-500/25 bg-sky-500/10 text-sky-200'
            }`}
            title={label}
        >
            {label}
        </span>
    );
}

function DossierCard({
    proposal,
    backTheOfficer,
    busy,
    commandBridgeAvailable,
    onResolve,
    onHighlightFootprint,
    onClearFootprint,
}: {
    proposal: OperationOpportunityProposalView;
    backTheOfficer?: BackTheOfficerView | null;
    busy: boolean;
    commandBridgeAvailable: boolean;
    onResolve: (
        proposal: OperationOpportunityProposalView,
        decision: OpportunityUiDecision,
        options?: OpportunityResolveOptions,
    ) => void;
    onHighlightFootprint: (proposal: OperationOpportunityProposalView) => void;
    onClearFootprint: () => void;
}) {
    const requiredSummary = opportunityAxisSummary('required', proposal.required_axes_green, proposal.required_axes_total);
    const optionalSummary = opportunityAxisSummary('optional', proposal.optional_axes_green, proposal.optional_axes_total);
    const hasEnabledActions = Boolean(proposal.review_id && proposal.available_actions.some((action) => action.enabled));
    const canAct = hasEnabledActions && commandBridgeAvailable;
    const footprintOsids = [
        ...proposal.objectives.map((objective) => objective.osid),
        ...proposal.staging.map((staging) => staging.osid),
    ];

    return (
        <div className="rounded border border-panel-border bg-panel-bg p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] font-bold text-text-primary truncate">{proposal.display_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em]">
                        <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                            {proposal.recommendation
                                ? t('opportunity.recommend', { recommendation: recommendationLabel(proposal.recommendation) })
                                : knownLabel(proposal.status, OPPORTUNITY_STATUS_KEYS, 'opportunity.status.review')}
                        </span>
                        {proposal.expires_turn != null && (
                            <span className="rounded border border-panel-border bg-panel-card px-2 py-0.5 text-text-secondary">
                                {t('opportunity.reviewByDate', { date: turnToDateString(proposal.expires_turn) })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary">{requiredSummary}</div>
                    {optionalSummary && <div className="mt-0.5 text-[9px] text-text-tertiary">{optionalSummary}</div>}
                </div>
            </div>

            {proposal.description && (
                <div className="text-[10px] leading-relaxed text-text-secondary">{proposal.description}</div>
            )}

            {backTheOfficer && (backTheOfficer.commander || backTheOfficer.donors.length > 0) && (
                <div className="rounded border border-sky-500/25 bg-sky-500/10 p-2 space-y-1">
                    <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-sky-300/80">
                        {t('opportunity.backTheOfficer')}
                    </div>
                    {backTheOfficer.commander && (
                        <div className="text-[10px] font-bold text-text-primary">
                            {(() => {
                                const rank = formatOfficerRank(backTheOfficer.commander?.rank);
                                return rank ? `${rank} ` : '';
                            })()}
                            {backTheOfficer.commander.name}
                            {backTheOfficer.tg_name ? ` - ${backTheOfficer.tg_name}` : ''}
                        </div>
                    )}
                    <div className="text-[10px] leading-relaxed text-text-secondary">
                        {formatBackTheOfficerFraming(backTheOfficer)}
                    </div>
                    {backTheOfficer.donors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {backTheOfficer.donors.map((donor) => (
                                <span
                                    key={`${proposal.proposal_id}:donor:${donor.corps_id}`}
                                    className="rounded border border-panel-border bg-panel-card px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-text-tertiary"
                                    title={donor.personnel_lent > 0
                                        ? t('opportunity.backTheOfficer.donorPersonnelLent', { count: donor.personnel_lent })
                                        : undefined}
                                >
                                    {donor.corps_name}
                                    {donor.personnel_lent > 0 ? ` (${donor.personnel_lent.toLocaleString('en-US')})` : ''}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {(proposal.objectives.length > 0 || proposal.staging.length > 0) && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-secondary/70">
                            {t('opportunity.mapFootprint')}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => onHighlightFootprint(proposal)}
                                disabled={footprintOsids.length === 0}
                                className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
                            >
                                {t('opportunity.highlight')}
                            </button>
                            <button
                                type="button"
                                onClick={onClearFootprint}
                                className="rounded border border-panel-border bg-panel-card px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary transition-colors hover:bg-panel-hover"
                            >
                                {t('opportunity.clear')}
                            </button>
                        </div>
                    </div>
                    {proposal.objectives.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                                {t('opportunity.objectives')}
                            </span>
                            {proposal.objectives.map((objective) => (
                                <FootprintPill key={`${proposal.proposal_id}:obj:${objective.osid}`} label={objective.label} />
                            ))}
                        </div>
                    )}
                    {proposal.staging.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                                {t('opportunity.staging')}
                            </span>
                            {proposal.staging.map((staging) => (
                                <FootprintPill key={`${proposal.proposal_id}:stage:${staging.osid}`} label={staging.label} muted />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {proposal.prerequisite_axes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {proposal.prerequisite_axes.map((axis) => (
                        <AxisPill key={`${proposal.proposal_id}:${axis.axis}`} axis={axis} />
                    ))}
                </div>
            )}

            {proposal.force_quality_traits.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-secondary/70">
                        {t('opportunity.forceQuality')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
                        {proposal.force_quality_traits.map((trait) => (
                            <TraitPill key={`${proposal.proposal_id}:${trait.trait}`} trait={trait} />
                        ))}
                    </div>
                </div>
            )}

            {canAct && proposal.redirect_variants.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-secondary/70">
                        {t('opportunity.redirectOptions')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {proposal.redirect_variants.map((variant) => {
                            const detail = [
                                ...variant.objectives.map((objective) => objective.label),
                                ...variant.staging.map((staging) => staging.label),
                            ].join(', ');
                            return (
                                <button
                                    key={`${proposal.proposal_id}:redirect:${variant.variant_id}`}
                                    type="button"
                                    onClick={() => onResolve(proposal, 'redirect', { redirectVariantId: variant.variant_id })}
                                    disabled={busy}
                                    title={detail || variant.label}
                                    className="rounded border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
                                >
                                    {variant.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {canAct && (
                <div className="flex flex-wrap justify-end gap-2">
                    {proposal.available_actions.filter((action) => action.id !== 'redirect').map((action) => (
                        <button
                            key={`${proposal.proposal_id}:${action.id}`}
                            type="button"
                            onClick={() => onResolve(proposal, action.id)}
                            disabled={busy || !action.enabled}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border transition-colors disabled:opacity-50 ${actionButtonClass(action.id)}`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
            {hasEnabledActions && !commandBridgeAvailable && (
                <div className="rounded border border-panel-border bg-panel-card/70 px-2 py-1.5 text-[10px] italic text-text-secondary">
                    {t('attention.bridgeUnavailableReadOnly')}
                </div>
            )}
        </div>
    );
}

export function OperationOpportunityDossierPanel({ gameState, playerFaction }: OperationOpportunityDossierPanelProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const setOperationTargetOsids = useGameStore((s) => s.setOperationTargetOsids);
    const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
    const proposals = useMemo(
        () =>
            [...(gameState.operationOpportunityProposals ?? [])]
                .filter((proposal) => !proposal.faction || proposal.faction === playerFaction)
                .sort((a, b) => {
                    const aTurn = a.expires_turn ?? a.eligibility_turn ?? 0;
                    const bTurn = b.expires_turn ?? b.eligibility_turn ?? 0;
                    if (aTurn !== bTurn) return aTurn - bTurn;
                    return a.proposal_id < b.proposal_id ? -1 : a.proposal_id > b.proposal_id ? 1 : 0;
                }),
        [gameState.operationOpportunityProposals, playerFaction],
    );

    // Phase 3B: match a proposal to its live Tactical Group (post-launch) so the decision
    // surface frames "back the officer". Defensive: empty when no TG has formed yet.
    const backTheOfficerByKey = useMemo(() => {
        const byKey = new Map<string, BackTheOfficerView>();
        const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
        for (const view of gameState.backTheOfficerOps ?? []) {
            byKey.set(normalize(view.op_id), view);
            byKey.set(normalize(view.op_name), view);
        }
        return byKey;
    }, [gameState.backTheOfficerOps]);
    const matchBackTheOfficer = (proposal: OperationOpportunityProposalView): BackTheOfficerView | null => {
        const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
        return (
            backTheOfficerByKey.get(normalize(proposal.opportunity_id)) ??
            backTheOfficerByKey.get(normalize(proposal.display_name)) ??
            null
        );
    };

    if (proposals.length === 0) return null;

    const resolveProposal = async (
        proposal: OperationOpportunityProposalView,
        decision: OpportunityUiDecision,
        options: OpportunityResolveOptions = {},
    ) => {
        if (!ipc.isAvailable || !proposal.review_id) return;
        setBusyProposalId(proposal.proposal_id);
        try {
            const result = await ipc.resolveOperationOpportunityDecision({
                reviewId: proposal.review_id,
                proposalId: proposal.proposal_id,
                decision,
                ...(decision === 'delay' ? { delayTurns: 2 } : {}),
                ...(decision === 'redirect' && options.redirectVariantId
                    ? { redirectVariantId: options.redirectVariantId }
                    : {}),
            });
            if (!result.ok) {
                setLoadError(result.error ?? t('opportunity.resolveFailed', { decision: decision === 'approve' ? t('opportunity.authorizeVerb') : decision }));
            }
        } finally {
            setBusyProposalId(null);
        }
    };

    return (
        <section className="space-y-2" data-coachmark-id="operation-opportunity">
            <div className="flex items-center justify-between gap-3 border-b border-panel-border pb-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70">
                    {t('opportunity.operationalOpportunities')}
                </div>
                <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300">
                    {proposals.length}
                </span>
            </div>
            <div className="space-y-2">
                {proposals.map((proposal) => (
                    <DossierCard
                        key={proposal.proposal_id}
                        proposal={proposal}
                        backTheOfficer={matchBackTheOfficer(proposal)}
                        busy={busyProposalId === proposal.proposal_id}
                        commandBridgeAvailable={ipc.isAvailable}
                        onResolve={(p, decision, options) => { void resolveProposal(p, decision, options); }}
                        onHighlightFootprint={(p) => {
                            setOperationTargetOsids([
                                ...p.objectives.map((objective) => objective.osid),
                                ...p.staging.map((staging) => staging.osid),
                            ]);
                        }}
                        onClearFootprint={() => setOperationTargetOsids([])}
                    />
                ))}
            </div>
        </section>
    );
}

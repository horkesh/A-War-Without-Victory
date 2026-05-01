import { useMemo, useState } from 'react';
import type { LoadedGameState, OperationOpportunityAxisState, OperationOpportunityProposalView } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';

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
};

const TRAIT_STYLES: Record<OperationOpportunityProposalView['force_quality_traits'][number]['band'], string> = {
    strong: 'border-green-500/30 bg-green-500/10 text-green-300',
    adequate: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    strained: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    poor: 'border-red-500/30 bg-red-500/10 text-red-300',
};

function statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
            <div className="text-[9px] leading-snug opacity-90 line-clamp-2">{axis.reason || statusLabel(axis.state)}</div>
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
                    {statusLabel(trait.band)}
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
    busy,
    onResolve,
    onHighlightFootprint,
    onClearFootprint,
}: {
    proposal: OperationOpportunityProposalView;
    busy: boolean;
    onResolve: (
        proposal: OperationOpportunityProposalView,
        decision: OpportunityUiDecision,
        options?: OpportunityResolveOptions,
    ) => void;
    onHighlightFootprint: (proposal: OperationOpportunityProposalView) => void;
    onClearFootprint: () => void;
}) {
    const requiredSummary =
        proposal.required_axes_total != null
            ? `${proposal.required_axes_green ?? 0}/${proposal.required_axes_total} required`
            : 'No required axes';
    const optionalSummary =
        proposal.optional_axes_total != null
            ? `${proposal.optional_axes_green ?? 0}/${proposal.optional_axes_total} optional`
            : null;
    const canAct = Boolean(proposal.review_id && proposal.available_actions.some((action) => action.enabled));
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
                            {proposal.recommendation ? `Recommend ${proposal.recommendation}` : statusLabel(proposal.status)}
                        </span>
                        {proposal.expires_turn != null && (
                            <span className="rounded border border-panel-border bg-panel-card px-2 py-0.5 text-text-secondary">
                                Expires w{proposal.expires_turn}
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

            {(proposal.objectives.length > 0 || proposal.staging.length > 0) && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-secondary/70">
                            Map Footprint
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => onHighlightFootprint(proposal)}
                                disabled={footprintOsids.length === 0}
                                className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
                            >
                                Highlight
                            </button>
                            <button
                                type="button"
                                onClick={onClearFootprint}
                                className="rounded border border-panel-border bg-panel-card px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-text-secondary transition-colors hover:bg-panel-hover"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                    {proposal.objectives.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                                Objectives
                            </span>
                            {proposal.objectives.map((objective) => (
                                <FootprintPill key={`${proposal.proposal_id}:obj:${objective.osid}`} label={objective.label} />
                            ))}
                        </div>
                    )}
                    {proposal.staging.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                                Staging
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
                        Force Quality
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
                        Redirect Options
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
                setLoadError(result.error ?? `Failed to ${decision === 'approve' ? 'authorize' : decision} opportunity.`);
            }
        } finally {
            setBusyProposalId(null);
        }
    };

    return (
        <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 border-b border-panel-border pb-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-secondary/70">
                    Operational Opportunities
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
                        busy={busyProposalId === proposal.proposal_id}
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

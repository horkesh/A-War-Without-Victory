import { useMemo, useState } from 'react';
import type { LoadedGameState, OperationOpportunityAxisState, OperationOpportunityProposalView } from '../../data/types';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';

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

function statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

function DossierCard({
    proposal,
    busy,
    onAuthorize,
    onDecline,
}: {
    proposal: OperationOpportunityProposalView;
    busy: boolean;
    onAuthorize: (proposal: OperationOpportunityProposalView) => void;
    onDecline: (proposal: OperationOpportunityProposalView) => void;
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

            {proposal.prerequisite_axes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {proposal.prerequisite_axes.map((axis) => (
                        <AxisPill key={`${proposal.proposal_id}:${axis.axis}`} axis={axis} />
                    ))}
                </div>
            )}

            {canAct && (
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => onDecline(proposal)}
                        disabled={busy}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-red-500/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                        Decline
                    </button>
                    <button
                        type="button"
                        onClick={() => onAuthorize(proposal)}
                        disabled={busy}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded border border-green-500/30 bg-green-500/10 text-green-300 transition-colors hover:bg-green-500/20 disabled:opacity-50"
                    >
                        Authorize
                    </button>
                </div>
            )}
        </div>
    );
}

export function OperationOpportunityDossierPanel({ gameState, playerFaction }: OperationOpportunityDossierPanelProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
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

    const resolveProposal = async (proposal: OperationOpportunityProposalView, decision: 'approve' | 'decline') => {
        if (!ipc.isAvailable || !proposal.review_id) return;
        setBusyProposalId(proposal.proposal_id);
        try {
            const result = decision === 'approve'
                ? await ipc.acceptProposal(proposal.review_id)
                : await ipc.rejectProposal(proposal.review_id);
            if (!result.ok) {
                setLoadError(result.error ?? `Failed to ${decision === 'approve' ? 'authorize' : 'decline'} opportunity.`);
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
                        onAuthorize={(p) => { void resolveProposal(p, 'approve'); }}
                        onDecline={(p) => { void resolveProposal(p, 'decline'); }}
                    />
                ))}
            </div>
        </section>
    );
}

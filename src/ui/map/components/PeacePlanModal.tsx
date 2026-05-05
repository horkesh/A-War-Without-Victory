/**
 * Peace Plan Modal — production UI for responding to international peace plans.
 *
 * Renders when a pending peace plan exists in LoadedGameState.
 * Player must accept or reject before proceeding. Bot responses displayed alongside.
 * Paper document aesthetic matching EventModal.
 *
 * Migrated to the shared `<Modal>` wrapper in
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION. Must-respond modal:
 * `dismissible={false}` (no ESC, no click-outside) — the only valid close
 * path is the player choosing Accept or Reject, which calls `onDismiss`
 * (parent flips render guard) and resolves the plan via IPC. The
 * `onDismiss` prop is preserved on the panel content (NOT passed to Modal
 * as `onClose`) since Modal's master switch is `dismissible={false}`.
 */
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

const INSTITUTIONAL_LABELS: Record<string, string> = {
    cantonization: 'Ethnic Cantonization',
    decentralized_provinces: 'Decentralized Provinces',
    two_entity: 'Two-Entity Federation',
    loose_confederation: 'Loose Confederation',
    unitary: 'Unitary State',
};

interface PeacePlanModalProps {
    plan: NonNullable<LoadedGameState['pendingPeacePlan']>;
    onDismiss: () => void;
}

export function PeacePlanModal({ plan, onDismiss }: PeacePlanModalProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const proposedFactionLabels = {
        RBiH: getPlayerSafePoliticalFactionName('RBiH'),
        RS: getPlayerSafePoliticalFactionName('RS'),
        HRHB: getPlayerSafePoliticalFactionName('HRHB'),
    };

    const handleRespond = (response: 'accepted' | 'rejected') => {
        // Dismiss immediately — don't wait for IPC
        onDismiss();
        if (ipc.isAvailable) {
            ipc.resolvePeacePlan(plan.planId, response).then((result) => {
                if (!result.ok) {
                    setLoadError(result.error ?? 'Failed to resolve peace plan.');
                }
            }).catch((err) => {
                console.error('[PeacePlanModal] Failed to resolve:', err);
            });
        }
    };

    const splitTotal = plan.proposedSplit.RBiH + plan.proposedSplit.RS + plan.proposedSplit.HRHB;

    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="peace-plan-title"
            backdropClassName="bg-black/70 backdrop-blur-sm"
            panelClassName="w-[95%] max-w-[640px] max-h-[90vh] overflow-auto rounded-lg border-2 border-[#8a7a60]/60 shadow-2xl"
            panelStyle={{
                background: 'linear-gradient(160deg, #f0e8d8 0%, #e0d8c0 50%, #d8ceb8 100%)',
                fontFamily: 'Georgia, "Times New Roman", serif',
            }}
        >
            <>
                {/* Header — document stamp */}
                <div className="relative px-8 pt-8 pb-4 border-b-2 border-[#8a7a60]/30">
                    <div className="absolute top-4 right-4 text-[9px] uppercase tracking-widest text-[#8a7a60]/60 font-bold rotate-[-8deg] border-2 border-[#8a7a60]/30 px-2 py-1 rounded">
                        DIPLOMATIC
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a7a60] font-bold mb-1">
                        International Peace Proposal
                    </div>
                    <h2 id="peace-plan-title" className="text-[20px] font-bold text-[#2a2016] leading-tight">
                        {plan.planName}
                    </h2>
                    <div className="text-[11px] text-[#6a5a40] mt-1"
                         style={{ fontFamily: 'Courier New, monospace' }}>
                        Proposed: Week {plan.turnOffered}
                    </div>
                </div>

                {/* Narrative */}
                <div className="px-8 py-5 text-[13px] text-[#2a2016] leading-relaxed border-b border-[#c8b898]/40">
                    {plan.narrative}
                </div>

                {/* Territorial Split */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
                        Proposed Territorial Division
                    </div>
                    <div className="flex gap-1 h-5 rounded overflow-hidden border border-[#8a7a60]/30 mb-2">
                        <div className="bg-[#4a7a4a]" style={{ width: `${(plan.proposedSplit.RBiH / splitTotal) * 100}%` }}
                             title={`${proposedFactionLabels.RBiH}: ${plan.proposedSplit.RBiH}%`} />
                        <div className="bg-[#4a5a8a]" style={{ width: `${(plan.proposedSplit.RS / splitTotal) * 100}%` }}
                             title={`${proposedFactionLabels.RS}: ${plan.proposedSplit.RS}%`} />
                        <div className="bg-[#8a6a3a]" style={{ width: `${(plan.proposedSplit.HRHB / splitTotal) * 100}%` }}
                             title={`${proposedFactionLabels.HRHB}: ${plan.proposedSplit.HRHB}%`} />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#6a5a40]"
                         style={{ fontFamily: 'Courier New, monospace' }}>
                        <span>{proposedFactionLabels.RBiH} {plan.proposedSplit.RBiH}%</span>
                        <span>{proposedFactionLabels.RS} {plan.proposedSplit.RS}%</span>
                        <span>{proposedFactionLabels.HRHB} {plan.proposedSplit.HRHB}%</span>
                    </div>
                    <div className="text-[11px] text-[#6a5a40] mt-2">
                        <span className="font-bold text-[#2a2016]">Institutional model:</span>{' '}
                        {INSTITUTIONAL_LABELS[plan.institutionalModel] ?? plan.institutionalModel.replace(/_/g, ' ')}
                    </div>
                </div>

                {/* Bot Responses */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-2">
                        Other Faction Responses
                    </div>
                    <div className="space-y-1.5">
                        {Object.entries(plan.botResponses).map(([faction, response]) => (
                            <div key={faction} className="flex items-center justify-between text-[12px]">
                                <span className="text-[#2a2016]">{getPlayerSafePoliticalFactionName(faction)}</span>
                                <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded border ${
                                    response === 'accepted'
                                        ? 'text-[#2a6a2a] bg-[#d0e8d0] border-[#2a6a2a]/30'
                                        : 'text-[#8a2a2a] bg-[#e8d0d0] border-[#8a2a2a]/30'
                                }`}>
                                    {response}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Commander's Decision */}
                <div className="px-8 py-5">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-3 text-center">
                        Commander's Decision Required
                    </div>
                    <div className="flex gap-4 justify-center">
                        <button
                            type="button"
                            onClick={() => void handleRespond('accepted')}
                            className="px-6 py-2.5 rounded border-2 border-[#2a6a2a]/50 bg-[#d0e8d0] text-[#1a4a1a] font-bold text-[13px] uppercase tracking-wider hover:bg-[#b8d8b8] transition-colors"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            Accept Plan
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleRespond('rejected')}
                            className="px-6 py-2.5 rounded border-2 border-[#8a2a2a]/50 bg-[#e8d0d0] text-[#6a1a1a] font-bold text-[13px] uppercase tracking-wider hover:bg-[#d8b8b8] transition-colors"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            Reject Plan
                        </button>
                    </div>
                </div>
            </>
        </Modal>
    );
}

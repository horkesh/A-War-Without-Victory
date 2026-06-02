/**
 * Peace Plan Modal — production UI for responding to international peace plans.
 *
 * Renders when a pending peace plan exists in LoadedGameState.
 * Player can accept/reject through IPC, or review later while the plan stays pending.
 * Bot responses displayed alongside.
 * Paper document aesthetic matching EventModal.
 *
 * Migrated to the shared `<Modal>` wrapper in
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION. Must-respond modal:
 * `dismissible={false}` (no ESC, no click-outside) — the only valid close
 * path is an explicit panel action. Accept/Reject call `onDismiss`
 * (parent flips render guard) and resolve the plan via IPC; Review Later
 * only calls `onDismiss`. The
 * `onDismiss` prop is preserved on the panel content (NOT passed to Modal
 * as `onClose`) since Modal's master switch is `dismissible={false}`.
 */
import { useEffect } from 'react';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { playCue } from '../audio/audio_engine';
import { t } from '../i18n';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';

const INSTITUTIONAL_LABELS: Record<string, string> = {
    cantonization: 'Ethnic Cantonization',
    decentralized_provinces: 'Decentralized Provinces',
    two_entity: 'Two-Entity Federation',
    loose_confederation: 'Loose Confederation',
    unitary: 'Unitary State',
    '10_provinces': '10 Decentralized Provinces',
};

const PEACE_RESPONSE_LABELS: Record<string, string> = {
    accepted: 'Accepted',
    rejected: 'Rejected',
};

const FACTION_ORDER = ['RBiH', 'RS', 'HRHB'] as const;
type PeacePlanFaction = typeof FACTION_ORDER[number];

const FACTION_BAR_COLORS: Record<PeacePlanFaction, string> = {
    RBiH: 'bg-[#4a7a4a]',
    RS: 'bg-[#4a5a8a]',
    HRHB: 'bg-[#8a6a3a]',
};

function normalizePercent(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value;
}

function formatPercent(value: number): string {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1).replace(/\.0$/, '');
}

interface PeacePlanModalProps {
    plan: NonNullable<LoadedGameState['pendingPeacePlan']>;
    onDismiss: () => void;
}

export function PeacePlanModal({ plan, onDismiss }: PeacePlanModalProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const playerFaction = useGameStore((s) => s.loadedGameState?.player_faction ?? null);
    const headerImage = getDecisionHeaderForFamily('peace_plan');
    const proposedFactionLabels = {
        RBiH: getPlayerSafePoliticalFactionName('RBiH'),
        RS: getPlayerSafePoliticalFactionName('RS'),
        HRHB: getPlayerSafePoliticalFactionName('HRHB'),
    };

    useEffect(() => {
        void playCue('peace_plan_offered');
    }, [plan.planId]);

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

    const splitValues: Record<PeacePlanFaction, number> = {
        RBiH: normalizePercent(plan.proposedSplit.RBiH),
        RS: normalizePercent(plan.proposedSplit.RS),
        HRHB: normalizePercent(plan.proposedSplit.HRHB),
    };
    const splitTotal = FACTION_ORDER.reduce((sum, faction) => sum + splitValues[faction], 0);
    const splitRows = FACTION_ORDER.map((faction) => {
        const displayPercent = splitValues[faction];
        const widthPercent = splitTotal > 0 ? (displayPercent / splitTotal) * 100 : 0;
        return {
            faction,
            label: proposedFactionLabels[faction],
            displayPercent,
            widthPercent,
        };
    });
    const otherFactionResponses = Object.entries(plan.botResponses)
        .filter(([faction]) => faction !== playerFaction);

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
                    {headerImage && (
                        <img
                            src={headerImage}
                            alt="Diplomatic decision header"
                            className="absolute inset-x-0 top-0 h-28 w-full object-cover opacity-35"
                        />
                    )}
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#1b130c]/35 to-transparent" />
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
                        {splitRows.map((row) => (
                            <div
                                key={row.faction}
                                role="meter"
                                aria-label={`${row.label} territory share`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={row.displayPercent}
                                className={FACTION_BAR_COLORS[row.faction]}
                                style={{ width: `${row.widthPercent}%` }}
                                title={`${row.label}: ${formatPercent(row.displayPercent)}%`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between text-[11px] text-[#6a5a40]"
                         style={{ fontFamily: 'Courier New, monospace' }}>
                        {splitRows.map((row) => (
                            <span key={row.faction}>{row.label} {formatPercent(row.displayPercent)}%</span>
                        ))}
                    </div>
                    <div className="text-[11px] text-[#6a5a40] mt-2">
                        <span className="font-bold text-[#2a2016]">{t('peace.institutionalModel')}</span>{' '}
                        {INSTITUTIONAL_LABELS[plan.institutionalModel] ?? plan.institutionalModel.replace(/_/g, ' ')}
                    </div>
                </div>

                {/* Bot Responses */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#8a7a60] font-bold mb-2">
                        Other Faction Responses
                    </div>
                    <div className="space-y-1.5" data-testid="peace-plan-other-responses">
                        {otherFactionResponses.map(([faction, response]) => (
                            <div key={faction} className="flex items-center justify-between text-[12px]">
                                <span className="text-[#2a2016]">{getPlayerSafePoliticalFactionName(faction)}</span>
                                <span className={`font-bold text-[11px] px-2 py-0.5 rounded border ${
                                    response === 'accepted'
                                        ? 'text-[#2a6a2a] bg-[#d0e8d0] border-[#2a6a2a]/30'
                                        : 'text-[#8a2a2a] bg-[#e8d0d0] border-[#8a2a2a]/30'
                                }`}>
                                    {PEACE_RESPONSE_LABELS[response] ?? response}
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
                            onClick={onDismiss}
                            className="px-6 py-2.5 rounded border-2 border-[#6a5a40]/35 bg-[#d8ceb8] text-[#4a3a24] font-bold text-[13px] uppercase tracking-wider hover:bg-[#c8b898] transition-colors"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            Review Later
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

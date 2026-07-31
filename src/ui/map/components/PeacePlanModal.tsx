/**
 * Peace Plan Modal — production UI for responding to international peace plans.
 *
 * Renders when a pending peace plan exists in LoadedGameState.
 * Player can accept/reject through IPC, or review later while the plan stays pending.
 * Other delegations' precomputed responses remain hidden until resolution.
 * Paper document aesthetic matching EventModal.
 *
 * Migrated to the shared `<Modal>` wrapper in
 * LANE-V094-MODAL-DISMISSIBLE-EXTENSION. Must-respond modal:
 * `dismissible={false}` (no ESC, no click-outside) — the only valid close
 * path is an explicit panel action. Accept/Reject resolve the plan via IPC
 * and call `onDismiss` only after success; Review Later only calls
 * `onDismiss`. The
 * `onDismiss` prop is preserved on the panel content (NOT passed to Modal
 * as `onClose`) since Modal's master switch is `dismissible={false}`.
 */
import { useEffect, useState } from 'react';
import type { LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { playCue } from '../audio/audio_engine';
import { t } from '../i18n';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { resolvePeacePlanStill } from '../data/peacePlanArt';
import { turnToDateString } from '../utils/formatters';

const INSTITUTIONAL_LABELS: Record<string, string> = {
    cantonization: 'Ethnic Cantonization',
    decentralized_provinces: 'Decentralized Provinces',
    two_entity: 'Two-Entity Federation',
    loose_confederation: 'Loose Confederation',
    unitary: 'Unitary State',
    '10_provinces': '10 Decentralized Provinces',
    union_3_republics: 'Union of Three Republics',
    '51_49_entities': '51/49 Entity Framework',
    two_entities: 'Two-Entity Federation',
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

function formatInstitutionalModel(model: string): string {
    return INSTITUTIONAL_LABELS[model] ?? t('peacePlan.institutionalModel.unknown');
}

interface PeacePlanModalProps {
    plan: NonNullable<LoadedGameState['pendingPeacePlan']>;
    onDismiss: () => void;
}

export function PeacePlanModal({ plan, onDismiss }: PeacePlanModalProps) {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [responseError, setResponseError] = useState<string | null>(null);
    const headerImage = getDecisionHeaderForFamily('peace_plan');
    const planStill = resolvePeacePlanStill(plan.planId);
    const proposedFactionLabels = {
        RBiH: getPlayerSafePoliticalFactionName('RBiH'),
        RS: getPlayerSafePoliticalFactionName('RS'),
        HRHB: getPlayerSafePoliticalFactionName('HRHB'),
    };

    useEffect(() => {
        void playCue('peace_plan_offered');
    }, [plan.planId]);

    const handleRespond = async (response: 'accepted' | 'rejected') => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        setResponseError(null);
        try {
            const result = await ipc.resolvePeacePlan(plan.planId, response);
            if (!result.ok) {
                const message = result.error ?? 'Failed to resolve peace plan.';
                setResponseError(message);
                setLoadError(message);
                return;
            }
            onDismiss();
        } catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : 'Failed to resolve peace plan.';
            setResponseError(message);
            setLoadError(message);
        } finally {
            setIsSubmitting(false);
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
                <div
                    data-testid="peace-plan-header"
                    className="relative isolate px-8 pt-8 pb-4 border-b-2 border-[#8a7a60]/30"
                >
                    {headerImage && (
                        <img
                            src={headerImage}
                            alt=""
                            aria-hidden="true"
                            data-testid="peace-plan-header-art"
                            className="pointer-events-none absolute inset-x-0 top-0 h-28 w-full object-cover opacity-35"
                        />
                    )}
                    <div
                        aria-hidden="true"
                        data-testid="peace-plan-header-overlay"
                        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#1b130c]/35 to-transparent"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-4 right-4 text-xs uppercase tracking-widest text-[#8a7a60]/60 font-bold rotate-[-8deg] border-2 border-[#8a7a60]/30 px-2 py-1 rounded"
                    >
                        DIPLOMATIC
                    </div>
                    <div data-testid="peace-plan-header-content" className="relative">
                        <div className="text-xs uppercase tracking-[0.2em] text-[#8a7a60] font-bold mb-1">
                            International Peace Proposal
                        </div>
                        <h2 id="peace-plan-title" className="text-[20px] font-bold text-[#2a2016] leading-tight">
                            {plan.planName}
                        </h2>
                        <div className="text-xs text-[#6a5a40] mt-1"
                             style={{ fontFamily: 'Courier New, monospace' }}>
                            {t('peacePlan.proposedDate', { date: turnToDateString(plan.turnOffered) })}
                        </div>
                    </div>
                </div>

                {/* Documentary plan still — rendered ONLY when the plan id maps
                    to a committed asset under assets/plans/ (resolver returns
                    null otherwise, e.g. cutileiro). Absent → nothing here, so
                    the still-less layout is byte-identical to before. */}
                {planStill && (
                    <div className="relative w-full border-b border-[#c8b898]/40" data-testid="peace-plan-still">
                        <img
                            src={planStill}
                            alt=""
                            aria-hidden="true"
                            className="block w-full object-cover"
                            style={{ aspectRatio: '3 / 2', maxHeight: '280px' }}
                        />
                        {/* Bottom fade into the paper so the still seats into the document. */}
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 h-1/4 pointer-events-none"
                            style={{
                                background: 'linear-gradient(to top, rgba(224,216,192,0.9), rgba(224,216,192,0))',
                            }}
                        />
                    </div>
                )}

                {/* Narrative */}
                <div className="px-8 py-5 text-[13px] text-[#2a2016] leading-relaxed border-b border-[#c8b898]/40">
                    {plan.narrative}
                </div>

                {/* Territorial Split */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-3">
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
                    <div className="flex justify-between text-xs text-[#6a5a40]"
                         style={{ fontFamily: 'Courier New, monospace' }}>
                        {splitRows.map((row) => (
                            <span key={row.faction}>{row.label} {formatPercent(row.displayPercent)}%</span>
                        ))}
                    </div>
                    <div className="text-xs text-[#6a5a40] mt-2">
                        <span className="font-bold text-[#2a2016]">{t('peace.institutionalModel')}</span>{' '}
                        {formatInstitutionalModel(plan.institutionalModel)}
                    </div>
                </div>

                {/* Other delegations' positions are simulation-private until the
                    player commits. Resolution records the complete response map. */}
                <div className="px-8 py-4 border-b border-[#c8b898]/40">
                    <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-2">
                        {t('peacePlan.otherFactionResponses')}
                    </div>
                    <div className="space-y-1.5" data-testid="peace-plan-other-responses">
                        <div className="text-[12px] italic text-[#5a4a34]">
                            {t('peacePlan.otherFactionPositionsPending')}
                        </div>
                    </div>
                </div>

                {/* Commander's Decision */}
                <div className="px-8 py-5">
                    <div className="text-xs uppercase tracking-widest text-[#8a7a60] font-bold mb-3 text-center">
                        {t('peacePlan.decisionRequired')}
                    </div>
                    {responseError && (
                        <div
                            role="alert"
                            className="mb-3 border border-[#8a2a2a]/40 bg-[#e8d0d0] px-3 py-2 text-center text-[12px] font-bold text-[#6a1a1a]"
                        >
                            {responseError}
                        </div>
                    )}
                    <div className="flex gap-4 justify-center">
                        <button
                            type="button"
                            onClick={() => void handleRespond('accepted')}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded border-2 border-[#2a6a2a]/50 bg-[#d0e8d0] text-[#1a4a1a] font-bold text-[13px] uppercase tracking-wider hover:bg-[#b8d8b8] transition-colors"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            {t('peacePlan.acceptPlan')}
                        </button>
                        <button
                            type="button"
                            onClick={onDismiss}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded border-2 border-[#6a5a40]/35 bg-[#d8ceb8] text-[#4a3a24] font-bold text-[13px] uppercase tracking-wider hover:bg-[#c8b898] transition-colors"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            {t('peacePlan.reviewLater')}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleRespond('rejected')}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded border-2 border-[#8a2a2a]/50 bg-[#e8d0d0] text-[#6a1a1a] font-bold text-[13px] uppercase tracking-wider hover:bg-[#d8b8b8] transition-colors"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            {t('peacePlan.rejectPlan')}
                        </button>
                    </div>
                </div>
            </>
        </Modal>
    );
}

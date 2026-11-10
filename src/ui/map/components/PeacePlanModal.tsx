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
import {
    SurfaceColumns,
    SurfaceContent,
    SurfaceDetail,
    SurfaceDetailFooter,
    SurfaceStat,
    SURFACE_LABEL,
    SURFACE_LABEL_MUTED,
    SURFACE_MODAL_BACKDROP,
    SURFACE_MODAL_PANEL_MEDIUM,
    SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

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
    // Surface redesign (owner, 2026-11-10): a surface in the Command Surface's style —
    // the plan's plate and name on top; the documentary still and the plan's account on
    // the left; the proposed division, the institutional model, the other delegations and
    // the president's three answers on the right, the answers in a footer that never
    // scrolls away.
    return (
        <Modal
            isOpen={true}
            dismissible={false}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="peace-plan-title"
            backdropClassName={SURFACE_MODAL_BACKDROP}
            panelClassName={SURFACE_MODAL_PANEL_MEDIUM}
        >
            <>
                <div
                    data-testid="peace-plan-header"
                    className="relative isolate min-h-44 shrink-0 overflow-hidden border-b border-[#262b35]"
                >
                    {headerImage && (
                        <img
                            src={headerImage}
                            alt=""
                            aria-hidden="true"
                            data-testid="peace-plan-header-art"
                            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                        />
                    )}
                    <div
                        aria-hidden="true"
                        data-testid="peace-plan-header-overlay"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/92 via-black/82 to-black/50"
                    />
                    <div data-testid="peace-plan-header-content" className="relative flex min-h-44 flex-col justify-end gap-1.5 px-8 py-6">
                        <div className={SURFACE_LABEL}>
                            {t('peacePlan.eyebrow')}
                        </div>
                        <h2 id="peace-plan-title" className="m-0 text-[30px] font-semibold leading-tight text-[#f6ecd2]">
                            {plan.planName}
                        </h2>
                        <div className="text-[16px] text-[#e2d6b8]">
                            {t('peacePlan.proposedDate', { date: turnToDateString(plan.turnOffered) })}
                        </div>
                    </div>
                </div>

                <SurfaceColumns layout="content-detail">
                    <SurfaceContent>
                        {/* Documentary plan still — rendered ONLY when the plan id maps
                            to a committed asset under assets/plans/ (resolver returns
                            null otherwise, e.g. cutileiro). */}
                        {planStill && (
                            <div className="relative w-full shrink-0" data-testid="peace-plan-still">
                                <img
                                    src={planStill}
                                    alt=""
                                    aria-hidden="true"
                                    className="block w-full object-cover"
                                    style={{ aspectRatio: '3 / 2', maxHeight: '320px' }}
                                />
                            </div>
                        )}
                        <p className="m-0 px-8 py-6 text-[18px] leading-relaxed text-[#ddd1b3]">
                            {plan.narrative}
                        </p>
                    </SurfaceContent>

                    <SurfaceDetail>
                        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-7 py-6">
                            <section className="flex flex-col gap-3">
                                <div className={SURFACE_LABEL}>
                                    {t('peacePlan.territorialDivision')}
                                </div>
                                <div className="flex h-6 gap-1 overflow-hidden rounded border border-[#3a4150]">
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
                                <div className="flex flex-col">
                                    {splitRows.map((row) => (
                                        <SurfaceStat key={row.faction} label={row.label} value={`${formatPercent(row.displayPercent)}%`} />
                                    ))}
                                </div>
                                <div className="text-[16px] leading-relaxed text-[#ddd1b3]">
                                    <span className="font-semibold text-[#f1e6c8]">{t('peace.institutionalModel')}</span>{' '}
                                    {formatInstitutionalModel(plan.institutionalModel)}
                                </div>
                            </section>

                            {/* Other delegations' positions are simulation-private until the
                                player commits. Resolution records the complete response map. */}
                            <section className="flex flex-col gap-2">
                                <div className={SURFACE_LABEL_MUTED}>
                                    {t('peacePlan.otherFactionResponses')}
                                </div>
                                <div data-testid="peace-plan-other-responses">
                                    <div className="text-[16px] italic leading-relaxed text-[#c2b69c]">
                                        {t('peacePlan.otherFactionPositionsPending')}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <SurfaceDetailFooter>
                            <div className={SURFACE_LABEL}>
                                {t('peacePlan.decisionRequired')}
                            </div>
                            {responseError && (
                                <div
                                    role="alert"
                                    className="rounded-md border border-red-400/45 bg-red-500/10 px-4 py-3 text-[15px] font-semibold text-red-100"
                                >
                                    {responseError}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => void handleRespond('accepted')}
                                disabled={isSubmitting}
                                className="h-12 rounded-md border border-emerald-400/50 bg-emerald-500/15 px-5 text-[17px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-45"
                            >
                                {t('peacePlan.acceptPlan')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleRespond('rejected')}
                                disabled={isSubmitting}
                                className="h-12 rounded-md border border-red-400/50 bg-red-500/15 px-5 text-[17px] font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-45"
                            >
                                {t('peacePlan.rejectPlan')}
                            </button>
                            <button
                                type="button"
                                onClick={onDismiss}
                                disabled={isSubmitting}
                                className={SURFACE_SECONDARY_BUTTON}
                            >
                                {t('peacePlan.reviewLater')}
                            </button>
                        </SurfaceDetailFooter>
                    </SurfaceDetail>
                </SurfaceColumns>
            </>
        </Modal>
    );
}

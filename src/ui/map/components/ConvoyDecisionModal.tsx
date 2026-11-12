import { useState } from 'react';
import type { PendingConvoyDecisionView } from '../data/types';
import { getPlayerSafeEnclaveName, getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import { t, type MessageKey } from '../i18n';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';
import {
    SurfaceFigure,
    SurfaceModalBody,
    SurfaceModalFooter,
    SURFACE_MODAL_BACKDROP,
    SURFACE_MODAL_PANEL_COMPACT,
    SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

type ConvoyDecision = 'allow' | 'block' | 'divert';

interface ConvoyDecisionModalProps {
    convoy: PendingConvoyDecisionView | null;
    onClose: () => void;
    onDecide: (convoyId: string, decision: ConvoyDecision) => Promise<{ ok: boolean; error?: string }>;
}

const DECISION_COPY: Record<ConvoyDecision, { labelKey: MessageKey; detailKey: MessageKey; className: string }> = {
    allow: {
        labelKey: 'convoyDecision.allow',
        detailKey: 'convoyDecision.allowDetail',
        className: 'border-emerald-400/40 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/22',
    },
    block: {
        labelKey: 'convoyDecision.block',
        detailKey: 'convoyDecision.blockDetail',
        className: 'border-red-400/40 bg-red-500/12 text-red-200 hover:bg-red-500/22',
    },
    divert: {
        labelKey: 'convoyDecision.divert',
        detailKey: 'convoyDecision.divertDetail',
        className: 'border-amber-300/45 bg-amber-400/12 text-amber-100 hover:bg-amber-400/22',
    },
};

export function ConvoyDecisionModal({ convoy, onClose, onDecide }: ConvoyDecisionModalProps) {
    const [pendingDecision, setPendingDecision] = useState<ConvoyDecision | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!convoy) return null;
    const headerImage = getDecisionHeaderForFamily('convoy_decision');

    const handleDecision = async (decision: ConvoyDecision) => {
        setPendingDecision(decision);
        setError(null);
        const result = await onDecide(convoy.id, decision);
        setPendingDecision(null);
        if (result.ok) {
            onClose();
            return;
        }
        setError(result.error ?? t('convoyDecision.stageFailed'));
    };

    // Surface redesign (owner, 2026-11-10): a compact surface — convoy plate and enclave,
    // route/supply/staged figures, the brief, and the three choices as full-size cards;
    // Close in a fixed footer.
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="convoy-decision-title"
            ariaDescribedBy="convoy-decision-summary"
            backdropClassName={SURFACE_MODAL_BACKDROP}
            panelClassName={SURFACE_MODAL_PANEL_COMPACT}
        >
            {headerImage && (
                <DecisionModalImageHeader
                    imageUrl={headerImage}
                    imageAlt={t('convoyDecision.title')}
                    eyebrow={t('convoyDecision.title')}
                    title={getPlayerSafeEnclaveName(convoy.target_enclave)}
                    titleId="convoy-decision-title"
                />
            )}
            <SurfaceModalBody>
                <div id="convoy-decision-summary" className="grid grid-cols-3 gap-3">
                    <SurfaceFigure label={t('convoyDecision.route')} value={getPlayerSafePoliticalFactionName(convoy.route_faction)} />
                    <SurfaceFigure label={t('convoyDecision.supply')} value={<span className="font-mono">{convoy.supply_amount}</span>} />
                    <SurfaceFigure
                        label={t('convoyDecision.staged')}
                        value={convoy.decision ? t(DECISION_COPY[convoy.decision].labelKey) : t('common.none')}
                    />
                </div>

                <p className="m-0 text-[17px] leading-relaxed text-[#ddd1b3]">
                    {t('convoyDecision.body')}
                </p>

                {error && (
                    <div role="alert" className="rounded-md border border-red-400/45 bg-red-500/10 px-4 py-3 text-[15px] font-semibold text-red-100">
                        {error}
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(DECISION_COPY) as ConvoyDecision[]).map((decision) => {
                        const copy = DECISION_COPY[decision];
                        const disabled = pendingDecision !== null || convoy.decision === decision;
                        return (
                            <button
                                key={decision}
                                type="button"
                                onClick={() => void handleDecision(decision)}
                                disabled={disabled}
                                className={`flex flex-col gap-1.5 rounded-md border px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${copy.className}`}
                            >
                                <span className="text-[18px] font-semibold">
                                    {pendingDecision === decision ? t('convoyDecision.staging') : t(copy.labelKey)}
                                </span>
                                <span className="text-[15px] leading-snug text-[#ddd1b3]">{t(copy.detailKey)}</span>
                            </button>
                        );
                    })}
                </div>
            </SurfaceModalBody>
            <SurfaceModalFooter>
                <button
                    type="button"
                    onClick={onClose}
                    className={SURFACE_SECONDARY_BUTTON}
                >
                    {t('common.close')}
                </button>
            </SurfaceModalFooter>
        </Modal>
    );
}

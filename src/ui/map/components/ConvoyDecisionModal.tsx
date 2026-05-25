import { useState } from 'react';
import type { PendingConvoyDecisionView } from '../data/types';
import { getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import { t, type MessageKey } from '../i18n';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';

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

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="convoy-decision-title"
            ariaDescribedBy="convoy-decision-summary"
            backdropClassName="bg-black/70 backdrop-blur-sm"
            panelClassName="w-[95%] max-w-[560px] rounded-lg border border-[rgba(180,160,130,0.22)] bg-[rgba(20,18,15,0.96)] shadow-2xl"
        >
            <div className="text-text-primary">
                {headerImage && (
                    <DecisionModalImageHeader
                        imageUrl={headerImage}
                        imageAlt="Humanitarian convoy"
                        eyebrow={t('convoyDecision.title')}
                        title={convoy.target_enclave}
                        titleId="convoy-decision-title"
                    />
                )}
                <div className="px-5 pb-5">

                <div id="convoy-decision-summary" className="grid grid-cols-3 gap-2 py-4">
                    <div className="rounded border border-[rgba(180,160,130,0.14)] bg-[rgba(180,160,130,0.06)] p-2">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-secondary/70">{t('convoyDecision.route')}</div>
                        <div className="mt-1 text-sm font-semibold text-white">
                            {getPlayerSafePoliticalFactionName(convoy.route_faction)}
                        </div>
                    </div>
                    <div className="rounded border border-[rgba(180,160,130,0.14)] bg-[rgba(180,160,130,0.06)] p-2">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-secondary/70">{t('convoyDecision.supply')}</div>
                        <div className="mt-1 text-sm font-semibold text-white">{convoy.supply_amount}</div>
                    </div>
                    <div className="rounded border border-[rgba(180,160,130,0.14)] bg-[rgba(180,160,130,0.06)] p-2">
                        <div className="text-[9px] uppercase tracking-[0.14em] text-text-secondary/70">{t('convoyDecision.staged')}</div>
                        <div className="mt-1 text-sm font-semibold text-white capitalize">{convoy.decision ?? t('common.none')}</div>
                    </div>
                </div>

                <p className="text-[12px] leading-relaxed text-text-secondary">
                    {t('convoyDecision.body')}
                </p>

                {error && (
                    <div role="alert" className="mt-3 rounded border border-red-400/35 bg-red-500/12 px-3 py-2 text-[12px] text-red-200">
                        {error}
                    </div>
                )}

                <div className="mt-5 grid grid-cols-3 gap-2">
                    {(Object.keys(DECISION_COPY) as ConvoyDecision[]).map((decision) => {
                        const copy = DECISION_COPY[decision];
                        const disabled = pendingDecision !== null || convoy.decision === decision;
                        return (
                            <button
                                key={decision}
                                type="button"
                                onClick={() => void handleDecision(decision)}
                                disabled={disabled}
                                className={`rounded-md border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${copy.className}`}
                            >
                                <div className="text-[11px] font-bold uppercase tracking-[0.12em]">
                                    {pendingDecision === decision ? t('convoyDecision.staging') : t(copy.labelKey)}
                                </div>
                                <div className="mt-1 text-[10px] leading-snug opacity-80">{t(copy.detailKey)}</div>
                            </button>
                        );
                    })}
                </div>
                </div>
            </div>
        </Modal>
    );
}

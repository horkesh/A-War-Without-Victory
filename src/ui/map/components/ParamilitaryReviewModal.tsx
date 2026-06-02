import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';

type ParamilitaryDecision = 'allow' | 'deny';

interface ParamilitaryReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function modeLabel(mode: string | undefined): string {
    if (mode === 'offensive') return 'Offensive sweep';
    return 'Rear-area consolidation';
}

export function ParamilitaryReviewModal({ isOpen, onClose }: ParamilitaryReviewModalProps) {
    const ipc = useIPC();
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);
    const loadSave = useGameStore((s) => s.loadSave);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const requests = useMemo(() => state?.pendingParamilitaryRequests ?? [], [state?.pendingParamilitaryRequests]);
    const [decisions, setDecisions] = useState<Record<string, ParamilitaryDecision>>({});
    const [submitting, setSubmitting] = useState(false);
    const headerImage = getDecisionHeaderForFamily('paramilitary_request');

    useEffect(() => {
        if (!isOpen) return;
        const initial: Record<string, ParamilitaryDecision> = {};
        for (const request of requests) {
            if (request.decision === 'allow' || request.decision === 'deny') {
                initial[request.target_osid] = request.decision;
            }
        }
        setDecisions(initial);
    }, [isOpen, requests]);

    const allDecided = requests.length > 0 && requests.every((request) => decisions[request.target_osid]);
    const totalStrength = requests.reduce((sum, request) => sum + request.strength, 0);

    const choose = (targetOsid: string, decision: ParamilitaryDecision) => {
        setDecisions((current) => ({ ...current, [targetOsid]: decision }));
    };

    const chooseAll = (decision: ParamilitaryDecision) => {
        const next: Record<string, ParamilitaryDecision> = {};
        for (const request of requests) next[request.target_osid] = decision;
        setDecisions(next);
    };

    const submit = async () => {
        if (!allDecided || submitting) return;
        if (!ipc.isAvailable) {
            setLoadError('Desktop IPC not available for paramilitary review.');
            return;
        }
        setSubmitting(true);
        try {
            const result = await ipc.resolveParamilitaryRequests(
                requests.map((request) => ({
                    target_osid: request.target_osid,
                    decision: decisions[request.target_osid],
                })),
            );
            if (!result.ok) {
                setLoadError(result.error ?? 'Failed to resolve paramilitary requests.');
                return;
            }
            if (result.stateJson) {
                await loadSave(result.stateJson);
            }
            onClose();
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            zIndex={Z.CRITICAL_MODAL}
            ariaLabelledBy="paramilitary-review-title"
            backdropClassName="bg-black/75 backdrop-blur-sm"
            panelClassName="w-[min(92vw,680px)] max-h-[88vh] overflow-hidden rounded-lg border border-red-500/35 bg-panel-bg text-text-primary shadow-2xl"
        >
            <div className="flex max-h-[88vh] flex-col">
                {headerImage && (
                    <DecisionModalImageHeader
                        imageUrl={headerImage}
                        imageAlt="Internal security desk"
                        eyebrow="Presidential Decision Required"
                        title="Paramilitary Authorization"
                        titleId="paramilitary-review-title"
                        description="Approving these deployments can capture territory quickly, but paramilitary operations carry a serious risk of war crimes, civilian casualties, and international consequences."
                        accentClassName="text-red-300"
                    />
                )}
                <div className="border-b border-panel-border bg-red-950/25 px-5 py-3">
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                        <span className="rounded border border-panel-border bg-panel-card px-2 py-1">
                            {requests.length} request{requests.length === 1 ? '' : 's'}
                        </span>
                        <span className="rounded border border-panel-border bg-panel-card px-2 py-1">
                            estimated strength {totalStrength}
                        </span>
                    </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
                    {requests.length === 0 ? (
                        <div className="rounded border border-panel-border bg-panel-card px-3 py-3 text-[12px] text-text-secondary">
                            No paramilitary requests are pending.
                        </div>
                    ) : requests.map((request) => {
                        const selected = decisions[request.target_osid];
                        const place = getOsidDisplayName(request.target_osid, osidNameMap);
                        return (
                            <div key={request.target_osid} className="rounded border border-panel-border bg-panel-card px-3 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[12px] font-bold text-text-primary">{place}</div>
                                        <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-text-secondary">
                                            {getPlayerSafeMilitaryFactionName(request.faction)} - {modeLabel(request.mode)} - strength {request.strength}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => choose(request.target_osid, 'deny')}
                                            className={`rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                                                selected === 'deny'
                                                    ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200'
                                                    : 'border-panel-border bg-panel-bg text-text-secondary hover:text-text-primary'
                                            }`}
                                        >
                                            Deny
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => choose(request.target_osid, 'allow')}
                                            className={`rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                                                selected === 'allow'
                                                    ? 'border-red-400/75 bg-red-500/15 text-red-200'
                                                    : 'border-panel-border bg-panel-bg text-text-secondary hover:text-text-primary'
                                            }`}
                                        >
                                            Allow
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-panel-border bg-panel-card/70 px-5 py-3">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => chooseAll('deny')}
                            disabled={requests.length === 0 || submitting}
                            className="rounded border border-panel-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary disabled:opacity-40"
                        >
                            Deny All
                        </button>
                        <button
                            type="button"
                            onClick={() => chooseAll('allow')}
                            disabled={requests.length === 0 || submitting}
                            className="rounded border border-red-500/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                        >
                            Allow All
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded border border-panel-border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary disabled:opacity-40"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => void submit()}
                            disabled={!allDecided || submitting}
                            className="rounded border border-accent-gold/55 bg-accent-gold/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-accent-gold hover:bg-accent-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? 'Submitting...' : 'Submit Decisions'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

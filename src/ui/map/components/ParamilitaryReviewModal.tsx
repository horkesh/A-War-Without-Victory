import { useEffect, useMemo, useState } from 'react';
import { PARAMILITARY_TARGET_AVG_POPULATION } from '../../../state/formation_constants';
import { Modal } from '../../shared/Modal';
import { Z } from '../../shared/zIndex';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';
import { getDecisionHeaderForFamily } from '../data/presidentialDeskAssets';
import { DecisionModalImageHeader } from './DecisionModalImageHeader';
import { t, useLocale, type Locale } from '../i18n';

type ParamilitaryDecision = 'allow' | 'deny';
type ParamilitaryPolicy = 'always_allow' | 'always_deny';

interface ParamilitaryReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function modeLabel(mode: string | undefined): string {
    if (mode === 'offensive') return t('paramilitaryReview.mode.offensive');
    return t('paramilitaryReview.mode.rearArea');
}

function formatNumber(value: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'bcs' ? 'bs-BA' : 'en-US', {
        maximumFractionDigits: Number.isInteger(value) ? 0 : 20,
    }).format(value);
}

function formatStandingPoints(value: number, locale: Locale): string {
    const exact = value.toFixed(4).replace(/\.?0+$/, '');
    return locale === 'bcs' ? exact.replace('.', ',') : exact;
}

function paramilitaryStandingPenalty(deploymentCount: number): number {
    if (deploymentCount >= 10) return (deploymentCount * 5) + 10;
    if (deploymentCount >= 4) return deploymentCount * 4;
    return deploymentCount * 2;
}

function currentDeploymentCount(state: ReturnType<typeof useGameStore.getState>['loadedGameState'], faction: string): number {
    const counts = state?.rawGameState?.paramilitary_deployment_count as Record<string, unknown> | undefined;
    const value = counts?.[faction];
    return typeof value === 'number' && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : 0;
}

function targetPopulation(properties: Record<string, unknown> | undefined): number | null {
    const value = properties?.population_total;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function ParamilitaryReviewModal({ isOpen, onClose }: ParamilitaryReviewModalProps) {
    const [locale] = useLocale();
    const ipc = useIPC();
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);
    const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
    const loadSave = useGameStore((s) => s.loadSave);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const requests = useMemo(
        () => (state?.pendingParamilitaryRequests ?? [])
            .filter((request) => !isFinalParamilitaryDecision(request.decision)),
        [state?.pendingParamilitaryRequests],
    );
    const [decisions, setDecisions] = useState<Record<string, ParamilitaryDecision>>({});
    const [standingPolicy, setStandingPolicy] = useState<ParamilitaryPolicy | null>(null);
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
        setStandingPolicy(null);
    }, [isOpen, requests]);

    const allDecided = requests.length > 0 && requests.every((request) => decisions[request.target_osid]);
    const totalStrength = requests.reduce((sum, request) => sum + request.strength, 0);

    const choose = (targetOsid: string, decision: ParamilitaryDecision) => {
        setStandingPolicy(null);
        setDecisions((current) => ({ ...current, [targetOsid]: decision }));
    };

    const chooseAll = (decision: ParamilitaryDecision) => {
        const next: Record<string, ParamilitaryDecision> = {};
        for (const request of requests) next[request.target_osid] = decision;
        setStandingPolicy(null);
        setDecisions(next);
    };

    const chooseStandingPolicy = (policy: ParamilitaryPolicy) => {
        const decision: ParamilitaryDecision = policy === 'always_allow' ? 'allow' : 'deny';
        const next: Record<string, ParamilitaryDecision> = {};
        for (const request of requests) next[request.target_osid] = decision;
        setStandingPolicy(policy);
        setDecisions(next);
    };

    const submit = async () => {
        if (!allDecided || submitting) return;
        if (!ipc.isAvailable) {
            setLoadError(t('paramilitaryReview.error.ipcUnavailable'));
            return;
        }
        setSubmitting(true);
        try {
            const payload = requests.map((request) => ({
                target_osid: request.target_osid,
                decision: decisions[request.target_osid],
            }));
            const result = standingPolicy
                ? await ipc.resolveParamilitaryRequests(payload, { policy: standingPolicy })
                : await ipc.resolveParamilitaryRequests(payload);
            if (!result.ok) {
                setLoadError(result.error ?? t('paramilitaryReview.error.resolveFailed'));
                return;
            }
            const stateJson = await ipc.getCurrentGameState();
            if (!stateJson) {
                setLoadError(t('paramilitaryReview.error.stateUnavailable'));
                return;
            }
            await loadSave(stateJson);
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
                        imageAlt={t('paramilitaryReview.imageAlt')}
                        eyebrow={t('paramilitaryReview.eyebrow')}
                        title={t('paramilitaryReview.title')}
                        titleId="paramilitary-review-title"
                        description={t('paramilitaryReview.description')}
                        accentClassName="text-red-300"
                    />
                )}
                <div className="border-b border-panel-border bg-red-950/25 px-5 py-3">
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                        <span className="rounded border border-panel-border bg-panel-card px-2 py-1">
                            {requests.length === 1
                                ? t('paramilitaryReview.requestCount', { count: requests.length })
                                : t('paramilitaryReview.requestCountPlural', { count: requests.length })}
                        </span>
                        <span className="rounded border border-panel-border bg-panel-card px-2 py-1">
                            {t('paramilitaryReview.estimatedStrength', { strength: totalStrength })}
                        </span>
                    </div>
                    <div className="mt-2 text-[12px] leading-snug text-text-secondary">
                        {t('paramilitaryReview.packetHint')}
                    </div>
                    <div className="mt-1 text-[12px] leading-snug text-text-secondary">
                        {t('paramilitaryReview.policyHint')}
                    </div>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
                    {requests.length === 0 ? (
                        <div className="rounded border border-panel-border bg-panel-card px-3 py-3 text-[12px] text-text-secondary">
                            {t('paramilitaryReview.empty')}
                        </div>
                    ) : requests.map((request) => {
                        const selected = decisions[request.target_osid];
                        const place = getOsidDisplayName(request.target_osid, osidNameMap);
                        const population = targetPopulation(osidPropertiesMap?.[request.target_osid]);
                        const previousDeployments = currentDeploymentCount(state, request.faction);
                        const deploymentImpact = paramilitaryStandingPenalty(previousDeployments + 1)
                            - paramilitaryStandingPenalty(previousDeployments);
                        const civilianRisk = Number.isFinite(request.estimated_civilian_risk)
                            ? request.estimated_civilian_risk
                            : null;
                        const captureImpact = civilianRisk == null
                            ? null
                            : deploymentImpact + (civilianRisk / PARAMILITARY_TARGET_AVG_POPULATION);
                        return (
                            <div key={request.target_osid} className="rounded border border-panel-border bg-panel-card px-3 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-bold text-text-primary">{place}</div>
                                        <div className="mt-1 text-xs uppercase tracking-[0.08em] text-text-secondary">
                                            {t('paramilitaryReview.requestMeta', {
                                                faction: getPlayerSafeMilitaryFactionName(request.faction),
                                                mode: modeLabel(request.mode),
                                                strength: request.strength,
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => choose(request.target_osid, 'deny')}
                                            className={`rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                                                selected === 'deny'
                                                    ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200'
                                                    : 'border-panel-border bg-panel-bg text-text-secondary hover:text-text-primary'
                                            }`}
                                        >
                                            {t('paramilitaryReview.deny')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => choose(request.target_osid, 'allow')}
                                            className={`rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                                                selected === 'allow'
                                                    ? 'border-red-400/75 bg-red-500/15 text-red-200'
                                                    : 'border-panel-border bg-panel-bg text-text-secondary hover:text-text-primary'
                                            }`}
                                        >
                                            {t('paramilitaryReview.allow')}
                                        </button>
                                    </div>
                                </div>
                                <div
                                    className="mt-3 border-t border-panel-border/80 pt-3"
                                    data-testid={`paramilitary-consequences-${request.target_osid}`}
                                >
                                    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                                        <div>
                                            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                                                {t('paramilitaryReview.targetPopulation')}
                                            </dt>
                                            <dd className="mt-1 text-[13px] leading-snug text-text-primary">
                                                {population == null
                                                    ? t('paramilitaryReview.targetPopulationUnavailable')
                                                    : t('paramilitaryReview.targetPopulationValue', {
                                                        population: formatNumber(population, locale),
                                                    })}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                                                {t('paramilitaryReview.civilianCasualties')}
                                            </dt>
                                            <dd className="mt-1 text-[13px] leading-snug text-red-200">
                                                {civilianRisk == null
                                                    ? t('paramilitaryReview.projectionUnavailable')
                                                    : formatNumber(civilianRisk, locale)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                                                {t('paramilitaryReview.warCrimeIncrement')}
                                            </dt>
                                            <dd className="mt-1 text-[13px] leading-snug text-red-200">
                                                {t('paramilitaryReview.warCrimeIncrementValue')}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                                                {t('paramilitaryReview.internationalStandingImpact')}
                                            </dt>
                                            <dd className="mt-1 text-[13px] leading-snug text-red-200">
                                                {captureImpact == null
                                                    ? t('paramilitaryReview.internationalStandingDeploymentOnly', {
                                                        deploymentImpact: formatStandingPoints(deploymentImpact, locale),
                                                    })
                                                    : t('paramilitaryReview.internationalStandingValue', {
                                                        deploymentImpact: formatStandingPoints(deploymentImpact, locale),
                                                        captureImpact: formatStandingPoints(captureImpact, locale),
                                                    })}
                                            </dd>
                                        </div>
                                    </dl>
                                    <div className="mt-3 border-t border-panel-border/80 pt-3">
                                        <div className="text-xs font-bold uppercase tracking-[0.08em] text-text-secondary">
                                            {t('paramilitaryReview.sourceContextLabel')}
                                        </div>
                                        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                                            {t('paramilitaryReview.sourceContext', {
                                                modelPopulation: formatNumber(PARAMILITARY_TARGET_AVG_POPULATION, locale),
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-panel-border bg-panel-card/70 px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            data-testid="paramilitary-deny-packet"
                            onClick={() => chooseAll('deny')}
                            disabled={requests.length === 0 || submitting}
                            className="rounded border border-panel-border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary disabled:opacity-40"
                        >
                            {t('paramilitaryReview.denyPacket')}
                        </button>
                        <button
                            type="button"
                            data-testid="paramilitary-allow-packet"
                            onClick={() => chooseAll('allow')}
                            disabled={requests.length === 0 || submitting}
                            className="rounded border border-red-500/35 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                        >
                            {t('paramilitaryReview.allowPacket')}
                        </button>
                        <button
                            type="button"
                            data-testid="paramilitary-always-deny"
                            onClick={() => chooseStandingPolicy('always_deny')}
                            disabled={requests.length === 0 || submitting}
                            className={`rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-40 ${
                                standingPolicy === 'always_deny'
                                    ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200'
                                    : 'border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/10'
                            }`}
                        >
                            {t('paramilitaryReview.alwaysDeny')}
                        </button>
                        <button
                            type="button"
                            data-testid="paramilitary-always-allow"
                            onClick={() => chooseStandingPolicy('always_allow')}
                            disabled={requests.length === 0 || submitting}
                            className={`rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-40 ${
                                standingPolicy === 'always_allow'
                                    ? 'border-red-400/75 bg-red-500/15 text-red-200'
                                    : 'border-red-500/35 text-red-300 hover:bg-red-500/10'
                            }`}
                        >
                            {t('paramilitaryReview.alwaysAllow')}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded border border-panel-border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary disabled:opacity-40"
                        >
                            {t('paramilitaryReview.close')}
                        </button>
                        <button
                            type="button"
                            data-testid="paramilitary-submit-decisions"
                            onClick={() => void submit()}
                            disabled={!allDecided || submitting}
                            className="rounded border border-accent-gold/55 bg-accent-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-accent-gold hover:bg-accent-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? t('paramilitaryReview.submitting') : t('paramilitaryReview.submit')}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function isFinalParamilitaryDecision(decision: unknown): boolean {
    return decision === 'allow' || decision === 'deny' || decision === 'regular';
}

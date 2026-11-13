/**
 * Phase 3 — G2 Assessment, in the planning surface's detail column.
 * Snapshot figures, then two player-facing tabs: narrative assessment + map legend.
 *
 * Note: RawIntelTab is intentionally excluded from normal play (debug-only — not shown
 * in normal play). The "Assessment" tab (NarrativeTab) is the canonical player-facing
 * G-2 briefing surface. See DEBUG_SURFACE_POLICY.md and PLAYER_VISIBLE_STATE.md.
 */
import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPlanState } from './types';
import type { PredictionResult } from './usePrediction';
import { NarrativeTab } from './NarrativeTab';
import { MapLegendTab } from './MapLegendTab';
import { formatCorpsDisplayName, turnToISODate } from '../../utils/formatters';
import { resolveCorpsCommanderDisplay } from '../../utils/officerUtils';
import { t } from '../../i18n';
import { formatPlanningPredictedOutcome } from './planningAssessmentLabels';
import {
    SurfaceDetailFooter,
    SurfaceFigure,
    SurfacePanel,
    SurfaceSection,
    SURFACE_LABEL_MUTED,
    SURFACE_PRIMARY_BUTTON,
} from '../surface/Surface';
import { OpsNotice, OpsPhaseBody, opsOptionClass } from './opsSurface';

// Two player-facing tabs — raw_intel demoted to debug-only
type G2Tab = 'assessment' | 'map_legend';

interface G2PhaseProps {
    plan: OpsPlanState;
    prediction: PredictionResult | null;
    loading: boolean;
    error: string | null;
    corpsId: string;
    onAdvance: () => void;
}

export function G2Phase({ plan, prediction, loading, error, corpsId, onAdvance }: G2PhaseProps) {
    const [activeTab, setActiveTab] = useState<G2Tab>('assessment');
    const loadedGameState = useGameStore((s) => s.loadedGameState);

    const { corpsName, faction, commanderName, date } = useMemo(() => {
        if (!loadedGameState || !corpsId) return { corpsName: '', faction: '', commanderName: '', date: '' };
        const corpsFormation = loadedGameState.formations.find((f) => f.id === corpsId);
        const fac = corpsFormation?.faction ?? '';
        const name = corpsFormation
            ? formatCorpsDisplayName(corpsFormation.name, corpsFormation.id)
            : corpsId;
        const commander = resolveCorpsCommanderDisplay(corpsId, fac, loadedGameState);
        return { corpsName: name, faction: fac, commanderName: commander?.name ?? t('opsPlanning.g2.notAvailable'), date: turnToISODate(loadedGameState.turn ?? 0) };
    }, [loadedGameState, corpsId]);

    const hasObjectives = plan.axes.some((a) => a.objectives.length > 0);
    const isLowIntel = prediction?.overall.intelConfidence != null && prediction.overall.intelConfidence < 0.4;
    const totalObjectives = plan.axes.reduce((sum, axis) => sum + axis.objectives.length, 0);
    const totalAssignedBrigades = plan.axes.reduce((sum, axis) => sum + axis.brigadeIds.length, 0);
    const canProceed = !loading && (prediction != null || error != null);
    const proceedLabel = loading
        ? t('opsPlanning.g2.proceedPreparing')
        : !canProceed
            ? t('opsPlanning.g2.proceedAwaiting')
            : isLowIntel
                ? t('opsPlanning.g2.proceedLowIntel')
                : t('opsPlanning.g2.proceedAuthorization');

    const tabClass = (active: boolean) =>
        `h-10 rounded-md border px-4 text-[15px] font-semibold transition ${opsOptionClass(active)}`;

    return (
        <div
            className="flex min-h-0 flex-1 flex-col"
            data-testid="ops-planning-phase-panel"
            data-phase="g2_assessment"
        >
            <OpsPhaseBody>
                {/* Assessment snapshot */}
                <SurfaceSection
                    label={t('opsPlanning.g2.snapshot')}
                    action={<span className={SURFACE_LABEL_MUTED}>{t('opsPlanning.g2.preAuthorization')}</span>}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <SurfaceFigure label={t('opsPlanning.g2.corps')} value={corpsName || corpsId} />
                        <SurfaceFigure label={t('opsPlanning.g2.date')} value={date || t('opsPlanning.g2.notAvailable')} />
                        <SurfaceFigure label={t('opsPlanning.phase.objectives')} value={totalObjectives} />
                        <SurfaceFigure label={t('opsPlanning.phase.brigades')} value={totalAssignedBrigades} />
                        {prediction && (
                            <SurfaceFigure
                                className="col-span-2"
                                label={t('opsPlanning.g2.predictedOutcome')}
                                value={prediction.overall.predictedOutcome == null
                                    ? t('corpsFront.unreported')
                                    : formatPlanningPredictedOutcome(prediction.overall.predictedOutcome)}
                            />
                        )}
                    </div>
                </SurfaceSection>

                {/* G-2 report: staff assessment or the map legend */}
                <section className="flex flex-col gap-3" aria-label={t('opsPlanning.surface.g2Report')}>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('assessment')}
                            aria-pressed={activeTab === 'assessment'}
                            className={tabClass(activeTab === 'assessment')}
                        >
                            {t('opsPlanning.g2.tab.assessment')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('map_legend')}
                            aria-pressed={activeTab === 'map_legend'}
                            className={tabClass(activeTab === 'map_legend')}
                        >
                            {t('opsPlanning.g2.tab.mapLegend')}
                        </button>
                    </div>

                    <SurfacePanel className="flex flex-col gap-4 px-6 py-5">
                        {loading && (
                            <div className="flex flex-col gap-3" aria-hidden="true">
                                {[75, 90, 65, 82, 70].map((w, i) => (
                                    <div key={i} className="h-4 animate-pulse rounded bg-[#262b35]" style={{ width: `${w}%` }} />
                                ))}
                            </div>
                        )}

                        {error && (
                            <OpsNotice tone="danger" role="alert">
                                <div className="font-semibold">{t('opsPlanning.g2.errorTitle')}</div>
                                <div>{t('opsPlanning.g2.errorBody')}</div>
                            </OpsNotice>
                        )}

                        {!loading && !error && !prediction && !hasObjectives && (
                            <p className="m-0 text-[17px] text-[#c2b69c]">{t('opsPlanning.g2.completePlan')}</p>
                        )}

                        {!loading && !error && !prediction && hasObjectives && (
                            <p className="m-0 text-[17px] text-[#c2b69c]">{t('opsPlanning.g2.awaitingPrediction')}</p>
                        )}

                        {/* WP3c: Map Legend tab */}
                        {activeTab === 'map_legend' && <MapLegendTab />}

                        {!loading && prediction && activeTab === 'assessment' && (
                            <NarrativeTab
                                prediction={prediction}
                                commanderName={commanderName}
                                corpsName={corpsName}
                                faction={faction}
                                date={date}
                            />
                        )}
                    </SurfacePanel>
                </section>
            </OpsPhaseBody>

            <SurfaceDetailFooter>
                <button
                    type="button"
                    onClick={onAdvance}
                    disabled={!canProceed}
                    className={isLowIntel
                        ? 'h-14 rounded-md border border-amber-300/60 bg-[#2a2416] px-6 text-[18px] font-bold text-amber-100 transition hover:bg-[#352d1a] disabled:cursor-default disabled:opacity-45'
                        : SURFACE_PRIMARY_BUTTON}
                >
                    {proceedLabel}
                </button>
            </SurfaceDetailFooter>
        </div>
    );
}

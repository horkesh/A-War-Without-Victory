/**
 * Phase 3 — G2 Assessment clipboard.
 * Slides in from right. Three tabs: narrative assessment + raw intel + map legend.
 */
import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPlanState } from './types';
import type { PredictionResult } from './usePrediction';
import { NarrativeTab } from './NarrativeTab';
import { RawIntelTab } from './RawIntelTab';
import { MapLegendTab } from './MapLegendTab';
import { formatCorpsDisplayName, turnToISODate } from '../../utils/formatters';

// WP3c: Three tabs
type G2Tab = 'assessment' | 'raw_intel' | 'map_legend';

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
        const commander = (loadedGameState.namedOfficerData ?? []).find(
            (o) => o.assigned_corps_id === corpsId && o.acting_commander
        );
        return { corpsName: name, faction: fac, commanderName: commander?.name ?? 'N/A', date: turnToISODate(loadedGameState.turn ?? 0) };
    }, [loadedGameState, corpsId]);

    const hasObjectives = plan.axes.some((a) => a.objectives.length > 0);
    const isLowIntel = prediction && prediction.overall.intelConfidence < 0.4;
    const totalObjectives = plan.axes.reduce((sum, axis) => sum + axis.objectives.length, 0);
    const totalAssignedBrigades = plan.axes.reduce((sum, axis) => sum + axis.brigadeIds.length, 0);

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Assessment snapshot — left side */}
            <div className="absolute top-16 left-4 w-[380px] pointer-events-auto
                            rounded-lg border border-[rgba(180,160,130,0.16)]
                            bg-[rgba(20,18,15,0.9)] backdrop-blur-xl p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-gold">
                        G2 Snapshot
                    </div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-text-secondary/70">
                        Pre-Authorization
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                        <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Corps</div>
                        <div className="text-[10px] font-bold text-white truncate">{corpsName || corpsId}</div>
                    </div>
                    <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                        <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Date</div>
                        <div className="text-[10px] font-bold text-white">{date || 'N/A'}</div>
                    </div>
                    <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                        <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Objectives</div>
                        <div className="text-[10px] font-bold text-white">{totalObjectives}</div>
                    </div>
                    <div className="rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                        <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Brigades</div>
                        <div className="text-[10px] font-bold text-white">{totalAssignedBrigades}</div>
                    </div>
                </div>
                {prediction && (
                    <div className="mt-2 rounded border border-[rgba(180,160,130,0.16)] bg-[rgba(180,160,130,0.06)] px-2 py-1.5">
                        <div className="text-[7px] uppercase tracking-[0.18em] text-text-secondary/70">Predicted Outcome</div>
                        <div className="text-[10px] font-bold text-white">{prediction.overall.predictedOutcome}</div>
                    </div>
                )}
            </div>

            {/* Clipboard — right side (WP3a: widened from 360px to 480px) */}
            <div className="absolute top-16 right-4 bottom-4 w-[620px] pointer-events-auto
                            flex flex-col overflow-hidden">
                {/* Binder clip */}
                <div className="h-8 bg-[#4a4238] rounded-t-lg flex items-center justify-center relative">
                    <div className="w-16 h-3 bg-[#6a6258] rounded-sm border border-[#3a3228]" />
                </div>

                {/* Paper body (WP3b: WCAG contrast fix — lighter background) */}
                <div className="flex-1 overflow-y-auto bg-[#faf6ef] rounded-b-lg border-x border-b border-[#c0b090] p-4"
                     style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23c0b09020\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}>

                    {/* Tab buttons */}
                    <div className="flex gap-1 mb-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('assessment')}
                            className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                                ${activeTab === 'assessment'
                                    ? 'bg-[#3a3228] text-[#faf6ef]'
                                    : 'bg-[#d6ccb7] text-[#4a4238] hover:bg-[#c0b090]'
                                }`}
                        >
                            Assessment
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('raw_intel')}
                            className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                                ${activeTab === 'raw_intel'
                                    ? 'bg-[#3a3228] text-[#faf6ef]'
                                    : 'bg-[#d6ccb7] text-[#4a4238] hover:bg-[#c0b090]'
                                }`}
                        >
                            Raw Intel
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('map_legend')}
                            className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                                ${activeTab === 'map_legend'
                                    ? 'bg-[#3a3228] text-[#faf6ef]'
                                    : 'bg-[#d6ccb7] text-[#4a4238] hover:bg-[#c0b090]'
                                }`}
                        >
                            Map Legend
                        </button>
                    </div>

                    {/* Content */}
                    {loading && (
                        <div className="space-y-3">
                            {[75, 90, 65, 82, 70].map((w, i) => (
                                <div key={i} className="h-3 bg-[#c0b090]/30 rounded animate-pulse"
                                     style={{ width: `${w}%` }} />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="text-[10px] text-red-600 bg-red-100 rounded p-2">
                            {error}
                        </div>
                    )}

                    {!loading && !error && !prediction && !hasObjectives && (
                        <div className="text-[10px] text-[#4a4238] italic text-center py-8">
                            Complete your plan to generate assessment
                        </div>
                    )}

                    {!loading && !error && !prediction && hasObjectives && (
                        <div className="text-[10px] text-[#4a4238] italic text-center py-8">
                            Awaiting G2 prediction data...
                        </div>
                    )}

                    {/* WP3c: Map Legend tab */}
                    {activeTab === 'map_legend' && <MapLegendTab />}

                    {!loading && prediction && activeTab !== 'map_legend' && (
                        activeTab === 'assessment'
                            ? <NarrativeTab
                                prediction={prediction}
                                commanderName={commanderName}
                                corpsName={corpsName}
                                faction={faction}
                                date={date}
                              />
                            : <RawIntelTab prediction={prediction} />
                    )}
                </div>

                {/* Action button — below clipboard */}
                <div className="mt-2 flex justify-end">
                    <button
                        type="button"
                        onClick={onAdvance}
                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors border
                            ${isLowIntel
                                ? 'bg-amber-400/20 text-amber-400 border-amber-400/20 hover:bg-amber-400/30'
                                : 'bg-accent-gold/20 text-accent-gold border-accent-gold/20 hover:bg-accent-gold/30'
                            }`}
                    >
                        {isLowIntel ? 'Proceed Despite Low Intel \u2192' : 'Proceed to Authorization \u2192'}
                    </button>
                </div>
            </div>
        </div>
    );
}

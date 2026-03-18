/**
 * Phase 3 — G2 Assessment clipboard.
 * Slides in from right. Two tabs: narrative assessment + raw intel.
 */
import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPlanState } from './types';
import type { PredictionResult } from './usePrediction';
import { NarrativeTab } from './NarrativeTab';
import { RawIntelTab } from './RawIntelTab';
import { formatCorpsDisplayName, turnToISODate } from '../../utils/formatters';

type G2Tab = 'assessment' | 'raw_intel';

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

    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Clipboard — right side */}
            <div className="absolute top-16 right-4 bottom-4 w-[360px] pointer-events-auto
                            flex flex-col overflow-hidden">
                {/* Binder clip */}
                <div className="h-8 bg-[#4a4238] rounded-t-lg flex items-center justify-center relative">
                    <div className="w-16 h-3 bg-[#6a6258] rounded-sm border border-[#3a3228]" />
                </div>

                {/* Paper body */}
                <div className="flex-1 overflow-y-auto bg-[#f0e8d8] rounded-b-lg border-x border-b border-[#c0b090] p-4"
                     style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23c0b09020\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}>

                    {/* Tab buttons */}
                    <div className="flex gap-1 mb-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('assessment')}
                            className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                                ${activeTab === 'assessment'
                                    ? 'bg-[#3a3228] text-[#f0e8d8]'
                                    : 'bg-[#d6ccb7] text-[#6a5e4e] hover:bg-[#c0b090]'
                                }`}
                        >
                            Assessment
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('raw_intel')}
                            className={`px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors
                                ${activeTab === 'raw_intel'
                                    ? 'bg-[#3a3228] text-[#f0e8d8]'
                                    : 'bg-[#d6ccb7] text-[#6a5e4e] hover:bg-[#c0b090]'
                                }`}
                        >
                            Raw Intel
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
                        <div className="text-[10px] text-[#6a5e4e] italic text-center py-8">
                            Complete your plan to generate assessment
                        </div>
                    )}

                    {!loading && !error && !prediction && hasObjectives && (
                        <div className="text-[10px] text-[#6a5e4e] italic text-center py-8">
                            Awaiting G2 prediction data...
                        </div>
                    )}

                    {!loading && prediction && (
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
                        {isLowIntel ? 'Proceed Despite Low Intel →' : 'Proceed to Authorization →'}
                    </button>
                </div>
            </div>
        </div>
    );
}

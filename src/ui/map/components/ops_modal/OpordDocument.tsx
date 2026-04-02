/**
 * OPORD document — formal Operations Order.
 * Cream paper style with faction army crest, sections in Bosnian/Serbian/Croatian.
 */
import type { OpsPlanState } from './types';
import { OP_TYPE_LABELS, TEMPO_LABELS, TOLERANCE_LABELS, FACTION_ARMY_HEADERS } from './types';
import type { PredictionResult } from './usePrediction';
import { buildOpordDisplayModel } from './opordDisplay';

interface OpordDocumentProps {
    plan: OpsPlanState;
    prediction: PredictionResult | null;
    commanderName: string;
    corpsName: string;
    faction: string;
    date: string;
    isStamped: boolean;
    osidDisplayNames: Record<string, string> | null;
}

export function OpordDocument({ plan, prediction, commanderName, corpsName, faction, date, isStamped, osidDisplayNames }: OpordDocumentProps) {
    const headers = FACTION_ARMY_HEADERS[faction] ?? FACTION_ARMY_HEADERS.RBiH;
    const allBrigades = plan.axes.flatMap((a) => a.brigadeIds);
    const display = buildOpordDisplayModel(plan, osidDisplayNames);
    const allObjectives = display.objectiveLabels;

    return (
        <div className="relative bg-[#f0e8d8] rounded-lg border border-[#c0b090] p-8 max-w-[600px] mx-auto shadow-2xl"
             style={{
                 fontFamily: "'Courier New', monospace",
                 backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'4\' height=\'4\' viewBox=\'0 0 4 4\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 3h1v1H1V3zm2-2h1v1H3V1z\' fill=\'%23c0b09020\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
             }}>
            {/* Stamp overlay */}
            {isStamped && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-[#2d6a4f] text-5xl font-bold uppercase tracking-[0.2em] rotate-[-20deg]
                                    border-4 border-[#2d6a4f] px-8 py-3 rounded-md opacity-60
                                    animate-[stamp_0.3s_ease-out]"
                         style={{ textShadow: '0 0 4px rgba(45,106,79,0.3)' }}>
                        ODOBRENO
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="text-center mb-6 space-y-1">
                <div className="text-3xl mb-2">{headers.crest}</div>
                <div className="text-[8px] uppercase tracking-[0.3em] text-[#5a4e3e]">{headers.republic}</div>
                <div className="text-[8px] uppercase tracking-[0.3em] text-[#5a4e3e]">{headers.army}</div>
                <div className="text-[10px] font-bold text-[#3a3228] mt-3">{corpsName}</div>
                <div className="text-[12px] font-bold text-[#3a3228] mt-2 border-b border-t border-[#c0b090] py-2">
                    OPERATIVNA ZAPOVIJED br. OZ/{date.replace(/-/g, '')}/01
                </div>
                <div className="text-[9px] text-[#6a5e4e]">{date}</div>
            </div>

            {/* Sections */}
            <div className="space-y-4">
                {/* 1. ZADAĆA (Mission) */}
                <div>
                    <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        1. ZADAĆA (Mission)
                    </div>
                    <div className="text-[10px] text-[#4a4238] leading-relaxed">
                        {plan.opName} — {OP_TYPE_LABELS[plan.opType]}.
                        Tempo: {TEMPO_LABELS[plan.tempo]}. Minimum outcome: {TOLERANCE_LABELS[plan.tolerance]}.
                        {plan.artilleryPreparation ? ' Artillery preparation authorized.' : ''}
                    </div>
                </div>

                {/* 2. SNAGE (Forces) */}
                <div>
                    <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        2. SNAGE (Forces)
                    </div>
                    <div className="text-[10px] text-[#4a4238] leading-relaxed">
                        {allBrigades.length} brigade{allBrigades.length !== 1 ? 's' : ''} assigned across{' '}
                        {plan.axes.length} axis/axes.
                        {prediction && (
                            <> Force ratio: {prediction.overall.forceRatio.toFixed(2)}:1.</>
                        )}
                    </div>
                </div>

                {/* 3. ZAPOVJEDNIK (Commander) */}
                <div>
                    <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        3. ZAPOVJEDNIK (Commander)
                    </div>
                    <div className="text-[10px] text-[#4a4238] leading-relaxed">
                        Operations Commander: <span className="font-bold">{commanderName}</span>
                    </div>
                </div>

                {/* 4. PROVEDBA (Execution) */}
                <div>
                    <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        4. PROVEDBA (Execution)
                    </div>
                    <div className="text-[10px] text-[#4a4238] leading-relaxed">
                        {display.axes.map((axis, idx) => (
                            <div key={axis.id} className="mb-1">
                                <span className="font-bold">Axis {idx + 1} ({axis.name}):</span>{' '}
                                {axis.brigadeCount} brigade{axis.brigadeCount !== 1 ? 's' : ''},{' '}
                                {axis.objectiveCount} objective{axis.objectiveCount !== 1 ? 's' : ''}.
                                {axis.stagingLabel && <> Staging: {axis.stagingLabel}.</>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. CILJEVI (Objectives) */}
                <div>
                    <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        5. CILJEVI (Objectives)
                    </div>
                    <div className="text-[10px] text-[#4a4238] leading-relaxed">
                        {allObjectives.length} objective{allObjectives.length !== 1 ? 's' : ''}.
                        {display.schwerpunktLabel && (
                            <> Schwerpunkt: <span className="font-bold">{display.schwerpunktLabel}</span>.</>
                        )}
                    </div>
                </div>

                {/* 6. LOGISTIKA (Logistics) */}
                <div>
                    <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                        6. LOGISTIKA (Logistics)
                    </div>
                    <div className="text-[10px] text-[#4a4238] leading-relaxed">
                        {prediction
                            ? `Estimated casualties: ${prediction.overall.estimatedCasualties.toLocaleString()}.`
                            : 'Casualty estimates pending G2 assessment.'
                        }
                    </div>
                </div>
            </div>

            {/* Signature */}
            <div className="border-t border-[#c0b090] mt-6 pt-4 flex justify-between items-end">
                <div>
                    <div className="text-[9px] text-[#6a5e4e]">Zapovjednik operacije</div>
                    <div className="text-[10px] font-bold text-[#3a3228] mt-1">{commanderName}</div>
                </div>
                {isStamped && (
                    <div className="text-[9px] text-[#6a5e4e]">
                        Datum odobrenja: {date}
                    </div>
                )}
            </div>
        </div>
    );
}

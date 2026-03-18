/**
 * Narrative assessment tab — military document format.
 * Renders prediction sections in typewriter font with classified stamp.
 */
import type { PredictionResult } from './usePrediction';

interface NarrativeTabProps {
    prediction: PredictionResult;
    commanderName: string;
    corpsName: string;
    faction: string;
    date: string;
}

const FACTION_HEADERS: Record<string, { republic: string; army: string }> = {
    RBiH: { republic: 'REPUBLIKA BOSNA I HERCEGOVINA', army: 'ARMIJA REPUBLIKE BOSNE I HERCEGOVINE' },
    RS: { republic: 'REPUBLIKA SRPSKA', army: 'VOJSKA REPUBLIKE SRPSKE' },
    HRHB: { republic: 'HRVATSKA REPUBLIKA HERCEG-BOSNA', army: 'HRVATSKO VIJEĆE OBRANE' },
};

export function NarrativeTab({ prediction, commanderName, corpsName, faction, date }: NarrativeTabProps) {
    const headers = FACTION_HEADERS[faction] ?? FACTION_HEADERS.RBiH;
    const sections = prediction.commanderAssessment?.sections ?? [];

    return (
        <div className="relative" style={{ fontFamily: "'Courier New', monospace" }}>
            {/* Classified stamp */}
            <div className="absolute top-4 right-4 rotate-[-12deg] text-red-600/20 text-2xl font-bold uppercase tracking-[0.3em]
                            border-2 border-red-600/20 px-3 py-1 rounded pointer-events-none select-none">
                OGRANIČENO
            </div>

            {/* Header block */}
            <div className="text-center mb-6 space-y-0.5">
                <div className="text-[9px] uppercase tracking-[0.3em] text-[#5a4e3e]">{headers.republic}</div>
                <div className="text-[9px] uppercase tracking-[0.3em] text-[#5a4e3e]">{headers.army}</div>
                <div className="text-[10px] font-bold text-[#3a3228] mt-2">{corpsName} — G-2 Odjel</div>
                <div className="text-[9px] text-[#6a5e4e]">
                    Ref: G2/{date.replace(/-/g, '')}/OPS • {date}
                </div>
            </div>

            <div className="border-t border-[#c0b090] mb-4" />

            {/* Sections */}
            {sections.length > 0 ? (
                sections.map((section, idx) => (
                    <div key={idx} className="mb-4">
                        <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">
                            {idx + 1}. {section.title}
                        </div>
                        <div className="text-[10px] text-[#4a4238] leading-relaxed whitespace-pre-wrap">
                            {section.content}
                        </div>
                    </div>
                ))
            ) : (
                // Fallback: generate from quantitative data
                <div className="space-y-4">
                    <div>
                        <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">1. NEPRIJATELJ (Enemy)</div>
                        <div className="text-[10px] text-[#4a4238] leading-relaxed">
                            Enemy forces in the area of operations are assessed at a force ratio of{' '}
                            <span className="font-bold">{prediction.overall.forceRatio.toFixed(2)}:1</span>.
                            Intel confidence: <span className="font-bold">{(prediction.overall.intelConfidence * 100).toFixed(0)}%</span>.
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">2. VLASTITE SNAGE (Own Forces)</div>
                        <div className="text-[10px] text-[#4a4238] leading-relaxed">
                            Estimated casualties for the planned operation: <span className="font-bold">{prediction.overall.estimatedCasualties}</span>.
                            Predicted outcome: <span className="font-bold">{prediction.overall.predictedOutcome}</span>.
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-[#3a3228] uppercase tracking-wider mb-1">3. PROCJENA (Assessment)</div>
                        <div className="text-[10px] text-[#4a4238] leading-relaxed">
                            Recommended action: <span className="font-bold">{prediction.overall.recommendedAction}</span>.
                        </div>
                    </div>
                </div>
            )}

            {/* Signature */}
            <div className="border-t border-[#c0b090] mt-6 pt-3">
                <div className="text-[9px] text-[#6a5e4e]">Načelnik G-2</div>
                <div className="text-[10px] font-bold text-[#3a3228] mt-1">{commanderName}</div>
            </div>
        </div>
    );
}

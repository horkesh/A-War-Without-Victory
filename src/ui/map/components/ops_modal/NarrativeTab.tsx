/**
 * Narrative assessment tab — military document format.
 * Renders prediction sections in typewriter font with classified stamp.
 */
import type { PredictionResult } from './usePrediction';
import { FACTION_ARMY_HEADERS } from './types';

interface NarrativeTabProps {
    prediction: PredictionResult;
    commanderName: string;
    corpsName: string;
    faction: string;
    date: string;
}

// WP3e: B/C/S to English translations
const BCS_TRANSLATIONS: Record<string, string> = {
    'NEPRIJATELJ': 'Enemy Forces',
    'VLASTITE SNAGE': 'Own Forces',
    'PROCJENA': 'Assessment',
    'ZAKLJU\u010CAK': 'Conclusion',
};

/** Add inline English translation if the title contains a known B/C/S term. */
function translateTitle(title: string): string {
    for (const [bcs, eng] of Object.entries(BCS_TRANSLATIONS)) {
        if (title.toUpperCase().includes(bcs)) {
            // Only add translation if not already present
            if (!title.includes(eng)) {
                return `${title} \u2014 ${eng}`;
            }
        }
    }
    return title;
}

export function NarrativeTab({ prediction, commanderName, corpsName, faction, date }: NarrativeTabProps) {
    const headers = FACTION_ARMY_HEADERS[faction] ?? FACTION_ARMY_HEADERS.RBiH;
    const sections = prediction.commanderAssessment?.sections ?? [];

    return (
        <div className="relative" style={{ fontFamily: "'Courier New', monospace" }}>
            {/* Classified stamp */}
            <div className="absolute top-4 right-4 rotate-[-12deg] text-red-600/20 text-2xl font-bold uppercase tracking-[0.3em]
                            border-2 border-red-600/20 px-3 py-1 rounded pointer-events-none select-none">
                OGRANI\u010CENO
            </div>

            {/* Header block — WP3b: darkened text colors for WCAG AA */}
            <div className="text-center mb-6 space-y-0.5">
                <div className="text-[9px] uppercase tracking-[0.3em] text-[#3a3228]">{headers.republic}</div>
                <div className="text-[9px] uppercase tracking-[0.3em] text-[#3a3228]">{headers.army}</div>
                <div className="text-[10px] font-bold text-[#1a1610] mt-2">{corpsName} \u2014 G-2 Odjel</div>
                <div className="text-[9px] text-[#4a4238]">
                    Ref: G2/{date.replace(/-/g, '')}/OPS \u2022 {date}
                </div>
            </div>

            <div className="border-t border-[#c0b090] mb-4" />

            {/* WP3d: Quick Assessment summary box */}
            <div className="mb-4 p-3 rounded border border-[#c0b090] bg-[#f0ead8]">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#1a1610] mb-2">Quick Assessment</div>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <span className="text-[#3a3228]">Force Ratio</span>
                    <span className="font-bold text-[#1a1610]">{prediction.overall.forceRatio.toFixed(1)}:1</span>
                    <span className="text-[#3a3228]">Intel Confidence</span>
                    <span className="font-bold text-[#1a1610]">{Math.round(prediction.overall.intelConfidence * 100)}%</span>
                    <span className="text-[#3a3228]">Predicted</span>
                    <span className="font-bold text-[#1a1610]">{prediction.overall.predictedOutcome}</span>
                    <span className="text-[#3a3228]">Recommendation</span>
                    <span className="font-bold text-[#1a1610]">{prediction.overall.recommendedAction}</span>
                </div>
            </div>

            {/* Sections — WP3b: darkened text + WP3e: inline translations */}
            {sections.length > 0 ? (
                sections.map((section, idx) => (
                    <div key={idx} className="mb-4">
                        <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            {idx + 1}. {translateTitle(section.title)}
                        </div>
                        <div className="text-[10px] text-[#2a2218] leading-relaxed whitespace-pre-wrap">
                            {section.content}
                        </div>
                    </div>
                ))
            ) : (
                // Fallback: generate from quantitative data
                <div className="space-y-4">
                    <div>
                        <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            1. NEPRIJATELJ \u2014 Enemy Forces
                        </div>
                        <div className="text-[10px] text-[#2a2218] leading-relaxed">
                            Enemy forces in the area of operations are assessed at a force ratio of{' '}
                            <span className="font-bold">{prediction.overall.forceRatio.toFixed(2)}:1</span>.
                            Intel confidence: <span className="font-bold">{(prediction.overall.intelConfidence * 100).toFixed(0)}%</span>.
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            2. VLASTITE SNAGE \u2014 Own Forces
                        </div>
                        <div className="text-[10px] text-[#2a2218] leading-relaxed">
                            Estimated casualties for the planned operation: <span className="font-bold">{prediction.overall.estimatedCasualties.toLocaleString()}</span>.
                            Predicted outcome: <span className="font-bold">{prediction.overall.predictedOutcome}</span>.
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            3. PROCJENA \u2014 Assessment
                        </div>
                        <div className="text-[10px] text-[#2a2218] leading-relaxed">
                            Recommended action: <span className="font-bold">{prediction.overall.recommendedAction}</span>.
                        </div>
                    </div>
                </div>
            )}

            {/* Signature */}
            <div className="border-t border-[#c0b090] mt-6 pt-3">
                <div className="text-[9px] text-[#4a4238]">Na\u010Delnik G-2</div>
                <div className="text-[10px] font-bold text-[#1a1610] mt-1">{commanderName}</div>
            </div>
        </div>
    );
}

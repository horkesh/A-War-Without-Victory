/**
 * Narrative assessment tab — military document format.
 * Renders prediction sections in typewriter font with classified stamp.
 */
import type { PredictionResult } from './usePrediction';
import { FACTION_ARMY_HEADERS } from './types';
import { getPlayerSafeOperationBalancePresentation } from '../../../../shared/playerSafeOperationBalance';
import { t } from '../../i18n';
import { formatPlanningPredictedOutcome, formatPlanningRecommendation } from './planningAssessmentLabels';

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
    const forceBalance = prediction.overall.forceRatio == null
        ? null
        : getPlayerSafeOperationBalancePresentation(prediction.overall.forceRatio);
    const predictedOutcomeLabel = prediction.overall.predictedOutcome == null
        ? t('corpsFront.unreported')
        : formatPlanningPredictedOutcome(prediction.overall.predictedOutcome);
    const recommendedActionLabel = formatPlanningRecommendation(prediction.overall.recommendedAction);

    return (
        <div className="relative" style={{ fontFamily: "'Courier New', monospace" }}>
            {/* Classified stamp */}
            <div className="absolute top-4 right-4 rotate-[-12deg] text-red-600/20 text-2xl font-bold uppercase tracking-[0.3em]
                            border-2 border-red-600/20 px-3 py-1 rounded pointer-events-none select-none">
                {t('opsPlanning.narrative.classified')}
            </div>

            {/* Header block — WP3b: darkened text colors for WCAG AA */}
            <div className="text-center mb-6 space-y-0.5">
                <div className="text-xs uppercase tracking-[0.3em] text-[#3a3228]">{headers.republic}</div>
                <div className="text-xs uppercase tracking-[0.3em] text-[#3a3228]">{headers.army}</div>
                <div className="text-xs font-bold text-[#1a1610] mt-2">{corpsName} \u2014 {t('opsPlanning.narrative.g2Office')}</div>
                <div className="text-xs text-[#4a4238]">
                    Ref: G2/{date.replace(/-/g, '')}/OPS \u2022 {date}
                </div>
            </div>

            <div className="border-t border-[#c0b090] mb-4" />

            {/* WP3d: Quick Assessment summary box */}
            <div className="mb-4 p-3 rounded border border-[#c0b090] bg-[#f0ead8]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#1a1610] mb-2">{t('opsPlanning.narrative.quickAssessment')}</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-[#3a3228]">{t('opsPlanning.narrative.forceBalance')}</span>
                    <span className={`font-bold uppercase ${forceBalance?.toneClass ?? 'text-[#1a1610]'}`}>{forceBalance?.label ?? t('corpsFront.unreported')}</span>
                    <span className="text-[#3a3228]">{t('opsPlanning.narrative.intelConfidence')}</span>
                    <span className="font-bold text-[#1a1610]">{prediction.overall.intelConfidence == null ? t('corpsFront.unreported') : `${Math.round(prediction.overall.intelConfidence * 100)}%`}</span>
                    <span className="text-[#3a3228]">{t('opsPlanning.narrative.predicted')}</span>
                    <span className="font-bold text-[#1a1610]">{predictedOutcomeLabel}</span>
                    <span className="text-[#3a3228]">{t('opsPlanning.narrative.recommendation')}</span>
                    <span className="font-bold text-[#1a1610]">{recommendedActionLabel}</span>
                </div>
            </div>

            {/* Sections — WP3b: darkened text + WP3e: inline translations */}
            {sections.length > 0 ? (
                sections.map((section, idx) => (
                    <div key={idx} className="mb-4">
                        <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            {idx + 1}. {translateTitle(section.title)}
                        </div>
                        <div className="text-xs text-[#2a2218] leading-relaxed whitespace-pre-wrap">
                            {section.content}
                        </div>
                    </div>
                ))
            ) : (
                // Fallback: generate from quantitative data
                <div className="space-y-4">
                    <div>
                        <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            {t('opsPlanning.narrative.enemyTitle')}
                        </div>
                        <div className="text-xs text-[#2a2218] leading-relaxed">
                            {t('opsPlanning.narrative.enemyLine', {
                                summary: forceBalance?.summary ?? t('corpsFront.unreported'),
                                confidence: prediction.overall.intelConfidence == null ? t('corpsFront.unreported') : (prediction.overall.intelConfidence * 100).toFixed(0),
                            })}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            {t('opsPlanning.narrative.ownTitle')}
                        </div>
                        <div className="text-xs text-[#2a2218] leading-relaxed">
                            {t('opsPlanning.narrative.ownLine', {
                                casualties: prediction.overall.estimatedCasualties == null ? t('corpsFront.unreported') : prediction.overall.estimatedCasualties.toLocaleString(),
                                outcome: predictedOutcomeLabel,
                            })}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-[#1a1610] uppercase tracking-wider mb-1">
                            {t('opsPlanning.narrative.assessmentTitle')}
                        </div>
                        <div className="text-xs text-[#2a2218] leading-relaxed">
                            {t('opsPlanning.narrative.assessmentLine', { action: recommendedActionLabel })}
                        </div>
                    </div>
                </div>
            )}

            {/* Signature */}
            <div className="border-t border-[#c0b090] mt-6 pt-3">
                <div className="text-xs text-[#4a4238]">{t('opsPlanning.narrative.g2Chief')}</div>
                <div className="text-xs font-bold text-[#1a1610] mt-1">{commanderName}</div>
            </div>
        </div>
    );
}

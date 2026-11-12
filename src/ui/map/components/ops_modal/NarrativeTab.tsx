/**
 * Narrative assessment tab — the G-2 report in military document order, on the dark
 * surface (no paper sheet), with the classification mark.
 */
import { SurfaceStat, SURFACE_LABEL, SURFACE_LABEL_MUTED } from '../surface/Surface';
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
        <div className="relative flex flex-col gap-5">
            {/* Classification mark */}
            <div className="absolute right-0 top-0 rotate-[-8deg] select-none rounded border-2 border-red-400/40 px-3 py-1
                            font-mono text-[15px] font-semibold uppercase tracking-[0.25em] text-red-300/70 pointer-events-none">
                {t('opsPlanning.narrative.classified')}
            </div>

            {/* Header block */}
            <div className="flex flex-col gap-1 pr-32">
                <span className={SURFACE_LABEL_MUTED}>{headers.republic}</span>
                <span className={SURFACE_LABEL_MUTED}>{headers.army}</span>
                <span className="mt-1 text-[19px] font-semibold text-[#f1e6c8]">{corpsName} — {t('opsPlanning.narrative.g2Office')}</span>
                <span className="font-mono text-[14px] text-[#b9ad94]">
                    Ref: G2/{date.replace(/-/g, '')}/OPS • {date}
                </span>
            </div>

            {/* WP3d: Quick Assessment summary */}
            <div className="flex flex-col gap-2 rounded-md border border-[#2a303c] bg-[#12161e] px-4 py-3">
                <span className={SURFACE_LABEL}>{t('opsPlanning.narrative.quickAssessment')}</span>
                <SurfaceStat
                    label={t('opsPlanning.narrative.forceBalance')}
                    value={forceBalance?.label ?? t('corpsFront.unreported')}
                    tone={forceBalance?.toneClass}
                />
                <SurfaceStat
                    label={t('opsPlanning.narrative.intelConfidence')}
                    value={prediction.overall.intelConfidence == null ? t('corpsFront.unreported') : `${Math.round(prediction.overall.intelConfidence * 100)}%`}
                />
                <SurfaceStat label={t('opsPlanning.narrative.predicted')} value={predictedOutcomeLabel} />
                <SurfaceStat label={t('opsPlanning.narrative.recommendation')} value={recommendedActionLabel} />
            </div>

            {/* Sections — WP3e: inline translations */}
            {sections.length > 0 ? (
                sections.map((section, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                        <span className={SURFACE_LABEL}>
                            {idx + 1}. {translateTitle(section.title)}
                        </span>
                        <p className="m-0 whitespace-pre-wrap text-[17px] leading-relaxed text-[#ddd1b3]">
                            {section.content}
                        </p>
                    </div>
                ))
            ) : (
                // Fallback: generate from quantitative data
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <span className={SURFACE_LABEL}>{t('opsPlanning.narrative.enemyTitle')}</span>
                        <p className="m-0 text-[17px] leading-relaxed text-[#ddd1b3]">
                            {t('opsPlanning.narrative.enemyLine', {
                                summary: forceBalance?.summary ?? t('corpsFront.unreported'),
                                confidence: prediction.overall.intelConfidence == null ? t('corpsFront.unreported') : (prediction.overall.intelConfidence * 100).toFixed(0),
                            })}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className={SURFACE_LABEL}>{t('opsPlanning.narrative.ownTitle')}</span>
                        <p className="m-0 text-[17px] leading-relaxed text-[#ddd1b3]">
                            {t('opsPlanning.narrative.ownLine', {
                                casualties: prediction.overall.estimatedCasualties == null ? t('corpsFront.unreported') : prediction.overall.estimatedCasualties.toLocaleString(),
                                outcome: predictedOutcomeLabel,
                            })}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className={SURFACE_LABEL}>{t('opsPlanning.narrative.assessmentTitle')}</span>
                        <p className="m-0 text-[17px] leading-relaxed text-[#ddd1b3]">
                            {t('opsPlanning.narrative.assessmentLine', { action: recommendedActionLabel })}
                        </p>
                    </div>
                </div>
            )}

            {/* Signature */}
            <div className="flex flex-col gap-1 border-t border-[#262b35] pt-3">
                <span className="text-[15px] text-[#b9ad94]">{t('opsPlanning.narrative.g2Chief')}</span>
                <span className="text-[17px] font-semibold text-[#f1e6c8]">{commanderName}</span>
            </div>
        </div>
    );
}

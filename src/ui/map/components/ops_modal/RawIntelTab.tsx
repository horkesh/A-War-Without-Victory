/**
 * RawIntelTab — Debug-only. NOT rendered in normal play.
 *
 * This component exposes exact engine-computed values (force ratio to 2 decimal
 * places, exact casualty integers, raw defense strength numbers) that violate the
 * Presidential Command Doctrine: the player (as faction president) receives staff
 * assessments, not simulation truth.
 *
 * It is preserved here for developer/analyst use only. To expose it, gate it behind
 * an explicit debug mode flag — never add it back to G2Phase tab list directly.
 * See: DEBUG_SURFACE_POLICY.md, PLAYER_VISIBLE_STATE.md.
 */
import type { PredictionResult } from './usePrediction';
import { ReadinessBar } from '../plan_ui/ReadinessBar';
import {
    labelFromThresholds,
    INTEL_LABELS,
    FORCE_RATIO_LABELS,
    getCasualtySeverityColor,
    OUTCOME_STYLES,
} from '../plan_ui/opsConstants';
import { t } from '../../i18n';

interface RawIntelTabProps {
    prediction: PredictionResult;
}

// WP3f: Synthesize recommendation reasoning from available prediction fields
function getRecommendationReasoning(prediction: PredictionResult): string {
    const { overall } = prediction;
    const parts: string[] = [];

    // Force ratio assessment
    if (overall.forceRatio >= 2.0) parts.push(`Force ratio ${overall.forceRatio.toFixed(1)}:1 favorable`);
    else if (overall.forceRatio >= 1.2) parts.push(`Force ratio ${overall.forceRatio.toFixed(1)}:1 adequate`);
    else if (overall.forceRatio >= 0.8) parts.push(`Force ratio ${overall.forceRatio.toFixed(1)}:1 contested`);
    else parts.push(`Force ratio ${overall.forceRatio.toFixed(1)}:1 unfavorable`);

    // Intel confidence
    if (overall.intelConfidence >= 0.7) parts.push('intel high');
    else if (overall.intelConfidence >= 0.4) parts.push('intel moderate');
    else parts.push('intel insufficient');

    // Casualty estimate
    if (overall.estimatedCasualties > 500) parts.push('heavy casualties expected');
    else if (overall.estimatedCasualties > 200) parts.push('moderate casualties expected');
    else parts.push('light casualties expected');

    return `${overall.recommendedAction.toUpperCase()} \u2014 ${parts.join(', ')}`;
}

export function RawIntelTab({ prediction }: RawIntelTabProps) {
    const { overall, perAxis } = prediction;
    const outcomeStyle = OUTCOME_STYLES[overall.predictedOutcome] ?? {
        bg: 'bg-[rgba(180,160,130,0.1)]', text: 'text-text-secondary', label: overall.predictedOutcome,
    };

    return (
        <div className="space-y-4">
            {/* Overall readiness */}
            <div className="space-y-2">
                <ReadinessBar
                    label="Intel Confidence"
                    value={overall.intelConfidence}
                    qualitativeLabel={labelFromThresholds(overall.intelConfidence, INTEL_LABELS)}
                />
                <ReadinessBar
                    label="Force Ratio"
                    value={Math.min(1, overall.forceRatio / 2)}
                    qualitativeLabel={`${overall.forceRatio.toFixed(2)}:1 \u2014 ${labelFromThresholds(overall.forceRatio, FORCE_RATIO_LABELS)}`}
                />
            </div>

            {/* Predicted outcome */}
            <div className={`${outcomeStyle.bg} rounded-lg p-3 border border-[rgba(180,160,130,0.08)]`}>
                <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary mb-1">
                    Predicted Outcome
                </div>
                <div className={`text-sm font-bold uppercase tracking-wider ${outcomeStyle.text}`}>
                    {outcomeStyle.label}
                </div>
            </div>

            {/* Casualty estimate */}
            <div className="bg-[rgba(20,18,15,0.4)] rounded-lg p-3 border border-[rgba(180,160,130,0.08)]">
                <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary mb-1">
                    Estimated Casualties
                </div>
                <div className="text-lg font-bold" style={{ color: getCasualtySeverityColor(overall.estimatedCasualties) }}>
                    {overall.estimatedCasualties.toLocaleString()}
                </div>
            </div>

            {/* Commander recommendation */}
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                    overall.recommendedAction === 'launch' ? 'bg-green-400' :
                    overall.recommendedAction === 'postpone' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Commander recommends:
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    overall.recommendedAction === 'launch' ? 'text-green-400' :
                    overall.recommendedAction === 'postpone' ? 'text-amber-400' : 'text-red-400'
                }`}>
                    {overall.recommendedAction}
                </span>
            </div>

            {/* WP3f: Recommendation reasoning */}
            <div className="text-[9px] text-text-secondary/70 italic -mt-2 ml-4">
                {getRecommendationReasoning(prediction)}
            </div>

            {/* Per-axis breakdown */}
            {perAxis.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary">
                        {t('opsModal.perAxisBreakdown')}
                    </div>
                    {perAxis.map((axis) => {
                        const axisOutcome = OUTCOME_STYLES[axis.predictedOutcome];
                        return (
                            <div key={axis.axisId}
                                 className="bg-[rgba(20,18,15,0.3)] rounded p-2 border border-[rgba(180,160,130,0.05)]">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-white">{axis.axisId}</span>
                                    <span className={`text-[8px] font-bold uppercase ${axisOutcome?.text ?? 'text-text-secondary'}`}>
                                        {axisOutcome?.label ?? axis.predictedOutcome}
                                    </span>
                                </div>
                                <div className="flex gap-3 mt-1 text-[9px] text-text-secondary">
                                    <span>{t('opsModal.forceRatioShort')} <span className="text-white font-bold">{axis.forceRatio.toFixed(2)}</span></span>
                                    <span>{t('opsModal.defenseShort')} <span className="text-white font-bold">{axis.defenseStrength.toLocaleString()}</span></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Intelligence warning */}
            {overall.intelConfidence < 0.4 && (
                <div className="bg-red-900/20 border border-red-400/20 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                        \u26A0 INTELLIGENCE INSUFFICIENT
                    </div>
                    <div className="text-[9px] text-red-400/70 mt-1">
                        Recommend reconnaissance in force before commitment.
                    </div>
                </div>
            )}
        </div>
    );
}

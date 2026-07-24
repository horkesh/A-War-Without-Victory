import { useState } from 'react';
import {
  AXIS_COLORS, OUTCOME_STYLES, INTEL_LABELS, SUPPLY_LABELS,
  labelFromThresholds, getCasualtySeverityColor,
} from './opsConstants';
import { ReadinessBar } from './ReadinessBar';
import { getPlayerSafeOperationBalancePresentation } from '../../../../shared/playerSafeOperationBalance';
import { t } from '../../i18n';

interface AxisPredictionView {
  axisId: string;
  predictedOutcome: string;
  forceRatio: number;
  estimatedCasualties: number;
  terrain: string;
  entrenchment: string;
  intelConfidence: number;
  supplyReadiness: number;
}

interface AxisAssessmentCardProps {
  prediction: AxisPredictionView;
  axisName: string;
  colorIndex: number;
}

export function AxisAssessmentCard({ prediction, axisName, colorIndex }: AxisAssessmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = AXIS_COLORS[colorIndex % AXIS_COLORS.length];
  const outcome = OUTCOME_STYLES[prediction.predictedOutcome] ?? OUTCOME_STYLES.stalemate;
  const casualtyColor = getCasualtySeverityColor(prediction.estimatedCasualties);
  const forceBalance = getPlayerSafeOperationBalancePresentation(prediction.forceRatio);

  return (
    <div className="border border-[rgba(180,160,130,0.1)] rounded bg-panel-card/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-panel-hover/50 transition-colors"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex-1 truncate">
          {axisName}
        </span>
        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded border ${outcome.bg} ${outcome.text} border-current/20`}>
          {outcome.label}
        </span>
        <span className="text-xs font-mono font-bold min-w-[50px] text-right" style={{ color: casualtyColor }}>
          ~{Math.round(prediction.estimatedCasualties).toLocaleString()}
        </span>
        <span className={`text-xs text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}>
          &#9662;
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[rgba(180,160,130,0.06)] space-y-2">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-text-secondary uppercase tracking-wider">{t('planUi.forceBalance')}</span>
              <div className={`font-bold uppercase ${forceBalance.toneClass}`}>{forceBalance.label}</div>
              <div className="text-text-secondary text-xs uppercase">{forceBalance.summary}</div>
            </div>
            <div>
              <span className="text-text-secondary uppercase tracking-wider">{t('planUi.terrain')}</span>
              <div className="text-text-primary font-bold uppercase">{prediction.terrain}</div>
            </div>
            <div>
              <span className="text-text-secondary uppercase tracking-wider">{t('planUi.entrenchment')}</span>
              <div className="text-text-primary font-bold uppercase">{prediction.entrenchment}</div>
            </div>
          </div>
          <ReadinessBar
            label="Intel"
            value={prediction.intelConfidence}
            qualitativeLabel={labelFromThresholds(prediction.intelConfidence, INTEL_LABELS)}
          />
          <ReadinessBar
            label="Supply"
            value={prediction.supplyReadiness}
            qualitativeLabel={labelFromThresholds(prediction.supplyReadiness, SUPPLY_LABELS)}
          />
        </div>
      )}
    </div>
  );
}

import { ReadinessBar } from './ReadinessBar';
import { AxisAssessmentCard } from './AxisAssessmentCard';
import { CommanderAssessmentDoc } from './CommanderAssessmentDoc';

// ─── Local view types matching OperationPredictionResponse shape ─────────────
// Avoids cross-package import from src/sim/

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

interface CommanderAssessmentView {
  recommendation: 'launch' | 'delay' | 'abort';
  sections: {
    enemy: string;
    ownForces: string;
    assessment: string;
  };
  preparationWeeks: number;
  requiredForceRatio: number;
  requiredIntelConfidence: number;
}

export interface PredictionView {
  overall: {
    forceRatio: number;
    intelConfidence: number;
    supplyReadiness: number;
    totalEstimatedCasualties: number;
    preparationWeeks: number;
  };
  axes: AxisPredictionView[];
  commanderAssessment: CommanderAssessmentView;
}

export interface G2BriefingPanelProps {
  prediction: PredictionView | null;
  axisNames: Array<{ id: string; name: string }>;
  faction: string;
  corpsName: string;
  sectorName: string;
  commanderName?: string;
  turn: number;
}

import {
  INTEL_LABELS, SUPPLY_LABELS, FORCE_RATIO_LABELS,
  labelFromThresholds, getCasualtySeverityColor,
} from './opsConstants';

function forceRatioToNormalized(ratio: number): number {
  // Map force ratio to 0-1 range for ReadinessBar display
  // 0:1 → 0.0, 1:1 → 0.5, 2:1+ → 1.0
  return Math.min(1, Math.max(0, ratio / 2));
}

const MODULE_HEADER = 'font-mono text-[9px] uppercase tracking-[0.2em] text-accent-gold/60 border-l-2 border-accent-gold/30 pl-1';

// ─── Component ───────────────────────────────────────────────────────────────

export function G2BriefingPanel({
  prediction, axisNames, faction, corpsName, sectorName, commanderName, turn
}: G2BriefingPanelProps) {
  const overall = prediction?.overall;
  const axes = prediction?.axes ?? [];
  const assessment = prediction?.commanderAssessment ?? null;

  const intelLabel = overall ? labelFromThresholds(overall.intelConfidence, INTEL_LABELS) : 'Awaiting Data';
  const supplyLabel = overall ? labelFromThresholds(overall.supplyReadiness, SUPPLY_LABELS) : 'Awaiting Data';
  const forceLabel = overall ? labelFromThresholds(overall.forceRatio, FORCE_RATIO_LABELS) : 'Awaiting Data';

  const casualtyColor = overall ? getCasualtySeverityColor(overall.totalEstimatedCasualties) : '#9a9080';

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(180,160,130,0.15)] pb-2">
        <h3 className="text-[10px] font-black text-accent-gold uppercase tracking-[0.2em]">
          G-2 Intelligence Briefing
        </h3>
        <div className={`w-2 h-2 rounded-full ${prediction ? 'bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-text-secondary/30'}`} />
      </div>

      {/* Readiness Bars — always visible */}
      <div className="space-y-2">
        <h4 className={MODULE_HEADER}>Readiness Assessment</h4>
        <ReadinessBar
          label="Intel Confidence"
          value={overall?.intelConfidence ?? 0}
          qualitativeLabel={intelLabel}
        />
        <ReadinessBar
          label="Supply Readiness"
          value={overall?.supplyReadiness ?? 0}
          qualitativeLabel={supplyLabel}
        />
        <ReadinessBar
          label="Force Ratio"
          value={overall ? forceRatioToNormalized(overall.forceRatio) : 0}
          qualitativeLabel={forceLabel}
        />
      </div>

      {/* Summary Stats — always visible */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-panel-card border border-[rgba(180,160,130,0.1)] p-3 rounded space-y-1">
          <div className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">
            Est. Casualties
          </div>
          <div className="text-xl font-mono leading-none" style={{ color: casualtyColor }}>
            {overall ? `~${Math.round(overall.totalEstimatedCasualties).toLocaleString()}` : '--'}
          </div>
        </div>
        <div className="bg-panel-card border border-[rgba(180,160,130,0.1)] p-3 rounded space-y-1">
          <div className="text-[9px] font-black text-text-secondary uppercase tracking-widest leading-none">
            Preparation
          </div>
          <div className="text-xl font-mono text-text-primary leading-none">
            {overall ? overall.preparationWeeks : '--'}
            <span className="text-[10px] text-text-secondary"> WEEKS</span>
          </div>
        </div>
      </div>

      {/* Per-Axis Assessment Cards */}
      {axes.length > 0 && (
        <div className="space-y-2">
          <h4 className={MODULE_HEADER}>Axis Assessment</h4>
          <div className="space-y-1">
            {axes.map((axisPred, i) => {
              const nameEntry = axisNames.find(n => n.id === axisPred.axisId);
              return (
                <AxisAssessmentCard
                  key={axisPred.axisId}
                  prediction={axisPred}
                  axisName={nameEntry?.name ?? `AXIS ${i + 1}`}
                  colorIndex={i}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1 min-h-0" />

      {/* Commander Assessment Document — pinned at bottom */}
      <div className="space-y-2">
        <h4 className={MODULE_HEADER}>Commander Assessment</h4>
        <CommanderAssessmentDoc
          assessment={assessment}
          faction={faction}
          corpsName={corpsName}
          sectorName={sectorName}
          commanderName={commanderName}
          turn={turn}
        />
      </div>
    </div>
  );
}

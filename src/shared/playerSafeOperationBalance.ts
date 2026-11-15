/**
 * Command loop L5 (2026-11-15): the four readiness bands a proposal dossier may show. The
 * band is always attributed to whoever reports it ("Karavelić reports the plan ready") and
 * never shown as a number: the command model rule is that the number is never the
 * decision, the source is (presidential command model design, line 32).
 *
 * This is plan READINESS, not combat odds. The staff figure behind it (the commander
 * plan's viability score) measures staging-area hold, its posture and brigade
 * availability; it never weighs the target's defenders or terrain (#653 review). Odds
 * need a player-safe combat assessment, which does not exist yet.
 */
export type PlayerSafeReadinessBand = 'ready' | 'mostly' | 'strained' | 'unready';

/**
 * Band a staff readiness figure in [0, 1]. The thresholds are fixed so the same figure
 * always reads the same way.
 */
export function getPlayerSafeReadinessBand(judgement: number): PlayerSafeReadinessBand {
  if (judgement >= 0.65) return 'ready';
  if (judgement >= 0.45) return 'mostly';
  if (judgement >= 0.25) return 'strained';
  return 'unready';
}

export interface PlayerSafeOperationBalancePresentation {
  label: string;
  summary: string;
  toneClass: string;
}

// toneClass uses the Command Surface text tones (SURFACE_TONE in components/surface/Surface.tsx:
// emerald-200 / amber-200 / red-200), not the old -400 tones (surface step 5, 2026-11-13).
export function getPlayerSafeOperationBalancePresentation(ratio: number): PlayerSafeOperationBalancePresentation {
  if (ratio >= 1.8) {
    return {
      label: 'CLEAR EDGE',
      summary: 'clear attack advantage',
      toneClass: 'text-emerald-200 font-bold',
    };
  }
  if (ratio >= 1.2) {
    return {
      label: 'FAVORABLE',
      summary: 'favorable balance',
      toneClass: 'text-emerald-200 font-semibold',
    };
  }
  if (ratio >= 0.8) {
    return {
      label: 'CONTESTED',
      summary: 'contested balance',
      toneClass: 'text-amber-200 font-semibold',
    };
  }
  return {
    label: 'UNFAVORABLE',
    summary: 'defender advantage',
    toneClass: 'text-red-200 font-bold',
  };
}

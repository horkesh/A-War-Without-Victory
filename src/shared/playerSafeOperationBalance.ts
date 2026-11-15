/**
 * Command loop L5 (2026-11-15): the four odds bands a proposal dossier may show. The
 * band is always attributed to whoever judged it ("Karavelić judges: favourable") and
 * never shown as a number: the command model rule is that the number is never the
 * decision, the source is (presidential command model design, line 32).
 */
export type PlayerSafeOddsBand = 'favourable' | 'even' | 'hard' | 'long';

/**
 * Band a staff judgement in [0, 1] (the plan viability the corps staff report). The
 * thresholds are fixed so the same judgement always reads the same way.
 */
export function getPlayerSafeOddsBand(judgement: number): PlayerSafeOddsBand {
  if (judgement >= 0.65) return 'favourable';
  if (judgement >= 0.45) return 'even';
  if (judgement >= 0.25) return 'hard';
  return 'long';
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

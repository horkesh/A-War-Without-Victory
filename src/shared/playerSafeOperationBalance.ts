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

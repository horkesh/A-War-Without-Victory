export interface PlayerSafeOperationBalancePresentation {
  label: string;
  summary: string;
  toneClass: string;
}

export function getPlayerSafeOperationBalancePresentation(ratio: number): PlayerSafeOperationBalancePresentation {
  if (ratio >= 1.8) {
    return {
      label: 'CLEAR EDGE',
      summary: 'clear attack advantage',
      toneClass: 'text-emerald-400 font-bold',
    };
  }
  if (ratio >= 1.2) {
    return {
      label: 'FAVORABLE',
      summary: 'favorable balance',
      toneClass: 'text-green-400 font-semibold',
    };
  }
  if (ratio >= 0.8) {
    return {
      label: 'CONTESTED',
      summary: 'contested balance',
      toneClass: 'text-amber-400 font-semibold',
    };
  }
  return {
    label: 'UNFAVORABLE',
    summary: 'defender advantage',
    toneClass: 'text-red-400 font-bold',
  };
}

import { describe, expect, it } from 'vitest';
import { getPlayerSafeOperationBalancePresentation } from '../src/shared/playerSafeOperationBalance';

describe('player-safe operation force balance', () => {
  it('reduces exact ratios into stable staff-balance bands', () => {
    expect(getPlayerSafeOperationBalancePresentation(2.0)).toMatchObject({
      label: 'CLEAR EDGE',
      summary: 'clear attack advantage',
    });
    expect(getPlayerSafeOperationBalancePresentation(1.3)).toMatchObject({
      label: 'FAVORABLE',
      summary: 'favorable balance',
    });
    expect(getPlayerSafeOperationBalancePresentation(0.9)).toMatchObject({
      label: 'CONTESTED',
      summary: 'contested balance',
    });
    expect(getPlayerSafeOperationBalancePresentation(0.6)).toMatchObject({
      label: 'UNFAVORABLE',
      summary: 'defender advantage',
    });
  });
});

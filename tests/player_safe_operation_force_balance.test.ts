import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getPlayerSafeOperationBalancePresentation } from '../src/shared/playerSafeOperationBalance';
import { withoutComments } from './helpers/sourceComments';

// Freeze inventory §11 (c), 2026-11-26: the Autonomy panel (Army HQ → Personnel) printed
// the staff estimate as a raw ratio, so a thin enclave defence read "678.0:1". It shows the
// band like every other player surface.
describe('Autonomy panel shows the staff estimate as a band', () => {
  const src = withoutComments(readFileSync('src/ui/map/components/AutonomyPanel.tsx', 'utf8'));
  it('never formats force_ratio_estimate as a number', () => {
    expect(src).not.toMatch(/force_ratio_estimate\s*\.\s*toFixed/);
    expect(src).not.toContain('autonomy.proposal.forceRatio');
  });
  it('reads it through the player-safe band', () => {
    expect(src).toMatch(/getPlayerSafeOperationBalancePresentation\(opCard\.force_ratio_estimate\)/);
  });
  it('a huge estimate is still only the top band', () => {
    expect(getPlayerSafeOperationBalancePresentation(678).label).toBe('CLEAR EDGE');
  });
});

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

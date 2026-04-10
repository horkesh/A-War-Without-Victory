import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPlayerSafeOperationBalancePresentation } from '../src/shared/playerSafeOperationBalance';

const PLAYER_FACING_FILES = [
  'src/ui/map/components/army_hq/OperationsSection.tsx',
  'src/ui/map/components/CorpsFrontPanel.tsx',
  'src/ui/map/components/OperationBriefingModal.tsx',
  'src/ui/map/components/plan_ui/AxisAssessmentCard.tsx',
  'src/ui/map/components/ops_modal/NarrativeTab.tsx',
  'src/ui/map/components/ops_modal/OpordDocument.tsx',
  'src/ui/map/data/command_strain.ts',
];

const FORBIDDEN_EXACT_FORCE_RATIO_PATTERNS = [
  /force_ratio_estimate\.toFixed\(/,
  /prediction\.overall\.forceRatio\.toFixed\(/,
  /prediction\.forceRatio\.toFixed\(/,
  /forceRatio\.toFixed\(/,
  /reqForce\.toFixed\(/,
];

function readSource(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

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

  it('normal player-facing operation surfaces no longer print exact force-ratio numerics', () => {
    const violations: string[] = [];
    for (const relPath of PLAYER_FACING_FILES) {
      const source = readSource(relPath);
      for (const pattern of FORBIDDEN_EXACT_FORCE_RATIO_PATTERNS) {
        if (pattern.test(source)) {
          violations.push(`${relPath}: ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('debug-only raw intel tab may still retain exact force-ratio precision', () => {
    const rawIntelSource = readSource('src/ui/map/components/ops_modal/RawIntelTab.tsx');

    expect(rawIntelSource).toContain('Debug-only');
    expect(rawIntelSource).toContain('overall.forceRatio.toFixed(2)');
    expect(rawIntelSource).toContain('axis.forceRatio.toFixed(2)');
  });
});

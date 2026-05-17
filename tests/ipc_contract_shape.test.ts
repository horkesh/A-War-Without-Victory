import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readUseIpc(): string {
  return readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'desktop', 'useIPC.ts'), 'utf8');
}

function getWindowAwwvInterface(source: string): string {
  const match = source.match(/interface WindowAwwv \{[\s\S]*?\n\}/);
  expect(match, 'WindowAwwv interface should exist').not.toBeNull();
  return match![0];
}

describe('desktop IPC contract shape', () => {
  it('does not expose bare Promise<unknown> methods on WindowAwwv', () => {
    const windowAwwv = getWindowAwwvInterface(readUseIpc());

    expect(windowAwwv).not.toContain('Promise<unknown>');
  });

  it('keeps read-only query methods on concrete ok/error result envelopes', () => {
    const windowAwwv = getWindowAwwvInterface(readUseIpc());

    expect(windowAwwv).toContain('queryMovementRange: (brigadeId: string) => Promise<IpcMovementRangeResult>');
    expect(windowAwwv).toContain('queryMovementPath: (brigadeId: string, destinationSid: string) => Promise<IpcMovementPathResult>');
    expect(windowAwwv).toContain('querySupplyPaths: () => Promise<IpcSupplyPathsResult>');
    expect(windowAwwv).toContain('queryCorpsSectors: () => Promise<IpcCorpsSectorsResult>');
    expect(windowAwwv).toContain('queryBattleEvents: () => Promise<IpcBattleEventsResult>');
  });

  it('makes the advisor browser fallback an explicit failed IPC result', () => {
    const source = readUseIpc();

    expect(source).toContain("getAdvisorRecommendation: (payload: { faction?: string; context_type?: string }) => Promise<IpcAdvisorRecommendationResult>");
    expect(source).toContain("Promise.resolve({ ok: false, error: 'Desktop IPC not available' })");
  });
});

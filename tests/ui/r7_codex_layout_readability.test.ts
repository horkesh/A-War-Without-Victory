import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 Codex layout readability', () => {
  it('marks the independently scrolling campaign context with a bottom content fade', () => {
    const source = readFileSync('src/ui/map/components/CodexPanel.tsx', 'utf8');

    expect(source).toMatch(/data-testid="codex-live-campaign-records"[\s\S]{0,300}\[mask-image:linear-gradient\(to_bottom,black_calc\(100%_-_1\.5rem\),transparent\)\]/);
    expect(source).toMatch(/data-testid="codex-live-campaign-records"[\s\S]{0,220}pt-2 pb-6/);
  });
});

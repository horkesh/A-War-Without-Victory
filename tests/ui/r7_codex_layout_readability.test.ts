import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withoutComments } from '../helpers/sourceComments';

describe('R7 Codex layout readability', () => {
  // R7 gave the campaign records a bottom fade because they sat in a 44-rem-capped strip
  // above the essays, where hidden rows were easy to miss. Since the surface redesign
  // (step 4, 2026-11-12) they live in the Codex's own right-hand column, which scrolls on
  // its own at full height, so the cap and its fade are gone.
  it('keeps the campaign records in their own scrolling column, uncapped', () => {
    const source = withoutComments(readFileSync('src/ui/map/components/CodexPanel.tsx', 'utf8'));

    const detailStart = source.indexOf('<SurfaceDetail aria-label={t(\'codex.campaignContext.title\')}>');
    const recordsStart = source.indexOf('data-testid="codex-live-campaign-records"');
    expect(detailStart).toBeGreaterThan(0);
    expect(recordsStart).toBeGreaterThan(detailStart);
    expect(source.slice(detailStart, recordsStart)).toContain('overflow-y-auto');
    expect(source).not.toContain('max-h-44');
  });
});

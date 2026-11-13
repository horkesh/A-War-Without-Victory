import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { withoutComments } from '../helpers/sourceComments';

/**
 * Surface redesign, step 4 (2026-11-12): the records and end-state screens are
 * surfaces in the Command Surface style. This guard keeps the legacy glass out of
 * them: no blur, no amber-400, no text under 13 px, opaque planes from the shared
 * surface parts. Rendered font sizes are measured in the browser drive; this pins
 * the source so a later edit cannot quietly bring the old classes back.
 */
const FILES = [
  'src/ui/map/components/CodexPanel.tsx',
  'src/ui/map/components/VerdictScreen.tsx',
  'src/ui/map/components/verdict/CinematicVerdict.tsx',
  'src/ui/map/components/WarCostSummary.tsx',
  'src/ui/map/components/GameOverModal.tsx',
  'src/ui/map/components/PeaceStatusPanel.tsx',
  'src/ui/map/components/EconomyPanel.tsx',
  'src/ui/map/components/EnclaveDashboard.tsx',
  'src/ui/map/components/HumanitarianLedgerPanel.tsx',
] as const;

function read(file: string): string {
  return readFileSync(join(process.cwd(), file), 'utf8');
}

describe('records and end-state surfaces', () => {
  for (const file of FILES) {
    it(`${file} has no legacy glass or sub-13px text`, () => {
      const source = withoutComments(read(file));
      expect(source).not.toMatch(/backdrop-blur/);
      expect(source).not.toMatch(/amber-400/);
      expect(source).not.toMatch(/\btext-(?:xs|\[(?:[0-9]|1[0-2])(?:\.\d+)?px\])/);
      expect(source).not.toMatch(/\bsm:text-(?:xs|\[(?:[0-9]|1[0-2])(?:\.\d+)?px\])/);
      expect(source).not.toContain('GlassPanel');
    });

    it(`${file} is built from the shared surface parts`, () => {
      expect(read(file)).toMatch(/from '(?:\.\.?\/)+surface\/Surface'/);
    });
  }
});

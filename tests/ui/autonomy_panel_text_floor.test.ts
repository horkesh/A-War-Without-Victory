import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Truthful command step 1 made the autonomy level descriptions the place that explains
// what commanders bring to the president. They must meet the 13 px text floor; the panel
// rendered them at text-xs (12 px) before. Rendered evidence: 2293x960 and 1280x720,
// computed 13px (ledger 2026-11-12).
describe('Command Autonomy panel text floor', () => {
  const source = readFileSync(resolve(__dirname, '../../src/ui/map/components/AutonomyPanel.tsx'), 'utf8');

  it('uses no Tailwind size below the 13 px floor', () => {
    expect(source).not.toMatch(/\btext-xs\b/);
    expect(source).not.toMatch(/text-\[(?:[0-9]|1[0-2])px\]/);
  });
});

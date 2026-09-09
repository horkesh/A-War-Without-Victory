import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 Army HQ layout readability', () => {
  it('packs corps grid rows at their content height', () => {
    const source = readFileSync('src/ui/map/components/army_hq/ArmyHQModal.tsx', 'utf8');

    expect(source).toContain('className={`grid content-start gap-2 ${expandedCorpsId');
  });
});

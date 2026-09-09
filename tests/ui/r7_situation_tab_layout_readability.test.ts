import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 Situation layout readability', () => {
  it('keeps both military labels on one line', () => {
    const source = readFileSync('src/ui/map/components/SituationTab.tsx', 'utf8');

    expect(source.match(/FACTION_COLORS\[playerFaction\][^\n]*whitespace-nowrap[^\n]*shrink-0/g)).toHaveLength(2);
  });
});

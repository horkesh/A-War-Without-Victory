import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('R7 Decision Room layout readability', () => {
  it('reserves enough width for the All lens summary', () => {
    const source = readFileSync('src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx', 'utf8');

    expect(source).toContain("isAllLens ? 'min-w-[15rem]' : 'min-w-[5.75rem]'");
  });
});

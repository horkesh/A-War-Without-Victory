import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('App primary command quick-select cleanup', () => {
  it('does not keep unwired primary army or corps quick-select handlers in App', () => {
    const source = readFileSync('src/ui/map/App.tsx', 'utf8');

    expect(source).not.toContain('selectPrimaryArmy');
    expect(source).not.toContain('selectPrimaryCorps');
  });
});

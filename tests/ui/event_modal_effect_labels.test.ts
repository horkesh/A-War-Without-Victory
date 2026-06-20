import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatAcknowledgementEventEffect } from '../../src/ui/map/App';

const APP_SOURCE = readFileSync('src/ui/map/App.tsx', 'utf8');

describe('event acknowledgement modal effect labels', () => {
  it('formats aggression modifiers as player copy before queueing EventModal data', () => {
    const renderedCopy = formatAcknowledgementEventEffect({
      kind: 'aggression_modifier',
      faction: 'RBiH',
      delta: -0.1,
      duration_turns: 8,
    });

    expect(renderedCopy).toBe('ARBiH operational aggression -0.1 for 8 turns');
    expect(renderedCopy).not.toContain('aggression_modifier');
    expect(APP_SOURCE).toContain('formatAcknowledgementEventEffect');
    expect(APP_SOURCE).toContain('operational aggression');
    expect(APP_SOURCE).not.toContain('${getPlayerSafeMilitaryFactionName(eff.faction)} ${eff.kind}');
  });
});

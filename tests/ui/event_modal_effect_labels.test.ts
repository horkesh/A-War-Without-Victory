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

    expect(renderedCopy).toBe('ARBiH offensive drive -10% for 8 weeks (noted in the record; it does not change army planning)');
    expect(renderedCopy).not.toContain('aggression_modifier');
    expect(APP_SOURCE).toContain('formatAcknowledgementEventEffect');
    expect(APP_SOURCE).toContain('eventModal.effect.aggressionModifier');
    expect(APP_SOURCE).not.toContain('${getPlayerSafeMilitaryFactionName(eff.faction)} ${eff.kind}');
  });

  it('localizes generated acknowledgement effect copy', async () => {
    const { setLocale } = await import('../../src/ui/map/i18n/index.js');
    try {
      setLocale('bcs', undefined);
      const renderedCopy = formatAcknowledgementEventEffect({
        kind: 'aggression_modifier',
        faction: 'RBiH',
        delta: -0.1,
        duration_turns: 8,
      });

      expect(renderedCopy).toBe('ARBiH ofanzivni zamah -10% tokom 8 poteza (zabilježeno; ne mijenja planiranje vojske)');
      expect(renderedCopy).not.toMatch(/offensive drive|for 8 weeks|aggression_modifier/);
    } finally {
      setLocale('en', undefined);
    }
  });
});

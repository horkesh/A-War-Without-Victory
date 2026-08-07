// @vitest-environment jsdom
//
// B7 Sarajevo lifeline — player-facing UI surface tests.
//
// Covers the read-only siege SUPPLY-relief indicator added to SupplyPanel:
//   1. adapter FIELD-PATH guard (the #1 UI-adapter chokepoint — a wrong nested
//      path silently returns undefined; pin `political.sarajevo_state.lifeline`);
//   2. the panel renders the lifeline row (status / relief throughput / tunnel /
//      airlift) when the lifeline is present;
//   3. flag-OFF / no-siege (no `sarajevoLifeline`) → the row is not rendered
//      (byte-safe: nothing shown);
//   4. §6 guard — the surface shows supply/relief truth ONLY: no lever/button, no
//      civilian-casualty/starvation wording.

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { SupplyPanel } from '../../src/ui/map/components/SupplyPanel.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { deriveSarajevoLifelineView } from '../../src/ui/map/data/GameStateAdapter.js';

afterEach(() => cleanup());

function stateWithLifeline(
  lifeline: LoadedGameState['sarajevoLifeline'],
): LoadedGameState {
  return {
    player_faction: 'RBiH',
    factionReserves: { RBiH: { generalSupply: 40, heavyMunitions: 20 } },
    sarajevoLifeline: lifeline,
  } as unknown as LoadedGameState;
}

describe('B7 lifeline adapter field-path guard', () => {
  it('reads the EXACT raw path political.sarajevo_state.lifeline', () => {
    const raw = {
      political: {
        sarajevo_state: {
          lifeline: {
            status: 'STRANGLED',
            throughput: 0.35,
            tunnel_active: false,
            airlift_active: true,
            last_updated_turn: 90,
          },
        },
      },
    };
    const view = deriveSarajevoLifelineView(raw);
    expect(view).toEqual({
      status: 'STRANGLED',
      throughput: 0.35,
      tunnelActive: false,
      airliftActive: true,
    });
  });

  it('returns undefined when the lifeline is absent (flag-off / no siege / legacy save)', () => {
    expect(deriveSarajevoLifelineView({ political: { sarajevo_state: {} } })).toBeUndefined();
    expect(deriveSarajevoLifelineView({ political: {} })).toBeUndefined();
    expect(deriveSarajevoLifelineView({})).toBeUndefined();
    expect(deriveSarajevoLifelineView(undefined)).toBeUndefined();
  });

  it('returns undefined for a malformed lifeline (guards against a wrong-shaped path)', () => {
    expect(deriveSarajevoLifelineView({
      political: { sarajevo_state: { lifeline: { status: 'BOGUS', throughput: 0.5 } } },
    })).toBeUndefined();
    expect(deriveSarajevoLifelineView({
      political: { sarajevo_state: { lifeline: { status: 'OPEN', throughput: 'x' } } },
    })).toBeUndefined();
  });
});

describe('B7 lifeline SupplyPanel row', () => {
  it('renders status, relief throughput, and tunnel/airlift when the lifeline is present', () => {
    render(createElement(SupplyPanel, {
      state: stateWithLifeline({
        status: 'OPEN', throughput: 0.8, tunnelActive: true, airliftActive: true,
      }),
    }));
    const row = screen.getByTestId('sarajevo-lifeline');
    expect(row).toBeTruthy();
    // status label + relief % (0.8 → 80) + both channel labels present.
    expect(row.textContent).toContain('Open');
    expect(row.textContent).toContain('80');
    expect(row.textContent).toContain('Tunnel');
    expect(row.textContent).toContain('Airlift');
  });

  it('does NOT render the lifeline row when no lifeline is present (flag-off / no siege)', () => {
    render(createElement(SupplyPanel, { state: stateWithLifeline(undefined) }));
    expect(screen.queryByTestId('sarajevo-lifeline')).toBeNull();
  });

  it('§6 guard: the lifeline row is read-only supply/relief — no lever, no civilian-harm wording', () => {
    render(createElement(SupplyPanel, {
      state: stateWithLifeline({
        status: 'SEVERED', throughput: 0.0, tunnelActive: false, airliftActive: false,
      }),
    }));
    const row = screen.getByTestId('sarajevo-lifeline');
    // No interactive control (no lever): the indicator is display-only.
    expect(row.querySelector('button')).toBeNull();
    expect(row.querySelector('input')).toBeNull();
    expect(row.querySelector('a')).toBeNull();
    // No civilian-harm / atrocity wording surfaced in this supply row.
    const text = (row.textContent ?? '').toLowerCase();
    for (const forbidden of ['starv', 'civilian', 'casualt', 'kill', 'death', 'shell']) {
      expect(text.includes(forbidden)).toBe(false);
    }
    // It DOES name the siege supply-relief concept.
    expect(row.textContent).toContain('Severed');
  });
});

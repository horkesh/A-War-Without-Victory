// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { BottomStatusStrip } from '../../src/ui/map/components/BottomStatusStrip.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Turn 40',
    turn: 40,
    phase: 'war',
    formations: [],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RBiH',
    ...overrides,
  } as LoadedGameState;
}

describe('BottomStatusStrip labels', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState({
      loadedGameState: null,
      mapMode: 'political',
      devMode: false,
    });
  });

  it('does not render duplicate DEFENSE labels when the active secondary mode menu is expanded', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      mapMode: 'defense',
      devMode: false,
    });

    render(createElement(BottomStatusStrip));

    fireEvent.click(screen.getByRole('button', { name: 'Defense' }));

    expect(screen.getAllByRole('button', { name: 'Defense' })).toHaveLength(1);
  });

  it('shows both Bosniak-Croat alliance and Zagreb patron pressure for HRHB', () => {
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'HRHB',
        war_alliance_rbih_hrhb: 0.35,
        strategicDimensions: {
          HRHB: {
            patron_confidence: { base_value: 55, event_modifier: -25, effective_value: 30 },
          },
        },
      }),
      mapMode: 'political',
      devMode: false,
    });

    render(createElement(BottomStatusStrip));

    expect(screen.getByText('STRAINED')).toBeTruthy();
    expect(screen.getByText('Zagreb:')).toBeTruthy();
    expect(screen.getByText('WAVERING')).toBeTruthy();
  });

  it('shows both Bosniak-Croat alliance and international pressure for RBiH', () => {
    useGameStore.setState({
      loadedGameState: makeState({
        player_faction: 'RBiH',
        war_alliance_rbih_hrhb: 0.62,
        internationalVisibilityPressure: {
          atrocity_visibility: 0,
          enclave_humanitarian_pressure: 0,
          sarajevo_siege_visibility: 0,
          negotiation_momentum: 0.72,
          composite_ivp: 0.72,
          last_major_shift: 39,
        },
      }),
      mapMode: 'political',
      devMode: false,
    });

    render(createElement(BottomStatusStrip));

    expect(screen.getByText('ALLIED')).toBeTruthy();
    expect(screen.getByText('International:')).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
  });

  it('does not show territory trend arrows from turn-0 scenario-start provenance', () => {
    useGameStore.setState({
      loadedGameState: makeState({
        turn: 0,
        label: 'Opening week',
        player_faction: 'RBiH',
        controlBySettlement: {
          'op:sarajevo:centar': 'RBiH',
        },
        latestTurnSummary: {
          turn: 0,
          battles: [],
          territory_net: { RBiH: 2, RS: -2 },
          notable_flips: [
            { osid: 'op:sarajevo:centar', mun_id: 'sarajevo', from: 'RS', to: 'RBiH', significance: 'municipality_seat' },
          ],
          displacement_total: 0,
          displacement_by_ethnicity: {},
          decoration_awards: [],
          arc_transitions: [],
          formation_spawns: [],
          formation_destructions: [],
          supply_deltas: {},
          heavy_munitions_deltas: {},
          movements: [],
          supply_transitions: [],
          events_fired: [],
          notable_events: [],
        },
      }),
      mapMode: 'political',
      devMode: false,
    });

    const view = render(createElement(BottomStatusStrip));

    expect(view.container.textContent ?? '').not.toContain('\u2191');
  });
});

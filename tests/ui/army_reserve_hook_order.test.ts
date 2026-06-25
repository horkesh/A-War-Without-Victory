// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArmyReservePanel } from '../../src/ui/map/components/ArmyReservePanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 0',
    turn: 0,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      {
        id: 'arbih_main_staff',
        faction: 'RBiH',
        name: 'ARBiH Main Staff',
        kind: 'army_hq',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
      },
      {
        id: 'arbih_guard',
        faction: 'RBiH',
        name: 'Guard Brigade',
        kind: 'brigade',
        readiness: 'ready',
        status: 'active',
        cohesion: 80,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
        personnel: 1000,
        corps_id: 'arbih_main_staff',
        eliteLoanState: {
          on_loan: true,
          loaned_to_corps: 'arbih_1st_corps',
          loan_start_turn: 0,
          in_cooldown: false,
          permanently_degraded: false,
          turns_deployed: 2,
          base_osid: 'op:sarajevo:centar',
        },
      },
      {
        id: 'arbih_1st_corps',
        faction: 'RBiH',
        name: '1st Corps',
        kind: 'corps',
        readiness: 'ready',
        status: 'active',
        cohesion: 75,
        fatigue: 0,
        createdTurn: 0,
        tags: [],
      },
    ],
    pendingReserveRequests: [
      {
        request_id: 'reserve-request-1',
        faction: 'RBiH',
        corps_id: 'arbih_1st_corps',
        reason: 'defensive_gap',
        priority: 80,
        travel_hops: 2,
        severityBand: 'critical',
        suggested_brigade_id: 'arbih_guard',
      },
    ],
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
  } as unknown as LoadedGameState;
}

describe('ArmyReservePanel hook order', () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState(useGameStore.getInitialState());
    vi.restoreAllMocks();
  });

  it('keeps a stable hook order when the panel opens and closes around loaded state', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    useGameStore.setState({
      loadedGameState: makeState(),
      selectedArmyHqId: 'arbih_main_staff',
    });
    rerender(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    useGameStore.setState({
      selectedArmyHqId: null,
      selectedFormationId: null,
    });
    rerender(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    expect(consoleError.mock.calls.flat().join('\n')).not.toMatch(/Rendered more hooks|Rendered fewer hooks|change in the order of Hooks/i);
  });

  it('renders reserve live action controls read-only when the desktop bridge is unavailable', () => {
    delete (window as unknown as { awwv?: unknown }).awwv;
    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: makeState(),
      selectedArmyHqId: 'arbih_main_staff',
    });

    const view = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));
    const decline = screen.getByRole('button', { name: 'Decline reserve request for 1st Corps' }) as HTMLButtonElement;
    const terminate = screen.getByRole('button', { name: 'Recall Guard Brigade from 1st Corps' }) as HTMLButtonElement;

    expect(view.container.textContent).toContain('Desktop command bridge unavailable');
    expect(decline.disabled).toBe(true);
    expect(terminate.disabled).toBe(true);

    fireEvent.click(decline);
    fireEvent.click(terminate);
    expect(useGameStore.getState().loadError).toBeNull();
  });

  it('renders missing reserve authority and missing suggested brigade as unreported staff truth', () => {
    const state = makeState();
    delete (state.pendingReserveRequests![0]! as { suggested_brigade_id?: string }).suggested_brigade_id;
    delete state.commandAuthority;

    useGameStore.setState({
      ...useGameStore.getInitialState(),
      loadedGameState: state,
      selectedArmyHqId: 'arbih_main_staff',
    });

    const view = render(React.createElement(ArmyReservePanel, { railSlot: 'primary' }));

    expect(view.container.textContent).toContain('Staff has not named a reserve brigade yet');
    expect(view.container.textContent).toContain('Command authority unreported');
    expect(view.container.textContent).not.toContain('Insufficient command authority');
  });
});

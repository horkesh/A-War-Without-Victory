// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import { createElement } from 'react';

import { AARPanel } from '../../src/ui/map/components/AARPanel.js';
import { Tooltip } from '../../src/ui/map/components/Tooltip.js';
import { setLocale } from '../../src/ui/map/i18n';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function makeSummary(): TurnSummary {
  return {
    turn: 12,
    battles: [
      {
        osid: 'op:tuzla:center',
        attacker_faction: 'RBiH',
        defender_faction: 'RS',
        primary_attacker_id: 'bde_attacker',
        primary_defender_id: 'bde_defender',
        all_attacker_ids: ['bde_attacker'],
        outcome: 'victory',
        attacker_casualties: 12,
        defender_casualties: 20,
        territory_flipped: false,
        was_concentrated: false,
        execution_friction: {
          labels: ['stale_intel', 'defender_opsec', 'ambush_risk'],
          attacker_confidence_band: 'low',
        },
      },
    ],
    territory_net: {},
    notable_flips: [],
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
  };
}

function makeState(): LoadedGameState {
  return {
    label: 'Turn 12',
    turn: 12,
    phase: 'war',
    player_faction: 'RBiH',
    formations: [
      { id: 'bde_attacker', name: '2nd Tuzla Brigade', faction: 'RBiH', corps_id: 'arbih_2_corps' },
      { id: 'bde_defender', name: '1st Drina Brigade', faction: 'RS', corps_id: 'vrs_drina' },
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
    latestTurnSummary: makeSummary(),
    turnSummaries: [makeSummary()],
  } as unknown as LoadedGameState;
}

describe('AAR and tooltip friction labels', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('renders AAR friction and confidence bands without raw enum copy', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: { 'op:tuzla:center': 'Tuzla' },
    });

    const { container } = render(createElement(AARPanel, { isOpen: true, onClose: () => {}, embedded: true }));

    expect(container.textContent).toContain('Ambush risk');
    expect(container.textContent).toContain('limited confidence');
    expect(container.textContent).toMatch(/Attacker\s*[-−]12/);
    expect(container.textContent).toMatch(/Defender\s*[-−]20/);
    expect(container.textContent).not.toMatch(/\batt\b|\bdef\b|ambush_risk|low confidence|defender_opsec/);
  });

  it('routes embedded AAR formation links through field inspection with battle context', () => {
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: { 'op:tuzla:center': 'Tuzla' },
      armyHQOpen: true,
    });

    render(createElement(AARPanel, { isOpen: true, onClose: () => {}, embedded: true }));

    screen.getByRole('button', { name: '2nd Tuzla Brigade' }).click();

    const store = useGameStore.getState();
    expect(store.armyHQOpen).toBe(false);
    expect(store.selectedFormationId).toBe('bde_attacker');
    expect(store.selectedOsid).toBe('op:tuzla:center');
  });

  it('renders battle tooltip friction and confidence bands without raw enum copy', () => {
    vi.useFakeTimers();
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: { 'op:tuzla:center': 'Tuzla' },
      tooltipTarget: { type: 'battle', id: 'op:tuzla:center' },
      tooltipPosition: { x: 1, y: 1 },
    });

    render(createElement(Tooltip));

    act(() => {
      vi.advanceTimersByTime(301);
    });

    expect(screen.getByText(/Ambush risk/)).toBeTruthy();
    expect(screen.getByText(/limited confidence/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/ambush_risk|low confidence|defender_opsec/);
  });

  it('uses localized friction and confidence labels in BCS', () => {
    setLocale('bcs');
    useGameStore.setState({
      loadedGameState: makeState(),
      osidDisplayNames: { 'op:tuzla:center': 'Tuzla' },
    });

    const { container } = render(createElement(AARPanel, { isOpen: true, onClose: () => {}, embedded: true }));

    expect(container.textContent).toContain('Rizik zasjede');
    expect(container.textContent).toContain('ogranicena pouzdanost');
    expect(container.textContent).not.toMatch(/ambush_risk|low confidence|defender_opsec/);
  });
});

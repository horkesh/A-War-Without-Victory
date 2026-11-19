// @vitest-environment jsdom
/**
 * A2b PR-B2: the refugee compact line in Army HQ Records follows the active language. The line is built
 * with `t()` and a locale-aware date inside a memo, so a switch between EN and BCS must rebuild it without
 * a remount (Codex P2 on #808: the memo kept the old language).
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RecordsContent } from '../../src/ui/map/components/army_hq/RecordsContent.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { turnToDateString } from '../../src/ui/map/utils/formatters.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

const row = (turn: number, event_id: string, response_id: string) => ({
  event_id, response_id, decision_source: 'player', faction: 'HRHB', turn,
});

function hrhbState(faction = 'HRHB'): LoadedGameState {
  return {
    label: 'HRHB turn 20',
    turn: 20,
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
    player_faction: faction,
    operationHistory: [],
    activeOperations: [],
    rawGameState: {
      meta: { turn: 20, player_faction: faction },
      military: {
        event_decision_log: [
          row(0, 'hrhb_political_goal', 'united_front'),
          row(5, 'hrhb_1992_graz_cooperation_collapse', 'formal_alliance_persists'),
        ],
      },
      political: { refugee_compact_view: {} },
    },
  } as unknown as LoadedGameState;
}

describe('Army HQ Records: the refugee compact line follows the active language', () => {
  beforeEach(() => {
    setLocale('en');
    useGameStore.setState({ ...useGameStore.getInitialState(), loadedGameState: hrhbState() });
  });

  afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('rebuilds the line in BCS and back in EN without a remount, date included', () => {
    render(createElement(RecordsContent));
    const date = turnToDateString(5 + 56);

    const line = screen.getByTestId('records-refugee-compact');
    expect(line.getAttribute('data-compact-phase')).toBe('active');
    expect(line.textContent).toContain('Refugee compact until');
    const englishText = line.textContent;

    act(() => setLocale('bcs'));
    // React reuses the same node: the text must have been rebuilt in place.
    const inBcs = screen.getByTestId('records-refugee-compact');
    expect(inBcs.textContent).toContain('Dogovor o prihvatu raseljenih do');
    expect(inBcs.textContent).not.toContain('Refugee compact');
    // The date is formatted by the active locale too ("jun", not "Jun").
    expect(inBcs.textContent).toContain(turnToDateString(5 + 56));
    expect(inBcs.textContent).not.toBe(englishText);

    act(() => setLocale('en'));
    const backInEn = screen.getByTestId('records-refugee-compact');
    expect(backInEn.textContent).toContain('Refugee compact until');
    expect(backInEn.textContent).toContain(date);
  });

  it('shows no line to another faction\'s President, in either language', () => {
    useGameStore.setState({ ...useGameStore.getInitialState(), loadedGameState: hrhbState('RBiH') });
    render(createElement(RecordsContent));
    expect(screen.queryByTestId('records-refugee-compact')).toBeNull();
    act(() => setLocale('bcs'));
    expect(screen.queryByTestId('records-refugee-compact')).toBeNull();
  });
});

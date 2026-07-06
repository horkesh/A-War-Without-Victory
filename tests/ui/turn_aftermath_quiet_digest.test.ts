// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomStatusStrip } from '../../src/ui/map/components/BottomStatusStrip.js';
import { advanceTurnAndSync } from '../../src/ui/map/desktop/orderActions.js';
import {
  buildTurnAftermathDigest,
  classifyTurnAftermathWeight,
  type TurnAftermathView,
} from '../../src/ui/map/data/turnAftermath.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function makeAftermathView(overrides: Partial<TurnAftermathView> = {}): TurnAftermathView {
  return {
    turn: 12,
    dateLabel: '29 Jun 1992',
    playerFaction: 'RBiH',
    headline: 'No territorial change this turn.',
    narrativeLine: 'A quiet week is still a week of depletion, waiting, and staff work.',
    tone: 'quiet',
    territory: { friendlyNet: 0, gains: 0, losses: 0, notable: [] },
    combat: {
      battleCount: 0,
      friendlyBattleCount: 0,
      friendlyCasualties: 0,
      opposingCasualties: 0,
      territoryFlipsFromBattles: 0,
    },
    humanitarian: { displacedThisTurn: 0 },
    formations: { spawned: 0, destroyed: 0, ownSpawned: 0, ownDestroyed: 0 },
    supply: { ownSupplyDelta: 0, ownHeavyMunitionsDelta: 0 },
    cost: {
      friendlyMilitaryCasualties: 0,
      theaterMilitaryCasualties: 0,
      displacedThisTurn: 0,
      ownFormationsDestroyed: 0,
      ownSupplySpent: 0,
      ownHeavyMunitionsSpent: 0,
      severity: 'low',
      reasons: ['No major costs recorded'],
    },
    signals: [],
    judgment: {
      headline: 'No judgment recorded yet.',
      detail: 'No major cost, signal, action, or territorial change was recorded for this turn.',
      memoryTone: 'quiet',
      primarySurface: 'records',
      secondarySurface: 'codex',
    },
    nextActions: {
      actionableCount: 0,
      blockingCount: 0,
      opportunityCount: 0,
      reserveCount: 0,
      officerCount: 0,
      eventDecisionCount: 0,
      peaceCount: 0,
      topItems: [],
    },
    ...overrides,
  };
}

function makeLoadedState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  const state: LoadedGameState = {
    label: 'Turn 12',
    turn: 12,
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
  };
  return state;
}

function makeHeavyTurnSummary(): TurnSummary {
  return {
    turn: 13,
    territory_net: { RBiH: 1 },
    notable_flips: [{ osid: 'op:test:a', mun_id: 'test', from: 'RS', to: 'RBiH', significance: 'generic' }],
    battles: [],
    displacement_total: 0,
    displacement_by_ethnicity: {},
    formation_spawns: [],
    formation_destructions: [],
    supply_deltas: {},
    heavy_munitions_deltas: {},
    events_fired: [],
    notable_events: [],
    decoration_awards: [],
    arc_transitions: [],
    supply_transitions: [],
    movements: [],
  };
}

describe('turn aftermath quiet digest', () => {
  beforeEach(() => {
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });

  afterEach(() => {
    cleanup();
    setLocale('en');
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('classifies a fully recognized no-action aftermath as quiet', () => {
    expect(classifyTurnAftermathWeight(makeAftermathView())).toBe('quiet');
  });

  it.each([
    ['pending action', { nextActions: { ...makeAftermathView().nextActions, actionableCount: 1 } }],
    ['friendly battle', { combat: { ...makeAftermathView().combat, battleCount: 1, friendlyBattleCount: 1 } }],
    ['territory shift', { territory: { ...makeAftermathView().territory, friendlyNet: 1, gains: 1 } }],
    ['player casualties', { combat: { ...makeAftermathView().combat, friendlyCasualties: 3 } }],
    ['displacement', { humanitarian: { displacedThisTurn: 50 } }],
    ['strategic signal', { signals: [{ id: 'event:x', kind: 'event', label: 'Rupture', detail: 'Truce broken', severity: 'urgent' }] }],
  ] satisfies Array<[string, Partial<TurnAftermathView>]>)('classifies %s as heavy', (_label, overrides) => {
    expect(classifyTurnAftermathWeight(makeAftermathView(overrides))).toBe('heavy');
  });

  it('defaults unknown aftermath content to heavy', () => {
    const withUnknown = {
      ...makeAftermathView(),
      unclassifiedFutureField: { shouldNotBeHiddenInDigest: true },
    } as TurnAftermathView & { unclassifiedFutureField: unknown };

    expect(classifyTurnAftermathWeight(withUnknown)).toBe('heavy');
  });

  it('keeps quiet advances out of the modal ceremony and stores a digest line', async () => {
    let currentState = makeLoadedState();
    const setTurnAftermath = vi.fn();
    const setTurnAftermathOpen = vi.fn();
    const setTurnAftermathDigest = vi.fn();

    await advanceTurnAndSync({
      ipc: { advanceTurn: vi.fn(async () => ({ ok: true, stateJson: '{}' })) },
      loadSave: vi.fn(async () => { currentState = makeLoadedState({ turn: 13 }); }),
      clearStagedOrders: vi.fn(),
      setLoadError: vi.fn(),
      getCurrentState: () => currentState,
      getOsidNameMap: () => null,
      setLastTurnReport: vi.fn(),
      setTurnAftermath,
      setTurnAftermathOpen,
      setTurnAftermathDigest,
    });

    expect(setTurnAftermath).toHaveBeenCalledTimes(1);
    expect(setTurnAftermathOpen).not.toHaveBeenCalledWith(true);
    expect(setTurnAftermathDigest).toHaveBeenCalledWith(buildTurnAftermathDigest(makeAftermathView({
      turn: 13,
      dateLabel: '6 Jul 1992',
    })));
  });

  it('keeps heavy advances on the full aftermath modal path', async () => {
    let currentState = makeLoadedState();
    const setTurnAftermathOpen = vi.fn();
    const setTurnAftermathDigest = vi.fn();

    await advanceTurnAndSync({
      ipc: { advanceTurn: vi.fn(async () => ({ ok: true, stateJson: '{}' })) },
      loadSave: vi.fn(async () => {
        currentState = makeLoadedState({
          turn: 13,
          latestTurnSummary: makeHeavyTurnSummary(),
        });
      }),
      clearStagedOrders: vi.fn(),
      setLoadError: vi.fn(),
      getCurrentState: () => currentState,
      getOsidNameMap: () => null,
      setLastTurnReport: vi.fn(),
      setTurnAftermath: vi.fn(),
      setTurnAftermathOpen,
      setTurnAftermathDigest,
    });

    expect(setTurnAftermathOpen).toHaveBeenCalledWith(true);
    expect(setTurnAftermathDigest).toHaveBeenCalledWith(null);
  });

  it('renders the digest in the bottom strip and opens the retained report on review', () => {
    const view = makeAftermathView();
    useGameStore.setState({
      loadedGameState: makeLoadedState(),
      turnAftermath: view,
      turnAftermathOpen: false,
      turnAftermathDigest: buildTurnAftermathDigest(view),
    });

    render(createElement(BottomStatusStrip));

    expect(screen.getByText('Quiet turn filed. Full aftermath is available for review.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Review aftermath report' }));
    expect(useGameStore.getState().turnAftermathOpen).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss aftermath digest' }));
    expect(useGameStore.getState().turnAftermathDigest).toBeNull();
  });
});

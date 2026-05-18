/**
 * Tests that the presidential Decision Room surfaces a player-scoped
 * supply visibility card when supply is at risk, and stays silent when
 * supply is healthy or unknown. The card is sourced from the existing
 * supply read-model — the Decision Room is NOT a second owner of supply
 * truth.
 */
import { describe, expect, it } from 'vitest';
import { buildPresidentialDecisionRoomView } from '../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
  return {
    label: 'Test',
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
  } as LoadedGameState;
}

describe('PresidentialDecisionRoom supply visibility card', () => {
  it('emits no supply card when player supply is healthy', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        supplyStateByOsid: { 'op:sa:sarajevo_1': 'adequate' },
        supplySummaryByFaction: {
          RBiH: {
            adequate_count: 5,
            strained_count: 0,
            critical_count: 0,
            corridor_open_count: 3,
            corridor_brittle_count: 0,
            corridor_cut_count: 0,
          },
        },
      }),
    });
    expect(view.cards.find((card) => card.id === 'supply:player-visibility')).toBeUndefined();
  });

  it('emits no supply card when supply data is absent (unknown)', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState(),
    });
    expect(view.cards.find((card) => card.id === 'supply:player-visibility')).toBeUndefined();
  });

  it('emits a warning supply card when player corridors are brittle/cut', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        supplyStateByOsid: {
          'op:bi:bihac_1': 'strained',
        },
        supplySummaryByFaction: {
          RBiH: {
            adequate_count: 3,
            strained_count: 1,
            critical_count: 0,
            corridor_open_count: 2,
            corridor_brittle_count: 1,
            corridor_cut_count: 0,
          },
        },
      }),
    });
    const card = view.cards.find((c) => c.id === 'supply:player-visibility');
    expect(card).toBeDefined();
    expect(card!.severity === 'warning' || card!.severity === 'critical').toBe(true);
    expect(card!.category).toBe('operational');
    expect(card!.evidence.some((line) => /corridor/i.test(line))).toBe(true);
  });

  it('emits a critical supply card when player formations are isolated at critical OSIDs', () => {
    const view = buildPresidentialDecisionRoomView({
      state: makeState({
        formations: [
          {
            id: 'arbih_a',
            faction: 'RBiH',
            name: 'arbih_a',
            kind: 'brigade',
            readiness: 'ready',
            cohesion: 50,
            fatigue: 20,
            status: 'active',
            createdTurn: 0,
            tags: [],
            location_osid: 'op:bi:bihac_1',
          },
        ],
        supplyStateByOsid: {
          'op:bi:bihac_1': 'critical',
        },
        supplySummaryByFaction: {
          RBiH: {
            adequate_count: 0,
            strained_count: 0,
            critical_count: 1,
            corridor_open_count: 0,
            corridor_brittle_count: 0,
            corridor_cut_count: 1,
          },
        },
      }),
    });
    const card = view.cards.find((c) => c.id === 'supply:player-visibility');
    expect(card).toBeDefined();
    expect(card!.severity).toBe('critical');
    expect(card!.evidence.some((line) => /isolat|brigade|formation/i.test(line))).toBe(true);
  });

  it('does not leak enemy supply state into the card', () => {
    const enemyHeavy = buildPresidentialDecisionRoomView({
      state: makeState({
        supplyStateByOsid: { 'op:sa:sarajevo_1': 'adequate' },
        supplySummaryByFaction: {
          RBiH: {
            adequate_count: 4,
            strained_count: 0,
            critical_count: 0,
            corridor_open_count: 2,
            corridor_brittle_count: 0,
            corridor_cut_count: 0,
          },
          RS: {
            adequate_count: 0,
            strained_count: 0,
            critical_count: 20,
            corridor_open_count: 0,
            corridor_brittle_count: 5,
            corridor_cut_count: 5,
          },
        },
      }),
    });
    const enemyClean = buildPresidentialDecisionRoomView({
      state: makeState({
        supplyStateByOsid: { 'op:sa:sarajevo_1': 'adequate' },
        supplySummaryByFaction: {
          RBiH: {
            adequate_count: 4,
            strained_count: 0,
            critical_count: 0,
            corridor_open_count: 2,
            corridor_brittle_count: 0,
            corridor_cut_count: 0,
          },
        },
      }),
    });
    const cardHeavy = enemyHeavy.cards.find((c) => c.id === 'supply:player-visibility');
    const cardClean = enemyClean.cards.find((c) => c.id === 'supply:player-visibility');
    expect(cardHeavy).toBeUndefined();
    expect(cardClean).toBeUndefined();
  });
});

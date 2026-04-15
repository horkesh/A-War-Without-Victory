/**
 * Tests for CombatSummary aggregation system.
 *
 * Covers: createEmptyCombatSummary, aggregateBrigadeHistories, computeCombatSummaries.
 */

import { describe, expect, it } from 'vitest';
import { createEmptyBrigadeHistory } from '../src/state/brigade_history.js';
import type { BrigadeHistory } from '../src/state/brigade_history.js';
import {
    createEmptyCombatSummary,
    aggregateBrigadeHistories,
} from '../src/state/combat_summary.js';
import { computeCombatSummaries } from '../src/sim/combat/combat_summary_aggregator.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade',
        faction: 'RBiH',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 1500,
        kind: 'brigade',
        ...overrides,
    };
}

function makeHistory(overrides: Partial<BrigadeHistory> = {}): BrigadeHistory {
    return {
        ...createEmptyBrigadeHistory(2000),
        ...overrides,
    };
}

describe('createEmptyCombatSummary', () => {
    it('returns all-zero summary', () => {
        const s = createEmptyCombatSummary();
        expect(s.battles_fought).toBe(0);
        expect(s.victories).toBe(0);
        expect(s.defeats).toBe(0);
        expect(s.win_rate).toBe(0);
        expect(s.casualty_exchange_ratio).toBe(0);
        expect(s.brigade_count).toBe(0);
        expect(s.active_brigade_count).toBe(0);
        expect(s.most_casualties_brigade_id).toBeNull();
        expect(s.most_victories_brigade_id).toBeNull();
        expect(s.arc_distribution).toEqual({});
    });
});

describe('aggregateBrigadeHistories', () => {
    it('returns empty summary for no brigades', () => {
        const s = aggregateBrigadeHistories([]);
        expect(s.battles_fought).toBe(0);
        expect(s.brigade_count).toBe(0);
    });

    it('sums tallies from multiple brigades', () => {
        const b1 = makeFormation({
            id: 'bde_1',
            personnel: 1200,
            brigade_history: makeHistory({
                battles_fought: 10,
                battles_as_attacker: 6,
                battles_as_defender: 4,
                victories: 7,
                defeats: 2,
                stalemates: 1,
                total_casualties_taken: 300,
                total_casualties_inflicted: 500,
                total_osids_captured: 3,
                total_osids_lost: 1,
                peak_personnel: 2000,
                nadir_personnel: 800,
            }),
        });
        const b2 = makeFormation({
            id: 'bde_2',
            personnel: 1800,
            brigade_history: makeHistory({
                battles_fought: 5,
                battles_as_attacker: 2,
                battles_as_defender: 3,
                victories: 3,
                defeats: 1,
                stalemates: 1,
                total_casualties_taken: 200,
                total_casualties_inflicted: 250,
                total_osids_captured: 1,
                total_osids_lost: 0,
                peak_personnel: 2500,
                nadir_personnel: 1500,
            }),
        });

        const s = aggregateBrigadeHistories([b1, b2]);
        expect(s.battles_fought).toBe(15);
        expect(s.battles_as_attacker).toBe(8);
        expect(s.battles_as_defender).toBe(7);
        expect(s.victories).toBe(10);
        expect(s.defeats).toBe(3);
        expect(s.stalemates).toBe(2);
        expect(s.total_casualties_taken).toBe(500);
        expect(s.total_casualties_inflicted).toBe(750);
        expect(s.total_osids_captured).toBe(4);
        expect(s.total_osids_lost).toBe(1);
        expect(s.current_personnel).toBe(3000);
        expect(s.peak_aggregate_personnel).toBe(4500);
        expect(s.nadir_aggregate_personnel).toBe(2300);
        expect(s.brigade_count).toBe(2);
        expect(s.active_brigade_count).toBe(2);
    });

    it('computes win_rate correctly', () => {
        const b = makeFormation({
            id: 'bde_1',
            brigade_history: makeHistory({ battles_fought: 10, victories: 6 }),
        });
        const s = aggregateBrigadeHistories([b]);
        expect(s.win_rate).toBeCloseTo(0.6, 3);
    });

    it('computes casualty_exchange_ratio correctly', () => {
        const b = makeFormation({
            id: 'bde_1',
            brigade_history: makeHistory({
                battles_fought: 5,
                total_casualties_taken: 100,
                total_casualties_inflicted: 250,
            }),
        });
        const s = aggregateBrigadeHistories([b]);
        expect(s.casualty_exchange_ratio).toBeCloseTo(2.5, 3);
    });

    it('returns 0 win_rate when no battles', () => {
        const b = makeFormation({ id: 'bde_1' });
        const s = aggregateBrigadeHistories([b]);
        expect(s.win_rate).toBe(0);
    });

    it('returns 0 exchange ratio when no casualties taken', () => {
        const b = makeFormation({
            id: 'bde_1',
            brigade_history: makeHistory({
                battles_fought: 3,
                total_casualties_taken: 0,
                total_casualties_inflicted: 100,
            }),
        });
        const s = aggregateBrigadeHistories([b]);
        expect(s.casualty_exchange_ratio).toBe(0);
    });

    it('tracks most_casualties_brigade_id deterministically', () => {
        const b1 = makeFormation({
            id: 'bde_a',
            brigade_history: makeHistory({ total_casualties_taken: 500 }),
        });
        const b2 = makeFormation({
            id: 'bde_b',
            brigade_history: makeHistory({ total_casualties_taken: 800 }),
        });
        // Sorted order: bde_a then bde_b
        const s = aggregateBrigadeHistories([b1, b2]);
        expect(s.most_casualties_brigade_id).toBe('bde_b');
    });

    it('tracks most_victories_brigade_id deterministically (first wins tie)', () => {
        const b1 = makeFormation({
            id: 'bde_a',
            brigade_history: makeHistory({ victories: 5 }),
        });
        const b2 = makeFormation({
            id: 'bde_b',
            brigade_history: makeHistory({ victories: 5 }),
        });
        // Sorted order: bde_a first, bde_b ties but doesn't override (strict >)
        const s = aggregateBrigadeHistories([b1, b2]);
        expect(s.most_victories_brigade_id).toBe('bde_a');
    });

    it('counts active vs inactive brigades', () => {
        const b1 = makeFormation({ id: 'bde_a', status: 'active' });
        const b2 = makeFormation({ id: 'bde_b', status: 'inactive' });
        const s = aggregateBrigadeHistories([b1, b2]);
        expect(s.brigade_count).toBe(2);
        expect(s.active_brigade_count).toBe(1);
    });

    it('aggregates arc_distribution from war stories', () => {
        const b1 = makeFormation({
            id: 'bde_a',
            war_story: { formation_id: 'bde_a', formation_name: 'A', faction: 'RBiH', arc: 'veteran', narrative: '', notable_moments: [], stats: { battles_fought: 0, victories: 0, defeats: 0, total_casualties_taken: 0, total_casualties_inflicted: 0, final_personnel: 0, peak_personnel: 0, nadir_personnel: 0 } },
        });
        const b2 = makeFormation({
            id: 'bde_b',
            war_story: { formation_id: 'bde_b', formation_name: 'B', faction: 'RBiH', arc: 'veteran', narrative: '', notable_moments: [], stats: { battles_fought: 0, victories: 0, defeats: 0, total_casualties_taken: 0, total_casualties_inflicted: 0, final_personnel: 0, peak_personnel: 0, nadir_personnel: 0 } },
        });
        const b3 = makeFormation({
            id: 'bde_c',
            war_story: { formation_id: 'bde_c', formation_name: 'C', faction: 'RBiH', arc: 'bloodied', narrative: '', notable_moments: [], stats: { battles_fought: 0, victories: 0, defeats: 0, total_casualties_taken: 0, total_casualties_inflicted: 0, final_personnel: 0, peak_personnel: 0, nadir_personnel: 0 } },
        });
        const s = aggregateBrigadeHistories([b1, b2, b3]);
        expect(s.arc_distribution['veteran']).toBe(2);
        expect(s.arc_distribution['bloodied']).toBe(1);
    });

    it('handles brigades without brigade_history', () => {
        const b1 = makeFormation({ id: 'bde_a', personnel: 1000 });
        const b2 = makeFormation({
            id: 'bde_b',
            personnel: 2000,
            brigade_history: makeHistory({ battles_fought: 3, victories: 2 }),
        });
        const s = aggregateBrigadeHistories([b1, b2]);
        expect(s.brigade_count).toBe(2);
        expect(s.battles_fought).toBe(3);
        expect(s.current_personnel).toBe(3000);
    });
});

describe('computeCombatSummaries', () => {
    it('assigns combat_summary to corps formations', () => {
        const state = {
  meta: { phase: 'war' },
  military: {
    formations: {
                corps_1: makeFormation({ id: 'corps_1', kind: 'corps', faction: 'RBiH' }),
                bde_1: makeFormation({
                    id: 'bde_1', kind: 'brigade', faction: 'RBiH', corps_id: 'corps_1',
                    brigade_history: makeHistory({ battles_fought: 5, victories: 3 }),
                }),
                bde_2: makeFormation({
                    id: 'bde_2', kind: 'brigade', faction: 'RBiH', corps_id: 'corps_1',
                    brigade_history: makeHistory({ battles_fought: 3, victories: 1 }),
                }),
            }
  } as any,
} as unknown as GameState;

        computeCombatSummaries(state);

        const cs = state.military.formations!['corps_1'].combat_summary;
        expect(cs).toBeTruthy();
        expect(cs?.battles_fought).toBe(8);
        expect(cs?.victories).toBe(4);
        expect(cs?.brigade_count).toBe(2);
    });

    it('assigns combat_summary to army_hq formations (all faction brigades)', () => {
        const state = {
  meta: { phase: 'war' },
  military: {
    formations: {
                army_rbih: makeFormation({ id: 'army_rbih', kind: 'army_hq', faction: 'RBiH' }),
                corps_1: makeFormation({ id: 'corps_1', kind: 'corps', faction: 'RBiH' }),
                bde_1: makeFormation({
                    id: 'bde_1', kind: 'brigade', faction: 'RBiH', corps_id: 'corps_1',
                    brigade_history: makeHistory({ battles_fought: 10, victories: 7 }),
                }),
                bde_2: makeFormation({
                    id: 'bde_2', kind: 'brigade', faction: 'RS', corps_id: 'corps_rs',
                    brigade_history: makeHistory({ battles_fought: 4, victories: 2 }),
                }),
            }
  } as any,
} as unknown as GameState;

        computeCombatSummaries(state);

        const cs = state.military.formations!['army_rbih'].combat_summary;
        expect(cs).toBeTruthy();
        // Only RBiH brigades (bde_1)
        expect(cs?.battles_fought).toBe(10);
        expect(cs?.victories).toBe(7);
        expect(cs?.brigade_count).toBe(1);
    });

    it('assigns combat_summary to corps_asset formations', () => {
        const state = {
  meta: { phase: 'war' },
  military: {
    formations: {
                corps_asset_1: makeFormation({ id: 'corps_asset_1', kind: 'corps_asset', faction: 'RS' }),
                bde_1: makeFormation({
                    id: 'bde_1', kind: 'brigade', faction: 'RS', corps_id: 'corps_asset_1',
                    brigade_history: makeHistory({ battles_fought: 7, victories: 4 }),
                }),
            }
  } as any,
} as unknown as GameState;

        computeCombatSummaries(state);

        const cs = state.military.formations!['corps_asset_1'].combat_summary;
        expect(cs).toBeTruthy();
        expect(cs?.battles_fought).toBe(7);
        expect(cs?.victories).toBe(4);
        expect(cs?.brigade_count).toBe(1);
    });

    it('excludes OG formations from brigade tallies', () => {
        const state = {
  meta: { phase: 'war' },
  military: {
    formations: {
                corps_1: makeFormation({ id: 'corps_1', kind: 'corps', faction: 'RBiH' }),
                bde_1: makeFormation({
                    id: 'bde_1', kind: 'brigade', faction: 'RBiH', corps_id: 'corps_1',
                    brigade_history: makeHistory({ battles_fought: 5, victories: 3 }),
                }),
                og_1: makeFormation({
                    id: 'og_1', kind: 'og', faction: 'RBiH', corps_id: 'corps_1',
                    personnel: 3000,
                    brigade_history: makeHistory({ battles_fought: 2, victories: 1 }),
                }),
            }
  } as any,
} as unknown as GameState;

        computeCombatSummaries(state);

        const cs = state.military.formations!['corps_1'].combat_summary;
        expect(cs).toBeTruthy();
        // Only the brigade, not the OG
        expect(cs?.battles_fought).toBe(5);
        expect(cs?.brigade_count).toBe(1);
    });

    it('does not assign combat_summary to brigades', () => {
        const state = {
  meta: { phase: 'war' },
  military: {
    formations: {
                bde_1: makeFormation({
                    id: 'bde_1', kind: 'brigade', faction: 'RBiH',
                    brigade_history: makeHistory({ battles_fought: 5 }),
                }),
            }
  } as any,
} as unknown as GameState;

        computeCombatSummaries(state);
        expect(state.military.formations!['bde_1'].combat_summary).toBeUndefined();
    });
});

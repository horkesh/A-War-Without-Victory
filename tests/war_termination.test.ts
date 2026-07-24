/**
 * War termination system tests.
 * - Turn-limit triggers stalemate
 * - Faction collapse triggers victory
 * - game_over flag prevents further turn advancement
 * - Victory conditions evaluation
 */

import { describe, it, expect } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { checkWarTermination, applyWarTermination } from '../src/sim/war_termination.js';

function minimalWarState(overrides?: Partial<GameState['meta']>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'test-seed',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
            ...overrides
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: {
            formations: {
                'rbih_1st_bde': { faction: 'RBiH', kind: 'brigade', corps_id: 'rbih_1st_corps', personnel: 2000 },
                'rs_1st_bde': { faction: 'RS', kind: 'brigade', corps_id: 'rs_1st_corps', personnel: 2000 },
                'hrhb_1st_bde': { faction: 'HRHB', kind: 'brigade', corps_id: 'hrhb_1st_corps', personnel: 2000 },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as any,
        political: {
            political_controllers: {},
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('War Termination', () => {
    describe('Turn limit stalemate', () => {
        it('triggers stalemate when turn >= max_turns', () => {
            const state = minimalWarState({ turn: 208, max_turns: 208 });
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.outcome).toBe('timeout_stalemate');
            expect(result.trigger).toBe('turn_limit');
            expect(result.winner).toBeNull();
        });

        it('triggers stalemate when turn exceeds max_turns', () => {
            const state = minimalWarState({ turn: 210, max_turns: 208 });
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.outcome).toBe('timeout_stalemate');
            expect(result.trigger).toBe('turn_limit');
        });

        it('uses default max_turns (208) when not set', () => {
            const state = minimalWarState({ turn: 208 });
            delete state.meta.max_turns;
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.outcome).toBe('timeout_stalemate');
        });

        it('does not trigger when turn < max_turns', () => {
            const state = minimalWarState({ turn: 50, max_turns: 208 });
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(false);
        });

        it('respects custom max_turns', () => {
            const state = minimalWarState({ turn: 40, max_turns: 40 });
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.outcome).toBe('timeout_stalemate');
        });
    });

    describe('Faction collapse', () => {
        it('triggers victory when one faction has 0 brigades and only 1 remains', () => {
            const state = minimalWarState({ turn: 30 });
            // Remove RS and HRHB brigades — only RBiH survives
            delete (state.military.formations as any)['rs_1st_bde'];
            delete (state.military.formations as any)['hrhb_1st_bde'];
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.trigger).toBe('faction_collapse');
            expect(result.winner).toBe('RBiH');
            expect(result.outcome).toContain('faction_collapse');
            expect(result.outcome).toContain('winner:RBiH');
        });

        it('does not trigger when only one faction collapses (2 remain)', () => {
            const state = minimalWarState({ turn: 30 });
            // Remove only HRHB brigades — 2 factions remain
            delete (state.military.formations as any)['hrhb_1st_bde'];
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(false);
        });

        it('triggers mutual_collapse when all factions have 0 brigades', () => {
            const state = minimalWarState({ turn: 30 });
            state.military.formations = {};
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.outcome).toBe('mutual_collapse');
            expect(result.winner).toBeNull();
            expect(result.trigger).toBe('faction_collapse');
        });

        it('does not count corps/army_hq formations as active brigades', () => {
            const state = minimalWarState({ turn: 30 });
            // Replace all brigades with corps formations
            state.military.formations = {
                'rbih_1st_corps': { faction: 'RBiH', kind: 'corps', personnel: 0 },
                'rs_1st_corps': { faction: 'RS', kind: 'corps', personnel: 0 },
            } as any;
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.outcome).toBe('mutual_collapse');
        });

        it('RS wins when RBiH and HRHB both collapse', () => {
            const state = minimalWarState({ turn: 30 });
            delete (state.military.formations as any)['rbih_1st_bde'];
            delete (state.military.formations as any)['hrhb_1st_bde'];
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.winner).toBe('RS');
        });
    });

    describe('Victory conditions', () => {
        it('triggers victory when faction meets all conditions', () => {
            const state = minimalWarState({ turn: 30 });
            state.meta.victory_conditions = {
                by_faction: {
                    RS: { min_controlled_settlements: 2, max_exhaustion: 50 }
                }
            };
            // Give RS 3 controlled settlements
            state.political.political_controllers = {
                S1: 'RS',
                S2: 'RS',
                S3: 'RS',
                S4: 'RBiH'
            };
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.trigger).toBe('victory_condition');
            expect(result.winner).toBe('RS');
            expect(result.outcome).toBe('victory:RS');
        });

        it('does not trigger when victory conditions not met', () => {
            const state = minimalWarState({ turn: 30 });
            state.meta.victory_conditions = {
                by_faction: {
                    RS: { min_controlled_settlements: 500 }
                }
            };
            state.political.political_controllers = { S1: 'RS' };
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(false);
        });

        it('victory conditions take priority over turn limit', () => {
            const state = minimalWarState({ turn: 208, max_turns: 208 });
            state.meta.victory_conditions = {
                by_faction: {
                    RBiH: { min_controlled_settlements: 1 }
                }
            };
            state.political.political_controllers = { S1: 'RBiH' };
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.trigger).toBe('victory_condition');
            expect(result.winner).toBe('RBiH');
        });

        it('uses political war_exhaustion as the authoritative exhaustion value', () => {
            const state = minimalWarState({ turn: 30 });
            state.meta.victory_conditions = {
                by_faction: {
                    RBiH: { min_controlled_settlements: 1, max_exhaustion: 20 }
                }
            };
            state.political.political_controllers = { S1: 'RBiH' };
            state.political.war_exhaustion = { RBiH: 30, RS: 0, HRHB: 0 } as any;
            state.factions.find((f) => f.id === 'RBiH')!.profile.exhaustion = 10;

            const result = checkWarTermination(state);
            expect(result.game_over).toBe(false);
        });
    });

    describe('applyWarTermination', () => {
        it('sets game_over and outcome on state', () => {
            const state = minimalWarState({ turn: 30 });
            const result = checkWarTermination(minimalWarState({ turn: 208, max_turns: 208 }));
            applyWarTermination(state, result);
            expect(state.meta.game_over).toBe(true);
            expect(state.meta.outcome).toBe('timeout_stalemate');
        });

        it('does not modify state when game is not over', () => {
            const state = minimalWarState({ turn: 10 });
            const result = checkWarTermination(state);
            applyWarTermination(state, result);
            expect(state.meta.game_over).toBeUndefined();
            expect(state.meta.outcome).toBeUndefined();
        });
    });

    describe('Negotiated peace (v0.9.0 consequence system)', () => {
        it('triggers negotiated peace when war_ended_early flag is set', () => {
            const state = minimalWarState({ turn: 60 });
            state.military.event_flags = { war_ended_early: true, early_peace_implemented: true };
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.trigger).toBe('negotiated_peace');
            expect(result.outcome).toContain('negotiated_peace');
            expect(result.winner).toBeNull();
        });

        it('does not trigger when war_ended_early is not set', () => {
            const state = minimalWarState({ turn: 60 });
            state.military.event_flags = { some_other_flag: true };
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(false);
        });

        it('negotiated peace takes priority over turn limit', () => {
            const state = minimalWarState({ turn: 208, max_turns: 208 });
            state.military.event_flags = { war_ended_early: true };
            const result = checkWarTermination(state);
            expect(result.trigger).toBe('negotiated_peace');
        });

        it('negotiated peace takes priority over faction collapse and turn limit', () => {
            const state = minimalWarState({ turn: 208, max_turns: 208 });
            state.military.formations = {};
            state.military.event_flags = {
                war_ended_early: true,
                early_peace_implemented: 'vance_owen',
            };

            const result = checkWarTermination(state);

            expect(result).toEqual({
                game_over: true,
                outcome: 'negotiated_peace:vance_owen',
                winner: null,
                trigger: 'negotiated_peace',
            });
        });

        it('scenario victory retains priority over negotiated peace', () => {
            const state = minimalWarState({ turn: 30 });
            state.meta.victory_conditions = {
                by_faction: {
                    RS: { min_controlled_settlements: 1 },
                },
            };
            state.political.political_controllers = { S1: 'RS' };
            state.military.event_flags = {
                war_ended_early: true,
                early_peace_implemented: 'vance_owen',
            };

            const result = checkWarTermination(state);

            expect(result.trigger).toBe('victory_condition');
            expect(result.outcome).toBe('victory:RS');
        });
    });

    describe('game_over gate', () => {
        it('skips re-evaluation when already game_over', () => {
            const state = minimalWarState({ turn: 10, game_over: true, outcome: 'previous_outcome' });
            const result = checkWarTermination(state);
            expect(result.game_over).toBe(true);
            expect(result.outcome).toBe('previous_outcome');
            // Should return the existing outcome, not re-evaluate
            expect(result.trigger).toBeNull();
        });
    });
});

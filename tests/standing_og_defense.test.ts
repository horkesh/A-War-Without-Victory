import { describe, expect, it } from 'vitest';

import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';
import { createEmptyBrigadeHistory } from '../src/state/brigade_history.js';
import {
    detectStandingOgSoloDefenderHotspots,
    getStandingOgDefenseBrigadeIds,
    getStandingOgEngagedDefenseBrigadeIds,
    isStandingOgDefenseBrigadeAvailable,
} from '../src/sim/combat/standing_og_defense.js';

function makeSector(overrides: Partial<CorpsFrontSector>): CorpsFrontSector {
    return {
        sector_id: 'sector:arbih_3rd_corps:0',
        corps_id: 'arbih_3rd_corps',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: [],
        sub_segments: [],
        length_edges: 1,
        territory_osids: [],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
        ...overrides,
    };
}

describe('getStandingOgDefenseBrigadeIds', () => {
    it('preserves assigned-only roster when shared sector defense is disabled', () => {
        const sector = makeSector({
            assigned_brigade_ids: ['b2', 'b1'],
            reserve_brigade_ids: ['r1'],
            rear_brigade_ids: ['z1'],
        });

        expect(getStandingOgDefenseBrigadeIds(sector, false)).toEqual(['b2', 'b1']);
    });

    it('widens shared sector defense roster to assigned, reserve, and rear brigades deterministically', () => {
        const sector = makeSector({
            assigned_brigade_ids: ['b2', 'b1'],
            reserve_brigade_ids: ['r1', 'b1'],
            rear_brigade_ids: ['z1', 'r1'],
        });

        expect(getStandingOgDefenseBrigadeIds(sector, true)).toEqual(['b1', 'b2', 'r1', 'z1']);
    });
});

describe('getStandingOgEngagedDefenseBrigadeIds', () => {
    it('preserves primary-only engagement when shared sector defense is disabled', () => {
        const primary = { id: 'primary' };
        const weights = new Map([
            ['primary', 2],
            ['reserve', 1],
        ]);

        expect(getStandingOgEngagedDefenseBrigadeIds(primary, [{ id: 'reserve' }, primary], weights, false)).toEqual([
            'primary',
        ]);
    });

    it('returns deterministic positive-weight defender engagements when shared sector defense is enabled', () => {
        const primary = { id: 'primary' };
        const weights = new Map([
            ['reserve_b', 0.5],
            ['primary', 1],
            ['reserve_a', 0],
        ]);

        expect(getStandingOgEngagedDefenseBrigadeIds(primary, [
            { id: 'reserve_b' },
            { id: 'reserve_a' },
            primary,
        ], weights, true)).toEqual(['primary', 'reserve_b']);
    });

    it('falls back to the primary defender when no sector defender has positive weight', () => {
        const primary = { id: 'primary' };
        const weights = new Map([
            ['reserve', 0],
            ['primary', -1],
        ]);

        expect(getStandingOgEngagedDefenseBrigadeIds(primary, [{ id: 'reserve' }, primary], weights, true)).toEqual([
            'primary',
        ]);
    });
});

describe('isStandingOgDefenseBrigadeAvailable', () => {
    it('preserves availability when shared sector defense is disabled', () => {
        const state = {
            military: {
                corps_command: {
                    corps_a: {
                        active_operations: [
                            {
                                participating_brigades: ['brigade_a'],
                            },
                        ],
                    },
                },
            },
        } as unknown as GameState;

        expect(isStandingOgDefenseBrigadeAvailable(state, 'brigade_a', false)).toBe(true);
    });

    it('excludes brigades committed to active operations when shared sector defense is enabled', () => {
        const state = {
            military: {
                corps_command: {
                    corps_a: {
                        active_operations: [
                            {
                                participating_brigades: ['brigade_a'],
                            },
                        ],
                    },
                },
            },
        } as unknown as GameState;

        expect(isStandingOgDefenseBrigadeAvailable(state, 'brigade_a', true)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'brigade_b', true)).toBe(true);
    });

    it('excludes axis-assigned operation brigades when shared sector defense is enabled', () => {
        const state = {
            military: {
                corps_command: {
                    corps_a: {
                        active_operations: [
                            {
                                axes: [
                                    { assigned_brigades: ['axis_brigade'] },
                                ],
                            },
                        ],
                    },
                },
            },
        } as unknown as GameState;

        expect(isStandingOgDefenseBrigadeAvailable(state, 'axis_brigade', true)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'other_brigade', true)).toBe(true);
    });

    it('excludes active tactical-group anchors and donors when shared sector defense is enabled', () => {
        const state = {
            military: {
                tactical_groups: {
                    'tg:a': {
                        status: 'active',
                        anchor_brigade_id: 'anchor',
                        donor_contributions: [{ brigade_id: 'donor' }],
                    },
                    'tg:b': {
                        status: 'dissolved',
                        anchor_brigade_id: 'released_anchor',
                        donor_contributions: [{ brigade_id: 'released_donor' }],
                    },
                },
            },
        } as unknown as GameState;

        expect(isStandingOgDefenseBrigadeAvailable(state, 'anchor', true)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'donor', true)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'released_anchor', true)).toBe(true);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'released_donor', true)).toBe(true);
    });
});

function makeBrigade(overrides: Partial<FormationState>): FormationState {
    return {
        id: 'brigade',
        name: 'Brigade',
        faction: 'RBiH',
        kind: 'infantry',
        status: 'active',
        corps_id: 'arbih_3rd_corps',
        personnel: 1000,
        equipment: { tanks: 0, artillery: 0 },
        location_osid: 'op:kakanj:brnjic_2',
        brigade_history: createEmptyBrigadeHistory(1000),
        ...overrides,
    } as FormationState;
}

function recordDefenses(formation: FormationState, osid: string, turns: number[]): void {
    const history = formation.brigade_history ?? createEmptyBrigadeHistory(formation.personnel ?? 0);
    for (const turn of turns) {
        history.engagements.push({
            turn,
            osid,
            role: 'defender',
            outcome: 'stalemate',
            casualties_taken: 0,
            casualties_inflicted: 0,
            enemy_faction: 'RS',
            territory_flipped: false,
            was_concentrated: false,
        });
    }
    history.battles_fought = turns.length;
    history.battles_as_defender = turns.length;
    formation.brigade_history = history;
}

describe('detectStandingOgSoloDefenderHotspots', () => {
    it('flags a front holder repeatedly defending one OSID while full-strength same-OG reserves never fight', () => {
        const holder = makeBrigade({ id: 'arbih_7th_viteska', personnel: 450 });
        recordDefenses(holder, 'op:kakanj:brnjic_2', [1, 2, 3, 4]);
        const reserve = makeBrigade({
            id: 'arbih_329th_mountain',
            personnel: 1800,
            location_osid: 'op:kakanj:rear_1',
            brigade_history: createEmptyBrigadeHistory(1800),
        });
        const sector = makeSector({
            assigned_brigade_ids: [holder.id],
            reserve_brigade_ids: [reserve.id],
            edge_ids: ['edge:kakanj'],
            territory_osids: ['op:kakanj:brnjic_2', 'op:kakanj:rear_1'],
        });
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {
                    [holder.id]: holder,
                    [reserve.id]: reserve,
                },
                corps_front_sectors: {
                    [sector.sector_id]: sector,
                },
            },
        } as unknown as GameState;

        expect(detectStandingOgSoloDefenderHotspots(state, { minDefenderTurns: 4 })).toEqual([
            {
                sector_id: sector.sector_id,
                holder_brigade_id: holder.id,
                contested_osid: 'op:kakanj:brnjic_2',
                defender_turns: 4,
                idle_same_og_brigade_ids: [reserve.id],
            },
        ]);
    });

    it('does not flag when the same-OG reserve has also fought', () => {
        const holder = makeBrigade({ id: 'arbih_7th_viteska', personnel: 450 });
        recordDefenses(holder, 'op:kakanj:brnjic_2', [1, 2, 3, 4]);
        const reserve = makeBrigade({
            id: 'arbih_329th_mountain',
            personnel: 1800,
            location_osid: 'op:kakanj:rear_1',
            brigade_history: createEmptyBrigadeHistory(1800),
        });
        recordDefenses(reserve, 'op:kakanj:brnjic_2', [4]);
        const sector = makeSector({
            assigned_brigade_ids: [holder.id],
            reserve_brigade_ids: [reserve.id],
            edge_ids: ['edge:kakanj'],
            territory_osids: ['op:kakanj:brnjic_2', 'op:kakanj:rear_1'],
        });
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {
                    [holder.id]: holder,
                    [reserve.id]: reserve,
                },
                corps_front_sectors: {
                    [sector.sector_id]: sector,
                },
            },
        } as unknown as GameState;

        expect(detectStandingOgSoloDefenderHotspots(state, { minDefenderTurns: 4 })).toEqual([]);
    });

    it('does not flag when the same-OG reserve paid shared defensive fatigue', () => {
        const holder = makeBrigade({ id: 'arbih_7th_viteska', personnel: 450 });
        recordDefenses(holder, 'op:kakanj:brnjic_2', [1, 2, 3, 4]);
        const reserve = makeBrigade({
            id: 'arbih_329th_mountain',
            personnel: 1800,
            ops: { fatigue: 0.5, last_supplied_turn: null },
            location_osid: 'op:kakanj:rear_1',
            brigade_history: createEmptyBrigadeHistory(1800),
        });
        const sector = makeSector({
            assigned_brigade_ids: [holder.id],
            reserve_brigade_ids: [reserve.id],
            edge_ids: ['edge:kakanj'],
            territory_osids: ['op:kakanj:brnjic_2', 'op:kakanj:rear_1'],
        });
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {
                    [holder.id]: holder,
                    [reserve.id]: reserve,
                },
                corps_front_sectors: {
                    [sector.sector_id]: sector,
                },
            },
        } as unknown as GameState;

        expect(detectStandingOgSoloDefenderHotspots(state, { minDefenderTurns: 4 })).toEqual([]);
    });

    it('does not count a full-strength reserve as idle once it is committed to a contested front edge', () => {
        const holder = makeBrigade({ id: 'arbih_7th_viteska', personnel: 450 });
        recordDefenses(holder, 'op:kakanj:brnjic_2', [1, 2, 3, 4]);
        const reserve = makeBrigade({
            id: 'arbih_329th_mountain',
            personnel: 1800,
            location_osid: 'op:kakanj:brnjic_2',
            brigade_history: createEmptyBrigadeHistory(1800),
        });
        const sector = makeSector({
            assigned_brigade_ids: [holder.id],
            reserve_brigade_ids: [reserve.id],
            edge_ids: ['edge:kakanj'],
            territory_osids: ['op:kakanj:brnjic_2', 'op:kakanj:rear_1'],
            sub_segments: [{
                sub_segment_id: 'subseg:kakanj:front',
                friendly_osids: ['op:kakanj:brnjic_2'],
                enemy_osids: ['op:kakanj:enemy_1'],
                primary_brigade_ids: [holder.id],
                edge_ids: ['edge:kakanj'],
                length_edges: 1,
            }],
        });
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {
                    [holder.id]: holder,
                    [reserve.id]: reserve,
                },
                corps_front_sectors: {
                    [sector.sector_id]: sector,
                },
            },
        } as unknown as GameState;

        expect(detectStandingOgSoloDefenderHotspots(state, { minDefenderTurns: 4 })).toEqual([]);
    });

    it('flags repeated sector defense even when the final sector has multiple assigned brigades', () => {
        const holder = makeBrigade({ id: 'arbih_7th_viteska', personnel: 450 });
        recordDefenses(holder, 'op:kakanj:brnjic_2', [1, 2, 3, 4]);
        const assignedPeer = makeBrigade({
            id: 'arbih_309th_mountain',
            personnel: 1200,
            brigade_history: createEmptyBrigadeHistory(1200),
        });
        const reserve = makeBrigade({
            id: 'arbih_329th_mountain',
            personnel: 1800,
            location_osid: 'op:kakanj:rear_1',
            brigade_history: createEmptyBrigadeHistory(1800),
        });
        const sector = makeSector({
            assigned_brigade_ids: [holder.id, assignedPeer.id],
            reserve_brigade_ids: [reserve.id],
            edge_ids: ['edge:kakanj'],
            territory_osids: ['op:kakanj:brnjic_2', 'op:kakanj:rear_1'],
        });
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {
                    [holder.id]: holder,
                    [assignedPeer.id]: assignedPeer,
                    [reserve.id]: reserve,
                },
                corps_front_sectors: {
                    [sector.sector_id]: sector,
                },
            },
        } as unknown as GameState;

        expect(detectStandingOgSoloDefenderHotspots(state, { minDefenderTurns: 4 })).toEqual([{
            sector_id: sector.sector_id,
            holder_brigade_id: holder.id,
            contested_osid: 'op:kakanj:brnjic_2',
            defender_turns: 4,
            idle_same_og_brigade_ids: [assignedPeer.id, reserve.id],
        }]);
    });

    it('ignores defender history outside the current sector territory', () => {
        const holder = makeBrigade({ id: 'arbih_7th_viteska', personnel: 450 });
        recordDefenses(holder, 'op:zenica:outside_2', [1, 2, 3, 4]);
        const reserve = makeBrigade({
            id: 'arbih_329th_mountain',
            personnel: 1800,
            brigade_history: createEmptyBrigadeHistory(1800),
        });
        const sector = makeSector({
            assigned_brigade_ids: [holder.id],
            reserve_brigade_ids: [reserve.id],
            edge_ids: ['edge:kakanj'],
            territory_osids: ['op:kakanj:brnjic_2'],
        });
        const state = {
            meta: { turn: 40 },
            military: {
                formations: {
                    [holder.id]: holder,
                    [reserve.id]: reserve,
                },
                corps_front_sectors: {
                    [sector.sector_id]: sector,
                },
            },
        } as unknown as GameState;

        expect(detectStandingOgSoloDefenderHotspots(state, { minDefenderTurns: 4 })).toEqual([]);
    });
});

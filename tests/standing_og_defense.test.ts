import { describe, expect, it } from 'vitest';

import type { CorpsFrontSector, FormationState, GameState } from '../src/state/game_state.js';
import { createEmptyBrigadeHistory } from '../src/state/brigade_history.js';
import {
    detectStandingOgSoloDefenderHotspots,
    getStandingOgDefenseBrigadeIds,
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
});

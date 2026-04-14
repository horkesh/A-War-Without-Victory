import { describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import {
    checkAdjacentUncontestedTerritory,
    checkUndefendedPaintedMismatch,
} from '../src/scenario/anomaly_checks_extended.js';

function makeState(overrides?: {
    formations?: Record<string, any>;
    sectors?: Record<string, any>;
    controllers?: Record<string, string>;
    warFrontEdges?: Array<{ edge_id?: string; a: string; b: string; side_a: string | null; side_b: string | null }>;
}): GameState {
    return {
        meta: { turn: 40, phase: 'war' },
        military: {
            formations: overrides?.formations ?? {},
            corps_front_sectors: overrides?.sectors ?? {},
            war_front_edges_osid: overrides?.warFrontEdges ?? [],
        },
        political: {
            political_controllers: overrides?.controllers ?? {},
            rbih_hrhb_state: { war_started_turn: null },
        },
    } as unknown as GameState;
}

function makeSector(overrides?: {
    sector_id?: string;
    corps_id?: string;
    faction?: string;
    territory_osids?: string[];
    friendly_osids?: string[];
    assigned_brigade_ids?: string[];
    reserve_brigade_ids?: string[];
    opposing_factions?: string[];
}): any {
    const friendlyOsids = overrides?.friendly_osids ?? overrides?.territory_osids ?? [];
    return {
        sector_id: overrides?.sector_id ?? 'sector:arbih_2nd_corps:0',
        corps_id: overrides?.corps_id ?? 'arbih_2nd_corps',
        faction: overrides?.faction ?? 'RBiH',
        sub_segments: [
            {
                sub_segment_id: 'subseg:0',
                edge_ids: ['edge:1'],
                friendly_osids: friendlyOsids,
                enemy_osids: ['op:enemy:front'],
                primary_brigade_ids: [],
                length_edges: 1,
            },
        ],
        edge_ids: ['edge:1'],
        territory_osids: overrides?.territory_osids ?? friendlyOsids,
        assigned_brigade_ids: overrides?.assigned_brigade_ids ?? ['arbih_covering_brigade'],
        reserve_brigade_ids: overrides?.reserve_brigade_ids ?? [],
        opposing_factions: overrides?.opposing_factions ?? ['RS'],
        density: 1,
        defensive_power: 100,
        threat_ratio: 1,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeBrigade(overrides?: {
    id?: string;
    faction?: string;
    corps_id?: string;
    location_osid?: string;
}): any {
    return {
        id: overrides?.id ?? 'arbih_covering_brigade',
        faction: overrides?.faction ?? 'RBiH',
        corps_id: overrides?.corps_id ?? 'arbih_2nd_corps',
        kind: 'brigade',
        status: 'active',
        location_osid: overrides?.location_osid ?? 'op:brcko:brka_2',
        personnel: 1000,
        morale: 60,
        cohesion: 60,
        experience: 0.2,
    };
}

describe('territorial anomaly checks respect canonical sector coverage', () => {
    it('suppresses undefended painted mismatch when controller still has sector coverage over the OSID', () => {
        const osid = 'op:brcko:skakava_donja';
        const state = makeState({
            formations: {
                arbih_covering_brigade: makeBrigade(),
            },
            sectors: {
                'sector:arbih_2nd_corps:0': makeSector({
                    territory_osids: [osid, 'op:brcko:brka_2'],
                    friendly_osids: ['op:brcko:brka_2'],
                }),
            },
            controllers: {
                [osid]: 'RBiH',
                'op:brcko:brka_2': 'RBiH',
            },
        });

        const reports = checkUndefendedPaintedMismatch(state);
        expect(reports).toEqual([]);
    });

    it('still reports undefended painted mismatch when there is no brigade and no sector coverage', () => {
        const osid = 'op:brcko:skakava_donja';
        const state = makeState({
            formations: {},
            sectors: {},
            controllers: {
                [osid]: 'RBiH',
            },
        });

        const reports = checkUndefendedPaintedMismatch(state);
        expect(reports).toHaveLength(1);
        expect(reports[0]?.type).toBe('undefended_painted_mismatch');
        expect(reports[0]?.entities).toContain(osid);
    });

    it('suppresses adjacent uncontested territory when controller still has sector coverage over the OSID', () => {
        const osid = 'op:brcko:skakava_donja';
        const enemyOsid = 'op:gradacac:pelagicevo';
        const state = makeState({
            formations: {
                arbih_covering_brigade: makeBrigade(),
                rs_adjacent_brigade: makeBrigade({
                    id: 'rs_adjacent_brigade',
                    faction: 'RS',
                    corps_id: 'vrs_1st_krajina',
                    location_osid: enemyOsid,
                }),
            },
            sectors: {
                'sector:arbih_2nd_corps:0': makeSector({
                    territory_osids: [osid, 'op:brcko:brka_2'],
                    friendly_osids: ['op:brcko:brka_2'],
                }),
            },
            controllers: {
                [osid]: 'RBiH',
                'op:brcko:brka_2': 'RBiH',
                [enemyOsid]: 'RS',
            },
            warFrontEdges: [
                {
                    edge_id: `${enemyOsid}__${osid}`,
                    a: enemyOsid,
                    b: osid,
                    side_a: 'RS',
                    side_b: 'RBiH',
                },
            ],
        });

        const reports = checkAdjacentUncontestedTerritory(state);
        expect(reports).toEqual([]);
    });

    it('still reports adjacent uncontested territory when controller has no sector coverage', () => {
        const osid = 'op:brcko:skakava_donja';
        const enemyOsid = 'op:gradacac:pelagicevo';
        const state = makeState({
            formations: {
                rs_adjacent_brigade: makeBrigade({
                    id: 'rs_adjacent_brigade',
                    faction: 'RS',
                    corps_id: 'vrs_1st_krajina',
                    location_osid: enemyOsid,
                }),
            },
            sectors: {},
            controllers: {
                [osid]: 'RBiH',
                [enemyOsid]: 'RS',
            },
            warFrontEdges: [
                {
                    edge_id: `${enemyOsid}__${osid}`,
                    a: enemyOsid,
                    b: osid,
                    side_a: 'RS',
                    side_b: 'RBiH',
                },
            ],
        });

        const reports = checkAdjacentUncontestedTerritory(state);
        expect(reports).toHaveLength(1);
        expect(reports[0]?.type).toBe('adjacent_uncontested_territory');
        expect(reports[0]?.entities).toContain(osid);
    });

    it('suppresses adjacent uncontested territory when the adjacent brigade is a different faction but the canonical war-front packet has no active hostile edge', () => {
        const osid = 'op:konjic:turija';
        const adjacentRbih = 'op:konjic:celebici_2';
        const unrelatedRsFront = 'op:konjic:bijela_2';
        const state = makeState({
            formations: {
                arbih_adjacent_brigade: makeBrigade({
                    id: 'arbih_adjacent_brigade',
                    faction: 'RBiH',
                    corps_id: 'arbih_4th_corps',
                    location_osid: adjacentRbih,
                }),
            },
            sectors: {},
            controllers: {
                [osid]: 'HRHB',
                [adjacentRbih]: 'RBiH',
                [unrelatedRsFront]: 'RS',
            },
            warFrontEdges: [
                {
                    edge_id: `${unrelatedRsFront}__${osid}`,
                    a: unrelatedRsFront,
                    b: osid,
                    side_a: 'RS',
                    side_b: 'HRHB',
                },
            ],
        });

        const reports = checkAdjacentUncontestedTerritory(state);
        expect(reports).toEqual([]);
    });
});

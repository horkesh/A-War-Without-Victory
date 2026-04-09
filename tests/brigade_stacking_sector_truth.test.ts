import { describe, expect, it } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import { runAnomalyDetection } from '../src/scenario/anomaly_detector.js';

function makeBrigade(overrides?: {
    id?: string;
    faction?: string;
    corps_id?: string;
    location_osid?: string;
    assignment?: unknown;
}): any {
    const location = overrides?.location_osid ?? 'op:bihac:bihac_2';
    return {
        id: overrides?.id ?? 'brig_a',
        faction: overrides?.faction ?? 'RBiH',
        corps_id: overrides?.corps_id ?? 'arbih_5th_corps',
        kind: 'brigade',
        status: 'active',
        location_osid: location,
        home_osid: location,
        assignment: overrides?.assignment ?? null,
        brigade_history: {
            battles_as_attacker: 0,
            battles_as_defender: 0,
            engagements: [],
        },
        personnel: 1000,
        morale: 60,
        cohesion: 60,
        experience: 0.2,
        disrupted_turns: 0,
    };
}

function makeState(overrides?: {
    formations?: Record<string, any>;
    sectors?: Record<string, any>;
}): GameState {
    return {
        meta: { turn: 40, phase: 'war', seed: 'brigade-stacking-sector-truth' },
        military: {
            formations: overrides?.formations ?? {},
            corps_front_sectors: overrides?.sectors ?? {},
            corps_command: {},
        },
        political: {
            political_controllers: {},
            rbih_hrhb_state: { war_started_turn: null },
        },
        displacement: {},
        operation_history: [],
    } as unknown as GameState;
}

describe('brigade stacking respects canonical sector truth', () => {
    it('suppresses same-sector frontline co-location at a canonically covered OSID', () => {
        const osid = 'op:bihac:bihac_2';
        const sectorId = 'sector:arbih_5th_corps:0';
        const state = makeState({
            formations: {
                arbih_501st_slavna_mountain: makeBrigade({
                    id: 'arbih_501st_slavna_mountain',
                    location_osid: osid,
                    assignment: { kind: 'sector', role: 'front', sector_id: sectorId },
                }),
                arbih_503rd_slavna_mountain: makeBrigade({
                    id: 'arbih_503rd_slavna_mountain',
                    location_osid: osid,
                    assignment: { kind: 'sector', role: 'front', sector_id: sectorId },
                }),
            },
            sectors: {
                [sectorId]: {
                    sector_id: sectorId,
                    corps_id: 'arbih_5th_corps',
                    faction: 'RBiH',
                    assigned_brigade_ids: ['arbih_501st_slavna_mountain', 'arbih_503rd_slavna_mountain'],
                    reserve_brigade_ids: [],
                    territory_osids: [osid],
                    sub_segments: [
                        {
                            sub_segment_id: 'subseg:0',
                            edge_ids: ['edge:1'],
                            friendly_osids: [osid],
                            enemy_osids: ['op:bihac:enemy'],
                            primary_brigade_ids: ['arbih_501st_slavna_mountain'],
                            length_edges: 1,
                        },
                    ],
                    edge_ids: ['edge:1'],
                    opposing_factions: ['RS'],
                    density: 1,
                    defensive_power: 100,
                    threat_ratio: 1,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
            },
        });

        const anomalies = runAnomalyDetection(state);
        expect(anomalies.some((report) => report.type === 'brigade_stacking')).toBe(false);
    });

    it('keeps ownerless co-location warnings when there is no live sector owner', () => {
        const osid = 'op:banja_luka:banja_luka_2';
        const state = makeState({
            formations: {
                rs_1st_podrinje: makeBrigade({
                    id: 'rs_1st_podrinje',
                    faction: 'RS',
                    corps_id: 'vrs_drina',
                    location_osid: osid,
                    assignment: null,
                }),
                rs_5th_podrinje: makeBrigade({
                    id: 'rs_5th_podrinje',
                    faction: 'RS',
                    corps_id: 'vrs_drina',
                    location_osid: osid,
                    assignment: null,
                }),
            },
            sectors: {},
        });

        const anomalies = runAnomalyDetection(state);
        const stacking = anomalies.find((report) => report.type === 'brigade_stacking');

        expect(stacking).toBeDefined();
        expect(stacking?.entities).toEqual([osid]);
    });
});

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

    it('does not accuse unassigned army-HQ reserves co-located with a sector brigade', () => {
        const osid = 'op:visoko:visoko_2';
        const sectorId = 'sector:arbih_1st_corps:0';
        const state = makeState({
            formations: {
                arbih_146th_light: makeBrigade({
                    id: 'arbih_146th_light',
                    location_osid: osid,
                    assignment: { kind: 'sector', role: 'front', sector_id: sectorId },
                }),
                arbih_guards_brigade: makeBrigade({
                    id: 'arbih_guards_brigade',
                    corps_id: 'arbih_general_staff',
                    location_osid: osid,
                    assignment: null,
                }),
            },
            sectors: {
                [sectorId]: {
                    sector_id: sectorId,
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    assigned_brigade_ids: ['arbih_146th_light'],
                    reserve_brigade_ids: [],
                    territory_osids: [osid],
                    sub_segments: [
                        {
                            sub_segment_id: 'subseg:0',
                            edge_ids: ['edge:1'],
                            friendly_osids: [osid],
                            enemy_osids: ['op:visoko:enemy'],
                            primary_brigade_ids: ['arbih_146th_light'],
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

    it('does not accuse same-corps sibling sectors sharing a frontline knot OSID', () => {
        const osid = 'op:donji_vakuf:komar_2';
        const leftSectorId = 'sector:vrs_1st_krajina:1';
        const rightSectorId = 'sector:vrs_1st_krajina:2';
        const state = makeState({
            formations: {
                rs_31st_light_infantry: makeBrigade({
                    id: 'rs_31st_light_infantry',
                    faction: 'RS',
                    corps_id: 'vrs_1st_krajina',
                    location_osid: osid,
                    assignment: { kind: 'sector', role: 'front', sector_id: leftSectorId },
                }),
                rs_2nd_banja_luka_light_infantry: makeBrigade({
                    id: 'rs_2nd_banja_luka_light_infantry',
                    faction: 'RS',
                    corps_id: 'vrs_1st_krajina',
                    location_osid: osid,
                    assignment: { kind: 'sector', role: 'front', sector_id: rightSectorId },
                }),
            },
            sectors: {
                [leftSectorId]: {
                    sector_id: leftSectorId,
                    corps_id: 'vrs_1st_krajina',
                    faction: 'RS',
                    assigned_brigade_ids: ['rs_31st_light_infantry'],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: [],
                    territory_osids: [
                        'op:donji_vakuf:donji_vakuf_2',
                        'op:donji_vakuf:jemanlici',
                        osid,
                        'op:donji_vakuf:prusac_2',
                    ],
                    sub_segments: [
                        {
                            sub_segment_id: 'subseg:left',
                            edge_ids: ['edge:left'],
                            friendly_osids: [
                                'op:donji_vakuf:donji_vakuf_2',
                                'op:donji_vakuf:jemanlici',
                                osid,
                                'op:donji_vakuf:prusac_2',
                            ],
                            enemy_osids: ['op:bugojno:kula_2'],
                            primary_brigade_ids: ['rs_31st_light_infantry'],
                            length_edges: 4,
                        },
                    ],
                    edge_ids: ['edge:left'],
                    opposing_factions: ['RBiH'],
                    density: 1,
                    defensive_power: 100,
                    threat_ratio: 1,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
                [rightSectorId]: {
                    sector_id: rightSectorId,
                    corps_id: 'vrs_1st_krajina',
                    faction: 'RS',
                    assigned_brigade_ids: ['rs_2nd_banja_luka_light_infantry'],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: [],
                    territory_osids: [osid, 'op:travnik:varosluk'],
                    sub_segments: [
                        {
                            sub_segment_id: 'subseg:right',
                            edge_ids: ['edge:right'],
                            friendly_osids: [osid, 'op:travnik:varosluk'],
                            enemy_osids: ['op:travnik:paklarevo'],
                            primary_brigade_ids: ['rs_2nd_banja_luka_light_infantry'],
                            length_edges: 2,
                        },
                    ],
                    edge_ids: ['edge:right'],
                    opposing_factions: ['RBiH'],
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

    it('does not accuse a loaned army-HQ rear brigade co-located with the sector reserve in rear territory', () => {
        const osid = 'op:sokolac:donji_kalimanici';
        const sectorId = 'sector:vrs_sarajevo_romanija:3';
        const state = makeState({
            formations: {
                rs_4th_sarajevo_light_infantry: makeBrigade({
                    id: 'rs_4th_sarajevo_light_infantry',
                    faction: 'RS',
                    corps_id: 'vrs_sarajevo_romanija',
                    location_osid: 'op:pale:bulozi',
                    assignment: { kind: 'sector', role: 'front', sector_id: sectorId },
                }),
                rs_2nd_romanija_brigade: makeBrigade({
                    id: 'rs_2nd_romanija_brigade',
                    faction: 'RS',
                    corps_id: 'vrs_sarajevo_romanija',
                    location_osid: osid,
                    assignment: { kind: 'sector', role: 'reserve', sector_id: sectorId },
                }),
                rs_65th_protection_motorized_regiment: {
                    ...makeBrigade({
                        id: 'rs_65th_protection_motorized_regiment',
                        faction: 'RS',
                        corps_id: 'vrs_main_staff',
                        location_osid: osid,
                        assignment: { kind: 'sector', role: 'reserve', sector_id: sectorId },
                    }),
                    elite_loan_state: {
                        on_loan: true,
                        loaned_to_corps: 'vrs_sarajevo_romanija',
                    },
                },
            },
            sectors: {
                [sectorId]: {
                    sector_id: sectorId,
                    corps_id: 'vrs_sarajevo_romanija',
                    faction: 'RS',
                    assigned_brigade_ids: ['rs_4th_sarajevo_light_infantry'],
                    reserve_brigade_ids: ['rs_2nd_romanija_brigade'],
                    rear_brigade_ids: ['rs_65th_protection_motorized_regiment'],
                    territory_osids: [osid, 'op:pale:bulozi'],
                    sub_segments: [
                        {
                            sub_segment_id: 'subseg:srk',
                            edge_ids: ['edge:srk'],
                            friendly_osids: ['op:pale:bulozi'],
                            enemy_osids: ['op:rogatica:enemy'],
                            primary_brigade_ids: ['rs_4th_sarajevo_light_infantry'],
                            length_edges: 1,
                        },
                    ],
                    edge_ids: ['edge:srk'],
                    opposing_factions: ['RBiH'],
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
});

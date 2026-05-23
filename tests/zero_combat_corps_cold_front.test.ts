import { describe, expect, it } from 'vitest';

import { checkZeroCombatCorps } from '../src/scenario/anomaly_checks_extended.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    GameState,
} from '../src/state/game_state.js';

function makeSubSeg(
    id: string,
    friendlyOsids: string[],
    enemyOsids: string[],
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: [`edge_${id}`],
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: 1,
        primary_brigade_ids: [],
    };
}

function makeSector(overrides: {
    sectorId: string;
    corpsId: string;
    faction: FactionId;
    opposingFactions: FactionId[];
    subSegments: CorpsFrontSubSegment[];
}): CorpsFrontSector {
    return {
        sector_id: overrides.sectorId,
        corps_id: overrides.corpsId,
        faction: overrides.faction,
        opposing_factions: overrides.opposingFactions,
        edge_ids: overrides.subSegments.flatMap((segment) => segment.edge_ids),
        sub_segments: overrides.subSegments,
        length_edges: overrides.subSegments.length,
        territory_osids: overrides.subSegments.flatMap((segment) => segment.friendly_osids),
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeBrigade(overrides: {
    id: string;
    faction: FactionId;
    corpsId: string;
    battlesAttacker?: number;
    battlesDefender?: number;
}): Record<string, unknown> {
    return {
        id: overrides.id,
        faction: overrides.faction,
        kind: 'brigade',
        status: 'active',
        corps_id: overrides.corpsId,
        brigade_history: {
            battles_as_attacker: overrides.battlesAttacker ?? 0,
            battles_as_defender: overrides.battlesDefender ?? 0,
        },
    };
}

describe('checkZeroCombatCorps', () => {
    it('suppresses zero-combat warnings for Graz cold-front corps', () => {
        const state = {
            meta: { turn: 40, phase: 'war' },
            political: {
                vienna_declaration_turn: 4,
                vienna_accepted: { RS: true, HRHB: true },
                graz_east_herzegovina_active_turn: 24,
            },
            military: {
                formations: {
                    hrhb_kralj_tomislav_brigade: makeBrigade({
                        id: 'hrhb_kralj_tomislav_brigade',
                        faction: 'HRHB',
                        corpsId: 'hvo_tomislavgrad',
                    }),
                    hrhb_kralj_petar_kreimir_iv_brigade: makeBrigade({
                        id: 'hrhb_kralj_petar_kreimir_iv_brigade',
                        faction: 'HRHB',
                        corpsId: 'hvo_tomislavgrad',
                    }),
                    hvo_southeast_brigade: makeBrigade({
                        id: 'hvo_southeast_brigade',
                        faction: 'HRHB',
                        corpsId: 'hvo_southeast_herzegovina',
                    }),
                },
                corps_front_sectors: {
                    'sector:hvo_southeast_herzegovina:0': makeSector({
                        sectorId: 'sector:hvo_southeast_herzegovina:0',
                        corpsId: 'hvo_southeast_herzegovina',
                        faction: 'HRHB',
                        opposingFactions: ['RS'],
                        subSegments: [
                            makeSubSeg('ss1', ['op:stolac:stolac_2'], ['op:nevesinje:sopilja']),
                            makeSubSeg('ss2', ['op:capljina:capljina_2'], ['op:bileca:bileca_2']),
                        ],
                    }),
                },
            },
        } as unknown as GameState;

        expect(checkZeroCombatCorps(state)).toEqual([]);
    });

    it('still reports zero-combat corps on active non-cold fronts', () => {
        const state = {
            meta: { turn: 40, phase: 'war' },
            political: {
                vienna_declaration_turn: 4,
                vienna_accepted: { RS: true, HRHB: true },
            },
            military: {
                formations: {
                    rs_1st_bijeljina_light_infantry_panthers: makeBrigade({
                        id: 'rs_1st_bijeljina_light_infantry_panthers',
                        faction: 'RS',
                        corpsId: 'vrs_1st_krajina',
                    }),
                    rs_1st_semberija_light_infantry: makeBrigade({
                        id: 'rs_1st_semberija_light_infantry',
                        faction: 'RS',
                        corpsId: 'vrs_1st_krajina',
                    }),
                },
                corps_front_sectors: {
                    'sector:vrs_1st_krajina:0': makeSector({
                        sectorId: 'sector:vrs_1st_krajina:0',
                        corpsId: 'vrs_1st_krajina',
                        faction: 'RS',
                        opposingFactions: ['HRHB'],
                        subSegments: [
                            makeSubSeg('ss1', ['op:brcko:brcko'], ['op:orasje:orasje']),
                        ],
                    }),
                },
            },
        } as unknown as GameState;

        const reports = checkZeroCombatCorps(state);
        expect(reports).toHaveLength(1);
        expect(reports[0]?.type).toBe('zero_combat_corps');
        expect(reports[0]?.entities).toEqual(['vrs_1st_krajina']);
    });
});

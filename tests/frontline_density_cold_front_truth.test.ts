import { describe, expect, it } from 'vitest';

import { runAnomalyDetection } from '../src/scenario/anomaly_detector.js';
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
    density: number;
    threatRatio?: number;
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
        density: overrides.density,
        threat_ratio: overrides.threatRatio ?? 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeState(
    sectors: Record<string, CorpsFrontSector>,
    politicalOverrides?: Record<string, unknown>,
    formationOverrides?: Record<string, unknown>,
): GameState {
    return {
        meta: { turn: 40, phase: 'war' },
        factions: [],
        operation_history: [],
        political: {
            control_events: [],
            political_controllers: {},
            vienna_declaration_turn: 4,
            vienna_accepted: { RS: true, HRHB: true },
            ...politicalOverrides,
        },
        military: {
            formations: formationOverrides ?? {},
            corps_front_sectors: sectors,
        },
    } as unknown as GameState;
}

describe('frontline density cold-front truth', () => {
    it('suppresses Graz cold-front sectors from density imbalance warnings', () => {
        const reports = runAnomalyDetection(makeState({
            'sector:hvo_tomislavgrad:0': makeSector({
                sectorId: 'sector:hvo_tomislavgrad:0',
                corpsId: 'hvo_tomislavgrad',
                faction: 'HRHB',
                opposingFactions: ['RS'],
                density: 0.1,
                subSegments: [
                    makeSubSeg('tomislavgrad', ['op:duvno:tomislavgrad_2'], ['op:kupres:donji_malovan']),
                ],
            }),
            'sector:hvo_northwest_bosnia:0': makeSector({
                sectorId: 'sector:hvo_northwest_bosnia:0',
                corpsId: 'hvo_northwest_bosnia',
                faction: 'HRHB',
                opposingFactions: ['RS'],
                density: 1,
                subSegments: [
                    makeSubSeg('posavina', ['op:orasje:orasje_2'], ['op:brcko:brcko_2']),
                ],
            }),
            'sector:hvo_central_bosnia:0': makeSector({
                sectorId: 'sector:hvo_central_bosnia:0',
                corpsId: 'hvo_central_bosnia',
                faction: 'HRHB',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('central', ['op:kiseljak:kiseljak_2'], ['op:visoko:podvinci']),
                ],
            }),
        }));

        const densityReport = reports.find((report) => report.type === 'frontline_density_imbalance');
        expect(densityReport).toBeUndefined();
    });

    it('still reports active low-density sectors that are not cold fronts', () => {
        const reports = runAnomalyDetection(makeState({
            'sector:vrs_sarajevo_romanija:0': makeSector({
                sectorId: 'sector:vrs_sarajevo_romanija:0',
                corpsId: 'vrs_sarajevo_romanija',
                faction: 'RS',
                opposingFactions: ['HRHB', 'RBiH'],
                density: 0.1,
                threatRatio: 300,
                subSegments: [
                    makeSubSeg('srk', ['op:ilijas:podlugovi'], ['op:vares:vares_2']),
                ],
            }),
            'sector:vrs_drina:0': makeSector({
                sectorId: 'sector:vrs_drina:0',
                corpsId: 'vrs_drina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('drina', ['op:visegrad:visegrad_2'], ['op:gorazde:gorazde_2']),
                ],
            }),
            'sector:vrs_herzegovina:0': makeSector({
                sectorId: 'sector:vrs_herzegovina:0',
                corpsId: 'vrs_herzegovina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('herz', ['op:foca:foca_2'], ['op:gorazde:ustikolina_2']),
                ],
            }),
        }, {
            graz_east_herzegovina_active_turn: 8,
        }));

        const densityReport = reports.find((report) => report.type === 'frontline_density_imbalance');
        expect(densityReport).toBeDefined();
        expect(densityReport?.entities).toEqual(['sector:vrs_sarajevo_romanija:0']);
    });

    it('does not report a paper-empty shared-front sector when a same-corps sibling physically covers the front OSID', () => {
        const sharedOsid = 'op:maglaj:jablanica';
        const sectors = {
            'sector:vrs_1st_krajina:0': makeSector({
                sectorId: 'sector:vrs_1st_krajina:0',
                corpsId: 'vrs_1st_krajina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('covered-main', [sharedOsid], ['op:maglaj:kosova_2']),
                ],
            }),
            'sector:vrs_1st_krajina:4': makeSector({
                sectorId: 'sector:vrs_1st_krajina:4',
                corpsId: 'vrs_1st_krajina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 0,
                subSegments: [
                    makeSubSeg('covered-sibling', [sharedOsid], ['op:maglaj:maglaj_2']),
                ],
            }),
            'sector:vrs_drina:0': makeSector({
                sectorId: 'sector:vrs_drina:0',
                corpsId: 'vrs_drina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('median-anchor', ['op:visegrad:visegrad_2'], ['op:gorazde:gorazde_2']),
                ],
            }),
        };
        sectors['sector:vrs_1st_krajina:0'].assigned_brigade_ids = ['rs_1st_ozren_light_infantry'];

        const reports = runAnomalyDetection(makeState(sectors, {}, {
            rs_1st_ozren_light_infantry: {
                id: 'rs_1st_ozren_light_infantry',
                kind: 'brigade',
                status: 'active',
                faction: 'RS',
                corps_id: 'vrs_1st_krajina',
                location_osid: sharedOsid,
                assignment: {
                    kind: 'sector',
                    role: 'front',
                    sector_id: 'sector:vrs_1st_krajina:0',
                },
            },
        }));

        const densityReport = reports.find((report) => report.type === 'frontline_density_imbalance');
        expect(densityReport?.entities ?? []).not.toContain('sector:vrs_1st_krajina:4');
    });

    it('still reports a unique empty low-density sector without physical same-corps coverage', () => {
        const reports = runAnomalyDetection(makeState({
            'sector:vrs_1st_krajina:0': makeSector({
                sectorId: 'sector:vrs_1st_krajina:0',
                corpsId: 'vrs_1st_krajina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 0,
                threatRatio: 300,
                subSegments: [
                    makeSubSeg('unique-gap', ['op:maglaj:jablanica'], ['op:maglaj:maglaj_2']),
                ],
            }),
            'sector:vrs_drina:0': makeSector({
                sectorId: 'sector:vrs_drina:0',
                corpsId: 'vrs_drina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('drina', ['op:visegrad:visegrad_2'], ['op:gorazde:gorazde_2']),
                ],
            }),
            'sector:vrs_herzegovina:0': makeSector({
                sectorId: 'sector:vrs_herzegovina:0',
                corpsId: 'vrs_herzegovina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('herz', ['op:foca:foca_2'], ['op:gorazde:ustikolina_2']),
                ],
            }),
        }));

        const densityReport = reports.find((report) => report.type === 'frontline_density_imbalance');
        expect(densityReport).toBeDefined();
        expect(densityReport?.entities).toContain('sector:vrs_1st_krajina:0');
    });

    it('still reports a low-density sector that is only covered by its own brigade', () => {
        const targetOsid = 'op:maglaj:jablanica';
        const sectors = {
            'sector:vrs_1st_krajina:0': makeSector({
                sectorId: 'sector:vrs_1st_krajina:0',
                corpsId: 'vrs_1st_krajina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 0.1,
                threatRatio: 300,
                subSegments: [
                    makeSubSeg('underweight-own-cover', [targetOsid], ['op:maglaj:maglaj_2']),
                ],
            }),
            'sector:vrs_drina:0': makeSector({
                sectorId: 'sector:vrs_drina:0',
                corpsId: 'vrs_drina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('drina-anchor', ['op:visegrad:visegrad_2'], ['op:gorazde:gorazde_2']),
                ],
            }),
            'sector:vrs_herzegovina:0': makeSector({
                sectorId: 'sector:vrs_herzegovina:0',
                corpsId: 'vrs_herzegovina',
                faction: 'RS',
                opposingFactions: ['RBiH'],
                density: 1,
                subSegments: [
                    makeSubSeg('herz-anchor', ['op:foca:foca_2'], ['op:gorazde:ustikolina_2']),
                ],
            }),
        };
        sectors['sector:vrs_1st_krajina:0'].assigned_brigade_ids = ['rs_own_cover'];

        const reports = runAnomalyDetection(makeState(sectors, {}, {
            rs_own_cover: {
                id: 'rs_own_cover',
                kind: 'brigade',
                status: 'active',
                faction: 'RS',
                corps_id: 'vrs_1st_krajina',
                location_osid: targetOsid,
                assignment: {
                    kind: 'sector',
                    role: 'front',
                    sector_id: 'sector:vrs_1st_krajina:0',
                },
            },
        }));

        const densityReport = reports.find((report) => report.type === 'frontline_density_imbalance');
        expect(densityReport).toBeDefined();
        expect(densityReport?.entities).toContain('sector:vrs_1st_krajina:0');
    });

    it('does not warn for quiet low-density sectors below the engine reinforcement gate', () => {
        const reports = runAnomalyDetection(makeState({
            'sector:arbih_1st_corps:trnovo': makeSector({
                sectorId: 'sector:arbih_1st_corps:trnovo',
                corpsId: 'arbih_1st_corps',
                faction: 'RBiH',
                opposingFactions: ['RS'],
                density: 0.1,
                threatRatio: 25,
                subSegments: [
                    makeSubSeg('trnovo', ['op:trnovo:tusila'], ['op:konjic:ljuta']),
                ],
            }),
            'sector:arbih_1st_corps:sarajevo': makeSector({
                sectorId: 'sector:arbih_1st_corps:sarajevo',
                corpsId: 'arbih_1st_corps',
                faction: 'RBiH',
                opposingFactions: ['RS'],
                density: 0.5,
                threatRatio: 500,
                subSegments: [
                    makeSubSeg('sarajevo', ['op:sarajevo:core'], ['op:enemy:siege_line']),
                ],
            }),
            'sector:arbih_1st_corps:gorazde': makeSector({
                sectorId: 'sector:arbih_1st_corps:gorazde',
                corpsId: 'arbih_1st_corps',
                faction: 'RBiH',
                opposingFactions: ['RS'],
                density: 0.5,
                threatRatio: 400,
                subSegments: [
                    makeSubSeg('gorazde', ['op:gorazde:gorazde_2'], ['op:rogatica:brcigovo']),
                ],
            }),
        }));

        expect(reports.some((report) => report.type === 'frontline_density_imbalance')).toBe(false);
    });

    it('does not warn for high-density force concentration without a low-density line gap', () => {
        const reports = runAnomalyDetection(makeState({
            'sector:arbih_1st_corps:urban': makeSector({
                sectorId: 'sector:arbih_1st_corps:urban',
                corpsId: 'arbih_1st_corps',
                faction: 'RBiH',
                opposingFactions: ['RS'],
                density: 4,
                subSegments: [
                    makeSubSeg('urban', ['op:sarajevo:core'], ['op:enemy:siege_line']),
                ],
            }),
            'sector:arbih_1st_corps:rural_a': makeSector({
                sectorId: 'sector:arbih_1st_corps:rural_a',
                corpsId: 'arbih_1st_corps',
                faction: 'RBiH',
                opposingFactions: ['RS'],
                density: 0.5,
                subSegments: [
                    makeSubSeg('rural-a', ['op:olovo:line_a'], ['op:enemy:line_a']),
                ],
            }),
            'sector:arbih_1st_corps:rural_b': makeSector({
                sectorId: 'sector:arbih_1st_corps:rural_b',
                corpsId: 'arbih_1st_corps',
                faction: 'RBiH',
                opposingFactions: ['RS'],
                density: 0.5,
                subSegments: [
                    makeSubSeg('rural-b', ['op:olovo:line_b'], ['op:enemy:line_b']),
                ],
            }),
        }));

        expect(reports.some((report) => report.type === 'frontline_density_imbalance')).toBe(false);
    });
});

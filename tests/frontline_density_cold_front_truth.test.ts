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
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeState(sectors: Record<string, CorpsFrontSector>, politicalOverrides?: Record<string, unknown>): GameState {
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
            formations: {},
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
});

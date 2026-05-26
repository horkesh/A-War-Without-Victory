import { describe, expect, test } from 'vitest';
import { reassignCorpsForBilateralWar } from '../src/sim/combat/bot_corps_ai.js';
import { CURRENT_SCHEMA_VERSION, type CorpsFrontSector, type FactionId, type GameState } from '../src/state/game_state.js';

function sector(
    sectorId: string,
    corpsId: string,
    faction: FactionId,
    opposing: FactionId[],
    friendlyOsids: string[],
    enemyOsids: string[],
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: opposing,
        edge_ids: [`edge:${sectorId}`],
        sub_segments: [{
            sub_segment_id: `subseg:${sectorId}:0`,
            edge_ids: [`edge:${sectorId}`],
            friendly_osids: friendlyOsids,
            enemy_osids: enemyOsids,
            length_edges: 1,
            primary_brigade_ids: [],
        }],
        length_edges: 1,
        territory_osids: friendlyOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeState(faction: FactionId, corpsIds: string[]): GameState {
    const formations: GameState['military']['formations'] = {};
    const corpsCommand: NonNullable<GameState['military']['corps_command']> = {};
    for (const corpsId of corpsIds) {
        formations[corpsId] = {
            id: corpsId,
            faction,
            kind: 'corps',
            status: 'active',
            tags: [`mun:${corpsId.includes('vitez') ? 'vitez' : 'mostar'}`],
        } as any;
        formations[`${corpsId}_brigade`] = {
            id: `${corpsId}_brigade`,
            faction,
            kind: 'brigade',
            status: 'active',
            corps_id: corpsId,
            personnel: 2400,
            cohesion: 60,
            location_osid: `op:${corpsId.includes('vitez') ? 'vitez' : 'mostar'}:held`,
        } as any;
        corpsCommand[corpsId] = {
            command_span: 1,
            subordinate_count: 1,
            og_slots: 0,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'balanced',
            active_operations: [],
        };
    }

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 50, seed: 'bilateral-diversion', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations,
            corps_command: corpsCommand,
            corps_front_sectors: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: {},
            war_alliance_rbih_hrhb: -0.2,
            rbih_hrhb_state: {
                war_started_turn: 40,
                mobilization_started_turn: 35,
                ceasefire_active: false,
                ceasefire_since_turn: null,
                washington_signed: false,
                washington_turn: null,
                stalemate_turns: 0,
                bilateral_flips_this_turn: 0,
                territorial_incidents_this_turn: 0,
                total_bilateral_flips: 0,
                allied_mixed_municipalities: ['busovaca', 'travnik', 'vitez'],
            },
        } as any,
        displacement: {
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
        },
    } as GameState;
}

describe('bilateral formation diversion', () => {
    test('HRHB with at least three corps diverts exactly one corps to the mixed-municipality bilateral front', () => {
        const state = makeState('HRHB', ['hvo_herzegovina', 'hvo_vitez', 'hvo_zepce']);
        state.military.corps_front_sectors = {
            s1: sector('s1', 'hvo_herzegovina', 'HRHB', ['RS'], ['op:mostar:h'], ['op:nevesinje:e']),
            s2: sector('s2', 'hvo_vitez', 'HRHB', ['RBiH'], ['op:vitez:h'], ['op:travnik:e']),
            s3: sector('s3', 'hvo_zepce', 'HRHB', ['RBiH'], ['op:zepce:h'], ['op:zenica:e']),
        };

        const report = reassignCorpsForBilateralWar(state, 'HRHB');

        expect(report.diverted_corps_id).toBe('hvo_vitez');
        expect(report.release_progress).toBe(0);
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.HRHB).toBe('hvo_vitez');
        expect(state.military.corps_command?.hvo_vitez.stance).toBe('offensive');
        expect(state.military.corps_command?.hvo_vitez.directive?.assigned_front_ids).toEqual(['s2']);
        expect(state.military.corps_command?.hvo_zepce.stance).toBe('balanced');
    });

    test('HRHB with fewer than three corps does not divert a corps', () => {
        const state = makeState('HRHB', ['hvo_herzegovina', 'hvo_vitez']);
        state.military.corps_front_sectors = {
            s1: sector('s1', 'hvo_vitez', 'HRHB', ['RBiH'], ['op:vitez:h'], ['op:travnik:e']),
        };

        const report = reassignCorpsForBilateralWar(state, 'HRHB');

        expect(report.diverted_corps_id).toBeNull();
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.HRHB).toBeUndefined();
    });

    test('RBiH with at least four corps assigns one corps to a defensive bilateral posture', () => {
        const state = makeState('RBiH', ['arbih_1st', 'arbih_2nd', 'arbih_vitez', 'arbih_7th']);
        state.military.corps_front_sectors = {
            s1: sector('s1', 'arbih_1st', 'RBiH', ['RS'], ['op:sarajevo:h'], ['op:pale:e']),
            s2: sector('s2', 'arbih_vitez', 'RBiH', ['HRHB'], ['op:travnik:h'], ['op:vitez:e']),
        };

        const report = reassignCorpsForBilateralWar(state, 'RBiH');

        expect(report.diverted_corps_id).toBe('arbih_vitez');
        expect(state.military.corps_command?.arbih_vitez.stance).toBe('defensive');
        expect(state.military.corps_command?.arbih_vitez.directive?.assigned_front_ids).toEqual(['s2']);
    });
});

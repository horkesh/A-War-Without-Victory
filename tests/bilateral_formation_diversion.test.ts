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
            displacement_state: {},
            minority_flight_state: {},
            sustainability_state: {},
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            displacement_flows_by_osid: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            civilian_casualties: {},
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
        state.political.political_controllers!['op:travnik:e'] = 'RBiH';

        const report = reassignCorpsForBilateralWar(state, 'HRHB');

        expect(report.diverted_corps_id).toBe('hvo_vitez');
        expect(report.release_progress).toBe(0);
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.HRHB).toBe('hvo_vitez');
        expect(state.military.corps_command?.hvo_vitez.stance).toBe('defensive');
        expect(state.military.corps_command?.hvo_vitez.directive?.assigned_front_ids).toEqual(['s2']);
        expect(state.military.corps_command?.hvo_vitez.directive?.offensive_targets).toEqual([]);
        expect(state.military.corps_command?.hvo_vitez.directive?.hold_osids).toEqual(['op:vitez:h']);
        expect(state.military.corps_command?.hvo_zepce.stance).toBe('balanced');
    });

    test('HRHB with fewer than three corps does not divert a corps', () => {
        const state = makeState('HRHB', ['hvo_herzegovina', 'hvo_vitez']);
        state.military.corps_front_sectors = {
            s1: sector('s1', 'hvo_vitez', 'HRHB', ['RBiH'], ['op:vitez:h'], ['op:travnik:e']),
        };
        state.political.political_controllers!['op:vitez:e'] = 'HRHB';

        const report = reassignCorpsForBilateralWar(state, 'HRHB');

        expect(report.diverted_corps_id).toBeNull();
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.HRHB).toBeUndefined();
    });

    test('RBiH with at least four corps assigns one corps to an offensive bilateral posture', () => {
        const state = makeState('RBiH', ['arbih_1st', 'arbih_2nd', 'arbih_vitez', 'arbih_7th']);
        state.military.corps_front_sectors = {
            s1: sector('s1', 'arbih_1st', 'RBiH', ['RS'], ['op:sarajevo:h'], ['op:pale:e']),
            s2: sector('s2', 'arbih_vitez', 'RBiH', ['HRHB'], ['op:travnik:h'], ['op:vitez:e']),
        };
        state.political.political_controllers!['op:vitez:e'] = 'HRHB';
        state.political.political_controllers!['op:busovaca:e'] = 'HRHB';
        state.political.political_controllers!['op:zepce:e'] = 'HRHB';

        const report = reassignCorpsForBilateralWar(state, 'RBiH');

        expect(report.diverted_corps_id).toBe('arbih_vitez');
        expect(state.military.corps_command?.arbih_vitez.stance).toBe('offensive');
        expect(state.military.corps_command?.arbih_vitez.directive?.assigned_front_ids).toEqual(['s2']);
        expect(state.military.corps_command?.arbih_vitez.directive?.offensive_targets).toEqual(['op:vitez:e']);
        expect(state.military.corps_command?.arbih_vitez.directive?.hold_osids).toEqual(['op:travnik:h']);
    });

    test('RBiH prefers an operationally ready bilateral-front corps over an exhausted corps with more overlap', () => {
        const state = makeState('RBiH', ['arbih_1st', 'arbih_2nd', 'arbih_vitez', 'arbih_7th']);
        state.military.corps_command!.arbih_vitez!.corps_exhaustion = 73;
        state.military.corps_command!.arbih_7th!.corps_exhaustion = 10;
        state.military.corps_front_sectors = {
            s1: sector('s1', 'arbih_vitez', 'RBiH', ['HRHB'], ['op:travnik:h', 'op:busovaca:h'], ['op:vitez:e', 'op:busovaca:e']),
            s2: sector('s2', 'arbih_7th', 'RBiH', ['HRHB'], ['op:zenica:h'], ['op:zepce:e']),
        };
        state.political.political_controllers!['op:vitez:e'] = 'HRHB';
        state.political.political_controllers!['op:busovaca:e'] = 'HRHB';
        state.political.political_controllers!['op:zepce:e'] = 'HRHB';

        const report = reassignCorpsForBilateralWar(state, 'RBiH');

        expect(report.diverted_corps_id).toBe('arbih_7th');
        expect(state.military.corps_command?.arbih_7th.stance).toBe('offensive');
        expect(state.military.corps_command?.arbih_7th.directive?.offensive_targets).toEqual(['op:zepce:e']);
    });

    test('RBiH never diverts a rested corps that has no live HVO front', () => {
        const state = makeState('RBiH', ['arbih_1st', 'arbih_2nd', 'arbih_vitez', 'arbih_4th']);
        state.military.corps_command!.arbih_vitez!.corps_exhaustion = 73;
        state.military.corps_command!.arbih_4th!.corps_exhaustion = 0;
        state.military.corps_front_sectors = {
            s1: sector('s1', 'arbih_vitez', 'RBiH', ['HRHB'], ['op:travnik:h'], ['op:vitez:e']),
            // Sector metadata can remain mixed after the live enemy cell changed
            // controller; diversion must follow current political truth.
            s2: sector('s2', 'arbih_4th', 'RBiH', ['HRHB'], ['op:mostar:h'], ['op:nevesinje:e']),
        };
        state.political.political_controllers!['op:vitez:e'] = 'HRHB';
        state.political.political_controllers!['op:nevesinje:e'] = 'RS';

        const report = reassignCorpsForBilateralWar(state, 'RBiH');

        expect(report.diverted_corps_id).toBe('arbih_vitez');
        expect(state.military.corps_command?.arbih_vitez.directive?.offensive_targets).toEqual(['op:vitez:e']);
        expect(state.military.corps_command?.arbih_4th.status_reason).not.toBe('rbih_hrhb_bilateral_front_diversion');
    });

    // F3 (2026-11-20): a re-pick across war turns must release the displaced corps. Before F3 the
    // displaced corps kept the diversion tag with zero targets, which the commander briefing reads
    // as campaign role 'contain' for the rest of the war (no fresh plans).
    function rotatingState(): GameState {
        const state = makeState('RBiH', ['arbih_1st', 'arbih_2nd', 'arbih_vitez', 'arbih_7th']);
        state.military.corps_front_sectors = {
            s1: sector('s1', 'arbih_vitez', 'RBiH', ['HRHB'], ['op:travnik:h', 'op:busovaca:h'], ['op:vitez:e', 'op:busovaca:e']),
            s2: sector('s2', 'arbih_7th', 'RBiH', ['HRHB'], ['op:zenica:h'], ['op:zepce:e']),
        };
        state.political.political_controllers!['op:vitez:e'] = 'HRHB';
        state.political.political_controllers!['op:busovaca:e'] = 'HRHB';
        state.political.political_controllers!['op:zepce:e'] = 'HRHB';
        return state;
    }

    test('a re-pick across two war turns leaves the displaced corps clean (no diversion tag, no bilateral directive)', () => {
        const state = rotatingState();
        expect(reassignCorpsForBilateralWar(state, 'RBiH').diverted_corps_id).toBe('arbih_vitez');
        expect(state.military.corps_command?.arbih_vitez.status_reason).toBe('rbih_hrhb_bilateral_front_diversion');

        state.meta.turn += 1;
        state.military.corps_command!.arbih_vitez!.corps_exhaustion = 73;
        state.military.corps_command!.arbih_7th!.corps_exhaustion = 10;
        const report = reassignCorpsForBilateralWar(state, 'RBiH');

        expect(report.diverted_corps_id).toBe('arbih_7th');
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.RBiH).toBe('arbih_7th');
        expect(state.military.corps_command?.arbih_7th.status_reason).toBe('rbih_hrhb_bilateral_front_diversion');
        const displaced = state.military.corps_command!.arbih_vitez!;
        expect(displaced.status_reason).toBe('bilateral_front_rotated');
        expect(displaced.stance).toBe('balanced');
        expect(displaced.directive?.offensive_targets).toEqual([]);
        expect(displaced.directive?.assigned_front_ids).toEqual([]);
        expect(displaced.directive?.hold_osids).toEqual([]);
    });

    test('re-picking the same corps keeps its diversion', () => {
        const state = rotatingState();
        reassignCorpsForBilateralWar(state, 'RBiH');
        state.meta.turn += 1;
        expect(reassignCorpsForBilateralWar(state, 'RBiH').diverted_corps_id).toBe('arbih_vitez');
        expect(state.military.corps_command?.arbih_vitez.status_reason).toBe('rbih_hrhb_bilateral_front_diversion');
        expect(state.military.corps_command?.arbih_vitez.directive?.offensive_targets).toEqual(['op:busovaca:e', 'op:vitez:e']);
    });

    test('after a rotation and Washington, no corps is left with the diversion tag', () => {
        const state = rotatingState();
        reassignCorpsForBilateralWar(state, 'RBiH');
        state.military.corps_command!.arbih_vitez!.corps_exhaustion = 73;
        state.military.corps_command!.arbih_7th!.corps_exhaustion = 10;
        reassignCorpsForBilateralWar(state, 'RBiH');
        state.political.rbih_hrhb_state!.washington_signed = true;
        reassignCorpsForBilateralWar(state, 'RBiH');
        const tagged = Object.entries(state.military.corps_command ?? {})
            .filter(([, cmd]) => cmd.status_reason === 'rbih_hrhb_bilateral_front_diversion')
            .map(([id]) => id);
        expect(tagged).toEqual([]);
    });

    // F3b (2026-11-20): the early exits. When the corps or the front really vanishes
    // (insufficient_corps, no_bilateral_front) the current pick is released. A lull (the alliance
    // drifts above HOSTILE_THRESHOLD with no ceasefire; the canonical run has one at t62) is not a
    // release: the pick keeps its live targets and holds the front (orchestrator ruling 2026-11-20).
    const taggedCorps = (state: GameState) => Object.entries(state.military.corps_command ?? {})
        .filter(([, cmd]) => cmd.status_reason === 'rbih_hrhb_bilateral_front_diversion')
        .map(([id]) => id);

    test('a lull (not_applicable, no ceasefire, alliance between hostile and allied): the pick survives and holds the front', () => {
        const state = rotatingState();
        expect(reassignCorpsForBilateralWar(state, 'RBiH').diverted_corps_id).toBe('arbih_vitez');
        const directiveBefore = JSON.stringify(state.military.corps_command!.arbih_vitez!.directive);
        state.meta.turn += 1;
        state.political.war_alliance_rbih_hrhb = 0.1; // above HOSTILE_THRESHOLD, still <= ALLIED_THRESHOLD
        const report = reassignCorpsForBilateralWar(state, 'RBiH');
        expect(report.reason).toBe('not_applicable');
        expect(report.released_corps_id).toBeNull();
        expect(taggedCorps(state)).toEqual(['arbih_vitez']);
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.RBiH).toBe('arbih_vitez');
        const held = state.military.corps_command!.arbih_vitez!;
        expect(held.stance).toBe('offensive');
        expect(JSON.stringify(held.directive)).toBe(directiveBefore);
        expect(held.directive?.offensive_targets).toEqual(['op:busovaca:e', 'op:vitez:e']);

        // The war resumes: the same pick carries on.
        state.meta.turn += 1;
        state.political.war_alliance_rbih_hrhb = -0.2;
        expect(reassignCorpsForBilateralWar(state, 'RBiH').diverted_corps_id).toBe('arbih_vitez');
    });

    test('the faction falls below the corps minimum (insufficient_corps): the current pick is released', () => {
        const state = rotatingState();
        reassignCorpsForBilateralWar(state, 'RBiH');
        state.meta.turn += 1;
        for (const id of ['arbih_1st', 'arbih_2nd']) {
            delete state.military.formations[id];
            delete state.military.formations[`${id}_brigade`];
        }
        const report = reassignCorpsForBilateralWar(state, 'RBiH');
        expect(report.reason).toBe('insufficient_corps');
        expect(report.released_corps_id).toBe('arbih_vitez');
        expect(taggedCorps(state)).toEqual([]);
    });

    test('the bilateral front disappears (no_bilateral_front): the current pick is released', () => {
        const state = rotatingState();
        reassignCorpsForBilateralWar(state, 'RBiH');
        state.meta.turn += 1;
        state.military.corps_front_sectors = {};
        const report = reassignCorpsForBilateralWar(state, 'RBiH');
        expect(report.reason).toBe('no_bilateral_front');
        expect(report.released_corps_id).toBe('arbih_vitez');
        expect(taggedCorps(state)).toEqual([]);
    });

    test('no HRHB-held enemy cells left on the front (no_bilateral_front after scoring): the current pick is released', () => {
        const state = rotatingState();
        reassignCorpsForBilateralWar(state, 'RBiH');
        state.meta.turn += 1;
        for (const osid of ['op:vitez:e', 'op:busovaca:e', 'op:zepce:e']) state.political.political_controllers![osid] = 'RBiH';
        const report = reassignCorpsForBilateralWar(state, 'RBiH');
        expect(report.reason).toBe('no_bilateral_front');
        expect(report.released_corps_id).toBe('arbih_vitez');
        expect(taggedCorps(state)).toEqual([]);
    });

    test('the early exits with no current pick write nothing', () => {
        const state = rotatingState();
        state.political.war_alliance_rbih_hrhb = 0.1;
        const before = JSON.stringify(state.military.corps_command);
        const report = reassignCorpsForBilateralWar(state, 'RBiH');
        expect(report.reason).toBe('not_applicable');
        expect(report.released_corps_id).toBeNull();
        expect(JSON.stringify(state.military.corps_command)).toBe(before);
    });
});

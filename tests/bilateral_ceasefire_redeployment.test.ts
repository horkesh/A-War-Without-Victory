import { describe, expect, test } from 'vitest';
import { reassignCorpsForBilateralWar } from '../src/sim/combat/bot_corps_ai.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

function makeCeasefireState(progress: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 94, seed: 'bilateral-release', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                hvo_a: { id: 'hvo_a', faction: 'HRHB', kind: 'corps', status: 'active' },
                hvo_b: { id: 'hvo_b', faction: 'HRHB', kind: 'corps', status: 'active' },
                hvo_c: { id: 'hvo_c', faction: 'HRHB', kind: 'corps', status: 'active' },
                hvo_a_bde: { id: 'hvo_a_bde', faction: 'HRHB', kind: 'brigade', status: 'active', corps_id: 'hvo_a', personnel: 2400, cohesion: 60 },
                hvo_b_bde: { id: 'hvo_b_bde', faction: 'HRHB', kind: 'brigade', status: 'active', corps_id: 'hvo_b', personnel: 2400, cohesion: 60 },
                hvo_c_bde: { id: 'hvo_c_bde', faction: 'HRHB', kind: 'brigade', status: 'active', corps_id: 'hvo_c', personnel: 2400, cohesion: 60 },
            } as any,
            corps_command: {
                hvo_a: { command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [], corps_exhaustion: 0, stance: 'balanced', active_operations: [] },
                hvo_b: { command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [], corps_exhaustion: 0, stance: 'offensive', active_operations: [], directive: { assigned_front_ids: ['bilateral'], offensive_targets: [], hold_osids: ['op:vitez:h'], avoid_osids: [], max_attackers_per_target: 1, reserve_fraction: 0.2, min_attack_outcome: 'costly_victory', aggression_modifier: 0.1 } },
                hvo_c: { command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [], corps_exhaustion: 0, stance: 'balanced', active_operations: [] },
            },
            corps_front_sectors: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: {},
            war_alliance_rbih_hrhb: 0.4,
            rbih_hrhb_state: {
                war_started_turn: 42,
                mobilization_started_turn: 36,
                ceasefire_active: true,
                ceasefire_since_turn: 92,
                washington_signed: false,
                washington_turn: null,
                stalemate_turns: 4,
                bilateral_flips_this_turn: 0,
                territorial_incidents_this_turn: 0,
                total_bilateral_flips: 9,
                allied_mixed_municipalities: ['vitez'],
                bilateral_diverted_corps: { HRHB: 'hvo_b' },
                bilateral_corps_release_progress: { HRHB: progress },
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

describe('bilateral ceasefire redeployment', () => {
    test('ceasefire releases a diverted HRHB corps on the third release turn', () => {
        const state = makeCeasefireState(2);

        const report = reassignCorpsForBilateralWar(state, 'HRHB');

        expect(report.released_corps_id).toBe('hvo_b');
        expect(report.release_progress).toBe(3);
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.HRHB).toBeUndefined();
        expect(state.military.corps_command?.hvo_b.stance).toBe('balanced');
        expect(state.military.corps_command?.hvo_b.directive?.assigned_front_ids).toEqual([]);
    });

    test('Washington release is permanent and marks the corps for joint operations', () => {
        const state = makeCeasefireState(0);
        state.political.rbih_hrhb_state!.washington_signed = true;
        state.political.rbih_hrhb_state!.washington_turn = 101;

        const report = reassignCorpsForBilateralWar(state, 'HRHB');

        expect(report.released_corps_id).toBe('hvo_b');
        expect(report.joint_ops).toBe(true);
        expect(state.political.rbih_hrhb_state?.bilateral_diverted_corps?.HRHB).toBeUndefined();
        expect(state.military.corps_command?.hvo_b.status_reason).toBe('post_washington_joint_operations');
    });
});

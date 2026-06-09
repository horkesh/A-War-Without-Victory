import { describe, expect, test } from 'vitest';
import {
    POST_WASH_JOINT_PRESSURE_BONUS,
    checkAndApplyWashington,
    getPostWashingtonJointPressureMultiplier,
    restoreAlliedMixedMunicipalities,
} from '../src/sim/early_war/washington_agreement.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

function makeState(washingtonSigned = false): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 105, seed: 'washington-pressure', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], patron_state: { material_support_level: 0, diplomatic_isolation: 0, constraint_severity: 0.8, patron_commitment: 0, last_updated: 100 }, capability_profile: { equipment_access: 0, croatian_support: 0 } as any, embargo_profile: { external_pipeline_status: 0, heavy_equipment_access: 0 } as any },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {
                rbih_travnik: { id: 'rbih_travnik', faction: 'RBiH', kind: 'brigade', status: 'active', location_osid: 'op:travnik:a' },
                hvo_travnik: { id: 'hvo_travnik', faction: 'HRHB', kind: 'brigade', status: 'active', location_osid: 'op:travnik:b' },
            },
            militia_pools: {
                'busovaca:RBiH': { mun_id: 'busovaca', faction: 'RBiH', available: 100, committed: 0, exhausted: 0, updated_turn: 100 },
                'busovaca:HRHB': { mun_id: 'busovaca', faction: 'HRHB', available: 100, committed: 0, exhausted: 0, updated_turn: 100 },
            },
            negotiation: { patron_relationships: { HRHB: { override_authority: 0 } } },
        } as any,
        political: {
            political_controllers: {
                a: 'RS',
                b: 'RS',
                c: 'RS',
                d: 'RBiH',
            },
            war_alliance_rbih_hrhb: washingtonSigned ? 0.8 : -0.4,
            // 2026-05-22: rescaled 100× (cap 100→10000, WASH_COMBINED_EXHAUSTION 55→5500)
            // per forensics memo 20260522_FORENSICS_WAR_EXHAUSTION_CONVERGENCE.md
            war_exhaustion: { RBiH: 3500, HRHB: 3000 },
            international_visibility_pressure: { negotiation_momentum: 0.8 },
            rbih_hrhb_state: {
                war_started_turn: 45,
                mobilization_started_turn: 40,
                ceasefire_active: true,
                ceasefire_since_turn: 100,
                washington_signed: washingtonSigned,
                washington_turn: washingtonSigned ? 104 : null,
                stalemate_turns: 5,
                bilateral_flips_this_turn: 0,
                territorial_incidents_this_turn: 0,
                total_bilateral_flips: 8,
                allied_mixed_municipalities: washingtonSigned ? ['travnik'] : [],
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

describe('Washington joint pressure', () => {
    test('post-Washington mixed-municipality defense against RS receives the joint pressure bonus only after signing', () => {
        expect(getPostWashingtonJointPressureMultiplier(makeState(false), 'RBiH', 'RS', 'op:travnik:center')).toBe(1);
        expect(getPostWashingtonJointPressureMultiplier(makeState(true), 'RBiH', 'RS', 'op:travnik:center')).toBe(POST_WASH_JOINT_PRESSURE_BONUS);
        expect(getPostWashingtonJointPressureMultiplier(makeState(true), 'RBiH', 'HRHB', 'op:travnik:center')).toBe(1);
        expect(getPostWashingtonJointPressureMultiplier(makeState(true), 'RBiH', 'RS', 'op:tuzla:center')).toBe(1);
    });

    test('mixed municipalities are restored from current formations and militia pools when Washington fires', () => {
        const state = makeState(false);

        const report = checkAndApplyWashington(state);

        expect(report.fired).toBe(true);
        expect(state.political.rbih_hrhb_state?.allied_mixed_municipalities).toEqual(expect.arrayContaining(['busovaca', 'travnik']));
    });

    test('restoration is deterministic and sorted', () => {
        const state = makeState(false);
        const restored = restoreAlliedMixedMunicipalities(state);
        expect(restored).toEqual([...restored].sort());
    });
});

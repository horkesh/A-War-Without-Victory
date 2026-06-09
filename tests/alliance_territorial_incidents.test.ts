import { describe, expect, test } from 'vitest';
import {
    countTerritorialIncidents,
    ensureRbihHrhbState,
    TERRITORIAL_INCIDENT_PENALTY,
    updateAllianceValue
} from '../src/sim/early_war/alliance_update.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 50,
            seed: 'territorial-incidents',
            phase: 'war',
            referendum_held: true,
            war_start_turn: 0,
            rbih_hrhb_war_earliest_turn: 40
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as GameState['military'],
        political: {
            war_alliance_rbih_hrhb: 0.5,
            political_controllers: {}
        } as GameState['political'],
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
        }
    } as GameState;
}

describe('RBiH-HRHB territorial incidents', () => {
    test('counts mixed-municipality RS recaptures as partial incidents', () => {
        const state = makeState();
        ensureRbihHrhbState(state);

        const report = countTerritorialIncidents(state, [
            { mun_id: 'travnik', from_faction: 'RS', to_faction: 'HRHB' }
        ]);

        expect(report).toEqual({ bilateral_incidents: 0, mixed_mun_rs_recapture_incidents: 1 });
        expect(state.political.rbih_hrhb_state!.territorial_incidents_this_turn).toBe(0.5);
    });

    test('counts direct bilateral captures as full incidents in both directions', () => {
        const state = makeState();
        ensureRbihHrhbState(state);

        const report = countTerritorialIncidents(state, [
            { mun_id: 'kiseljak', from_faction: 'RBiH', to_faction: 'HRHB' },
            { mun_id: 'vitez', from_faction: 'HRHB', to_faction: 'RBiH' }
        ]);

        expect(report).toEqual({ bilateral_incidents: 2, mixed_mun_rs_recapture_incidents: 0 });
        expect(state.political.rbih_hrhb_state!.territorial_incidents_this_turn).toBe(2);
    });

    test('ignores RS recaptures outside mixed municipalities', () => {
        const state = makeState();
        ensureRbihHrhbState(state);

        const report = countTerritorialIncidents(state, [
            { mun_id: 'banja_luka', from_faction: 'RS', to_faction: 'HRHB' }
        ]);

        expect(report).toEqual({ bilateral_incidents: 0, mixed_mun_rs_recapture_incidents: 0 });
        expect(state.political.rbih_hrhb_state!.territorial_incidents_this_turn).toBe(0);
    });

    test('applies previous-turn territorial penalty to alliance update drivers', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.territorial_incidents_this_turn = 1.5;

        const report = updateAllianceValue(state);

        expect(report.drivers.territorial_penalty).toBe(TERRITORIAL_INCIDENT_PENALTY * 1.5);
        expect(report.delta).toBeCloseTo(
            report.drivers.appeasement
            - report.drivers.patron_drag
            - report.drivers.incident_penalty
            - report.drivers.territorial_penalty
            + report.drivers.ceasefire_boost
            - report.drivers.refugee_pressure
        );
    });

    test('is deterministic across identical control-event ordering', () => {
        const flips = [
            { mun_id: 'vitez', from_faction: 'HRHB' as const, to_faction: 'RBiH' as const },
            { mun_id: 'travnik', from_faction: 'RS' as const, to_faction: 'HRHB' as const },
            { mun_id: 'banja_luka', from_faction: 'RS' as const, to_faction: 'HRHB' as const }
        ];
        const a = makeState();
        const b = makeState();
        ensureRbihHrhbState(a);
        ensureRbihHrhbState(b);

        const reportA = countTerritorialIncidents(a, flips);
        const reportB = countTerritorialIncidents(b, [...flips].reverse());

        expect(reportA).toEqual(reportB);
        expect(a.political.rbih_hrhb_state!.territorial_incidents_this_turn)
            .toBe(b.political.rbih_hrhb_state!.territorial_incidents_this_turn);
    });
});

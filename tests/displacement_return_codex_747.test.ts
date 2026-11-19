/**
 * Codex review threads on PR #747 (RB9 bounded wartime return rule), pinned test-first.
 *  (a) r4622245419: returnees must also leave the receiving OSID's arrivals tally
 *      (`displacement_flows_by_osid[dest].in`), not only the host's `displaced_in`.
 *  (b) r4588876267: the safe-hold clock starts when the timer is retired, so one weekly pass on the
 *      recapture turn is enough for a return after exactly RETURN_HOLD_WEEKS.
 */
import { describe, expect, test } from 'vitest';
import type { SettlementRecord } from '../src/map/settlements.js';
import { processDisplacementTakeover, RETURN_HOLD_WEEKS } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState, type HostileTakeoverTimerState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function makeState(): GameState {
    const profile = { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 50, seed: 'codex-747', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'RBiH', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: { formations: {}, militia_pools: {}, war_front_edges_osid: [{ a: 'op:vitez:center', b: 'op:travnik:center' }] } as any,
        political: { war_alliance_rbih_hrhb: -0.2, political_controllers: { 'op:zenica:center': 'RBiH' } } as any,
        displacement: {
            displacement_state: {
                vitez: { mun_id: 'vitez', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
            },
            war_displacement_initiated: {},
            hostile_takeover_timers: {},
            displacement_camp_state: {},
            minority_flight_state: {},
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
            displacement_flows_by_osid: {},
            sustainability_state: {},
            settlement_displacement: {},
            settlement_displacement_started_turn: {},
            municipality_displacement: {},
            civilian_casualties: {},
        },
    } as GameState;
}

const settlements = new Map<string, SettlementRecord>([
    ['S_VI', {
        sid: 'S_VI', source_id: '1', mun_code: 'vitez', mun: 'Vitez', mun1990_id: 'vitez',
        properties: { population_total: 1000, population_bosniaks: 900, population_croats: 80, population_serbs: 20, population_others: 0 },
    } as any],
    ['S_ZE', { sid: 'S_ZE', source_id: '3', mun_code: 'zenica', mun: 'Zenica', mun1990_id: 'zenica' }],
]);
const pop1991: MunicipalityPopulation1991Map = {
    vitez: { total: 1000, bosniak: 900, serb: 20, croat: 80, other: 0 },
    zenica: { total: 1000, bosniak: 800, serb: 100, croat: 50, other: 50 },
};
const OSID = 'op:vitez:center';
const HOST_OSID = 'op:zenica:center';
const KEY = `${OSID}|RBiH`;
const timers = (s: GameState) => s.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>;

function capture(state: GameState, attacker: 'HRHB' | 'RBiH', defender: 'HRHB' | 'RBiH'): void {
    state.political.political_controllers = { ...state.political.political_controllers, [OSID]: attacker, S_ZE: 'RBiH' };
    processDisplacementTakeover(state, settlements, {
        battles: [{ settlement_flipped: true, location: 'S_VI', osid: OSID, attacker_faction: attacker, defender_faction: defender }],
    }, pop1991, settlements);
}
function pass(state: GameState, turn: number): void {
    state.meta.turn = turn;
    processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
}

describe('Codex #747 review claims', () => {
    test('(a) returnees leave the receiving OSID arrivals tally as well as the host displaced_in', () => {
        const state = makeState();
        capture(state, 'HRHB', 'RBiH');
        pass(state, 54);
        for (let t = 55; t <= 58; t++) pass(state, t);
        const host = () => state.displacement.displacement_state!.zenica!;
        const arrivals = () => state.displacement.displacement_flows_by_osid?.[HOST_OSID]?.in ?? 0;
        expect(host().displaced_in).toBeGreaterThan(0);
        expect(arrivals()).toBe(host().displaced_in); // routing credits both equally
        // Everyone still in the origin camp is now in hosts, so the return must draw on the host.
        state.displacement.displacement_camp_state = {};
        const hostBefore = host().displaced_in;
        state.meta.turn = 60;
        capture(state, 'RBiH', 'HRHB');
        for (let t = 61; t <= 60 + RETURN_HOLD_WEEKS; t++) pass(state, t);
        expect(timers(state)[KEY]?.cumulative_routed ?? 0).toBe(0); // the return happened
        expect(host().displaced_in).toBeLessThan(hostBefore); // the host lost returnees
        expect(arrivals()).toBe(host().displaced_in);
    });

    test('(b) one weekly pass on the recapture turn is enough: return after exactly RETURN_HOLD_WEEKS', () => {
        const state = makeState();
        capture(state, 'HRHB', 'RBiH');
        pass(state, 54);
        const firstWave = timers(state)[KEY]!.cumulative_displaced!;
        state.meta.turn = 60;
        capture(state, 'RBiH', 'HRHB'); // the single pipeline pass of turn 60
        expect(timers(state)[KEY]!.return_hold_since_turn).toBe(60);
        pass(state, 60 + RETURN_HOLD_WEEKS - 1);
        expect(timers(state)[KEY]!.cumulative_displaced).toBe(firstWave);
        pass(state, 60 + RETURN_HOLD_WEEKS);
        expect(timers(state)[KEY]?.cumulative_displaced ?? 0).toBeLessThan(firstWave);
    });
});

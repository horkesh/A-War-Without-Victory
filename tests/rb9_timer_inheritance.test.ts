/**
 * RB9: a takeover timer whose wave fired is not forgotten when the expelled side retakes the OSID.
 *
 * Before RB9 a recapture deleted the timer, and a later capture seeded a fresh one whose initial wave
 * drew on the 1991 census minority again, so people already displaced were displaced a second time.
 * #623 fixed only the policy-timer case. Now a fired timer is retired as a dormant record that keeps
 * `cumulative_displaced`, and the next capture inherits it.
 */
import { describe, expect, test } from 'vitest';
import type { SettlementRecord } from '../src/map/settlements.js';
import { processDisplacementTakeover } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState, type HostileTakeoverTimerState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

function makeState(): GameState {
    const profile = { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 50, seed: 'rb9-timer-inheritance', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'RBiH', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: { formations: {}, militia_pools: {}, war_front_edges_osid: [{ a: 'op:vitez:center', b: 'op:travnik:center' }] } as any,
        political: { war_alliance_rbih_hrhb: -0.2, political_controllers: {} } as any,
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
const KEY = `${OSID}|RBiH`;

function capture(state: GameState, attacker: 'HRHB' | 'RBiH', defender: 'HRHB' | 'RBiH'): void {
    state.political.political_controllers = { ...state.political.political_controllers, [OSID]: attacker, S_ZE: 'RBiH' };
    processDisplacementTakeover(state, settlements, {
        battles: [{ settlement_flipped: true, location: 'S_VI', osid: OSID, attacker_faction: attacker, defender_faction: defender }],
    }, pop1991, settlements);
}

function wavesFrom(state: GameState, fromTurn: number): number {
    return (state.displacement.displacement_event_log ?? [])
        .filter((e) => e.turn >= fromTurn && e.origin_mun === 'vitez' && e.ethnicity === 'RBiH')
        .reduce((s, e) => s + e.displaced + e.killed + e.fled_abroad, 0);
}

describe('RB9 takeover timer inheritance', () => {
    test('a recapture keeps a fired timer as a dormant record; the next capture inherits it', () => {
        const state = makeState();
        capture(state, 'HRHB', 'RBiH');
        state.meta.turn = 54;
        processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        const fired = (state.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>)[KEY]!;
        const firstWave = wavesFrom(state, 54);
        expect(firstWave).toBeGreaterThan(0);
        expect(fired.cumulative_displaced).toBe(firstWave);

        // RBiH retakes the OSID: the timer is retired as dormant, not deleted.
        state.meta.turn = 60;
        capture(state, 'RBiH', 'HRHB');
        processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        const dormant = (state.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>)[KEY]!;
        expect(dormant.dormant_since_turn).toBeDefined();
        expect(dormant.cumulative_displaced).toBe(firstWave);
        const shape = validateGameStateShape(state);
        const shapeErrors = shape.ok ? [] : shape.errors;
        expect(shapeErrors).not.toContainEqual(expect.stringContaining('dormant_since_turn'));

        // A dormant timer never fires.
        state.meta.turn = 61;
        processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        expect(wavesFrom(state, 61)).toBe(0);

        // HRHB takes it again: the new timer inherits the people already expelled.
        state.meta.turn = 70;
        capture(state, 'HRHB', 'RBiH');
        const reseeded = (state.displacement.hostile_takeover_timers as Record<string, HostileTakeoverTimerState>)[KEY]!;
        expect(reseeded.dormant_since_turn).toBeUndefined();
        expect(reseeded.matured_turn).toBeUndefined();
        expect(reseeded.cumulative_displaced).toBe(firstWave);

        state.meta.turn = 74;
        processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        const secondWave = wavesFrom(state, 74);
        // Never more people than the census minority in total, and the second wave draws only on those left.
        expect(firstWave + secondWave).toBeLessThanOrEqual(900);
        expect(secondWave).toBeLessThan(firstWave);
    });

    test('a timer recaptured before its wave fired displaced nobody and is deleted, as before', () => {
        const state = makeState();
        capture(state, 'HRHB', 'RBiH');
        state.meta.turn = 51;
        capture(state, 'RBiH', 'HRHB');
        processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        expect((state.displacement.hostile_takeover_timers as Record<string, unknown>)[KEY]).toBeUndefined();
    });
});

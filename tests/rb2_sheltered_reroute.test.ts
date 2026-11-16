/**
 * RB2: when a takeover wave matures in a municipality, the people already sheltering there were all
 * re-routed onward with no event, including the captor's own people. Now only a group at war with
 * the captor flees onward, the captor's own refugees stay, and every onward move is logged as a
 * settled-only event (no expulsion fields, so refugees_created is untouched).
 */
import { describe, expect, test } from 'vitest';
import type { SettlementRecord } from '../src/map/settlements.js';
import { processDisplacementTakeover } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function makeState(): GameState {
    const profile = { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 50, seed: 'rb2-sheltered-reroute', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'RBiH', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: { formations: {}, militia_pools: {}, war_front_edges_osid: [{ a: 'op:vitez:center', b: 'op:travnik:center' }] } as any,
        political: { war_alliance_rbih_hrhb: -0.2, political_controllers: {} } as any,
        displacement: {
            displacement_state: {
                vitez: {
                    mun_id: 'vitez', original_population: 1000, displaced_out: 0, displaced_in: 300, lost_population: 0, last_updated_turn: 0,
                    displaced_in_by_faction: { HRHB: 100, RBiH: 200 },
                },
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

describe('RB2 sheltered refugees at a takeover', () => {
    test("the captor's own sheltering people stay; the enemy group's onward flight is logged and books no new expulsion", () => {
        const state = makeState();
        // Refuges come from OSID control: RBiH holds Zenica.
        state.political.political_controllers = { 'op:vitez:center': 'HRHB', 'op:zenica:center': 'RBiH' };
        processDisplacementTakeover(state, settlements, {
            battles: [{ settlement_flipped: true, location: 'S_VI', osid: 'op:vitez:center', attacker_faction: 'HRHB', defender_faction: 'RBiH' }],
        }, pop1991, settlements);
        state.meta.turn = 54;
        const createdBefore = JSON.stringify(state.displacement.displacement_humanitarian_aggregates);
        processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);

        const vitez = state.displacement.displacement_state!.vitez!;
        // HRHB's own refugees sheltering in Vitez stay under HRHB.
        expect(vitez.displaced_in_by_faction?.HRHB).toBe(100);
        // The Bosniaks sheltering there flee onward (to RBiH-held Zenica), and the move is logged.
        const moved = 200 - (vitez.displaced_in_by_faction?.RBiH ?? 0);
        expect(moved).toBeGreaterThan(0);
        const reroutes = (state.displacement.displacement_event_log ?? []).filter((e) => e.origin_mun === 'vitez' && e.settled > 0 && e.ethnicity === 'RBiH');
        expect(reroutes.reduce((s, e) => s + e.settled, 0)).toBe(moved);
        expect(reroutes.every((e) => e.displaced === 0 && e.killed === 0 && e.fled_abroad === 0)).toBe(true);
        // The onward flight creates no new expulsion: refugees_created only gains the takeover wave itself.
        const created = state.displacement.displacement_humanitarian_aggregates?.HRHB?.RBiH?.refugees_created ?? 0;
        const wave = (state.displacement.displacement_event_log ?? [])
            .filter((e) => e.caused_by === 'HRHB' && e.ethnicity === 'RBiH')
            .reduce((s, e) => s + e.displaced + e.killed + e.fled_abroad, 0);
        expect(created).toBe(wave);
        expect(createdBefore).not.toBeUndefined();
    });
});

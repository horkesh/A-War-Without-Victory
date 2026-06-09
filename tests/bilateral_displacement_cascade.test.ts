import { describe, expect, test } from 'vitest';
import type { SettlementRecord } from '../src/map/settlements.js';
import { BILATERAL_HRHB_FLEE_ABROAD, BILATERAL_KILL_FRACTION, processDisplacementTakeover } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 50, seed: 'bilateral-displacement', phase: 'war', rbih_hrhb_war_earliest_turn: 26 },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            militia_pools: {},
            war_front_edges_osid: [{ a: 'op:vitez:center', b: 'op:travnik:center' }],
        } as any,
        political: {
            war_alliance_rbih_hrhb: -0.2,
            political_controllers: {},
        } as any,
        displacement: {
            displacement_state: {},
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
        sid: 'S_VI',
        source_id: '1',
        mun_code: 'vitez',
        mun: 'Vitez',
        mun1990_id: 'vitez',
        properties: { population_total: 1000, population_bosniaks: 900, population_croats: 80, population_serbs: 20, population_others: 0 },
    } as any],
    ['S_BU', {
        sid: 'S_BU',
        source_id: '2',
        mun_code: 'busovaca',
        mun: 'Busovaca',
        mun1990_id: 'busovaca',
        properties: { population_total: 1000, population_bosniaks: 100, population_croats: 850, population_serbs: 50, population_others: 0 },
    } as any],
    ['S_ZE', { sid: 'S_ZE', source_id: '3', mun_code: 'zenica', mun: 'Zenica', mun1990_id: 'zenica' }],
    ['S_MO', { sid: 'S_MO', source_id: '4', mun_code: 'mostar', mun: 'Mostar', mun1990_id: 'mostar' }],
]);

const pop1991: MunicipalityPopulation1991Map = {
    vitez: { total: 1000, bosniak: 900, serb: 20, croat: 80, other: 0 },
    busovaca: { total: 1000, bosniak: 100, serb: 50, croat: 850, other: 0 },
    zenica: { total: 1000, bosniak: 800, serb: 100, croat: 50, other: 50 },
    mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 },
};

describe('bilateral displacement cascade', () => {
    test('HRHB takeover of RBiH-held mixed municipality uses bilateral kill fraction', () => {
        const state = makeState();
        state.political.political_controllers = { 'op:vitez:center': 'HRHB', S_ZE: 'RBiH' };
        state.displacement.displacement_state = {
            vitez: { mun_id: 'vitez', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
        };

        processDisplacementTakeover(state, settlements, {
            battles: [{ settlement_flipped: true, location: 'S_VI', osid: 'op:vitez:center', attacker_faction: 'HRHB', defender_faction: 'RBiH' }],
        }, pop1991, settlements);
        state.meta.turn = 54;
        const report = processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        const bosniakEvent = state.displacement.displacement_event_log?.find(e => e.origin_mun === 'vitez' && e.ethnicity === 'RBiH');

        expect(report.displaced_total).toBeGreaterThan(0);
        expect(bosniakEvent).toBeTruthy();
        expect(bosniakEvent!.killed).toBe(Math.floor(bosniakEvent!.displaced * BILATERAL_KILL_FRACTION));
    });

    test('Croat displacement from RBiH bilateral takeover uses HRHB flee-abroad share and routes to HRHB Herzegovina', () => {
        const state = makeState();
        state.political.political_controllers = { 'op:busovaca:center': 'RBiH', 'op:mostar:center': 'HRHB' };
        state.military.formations = {
            hvo_mostar: { id: 'hvo_mostar', faction: 'HRHB', kind: 'brigade', status: 'active', location_osid: 'op:mostar:center' },
        } as any;
        state.displacement.displacement_state = {
            busovaca: { mun_id: 'busovaca', original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
            mostar: { mun_id: 'mostar', original_population: 1000, displaced_out: 800, displaced_in: 0, lost_population: 0, last_updated_turn: 0 },
        };

        processDisplacementTakeover(state, settlements, {
            battles: [{ settlement_flipped: true, location: 'S_BU', osid: 'op:busovaca:center', attacker_faction: 'RBiH', defender_faction: 'HRHB' }],
        }, pop1991, settlements);
        state.meta.turn = 54;
        const mature = processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        const croatEvent = state.displacement.displacement_event_log?.find(e => e.origin_mun === 'busovaca' && e.ethnicity === 'HRHB');
        expect(croatEvent).toBeTruthy();
        const expectedFled = Math.floor((croatEvent!.displaced - croatEvent!.killed) * BILATERAL_HRHB_FLEE_ABROAD);
        expect(croatEvent!.fled_abroad).toBe(expectedFled);

        state.meta.turn = 58;
        const routed = processDisplacementTakeover(state, settlements, undefined, pop1991, settlements);
        expect(routed.routing.some(r => r.from_mun === 'busovaca' && r.to_mun === 'mostar')).toBe(true);
    });
});

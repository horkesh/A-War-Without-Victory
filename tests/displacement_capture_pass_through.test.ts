/**
 * Batch A row A4 (RB2), §6 seats 2026-11-22 (laneb_batchA_r1_*): at a matured capture, people sheltering
 * in the municipality stay when the captor is their own side or a side never yet at war with them (the
 * RB9 test, `captorShelters`); every other group is moved on as before, and the move is recorded in the
 * takeover report only (reason `capture_pass_through`), never as a displacement event, so it feeds neither
 * `displacement_origin_dest_arrivals` (brigade reconstitution) nor `refugees_received`.
 */
import { expect, test } from 'vitest';

import type { SettlementRecord } from '../src/map/settlements.js';
import { captorShelters, processDisplacementTakeover } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function baseState(turn: number): GameState {
    const profile = { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'capture-pass-through-test', phase: 'war', rbih_hrhb_war_earliest_turn: 20 },
        factions: [
            { id: 'RBiH', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile, areasOfResponsibility: [], supply_sources: [] }
        ],
        military: { formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {} } as any,
        political: { political_controllers: {} } as any,
        displacement: {} as any
    };
}

const settlements = new Map<string, SettlementRecord>([
    ['op:livno:livno', { sid: 'op:livno:livno', source_id: '10', mun_code: 'livno', mun: 'Livno', mun1990_id: 'livno' }],
    ['op:mostar:mostar', { sid: 'op:mostar:mostar', source_id: '9', mun_code: 'mostar', mun: 'Mostar', mun1990_id: 'mostar' }],
    ['op:travnik:travnik', { sid: 'op:travnik:travnik', source_id: '5', mun_code: 'travnik', mun: 'Travnik', mun1990_id: 'travnik' }],
    ['op:prijedor:prijedor', { sid: 'op:prijedor:prijedor', source_id: '7', mun_code: 'prijedor', mun: 'Prijedor', mun1990_id: 'prijedor' }]
]);

const pop1991: MunicipalityPopulation1991Map = {
    livno: { total: 1000, bosniak: 200, serb: 50, croat: 700, other: 50 },
    mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 },
    travnik: { total: 1000, bosniak: 700, serb: 180, croat: 80, other: 40 },
    prijedor: { total: 1000, bosniak: 200, serb: 700, croat: 80, other: 20 }
};

const emptyMun = (mun_id: string) => ({
    mun_id, original_population: 1000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0
});

/** RS holds Livno, sheltering HRHB, RBiH and RS refugees; HRHB takes it at `turn` and the timer matures. */
function captureLivno(turn: number, warStartedTurn: number | null) {
    const state = baseState(turn);
    if (warStartedTurn !== null) {
        (state.political as any).rbih_hrhb_state = { war_started_turn: warStartedTurn };
        (state.political as any).war_alliance_rbih_hrhb = 0.1;
    } else {
        (state.political as any).war_alliance_rbih_hrhb = 0.8;
    }
    state.political.political_controllers = { 'op:livno:livno': 'HRHB', 'op:mostar:mostar': 'HRHB', 'op:travnik:travnik': 'RBiH', 'op:prijedor:prijedor': 'RS' };
    state.displacement.displacement_state = {
        livno: {
            ...emptyMun('livno'),
            displaced_in: 900,
            displaced_in_by_faction: { HRHB: 500, RBiH: 300, RS: 100 }
        },
        mostar: emptyMun('mostar'),
        travnik: emptyMun('travnik'),
        prijedor: emptyMun('prijedor')
    } as any;
    processDisplacementTakeover(
        state,
        settlements,
        { battles: [{ settlement_flipped: true, location: 'op:livno:livno', attacker_faction: 'HRHB', defender_faction: 'RS' }] },
        pop1991
    );
    let report = processDisplacementTakeover(state, settlements, undefined, pop1991);
    for (let t = turn + 1; t <= turn + 8 && report.timers_matured === 0; t++) {
        state.meta.turn = t;
        report = processDisplacementTakeover(state, settlements, undefined, pop1991);
    }
    expect(report.timers_matured).toBeGreaterThan(0);
    return { state, report };
}

const livnoOf = (state: GameState) => state.displacement.displacement_state!.livno as any;
const passThroughRows = (report: any) =>
    (report.routing ?? []).filter((r: any) => r.reason === 'capture_pass_through');

test('captorShelters: own side always; RBiH and HRHB only before their war started; RS never for the others', () => {
    const state = baseState(30);
    expect(captorShelters(state, 'HRHB', 'HRHB')).toBe(true);
    expect(captorShelters(state, 'RBiH', 'HRHB')).toBe(true); // no war yet
    expect(captorShelters(state, 'HRHB', 'RBiH')).toBe(true);
    expect(captorShelters(state, 'RBiH', 'RS')).toBe(false);
    expect(captorShelters(state, 'RS', 'HRHB')).toBe(false);
    (state.political as any).rbih_hrhb_state = { war_started_turn: 31 };
    expect(captorShelters(state, 'RBiH', 'HRHB')).toBe(true); // war starts next turn
    (state.political as any).rbih_hrhb_state = { war_started_turn: 30 };
    expect(captorShelters(state, 'RBiH', 'HRHB')).toBe(false);
    expect(captorShelters(state, 'HRHB', 'RBiH')).toBe(false);
});

test('the captor\'s own sheltered people stay at a capture (Livno Croats under an HVO recapture)', () => {
    const { state } = captureLivno(30, null);
    expect(livnoOf(state).displaced_in_by_faction.HRHB).toBe(500);
});

test('before the RBiH-HRHB war an HRHB captor keeps RBiH refugees in place too', () => {
    const { state, report } = captureLivno(30, null);
    expect(livnoOf(state).displaced_in_by_faction.RBiH).toBe(300);
    expect(passThroughRows(report).filter((r: any) => r.group === 'RBiH')).toHaveLength(0);
});

test('after the war started, RBiH refugees are moved on with a report row and no displacement event', () => {
    const { state, report } = captureLivno(40, 25);
    const livno = livnoOf(state);
    expect(livno.displaced_in_by_faction.HRHB).toBe(500);
    expect(livno.displaced_in_by_faction.RBiH ?? 0).toBeLessThan(300);
    const rows = passThroughRows(report).filter((r: any) => r.group === 'RBiH');
    expect(rows.length).toBeGreaterThan(0);
    const moved = rows.reduce((s: number, r: any) => s + r.amount, 0);
    expect(moved).toBe(300 - (livno.displaced_in_by_faction.RBiH ?? 0));
    // Location moves, the number does not (RB1: each person once).
    expect(state.displacement.displacement_state!.travnik!.displaced_in_by_faction?.RBiH).toBe(moved);
    // No state event for the second move. (The same capture also expels Livno's own 1991 Bosniaks once
    // the war has started; that wave is a real displacement and is booked as before, with displaced > 0.)
    const log = state.displacement.displacement_event_log ?? [];
    const passThroughShaped = log.filter((e: any) =>
        e.origin_mun === 'livno' && e.ethnicity === 'RBiH' && (e.displaced ?? 0) === 0 && (e.settled ?? 0) > 0);
    expect(passThroughShaped).toHaveLength(0);
    // The arrivals aggregate (brigade reconstitution's input) holds only what the event log settled.
    const settledFromLivno = log
        .filter((e: any) => e.origin_mun === 'livno' && e.ethnicity === 'RBiH' && e.dest_mun && e.dest_mun !== 'livno')
        .reduce((s: number, e: any) => s + (e.settled ?? 0), 0);
    const arrivals = (state.displacement as any).displacement_origin_dest_arrivals ?? {};
    const arrivalsFromLivno = Object.entries(arrivals)
        .filter(([k]) => k.includes('livno') && k.includes('RBiH'))
        .reduce((s, [, bucket]) => s + Object.values(bucket as Record<string, number>).reduce((a, b) => a + b, 0), 0);
    expect(arrivalsFromLivno).toBe(settledFromLivno);
});

test('people hostile to the captor (RS refugees at an HRHB capture) are still moved on, as a report row', () => {
    const { state, report } = captureLivno(30, null);
    const rows = passThroughRows(report).filter((r: any) => r.group === 'RS');
    expect(rows.length).toBeGreaterThan(0);
    const moved = rows.reduce((s: number, r: any) => s + r.amount, 0);
    expect(livnoOf(state).displaced_in_by_faction.RS ?? 0).toBe(100 - moved);
    expect(livnoOf(state).displaced_in).toBe(
        Object.values(livnoOf(state).displaced_in_by_faction as Record<string, number>).reduce((s, v) => s + v, 0)
    );
});

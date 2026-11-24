/**
 * A9 (SD13), broader bright-line panel round 1, 2026-11-24 (laneb_a9_r1_integrated): the capture pass-through
 * runs only when the capture leaves the captor as the municipality's majority holder (DISPLACEMENT_MASTER §10.6).
 * Taking an outlying settlement moves no sheltered group. Measured defect: one village of Goražde falling at t70
 * moved 27k sheltered people out of the whole municipality, 23k of them into Srebrenica.
 */
import { expect, test } from 'vitest';

import type { SettlementRecord } from '../src/map/settlements.js';
import { processDisplacementTakeover } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function baseState(turn: number): GameState {
    const profile = { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'pass-through-majority-test', phase: 'war', rbih_hrhb_war_earliest_turn: 20 },
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

const rec = (sid: string, mun: string, source_id: string): SettlementRecord =>
    ({ sid, source_id, mun_code: mun, mun, mun1990_id: mun }) as SettlementRecord;

const settlements = new Map<string, SettlementRecord>([
    ['op:gorazde:sopotnica', rec('op:gorazde:sopotnica', 'gorazde', '1')],
    ['op:gorazde:gorazde', rec('op:gorazde:gorazde', 'gorazde', '2')],
    ['op:gorazde:kopaci', rec('op:gorazde:kopaci', 'gorazde', '3')],
    ['op:zenica:zenica', rec('op:zenica:zenica', 'zenica', '4')],
    ['op:foca:foca', rec('op:foca:foca', 'foca', '5')]
]);

const pop1991: MunicipalityPopulation1991Map = {
    gorazde: { total: 3000, bosniak: 2100, serb: 800, croat: 0, other: 100 },
    zenica: { total: 1000, bosniak: 700, serb: 150, croat: 100, other: 50 },
    foca: { total: 1000, bosniak: 500, serb: 450, croat: 0, other: 50 }
};

const emptyMun = (mun_id: string, original_population: number) => ({
    mun_id, original_population, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 0
});

/** RBiH holds Goražde (3 settlements) sheltering 900 RBiH refugees; RS takes the listed settlements and the timers mature. */
function captureByRs(captured: string[]) {
    const state = baseState(30);
    const pc: Record<string, string> = {
        'op:gorazde:sopotnica': 'RBiH', 'op:gorazde:gorazde': 'RBiH', 'op:gorazde:kopaci': 'RBiH',
        'op:zenica:zenica': 'RBiH', 'op:foca:foca': 'RS'
    };
    for (const sid of captured) pc[sid] = 'RS';
    state.political.political_controllers = pc as any;
    state.displacement.displacement_state = {
        gorazde: { ...emptyMun('gorazde', 3000), displaced_in: 900, displaced_in_by_faction: { RBiH: 900 } },
        zenica: emptyMun('zenica', 1000),
        foca: emptyMun('foca', 1000)
    } as any;
    processDisplacementTakeover(
        state,
        settlements,
        { battles: captured.map((location) => ({ settlement_flipped: true, location, attacker_faction: 'RS', defender_faction: 'RBiH' })) },
        pop1991
    );
    let report = processDisplacementTakeover(state, settlements, undefined, pop1991);
    let matured = report.timers_matured;
    const rows: any[] = [...(report.routing ?? [])];
    for (let t = 31; t <= 40; t++) {
        state.meta.turn = t;
        report = processDisplacementTakeover(state, settlements, undefined, pop1991);
        matured += report.timers_matured;
        rows.push(...(report.routing ?? []));
    }
    expect(matured).toBeGreaterThan(0);
    return { state, passThrough: rows.filter((r: any) => r.reason === 'capture_pass_through') };
}

test('an outlying village falling does not move the sheltered people out of the municipality', () => {
    const { state, passThrough } = captureByRs(['op:gorazde:sopotnica']);
    expect(passThrough).toHaveLength(0);
    const g = state.displacement.displacement_state!.gorazde as any;
    expect(g.displaced_in_by_faction.RBiH).toBe(900);
    expect(g.displaced_in).toBe(900);
});

test('a capture that makes the captor the majority holder still moves them on (§10.6)', () => {
    const { state, passThrough } = captureByRs(['op:gorazde:sopotnica', 'op:gorazde:kopaci']);
    expect(passThrough.length).toBeGreaterThan(0);
    const moved = passThrough.reduce((s: number, r: any) => s + r.amount, 0);
    const g = state.displacement.displacement_state!.gorazde as any;
    expect(g.displaced_in_by_faction.RBiH ?? 0).toBe(900 - moved);
});

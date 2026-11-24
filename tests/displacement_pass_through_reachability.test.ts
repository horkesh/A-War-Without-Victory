/**
 * A9 B2 (SD13), owner rulings 2-3 of 2026-11-24, inside the §6 broader panel round 1 A5b shape
 * (DISPLACEMENT_MASTER §10.6): a group sheltered in a pocket that is still held and supplied is never moved
 * out because the enemy holds the municipality majority, and a pass-through goes only to supplied ground in a
 * territorial body linked to the source. Measured defect: Srebrenica's own 31,880 sheltered people were moved
 * across VRS lines to Tuzla and Kladanj at weeks 55-61, while the pocket held until week 171.
 */
import { expect, test } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../src/map/settlements.js';
import { buildPassThroughDestinationResolver } from '../src/state/displacement.js';
import { processDisplacementTakeover } from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

function baseState(turn: number): GameState {
    const profile = { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'pass-through-reachability-test', phase: 'war', rbih_hrhb_war_earliest_turn: 20 },
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

const edge = (a: string, b: string): EdgeRecord => ({ a, b }) as EdgeRecord;
/** Goražde's three settlements in a chain, Foča (RS) next to Kopači. */
const pocketEdges: EdgeRecord[] = [
    edge('op:gorazde:sopotnica', 'op:gorazde:gorazde'),
    edge('op:gorazde:gorazde', 'op:gorazde:kopaci'),
    edge('op:gorazde:kopaci', 'op:foca:foca')
];

/**
 * RBiH holds Goražde sheltering 900 RBiH refugees and Zenica; RS takes the listed settlements and the timers
 * mature. `supplied` lists the RBiH settlements its supply reaches; `edges` the settlement graph.
 */
function captureByRs(captured: string[], supplied: string[], edges: EdgeRecord[]) {
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
    const suppliedByFaction = new Map<string, ReadonlySet<string>>([['RBiH', new Set(supplied)]]);
    const reach = () => buildPassThroughDestinationResolver(state, edges, suppliedByFaction);
    processDisplacementTakeover(
        state,
        settlements,
        { battles: captured.map((location) => ({ settlement_flipped: true, location, attacker_faction: 'RS', defender_faction: 'RBiH' })) },
        pop1991,
        undefined,
        reach
    );
    let report = processDisplacementTakeover(state, settlements, undefined, pop1991, undefined, reach);
    let matured = report.timers_matured;
    const rows: any[] = [...(report.routing ?? [])];
    for (let t = 31; t <= 40; t++) {
        state.meta.turn = t;
        report = processDisplacementTakeover(state, settlements, undefined, pop1991, undefined, reach);
        matured += report.timers_matured;
        rows.push(...(report.routing ?? []));
    }
    expect(matured).toBeGreaterThan(0);
    const g = state.displacement.displacement_state!.gorazde as any;
    return { g, passThrough: rows.filter((r: any) => r.reason === 'capture_pass_through') };
}

test('a still-held, supplied pocket keeps its sheltered people after the enemy takes the majority', () => {
    const { g, passThrough } = captureByRs(
        ['op:gorazde:sopotnica', 'op:gorazde:kopaci'],
        ['op:gorazde:gorazde', 'op:zenica:zenica'],
        pocketEdges
    );
    expect(passThrough).toHaveLength(0);
    expect(g.displaced_in_by_faction.RBiH).toBe(900);
    expect(g.displaced_in).toBe(900);
});

test('a held but cut-off pocket with no linked supplied ground keeps them too (never across enemy lines)', () => {
    const { g, passThrough } = captureByRs(
        ['op:gorazde:sopotnica', 'op:gorazde:kopaci'],
        ['op:zenica:zenica'],
        pocketEdges
    );
    expect(passThrough).toHaveLength(0);
    expect(g.displaced_in_by_faction.RBiH).toBe(900);
});

test('once the whole municipality is taken, the group stays when no supplied body is linked to it', () => {
    const { g, passThrough } = captureByRs(
        ['op:gorazde:sopotnica', 'op:gorazde:gorazde', 'op:gorazde:kopaci'],
        ['op:zenica:zenica'],
        pocketEdges
    );
    expect(passThrough).toHaveLength(0);
    expect(g.displaced_in_by_faction.RBiH).toBe(900);
});

test('once the whole municipality is taken, the group moves to supplied ground next to it', () => {
    const { g, passThrough } = captureByRs(
        ['op:gorazde:sopotnica', 'op:gorazde:gorazde', 'op:gorazde:kopaci'],
        ['op:zenica:zenica'],
        [...pocketEdges, edge('op:gorazde:sopotnica', 'op:zenica:zenica')]
    );
    expect(passThrough.length).toBeGreaterThan(0);
    for (const r of passThrough) expect(r.to_mun).toBe('zenica');
    const moved = passThrough.reduce((s: number, r: any) => s + r.amount, 0);
    expect(moved).toBeGreaterThan(0);
    expect(g.displaced_in_by_faction.RBiH ?? 0).toBe(900 - moved);
});

test('the resolver: held and supplied stays (null); linked supplied ground is listed; unlinked is not', () => {
    const state = baseState(30);
    state.political.political_controllers = {
        'op:gorazde:sopotnica': 'RS', 'op:gorazde:gorazde': 'RBiH', 'op:gorazde:kopaci': 'RS',
        'op:zenica:zenica': 'RBiH', 'op:foca:foca': 'RS'
    } as any;
    const sup = (ids: string[]) => new Map<string, ReadonlySet<string>>([['RBiH', new Set(ids)]]);
    expect(buildPassThroughDestinationResolver(state, pocketEdges, sup(['op:gorazde:gorazde']))('RBiH', 'gorazde')).toBeNull();
    expect([...buildPassThroughDestinationResolver(state, pocketEdges, sup(['op:zenica:zenica']))('RBiH', 'gorazde')!]).toEqual([]);
    const linked = [...pocketEdges, edge('op:gorazde:kopaci', 'op:zenica:zenica')];
    expect([...buildPassThroughDestinationResolver(state, linked, sup(['op:zenica:zenica']))('RBiH', 'gorazde')!]).toEqual(['zenica']);
});

/**
 * Batch A row A5 (SD7), broader bright-line panel 2026-11-22 (laneb_batchA_r2_*): siege leavers go only to
 * a municipality where their side holds a settlement that, the same turn, is supply-reachable AND in the
 * side's main body. A besieged pocket with its own supply source (Goražde, Sarajevo type) is never a
 * destination. Leavers with nowhere to go stay in the pocket (not booked, not lost, not dropped), and the
 * turn report records them per pocket and turn (`trapped`, a per-turn stock, never state).
 */
import { describe, expect, it } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../../src/map/settlements.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';

const STEP = warPhases.find((p) => p.name === 'update-displacement')!;
const HOME_EXTRA = 12;
// A9 B3 (D10b): the pocket is 'novi_grad_sarajevo' and holds the real Sarajevo airport crossing's near end, so its
// leavers route to the main body through the sourced crossing (the war step cannot take a fixture crossing).

/**
 * An encircled RBiH pocket (`pocket`, two settlements ringed by RS), a second RBiH pocket (`enclave`, one
 * settlement ringed by RS, which sorts before `home` and so came first in the old leftover order), and the
 * RBiH main body (`home`, fifteen settlements). `homeSupplied` / `enclaveSupplied`: a supply source there.
 */
function world(opts: { homeSupplied: boolean; enclaveSupplied: boolean }) {
    const controllers: Record<string, string> = {
        'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo': 'RBiH',
        'op:novi_grad_sarajevo:b': 'RBiH',
        'op:ring:c': 'RS',
        'op:ring:d': 'RS',
        'op:ring:r': 'RS',
        'op:enclave:z': 'RBiH',
        'op:home:e': 'RBiH',
        'op:home:f': 'RBiH',
        'op:home:g': 'RBiH',
    };
    const edges: EdgeRecord[] = [
        { a: 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo', b: 'op:novi_grad_sarajevo:b' },
        { a: 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo', b: 'op:ring:c' },
        { a: 'op:novi_grad_sarajevo:b', b: 'op:ring:d' },
        { a: 'op:ring:c', b: 'op:ring:d' },
        { a: 'op:ring:d', b: 'op:home:e' },
        { a: 'op:ring:c', b: 'op:ring:r' },
        { a: 'op:ring:r', b: 'op:enclave:z' },
        { a: 'op:home:e', b: 'op:home:f' },
        { a: 'op:home:f', b: 'op:home:g' },
    ];
    for (let i = 1; i <= HOME_EXTRA; i++) {
        controllers[`op:home:x${i}`] = 'RBiH';
        edges.push({ a: i === 1 ? 'op:home:g' : `op:home:x${i - 1}`, b: `op:home:x${i}` });
    }
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers)) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
    }
    const sources = [...(opts.homeSupplied ? ['S_home'] : []), ...(opts.enclaveSupplied ? ['S_encl'] : [])];
    const pool = (mun: string, faction: string) => ({ mun_id: mun, faction, available: 1000, committed: 0, exhausted: 0, updated_turn: 9 });
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'siege-a5', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({ id, supply_sources: id === 'RBiH' ? sources : [], areasOfResponsibility: [] })),
        military: { formations: {}, front_segments: {}, front_pressure: {}, militia_pools: { 'novi_grad_sarajevo:RBiH': pool('novi_grad_sarajevo', 'RBiH') } },
        political: { political_controllers: controllers },
        displacement: {
            displacement_state: Object.fromEntries(
                ['novi_grad_sarajevo', 'ring', 'enclave', 'home'].map((m) => [
                    m,
                    { mun_id: m, original_population: 10000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 },
                ])
            ),
        },
    } as unknown as GameState;
    const census = {
        novi_grad_sarajevo: { total: 10000, bosniak: 6000, serb: 3000, croat: 1000, other: 0 },
        ring: { total: 10000, bosniak: 0, serb: 10000, croat: 0, other: 0 },
        enclave: { total: 10000, bosniak: 10000, serb: 0, croat: 0, other: 0 },
        home: { total: 10000, bosniak: 10000, serb: 0, croat: 0, other: 0 },
    } as MunicipalityPopulation1991Map;
    const opData = {
        canonicalToOperational: { S_home: 'op:home:e', S_encl: 'op:enclave:z' } as Record<string, string>,
        operationalToCanonical: new Map<string, string[]>([['op:home:e', ['S_home']], ['op:enclave:z', ['S_encl']]]),
    };
    return { state, settlements, edges, census, opData };
}

async function runWarStep(w: ReturnType<typeof world>): Promise<any> {
    const context = {
        state: w.state,
        input: {
            settlementEdges: [{ a: 'S100013', b: 'S100056' }],
            operationalSettlementGraph: { settlements: w.settlements, edges: w.edges },
            operationalData: { opData: w.opData, edges: w.edges, centroids: {} },
            municipalityPopulation1991: w.census,
        },
        report: {} as any,
    };
    await STEP.run(context as never);
    return context.report;
}

const ds = (w: ReturnType<typeof world>) => w.state.displacement.displacement_state;

describe('A5: siege leavers go only to a supplied settlement in the main body', () => {
    it('a besieged enclave with its own supply source receives nobody; the main body does', async () => {
        const w = world({ homeSupplied: true, enclaveSupplied: true });
        const report = await runWarStep(w);
        expect(ds(w).novi_grad_sarajevo.displaced_out).toBeGreaterThan(0);
        expect(ds(w).enclave.displaced_in_by_faction?.RBiH ?? 0).toBe(0);
        expect(ds(w).home.displaced_in_by_faction?.RBiH ?? 0).toBe(ds(w).novi_grad_sarajevo.displaced_out);
        const trapped = (report.displacement?.trapped ?? []).filter((r: any) => r.mun_id === 'novi_grad_sarajevo');
        expect(trapped.every((r: any) => r.trapped === 0 && r.wanted === r.routed)).toBe(true);
    });

    it('with no supplied main-body destination the leavers stay: nothing booked, lost or dropped; the report names them', async () => {
        const w = world({ homeSupplied: false, enclaveSupplied: true });
        const poolBefore = (w.state.military.militia_pools as any)['novi_grad_sarajevo:RBiH'].available;
        const report = await runWarStep(w);
        expect(ds(w).novi_grad_sarajevo.displaced_out).toBe(0);
        expect(ds(w).novi_grad_sarajevo.lost_population).toBe(0);
        expect(ds(w).home.displaced_in_by_faction?.RBiH ?? 0).toBe(0);
        expect(ds(w).enclave.displaced_in_by_faction?.RBiH ?? 0).toBe(0);
        expect((w.state.military.militia_pools as any)['novi_grad_sarajevo:RBiH'].available).toBe(poolBefore);
        const rows = (report.displacement?.trapped ?? []).filter((r: any) => r.mun_id === 'novi_grad_sarajevo' && r.faction_id === 'RBiH');
        expect(rows).toHaveLength(1);
        expect(rows[0].routed).toBe(0);
        expect(rows[0].trapped).toBe(rows[0].wanted);
        expect(rows[0].wanted).toBeGreaterThan(0);
    });

    it('trapped rows are sorted by municipality then side and never reach GameState', async () => {
        const w = world({ homeSupplied: false, enclaveSupplied: false });
        const report = await runWarStep(w);
        const rows = report.displacement?.trapped ?? [];
        const keys = rows.map((r: any) => `${r.mun_id}|${r.faction_id}`);
        expect(keys).toEqual([...keys].sort());
        expect(JSON.stringify(w.state)).not.toContain('trapped');
    });
});

describe('E-dest (orchestrator ruling 2026-11-26): a routed siege leaver books its arrival row', () => {
    const POCKET = 'novi_grad_sarajevo';
    const log = (w: ReturnType<typeof world>) => (w.state.displacement.displacement_event_log ?? []) as any[];

    it('each routed leg writes origin, dest_mun and settled; the arrivals aggregate and refugees_received see it', async () => {
        const w = world({ homeSupplied: true, enclaveSupplied: true });
        await runWarStep(w);
        const routed = ds(w).home.displaced_in_by_faction?.RBiH ?? 0;
        expect(routed).toBeGreaterThan(0);

        const arrivals = log(w).filter((e) => e.origin_mun === POCKET && e.dest_mun !== POCKET);
        expect(arrivals).toEqual([
            {
                turn: w.state.meta.turn,
                origin_mun: POCKET,
                dest_mun: 'home',
                dest_osid: 'op:home:e',
                ethnicity: 'RBiH',
                displaced: 0,
                killed: 0,
                fled_abroad: 0,
                settled: routed,
            },
        ]);
        // The departure rows are unchanged: dest = origin, settled 0, the routed count booked to the besieger.
        const departures = log(w).filter((e) => e.origin_mun === POCKET && e.dest_mun === POCKET);
        expect(departures.every((e) => e.settled === 0 && e.caused_by === 'RS')).toBe(true);
        expect(departures.reduce((s, e) => s + e.displaced, 0)).toBe(routed);

        const disp = w.state.displacement as any;
        expect(disp.displacement_origin_dest_arrivals?.[`${POCKET}|RBiH`]).toEqual({ home: routed });
        expect(disp.displacement_humanitarian_aggregates?.RBiH?.RBiH?.refugees_received).toBe(routed);
        expect(disp.displacement_humanitarian_aggregates?.RS?.RBiH?.refugees_created).toBe(routed);
        expect(disp.displacement_flows_by_osid?.['op:home:e']?.in).toBe(routed);
    });

    it('trapped leavers write no arrival row and no arrivals entry', async () => {
        const w = world({ homeSupplied: false, enclaveSupplied: true });
        await runWarStep(w);
        expect(log(w).filter((e) => (e.settled ?? 0) > 0)).toEqual([]);
        expect((w.state.displacement as any).displacement_origin_dest_arrivals?.[`${POCKET}|RBiH`]).toBeUndefined();
    });
});

describe('Ledger line 2 (s6_ledger12_ruling.md): the write-only "unable to leave" stock', () => {
    it('stores this week\'s trapped amount per side with the turn stamp, and only amounts of 1 or more', async () => {
        const w = world({ homeSupplied: false, enclaveSupplied: true });
        const report = await runWarStep(w);
        const rows = (report.displacement?.trapped ?? []) as Array<{ mun_id: string; faction_id: string; trapped: number }>;
        expect(rows.some((r) => r.trapped >= 1)).toBe(true);
        for (const r of rows) {
            const stored = (ds(w) as any)[r.mun_id]?.unable_to_leave_by_side?.[r.faction_id];
            if (r.trapped >= 1) expect(stored).toEqual({ amount: r.trapped, turn: w.state.meta.turn });
            else expect(stored).toBeUndefined();
        }
    });

    it('is cleared from every municipality at the start of the step, including on the no-pools early return', async () => {
        const w = world({ homeSupplied: true, enclaveSupplied: true });
        (ds(w) as any).home.unable_to_leave_by_side = { RBiH: { amount: 77, turn: w.state.meta.turn - 1 } };
        const report = await runWarStep(w);
        const rows = (report.displacement?.trapped ?? []) as Array<{ trapped: number }>;
        expect(rows.every((r) => r.trapped === 0)).toBe(true);
        for (const row of Object.values(ds(w) as Record<string, any>)) expect(row.unable_to_leave_by_side).toBeUndefined();

        const w2 = world({ homeSupplied: false, enclaveSupplied: true });
        (ds(w2) as any).home.unable_to_leave_by_side = { RBiH: { amount: 5, turn: 1 } };
        delete (w2.state.military as any).militia_pools;
        await runWarStep(w2);
        expect((ds(w2) as any).home.unable_to_leave_by_side).toBeUndefined();
    });
});

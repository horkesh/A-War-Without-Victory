/**
 * A9 B3 (SD13, 8-seat §6 ruling D10/D10b, 2026-11-25): a separate pocket's siege leavers are trapped unless a sourced crossing applies.
 *
 * A pocket that is a territorial body separate from its side's main body sends nobody across the enemy lines:
 * its leavers are recorded in the turn report `trapped` rows and the write-only `unable_to_leave_by_side`
 * stock (Ledger line 2). They route to A5's main-body destinations only when the municipality is linked to the
 * main body, or when the leavers' own body holds the near end of a sourced crossing (`POCKET_CROSSINGS`).
 */
import { describe, expect, it } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../../src/map/settlements.js';
import { updateDisplacement } from '../../src/state/displacement.js';
import { POCKET_CROSSINGS } from '../../src/state/displacement_routing_data.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';

const NEAR = 'op:pk:a';
// A9 B3 (D10b): the fixture declares its own crossing; the real table is pinned in the last test.
const FIXTURE_CROSSING = [{ id: 'fixture_crossing', side: 'RBiH' as const, near_settlements: [NEAR], source: 'test fixture: stands in for a sourced crossing (D10b)' }];

interface World {
    state: GameState;
    settlements: Map<string, SettlementRecord>;
    edges: EdgeRecord[];
    census: MunicipalityPopulation1991Map;
}

/**
 * An all-Bosniak RBiH pocket (`pk`: two RBiH settlements) ringed by RS, cut off from a large supplied RBiH
 * home body. `enemyInPocketMun`: a third settlement of `pk`, held by RS, that neighbours the home body.
 */
function world(opts: { enemyInPocketMun?: boolean } = {}): World {
    const controllers: Record<string, string> = {
        'op:pk:a': 'RBiH',
        'op:pk:b': 'RBiH',
        'op:ring:c': 'RS',
        'op:ring:d': 'RS',
        'op:home:e': 'RBiH',
        'op:home:f': 'RBiH',
        'op:home:g': 'RBiH',
    };
    const edges: EdgeRecord[] = [
        { a: 'op:pk:a', b: 'op:pk:b' },
        { a: 'op:pk:a', b: 'op:ring:c' },
        { a: 'op:pk:b', b: 'op:ring:d' },
        { a: 'op:ring:c', b: 'op:ring:d' },
        { a: 'op:ring:d', b: 'op:home:e' },
        { a: 'op:home:e', b: 'op:home:f' },
        { a: 'op:home:f', b: 'op:home:g' },
    ];
    if (opts.enemyInPocketMun) {
        controllers['op:pk:r'] = 'RS';
        edges.push({ a: 'op:pk:r', b: 'op:home:e' });
    }
    for (let i = 1; i <= 12; i++) {
        controllers[`op:home:x${i}`] = 'RBiH';
        edges.push({ a: i === 1 ? 'op:home:g' : `op:home:x${i - 1}`, b: `op:home:x${i}` });
    }
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers)) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
    }
    const pool = (mun: string, faction: string) => ({ mun_id: mun, faction, available: 1000, committed: 0, exhausted: 0, updated_turn: 9 });
    const row = (m: string, pop: number) => ({ mun_id: m, original_population: pop, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 });
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'b3', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({
            id,
            supply_sources: id === 'RBiH' ? ['op:home:e'] : [],
            areasOfResponsibility: Object.keys(controllers).filter((sid) => controllers[sid] === id).sort(),
        })),
        military: {
            formations: {},
            front_segments: {},
            front_pressure: {},
            militia_pools: { 'pk:RBiH': pool('pk', 'RBiH') },
        },
        political: { political_controllers: controllers },
        displacement: { displacement_state: { pk: row('pk', 10000), ring: row('ring', 10000), home: row('home', 10000) } },
    } as unknown as GameState;
    const census = {
        pk: { total: 10000, bosniak: 10000, serb: 0, croat: 0, other: 0 },
        ring: { total: 10000, bosniak: 0, serb: 10000, croat: 0, other: 0 },
        home: { total: 10000, bosniak: 10000, serb: 0, croat: 0, other: 0 },
    } as MunicipalityPopulation1991Map;
    return { state, settlements, edges, census };
}

const run = (w: World, crossings?: Parameters<typeof updateDisplacement>[5]) =>
    updateDisplacement(w.state, w.settlements, w.edges, w.census, undefined, crossings ?? []);
const ds = (w: World) => w.state.displacement.displacement_state;

describe('A9 B3: a separate pocket with no crossing', () => {
    it('traps its leavers: reported and stocked, nobody routed, nothing booked or lost', () => {
        const w = world();
        const poolBefore = (w.state.military.militia_pools as Record<string, { available: number }>)['pk:RBiH'].available;
        const report = run(w);
        // The trigger fired (encirclement) and the pocket is the only trapped row.
        expect(report.trapped).toHaveLength(1);
        const t = report.trapped![0];
        expect(t).toMatchObject({ mun_id: 'pk', faction_id: 'RBiH', routed: 0 });
        expect(t.wanted).toBeGreaterThan(0);
        expect(t.trapped).toBe(t.wanted);
        expect(report.routing.filter((r) => r.from_mun === 'pk')).toEqual([]);
        expect(report.by_municipality.filter((r) => r.mun_id === 'pk')).toEqual([]);
        expect(ds(w).pk.unable_to_leave_by_side?.RBiH?.amount).toBe(t.trapped);
        expect(ds(w).pk.displaced_out).toBe(0);
        expect(ds(w).pk.lost_population).toBe(0);
        for (const m of ['ring', 'home']) {
            expect(ds(w)[m].displaced_in).toBe(0);
            expect(ds(w)[m].displaced_in_by_faction?.RBiH ?? 0).toBe(0);
        }
        expect((w.state.military.militia_pools as Record<string, { available: number }>)['pk:RBiH'].available).toBe(poolBefore);
    });
});

describe('A9 B3: a crossing at the pocket', () => {
    it('lets the leavers route to the main body exactly as before', () => {
        const w = world();
        const report = run(w, FIXTURE_CROSSING);
        const rows = (report.trapped ?? []).filter((r) => r.mun_id === 'pk');
        expect(rows.every((r) => r.trapped === 0)).toBe(true);
        expect(ds(w).pk.displaced_out).toBeGreaterThan(0);
        expect(ds(w).home.displaced_in_by_faction?.RBiH ?? 0).toBe(ds(w).pk.displaced_out);
        expect(ds(w).pk.unable_to_leave_by_side).toBeUndefined();
    });

    it('does not apply when its near-end settlement is held by the enemy', () => {
        const w = world();
        w.state.political.political_controllers![NEAR] = 'RS';
        const report = run(w, FIXTURE_CROSSING);
        const rows = (report.trapped ?? []).filter((r) => r.mun_id === 'pk' && r.faction_id === 'RBiH');
        expect(rows).toHaveLength(1);
        expect(rows[0].routed).toBe(0);
        expect(rows[0].wanted).toBeGreaterThan(0);
        expect(rows[0].trapped).toBe(rows[0].wanted);
        expect(ds(w).home.displaced_in_by_faction?.RBiH ?? 0).toBe(0);
        expect(ds(w).pk.unable_to_leave_by_side?.RBiH?.amount).toBe(rows[0].trapped);
    });
});

describe('A9 B3: a municipality linked to the main body', () => {
    it('routes with no crossing when an enemy-held settlement of the municipality neighbours the main body', () => {
        const w = world({ enemyInPocketMun: true });
        const report = run(w);
        const rows = (report.trapped ?? []).filter((r) => r.mun_id === 'pk');
        expect(rows.every((r) => r.trapped === 0)).toBe(true);
        expect(ds(w).pk.displaced_out).toBeGreaterThan(0);
        expect(ds(w).home.displaced_in_by_faction?.RBiH ?? 0).toBe(ds(w).pk.displaced_out);
    });
});

describe('A9 B3: the real crossing table', () => {
    it('has exactly one entry: the Sarajevo airport, sorted near end, side RBiH', () => {
        expect(POCKET_CROSSINGS).toHaveLength(1);
        const c = POCKET_CROSSINGS[0];
        expect(c.id).toBe('sarajevo_airport_crossing');
        expect(c.side).toBe('RBiH');
        expect([...c.near_settlements]).toEqual([...c.near_settlements].sort());
        expect([...c.near_settlements]).toEqual(['op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo']);
    });
});

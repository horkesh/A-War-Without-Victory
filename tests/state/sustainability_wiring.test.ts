/**
 * RF-F1 (legacy S-id consumer sweep, 2026-11-14): the sustainability and militia-fatigue war
 * steps must see the campaign's own front and supply.
 *
 * Defect proved here: both steps handed OSID settlements together with the legacy `S…` edges
 * production passes in `settlementEdges`. Sustainability found no BFS neighbour and no
 * supplied settlement, so on main 109 of 110 municipalities were surrounded and collapsed by
 * turn 8 and negotiation momentum read 1.0 from turn 4; militia fatigue marked every pool
 * unsupplied every turn.
 */
import { describe, expect, it } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../../src/map/settlements.js';
import { CURRENT_SCHEMA_VERSION, type GameState, type MilitiaPoolState } from '../../src/state/game_state.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';

const SUSTAINABILITY = warPhases.find((p) => p.name === 'update-sustainability')!;
const MILITIA = warPhases.find((p) => p.name === 'update-militia-fatigue')!;

/** An RBiH pocket (2 OSIDs) ringed by RS, and an RBiH home body with the supply source. */
function world(opts: { linked: boolean }) {
    const controllers: Record<string, string> = {
        'op:pocket:a': 'RBiH',
        'op:pocket:b': 'RBiH',
        'op:ring:c': 'RS',
        'op:ring:d': 'RS',
        'op:home:e': 'RBiH',
        'op:home:f': 'RBiH',
    };
    const edges: EdgeRecord[] = [
        { a: 'op:pocket:a', b: 'op:pocket:b' },
        { a: 'op:pocket:a', b: 'op:ring:c' },
        { a: 'op:pocket:b', b: 'op:ring:d' },
        { a: 'op:ring:c', b: 'op:ring:d' },
        { a: 'op:ring:d', b: 'op:home:e' },
        { a: 'op:home:e', b: 'op:home:f' },
    ];
    if (opts.linked) edges.push({ a: 'op:pocket:b', b: 'op:home:f' });
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers)) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun } as SettlementRecord);
    }
    const pools: Record<string, MilitiaPoolState> = {};
    for (const mun of ['home', 'pocket', 'ring']) {
        for (const faction of ['HRHB', 'RBiH', 'RS']) {
            pools[`${mun}:${faction}`] = { mun_id: mun, faction, available: 1000, committed: 0, exhausted: 0, updated_turn: 9 } as MilitiaPoolState;
        }
    }
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'f1', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({
            id,
            supply_sources: id === 'RBiH' ? ['S_home'] : id === 'RS' ? ['S_ring'] : [],
            areasOfResponsibility: [],
        })),
        military: { formations: {}, front_segments: {}, front_pressure: {}, militia_pools: pools },
        political: { political_controllers: controllers },
        displacement: {},
    } as unknown as GameState;
    const opData = {
        canonicalToOperational: { S_home: 'op:home:e', S_ring: 'op:ring:c' } as Record<string, string>,
        operationalToCanonical: new Map<string, string[]>([['op:home:e', ['S_home']], ['op:ring:c', ['S_ring']]]),
    };
    return { state, settlements, edges, opData };
}

function context(w: ReturnType<typeof world>, report: Record<string, unknown> = {}) {
    return {
        state: w.state,
        input: {
            // Legacy canonical edges, as production passes them in `settlementEdges`.
            settlementEdges: [{ a: 'S100013', b: 'S100056' }],
            operationalSettlementGraph: { settlements: w.settlements, edges: w.edges },
            operationalData: { opData: w.opData, edges: w.edges, centroids: {} },
        },
        report,
    };
}

describe('update-sustainability war step reads the campaign front (RF-F1)', () => {
    it('only the cut-off pocket is surrounded, with production-shaped inputs', async () => {
        const w = world({ linked: false });
        const ctx = context(w);
        await SUSTAINABILITY.run(ctx as never);
        const ss = w.state.displacement.sustainability_state;
        expect(Object.keys(ss).sort()).toEqual(['home', 'pocket', 'ring']);
        expect(ss.pocket.is_surrounded).toBe(true);
        expect(ss.home.is_surrounded).toBe(false);
        expect(ss.ring.is_surrounded).toBe(false);
        expect(ss.pocket.sustainability_score).toBe(95); // once per turn, not once per pool
    });

    it('a pocket joined to its main body is not surrounded', async () => {
        const w = world({ linked: true });
        await SUSTAINABILITY.run(context(w) as never);
        expect(Object.values(w.state.displacement.sustainability_state).every((s) => !s.is_surrounded)).toBe(true);
    });

    it('a besieged pocket collapses on schedule and nothing else does', async () => {
        const w = world({ linked: false });
        for (let t = 10; t <= 20; t++) {
            w.state.meta.turn = t;
            await SUSTAINABILITY.run(context(w) as never);
        }
        const ss = w.state.displacement.sustainability_state;
        expect(ss.pocket.collapsed).toBe(true);
        expect(ss.home.collapsed).toBe(false);
        expect(ss.ring.collapsed).toBe(false);
    });
});

describe('update-militia-fatigue war step reads the campaign supply (RF-F1)', () => {
    it('only the pocket pool of the faction holding it is unsupplied', async () => {
        const w = world({ linked: false });
        const exhaustion = { per_faction: [] };
        const ctx = context(w, { exhaustion });
        await MILITIA.run(ctx as never);
        const report = (ctx.report as { militia_fatigue: { by_municipality: Array<{ mun_id: string; faction_id: string; supplied: boolean }> } }).militia_fatigue;
        const unsupplied = report.by_municipality.filter((r) => !r.supplied).map((r) => `${r.mun_id}:${r.faction_id}`);
        expect(unsupplied).toEqual(['pocket:RBiH']);
    });
});

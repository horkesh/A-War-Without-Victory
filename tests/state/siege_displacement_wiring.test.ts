/**
 * Siege displacement lane (DA1, 2026-11-13): the pressure path (siege, encirclement)
 * must see the campaign's own front and supply.
 *
 * Defect proved here: the `update-displacement` war step handed `updateDisplacement`
 * OSID settlements with legacy `S…` edges, so it found 0 front edges every turn; its
 * supply check ran a legacy BFS that reaches no settlement; and it processed the same
 * municipality once per militia pool (three times). Panel record:
 * docs/40_reports/implemented/20261113_SIEGE_DISPLACEMENT_PANEL.md.
 */
import { describe, expect, it } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../../src/map/settlements.js';
import {
    ENCIRCLEMENT_DISPLACEMENT_FRACTION,
    POCKET_MAX_SHARE,
    UNSUPPLIED_DISPLACEMENT_FRACTION,
    updateDisplacement,
} from '../../src/state/displacement.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';

const STEP = warPhases.find((p) => p.name === 'update-displacement')!;

/** Extra home settlements so the pocket (2) is under POCKET_MAX_SHARE of RBiH's held settlements. */
const HOME_EXTRA = 12;

interface World {
    state: GameState;
    settlements: Map<string, SettlementRecord>;
    edges: EdgeRecord[];
    census: MunicipalityPopulation1991Map;
    opData: { canonicalToOperational: Record<string, string>; operationalToCanonical: Map<string, string[]> };
}

/**
 * An RBiH pocket (two OSIDs) ringed by RS, and an RBiH home body of three OSIDs.
 * `linked`: the pocket touches the home body (not encircled). `supplied`: RBiH has a
 * supply source in the home body.
 */
function world(opts: { linked: boolean; supplied: boolean; splitPocket?: boolean; turn?: number }): World {
    const controllers: Record<string, string> = {
        'op:pocket:a': 'RBiH',
        'op:pocket:b': opts.splitPocket ? 'RS' : 'RBiH',
        'op:ring:c': 'RS',
        'op:ring:d': 'RS',
        'op:home:e': 'RBiH',
        'op:home:f': 'RBiH',
        'op:home:g': 'RBiH',
    };
    const edges: EdgeRecord[] = [
        { a: 'op:pocket:a', b: 'op:pocket:b' },
        { a: 'op:pocket:a', b: 'op:ring:c' },
        { a: 'op:pocket:b', b: 'op:ring:d' },
        { a: 'op:ring:c', b: 'op:ring:d' },
        { a: 'op:ring:d', b: 'op:home:e' },
        { a: 'op:home:e', b: 'op:home:f' },
        { a: 'op:home:f', b: 'op:home:g' },
    ];
    if (opts.linked) edges.push({ a: 'op:pocket:b', b: 'op:home:g' });
    // The home body must be large enough that the two-settlement pocket is a pocket (P5).
    for (let i = 1; i <= HOME_EXTRA; i++) {
        controllers[`op:home:x${i}`] = 'RBiH';
        edges.push({ a: i === 1 ? 'op:home:g' : `op:home:x${i - 1}`, b: `op:home:x${i}` });
    }
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers)) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
    }
    const pool = (mun: string, faction: string) => ({ mun_id: mun, faction, available: 1000, committed: 0, exhausted: 0, updated_turn: 9 });
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: opts.turn ?? 10, seed: 'siege', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({
            id,
            supply_sources: id === 'RBiH' && opts.supplied ? ['S_home'] : [],
            areasOfResponsibility: [],
        })),
        military: {
            formations: {},
            front_segments: {
                // The old gate read these legacy-keyed records; production never has any.
                'op:pocket:a__op:ring:c': { edge_id: 'op:pocket:a__op:ring:c', active: true },
            },
            front_pressure: {},
            militia_pools: {
                'pocket:HRHB': pool('pocket', 'HRHB'),
                'pocket:RBiH': pool('pocket', 'RBiH'),
                'pocket:RS': pool('pocket', 'RS'),
            },
        },
        political: { political_controllers: controllers },
        displacement: {
            displacement_state: Object.fromEntries(
                ['pocket', 'ring', 'home'].map((m) => [
                    m,
                    { mun_id: m, original_population: 10000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 },
                ])
            ),
        },
    } as unknown as GameState;
    const census = {
        pocket: { total: 10000, bosniak: 6000, serb: 3000, croat: 1000, other: 0 },
        ring: { total: 10000, bosniak: 0, serb: 10000, croat: 0, other: 0 },
        home: { total: 10000, bosniak: 10000, serb: 0, croat: 0, other: 0 },
    } as MunicipalityPopulation1991Map;
    const opData = {
        canonicalToOperational: { S_home: 'op:home:e' } as Record<string, string>,
        operationalToCanonical: new Map<string, string[]>([['op:home:e', ['S_home']]]),
    };
    return { state, settlements, edges, census, opData };
}

async function runWarStep(w: World): Promise<void> {
    const context = {
        state: w.state,
        input: {
            // Legacy canonical edges, as production passes them in `settlementEdges`.
            settlementEdges: [{ a: 'S100013', b: 'S100056' }],
            operationalSettlementGraph: { settlements: w.settlements, edges: w.edges },
            operationalData: { opData: w.opData, edges: w.edges, centroids: {} },
            municipalityPopulation1991: w.census,
        },
        report: {},
    };
    await STEP.run(context as never);
}

function causersWithHarm(state: GameState): string[] {
    const agg = state.displacement.displacement_humanitarian_aggregates ?? {};
    return Object.keys(agg)
        .filter((c) => Object.values(agg[c] ?? {}).some((s) => s.refugees_created > 0 || s.civilian_casualties_caused > 0))
        .sort();
}

describe('update-displacement war step reads the campaign front (DA1)', () => {
    it('an encircled pocket displaces, booked to the besieger, with production-shaped inputs', async () => {
        const w = world({ linked: false, supplied: true });
        await runWarStep(w);
        expect(causersWithHarm(w.state)).toEqual(['RS']);
        expect(w.state.displacement.displacement_state.pocket.displaced_out
            + w.state.displacement.displacement_state.pocket.lost_population).toBeGreaterThan(0);
    });

    it('a pocket joined to its side\'s main body and supplied does not displace', async () => {
        const w = world({ linked: true, supplied: true });
        for (let t = 10; t <= 14; t++) {
            w.state.meta.turn = t;
            await runWarStep(w);
        }
        expect(causersWithHarm(w.state)).toEqual([]);
    });
});

describe('one pass per municipality (binding condition: no per-pool triple processing)', () => {
    it('a besieged, unsupplied municipality with three pools is displaced once per turn', () => {
        const w = world({ linked: true, supplied: false });
        let report = updateDisplacement(w.state, w.settlements, w.edges, w.census);
        for (let t = 11; t <= 12; t++) {
            w.state.meta.turn = t;
            report = updateDisplacement(w.state, w.settlements, w.edges, w.census);
        }
        const pocketRecords = report.by_municipality.filter((r) => r.mun_id === 'pocket');
        expect(pocketRecords).toHaveLength(1);
        expect(pocketRecords[0].faction_id).toBe('RBiH');
        expect(pocketRecords[0].reason.some((r) => r.startsWith('unsupplied_pressure_'))).toBe(true);
    });
});

describe('the siege counter lives in GameState (survives a save round trip)', () => {
    it('counts consecutive unsupplied turns on the municipality and fires on the third', () => {
        const w = world({ linked: true, supplied: false });
        updateDisplacement(w.state, w.settlements, w.edges, w.census);
        w.state.meta.turn = 11;
        updateDisplacement(w.state, w.settlements, w.edges, w.census);
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_by_side?.RBiH?.turns).toBe(2);
        expect(causersWithHarm(w.state)).toEqual([]);

        const restored = JSON.parse(JSON.stringify(w.state)) as GameState;
        restored.meta.turn = 12;
        const report = updateDisplacement(restored, w.settlements, w.edges, w.census);
        expect(report.by_municipality.map((r) => r.mun_id)).toEqual(['pocket']);
        expect(causersWithHarm(restored)).toEqual(['RS']);
    });

    it('clears the counter once the municipality is supplied again', async () => {
        const w = world({ linked: true, supplied: false });
        await runWarStep(w);
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_by_side?.RBiH?.turns).toBe(1);
        w.state.meta.turn = 11;
        (w.state.factions as unknown as Array<{ id: string; supply_sources: string[] }>)
            .find((f) => f.id === 'RBiH')!.supply_sources = ['S_home'];
        await runWarStep(w);
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_by_side).toBeUndefined();
    });
});

describe('pockets only (DA1 P5)', () => {
    it('a cut-off body holding more than POCKET_MAX_SHARE of its side is a split, not a siege', async () => {
        const w = world({ linked: false, supplied: true });
        // Hand the extra home settlements to RS: RBiH now holds 5, the cut-off pocket 2 (40%).
        for (let i = 1; i <= HOME_EXTRA; i++) w.state.political.political_controllers![`op:home:x${i}`] = 'RS';
        await runWarStep(w);
        expect(2 / 5).toBeGreaterThan(POCKET_MAX_SHARE);
        expect(causersWithHarm(w.state)).toEqual([]);
    });
});

describe('sourced rate (DA1 P3)', () => {
    it('an encircled, unsupplied pocket takes the larger rate, never the sum', () => {
        const w = world({ linked: false, supplied: false });
        let report = updateDisplacement(w.state, w.settlements, w.edges, w.census);
        for (let t = 11; t <= 12; t++) {
            w.state.meta.turn = t;
            report = updateDisplacement(w.state, w.settlements, w.edges, w.census);
        }
        const rec = report.by_municipality.find((r) => r.mun_id === 'pocket')!;
        expect(rec.reason).toEqual(expect.arrayContaining(['encircled', 'unsupplied_pressure_3_turns']));
        // The pocket's 6,000 Bosniaks (holder's people) at the larger of the two rates.
        const rate = Math.max(UNSUPPLIED_DISPLACEMENT_FRACTION, ENCIRCLEMENT_DISPLACEMENT_FRACTION);
        expect(rec.displacement_this_turn).toBe(Math.floor((6000 - 2 * Math.floor(6000 * rate)) * rate));
        expect(w.state.displacement.civilian_casualties?.RBiH?.killed ?? 0).toBe(0);
    });
});

describe('who leaves, and where they go', () => {
    it('routes each people to municipalities its own side holds', async () => {
        const w = world({ linked: false, supplied: true });
        await runWarStep(w);
        const ring = w.state.displacement.displacement_state.ring;
        const home = w.state.displacement.displacement_state.home;
        expect(ring.displaced_in_by_faction?.RBiH ?? 0).toBe(0);
        expect(home.displaced_in_by_faction?.RS ?? 0).toBe(0);
        expect(home.displaced_in_by_faction?.RBiH ?? 0).toBeGreaterThan(0);
    });

    it('scales by the population share the holder controls', async () => {
        const whole = world({ linked: false, supplied: true });
        await runWarStep(whole);
        const split = world({ linked: false, supplied: true, splitPocket: true });
        await runWarStep(split);
        const out = (w: World) => {
            const s = w.state.displacement.displacement_state.pocket;
            return s.displaced_out + s.lost_population;
        };
        expect(out(split)).toBeGreaterThan(0);
        expect(out(split)).toBeLessThan(out(whole));
    });
});

/** A world built from explicit controllers and edges (municipality = second segment of the id). */
function custom(controllers: Record<string, string>, edges: EdgeRecord[], poolKeys: string[], census: MunicipalityPopulation1991Map, initial?: Record<string, string>): World {
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers)) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
    }
    const muns = [...new Set(Object.keys(controllers).map((s) => s.split(':')[1]))];
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'siege', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({ id, supply_sources: id === 'RBiH' ? ['S_home'] : [], areasOfResponsibility: [] })),
        military: {
            formations: {}, front_segments: {}, front_pressure: {},
            militia_pools: Object.fromEntries(poolKeys.map((k) => {
                const [mun, faction] = k.split(':');
                return [k, { mun_id: mun, faction, available: 1000, committed: 0, exhausted: 0, updated_turn: 9 }];
            })),
        },
        political: { political_controllers: { ...controllers }, ...(initial ? { initial_political_controllers: initial } : {}) },
        displacement: {
            displacement_state: Object.fromEntries(muns.map((m) => [m, { mun_id: m, original_population: 10000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 }])),
        },
    } as unknown as GameState;
    const opData = {
        canonicalToOperational: { S_home: 'op:home:e' } as Record<string, string>,
        operationalToCanonical: new Map<string, string[]>([['op:home:e', ['S_home']]]),
    };
    return { state, settlements, edges, census, opData };
}

/** RBiH home body e..x12 (15 settlements) chained, for pocket fixtures. */
function homeBody(controllers: Record<string, string>, edges: EdgeRecord[], side = 'RBiH'): void {
    const ids = ['op:home:e', 'op:home:f', 'op:home:g', ...Array.from({ length: HOME_EXTRA }, (_, i) => `op:home:x${i + 1}`)];
    ids.forEach((id, i) => {
        controllers[id] = side;
        if (i > 0) edges.push({ a: ids[i - 1], b: id });
    });
}

describe('panel round 1 (DA1 P6)', () => {
    it('a pocket that is a minority of its municipality still books to the besieger (Red-team 1)', async () => {
        // Žepa-shaped: one RBiH settlement among seven RS ones in the same municipality.
        const controllers: Record<string, string> = { 'op:rog:zepa': 'RBiH' };
        const edges: EdgeRecord[] = [];
        for (let i = 1; i <= 7; i++) {
            controllers[`op:rog:r${i}`] = 'RS';
            edges.push({ a: i === 1 ? 'op:rog:zepa' : `op:rog:r${i - 1}`, b: `op:rog:r${i}` });
        }
        homeBody(controllers, edges);
        edges.push({ a: 'op:rog:r7', b: 'op:home:e' });
        const census = { rog: { total: 10000, bosniak: 5000, serb: 5000, croat: 0, other: 0 } } as MunicipalityPopulation1991Map;
        const w = custom(controllers, edges, ['rog:RBiH', 'rog:RS'], census);
        // Large enough that 0.1% of the pocket's one-eighth share is a whole person.
        w.state.displacement.displacement_state.rog.original_population = 1_000_000;
        await runWarStep(w);
        expect(causersWithHarm(w.state)).toEqual(['RS']);
        const agg = w.state.displacement.displacement_humanitarian_aggregates ?? {};
        expect(Object.keys(agg.RS ?? {})).toEqual(['RBiH']);
    });

    it('the causer is never the side whose people leave, on the real step (Red-team 2)', async () => {
        for (const opts of [{ linked: false, supplied: true }, { linked: true, supplied: false }, { linked: false, supplied: false }]) {
            const w = world(opts);
            for (let t = 10; t <= 13; t++) {
                w.state.meta.turn = t;
                await runWarStep(w);
            }
            const agg = w.state.displacement.displacement_humanitarian_aggregates ?? {};
            for (const [causer, byPeople] of Object.entries(agg)) {
                for (const [people, slot] of Object.entries(byPeople)) {
                    if (slot.refugees_created > 0) expect(causer).not.toBe(people);
                }
            }
        }
    });

    it('the counter restarts after a skipped turn and clears when the side no longer holds there (Engine 2)', () => {
        const w = world({ linked: true, supplied: false });
        updateDisplacement(w.state, w.settlements, w.edges, w.census);
        w.state.meta.turn = 12; // turn 11 skipped
        updateDisplacement(w.state, w.settlements, w.edges, w.census);
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_by_side?.RBiH).toEqual({ turns: 1, last_turn: 12 });
        w.state.meta.turn = 13;
        w.state.political.political_controllers!['op:pocket:a'] = 'RS';
        w.state.political.political_controllers!['op:pocket:b'] = 'RS';
        updateDisplacement(w.state, w.settlements, w.edges, w.census);
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_by_side?.RBiH).toBeUndefined();
    });

    it('an ally links a pocket to the main body before the RBiH-HRHB war, not after (Engine 9)', () => {
        const controllers: Record<string, string> = { 'op:pocket:a': 'RBiH', 'op:pocket:b': 'RBiH', 'op:ring:c': 'RS', 'op:hvo:h': 'HRHB' };
        const edges: EdgeRecord[] = [
            { a: 'op:pocket:a', b: 'op:pocket:b' }, { a: 'op:pocket:a', b: 'op:ring:c' },
            { a: 'op:pocket:b', b: 'op:hvo:h' }, { a: 'op:hvo:h', b: 'op:home:e' },
        ];
        homeBody(controllers, edges);
        const census = { pocket: { total: 10000, bosniak: 10000, serb: 0, croat: 0, other: 0 } } as MunicipalityPopulation1991Map;
        const allied = custom(controllers, edges, ['pocket:RBiH'], census);
        const before = updateDisplacement(allied.state, allied.settlements, allied.edges, census);
        expect(before.by_municipality.filter((r) => r.reason.includes('encircled'))).toEqual([]);
        const atWar = custom(controllers, edges, ['pocket:RBiH'], census);
        atWar.state.meta.turn = 60;
        (atWar.state.political as unknown as Record<string, unknown>).war_alliance_rbih_hrhb = -1;
        const after = updateDisplacement(atWar.state, atWar.settlements, atWar.edges, census);
        expect(after.by_municipality.find((r) => r.mun_id === 'pocket')?.reason).toContain('encircled');
    });

    it('people with nowhere to go stay in the pocket: nothing is booked or lost (Engine 5, Canon 11)', async () => {
        const w = world({ linked: false, supplied: true });
        // Fill the only friendly destination to capacity.
        w.state.displacement.displacement_state.home.displaced_in = 1_000_000;
        await runWarStep(w);
        const pocket = w.state.displacement.displacement_state.pocket;
        expect(pocket.displaced_out).toBe(0);
        expect(pocket.lost_population).toBe(0);
        expect(causersWithHarm(w.state)).toEqual([]);
    });

    it('the pocket share is measured against the side at turn 0 (Red-team 4)', async () => {
        const w = world({ linked: false, supplied: true });
        const initial = { ...w.state.political.political_controllers } as Record<string, string>;
        // RS has since taken all but three home settlements: the pocket is 2 of 5 held now,
        // 2 of 17 at turn 0.
        for (let i = 1; i <= HOME_EXTRA; i++) w.state.political.political_controllers![`op:home:x${i}`] = 'RS';
        (w.state.political as unknown as Record<string, unknown>).initial_political_controllers = initial;
        await runWarStep(w);
        expect(causersWithHarm(w.state)).toEqual(['RS']);
    });

    it('the war step is deterministic within one process (Engine 9)', async () => {
        const a = world({ linked: false, supplied: false });
        const b = world({ linked: false, supplied: false });
        for (let t = 10; t <= 14; t++) {
            a.state.meta.turn = t;
            b.state.meta.turn = t;
            await runWarStep(a);
            await runWarStep(b);
        }
        expect(JSON.stringify(a.state.displacement)).toBe(JSON.stringify(b.state.displacement));
        expect(JSON.stringify(a.state.military.militia_pools)).toBe(JSON.stringify(b.state.military.militia_pools));
    });

    it('only the leaving side\'s pool loses manpower (Engine 8)', async () => {
        const w = world({ linked: false, supplied: true });
        const pools = w.state.military.militia_pools as Record<string, { available: number }>;
        for (const k of Object.keys(pools)) pools[k].available = 5000; // below the municipality's recruitment ceiling
        await runWarStep(w);
        expect(pools['pocket:RBiH'].available).toBeLessThan(5000);
        expect(pools['pocket:RS'].available).toBe(5000);
        expect(pools['pocket:HRHB'].available).toBe(5000);
    });
});
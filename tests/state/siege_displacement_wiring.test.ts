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
import { updateDisplacement } from '../../src/state/displacement.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';

const STEP = warPhases.find((p) => p.name === 'update-displacement')!;

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
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_turns).toBe(2);
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
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_turns).toBe(1);
        w.state.meta.turn = 11;
        (w.state.factions as unknown as Array<{ id: string; supply_sources: string[] }>)
            .find((f) => f.id === 'RBiH')!.supply_sources = ['S_home'];
        await runWarStep(w);
        expect(w.state.displacement.displacement_state.pocket.unsupplied_pressure_turns).toBeUndefined();
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

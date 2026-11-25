/**
 * A9 P1 (SD13, 8-seat §6 ruling D9, 2026-11-25; DISPLACEMENT_MASTER §3.6): the negotiated-evacuation convoy.
 *
 * The convoy opens for side X's pocket in municipality M only from state: (a) X's ground in M is a body separate
 * from X's main body (B3's test), (b) the A5 siege trigger holds, (c) M is at its receiving capacity, (d) the
 * besieger took one of the pocket's own Ring 1 enclave cells within the last UNSUPPLIED_PRESSURE_TURNS turns, and
 * the besieger's intent holds. (c) only opens an episode; each convoy week re-checks (a), (b), (d) and intent, and
 * the episode ends when (d) fails (orchestrator rulings 2026-11-25). At most one convoy a week, at most
 * NEGOTIATED_EVACUATION_CONVOY_MAX people, at most NEGOTIATED_EVACUATION_EPISODE_CAP people an episode, to X's
 * supplied main body only, within capacity.
 *
 * The predicate tests come first (the ruling's required first step): a Goražde-shaped state, a held RBiH pocket
 * cut off from the main body and squeezed by RS, with its predicate recorded.
 */
import { describe, expect, it } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../../src/map/settlements.js';
import { recordNegotiatedEvacuationRefusal, updateDisplacement, type NegotiatedEvacuationPredicateRow } from '../../src/state/displacement.js';
import { NEGOTIATED_EVACUATION_CONVOY_MAX, NEGOTIATED_EVACUATION_EPISODE_CAP } from '../../src/state/displacement_loss_constants.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';

interface World {
    state: GameState;
    settlements: Map<string, SettlementRecord>;
    edges: EdgeRecord[];
    census: MunicipalityPopulation1991Map;
    /** The pocket's municipality. */
    pocket: string;
    /** The settlement RS takes from RBiH in each capture event of the fixture. */
    captureSid: string;
}

interface WorldOpts {
    /** The pocket's municipality. Default `gorazde`; `srebrenica` and `pale` give the other shapes. */
    pocket?: 'gorazde' | 'srebrenica' | 'pale';
    /**
     * Which RS-held settlement of the pocket municipality the capture events name: `enclave` (default), the RS-held
     * cell that is one of RBiH's own Ring 1 ENCLAVE_DEFINITIONS cells there; or `outside`, an RS-held settlement of
     * the municipality outside the enclave cells.
     */
    capture?: 'enclave' | 'outside';
    /** People sheltering in the pocket (RBiH). Default 20,000: the pocket is at twice its 1.5x line. */
    sheltered?: number;
    /** Consecutive unsupplied turns already counted before this turn. Default 2, so this turn is the 3rd. */
    priorUnsupplied?: number;
    /** Turn of RS's capture; null for no capture. Default 9 (this turn is 10). */
    captureTurn?: number | null;
    /** Original population of the main-body destination. Default 100,000 (room for 50,000). */
    homeOriginal?: number;
    /** Add `tesanj`: a second, separate RBiH pocket with its own supply source and room to receive. */
    otherPocket?: boolean;
}

/**
 * The RS-held cell of each shape: Goražde's `kola` and Srebrenica's `luka_2` are RBiH Ring 1 ENCLAVE_DEFINITIONS
 * cells; Pale has no RBiH enclave cell, so `op:pale:kola` is an ordinary settlement.
 */
const ENCLAVE_CELL: Record<'gorazde' | 'srebrenica' | 'pale', string> = { gorazde: 'kola', srebrenica: 'luka_2', pale: 'kola' };

/**
 * Goražde-shaped: three RBiH settlements of the pocket municipality (a, b, c), and two settlements RS took from
 * RBiH there (z, outside the enclave cells; and the enclave cell), ringed by RS-held `foca` (r1, r2); RBiH's main
 * body is `zenica` (14 settlements, its supply source at h1), reached only across RS ground. The pocket is
 * unsupplied and under front pressure.
 */
function world(opts: WorldOpts = {}): World {
    const m = opts.pocket ?? 'gorazde';
    const cell = `op:${m}:${ENCLAVE_CELL[m]}`;
    const controllers: Record<string, string> = {
        [`op:${m}:a`]: 'RBiH',
        [`op:${m}:b`]: 'RBiH',
        [`op:${m}:c`]: 'RBiH',
        [`op:${m}:z`]: 'RS',
        [cell]: 'RS',
        'op:foca:r1': 'RS',
        'op:foca:r2': 'RS',
    };
    const edges: EdgeRecord[] = [
        { a: `op:${m}:a`, b: `op:${m}:b` },
        { a: `op:${m}:b`, b: `op:${m}:c` },
        { a: `op:${m}:c`, b: `op:${m}:z` },
        { a: `op:${m}:c`, b: cell },
        { a: `op:${m}:z`, b: 'op:foca:r1' },
        { a: cell, b: 'op:foca:r1' },
        { a: `op:${m}:a`, b: 'op:foca:r1' },
        { a: 'op:foca:r1', b: 'op:foca:r2' },
        { a: 'op:foca:r2', b: 'op:zenica:h1' },
    ];
    for (let i = 1; i <= 14; i++) {
        controllers[`op:zenica:h${i}`] = 'RBiH';
        if (i > 1) edges.push({ a: `op:zenica:h${i - 1}`, b: `op:zenica:h${i}` });
    }
    if (opts.otherPocket) {
        controllers['op:tesanj:s1'] = 'RBiH';
        edges.push({ a: 'op:tesanj:s1', b: 'op:foca:r1' });
    }
    const settlements = new Map<string, SettlementRecord>();
    for (const sid of Object.keys(controllers)) {
        const mun = sid.split(':')[1];
        settlements.set(sid, { sid, source_id: sid, mun_code: mun, mun, mun1990_id: mun, properties: { population_total: 100 } });
    }
    const captureSid = opts.capture === 'outside' ? `op:${m}:z` : cell;
    const sheltered = opts.sheltered ?? 20_000;
    const row = (mun: string, pop: number) => ({ mun_id: mun, original_population: pop, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 });
    const pocketRow = { ...row(m, 10_000), displaced_in: sheltered, displaced_in_by_faction: sheltered > 0 ? { RBiH: sheltered } : undefined } as Record<string, unknown>;
    const prior = opts.priorUnsupplied ?? 2;
    if (prior > 0) pocketRow.unsupplied_pressure_by_side = { RBiH: { turns: prior, last_turn: 9 } };
    if (pocketRow.displaced_in_by_faction === undefined) delete pocketRow.displaced_in_by_faction;
    const captureTurn = opts.captureTurn === undefined ? 9 : opts.captureTurn;
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'p1', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({
            id,
            supply_sources: id === 'RBiH'
                ? (opts.otherPocket ? ['op:srebrenica:s1', 'op:zenica:h1'] : ['op:zenica:h1'])
                : id === 'RS' ? ['op:foca:r2'] : [],
            areasOfResponsibility: Object.keys(controllers).filter((sid) => controllers[sid] === id).sort(),
        })),
        military: {
            formations: {},
            front_segments: {},
            front_pressure: {},
            militia_pools: { [`${m}:RBiH`]: { mun_id: m, faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 9 } },
        },
        political: {
            political_controllers: controllers,
            control_events: captureTurn === null
                ? []
                : [{ turn: captureTurn, settlement_id: captureSid, mechanism: 'combat', from: 'RBiH', to: 'RS', mun_id: m }],
        },
        displacement: {
            displacement_state: {
                [m]: pocketRow,
                foca: row('foca', 10_000),
                zenica: row('zenica', opts.homeOriginal ?? 100_000),
                ...(opts.otherPocket ? { tesanj: row('tesanj', 100_000) } : {}),
            },
        },
    } as unknown as GameState;
    const census = {
        [m]: { total: 10_000, bosniak: 7_000, serb: 3_000, croat: 0, other: 0 },
        foca: { total: 10_000, bosniak: 0, serb: 10_000, croat: 0, other: 0 },
        zenica: { total: 100_000, bosniak: 100_000, serb: 0, croat: 0, other: 0 },
        tesanj: { total: 100_000, bosniak: 100_000, serb: 0, croat: 0, other: 0 },
    } as MunicipalityPopulation1991Map;
    return { state, settlements, edges, census, pocket: m, captureSid };
}

const run = (w: World, crossings: Parameters<typeof updateDisplacement>[5] = []) =>
    updateDisplacement(w.state, w.settlements, w.edges, w.census, undefined, crossings);

const predicateOf = (report: ReturnType<typeof updateDisplacement>, mun = 'gorazde', side = 'RBiH'): NegotiatedEvacuationPredicateRow | undefined =>
    report.negotiated_evacuation?.find((r) => r.mun_id === mun && r.faction_id === side);

describe('A9 P1 predicate: a Goražde-shaped pocket (recorded first)', () => {
    it('records (a)-(d) and intent all true, with RS as the besieger', () => {
        const row = predicateOf(run(world()));
        expect(row).toBeDefined();
        expect({
            separate: row!.separate,
            siege: row!.siege,
            at_capacity: row!.at_capacity,
            squeeze: row!.squeeze,
            besieger: row!.besieger,
            intent: row!.intent,
            open: row!.open,
            refused: row!.refused,
        }).toEqual({
            separate: true,
            siege: true,
            at_capacity: true,
            squeeze: true,
            besieger: 'RS',
            intent: true,
            open: true,
            refused: false,
        });
        // (d) holds through RS's capture of an own Ring 1 enclave cell (Goražde's `kola`), at t9.
        expect(row!.squeeze_cells).toEqual(['op:gorazde:kola@9']);
    });

    it('(d) is false when the only capture in the window is outside the enclave cells (orchestrator ruling 2026-11-25)', () => {
        const row = predicateOf(run(world({ capture: 'outside' })))!;
        expect(row.separate && row.siege && row.at_capacity).toBe(true);
        expect(row.squeeze).toBe(false);
        expect(row.squeeze_cells).toEqual([]);
        expect(row.besieger).toBeNull();
        expect(row.open).toBe(false);
        expect(row.convoy).toBe(0);
    });

    it('reports no row for a side whose ground is in its main body (RS in the same municipality)', () => {
        expect(predicateOf(run(world()), 'gorazde', 'RS')).toBeUndefined();
    });

    it('(a) fails with a sourced crossing at the pocket', () => {
        const crossing = [{ id: 'fixture_crossing', side: 'RBiH' as const, near_settlements: ['op:gorazde:a'], source: 'test fixture' }];
        const report = run(world(), crossing);
        // No longer a separate pocket: no row, and no episode.
        expect(predicateOf(report)).toBeUndefined();
        expect(report.negotiated_evacuation ?? []).toEqual([]);
    });

    it('(b) fails before the third unsupplied week', () => {
        const row = predicateOf(run(world({ priorUnsupplied: 1 })))!;
        expect(row.siege).toBe(false);
        expect(row.open).toBe(false);
    });

    it('(c) fails below the receiving-capacity line', () => {
        // 10,000 + 4,000 = 14,000 < floor(10,000 x 1.5) = 15,000.
        const row = predicateOf(run(world({ sheltered: 4_000 })))!;
        expect(row.at_capacity).toBe(false);
        expect(row.open).toBe(false);
    });

    it('(d) fails with no capture, or a capture outside the window, and then no besieger is named', () => {
        for (const captureTurn of [null, 7] as const) {
            const row = predicateOf(run(world({ captureTurn })))!;
            expect(row.squeeze).toBe(false);
            expect(row.besieger).toBeNull();
            expect(row.open).toBe(false);
        }
        // Turn 8 is inside the window (turns 8, 9, 10).
        expect(predicateOf(run(world({ captureTurn: 8 })))!.squeeze).toBe(true);
    });

    it('intent: absent when the side has no people here and no takeover record; a takeover timer with people displaced restores it', () => {
        const w = world({ sheltered: 0 });
        // At capacity through other people; the 1991 census holds no RBiH-aligned people.
        const g = w.state.displacement.displacement_state.gorazde;
        g.displaced_in = 20_000;
        g.displaced_in_by_faction = { RS: 20_000 };
        w.census.gorazde = { total: 10_000, bosniak: 0, serb: 10_000, croat: 0, other: 0 };
        const row = predicateOf(run(w))!;
        expect(row.squeeze).toBe(true);
        expect(row.intent).toBe(false);
        expect(row.open).toBe(false);

        const w2 = world({ sheltered: 0 });
        const g2 = w2.state.displacement.displacement_state.gorazde;
        g2.displaced_in = 20_000;
        g2.displaced_in_by_faction = { RS: 20_000 };
        w2.census.gorazde = { total: 10_000, bosniak: 0, serb: 10_000, croat: 0, other: 0 };
        w2.state.displacement.hostile_takeover_timers = {
            'op:foca:r1|RBiH': { mun_id: 'foca', from_faction: 'RBiH', to_faction: 'RS', started_turn: 2, matured_turn: 6, cumulative_displaced: 50 },
        };
        expect(predicateOf(run(w2))!.intent).toBe(true);
    });
});

const ds = (w: World) => w.state.displacement.displacement_state;

/** Next week: advance the turn and, unless `capture` is false, book another RS capture of the fixture's cell. */
function nextWeek(w: World, capture = true): void {
    w.state.meta.turn += 1;
    if (capture) {
        w.state.political.control_events!.push({
            turn: w.state.meta.turn, settlement_id: w.captureSid, mechanism: 'combat', from: 'RBiH', to: 'RS', mun_id: w.pocket,
        });
    }
}

/** Everyone in the fixture's municipalities: residents + sheltered (nobody is killed or abroad by a convoy). */
function peopleInBih(w: World): number {
    let total = 0;
    for (const entry of Object.values(ds(w))) total += entry.original_population + entry.displaced_in - entry.displaced_out - entry.lost_population;
    return total;
}

describe('A9 P1 convoy', () => {
    it('fires when (a)-(d) and intent hold: one convoy of at most 3,000, sheltered first, to the main body, recorded', () => {
        const w = world();
        const before = peopleInBih(w);
        const report = run(w);
        const row = predicateOf(report)!;
        expect(row.convoy).toBe(NEGOTIATED_EVACUATION_CONVOY_MAX);
        expect(row.episode_people).toBe(NEGOTIATED_EVACUATION_CONVOY_MAX);
        expect(ds(w).gorazde.displaced_in).toBe(20_000 - 3_000);
        expect(ds(w).gorazde.displaced_in_by_faction?.RBiH).toBe(17_000);
        expect(ds(w).gorazde.displaced_out).toBe(0);
        expect(ds(w).gorazde.lost_population).toBe(0);
        expect(ds(w).zenica.displaced_in_by_faction?.RBiH).toBe(3_000);
        expect(peopleInBih(w)).toBe(before);
        expect(report.routing.filter((r) => r.reason === 'negotiated_evacuation')).toEqual([
            { from_mun: 'gorazde', to_mun: 'zenica', amount: 3_000, reason: 'negotiated_evacuation' },
        ]);
        expect(w.state.displacement.negotiated_evacuation_records).toEqual([{
            turn: 10, mun_id: 'gorazde', side: 'RBiH', besieger: 'RS', people: 3_000, from_sheltered: 3_000, from_residents: 0,
            convoy: 1, episode_people: 3_000, reason: 'negotiated_evacuation',
        }]);
        expect(ds(w).gorazde.negotiated_evacuation_by_side?.RBiH).toEqual({
            opened_turn: 10, convoys: 1, people: 3_000, last_convoy_turn: 10, refused_turn: null,
        });
        // No credit and no event-log booking: the convoy writes no displacement event and no casualty.
        expect(w.state.displacement.displacement_event_log ?? []).toEqual([]);
        expect(w.state.displacement.displacement_humanitarian_aggregates).toBeUndefined();
    });

    it('runs at most one convoy a week', () => {
        const w = world();
        run(w);
        // Same turn again, with the siege count put back so only the weekly limit can stop it.
        ds(w).gorazde.unsupplied_pressure_by_side = { RBiH: { turns: 2, last_turn: 9 } };
        const again = predicateOf(run(w))!;
        expect(again.open).toBe(true);
        expect(again.convoy).toBe(0);
        expect(w.state.displacement.negotiated_evacuation_records).toHaveLength(1);
    });

    it('stops at the episode cap and never exceeds 3,000 a convoy', () => {
        const w = world({ sheltered: 30_000 });
        const moved: number[] = [];
        for (let week = 0; week < 5; week++) {
            if (week > 0) nextWeek(w);
            moved.push(predicateOf(run(w))!.convoy);
        }
        expect(moved).toEqual([3_000, 3_000, 3_000, 0, 0]);
        expect(moved.every((m) => m <= NEGOTIATED_EVACUATION_CONVOY_MAX)).toBe(true);
        const ep = ds(w).gorazde.negotiated_evacuation_by_side!.RBiH!;
        expect(ep.people).toBe(NEGOTIATED_EVACUATION_EPISODE_CAP);
        expect(ep.convoys).toBe(3);
        nextWeek(w);
        expect(predicateOf(run(w))!.cap_reached).toBe(true);
        const records = w.state.displacement.negotiated_evacuation_records!;
        expect(records.map((r) => [r.turn, r.convoy, r.episode_people])).toEqual([[10, 1, 3_000], [11, 2, 6_000], [12, 3, 9_000]]);
    });

    it('(c) only opens: a pocket below its capacity line never opens an episode', () => {
        // 10,000 + 4,000 = 14,000 < 15,000, every other term holds, for three weeks.
        const w = world({ sheltered: 4_000 });
        for (let week = 0; week < 3; week++) {
            if (week > 0) nextWeek(w);
            const row = predicateOf(run(w))!;
            expect(row.at_capacity).toBe(false);
            expect(row.convoy_week).toBe(false);
            expect(row.convoy).toBe(0);
        }
        expect(ds(w).gorazde.negotiated_evacuation_by_side).toBeUndefined();
        expect(w.state.displacement.negotiated_evacuation_records).toBeUndefined();
    });

    it('a Srebrenica-shaped episode: (c) true only in the first week, three convoys, ending at exactly 9,000', () => {
        // 10,000 + 6,000 sheltered = 16,000 >= 15,000 at t10 only; RS takes the enclave cell luka_2 every week.
        const w = world({ pocket: 'srebrenica', sheltered: 6_000 });
        const rows: NegotiatedEvacuationPredicateRow[] = [];
        for (let week = 0; week < 5; week++) {
            if (week > 0) nextWeek(w);
            rows.push(predicateOf(run(w), 'srebrenica')!);
        }
        expect(rows.map((r) => r.at_capacity)).toEqual([true, false, false, false, false]);
        expect(rows.map((r) => r.convoy)).toEqual([3_000, 3_000, 3_000, 0, 0]);
        // t11's window (t9-t11) holds the t9 and t11 captures.
        expect(rows[1].squeeze_cells).toEqual(['op:srebrenica:luka_2@9', 'op:srebrenica:luka_2@11']);
        expect(rows.slice(3).every((r) => r.cap_reached)).toBe(true);
        const ep = ds(w).srebrenica.negotiated_evacuation_by_side!.RBiH!;
        expect(ep).toMatchObject({ opened_turn: 10, convoys: 3, people: NEGOTIATED_EVACUATION_EPISODE_CAP });
        // Sheltered first (6,000), then residents (3,000).
        const recs = w.state.displacement.negotiated_evacuation_records!;
        expect(recs.map((r) => [r.from_sheltered, r.from_residents])).toEqual([[3_000, 0], [3_000, 0], [0, 3_000]]);
        expect(ds(w).zenica.displaced_in).toBe(NEGOTIATED_EVACUATION_EPISODE_CAP);
    });

    it('a week with (b) false skips the convoy but keeps the episode', () => {
        const w = world({ sheltered: 30_000 });
        expect(predicateOf(run(w))!.convoy).toBe(3_000); // t10
        // The pocket is supplied for a week: the siege count restarts, so (b) fails at t11 and t12.
        delete ds(w).gorazde.unsupplied_pressure_by_side;
        const moved: number[] = [];
        const siege: boolean[] = [];
        for (let week = 0; week < 3; week++) {
            nextWeek(w);
            const row = predicateOf(run(w))!;
            moved.push(row.convoy);
            siege.push(row.siege);
            expect(ds(w).gorazde.negotiated_evacuation_by_side?.RBiH?.opened_turn).toBe(10);
        }
        expect(siege).toEqual([false, false, true]);
        expect(moved).toEqual([0, 0, 3_000]);
        expect(ds(w).gorazde.negotiated_evacuation_by_side?.RBiH).toMatchObject({ opened_turn: 10, convoys: 2, people: 6_000 });
    });

    it('a Pale-shaped municipality (no own enclave cell) never opens', () => {
        const w = world({ pocket: 'pale', sheltered: 30_000 });
        for (let week = 0; week < 4; week++) {
            if (week > 0) nextWeek(w);
            const row = predicateOf(run(w), 'pale')!;
            expect(row.separate && row.siege && row.at_capacity).toBe(true);
            // RS took ground of the municipality every week, but none of it is an RBiH enclave cell.
            expect(row.squeeze).toBe(false);
            expect(row.besieger).toBeNull();
            expect(row.open).toBe(false);
            expect(row.convoy).toBe(0);
        }
        expect(ds(w).pale.negotiated_evacuation_by_side).toBeUndefined();
        expect(w.state.displacement.negotiated_evacuation_records).toBeUndefined();
    });

    it('boards residents once the sheltered stock is gone', () => {
        // 16,000 >= 15,000; 1,000 of the sheltered are RBiH people, 5,000 are others (never boarded).
        const w = world({ sheltered: 1_000 });
        ds(w).gorazde.displaced_in = 6_000;
        ds(w).gorazde.displaced_in_by_faction = { RBiH: 1_000, HRHB: 5_000 };
        run(w);
        const rec = w.state.displacement.negotiated_evacuation_records![0];
        expect(rec.from_sheltered).toBe(1_000);
        expect(rec.from_residents).toBe(2_000);
        expect(rec.people).toBe(3_000);
        expect(ds(w).gorazde.displaced_out).toBe(2_000);
        expect(ds(w).gorazde.displaced_in).toBe(5_000);
        expect(ds(w).gorazde.displaced_in_by_faction).toEqual({ HRHB: 5_000 });
    });

    it('closes when the squeeze ends, and a new squeeze opens a new episode', () => {
        const w = world({ sheltered: 30_000 });
        run(w); // t10: capture at t9 in the window
        nextWeek(w, false); // t11: window 9-11 still holds the t9 capture
        expect(predicateOf(run(w))!.convoy).toBe(3_000);
        nextWeek(w, false); // t12: window 10-12 holds no capture
        const closed = predicateOf(run(w))!;
        expect(closed.squeeze).toBe(false);
        expect(closed.convoy).toBe(0);
        expect(ds(w).gorazde.negotiated_evacuation_by_side).toBeUndefined();
        nextWeek(w, true); // t13: a new capture, a new squeeze
        const reopened = predicateOf(run(w))!;
        expect(reopened.convoy).toBe(3_000);
        expect(ds(w).gorazde.negotiated_evacuation_by_side?.RBiH).toMatchObject({ opened_turn: 13, convoys: 1, people: 3_000 });
        expect(w.state.displacement.negotiated_evacuation_records!.map((r) => [r.turn, r.convoy])).toEqual([[10, 1], [11, 2], [13, 1]]);
    });

    it('a human RBiH refusal blocks the convoys for the rest of the episode and ends with it', () => {
        const w = world({ sheltered: 30_000 });
        w.state.meta.player_faction = 'RBiH';
        w.state.meta.headless_scenario_auto_control = false;
        expect(recordNegotiatedEvacuationRefusal(w.state, 'gorazde', 'RBiH')).toBe(false); // no episode yet
        run(w); // t10: the episode opens and its first convoy runs
        expect(recordNegotiatedEvacuationRefusal(w.state, 'gorazde', 'RBiH')).toBe(true);
        const shelteredBefore = ds(w).gorazde.displaced_in;
        nextWeek(w); // t11
        const row = predicateOf(run(w))!;
        expect(row.open).toBe(true);
        expect(row.refused).toBe(true);
        expect(row.convoy).toBe(0);
        // The siege cost stands: the people stay in the pocket.
        expect(ds(w).gorazde.displaced_in).toBe(shelteredBefore);
        expect(ds(w).gorazde.negotiated_evacuation_by_side?.RBiH?.refused_turn).toBe(10);
        expect(w.state.displacement.negotiated_evacuation_records).toHaveLength(1);
        // t14: no capture since t11, the squeeze has ended and the refusal with it; t15: a new squeeze allows.
        for (let i = 0; i < 3; i++) {
            nextWeek(w, false);
            run(w);
        }
        expect(ds(w).gorazde.negotiated_evacuation_by_side).toBeUndefined();
        nextWeek(w, true);
        expect(predicateOf(run(w))!.convoy).toBe(3_000);
    });

    it('the default allows: bots and headless runs ignore a refusal on record, and cannot write one', () => {
        for (const meta of [{}, { player_faction: 'RBiH', headless_scenario_auto_control: true }, { player_faction: 'RS', headless_scenario_auto_control: false }]) {
            const w = world({ sheltered: 30_000 });
            Object.assign(w.state.meta, meta);
            run(w);
            expect(recordNegotiatedEvacuationRefusal(w.state, 'gorazde', 'RBiH')).toBe(false);
            ds(w).gorazde.negotiated_evacuation_by_side!.RBiH!.refused_turn = 10; // as if written
            nextWeek(w);
            const row = predicateOf(run(w))!;
            expect(row.refused).toBe(false);
            expect(row.convoy).toBe(3_000);
        }
    });

    it('goes to the supplied main body only, within its receiving capacity', () => {
        // zenica: 10,000 original, line 15,000: room for 5,000. tesanj: a separate supplied pocket, never a destination.
        const w = world({ sheltered: 30_000, homeOriginal: 10_000, otherPocket: true });
        const moved: number[] = [];
        for (let week = 0; week < 3; week++) {
            if (week > 0) nextWeek(w);
            moved.push(predicateOf(run(w))!.convoy);
        }
        expect(moved).toEqual([3_000, 2_000, 0]);
        expect(ds(w).zenica.displaced_in).toBe(5_000);
        expect(ds(w).tesanj.displaced_in).toBe(0);
        expect(w.state.displacement.negotiated_evacuation_records!.map((r) => r.people)).toEqual([3_000, 2_000]);
    });

    it('conserves people: leaving the pocket = arriving in the main body, across an episode', () => {
        const w = world({ sheltered: 30_000 });
        const pocket = () => {
            const g = ds(w).gorazde;
            return g.original_population + g.displaced_in - g.displaced_out - g.lost_population;
        };
        const pocketBefore = pocket();
        const total = peopleInBih(w);
        for (let week = 0; week < 4; week++) {
            if (week > 0) nextWeek(w);
            run(w);
        }
        const arrived = ds(w).zenica.displaced_in;
        const recorded = w.state.displacement.negotiated_evacuation_records!.reduce((s, r) => s + r.people, 0);
        // The siege trickle of this separate pocket is trapped, so every departure is a convoy.
        expect(arrived).toBe(NEGOTIATED_EVACUATION_EPISODE_CAP);
        expect(pocketBefore - pocket()).toBe(arrived);
        expect(recorded).toBe(arrived);
        expect(peopleInBih(w)).toBe(total);
    });

    it('is deterministic: identical inputs give identical state and report', () => {
        const a = world({ sheltered: 30_000, otherPocket: true });
        const b = world({ sheltered: 30_000, otherPocket: true });
        const ra: unknown[] = [];
        const rb: unknown[] = [];
        for (let week = 0; week < 4; week++) {
            if (week > 0) {
                nextWeek(a);
                nextWeek(b);
            }
            ra.push(run(a));
            rb.push(run(b));
        }
        expect(JSON.stringify(ra)).toBe(JSON.stringify(rb));
        expect(JSON.stringify(a.state.displacement)).toBe(JSON.stringify(b.state.displacement));
    });
});

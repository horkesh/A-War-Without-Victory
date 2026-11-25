/**
 * A6 (SD9, broader bright-line panel batch A round 2, unanimous): the siege outflow carries its
 * sub-person remainder as an integer parts-per-million carry per municipality and side
 * (`DisplacementState.siege_outflow_carry_by_side`). Before A6, `floor(heldPeople * 0.001)` was 0
 * every week for any pocket under 1,000 people, so Žepa (about 764 held) lost nobody in 107 weeks
 * of encirclement.
 *
 * Binding tests (seats): integer exactness at the largest municipality; no burst after N weeks
 * with no capacity; the update precedes every later continue; deletion at holder change / fall,
 * at neither-trigger and at nobody-left; save round trip with the field present and absent; an
 * old save (no field) loads and equals a no-carry run.
 */
import { describe, expect, it } from 'vitest';

import type { EdgeRecord, SettlementRecord } from '../../src/map/settlements.js';
import {
    ENCIRCLEMENT_DISPLACEMENT_FRACTION,
    SIEGE_OUTFLOW_PPM_SCALE,
    updateDisplacement,
} from '../../src/state/displacement.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';

// A9 B3 (D10b): the pocket routes because the fixture declares a crossing at its near end.
const FIXTURE_CROSSING = [{ id: 'fixture_crossing', side: 'RBiH' as const, near_settlements: ['op:pocket:a'], source: 'test fixture: stands in for a sourced crossing (D10b)' }];
const PPM = Math.round(ENCIRCLEMENT_DISPLACEMENT_FRACTION * SIEGE_OUTFLOW_PPM_SCALE);

interface World {
    state: GameState;
    settlements: Map<string, SettlementRecord>;
    edges: EdgeRecord[];
    census: MunicipalityPopulation1991Map;
}

/**
 * An all-Bosniak RBiH pocket (two OSIDs) ringed by RS, cut off from a large RBiH home body
 * (so it is encircled every turn). `supplied`: RBiH has a supply source at home, so A5 gives
 * the leavers a destination; without it everyone is trapped.
 */
function world(opts: { population: number; supplied: boolean; linked?: boolean }): World {
    const controllers: Record<string, string> = {
        'op:pocket:a': 'RBiH',
        'op:pocket:b': 'RBiH',
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
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'carry', phase: 'war' },
        factions: ['HRHB', 'RBiH', 'RS'].map((id) => ({
            id,
            supply_sources: id === 'RBiH' && opts.supplied ? ['op:home:e'] : [],
            areasOfResponsibility: Object.keys(controllers).filter((sid) => controllers[sid] === id).sort(),
        })),
        military: {
            formations: {},
            front_segments: {},
            front_pressure: {},
            militia_pools: { 'pocket:RBiH': pool('pocket', 'RBiH'), 'pocket:RS': pool('pocket', 'RS') },
        },
        political: { political_controllers: controllers },
        displacement: {
            displacement_state: {
                pocket: { mun_id: 'pocket', original_population: opts.population, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 },
                ring: { mun_id: 'ring', original_population: 10000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 },
                home: { mun_id: 'home', original_population: 10000, displaced_out: 0, displaced_in: 0, lost_population: 0, last_updated_turn: 9 },
            },
        },
    } as unknown as GameState;
    const census = {
        pocket: { total: opts.population, bosniak: opts.population, serb: 0, croat: 0, other: 0 },
        ring: { total: 10000, bosniak: 0, serb: 10000, croat: 0, other: 0 },
        home: { total: 10000, bosniak: 10000, serb: 0, croat: 0, other: 0 },
    } as MunicipalityPopulation1991Map;
    return { state, settlements, edges, census };
}

function step(w: World) {
    const report = updateDisplacement(w.state, w.settlements, w.edges, w.census, undefined, FIXTURE_CROSSING);
    w.state.meta.turn += 1;
    return report;
}

const pocket = (w: World) => w.state.displacement.displacement_state.pocket;
const carryOf = (w: World) => pocket(w).siege_outflow_carry_by_side?.RBiH;
const wantedOf = (r: ReturnType<typeof step>) => r.trapped?.find((t) => t.mun_id === 'pocket' && t.faction_id === 'RBiH')?.wanted ?? 0;

describe('A6 siege outflow carry (SD9)', () => {
    it('a pocket under 1,000 people now drains at the sourced rate (it rounded to 0 every week before)', () => {
        const w = world({ population: 764, supplied: true });
        // Before A6 the weekly outflow was floor(764 * 0.001) = 0.
        expect(Math.floor(764 * ENCIRCLEMENT_DISPLACEMENT_FRACTION)).toBe(0);
        // Reference: the ruled formula, held = remaining people (whole pocket, all Bosniak).
        let carry = 0;
        let out = 0;
        for (let k = 0; k < 20; k++) {
            const r = step(w);
            const held = 764 - out;
            const total = held * PPM + carry;
            const wanted = Math.min(Math.floor(total / SIEGE_OUTFLOW_PPM_SCALE), held);
            carry = total % SIEGE_OUTFLOW_PPM_SCALE;
            out += wanted;
            expect(wantedOf(r)).toBe(wanted);
            expect(carryOf(w) ?? 0).toBe(carry);
            expect(pocket(w).displaced_out).toBe(out);
        }
        // About 0.001 x 764 x 20 = 15 people, never a burst.
        expect(out).toBe(15);
        expect(pocket(w).lost_population).toBe(0);
    });

    it('integer exactness at the largest municipality (no float state)', () => {
        // Larger than any 1991 municipality (Novi Grad Sarajevo about 136,000; city about 527,000).
        const w = world({ population: 599_999, supplied: true });
        let carry = 0;
        for (let k = 0; k < 12; k++) {
            // Held people come from who actually left (routing capacity can keep some in place).
            const held = 599_999 - pocket(w).displaced_out;
            const r = step(w);
            const total = held * PPM + carry;
            expect(Number.isSafeInteger(total)).toBe(true);
            const wanted = Math.floor(total / SIEGE_OUTFLOW_PPM_SCALE);
            carry = total % SIEGE_OUTFLOW_PPM_SCALE;
            expect(wantedOf(r)).toBe(wanted);
            const stored = carryOf(w) ?? 0;
            expect(Number.isInteger(stored)).toBe(true);
            expect(stored).toBeGreaterThanOrEqual(0);
            expect(stored).toBeLessThan(SIEGE_OUTFLOW_PPM_SCALE);
            expect(stored).toBe(carry);
        }
        expect(pocket(w).lost_population).toBe(0);
    });

    it('no burst: N weeks with no capacity, then capacity, gives the steady rate (no debt)', () => {
        const trapped = world({ population: 800, supplied: false });
        const series: number[] = [];
        for (let k = 0; k < 10; k++) series.push(wantedOf(step(trapped)));
        // Nobody could leave, nothing was booked, and the carry never left [0, 1e6).
        expect(pocket(trapped).displaced_out).toBe(0);
        expect(carryOf(trapped) ?? 0).toBeLessThan(SIEGE_OUTFLOW_PPM_SCALE);
        // Capacity opens.
        (trapped.state.factions as unknown as Array<{ id: string; supply_sources: string[] }>)
            .find((f) => f.id === 'RBiH')!.supply_sources = ['op:home:e'];
        for (let k = 0; k < 5; k++) series.push(wantedOf(step(trapped)));
        // 800 people at 0.001 a week: never more than one leaver in any week, trapped or not,
        // and the week capacity opens releases no pent-up demand.
        expect(Math.max(...series)).toBe(1);
        expect(series[10]).toBeLessThanOrEqual(1);
        expect(pocket(trapped).displaced_out).toBe(series.slice(10).reduce((s, x) => s + x, 0));
        // 5 open weeks: at most 5 x 800 x 1000 ppm plus one carried remainder (< 1e6), i.e. <= 4.
        expect(pocket(trapped).displaced_out).toBeLessThanOrEqual(4);
    });

    it('is deleted at a holder change / enclave fall, in the fall week itself, and books nothing after', () => {
        const w = world({ population: 800, supplied: true });
        step(w); // 800,000 ppm carried
        expect(carryOf(w)).toBe(800_000);
        // The pocket falls: RS takes both settlements.
        const pc = w.state.political.political_controllers!;
        pc['op:pocket:a'] = 'RS';
        pc['op:pocket:b'] = 'RS';
        const outBefore = pocket(w).displaced_out;
        const fallWeek = step(w);
        expect(pocket(w).siege_outflow_carry_by_side).toBeUndefined();
        expect(fallWeek.by_municipality.filter((r) => r.mun_id === 'pocket' && r.faction_id === 'RBiH')).toEqual([]);
        const after = step(w);
        expect(after.by_municipality.filter((r) => r.mun_id === 'pocket' && r.faction_id === 'RBiH')).toEqual([]);
        expect(pocket(w).displaced_out).toBe(outBefore);
        // The captor does not inherit a pre-paid fraction.
        expect(pocket(w).siege_outflow_carry_by_side?.RS).toBeUndefined();
    });

    it('is deleted when neither trigger holds (the pocket is relieved)', () => {
        const w = world({ population: 800, supplied: true });
        step(w);
        expect(carryOf(w)).toBe(800_000);
        w.edges.push({ a: 'op:pocket:b', b: 'op:home:g' }); // joined to the supplied main body
        const r = step(w);
        expect(pocket(w).siege_outflow_carry_by_side).toBeUndefined();
        expect(wantedOf(r)).toBe(0);
    });

    it('is deleted when nobody remains', () => {
        const w = world({ population: 800, supplied: true });
        step(w);
        expect(carryOf(w)).toBe(800_000);
        pocket(w).lost_population = 800;
        step(w);
        expect(pocket(w).siege_outflow_carry_by_side).toBeUndefined();
    });

    it('a save round-trips the carry, and an old save without the field loads and equals a no-carry run', () => {
        const a = world({ population: 800, supplied: true });
        step(a);
        expect(carryOf(a)).toBe(800_000);
        const b: World = { ...a, state: JSON.parse(JSON.stringify(a.state)) as GameState };
        expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));
        for (let k = 0; k < 6; k++) {
            step(a);
            step(b);
        }
        expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state));

        // Old save: the field is absent. It loads and runs as a carry of 0.
        const old = world({ population: 800, supplied: true });
        const fresh = world({ population: 800, supplied: true });
        expect(pocket(old).siege_outflow_carry_by_side).toBeUndefined();
        for (let k = 0; k < 4; k++) {
            step(old);
            step(fresh);
        }
        expect(JSON.stringify(old.state)).toBe(JSON.stringify(fresh.state));
    });

    it('the field is absent when no side has a carry', () => {
        const w = world({ population: 1000, supplied: true });
        step(w); // 1000 x 1000 ppm = exactly one person, remainder 0
        expect(pocket(w).displaced_out).toBe(1);
        expect(pocket(w).siege_outflow_carry_by_side).toBeUndefined();
    });
});

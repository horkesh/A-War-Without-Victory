/**
 * OZ-ENGINE (Fable consult 12, appendix A; orchestrator ruling §43): idle replacement.
 *
 * The men war weariness takes each week from an IDLE pool (every active brigade homed on it
 * is at its cap) are first offered to the faction's brigades under 40% of cap, weakest first
 * inside the reserve's priority tier, at the reserve draw rate. The route is closed while the
 * faction is under its own manpower-exhaustion penalty. Pool stock is never touched; men placed
 * are booked as `committed` of the donor pool. Men not placed are lost, as before.
 */
import { describe, expect, it } from 'vitest';
import { applyPoolWarWearinessDecay } from '../src/sim/combat/pool_decay.js';
import {
    findIdlePoolKeys,
    getReserveDrawRate,
    reinforceFromStrategicReserves,
} from '../src/sim/combat/strategic_reserve.js';
import { isUnderManpowerExhaustionPenalty } from '../src/sim/combat/cohesion_drift.js';
import { RECONSTITUTION_PERSONNEL_FRACTION } from '../src/sim/combat/brigade_reconstitution.js';
import type { FormationState, GameState, MilitiaPoolState } from '../src/state/game_state.js';

function brigade(id: string, over: Partial<FormationState>): FormationState {
    return {
        id,
        faction: 'RS',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 2000,
        max_personnel: 2000,
        kind: 'brigade',
        ...over,
    } as FormationState;
}

function pool(mun: string, faction: string, available: number, committed = 0): MilitiaPoolState {
    return { mun_id: mun, faction, available, committed, exhausted: 0, updated_turn: 10 } as MilitiaPoolState;
}

function makeState(
    formations: FormationState[],
    pools: Record<string, MilitiaPoolState>,
    reserves: Record<string, number> = {},
): GameState {
    const fm: Record<string, FormationState> = {};
    for (const f of formations) fm[f.id] = f;
    return {
        meta: { turn: 40, phase: 'war', start_year: 1992, recruitment_mode: 'player_choice' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: fm, militia_pools: pools, strategic_reserves: reserves },
        political: { political_controllers: {}, last_supply_state_by_osid: {} },
    } as unknown as GameState;
}

/** A rear pool (Lopare) with one full brigade, so it is idle; low committed keeps RS under its penalty. */
function idleRear(available = 5000): { f: FormationState; key: string; p: MilitiaPoolState } {
    return {
        f: brigade('rs_lopare', { tags: ['mun:lopare'], personnel: 2000, max_personnel: 2000 }),
        key: 'lopare:RS',
        p: pool('lopare', 'RS', available, 0),
    };
}

const lineOf = (f: FormationState): number => Math.floor((f.max_personnel ?? 3000) * RECONSTITUTION_PERSONNEL_FRACTION);

describe('idle replacement (OZ-ENGINE)', () => {
    it('1. idle pool: a brigade at cap makes it idle; one under cap does not; no brigade does not', () => {
        const state = makeState([
            brigade('a_full', { tags: ['mun:lopare'], personnel: 2000 }),
            brigade('b_full', { tags: ['mun:pale'], personnel: 2000 }),
            brigade('b_short', { tags: ['mun:pale'], personnel: 1999 }),
        ], {
            'lopare:RS': pool('lopare', 'RS', 1000),
            'pale:RS': pool('pale', 'RS', 1000),
            'sokolac:RS': pool('sokolac', 'RS', 1000),
        });
        expect([...findIdlePoolKeys(state)]).toEqual(['lopare:RS']);
    });

    it('2. the offer is the weariness loss of idle pools only, and pool stock is what decay left', () => {
        const rear = idleRear(5000);
        const hollow = brigade('rs_ozren', { tags: ['mun:doboj'], personnel: 300, max_personnel: 2000 });
        const busyHome = brigade('rs_pale', { tags: ['mun:pale'], personnel: 1500, max_personnel: 2000 });
        const state = makeState([rear.f, hollow, busyHome], {
            [rear.key]: rear.p,
            'pale:RS': pool('pale', 'RS', 5000),
            'doboj:RS': pool('doboj', 'RS', 0),
        });
        const decay = applyPoolWarWearinessDecay(state);
        expect(decay.by_pool).toEqual({ 'lopare:RS': 100, 'pale:RS': 100 });
        const availBefore = Object.fromEntries(Object.entries(state.military.militia_pools!).map(([k, p]) => [k, p.available]));
        const report = reinforceFromStrategicReserves(state, undefined, decay.by_pool);
        const availAfter = Object.fromEntries(Object.entries(state.military.militia_pools!).map(([k, p]) => [k, p.available]));
        expect(availAfter).toEqual(availBefore);
        // Only Lopare (idle) is offered; Pale's brigade is under cap, so Pale's loss is not.
        expect(report.idle_replacement_by_faction.RS.offer).toBe(100);
        expect(report.idle_replacement_by_faction.RS.idle_pools).toBe(1);
        expect(state.military.formations.rs_ozren.personnel).toBe(400);
    });

    it('3. under the line gets min(rate, gap, offer); at the line nothing; served by the reserve nothing', () => {
        const rear = idleRear();
        const byRate = brigade('rs_a', { tags: ['mun:doboj'], personnel: 100, max_personnel: 3000 });
        const byGap = brigade('rs_b', { tags: ['mun:doboj'], personnel: 1150, max_personnel: 3000 });
        const atLine = brigade('rs_c', { tags: ['mun:doboj'], personnel: 1200, max_personnel: 3000 });
        const state = makeState([rear.f, byRate, byGap, atLine], { [rear.key]: rear.p, 'doboj:RS': pool('doboj', 'RS', 0) });
        const rate = getReserveDrawRate(state, byRate, 'RS');
        expect(rate).toBeGreaterThan(50);
        reinforceFromStrategicReserves(state, undefined, { [rear.key]: 10_000 });
        expect(state.military.formations.rs_a.personnel).toBe(100 + Math.min(rate, lineOf(byRate) - 100));
        expect(state.military.formations.rs_b.personnel).toBe(lineOf(byGap));
        expect(state.military.formations.rs_c.personnel).toBe(1200);

        // Offer-bound: a 7-man offer places 7.
        const s2 = makeState([idleRear().f, brigade('rs_a', { tags: ['mun:doboj'], personnel: 100, max_personnel: 3000 })],
            { 'lopare:RS': pool('lopare', 'RS', 5000), 'doboj:RS': pool('doboj', 'RS', 0) });
        reinforceFromStrategicReserves(s2, undefined, { 'lopare:RS': 7 });
        expect(s2.military.formations.rs_a.personnel).toBe(107);

        // Served by the reserve this turn: the idle route passes it by.
        const s3 = makeState([idleRear().f, brigade('rs_a', { tags: ['mun:doboj'], personnel: 100, max_personnel: 3000 })],
            { 'lopare:RS': pool('lopare', 'RS', 5000), 'doboj:RS': pool('doboj', 'RS', 0) }, { RS: 10 });
        const r3 = reinforceFromStrategicReserves(s3, undefined, { 'lopare:RS': 500 });
        expect(s3.military.formations.rs_a.personnel).toBe(110);
        expect(r3.idle_replacement_by_faction.RS.placed).toBe(0);
    });

    it('4. ineligible brigades get nothing (stranded, collapsed, critical supply, enclave, degraded, forming)', () => {
        const rear = idleRear();
        const cases: FormationState[] = [
            brigade('rs_holding', { tags: ['mun:doboj'], personnel: 100, stranded_status: 'holding' }),
            brigade('rs_collapsed', { tags: ['mun:doboj'], personnel: 100, stranded_status: 'collapsed' }),
            brigade('rs_critical', { tags: ['mun:doboj'], personnel: 100, location_osid: 'op:test:pocket' }),
            brigade('rs_enclave', { tags: ['mun:doboj', 'enclave'], personnel: 100 }),
            brigade('rs_degraded', { tags: ['mun:doboj'], personnel: 100, readiness: 'degraded' }),
            brigade('rs_forming', { tags: ['mun:doboj'], personnel: 100, readiness: 'forming' }),
        ];
        const state = makeState([rear.f, ...cases], { [rear.key]: rear.p, 'doboj:RS': pool('doboj', 'RS', 0) });
        (state.political as { last_supply_state_by_osid: Record<string, string> }).last_supply_state_by_osid['op:test:pocket'] = 'critical';
        const report = reinforceFromStrategicReserves(state, undefined, { [rear.key]: 10_000 });
        for (const f of cases) expect(state.military.formations[f.id].personnel).toBe(100);
        expect(report.idle_replacement_by_faction.RS.placed).toBe(0);
    });

    it('5. order: the weaker brigade is served first, and the priority tier still comes first', () => {
        const rear = idleRear();
        const weak = brigade('rs_z_weak', { tags: ['mun:doboj'], personnel: 100, max_personnel: 3000 });
        const less = brigade('rs_a_less', { tags: ['mun:doboj'], personnel: 600, max_personnel: 3000 });
        const state = makeState([rear.f, weak, less], { [rear.key]: rear.p, 'doboj:RS': pool('doboj', 'RS', 0) });
        reinforceFromStrategicReserves(state, undefined, { [rear.key]: 30 });
        expect(state.military.formations.rs_z_weak.personnel).toBe(130);
        expect(state.military.formations.rs_a_less.personnel).toBe(600);

        // A corridor-tier brigade outranks a weaker periphery one.
        const s2 = makeState([
            idleRear().f,
            brigade('rs_z_weak', { tags: ['mun:doboj'], personnel: 100, max_personnel: 3000 }),
            brigade('rs_corridor', { tags: ['mun:doboj'], personnel: 600, max_personnel: 3000, location_osid: 'op:brcko:brcko' }),
        ], { 'lopare:RS': pool('lopare', 'RS', 5000), 'doboj:RS': pool('doboj', 'RS', 0) });
        reinforceFromStrategicReserves(s2, undefined, { 'lopare:RS': 30 });
        expect(s2.military.formations.rs_corridor.personnel).toBe(630);
        expect(s2.military.formations.rs_z_weak.personnel).toBe(100);
    });

    it('6. gate: a faction at its exhaustion threshold places nothing; just under, it places', () => {
        // RS threshold 0.92: committed / (committed + available) over RS pools.
        const at = makeState([idleRear().f, brigade('rs_a', { tags: ['mun:doboj'], personnel: 100 })], {
            'lopare:RS': pool('lopare', 'RS', 800, 9200),
            'doboj:RS': pool('doboj', 'RS', 0),
        });
        expect(isUnderManpowerExhaustionPenalty(at, 'RS')).toBe(true);
        const rAt = reinforceFromStrategicReserves(at, undefined, { 'lopare:RS': 100 });
        expect(at.military.formations.rs_a.personnel).toBe(100);
        expect(rAt.idle_replacement_by_faction.RS.route_open).toBe(false);

        const under = makeState([idleRear().f, brigade('rs_a', { tags: ['mun:doboj'], personnel: 100 })], {
            'lopare:RS': pool('lopare', 'RS', 801, 9199),
            'doboj:RS': pool('doboj', 'RS', 0),
        });
        expect(isUnderManpowerExhaustionPenalty(under, 'RS')).toBe(false);
        const rUnder = reinforceFromStrategicReserves(under, undefined, { 'lopare:RS': 100 });
        expect(under.military.formations.rs_a.personnel).toBe(200);
        expect(rUnder.idle_replacement_by_faction.RS.route_open).toBe(true);
    });

    it('7. ledger: donor committed rises by the men placed; available and the reserve do not change', () => {
        const rear = idleRear(4000);
        const state = makeState([rear.f, brigade('rs_a', { tags: ['mun:doboj'], personnel: 100 })],
            { [rear.key]: rear.p, 'doboj:RS': pool('doboj', 'RS', 0) }, { RS: 0 });
        const r = reinforceFromStrategicReserves(state, undefined, { [rear.key]: 80 });
        expect(state.military.formations.rs_a.personnel).toBe(180);
        expect(state.military.militia_pools!['lopare:RS'].committed).toBe(80);
        expect(state.military.militia_pools!['lopare:RS'].available).toBe(4000);
        expect(state.military.strategic_reserves!.RS).toBe(0);
        expect(r.idle_replacement_by_faction.RS.placed).toBe(80);
        // Nothing carries over: a turn with no offer places nothing.
        const r2 = reinforceFromStrategicReserves(state, undefined, {});
        expect(state.military.formations.rs_a.personnel).toBe(180);
        expect(r2.idle_replacement_by_faction.RS?.placed ?? 0).toBe(0);
    });

    it('8. loop: a 100-man brigade with a dry home pool and an idle pool of 5,000 reaches the line', () => {
        const rear = idleRear(5000);
        const hollow = brigade('rs_ozren', { tags: ['mun:doboj'], personnel: 100, max_personnel: 2000 });
        const state = makeState([rear.f, hollow], { [rear.key]: rear.p, 'doboj:RS': pool('doboj', 'RS', 0) });
        for (let t = 0; t < 40; t++) {
            state.meta.turn = 40 + t;
            const decay = applyPoolWarWearinessDecay(state);
            reinforceFromStrategicReserves(state, undefined, decay.by_pool);
        }
        expect(state.military.formations.rs_ozren.personnel).toBe(lineOf(hollow));
    });

    it('9. with no idle pool the turn is byte-identical to the stage being absent', () => {
        const build = (): GameState => makeState([
            brigade('rs_short', { tags: ['mun:lopare'], personnel: 1999 }),
            brigade('rs_ozren', { tags: ['mun:doboj'], personnel: 100 }),
        ], { 'lopare:RS': pool('lopare', 'RS', 5000), 'doboj:RS': pool('doboj', 'RS', 0) }, { RS: 50 });
        const a = build();
        const b = build();
        const da = applyPoolWarWearinessDecay(a);
        applyPoolWarWearinessDecay(b);
        reinforceFromStrategicReserves(a, undefined, da.by_pool);
        reinforceFromStrategicReserves(b);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('receipt: RBiH and HRHB use the same route under their own thresholds; RBiH over 0.80 places 0', () => {
        const state = makeState([
            brigade('arbih_full', { faction: 'RBiH', tags: ['mun:tuzla'], personnel: 2000 }),
            brigade('arbih_weak', { faction: 'RBiH', tags: ['mun:kalesija'], personnel: 100 }),
        ], {
            'tuzla:RBiH': pool('tuzla', 'RBiH', 1000, 9000),
            'kalesija:RBiH': pool('kalesija', 'RBiH', 0),
        });
        const r = reinforceFromStrategicReserves(state, undefined, { 'tuzla:RBiH': 12 });
        expect(r.idle_replacement_by_faction.RBiH.route_open).toBe(false);
        expect(state.military.formations.arbih_weak.personnel).toBe(100);
    });

    it('IDLE-SNAPSHOT (§48, Codex r4717315272): a pool made idle only by this turn\'s reserve top-up offers nothing', () => {
        // Lopare's only brigade is one man short; the reserve's one man fills it this turn.
        // Idleness is judged before the reserve loop, so Lopare's 80-man loss is not offered.
        const rear = brigade('rs_lopare', { tags: ['mun:lopare'], personnel: 1999, max_personnel: 2000 });
        const hollow = brigade('rs_ozren', { tags: ['mun:doboj'], personnel: 300, max_personnel: 2000 });
        const state = makeState([rear, hollow], {
            'lopare:RS': pool('lopare', 'RS', 5000),
            'doboj:RS': pool('doboj', 'RS', 0),
        }, { RS: 1 });
        const r = reinforceFromStrategicReserves(state, undefined, { 'lopare:RS': 80 });
        expect(state.military.formations.rs_lopare.personnel).toBe(2000);
        expect(state.military.strategic_reserves!.RS).toBe(0);
        expect(state.military.formations.rs_ozren.personnel).toBe(300);
        expect(r.idle_replacement_by_faction.RS?.idle_pools ?? 0).toBe(0);
        expect(r.idle_replacement_by_faction.RS?.placed ?? 0).toBe(0);
    });
});

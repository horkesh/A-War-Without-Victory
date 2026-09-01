/**
 * Durable militia casualty accounting.
 *
 * An OSID with enemy political control and no defending formation is still defended:
 * `computeMilitiaDefensePower()` gives it a garrison derived from population, the resolver
 * fights a real battle against it, and it reports defender casualties. Before this lane
 * those casualties were reported and then dropped — `attack_resolution_osid.ts` writes
 * defender losses only inside `if (defenderFormation)`, so no militia pool was debited and
 * no casualty-ledger row was written. Retained evidence: 42 such battles / 3,844 raw
 * casualties in the 40-week artifact, 66 / 5,979 in the clean 188-week baseline n388.
 *
 * These tests pin the four postconditions that make militia losses durable:
 * provenance, ledger persistence, exact pool debit, and no reuse of spent manpower.
 *
 * Deterministic: fixed turn, no randomness, no wall clock.
 */
import { describe, it, expect } from 'vitest';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import type {
    FactionId,
    FormationState,
    GameState,
    CorpsFrontSector,
    CorpsFrontSubSegment,
    CorpsOperation,
    MilitiaPoolState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import { applyMilitiaWiaTrickleback } from '../src/sim/formation_spawn.js';
import { WIA_TRICKLE_RATE } from '../src/state/formation_constants.js';
import { strictCompare } from '../src/state/validateGameState.js';
import type { FormationCasualties } from '../src/state/casualty_ledger.js';

// ─── Expected contract ──────────────────────────────────────────────────────
// These describe the persistence contract this lane introduces. The fields land
// in the state types in Task 3 (`per_militia_pool`, `wounded_pending`) and in the
// battle record in Task 6 (`defender_kind`, `defender_militia_pool_key`); until
// then these views let the tests state the contract and fail on BEHAVIOUR rather
// than on compilation. The casts are removed once the real fields exist.

type BattleRecord = { defender_casualties: number; defender_brigade: string | null };

interface MilitiaBattleView {
    defender_kind?: 'formation' | 'militia' | 'none';
    defender_militia_pool_key?: string;
}

interface MilitiaLedgerView {
    killed: number;
    wounded: number;
    missing_captured: number;
    per_formation: Record<string, FormationCasualties>;
    per_militia_pool?: Record<string, FormationCasualties>;
}

interface MilitiaPoolView {
    available: number;
    exhausted: number;
    updated_turn: number;
    wounded_pending?: number;
}

const asBattleView = (b: BattleRecord): MilitiaBattleView => b as MilitiaBattleView;
const asLedgerView = (l: unknown): MilitiaLedgerView => l as MilitiaLedgerView;
const asPoolView = (p: MilitiaPoolState): MilitiaPoolView => p as MilitiaPoolView;

// ─── Fixture ────────────────────────────────────────────────────────────────

/** The defended municipality. `munFromOsid` reads segment 1, so this is `gorazde`. */
const TARGET_OSID = 'op:gorazde:gorazde_2';
const SECOND_OSID = 'op:gorazde:vitkovici_2';
const STAGING_OSID = 'op:rs:staging';
const POOL_KEY = militiaPoolKey('gorazde', 'RBiH');

/** Population large enough that the population ceiling is not the binding constraint. */
const TARGET_POPULATION = 40_000;

function makeFormation(
    id: string,
    faction: FactionId,
    kind: 'brigade' | 'corps',
    locationOsid: string,
    overrides: Partial<FormationState> = {}
): FormationState {
    return {
        id, name: id, faction, kind, status: 'active',
        personnel: 5000, cohesion: 80, morale: 80, experience: 0.5,
        location_osid: locationOsid,
        posture: 'attack',
        composition: {
            infantry: 2000,
            tanks: 20,
            artillery: 15,
            aa_systems: 3,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
        ...overrides,
    } as FormationState;
}

function makeSubSegment(
    id: string,
    enemyOsids: string[],
    friendlyOsids: string[],
    edgeIds: string[]
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: edgeIds,
        enemy_osids: enemyOsids,
        friendly_osids: friendlyOsids,
        primary_brigade_ids: [],
        length_edges: edgeIds.length,
    };
}

function makeSector(
    id: string,
    corpsId: string,
    faction: FactionId,
    brigadeIds: string[],
    subSegments: CorpsFrontSubSegment[]
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corpsId as never,
        faction,
        opposing_factions: [],
        edge_ids: subSegments.flatMap(s => s.edge_ids),
        sub_segments: subSegments,
        length_edges: subSegments.reduce((n, s) => n + s.edge_ids.length, 0),
        territory_osids: subSegments.flatMap(s => s.friendly_osids),
        assigned_brigade_ids: brigadeIds as never[],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1.0,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    } as unknown as CorpsFrontSector;
}

function makePool(available: number): MilitiaPoolState {
    return {
        mun_id: 'gorazde',
        faction: 'RBiH' as FactionId,
        available,
        committed: 0,
        exhausted: 0,
        updated_turn: 0,
    };
}

/**
 * A VRS brigade attacks an ARBiH-controlled OSID that has NO defending formation.
 * The municipality has a positive RBiH militia pool, so the defence has a durable
 * manpower source to draw on and to lose from.
 */
function makeMilitiaOnlyScenario(options: {
    poolAvailable?: number;
    targets?: string[];
} = {}) {
    const poolAvailable = options.poolAvailable ?? 4_000;
    const targets = options.targets ?? [TARGET_OSID];

    const rsCorps = makeFormation('vrs_drina', 'RS', 'corps', 'op:rs:hq');
    const attackers = targets.map((target, i) =>
        makeFormation(`brig_rs_${i + 1}`, 'RS', 'brigade', STAGING_OSID, {
            corps_id: 'vrs_drina',
            personnel: 5000,
            cohesion: 80,
            experience: 0.7,
        })
    );

    const operation = {
        name: 'test_militia_op',
        type: 'sector_attack',
        occupies_on_victory: true,
        phase: 'execution',
        started_turn: 3,
        phase_started_turn: 3,
        participating_brigades: attackers.map(a => a.id),
        objectives: [...targets],
        objective_capture_count: 0,
        attack_attempt_count: 0,
        sector_id: 'sector:vrs_drina:0',
        axes: [{
            axis_id: 'test_militia_op_ax0',
            name: 'Main',
            assigned_brigades: attackers.map(a => a.id),
            objectives: [...targets],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }],
    } as unknown as CorpsOperation;

    const sector = makeSector(
        'sector:vrs_drina:0', 'vrs_drina', 'RS',
        attackers.map(a => a.id),
        [makeSubSegment('sub:vrs_drina:0:0', [...targets], [STAGING_OSID],
            targets.map((_, i) => `e${i + 1}`))]
    );

    const formations: Record<string, FormationState> = { vrs_drina: rsCorps };
    for (const a of attackers) formations[a.id] = a;

    const politicalControllers: Record<string, string> = {
        [STAGING_OSID]: 'RS',
        'op:rs:hq': 'RS',
    };
    for (const t of targets) politicalControllers[t] = 'RBiH';

    const state = {
        meta: {
            turn: 5, phase: 'war', seed: 'militia-casualty-test',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        },
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }],
        formations,
        political: {
            political_controllers: politicalControllers,
            control_events: [],
        },
        military: {
            formations,
            corps_command: {
                vrs_drina: {
                    command_span: 3,
                    subordinate_count: attackers.length,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [operation],
                },
            },
            corps_front_sectors: { 'sector:vrs_drina:0': sector },
            brigade_attack_orders: Object.fromEntries(
                attackers.map((a, i) => [a.id, targets[i] ?? targets[0]])
            ),
            militia_pools: { [POOL_KEY]: makePool(poolAvailable) },
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        },
        displacement: {},
    } as unknown as GameState;

    const edges: EdgeRecord[] = targets.map((t, i) =>
        ({ edge_id: `e${i + 1}`, a: STAGING_OSID, b: t } as EdgeRecord));

    const populationMap = new Map<string, number>(
        targets.map(t => [t, TARGET_POPULATION])
    );

    return { state, edges, populationMap, operation };
}

function resolve(fixture: ReturnType<typeof makeMilitiaOnlyScenario>) {
    return resolveAttackOrdersOsid(
        fixture.state,
        fixture.edges,
        new Map<string, string[]>(),
        null,
        null,
        fixture.populationMap,
    );
}

/**
 * Same fixture, but with an ARBiH brigade physically defending the target OSID. Used to
 * prove the militia writer never fires for a battle a formation fought.
 */
function makeFormationDefendedScenario() {
    const fixture = makeMilitiaOnlyScenario();
    const defender = makeFormation('arbih_defender', 'RBiH', 'brigade', TARGET_OSID, {
        personnel: 3000, cohesion: 60, morale: 60, experience: 0.3,
    });
    (fixture.state.military.formations as Record<string, FormationState>)[defender.id] = defender;
    return fixture;
}

function poolOf(state: GameState): MilitiaPoolState {
    const pool = (state.military.militia_pools as Record<string, MilitiaPoolState>)[POOL_KEY];
    if (!pool) throw new Error(`missing militia pool ${POOL_KEY}`);
    return pool;
}


/** Sum a set of casualty rows into one total. */
function sumRows(rows: Record<string, FormationCasualties> | undefined): FormationCasualties {
    return Object.values(rows ?? {}).reduce(
        (acc, r) => ({
            killed: acc.killed + r.killed,
            wounded: acc.wounded + r.wounded,
            missing_captured: acc.missing_captured + r.missing_captured,
        }),
        { killed: 0, wounded: 0, missing_captured: 0 }
    );
}

function totalOf(c: FormationCasualties): number {
    return c.killed + c.wounded + c.missing_captured;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('militia-only battle losses are persisted', () => {
    it('fights a militia defender and reports casualties', () => {
        const fixture = makeMilitiaOnlyScenario();
        const report = resolve(fixture);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;
        expect(battle.defender_brigade).toBeNull();
        expect(battle.defender_casualties).toBeGreaterThan(0);
    });

    it('classifies the defender as militia and names the pool it drew from', () => {
        const fixture = makeMilitiaOnlyScenario();
        const battle = resolve(fixture).battles[0]!;

        expect(asBattleView(battle).defender_kind).toBe('militia');
        expect(asBattleView(battle).defender_militia_pool_key).toBe(POOL_KEY);
    });

    it('writes a per_militia_pool ledger row and never a per_formation row', () => {
        const fixture = makeMilitiaOnlyScenario();
        resolve(fixture);

        const rbih = asLedgerView(fixture.state.military.casualty_ledger!.RBiH);
        expect(rbih.per_militia_pool?.[POOL_KEY]).toBeDefined();
        expect(totalOf(rbih.per_militia_pool![POOL_KEY]!)).toBeGreaterThan(0);

        // A militia pool key must never be laundered into per_formation as a
        // synthetic formation id.
        expect(rbih.per_formation[POOL_KEY]).toBeUndefined();
    });

    it('keeps faction totals equal to per_formation + per_militia_pool', () => {
        const fixture = makeMilitiaOnlyScenario();
        resolve(fixture);

        const ledger = fixture.state.military.casualty_ledger!;
        for (const faction of ['RS', 'RBiH'] as const) {
            const f = asLedgerView(ledger[faction]);
            const formations = sumRows(f.per_formation);
            const militia = sumRows(f.per_militia_pool);
            expect(f.killed).toBe(formations.killed + militia.killed);
            expect(f.wounded).toBe(formations.wounded + militia.wounded);
            expect(f.missing_captured).toBe(formations.missing_captured + militia.missing_captured);
        }
    });

    it('records the casualties exactly once', () => {
        const fixture = makeMilitiaOnlyScenario();
        const battle = resolve(fixture).battles[0]!;

        const rbih = asLedgerView(fixture.state.military.casualty_ledger!.RBiH);
        const recorded = totalOf(sumRows(rbih.per_militia_pool));

        // Realism scaling shrinks the recorded total, so it can never exceed the raw
        // battle total; a double write would push it above.
        expect(recorded).toBeGreaterThan(0);
        expect(recorded).toBeLessThanOrEqual(battle.defender_casualties);
    });

    it('does not create a militia row for a battle fought by a formation', () => {
        const fixture = makeFormationDefendedScenario();
        resolve(fixture);

        const rbih = asLedgerView(fixture.state.military.casualty_ledger!.RBiH);
        expect(sumRows(rbih.per_militia_pool)).toEqual(
            { killed: 0, wounded: 0, missing_captured: 0 });
        expect(totalOf(sumRows(rbih.per_formation))).toBeGreaterThan(0);
    });
});

describe('militia pool demographic accounting', () => {
    it('feeds permanent losses into exhausted and stamps the turn', () => {
        const fixture = makeMilitiaOnlyScenario();
        const before = poolOf(fixture.state).exhausted;
        resolve(fixture);

        const pool = asPoolView(poolOf(fixture.state));
        expect(pool.exhausted).toBeGreaterThan(before);
        expect(pool.updated_turn).toBe(5);
    });

    it('draws from available only as far as available reaches', () => {
        const fixture = makeMilitiaOnlyScenario({ poolAvailable: 4_000 });
        const battle = resolve(fixture).battles[0]!;

        expect(poolOf(fixture.state).available).toBe(4_000 - battle.defender_casualties);
    });

    it('never drives a pool field negative when available is short', () => {
        const fixture = makeMilitiaOnlyScenario({ poolAvailable: 12 });
        resolve(fixture);

        const pool = asPoolView(poolOf(fixture.state));
        expect(pool.available).toBe(0);
        expect(pool.exhausted).toBeGreaterThanOrEqual(0);
        expect(pool.wounded_pending).toBeGreaterThanOrEqual(0);
    });

    it('returns no wounded to a pool it never drew from', () => {
        // 27 of 30 militia battles in a bounded canonical run draw on a pool whose
        // available is 0. Crediting their wounded back to `available` would CREATE
        // manpower, so only the share actually taken from the pool may return to it.
        const fixture = makeMilitiaOnlyScenario({ poolAvailable: 0 });
        resolve(fixture);

        const pool = asPoolView(poolOf(fixture.state));
        expect(pool.available).toBe(0);
        expect(pool.wounded_pending).toBe(0);
    });

    it('still records casualties when the pool contradicts its own key', () => {
        // The pool key is built from the defending faction, so a stored faction that
        // disagrees means the pool is inconsistent with its key. The pool must not be
        // mutated — but returning early would silently DROP the casualties, which is the
        // exact defect this lane exists to fix.
        const fixture = makeMilitiaOnlyScenario({ poolAvailable: 4_000 });
        const pool = poolOf(fixture.state);
        (pool as { faction: string }).faction = 'RS';

        resolve(fixture);

        const rbih = asLedgerView(fixture.state.military.casualty_ledger!.RBiH);
        expect(totalOf(sumRows(rbih.per_militia_pool))).toBeGreaterThan(0);
        // ...and the mismatched pool is left alone.
        expect(pool.available).toBe(4_000);
        expect(pool.exhausted).toBe(0);
    });

    it('records casualties for a municipality that has no pool at all', () => {
        const fixture = makeMilitiaOnlyScenario();
        delete (fixture.state.military.militia_pools as Record<string, unknown>)[POOL_KEY];

        resolve(fixture);

        const rbih = asLedgerView(fixture.state.military.casualty_ledger!.RBiH);
        expect(rbih.per_militia_pool?.[POOL_KEY]).toBeDefined();
        expect(totalOf(sumRows(rbih.per_militia_pool))).toBeGreaterThan(0);
    });

    it('accumulates two OSIDs in one municipality into one pool and one ledger row', () => {
        const fixture = makeMilitiaOnlyScenario({
            poolAvailable: 4_000,
            targets: [TARGET_OSID, SECOND_OSID],
        });
        const report = resolve(fixture);
        expect(report.battles.length).toBe(2);

        const spent = report.battles.reduce((s, b) => s + b.defender_casualties, 0);
        expect(poolOf(fixture.state).available).toBe(4_000 - spent);

        const rbih = asLedgerView(fixture.state.military.casualty_ledger!.RBiH);
        expect(Object.keys(rbih.per_militia_pool ?? {})).toEqual([POOL_KEY]);
    });
});

describe('militia defence magnitude is independent of pool state', () => {
    // The approved architecture deliberately does NOT cap militia defence by
    // `pool.available`. That field is the post-mobilization recruitment residual and is
    // structurally 0 wherever militia-only defence occurs (27 of 30 battles in a bounded
    // canonical run), so capping by it would zero ~90% of militia defence across 50% of
    // opening-war battles — at Kozarac, Foca, Visegrad, Zvornik, Vlasenica, places whose
    // local defence is historically attested. These tests keep that premise out of the
    // engine.
    it('inflicts identical casualties whether the pool is full or empty', () => {
        const full = makeMilitiaOnlyScenario({ poolAvailable: 4_000 });
        const empty = makeMilitiaOnlyScenario({ poolAvailable: 0 });

        const fullBattle = resolve(full).battles[0]!;
        const emptyBattle = resolve(empty).battles[0]!;

        expect(emptyBattle.defender_casualties).toBe(fullBattle.defender_casualties);
        expect(emptyBattle.power_ratio).toBe(fullBattle.power_ratio);
        expect(emptyBattle.outcome).toBe(fullBattle.outcome);
    });

    it('still defends an OSID whose municipality has no pool at all', () => {
        const fixture = makeMilitiaOnlyScenario();
        delete (fixture.state.military.militia_pools as Record<string, unknown>)[POOL_KEY];

        const battle = resolve(fixture).battles[0]!;
        expect(battle.defender_casualties).toBeGreaterThan(0);
    });
});

describe('militia WIA recovery', () => {
    function poolsState(pools: Record<string, Partial<MilitiaPoolState>>): GameState {
        const built: Record<string, MilitiaPoolState> = {};
        for (const [key, p] of Object.entries(pools)) {
            const [mun, faction] = key.split(':');
            built[key] = {
                mun_id: mun!, faction: faction as FactionId,
                available: 0, committed: 0, exhausted: 0, updated_turn: 0,
                ...p,
            } as MilitiaPoolState;
        }
        return {
            meta: { turn: 9, phase: 'war' },
            military: { militia_pools: built },
        } as unknown as GameState;
    }

    function report() {
        return { formations_returned: 0, personnel_returned: 0 };
    }

    it('conserves personnel exactly: available rises by what wounded_pending falls', () => {
        const state = poolsState({ 'gorazde:RBiH': { available: 100, wounded_pending: 30 } });
        applyMilitiaWiaTrickleback(state, report());

        const pool = (state.military.militia_pools as Record<string, MilitiaPoolState>)['gorazde:RBiH']!;
        const view = pool as MilitiaPoolState & { wounded_pending?: number };
        expect(view.wounded_pending).toBe(0);
        expect(pool.available).toBe(130);
    });

    it('never returns more than the rate in one turn', () => {
        const state = poolsState({ 'gorazde:RBiH': { available: 0, wounded_pending: 500 } });
        applyMilitiaWiaTrickleback(state, report());

        const pool = (state.military.militia_pools as Record<string, MilitiaPoolState>)['gorazde:RBiH']!;
        const view = pool as MilitiaPoolState & { wounded_pending?: number };
        expect(pool.available).toBe(WIA_TRICKLE_RATE);
        expect(view.wounded_pending).toBe(500 - WIA_TRICKLE_RATE);
    });

    it('never returns more than is pending and never goes negative', () => {
        const state = poolsState({ 'gorazde:RBiH': { available: 5, wounded_pending: 3 } });
        applyMilitiaWiaTrickleback(state, report());

        const pool = (state.military.militia_pools as Record<string, MilitiaPoolState>)['gorazde:RBiH']!;
        const view = pool as MilitiaPoolState & { wounded_pending?: number };
        expect(pool.available).toBe(8);
        expect(view.wounded_pending).toBe(0);
    });

    it('leaves killed and missing permanently gone', () => {
        const state = poolsState({ 'gorazde:RBiH': { available: 0, exhausted: 400, wounded_pending: 0 } });
        applyMilitiaWiaTrickleback(state, report());

        const pool = (state.military.militia_pools as Record<string, MilitiaPoolState>)['gorazde:RBiH']!;
        expect(pool.available).toBe(0);
        expect(pool.exhausted).toBe(400);
    });

    it('processes pools in stable sorted order and reports the totals', () => {
        const state = poolsState({
            'zvornik:RBiH': { wounded_pending: 10 },
            'bratunac:RBiH': { wounded_pending: 10 },
            'gorazde:RBiH': { wounded_pending: 10 },
        });
        const r = report() as ReturnType<typeof report> & {
            militia_pools_returned?: number; militia_personnel_returned?: number;
        };
        applyMilitiaWiaTrickleback(state, r);

        expect(r.militia_pools_returned).toBe(3);
        expect(r.militia_personnel_returned).toBe(30);

        const pools = state.military.militia_pools as Record<string, MilitiaPoolState>;
        expect(Object.keys(pools).sort(strictCompare))
            .toEqual(['bratunac:RBiH', 'gorazde:RBiH', 'zvornik:RBiH']);
        for (const key of Object.keys(pools)) {
            expect(pools[key]!.available).toBe(10);
        }
    });
});

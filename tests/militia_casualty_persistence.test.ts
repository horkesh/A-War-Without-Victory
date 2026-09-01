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

function poolOf(state: GameState): MilitiaPoolState {
    const pool = (state.military.militia_pools as Record<string, MilitiaPoolState>)[POOL_KEY];
    if (!pool) throw new Error(`missing militia pool ${POOL_KEY}`);
    return pool;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('militia-only battles consume durable manpower', () => {
    it('fights a militia defender and reports casualties (pre-existing behaviour)', () => {
        const fixture = makeMilitiaOnlyScenario();
        const report = resolve(fixture);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;
        expect(battle.defender_brigade).toBeNull();
        expect(battle.defender_casualties).toBeGreaterThan(0);
    });

    it('classifies the defender as militia and names the pool it drew from', () => {
        const fixture = makeMilitiaOnlyScenario();
        const report = resolve(fixture);
        const battle = report.battles[0]!;

        expect(asBattleView(battle).defender_kind).toBe('militia');
        expect(asBattleView(battle).defender_militia_pool_key).toBe(POOL_KEY);
    });

    it('debits the militia pool by exactly the raw casualties reported', () => {
        const fixture = makeMilitiaOnlyScenario();
        const before = poolOf(fixture.state).available;

        const report = resolve(fixture);
        const battle = report.battles[0]!;

        expect(poolOf(fixture.state).available).toBe(before - battle.defender_casualties);
    });

    it('writes a per_militia_pool ledger row and no per_formation row', () => {
        const fixture = makeMilitiaOnlyScenario();
        resolve(fixture);

        const ledger = fixture.state.military.casualty_ledger!;
        const rbih = asLedgerView(ledger.RBiH);

        expect(rbih.per_militia_pool?.[POOL_KEY]).toBeDefined();
        const row = rbih.per_militia_pool![POOL_KEY]!;
        expect(row.killed + row.wounded + row.missing_captured).toBeGreaterThan(0);

        // No synthetic militia identifier may appear among formation casualties.
        for (const id of Object.keys(rbih.per_formation)) {
            expect(id).not.toContain(':');
        }
        expect(rbih.per_formation[POOL_KEY]).toBeUndefined();
    });

    it('keeps faction totals equal to per_formation + per_militia_pool', () => {
        const fixture = makeMilitiaOnlyScenario();
        resolve(fixture);

        const ledger = fixture.state.military.casualty_ledger!;
        for (const faction of ['RS', 'RBiH'] as const) {
            const f = asLedgerView(ledger[faction]);
            const sum = (rows: Record<string, { killed: number; wounded: number; missing_captured: number }>) =>
                Object.values(rows).reduce(
                    (acc, r) => ({
                        killed: acc.killed + r.killed,
                        wounded: acc.wounded + r.wounded,
                        missing_captured: acc.missing_captured + r.missing_captured,
                    }),
                    { killed: 0, wounded: 0, missing_captured: 0 }
                );
            const formations = sum(f.per_formation);
            const militia = sum(f.per_militia_pool ?? {});
            expect(f.killed).toBe(formations.killed + militia.killed);
            expect(f.wounded).toBe(formations.wounded + militia.wounded);
            expect(f.missing_captured).toBe(formations.missing_captured + militia.missing_captured);
        }
    });

    it('tracks militia wounded as pending and permanent losses as exhaustion', () => {
        const fixture = makeMilitiaOnlyScenario();
        resolve(fixture);

        const pool = asPoolView(poolOf(fixture.state));
        expect(pool.wounded_pending).toBeGreaterThan(0);
        expect(pool.exhausted).toBeGreaterThan(0);
        expect(pool.updated_turn).toBe(5);
    });

    it('never spends more manpower than the pool has available', () => {
        const fixture = makeMilitiaOnlyScenario({ poolAvailable: 12 });
        const report = resolve(fixture);
        const battle = report.battles[0]!;

        expect(poolOf(fixture.state).available).toBeGreaterThanOrEqual(0);
        expect(battle.defender_casualties).toBeLessThanOrEqual(12);
    });

    it('gives an exhausted pool no militia defence at all', () => {
        const fixture = makeMilitiaOnlyScenario({ poolAvailable: 0 });
        const report = resolve(fixture);
        const battle = report.battles[0]!;

        expect(poolOf(fixture.state).available).toBe(0);
        expect(battle.defender_casualties).toBe(0);
    });

    it('makes a second OSID in the same municipality observe the first battle\'s debit', () => {
        const fixture = makeMilitiaOnlyScenario({
            poolAvailable: 4_000,
            targets: [TARGET_OSID, SECOND_OSID],
        });
        const before = poolOf(fixture.state).available;
        const report = resolve(fixture);

        expect(report.battles.length).toBe(2);
        const spent = report.battles.reduce((s, b) => s + b.defender_casualties, 0);
        expect(poolOf(fixture.state).available).toBe(before - spent);
        // Two OSIDs share one budget: the second battle cannot draw on manpower the
        // first already lost, so the two battles are not identical.
        expect(report.battles[1]!.defender_casualties)
            .toBeLessThanOrEqual(report.battles[0]!.defender_casualties);
    });
});

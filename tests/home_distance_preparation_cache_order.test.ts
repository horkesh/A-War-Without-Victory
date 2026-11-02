/**
 * RED-first regression proof for the save/load preparation-forecast cache
 * ordering defect (home_distance_cache).
 *
 * Demonstrated native defect: loading the exact canonical turn-127 save drops
 * the transient `military.home_distance_cache` (by contract), then advancing
 * turn 128 produces a preparation `force_ratio_estimate` that differs from the
 * continuous runtime forecast because `compute-home-distance-cache` is ordered
 * AFTER `advance-sector-offensives` in the real war-phase registry. The first
 * forecast consumer therefore reads the backwards-compatible default
 * (getHomeDistanceMultFromCache -> 1.0 when the cache or entry is absent), so
 * far-from-home defenders lose their distance penalty and the forecast moves.
 *
 * This test intentionally uses the real registry order and the real forecast
 * consumer (`advance-sector-offensives` -> tickPreparation -> estimateForceRatio
 * -> computeDefenderPower -> getHomeDistanceMultFromCache). It never mocks the
 * ratio and never copies the cache algorithm: the cache is built by the real
 * `buildHomeDistanceCache`, and the phase steps come from `warPhases`.
 *
 * Expected today: the cache-availability/staleness equality assertions FAIL
 * semantically (numeric forecast divergence), while canonical cache exclusion
 * and deterministic rebuild pass. After a minimal ordering repair (cache phase
 * before preparation consumers) the same assertions pass unchanged.
 */
import { describe, expect, it } from 'vitest';
import type { CorpsOperation, FormationState, GameState } from '../src/state/game_state.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { setSpatialContextCache } from '../src/sim/turn_pipeline_types.js';
import { buildHomeDistanceCache, getHomeDistanceMult } from '../src/sim/combat/home_distance.js';
import { computeSectorCombatRatings } from '../src/sim/combat/sector_combat_rating.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { setForestOsidSet, setUrbanOsidSet } from '../src/sim/combat/combat_math.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ─── Minimally sufficient fixture ───────────────────────────────────────────
// Linear chain. Attackers sit on their own home OSID (free range). Defenders
// sit on the objective, five hops from their home OSID (0.92 multiplier), so
// a missing cache entry (default 1.0) materially changes defender power.

const HOME_OSID = 'op:test:home';
const APPROACH_OSID = 'op:test:approach';
const TARGET_OSID = 'op:test:enemy_target';
const DEEP_CHAIN = ['op:test:deep1', 'op:test:deep2', 'op:test:deep3', 'op:test:deep4', 'op:test:deep5'];
const DEFENDER_HOME_OSID = DEEP_CHAIN[DEEP_CHAIN.length - 1]!;
const CHAIN = [HOME_OSID, APPROACH_OSID, TARGET_OSID, ...DEEP_CHAIN];

const LIGHT_INFANTRY_COMP = {
    infantry: 1500,
    tanks: 0,
    artillery: 0,
    aa_systems: 0,
    tank_condition: { operational: 0, repair: 0, damaged: 0 },
    artillery_condition: { operational: 0, repair: 0, damaged: 0 },
} as unknown as FormationState['composition'];

function buildChainAdjacency(): Map<Osid, Osid[]> {
    const adjacency = new Map<Osid, Osid[]>();
    for (let i = 0; i < CHAIN.length; i++) {
        const neighbors: Osid[] = [];
        if (i > 0) neighbors.push(CHAIN[i - 1] as Osid);
        if (i < CHAIN.length - 1) neighbors.push(CHAIN[i + 1] as Osid);
        adjacency.set(CHAIN[i] as Osid, neighbors);
    }
    return adjacency;
}

interface BrigadeOpts {
    id: string;
    faction: string;
    location_osid: string;
    home_osid: string;
    corps_id: string;
    posture: 'attack' | 'defend' | 'dig_in';
    personnel?: number;
}

function makeBrigade(opts: BrigadeOpts): FormationState {
    return {
        id: opts.id,
        faction: opts.faction,
        kind: 'brigade',
        name: `Brigade ${opts.id}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: opts.personnel ?? 1500,
        location_osid: opts.location_osid,
        home_osid: opts.home_osid,
        corps_id: opts.corps_id,
        equipment_class: 'light_infantry',
        cohesion: 80,
        morale: 70,
        experience: 0.5,
        posture: opts.posture,
        entrenchment_turns: 0,
        composition: LIGHT_INFANTRY_COMP,
    } as unknown as FormationState;
}

interface Fixture {
    state: GameState;
    op: CorpsOperation;
    adjacency: Map<Osid, Osid[]>;
    attackerIds: string[];
    defenderIds: string[];
}

function makeFixture(defenderLocationOsid: string): Fixture {
    const attackerCorps = 'corps_attacker';
    const defenderCorps = 'corps_defender';
    const attackerSectorId = 'sector_attacker';
    const enemySectorId = 'sector_enemy';
    const attackerFaction = 'RBiH';
    const defenderFaction = 'RS';

    const attackers = [
        makeBrigade({ id: 'arbih_a1', faction: attackerFaction, location_osid: HOME_OSID, home_osid: HOME_OSID, corps_id: attackerCorps, posture: 'attack', personnel: 1800 }),
        makeBrigade({ id: 'arbih_a2', faction: attackerFaction, location_osid: HOME_OSID, home_osid: HOME_OSID, corps_id: attackerCorps, posture: 'attack', personnel: 1800 }),
    ];
    const defenders = [
        makeBrigade({ id: 'vrs_def1', faction: defenderFaction, location_osid: defenderLocationOsid, home_osid: DEFENDER_HOME_OSID, corps_id: defenderCorps, posture: 'dig_in', personnel: 1500 }),
    ];

    const state = {
        meta: { turn: 10, phase: 'war' },
        political: { political_controllers: { [HOME_OSID]: attackerFaction, [TARGET_OSID]: defenderFaction } },
        military: {
            formations: {} as Record<string, FormationState>,
            corps_command: {},
            corps_front_sectors: {},
            sector_intel: {},
            named_officers: {},
            named_officer_data: [],
            opsec_sectors: [],
        },
        factions: {},
        displacement: {},
    } as unknown as GameState;

    const formations: Record<string, FormationState> = {};
    for (const a of attackers) formations[a.id] = a;
    for (const d of defenders) formations[d.id] = d;
    // The real phase derives the operation faction from the corps formation.
    formations[attackerCorps] = {
        id: attackerCorps,
        faction: attackerFaction,
        kind: 'corps',
        name: 'Attacker Corps',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 500,
        location_osid: HOME_OSID,
        corps_id: attackerCorps,
        equipment_class: 'light_infantry',
        cohesion: 80,
        morale: 70,
        experience: 0.5,
        posture: 'defend',
    } as unknown as FormationState;
    state.military.formations = formations;

    const op: CorpsOperation = {
        name: 'Cache Ordering Fixture Offensive',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 5,
        phase_started_turn: 9, // one elapsed planning turn; skips opening-readiness bail-out
        participating_brigades: attackers.map(a => a.id),
        sector_id: attackerSectorId,
        objectives: [TARGET_OSID],
        planning_duration: 5,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    } as unknown as CorpsOperation;

    state.military.corps_command = {
        [attackerCorps]: {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive',
            active_operations: [op],
        },
        [defenderCorps]: {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'defensive',
            active_operations: [],
        },
    } as unknown as GameState['military']['corps_command'];

    state.military.corps_front_sectors = {
        [attackerSectorId]: {
            sector_id: attackerSectorId,
            corps_id: attackerCorps,
            faction: attackerFaction,
            opposing_factions: [defenderFaction],
            edge_ids: [],
            sub_segments: [{
                id: 'sub_attacker',
                sub_segment_id: 'sub_attacker',
                edge_ids: [],
                friendly_osids: [HOME_OSID],
                enemy_osids: [TARGET_OSID],
                coverage_length: 1,
                length_edges: 1,
                primary_brigade_ids: attackers.map(a => a.id),
            }],
            length_edges: 1,
            territory_osids: [HOME_OSID],
            assigned_brigade_ids: attackers.map(a => a.id),
            reserve_brigade_ids: [],
            density: 1,
            threat_ratio: 1,
            defensive_power: 1,
            sector_stance: 'active_defense',
            stance_source: 'bot',
        },
        [enemySectorId]: {
            sector_id: enemySectorId,
            corps_id: defenderCorps,
            faction: defenderFaction,
            opposing_factions: [attackerFaction],
            edge_ids: [],
            sub_segments: [{
                id: 'sub_enemy',
                sub_segment_id: 'sub_enemy',
                edge_ids: [],
                friendly_osids: [TARGET_OSID],
                enemy_osids: [HOME_OSID],
                coverage_length: 1,
                length_edges: 1,
                primary_brigade_ids: defenders.map(d => d.id),
            }],
            length_edges: 1,
            territory_osids: [TARGET_OSID],
            assigned_brigade_ids: defenders.map(d => d.id),
            reserve_brigade_ids: [],
            density: 1,
            threat_ratio: 1,
            defensive_power: 1,
            sector_stance: 'defend',
            stance_source: 'bot',
        },
    } as unknown as GameState['military']['corps_front_sectors'];

    state.military.sector_intel = {
        [attackerSectorId]: [{
            enemy_sector_id: enemySectorId,
            enemy_faction: defenderFaction,
            enemy_corps_id: defenderCorps,
            front_edge_count: 3,
            strength_category: 'moderate',
            posture_observed: 'defensive',
            offensive_signs: false,
            confidence: 0.9,
            turns_in_contact: 5,
            visible_brigade_ids: defenders.map(d => d.id),
            last_updated_turn: 8,
        }],
    } as unknown as GameState['military']['sector_intel'];

    return {
        state,
        op,
        adjacency: buildChainAdjacency(),
        attackerIds: attackers.map(a => a.id),
        defenderIds: defenders.map(d => d.id),
    };
}

// ─── Real cache + real registry phase runner ───────────────────────────────

function sortedFormationIds(state: GameState): string[] {
    return Object.keys(state.military.formations ?? {}).sort();
}

/** Real producer, exactly the one used by compute-home-distance-cache. */
function installFreshCache(state: GameState, adjacency: Map<Osid, Osid[]>): Record<string, number> {
    const cache = buildHomeDistanceCache(
        (state.military.formations ?? {}) as unknown as Parameters<typeof buildHomeDistanceCache>[0],
        adjacency,
        sortedFormationIds(state),
    );
    state.military.home_distance_cache = cache;
    return cache;
}

/**
 * Run the real war-phase registry filtered to the cache producer and the
 * preparation consumer, preserving actual registry order. No algorithm copy.
 */
async function runOrderedCacheAndPreparation(
    state: GameState,
    adjacency: Map<Osid, Osid[]>,
): Promise<number> {
    const context = { state, input: {}, report: {} } as unknown as Parameters<typeof setSpatialContextCache>[0];
    // The pre-combat spatial cache is normally attached by
    // compute-spatial-context-pre-combat; here we inject the minimal equivalent
    // adjacency so the real cache phase and real preparation consumer can run.
    setSpatialContextCache(context, { preCombat: { adjacency } as never });

    const steps = warPhases.filter(step =>
        step.name === 'compute-home-distance-cache' || step.name === 'advance-sector-offensives');
    expect(steps.map(step => step.name).sort()).toEqual([
        'advance-sector-offensives',
        'compute-home-distance-cache',
    ]);

    for (const step of steps) {
        await step.run(context);
    }

    const events = (context.report as { preparation_events?: Array<{ force_ratio_estimate?: number }> })
        .preparation_events ?? [];
    expect(events.length).toBeGreaterThan(0);
    const ratio = events[0]?.force_ratio_estimate;
    expect(typeof ratio).toBe('number');
    return ratio as number;
}

/** Canonical persistence projection: exactly what a save/load round trip keeps. */
function canonicalLoadProjection(state: GameState): GameState {
    const payload = serializeGameState(state);
    return JSON.parse(payload) as GameState;
}

// ─── Proof ─────────────────────────────────────────────────────────────────

describe('home_distance_cache ordering at the real preparation forecast consumer', () => {
    it('rebuild is deterministic and the cache phase exists in the real registry', () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());
        const { state, adjacency } = makeFixture(TARGET_OSID);

        const first = buildHomeDistanceCache(
            state.military.formations as never,
            adjacency,
            sortedFormationIds(state),
        );
        const second = buildHomeDistanceCache(
            state.military.formations as never,
            adjacency,
            sortedFormationIds(state),
        );

        expect(second).toEqual(first);
        expect(Object.keys(second)).toEqual(sortedFormationIds(state).filter(id => Object.prototype.hasOwnProperty.call(first, id)));
        // Free-range attackers and five-hop defenders: numeric power effect.
        expect(first['arbih_a1']).toBe(0);
        expect(first['arbih_a2']).toBe(0);
        expect(first['vrs_def1']).toBe(5);
        expect(getHomeDistanceMult(5)).toBe(0.92);
        expect(getHomeDistanceMult(0)).toBe(1.0);
    });

    it('canonical serialization never persists the transient home distance cache', () => {
        const { state, adjacency } = makeFixture(TARGET_OSID);
        installFreshCache(state, adjacency);

        const payload = serializeGameState(state);
        const persisted = JSON.parse(payload) as GameState;
        expect(persisted.military).not.toHaveProperty('home_distance_cache');

        const loaded = canonicalLoadProjection(state);
        expect(loaded.military.home_distance_cache).toBeUndefined();
    });

    it('a loaded save (cache absent) yields the same preparation forecast as continuous runtime', async () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        // Continuous runtime: end-of-turn transient cache already present.
        const continuous = makeFixture(TARGET_OSID);
        installFreshCache(continuous.state, continuous.adjacency);
        const continuousRatio = await runOrderedCacheAndPreparation(continuous.state, continuous.adjacency);

        // Save/load: canonical projection drops the transient cache.
        const loaded = makeFixture(TARGET_OSID);
        installFreshCache(loaded.state, loaded.adjacency);
        const loadedState = canonicalLoadProjection(loaded.state);
        expect(loadedState.military.home_distance_cache).toBeUndefined();
        const loadedRatio = await runOrderedCacheAndPreparation(loadedState, loaded.adjacency);

        // Real consumer observed the missing cache (default 1.0) and produced a
        // different forecast. This is the semantic RED assertion.
        expect(loadedRatio).toBeCloseTo(continuousRatio, 12);
    });

    it('a stale cache from a changed formation location is rebuilt before the forecast consumer', async () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        // Runtime-shaped state: cache built at the previous location (objective,
        // 5 hops), then the defender moved one hop farther (6 hops) by movement.
        const stale = makeFixture(TARGET_OSID);
        installFreshCache(stale.state, stale.adjacency);
        expect(stale.state.military.home_distance_cache!['vrs_def1']).toBe(5);
        const defender = stale.state.military.formations!['vrs_def1']!;
        defender.location_osid = APPROACH_OSID;
        expect(buildHomeDistanceCache(
            stale.state.military.formations as never,
            stale.adjacency,
            sortedFormationIds(stale.state),
        )['vrs_def1']).toBe(6);

        const fresh = makeFixture(APPROACH_OSID);
        installFreshCache(fresh.state, fresh.adjacency);
        const freshRatio = await runOrderedCacheAndPreparation(fresh.state, fresh.adjacency);

        const staleRatio = await runOrderedCacheAndPreparation(stale.state, stale.adjacency);

        // The consumer must see the rebuilt (current-location) distances. Today
        // it reads the previous turn's stale cache because the rebuild is late.
        expect(staleRatio).toBeCloseTo(freshRatio, 12);
    });
});

// ─── Consumer-level refresh proof (ratings, placement, spawn, late phase) ──

async function runWarSteps(
    state: GameState,
    adjacency: Map<Osid, Osid[]>,
    names: string[],
): Promise<Record<string, unknown>> {
    const context = { state, input: {}, report: {} } as unknown as Parameters<typeof setSpatialContextCache>[0];
    setSpatialContextCache(context, { preCombat: { adjacency } as never });
    const steps = warPhases.filter(step => names.includes(step.name));
    expect(steps.map(step => step.name)).toEqual(names);
    for (const step of steps) {
        await step.run(context);
    }
    return context.report as unknown as Record<string, unknown>;
}

interface PreparationEventShape {
    force_ratio_estimate?: number;
}

describe('home_distance_cache refresh at every real consumer', () => {
    it('compute-sector-combat-ratings rebuilds a stale cache before rating defenders', async () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        // Cache was built while the defender stood at the approach (6 hops);
        // movement then brought it onto the objective (5 hops).
        const { state, adjacency } = makeFixture(TARGET_OSID);
        installFreshCache(state, adjacency);
        state.military.formations!['vrs_def1']!.location_osid = APPROACH_OSID;
        installFreshCache(state, adjacency);
        expect(state.military.home_distance_cache!['vrs_def1']).toBe(6);
        state.military.formations!['vrs_def1']!.location_osid = TARGET_OSID;

        const report = await runWarSteps(state, adjacency, ['compute-sector-combat-ratings']);
        expect(state.military.home_distance_cache!['vrs_def1']).toBe(5);

        const ratings = state.military.sector_combat_ratings!;
        const refreshedPower = ratings['sector_enemy']!.defensive_power;

        // Real consumer baseline with the cache genuinely absent: default 1.0.
        const noCache = makeFixture(TARGET_OSID);
        const noCacheReport = computeSectorCombatRatings(noCache.state, null);
        expect(noCacheReport.sectors_rated).toBe(2);
        const missingPower = noCache.state.military.sector_combat_ratings!['sector_enemy']!.defensive_power;

        expect(refreshedPower).toBeLessThan(missingPower);
        expect((report.sector_combat_ratings as { sectors_rated: number }).sectors_rated).toBe(2);
    });

    it('uses the new distance after placement changes between ratings and preparation', async () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        const { state, adjacency } = makeFixture(TARGET_OSID);
        await runWarSteps(state, adjacency, ['compute-sector-combat-ratings']);
        expect(state.military.home_distance_cache!['vrs_def1']).toBe(5);

        // Intervening placement change before the preparation consumer.
        state.military.formations!['vrs_def1']!.location_osid = APPROACH_OSID;
        const report = await runWarSteps(state, adjacency, ['advance-sector-offensives']);
        expect(state.military.home_distance_cache!['vrs_def1']).toBe(6);

        const events = (report.preparation_events as PreparationEventShape[] | undefined) ?? [];
        expect(events.length).toBeGreaterThan(0);
        const placementRatio = events[0]!.force_ratio_estimate;

        const fresh = makeFixture(APPROACH_OSID);
        installFreshCache(fresh.state, fresh.adjacency);
        const freshRatio = await runOrderedCacheAndPreparation(fresh.state, fresh.adjacency);
        expect(placementRatio).toBeCloseTo(freshRatio, 12);
    });

    it('gives a newly spawned active formation an entry before preparation', async () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        const { state, adjacency } = makeFixture(TARGET_OSID);
        await runWarSteps(state, adjacency, ['compute-sector-combat-ratings']);
        expect(Object.prototype.hasOwnProperty.call(state.military.home_distance_cache!, 'arbih_new')).toBe(false);

        // Lifecycle/spawn between the two consumers: active brigade at 1 hop.
        state.military.formations!['arbih_new'] = makeBrigade({
            id: 'arbih_new',
            faction: 'RBiH',
            location_osid: APPROACH_OSID,
            home_osid: HOME_OSID,
            corps_id: 'corps_attacker',
            posture: 'attack',
        });

        const report = await runWarSteps(state, adjacency, ['advance-sector-offensives']);
        expect(state.military.home_distance_cache!['arbih_new']).toBe(1);
        const events = (report.preparation_events as PreparationEventShape[] | undefined) ?? [];
        expect(events.length).toBeGreaterThan(0);
        expect(typeof events[0]!.force_ratio_estimate).toBe('number');
    });

    it('existing late compute-home-distance-cache reflects a subsequent placement', async () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        const { state, adjacency } = makeFixture(TARGET_OSID);
        installFreshCache(state, adjacency);
        expect(state.military.home_distance_cache!['vrs_def1']).toBe(5);
        state.military.formations!['vrs_def1']!.location_osid = APPROACH_OSID;

        await runWarSteps(state, adjacency, ['compute-home-distance-cache']);
        expect(state.military.home_distance_cache!['vrs_def1']).toBe(6);
        expect(state.military.home_distance_cache!['arbih_a1']).toBe(0);
    });

    it('missing, stale and repeated runs are equivalent and deterministically rebuilt', async () => {
        setForestOsidSet(new Set<string>());
        setUrbanOsidSet(new Set<string>());

        const missing = makeFixture(APPROACH_OSID);
        const missingRatioA = await runOrderedCacheAndPreparation(missing.state, missing.adjacency);
        const missingCache = { ...missing.state.military.home_distance_cache! };
        expect(missingCache['vrs_def1']).toBe(6);

        const stale = makeFixture(TARGET_OSID);
        installFreshCache(stale.state, stale.adjacency);
        expect(stale.state.military.home_distance_cache!['vrs_def1']).toBe(5);
        stale.state.military.formations!['vrs_def1']!.location_osid = APPROACH_OSID;
        const staleRatio = await runOrderedCacheAndPreparation(stale.state, stale.adjacency);
        const staleCache = { ...stale.state.military.home_distance_cache! };

        expect(staleCache).toEqual(missingCache);
        expect(staleRatio).toBeCloseTo(missingRatioA, 12);

        // Independent identical fixtures rebuild to the same values.
        const repeat = makeFixture(APPROACH_OSID);
        const repeatRatio = await runOrderedCacheAndPreparation(repeat.state, repeat.adjacency);
        expect(repeatRatio).toBeCloseTo(missingRatioA, 12);
        expect({ ...repeat.state.military.home_distance_cache! }).toEqual(missingCache);

        // The refreshed cache remains transient under canonical persistence.
        const loaded = canonicalLoadProjection(missing.state);
        expect(loaded.military).not.toHaveProperty('home_distance_cache');
    });
});

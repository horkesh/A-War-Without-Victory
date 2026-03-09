/**
 * Phase F: Siege Mobilization tests.
 * Covers Steps 23–27:
 *   Step 23: computeSiegeState + getSiegeRatio
 *   Step 24: runPoolPopulation siege multiplier
 *   Step 25: spawnFormationsFromPools cap lifting
 *   Step 27: displacement-driven TO emergence
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { computeSiegeState, getSiegeRatio, type SiegeRatioByMunFaction } from '../src/sim/early_war/compute_siege_state.js';
import { runPoolPopulation } from '../src/sim/early_war/pool_population.js';
import { spawnFormationsFromPools } from '../src/sim/formation_spawn.js';
import {
    SIEGE_RATIO_FULL,
    SIEGE_RATIO_MOSTLY,
    SIEGE_RATIO_PARTIAL,
    MAX_TO_PER_MUN,
    DISPLACED_FORMATION_THRESHOLD
} from '../src/state/formation_constants.js';
import { CURRENT_SCHEMA_VERSION, type FormationState, type GameState } from '../src/state/game_state.js';
import type { SettlementRecord } from '../src/map/settlements.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFactions() {
    return [
        {
            id: 'RBiH' as const,
            profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
            areasOfResponsibility: [],
            supply_sources: [],
            declared: true,
            declaration_turn: 1
        },
        {
            id: 'RS' as const,
            profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
            areasOfResponsibility: [],
            supply_sources: [],
            declared: true,
            declaration_turn: 1
        },
        {
            id: 'HRHB' as const,
            profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
            areasOfResponsibility: [],
            supply_sources: [],
            declared: false,
            declaration_turn: null
        }
    ];
}

function baseState(overrides: Partial<GameState> = {}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 5,
            seed: 'siege-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
            recruitment_mode: 'bottom_up',
            ...((overrides.meta) ?? {})
        },
        factions: makeFactions(),
        military: { formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {}, war_militia_strength: {} } as any,
        political: { political_controllers: {}, municipalities: {}, war_consolidation_until: {} } as any,
        displacement: {} as any,
        ...overrides
    } as unknown as GameState;
}

// Build a minimal adjacency map for OSIDs
function makeAdjacency(edges: Array<[string, string]>): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const [a, b] of edges) {
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
    }
    return adj;
}

// Build osidToMun map
function makeOsidToMun(pairs: Array<[string, string]>): Map<string, string> {
    const m = new Map<string, string>();
    for (const [osid, mun] of pairs) {
        m.set(osid, mun);
    }
    return m;
}

// Build minimal settlement map for pool_population (cast to Map<string, SettlementRecord>)
function makeSettlements(entries: Array<[string, string]>): Map<string, SettlementRecord> {
    const m = new Map<string, SettlementRecord>();
    for (const [sid, munId] of entries) {
        m.set(sid, { sid, source_id: sid, mun_code: munId, mun: munId, mun1990_id: munId } as SettlementRecord);
    }
    return m;
}

// ---------------------------------------------------------------------------
// Step 23: computeSiegeState tests
// ---------------------------------------------------------------------------

test('computeSiegeState: municipality with all-enemy external neighbors → ratio 1.0', () => {
    // mun_A has 1 OSID; its 4 neighbors all belong to other municipalities, all RS-controlled
    // We query from RBiH perspective
    const state = baseState({
        political: { municipalities: { mun_a: { stability_score: 50 } },
        political_controllers: {
            'op:mun_b:1': 'RS',
            'op:mun_b:2': 'RS',
            'op:mun_c:1': 'RS',
            'op:mun_c:2': 'RS'
        } } as any
    });
    const adjacency = makeAdjacency([
        ['op:mun_a:1', 'op:mun_b:1'],
        ['op:mun_a:1', 'op:mun_b:2'],
        ['op:mun_a:1', 'op:mun_c:1'],
        ['op:mun_a:1', 'op:mun_c:2']
    ]);
    const osidToMun = makeOsidToMun([
        ['op:mun_a:1', 'mun_a'],
        ['op:mun_b:1', 'mun_b'],
        ['op:mun_b:2', 'mun_b'],
        ['op:mun_c:1', 'mun_c'],
        ['op:mun_c:2', 'mun_c']
    ]);
    const result = computeSiegeState(state, adjacency, osidToMun);
    const ratio = getSiegeRatio(result, 'mun_a', 'RBiH');
    assert.strictEqual(ratio, 1.0, 'All external neighbors are RS → ratio should be 1.0 for RBiH');
});

test('computeSiegeState: municipality with no external neighbors → ratio 0.0', () => {
    // mun_a has 2 OSIDs, only connected internally to each other (no cross-mun edges)
    const state = baseState({
        political: { municipalities: { mun_a: { stability_score: 50 } },
        political_controllers: {} } as any
    });
    const adjacency = makeAdjacency([
        ['op:mun_a:1', 'op:mun_a:2']  // both same mun — internal
    ]);
    const osidToMun = makeOsidToMun([
        ['op:mun_a:1', 'mun_a'],
        ['op:mun_a:2', 'mun_a']
    ]);
    const result = computeSiegeState(state, adjacency, osidToMun);
    const ratio = getSiegeRatio(result, 'mun_a', 'RBiH');
    assert.strictEqual(ratio, 0.0, 'No external neighbors → ratio should be 0.0');
});

test('computeSiegeState: mixed neighbors (50% enemy) → ratio ~0.5', () => {
    // mun_a has 2 external neighbors: 1 RS, 1 RBiH-controlled
    const state = baseState({
        political: { municipalities: { mun_a: { stability_score: 50 } },
        political_controllers: {
            'op:mun_b:1': 'RS',
            'op:mun_c:1': 'RBiH'
        } } as any
    });
    const adjacency = makeAdjacency([
        ['op:mun_a:1', 'op:mun_b:1'],
        ['op:mun_a:1', 'op:mun_c:1']
    ]);
    const osidToMun = makeOsidToMun([
        ['op:mun_a:1', 'mun_a'],
        ['op:mun_b:1', 'mun_b'],
        ['op:mun_c:1', 'mun_c']
    ]);
    const result = computeSiegeState(state, adjacency, osidToMun);
    const ratio = getSiegeRatio(result, 'mun_a', 'RBiH');
    // 1 enemy (RS) out of 2 external = 0.5
    assert.strictEqual(ratio, 0.5, 'One enemy, one friendly → ratio should be 0.5');
});

test('computeSiegeState: own-faction neighbors only → ratio 0.0', () => {
    // All external neighbors are RBiH-controlled; querying for RBiH → no enemies
    const state = baseState({
        political: { municipalities: { mun_a: { stability_score: 50 } },
        political_controllers: {
            'op:mun_b:1': 'RBiH',
            'op:mun_b:2': 'RBiH'
        } } as any
    });
    const adjacency = makeAdjacency([
        ['op:mun_a:1', 'op:mun_b:1'],
        ['op:mun_a:1', 'op:mun_b:2']
    ]);
    const osidToMun = makeOsidToMun([
        ['op:mun_a:1', 'mun_a'],
        ['op:mun_b:1', 'mun_b'],
        ['op:mun_b:2', 'mun_b']
    ]);
    const result = computeSiegeState(state, adjacency, osidToMun);
    const ratio = getSiegeRatio(result, 'mun_a', 'RBiH');
    assert.strictEqual(ratio, 0.0, 'All neighbors own-faction → ratio should be 0.0');
});

test('computeSiegeState: uncontrolled neighbors (undefined controller) do not count as enemy', () => {
    // mun_a has 3 external neighbors: 1 RS (enemy for RBiH), 2 uncontrolled
    const state = baseState({
        political: { municipalities: { mun_a: { stability_score: 50 } },
        political_controllers: {
            'op:mun_b:1': 'RS'
            // op:mun_c:1 and op:mun_d:1 deliberately absent → uncontrolled
        } } as any
    });
    const adjacency = makeAdjacency([
        ['op:mun_a:1', 'op:mun_b:1'],
        ['op:mun_a:1', 'op:mun_c:1'],
        ['op:mun_a:1', 'op:mun_d:1']
    ]);
    const osidToMun = makeOsidToMun([
        ['op:mun_a:1', 'mun_a'],
        ['op:mun_b:1', 'mun_b'],
        ['op:mun_c:1', 'mun_c'],
        ['op:mun_d:1', 'mun_d']
    ]);
    const result = computeSiegeState(state, adjacency, osidToMun);
    const ratio = getSiegeRatio(result, 'mun_a', 'RBiH');
    // 1 enemy out of 3 external = 1/3 ≈ 0.333
    assert.ok(
        Math.abs(ratio - 1 / 3) < 0.001,
        `Uncontrolled neighbors must not count as enemy; expected ~0.333 but got ${ratio}`
    );
});

// ---------------------------------------------------------------------------
// Step 23: getSiegeRatio helper
// ---------------------------------------------------------------------------

test('getSiegeRatio: returns 0.0 for missing key', () => {
    const emptyMap: SiegeRatioByMunFaction = new Map();
    assert.strictEqual(getSiegeRatio(emptyMap, 'nonexistent_mun', 'RBiH'), 0.0);
});

// ---------------------------------------------------------------------------
// Step 24: Pool growth siege multiplier
// ---------------------------------------------------------------------------

function makeStateWithStrength(
    munId: string,
    faction: string,
    strength: number
): GameState {
    return baseState({
        political: { municipalities: { [munId]: { stability_score: 50, control: 'consolidated' } } } as any,
        military: { war_militia_strength: { [munId]: { [faction]: strength } }, militia_pools: {} } as any
    });
}

test('Pool growth: fully surrounded municipality gets 3.0× multiplier', () => {
    const munId = 'mun_siege';
    const faction = 'RBiH';
    const strength = 50;

    // Without siege
    const stateNoSiege = makeStateWithStrength(munId, faction, strength);
    const settlementsNoSiege = makeSettlements([['S001', munId]]);
    runPoolPopulation(stateNoSiege, settlementsNoSiege);
    const baseAvailable = (stateNoSiege.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    // With full siege ratio
    const stateFullSiege = makeStateWithStrength(munId, faction, strength);
    const settingsFullSiege = makeSettlements([['S001', munId]]);
    const fullSiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, SIEGE_RATIO_FULL]
    ]);
    runPoolPopulation(stateFullSiege, settingsFullSiege, undefined, fullSiegeMap);
    const siegeAvailable = (stateFullSiege.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    assert.ok(baseAvailable > 0, 'Base pool should be positive');
    assert.strictEqual(siegeAvailable, baseAvailable * 3, `Full siege should give 3× pool growth (got ${siegeAvailable}, expected ${baseAvailable * 3})`);
});

test('Pool growth: partially surrounded gets 1.5× multiplier', () => {
    const munId = 'mun_partial';
    const faction = 'RBiH';
    const strength = 50;

    const stateNoSiege = makeStateWithStrength(munId, faction, strength);
    const settlementsNoSiege = makeSettlements([['S001', munId]]);
    runPoolPopulation(stateNoSiege, settlementsNoSiege);
    const baseAvailable = (stateNoSiege.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    const statePartialSiege = makeStateWithStrength(munId, faction, strength);
    const partialSiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, SIEGE_RATIO_PARTIAL]  // exactly 0.50
    ]);
    runPoolPopulation(statePartialSiege, makeSettlements([['S001', munId]]), undefined, partialSiegeMap);
    const partialAvailable = (statePartialSiege.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    assert.ok(baseAvailable > 0, 'Base pool should be positive');
    assert.strictEqual(partialAvailable, Math.floor(baseAvailable * 1.5), `Partial siege should give 1.5× pool growth (got ${partialAvailable}, expected ${Math.floor(baseAvailable * 1.5)})`);
});

test('Pool growth: unsurrounded municipality gets 1.0× (no change)', () => {
    const munId = 'mun_unsurrounded';
    const faction = 'RBiH';
    const strength = 50;

    const stateNoSiege = makeStateWithStrength(munId, faction, strength);
    runPoolPopulation(stateNoSiege, makeSettlements([['S001', munId]]));
    const baseAvailable = (stateNoSiege.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    const stateWithZeroRatio = makeStateWithStrength(munId, faction, strength);
    const zeroSiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, 0.0]  // not besieged
    ]);
    runPoolPopulation(stateWithZeroRatio, makeSettlements([['S001', munId]]), undefined, zeroSiegeMap);
    const zeroSiegeAvailable = (stateWithZeroRatio.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    assert.strictEqual(zeroSiegeAvailable, baseAvailable, 'No siege → pool should be identical to no-siege path');
});

// ---------------------------------------------------------------------------
// Step 25: Cap lifting
// ---------------------------------------------------------------------------

function makeStateWithMilitiaFormations(
    munId: string,
    faction: string,
    count: number
): GameState {
    const formations: Record<string, FormationState> = {};
    for (let i = 0; i < count; i++) {
        const id = `F_${faction}_${String(i + 1).padStart(4, '0')}`;
        formations[id] = {
            id,
            faction,
            name: `TO ${munId} ${i + 1}`,
            created_turn: 1,
            status: 'active',
            assignment: null,
            kind: 'militia',
            personnel: 100,
            readiness: 'forming',
            cohesion: 30,
            tags: [`generated_phase_i0`, `kind:militia`, `mun:${munId}`]
        } as FormationState;
    }
    return baseState({
        political: { municipalities: { [munId]: { stability_score: 50, control: 'consolidated' } } } as any,
        military: { formations,
        militia_pools: {
            [`${munId}:${faction}`]: {
                mun_id: munId,
                faction,
                available: 5000,  // plenty of manpower
                committed: 0,
                exhausted: 0,
                updated_turn: 1
            }
        } } as any
    });
}

test('Cap lifting: siege_ratio >= SIEGE_RATIO_MOSTLY → max TO cap is 3× normal', () => {
    const munId = 'mun_mostly_besieged';
    const faction = 'RBiH';
    // Put exactly MAX_TO_PER_MUN formations in the mun (normal cap would block spawn)
    const state = makeStateWithMilitiaFormations(munId, faction, MAX_TO_PER_MUN);

    // Verify normal cap blocks spawn
    const reportNoCap = spawnFormationsFromPools(state, {
        factionFilter: null,
        munFilter: munId,
        maxPerMun: null,
        customTags: [],
        applyChanges: false,
        formationKind: 'militia'
    });
    assert.strictEqual(reportNoCap.formations_created, 0, 'Normal cap should block spawn at MAX_TO_PER_MUN');

    // Now with mostly-surrounded siege ratio — cap should be lifted 3×
    const mostlySiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, SIEGE_RATIO_MOSTLY]
    ]);
    const reportWithSiege = spawnFormationsFromPools(state, {
        factionFilter: null,
        munFilter: munId,
        maxPerMun: null,
        customTags: [],
        applyChanges: false,
        formationKind: 'militia'
    }, mostlySiegeMap);
    assert.ok(reportWithSiege.formations_created > 0, 'Lifted siege cap should allow spawn when at normal MAX_TO_PER_MUN');
});

test('Cap lifting: unsurrounded municipality → normal cap applies', () => {
    const munId = 'mun_unsurrounded_cap';
    const faction = 'RBiH';
    // Put MAX_TO_PER_MUN formations — at normal cap
    const state = makeStateWithMilitiaFormations(munId, faction, MAX_TO_PER_MUN);

    const zeroSiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, 0.0]
    ]);
    const report = spawnFormationsFromPools(state, {
        factionFilter: null,
        munFilter: munId,
        maxPerMun: null,
        customTags: [],
        applyChanges: false,
        formationKind: 'militia'
    }, zeroSiegeMap);
    assert.strictEqual(report.formations_created, 0, 'No siege → normal cap blocks spawn at MAX_TO_PER_MUN');
});

// ---------------------------------------------------------------------------
// Step 27: Displacement-driven TO emergence
// ---------------------------------------------------------------------------

test('Displacement spawn: dispIn >= DISPLACED_FORMATION_THRESHOLD + siege_ratio >= SIEGE_RATIO_PARTIAL → extra detachment spawned', () => {
    const munId = 'mun_besieged_displaced';
    const faction = 'RBiH';

    // No existing formations (below normal cap), pool has just enough
    const state = baseState({
        political: { municipalities: { [munId]: { stability_score: 50, control: 'consolidated' } } } as any,
        military: { formations: {},
        militia_pools: {
            [`${munId}:${faction}`]: {
                mun_id: munId,
                faction,
                available: 5000,
                committed: 0,
                exhausted: 0,
                updated_turn: 1
            }
        } } as any,
        displacement: { displacement_state: {
            [munId]: {
                mun_id: munId,
                original_population: 50000,
                displaced_out: 0,
                displaced_in: DISPLACED_FORMATION_THRESHOLD + 1000,
                displaced_in_by_faction: {
                    RBiH: DISPLACED_FORMATION_THRESHOLD + 1000  // enough displaced
                },
                lost_population: 0,
                last_updated_turn: 4
            }
        } } as any
    });

    // Siege ratio at partial threshold
    const partialSiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, SIEGE_RATIO_PARTIAL]  // exactly 0.50 — qualifies
    ]);

    const report = spawnFormationsFromPools(state, {
        factionFilter: null,
        munFilter: munId,
        maxPerMun: null,
        customTags: [],
        applyChanges: true,
        formationKind: 'militia'
    }, partialSiegeMap);

    // Should get at least 2 formations: one from normal pool-threshold spawn + one displaced-origin
    // (pool available 5000 > MIN_DETACHMENT_SPAWN → normal spawn triggers, then displaced spawn too)
    assert.ok(
        report.formations_created >= 2,
        `Expected at least 2 formations (normal + displaced-origin), got ${report.formations_created}`
    );

    // Check that at least one formation has the displaced_origin tag
    const displacedOriginFormations = report.created.filter(f => {
        const formation = state.military.formations?.[f.formation_id];
        if (!formation || typeof formation !== 'object') return false;
        const tags = (formation as { tags?: string[] }).tags;
        return Array.isArray(tags) && tags.includes('displaced_origin');
    });
    assert.ok(
        displacedOriginFormations.length >= 1,
        `Expected at least one formation with 'displaced_origin' tag, got ${displacedOriginFormations.length}`
    );
});

test('Displacement spawn: dispIn below threshold → no extra detachment', () => {
    const munId = 'mun_low_displaced';
    const faction = 'RBiH';

    const state = baseState({
        political: { municipalities: { [munId]: { stability_score: 50, control: 'consolidated' } } } as any,
        military: { formations: {},
        militia_pools: {
            [`${munId}:${faction}`]: {
                mun_id: munId,
                faction,
                available: 5000,
                committed: 0,
                exhausted: 0,
                updated_turn: 1
            }
        } } as any,
        displacement: { displacement_state: {
            [munId]: {
                mun_id: munId,
                original_population: 50000,
                displaced_out: 0,
                displaced_in: DISPLACED_FORMATION_THRESHOLD - 1,  // just below threshold
                displaced_in_by_faction: {
                    RBiH: DISPLACED_FORMATION_THRESHOLD - 1
                },
                lost_population: 0,
                last_updated_turn: 4
            }
        } } as any
    });

    const partialSiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, SIEGE_RATIO_PARTIAL]
    ]);

    const report = spawnFormationsFromPools(state, {
        factionFilter: null,
        munFilter: munId,
        maxPerMun: null,
        customTags: [],
        applyChanges: true,
        formationKind: 'militia'
    }, partialSiegeMap);

    // Normal spawn may produce 1, but displaced-origin should NOT appear
    const displacedOriginFormations = report.created.filter(f => {
        const formation = state.military.formations?.[f.formation_id];
        if (!formation || typeof formation !== 'object') return false;
        const tags = (formation as { tags?: string[] }).tags;
        return Array.isArray(tags) && tags.includes('displaced_origin');
    });
    assert.strictEqual(displacedOriginFormations.length, 0, 'Below displacement threshold → no displaced_origin detachment');
});

test('Displacement spawn: siege_ratio below SIEGE_RATIO_PARTIAL → no extra detachment', () => {
    const munId = 'mun_no_siege_displaced';
    const faction = 'RBiH';

    const state = baseState({
        political: { municipalities: { [munId]: { stability_score: 50, control: 'consolidated' } } } as any,
        military: { formations: {},
        militia_pools: {
            [`${munId}:${faction}`]: {
                mun_id: munId,
                faction,
                available: 5000,
                committed: 0,
                exhausted: 0,
                updated_turn: 1
            }
        } } as any,
        displacement: { displacement_state: {
            [munId]: {
                mun_id: munId,
                original_population: 50000,
                displaced_out: 0,
                displaced_in: DISPLACED_FORMATION_THRESHOLD + 1000,
                displaced_in_by_faction: {
                    RBiH: DISPLACED_FORMATION_THRESHOLD + 1000
                },
                lost_population: 0,
                last_updated_turn: 4
            }
        } } as any
    });

    // Siege ratio BELOW partial threshold
    const lowSiegeMap: SiegeRatioByMunFaction = new Map([
        [`${munId}:${faction}`, SIEGE_RATIO_PARTIAL - 0.1]  // 0.40 — below threshold
    ]);

    const report = spawnFormationsFromPools(state, {
        factionFilter: null,
        munFilter: munId,
        maxPerMun: null,
        customTags: [],
        applyChanges: true,
        formationKind: 'militia'
    }, lowSiegeMap);

    const displacedOriginFormations = report.created.filter(f => {
        const formation = state.military.formations?.[f.formation_id];
        if (!formation || typeof formation !== 'object') return false;
        const tags = (formation as { tags?: string[] }).tags;
        return Array.isArray(tags) && tags.includes('displaced_origin');
    });
    assert.strictEqual(displacedOriginFormations.length, 0, 'Siege ratio below SIEGE_RATIO_PARTIAL → no displaced_origin detachment');
});

// ---------------------------------------------------------------------------
// Additional: backward-compat — runPoolPopulation without siege param unchanged
// ---------------------------------------------------------------------------

test('runPoolPopulation: backward-compatible — omitting siegeRatios param gives same result as explicit empty map', () => {
    const munId = 'mun_compat';
    const faction = 'RBiH';
    const strength = 50;

    const stateA = makeStateWithStrength(munId, faction, strength);
    runPoolPopulation(stateA, makeSettlements([['S001', munId]]));
    const availableA = (stateA.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    const stateB = makeStateWithStrength(munId, faction, strength);
    runPoolPopulation(stateB, makeSettlements([['S001', munId]]), undefined, new Map());
    const availableB = (stateB.military.militia_pools as Record<string, { available: number }>)[`${munId}:${faction}`]?.available ?? 0;

    assert.strictEqual(availableA, availableB, 'Omitting siegeRatios param should behave identically to explicit empty map');
});

// ---------------------------------------------------------------------------
// Additional: determinism check
// ---------------------------------------------------------------------------

test('computeSiegeState: output is deterministic for same input', () => {
    const state = baseState({
        political: { municipalities: { mun_x: { stability_score: 50 }, mun_y: { stability_score: 50 } },
        political_controllers: {
            'op:mun_b:1': 'RS',
            'op:mun_c:1': 'RBiH'
        } } as any
    });
    const adjacency = makeAdjacency([
        ['op:mun_x:1', 'op:mun_b:1'],
        ['op:mun_x:1', 'op:mun_c:1'],
        ['op:mun_y:1', 'op:mun_b:1']
    ]);
    const osidToMun = makeOsidToMun([
        ['op:mun_x:1', 'mun_x'],
        ['op:mun_y:1', 'mun_y'],
        ['op:mun_b:1', 'mun_b'],
        ['op:mun_c:1', 'mun_c']
    ]);
    const result1 = computeSiegeState(state, adjacency, osidToMun);
    const result2 = computeSiegeState(state, adjacency, osidToMun);

    for (const key of result1.keys()) {
        assert.strictEqual(result1.get(key), result2.get(key), `Key ${key}: results must be deterministic`);
    }
    assert.strictEqual(result1.size, result2.size, 'Map sizes must be deterministic');
});

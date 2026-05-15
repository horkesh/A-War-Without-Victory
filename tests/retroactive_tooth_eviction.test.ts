/**
 * Tests for the "retroactive tooth eviction guard" in evaluateSectorMarch.
 *
 * A brigade can arrive at a sub-segment that was multi-OSID at the time
 * (safe), but the enemy then captures adjacent OSIDs, leaving it as a sole-OSID
 * sub-segment retroactively. The brigade is then stuck on the tooth with no
 * automatic eviction — this guard detects and resolves that.
 *
 * Conditions that trigger eviction (else-branch — brigade already on sector front):
 *   1. Brigade's sub-segment has exactly one friendly_osid (the tooth).
 *   2. That OSID is flagged risky by isMovementDestinationRisky (≥3 enemy OR ≤1 friendly).
 *   3. No column march already in flight (brigade_movement_orders[brigade.id] is falsy).
 *   4. The OSID is NOT in must_hold_osids_by_corps for this brigade's corps.
 *   5. The brigade is not disrupted (disrupted_turns == 0).
 *
 * When all conditions are met and a safe destination exists: column_march_orders
 * is set and the function returns true.
 * When any condition is unmet or no safe destination exists: no march is issued.
 */

import { describe, it, expect } from 'vitest';
import { evaluateSectorMarch, isCurrentSectorRetroactiveTooth } from '../src/sim/combat/bot_brigade_eval_front.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { FactionGraphAnalysis, OsidAnalysis } from '../src/sim/combat/osid_graph_analysis.js';
import type { GameState, FactionId, FormationState, CorpsFrontSector } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FACTION: FactionId = 'RS';
const CORPS_ID = 'vrs_eviction_test_corps';

// OSIDs used across tests:
//   TOOTH_OSID  — the retroactive tooth (sole OSID in sub-segment, brigade is here)
//   SAFE_OSID   — a safe front OSID in a different sub-segment of the same corps
//   TOOTH_OSID sorts AFTER SAFE_OSID so BFS finds SAFE first (alphabetical order matters).
const TOOTH_OSID = 'op:zvornik:tooth_2' as Osid;
const SAFE_OSID  = 'op:zvornik:safe_1' as Osid;

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeBrigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'brig_evict_test',
        name: 'Eviction Test Brigade',
        faction: FACTION,
        kind: 'brigade',
        status: 'active',
        personnel: 800,
        cohesion: 60,
        morale: 60,
        experience: 0.3,
        corps_id: CORPS_ID,
        location_osid: TOOTH_OSID,
        home_osid: TOOTH_OSID,
        disrupted_turns: 0,
        ...overrides,
    } as FormationState;
}

function makeSubSegment(
    id: string,
    friendlyOsids: string[],
    enemyOsids: string[] = ['op:rbih:enemy_1']
): CorpsFrontSector['sub_segments'][number] {
    return {
        sub_segment_id: id,
        edge_ids: ['e1'],
        enemy_osids: enemyOsids,
        friendly_osids: friendlyOsids,
        primary_brigade_ids: [],
        length_edges: 1,
    };
}

function makeSector(
    sectorIdx: number,
    subSegments: CorpsFrontSector['sub_segments'],
    assignedBrigadeIds: string[] = []
): CorpsFrontSector {
    return {
        sector_id: `sector:${CORPS_ID}:${sectorIdx}`,
        corps_id: CORPS_ID as any,
        faction: FACTION,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: ['e1'],
        sub_segments: subSegments,
        length_edges: 1,
        territory_osids: subSegments.flatMap(ss => ss.friendly_osids),
        assigned_brigade_ids: assignedBrigadeIds as any[],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1.0,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeOsidAnalysis(
    osid: Osid,
    enemyNeighbors: Osid[],
    friendlyNeighbors: Osid[]
): OsidAnalysis {
    return {
        osid,
        controller: FACTION,
        enemy_neighbors: enemyNeighbors,
        friendly_neighbors: friendlyNeighbors,
        brigade_id: null,
        brigade_power: 0,
        enemy_threat: 0,
        classification: 'active',
        civilian_weight: 3000,
        is_chokepoint: false,
        advance_enemy_adjacency: enemyNeighbors.length,
    };
}

function makeGraphAnalysis(entries: Array<[Osid, OsidAnalysis]>): FactionGraphAnalysis {
    return {
        faction: FACTION,
        osid_analysis: new Map(entries),
        front_osids: entries.map(([osid]) => osid),
        chokepoints: [],
        salients: [],
        undefended_front: [],
        weak_enemy_osids: [],
        enemy_pockets: [],
    };
}

/**
 * Build a minimal GameState for eviction guard tests.
 *
 * The brigade is at `brigadeLoc`. The `sectors` map is used as corps_front_sectors.
 * `politicalControllers` controls BFS traversal (only friendly-controlled OSIDs can be traversed).
 */
function makeState(
    brigadeId: string,
    brigadeLoc: string,
    sectors: Record<string, CorpsFrontSector>,
    politicalControllers: Record<string, FactionId> = {},
    extraMilitary: Record<string, unknown> = {}
): GameState {
    const brigade = makeBrigade({ id: brigadeId, location_osid: brigadeLoc });

    return {
        meta: {
            turn: 10,
            phase: 'war',
            seed: 'eviction_test',
            scenario_start_date: { year: 1993, month: 1, day: 1 },
        } as unknown as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
        ] as GameState['factions'],
        military: {
            formations: {
                [brigadeId]: brigade,
            },
            corps_front_sectors: sectors,
            brigade_movement_orders: {},
            must_hold_osids_by_corps: {},
            ...extraMilitary,
        } as unknown as GameState['military'],
        political: {
            political_controllers: {
                [TOOTH_OSID]: FACTION,
                [SAFE_OSID]: FACTION,
                ...politicalControllers,
            },
        } as unknown as GameState['political'],
    } as unknown as GameState;
}

/**
 * Build a minimal BrigadeEvaluationContext for the eviction guard.
 *
 * The brigade is AT `tooth` (the sole OSID in its sub-segment).
 * `safe` is in a second sub-segment of the same corps sector (or a separate sector).
 */
function makeEvictionCtx(overrides: {
    brigadeId?: string;
    tooth?: Osid;
    safe?: Osid;
    toothAnalysis?: OsidAnalysis;
    safeAnalysis?: OsidAnalysis;
    graphAnalysis?: FactionGraphAnalysis;
    state?: GameState;
    adjacency?: Map<Osid, Osid[]>;
    brigadeOverrides?: Partial<FormationState>;
} = {}): BrigadeEvaluationContext {
    const brigadeId = overrides.brigadeId ?? 'brig_evict_test';
    const tooth = overrides.tooth ?? TOOTH_OSID;
    const safe  = overrides.safe  ?? SAFE_OSID;

    // Default risky analysis: 4 enemy neighbors, 0 friendly (triggers eviction)
    const toothAnalysis = overrides.toothAnalysis ?? makeOsidAnalysis(
        tooth,
        ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3', 'op:rbih:e4'] as Osid[],
        [] as Osid[]
    );
    // Default safe analysis: 1 enemy, 3 friendly (not risky)
    const safeAnalysis = overrides.safeAnalysis ?? makeOsidAnalysis(
        safe,
        ['op:rbih:e1'] as Osid[],
        ['op:rs:f1', 'op:rs:f2', 'op:rs:f3'] as Osid[]
    );
    const graphAnalysis = overrides.graphAnalysis ?? makeGraphAnalysis([
        [tooth, toothAnalysis],
        [safe, safeAnalysis],
    ]);

    // Default adjacency: tooth ↔ safe (direct neighbors, both friendly-controlled)
    const adjacency = overrides.adjacency ?? (() => {
        const adj = new Map<Osid, Osid[]>();
        adj.set(tooth, [safe]);
        adj.set(safe, [tooth]);
        return adj;
    })();

    // Sector 0: brigade assigned here, sub-segment has tooth as sole OSID (the tooth)
    // Sector 1: same corps, sub-segment has safe (a normal 1-OSID sub-segment that is not risky)
    const toothSubSeg = makeSubSegment(`subseg:${CORPS_ID}:0`, [tooth]);
    const safeSubSeg  = makeSubSegment(`subseg:${CORPS_ID}:1`, [safe]);

    const sectors: Record<string, CorpsFrontSector> = {
        [`sector:${CORPS_ID}:0`]: makeSector(0, [toothSubSeg], [brigadeId]),
        [`sector:${CORPS_ID}:1`]: makeSector(1, [safeSubSeg], []),
    };

    const state = overrides.state ?? makeState(brigadeId, tooth, sectors, {
        [tooth]: FACTION,
        [safe]: FACTION,
    });

    const brigade = makeBrigade({ id: brigadeId, location_osid: tooth, ...overrides.brigadeOverrides });

    const result = {
        column_march_orders: {} as Record<string, Osid>,
        movement_orders: {} as Record<string, Osid>,
        posture_orders: [] as Array<{ brigade_id: string; posture: string }>,
    };

    return {
        brigade,
        state,
        faction: FACTION,
        loc: tooth,
        corpsId: CORPS_ID,
        cmd: null,
        directive: null,
        corpsStance: 'defend',
        activeOp: null,
        isActiveSectorOperationParticipant: false,
        adjEnemy: [],
        isAlliedWithRBiH: false,
        targetAdjacentCount: new Map(),
        corpsReserve: new Map(),
        chosenTargets: new Map(),
        columnAssignments: new Map(),
        counterAttackTarget: null,
        brigadeSupplyState: 'adequate',
        isHoldBrigade: false,
        sectorRecentRetreats: new Map(),
        sectorCounterAttackCount: new Map(),
        adjacency,
        reverseMap: new Map(),
        terrainCache: {},
        graphAnalysis,
        supplyStateByOsid: null,
        ethnicMap: undefined,
        osidPopulationMap: undefined,
        result,
    } as unknown as BrigadeEvaluationContext;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('evaluateSectorMarch — retroactive tooth eviction guard', () => {
    it('detects a retroactive tooth from the already-resolved sector', () => {
        const toothSubSeg = makeSubSegment(`subseg:${CORPS_ID}:0`, [TOOTH_OSID]);
        const multiSubSeg = makeSubSegment(`subseg:${CORPS_ID}:1`, [
            SAFE_OSID,
            'op:zvornik:support_1' as Osid,
        ]);
        const sector = makeSector(0, [toothSubSeg, multiSubSeg], ['brig_evict_test']);

        expect(isCurrentSectorRetroactiveTooth(sector, TOOTH_OSID)).toBe(true);
        expect(isCurrentSectorRetroactiveTooth(sector, SAFE_OSID)).toBe(false);
        expect(isCurrentSectorRetroactiveTooth(sector, 'op:zvornik:missing_1' as Osid)).toBe(false);
    });

    it('Test 1: eviction fires for retroactive tooth with 4 enemy neighbors → march to safe front OSID', () => {
        // Brigade is already AT the tooth (sole OSID in its sub-segment).
        // 4 enemy neighbors, 0 friendly → isMovementDestinationRisky = true.
        // No pendingMove, not disrupted, not must_hold.
        // Safe OSID in same corps, directly adjacent.
        // Expected: eviction fires, column_march_orders set to safe, returns true.

        const ctx = makeEvictionCtx();
        const returned = evaluateSectorMarch(ctx);

        expect(returned).toBe(true);
        expect(ctx.result.column_march_orders['brig_evict_test']).toBe(SAFE_OSID);
    });

    it('Test 2: must_hold override suppresses eviction — brigade stays at tooth', () => {
        // Same topology as Test 1 but tooth is in must_hold_osids_by_corps for the corps.
        // Guard condition 4 fails → no eviction.

        const toothSubSeg = makeSubSegment(`subseg:${CORPS_ID}:0`, [TOOTH_OSID]);
        const safeSubSeg  = makeSubSegment(`subseg:${CORPS_ID}:1`, [SAFE_OSID]);
        const sectors: Record<string, CorpsFrontSector> = {
            [`sector:${CORPS_ID}:0`]: makeSector(0, [toothSubSeg], ['brig_evict_test']),
            [`sector:${CORPS_ID}:1`]: makeSector(1, [safeSubSeg], []),
        };

        const state = makeState('brig_evict_test', TOOTH_OSID, sectors, {
            [TOOTH_OSID]: FACTION,
            [SAFE_OSID]: FACTION,
        }, {
            // Tooth is must_hold for this corps
            must_hold_osids_by_corps: {
                [CORPS_ID]: [TOOTH_OSID],
            },
        });

        const ctx = makeEvictionCtx({ state });
        const returned = evaluateSectorMarch(ctx);

        // Eviction suppressed by must_hold
        expect(ctx.result.column_march_orders['brig_evict_test']).toBeUndefined();
        // Function does not return true from the eviction guard
        // (may return true or false from other evaluations, but no march order)
        expect(ctx.result.column_march_orders).not.toHaveProperty('brig_evict_test');
    });

    it('Test 3: brigade already marching — eviction suppressed (pendingMove in flight)', () => {
        // Same topology as Test 1 but brigade_movement_orders is set — march already in flight.
        // Guard condition 3 fails → no eviction.

        const toothSubSeg = makeSubSegment(`subseg:${CORPS_ID}:0`, [TOOTH_OSID]);
        const safeSubSeg  = makeSubSegment(`subseg:${CORPS_ID}:1`, [SAFE_OSID]);
        const sectors: Record<string, CorpsFrontSector> = {
            [`sector:${CORPS_ID}:0`]: makeSector(0, [toothSubSeg], ['brig_evict_test']),
            [`sector:${CORPS_ID}:1`]: makeSector(1, [safeSubSeg], []),
        };

        const state = makeState('brig_evict_test', TOOTH_OSID, sectors, {
            [TOOTH_OSID]: FACTION,
            [SAFE_OSID]: FACTION,
        }, {
            // Brigade has a pending movement order already in flight
            brigade_movement_orders: {
                'brig_evict_test': {
                    destination_sids: ['op:rs:some_destination'],
                },
            },
        });

        const ctx = makeEvictionCtx({ state });
        evaluateSectorMarch(ctx);

        // Pending march prevents eviction from issuing a new column march
        expect(ctx.result.column_march_orders['brig_evict_test']).toBeUndefined();
    });

    it('Test 4: multi-OSID sub-segment — eviction does NOT fire even with risky neighbors', () => {
        // Brigade is at tooth_osid but its sub-segment has 2 OSIDs: [tooth, other].
        // isRetroactiveTooth = false → guard skips entirely.
        // Brigade is already on sector front, but sub-segment is not a sole-OSID tooth.

        const TOOTH_OSID_T4 = 'op:zvornik:tooth_2' as Osid;
        const OTHER_OSID_T4 = 'op:zvornik:other_3' as Osid;
        const SAFE_OSID_T4  = 'op:zvornik:safe_1' as Osid;

        // Sub-segment has 2 OSIDs → not a retroactive tooth
        const multiSubSeg = makeSubSegment(
            `subseg:${CORPS_ID}:0`,
            [TOOTH_OSID_T4, OTHER_OSID_T4]  // 2 OSIDs — not a tooth
        );
        const safeSubSeg = makeSubSegment(`subseg:${CORPS_ID}:1`, [SAFE_OSID_T4]);

        const sectors: Record<string, CorpsFrontSector> = {
            [`sector:${CORPS_ID}:0`]: makeSector(0, [multiSubSeg], ['brig_evict_t4']),
            [`sector:${CORPS_ID}:1`]: makeSector(1, [safeSubSeg], []),
        };

        const state = makeState('brig_evict_t4', TOOTH_OSID_T4, sectors, {
            [TOOTH_OSID_T4]: FACTION,
            [OTHER_OSID_T4]: FACTION,
            [SAFE_OSID_T4]: FACTION,
        });

        const adj = new Map<Osid, Osid[]>();
        adj.set(TOOTH_OSID_T4, [OTHER_OSID_T4, SAFE_OSID_T4]);
        adj.set(OTHER_OSID_T4, [TOOTH_OSID_T4, SAFE_OSID_T4]);
        adj.set(SAFE_OSID_T4, [TOOTH_OSID_T4, OTHER_OSID_T4]);

        // Risky analysis for the tooth OSID (4 enemies) — but multi-OSID sub-segment
        const toothAnalysis = makeOsidAnalysis(
            TOOTH_OSID_T4,
            ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3', 'op:rbih:e4'] as Osid[],
            [] as Osid[]
        );
        const safeAnalysis = makeOsidAnalysis(
            SAFE_OSID_T4,
            ['op:rbih:e1'] as Osid[],
            ['op:rs:f1', 'op:rs:f2', 'op:rs:f3'] as Osid[]
        );
        const otherAnalysis = makeOsidAnalysis(
            OTHER_OSID_T4,
            ['op:rbih:e1'] as Osid[],
            ['op:rs:f1', 'op:rs:f2'] as Osid[]
        );
        const graphAnalysis = makeGraphAnalysis([
            [TOOTH_OSID_T4, toothAnalysis],
            [SAFE_OSID_T4, safeAnalysis],
            [OTHER_OSID_T4, otherAnalysis],
        ]);

        const brigade = makeBrigade({ id: 'brig_evict_t4', location_osid: TOOTH_OSID_T4 });
        const result = {
            column_march_orders: {} as Record<string, Osid>,
            movement_orders: {} as Record<string, Osid>,
            posture_orders: [] as Array<{ brigade_id: string; posture: string }>,
        };

        const ctx: BrigadeEvaluationContext = {
            brigade,
            state,
            faction: FACTION,
            loc: TOOTH_OSID_T4,
            corpsId: CORPS_ID,
            cmd: null,
            directive: null,
            corpsStance: 'defend',
            activeOp: null,
            isActiveSectorOperationParticipant: false,
            adjEnemy: [],
            isAlliedWithRBiH: false,
            targetAdjacentCount: new Map(),
            corpsReserve: new Map(),
            chosenTargets: new Map(),
            columnAssignments: new Map(),
            counterAttackTarget: null,
            brigadeSupplyState: 'adequate',
            isHoldBrigade: false,
            sectorRecentRetreats: new Map(),
            sectorCounterAttackCount: new Map(),
            adjacency: adj,
            reverseMap: new Map(),
            terrainCache: {},
            graphAnalysis,
            supplyStateByOsid: null,
            ethnicMap: undefined,
            osidPopulationMap: undefined,
            result,
        } as unknown as BrigadeEvaluationContext;

        evaluateSectorMarch(ctx);

        // Eviction guard must NOT have fired (isRetroactiveTooth = false)
        // Brigade is already on sector front (loc is in frontSet) so no march
        expect(ctx.result.column_march_orders['brig_evict_t4']).toBeUndefined();
    });

    it('Test 5: no safe destination — brigade stays in place (fully trapped)', () => {
        // Brigade is at tooth (sole OSID in sub-segment, risky).
        // The corps has NO other front OSIDs — the entire front is the same tooth.
        // safeFront.size = 0 → brigade holds in place, no march issued.

        // Only one sector in the corps, one sub-segment with just the tooth
        const toothSubSeg = makeSubSegment(`subseg:${CORPS_ID}:0`, [TOOTH_OSID]);
        const sectors: Record<string, CorpsFrontSector> = {
            [`sector:${CORPS_ID}:0`]: makeSector(0, [toothSubSeg], ['brig_evict_test']),
            // No second sector — tooth is the ONLY front OSID
        };

        const state = makeState('brig_evict_test', TOOTH_OSID, sectors, {
            [TOOTH_OSID]: FACTION,
        });

        // Adjacency: tooth is isolated — no friendly neighbors to BFS through
        const adj = new Map<Osid, Osid[]>();
        adj.set(TOOTH_OSID, []);

        // Risky analysis for the tooth
        const toothAnalysis = makeOsidAnalysis(
            TOOTH_OSID,
            ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3', 'op:rbih:e4'] as Osid[],
            [] as Osid[]
        );
        const graphAnalysis = makeGraphAnalysis([[TOOTH_OSID, toothAnalysis]]);

        const ctx = makeEvictionCtx({ graphAnalysis, state, adjacency: adj });
        const returned = evaluateSectorMarch(ctx);

        // Guard fires (tooth IS retroactive, IS risky, no must_hold, not disrupted)
        // but safeFront is empty → no march issued, brigade stays trapped
        expect(ctx.result.column_march_orders['brig_evict_test']).toBeUndefined();
        // Function returns false (no order finalized)
        expect(returned).toBe(false);
    });

    it('Test 6 (bonus): disrupted brigade — eviction suppressed', () => {
        // Same as Test 1 topology but brigade.disrupted_turns = 2.
        // Guard condition 5 fails → no eviction.

        const ctx = makeEvictionCtx({
            brigadeOverrides: { disrupted_turns: 2 },
        });
        evaluateSectorMarch(ctx);

        // Disrupted brigade must NOT be evicted
        expect(ctx.result.column_march_orders['brig_evict_test']).toBeUndefined();
    });

    it('Test 7 (bonus): cut-off risk (≤1 friendly neighbor) also triggers eviction', () => {
        // Tooth has only 1 enemy but only 1 friendly neighbor — cut-off risk.
        // isMovementDestinationRisky returns true via the friendly ≤ 1 branch.
        // Expected: eviction fires, march to safe.

        const cutOffAnalysis = makeOsidAnalysis(
            TOOTH_OSID,
            ['op:rbih:e1'] as Osid[],      // 1 enemy — not a salient
            ['op:rs:only_one'] as Osid[]    // 1 friendly — cut-off risk
        );
        const safeAnalysis = makeOsidAnalysis(
            SAFE_OSID,
            ['op:rbih:e1'] as Osid[],
            ['op:rs:f1', 'op:rs:f2', 'op:rs:f3'] as Osid[]
        );
        const graphAnalysis = makeGraphAnalysis([
            [TOOTH_OSID, cutOffAnalysis],
            [SAFE_OSID, safeAnalysis],
        ]);

        const ctx = makeEvictionCtx({ graphAnalysis });
        const returned = evaluateSectorMarch(ctx);

        expect(returned).toBe(true);
        expect(ctx.result.column_march_orders['brig_evict_test']).toBe(SAFE_OSID);
    });

});

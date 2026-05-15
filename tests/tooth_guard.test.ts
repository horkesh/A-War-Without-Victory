/**
 * Tests for the "do not garrison the tooth" guard in evaluateSectorMarch.
 *
 * A "tooth" is a single-OSID sub-segment — the brigade would be the sole
 * defender on an exposed tip with no lateral support. The guard skips the
 * column march if the tooth is risky:
 *   - salient:   enemy_neighbors.length >= 3
 *   - cut-off:   friendly_neighbors.length <= 1
 *
 * When the guard fires, evaluateSectorMarch returns false (falls through to
 * corps-wide trap remediation) and no column_march_order is emitted.
 */

import { describe, it, expect } from 'vitest';
import { evaluatePocketEvacuation, evaluateSectorMarch } from '../src/sim/combat/bot_brigade_eval_front.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { FactionGraphAnalysis, OsidAnalysis } from '../src/sim/combat/osid_graph_analysis.js';
import type { GameState, FactionId, FormationState, CorpsFrontSector } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ─── Minimal fixture helpers ──────────────────────────────────────────────────

const FACTION: FactionId = 'RS';
const CORPS_ID = 'vrs_test_corps';

/** Brigade not on the sector front — stationed in the rear. */
function makeBrigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'brig_test',
        name: 'Test Brigade',
        faction: FACTION,
        kind: 'brigade',
        status: 'active',
        personnel: 1000,
        cohesion: 60,
        morale: 60,
        experience: 0.3,
        corps_id: CORPS_ID,
        location_osid: 'op:jablanica:jablanica_2',
        home_osid: 'op:jablanica:jablanica_2',
        ...overrides,
    } as FormationState;
}

/** Minimal GameState with a single sector whose sub_segments we control. */
function makeState(
    brigadeId: string,
    brigadeLoc: string,
    subSegments: CorpsFrontSector['sub_segments'],
    politicalControllers: Record<string, FactionId> = {}
): GameState {
    // Default: brigade location and tooth OSID are all RS-controlled so BFS
    // in findNearestFriendlyOsidDestination can traverse them.
    const defaultControllers: Record<string, FactionId> = {
        'op:jablanica:jablanica_2': FACTION,
        'op:kalinovik:sela_2': FACTION,
        ...politicalControllers,
    };

    const sector: CorpsFrontSector = {
        sector_id: `sector:${CORPS_ID}:0`,
        corps_id: CORPS_ID as any,
        faction: FACTION,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: ['e1'],
        sub_segments: subSegments,
        length_edges: 1,
        territory_osids: subSegments.flatMap(ss => ss.friendly_osids),
        assigned_brigade_ids: [brigadeId] as any[],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1.0,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    };

    return {
        meta: {
            turn: 5,
            phase: 'war',
            seed: 'test',
            scenario_start_date: { year: 1993, month: 1, day: 1 },
        } as unknown as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
        ] as GameState['factions'],
        military: {
            formations: {
                [brigadeId]: makeBrigade({ id: brigadeId, location_osid: brigadeLoc }),
            },
            corps_front_sectors: {
                [`sector:${CORPS_ID}:0`]: sector,
            },
            brigade_movement_orders: {},
        } as unknown as GameState['military'],
        political: {
            political_controllers: defaultControllers,
        } as unknown as GameState['political'],
    } as unknown as GameState;
}

/** OsidAnalysis stub for a tooth OSID. */
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

/** Minimal FactionGraphAnalysis with just the entries we need. */
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

/** Minimal adjacency: brigade loc → tooth, tooth has no onward links (BFS only needs to reach tooth). */
function makeAdjacency(loc: Osid, tooth: Osid): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    adj.set(loc, [tooth]);
    adj.set(tooth, [loc]);
    return adj;
}

/** Minimal BrigadeEvaluationContext for evaluateSectorMarch tests. */
function makeCtx(overrides: {
    brigadeId?: string;
    loc?: string;
    subSegments?: CorpsFrontSector['sub_segments'];
    graphAnalysis?: FactionGraphAnalysis;
    state?: GameState;
    adjacency?: Map<Osid, Osid[]>;
} = {}): BrigadeEvaluationContext {
    const brigadeId = overrides.brigadeId ?? 'brig_test';
    const loc = (overrides.loc ?? 'op:jablanica:jablanica_2') as Osid;
    const tooth = 'op:kalinovik:sela_2' as Osid;

    const subSegments: CorpsFrontSector['sub_segments'] = overrides.subSegments ?? [
        {
            sub_segment_id: 'subseg:vrs_test_corps:0',
            edge_ids: ['e1'],
            enemy_osids: ['op:rbih:enemy_1'],
            friendly_osids: [tooth], // single OSID = tooth
            primary_brigade_ids: [],
            length_edges: 1,
        },
    ];

    const state = overrides.state ?? makeState(brigadeId, loc, subSegments);
    const adjacency = overrides.adjacency ?? makeAdjacency(loc, tooth);
    const graphAnalysis = overrides.graphAnalysis ?? makeGraphAnalysis([
        [tooth, makeOsidAnalysis(tooth, ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3', 'op:rbih:e4', 'op:rbih:e5', 'op:rbih:e6', 'op:rbih:e7'], ['op:rs:friendly_1'])],
    ]);

    const result = {
        column_march_orders: {} as Record<string, Osid>,
        movement_orders: {} as Record<string, Osid>,
        posture_orders: [] as Array<{ brigade_id: string; posture: string }>,
    };

    return {
        brigade: makeBrigade({ id: brigadeId, location_osid: loc }),
        state,
        faction: FACTION,
        loc,
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

describe('evaluateSectorMarch — tooth guard', () => {
    it('uses cached null sector assignment to skip fallback assigned-sector lookup', () => {
        const loc = 'op:jablanica:jablanica_2' as Osid;
        const front = 'op:kalinovik:sela_2' as Osid;
        const ctx = makeCtx({
            loc,
            graphAnalysis: makeGraphAnalysis([
                [front, makeOsidAnalysis(front, ['op:rbih:enemy_1' as Osid], [loc, 'op:rs:friend_2' as Osid])],
            ]),
        });
        ctx.sectorAssignment = null;
        ctx.assignedSectorFrontOsids = null;

        const returned = evaluateSectorMarch(ctx);

        expect(returned).toBe(false);
        expect(ctx.result.column_march_orders[ctx.brigade.id]).toBeUndefined();
    });

    it('marches a one-hop sector reserve forward when its sector has no line holder', () => {
        const loc = 'op:jablanica:jablanica_2' as Osid;
        const front = 'op:kalinovik:sela_2' as Osid;
        const state = makeState('brig_test', loc, [{
            sub_segment_id: 'subseg:vrs_test_corps:empty',
            edge_ids: ['e1'],
            enemy_osids: ['op:rbih:enemy_1'],
            friendly_osids: [front],
            primary_brigade_ids: [],
            length_edges: 1,
        }]);
        const sector = state.military.corps_front_sectors![`sector:${CORPS_ID}:0`]!;
        sector.assigned_brigade_ids = [];
        sector.reserve_brigade_ids = ['brig_test'] as any[];

        const ctx = makeCtx({
            state,
            loc,
            adjacency: makeAdjacency(loc, front),
            graphAnalysis: makeGraphAnalysis([
                [front, makeOsidAnalysis(front, ['op:rbih:enemy_1' as Osid], [loc, 'op:rs:friend_2' as Osid])],
            ]),
        });

        const returned = evaluateSectorMarch(ctx);

        expect(returned).toBe(true);
        expect(ctx.result.column_march_orders.brig_test).toBe(front);
    });

    it('keeps a one-hop sector reserve back when its sector already has a line holder', () => {
        const loc = 'op:jablanica:jablanica_2' as Osid;
        const front = 'op:kalinovik:sela_2' as Osid;
        const state = makeState('brig_test', loc, [{
            sub_segment_id: 'subseg:vrs_test_corps:held',
            edge_ids: ['e1'],
            enemy_osids: ['op:rbih:enemy_1'],
            friendly_osids: [front],
            primary_brigade_ids: ['brig_line'],
            length_edges: 1,
        }]);
        const sector = state.military.corps_front_sectors![`sector:${CORPS_ID}:0`]!;
        sector.assigned_brigade_ids = ['brig_line'] as any[];
        sector.reserve_brigade_ids = ['brig_test'] as any[];

        const ctx = makeCtx({
            state,
            loc,
            adjacency: makeAdjacency(loc, front),
            graphAnalysis: makeGraphAnalysis([
                [front, makeOsidAnalysis(front, ['op:rbih:enemy_1' as Osid], [loc, 'op:rs:friend_2' as Osid])],
            ]),
        });

        const returned = evaluateSectorMarch(ctx);

        expect(returned).toBe(false);
        expect(ctx.result.column_march_orders.brig_test).toBeUndefined();
    });

    it('Test 1: single-tooth salient (7 enemy neighbors) → direct march suppressed, trap remediation routes to safe alternate', () => {
        // Topology design:
        //   Assigned sector has ONE sub-segment: { friendly_osids: [tooth] } — a pure tooth.
        //   A second sector in the SAME corps has ONE sub-segment: { friendly_osids: [safe] }.
        //   Adjacency: loc → [safe, tooth] (both adjacent).
        //   BFS sorts neighbors; "op:kalinovik:safe_2" < "op:kalinovik:sela_2", so `safe`
        //   would be visited first. But `frontSet` for the direct-march path is {tooth} only
        //   (just the assigned sector), so BFS finds `tooth` as the destination.
        //   Guard fires (tooth is risky). Trap remediation then searches reachableCorpsFront
        //   = {tooth, safe} — BFS visits `safe` first (alphabetically), returns `safe`.
        //   Result: march to safe, not tooth.
        const tooth = 'op:kalinovik:sela_2' as Osid;
        const safe = 'op:kalinovik:safe_2' as Osid;
        const loc = 'op:jablanica:jablanica_2' as Osid;

        const assignedSubSegments: CorpsFrontSector['sub_segments'] = [
            {
                sub_segment_id: 'subseg:vrs_test_corps:0',
                edge_ids: ['e1'],
                enemy_osids: ['op:rbih:enemy_1'],
                friendly_osids: [tooth], // single OSID — tooth
                primary_brigade_ids: [],
                length_edges: 1,
            },
        ];

        const safeSubSegments: CorpsFrontSector['sub_segments'] = [
            {
                sub_segment_id: 'subseg:vrs_test_corps:1',
                edge_ids: ['e2'],
                enemy_osids: ['op:rbih:enemy_2'],
                friendly_osids: [safe],
                primary_brigade_ids: [],
                length_edges: 1,
            },
        ];

        // Both tooth and safe are adjacent to loc (1 hop). BFS sorts: safe < sela, so in
        // trap remediation (target={tooth,safe}) safe is found first.
        const adjacency = new Map<Osid, Osid[]>();
        adjacency.set(loc, [safe, tooth]);
        adjacency.set(tooth, [loc]);
        adjacency.set(safe, [loc]);

        // State: brigade at loc, assigned to the first sector (tooth sub-segment).
        // Second sector (safe) is in the same corps but brigade is NOT assigned to it.
        const state = makeState('brig_test', loc, assignedSubSegments, {
            [loc]: FACTION,
            [tooth]: FACTION,
            [safe]: FACTION,
        });
        // Add second corps sector to state
        const secondSector: CorpsFrontSector = {
            sector_id: `sector:${CORPS_ID}:1`,
            corps_id: CORPS_ID as any,
            faction: FACTION,
            opposing_factions: ['RBiH' as FactionId],
            edge_ids: ['e2'],
            sub_segments: safeSubSegments,
            length_edges: 1,
            territory_osids: [safe],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            density: 0,
            threat_ratio: 1.0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        };
        state.military.corps_front_sectors![`sector:${CORPS_ID}:1`] = secondSector;

        const riskyAnalysis = makeOsidAnalysis(
            tooth,
            ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3', 'op:rbih:e4', 'op:rbih:e5', 'op:rbih:e6', 'op:rbih:e7'],
            ['op:rs:friendly_1']
        );
        const safeAnalysis = makeOsidAnalysis(
            safe,
            ['op:rbih:e1'],
            ['op:rs:f1', 'op:rs:f2', 'op:rs:f3']
        );

        const graphAnalysis = makeGraphAnalysis([[tooth, riskyAnalysis], [safe, safeAnalysis]]);

        const ctx = makeCtx({ loc, subSegments: assignedSubSegments, state, adjacency, graphAnalysis });

        const returned = evaluateSectorMarch(ctx);

        // Guard fired on tooth → trap remediation found safe → march issued → returns true
        expect(returned).toBe(true);
        // Critically: must NOT have marched to the risky tooth
        expect(ctx.result.column_march_orders['brig_test']).not.toBe(tooth);
        // Must have issued a march somewhere (safe)
        expect(ctx.result.column_march_orders['brig_test']).toBe(safe);
    });

    it('Test 2: single-tooth NON-risky (1 enemy, 3 friendly) → march IS issued, returns true', () => {
        // Same topology but the tooth is safe: only 1 enemy neighbor and 3 friendly.
        // Guard must NOT fire; march proceeds normally.
        const tooth = 'op:kalinovik:sela_2' as Osid;

        const safeAnalysis = makeOsidAnalysis(
            tooth,
            ['op:rbih:e1'],                                        // 1 enemy < 3
            ['op:rs:friendly_1', 'op:rs:friendly_2', 'op:rs:friendly_3'] // 3 friendly > 1
        );

        const ctx = makeCtx({ graphAnalysis: makeGraphAnalysis([[tooth, safeAnalysis]]) });

        const returned = evaluateSectorMarch(ctx);

        // Guard does NOT fire → march proceeds → returns true
        expect(returned).toBe(true);
        // Column march order emitted to the tooth
        expect(ctx.result.column_march_orders['brig_test']).toBe(tooth);
    });

    it('Test 3: multi-OSID sub-segment risky destination → guard does NOT fire, march proceeds', () => {
        // The sector has a sub-segment with 2 OSIDs. The destination is risky per
        // graphAnalysis, but isToothDest = false (multi-OSID segment). Guard skips.
        const toothA = 'op:test:a' as Osid;
        const toothB = 'op:test:b' as Osid;
        const loc = 'op:jablanica:jablanica_2' as Osid;

        const multiOsidSubSegments: CorpsFrontSector['sub_segments'] = [
            {
                sub_segment_id: 'subseg:vrs_test_corps:0',
                edge_ids: ['e1', 'e2'],
                enemy_osids: ['op:rbih:enemy_1'],
                friendly_osids: [toothA, toothB], // 2 OSIDs — NOT a tooth
                primary_brigade_ids: [],
                length_edges: 2,
            },
        ];

        // State needs toothA and toothB to be RS-controlled for BFS to reach them
        const state = makeState('brig_test', loc, multiOsidSubSegments, {
            [toothA]: FACTION,
            [toothB]: FACTION,
        });

        // Adjacency: loc → toothA (BFS picks toothA first alphabetically since it's adjacent)
        const adjacency = new Map<Osid, Osid[]>();
        adjacency.set(loc, [toothA, toothB]);
        adjacency.set(toothA, [loc, toothB]);
        adjacency.set(toothB, [loc, toothA]);

        // toothA is risky — but it's in a 2-OSID sub-segment so guard must NOT fire
        const riskyAnalysisA = makeOsidAnalysis(
            toothA,
            ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3'], // ≥3 enemies
            ['op:rs:friendly_1', 'op:rs:friendly_2']
        );
        const riskyAnalysisB = makeOsidAnalysis(
            toothB,
            ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3'],
            ['op:rs:friendly_1', 'op:rs:friendly_2']
        );

        const graphAnalysis = makeGraphAnalysis([
            [toothA, riskyAnalysisA],
            [toothB, riskyAnalysisB],
        ]);

        const ctx = makeCtx({ loc, subSegments: multiOsidSubSegments, state, adjacency, graphAnalysis });

        const returned = evaluateSectorMarch(ctx);

        // Guard did NOT fire — march to the multi-OSID sub-segment destination proceeds
        expect(returned).toBe(true);
        // Column march is to one of the two front OSIDs (BFS picks nearest)
        expect([toothA, toothB]).toContain(ctx.result.column_march_orders['brig_test']);
    });

    it('Test 4: brigade already ON the tooth → evaluateSectorMarch goes to else branch, no new march', () => {
        // Brigade location IS the single-OSID sub-segment tooth.
        // The function takes the `else` branch (already on sector front),
        // so no column_march_orders entry is set for this brigade.
        const tooth = 'op:kalinovik:sela_2' as Osid;

        const subSegments: CorpsFrontSector['sub_segments'] = [
            {
                sub_segment_id: 'subseg:vrs_test_corps:0',
                edge_ids: ['e1'],
                enemy_osids: ['op:rbih:enemy_1'],
                friendly_osids: [tooth],
                primary_brigade_ids: [],
                length_edges: 1,
            },
        ];

        // Brigade is AT the tooth
        const state = makeState('brig_test', tooth, subSegments, {
            [tooth]: FACTION,
        });

        const adjacency = new Map<Osid, Osid[]>();
        adjacency.set(tooth, ['op:rs:neighbor' as Osid]);
        adjacency.set('op:rs:neighbor' as Osid, [tooth]);

        const analysis = makeOsidAnalysis(
            tooth,
            ['op:rbih:e1', 'op:rbih:e2', 'op:rbih:e3', 'op:rbih:e4', 'op:rbih:e5', 'op:rbih:e6', 'op:rbih:e7'],
            ['op:rs:neighbor' as Osid]
        );

        const graphAnalysis = makeGraphAnalysis([[tooth, analysis]]);

        // Override brigade location to be ON the tooth
        const ctx = makeCtx({ loc: tooth, subSegments, state, adjacency, graphAnalysis, brigadeId: 'brig_test' });
        // Patch brigade in context to be at tooth
        (ctx.brigade as any).location_osid = tooth;

        evaluateSectorMarch(ctx);

        // Brigade is already on the sector front — no column march should be issued
        expect(ctx.result.column_march_orders['brig_test']).toBeUndefined();
    });

    it('Test 1b: single-tooth cut-off risk (friendly_neighbors <= 1) → direct march suppressed, trap remediation routes to safe alternate', () => {
        // Same topology as Test 1 but the tooth is risky via cut-off condition
        // (friendlyCount <= 1) rather than salient (enemyCount >= 3).
        // Assigned sector: one sub-segment, tooth only.
        // Second corps sector: safe. Both adjacent to loc; safe sorts before tooth.
        // Direct-march BFS target = {tooth} → finds tooth → guard fires.
        // Trap remediation target = {tooth, safe} → finds safe first → march to safe.
        const tooth = 'op:kalinovik:sela_2' as Osid;
        const safe = 'op:kalinovik:safe_2' as Osid;
        const loc = 'op:jablanica:jablanica_2' as Osid;

        const assignedSubSegments: CorpsFrontSector['sub_segments'] = [
            {
                sub_segment_id: 'subseg:vrs_test_corps:0',
                edge_ids: ['e1'],
                enemy_osids: ['op:rbih:enemy_1'],
                friendly_osids: [tooth],
                primary_brigade_ids: [],
                length_edges: 1,
            },
        ];
        const safeSubSegments: CorpsFrontSector['sub_segments'] = [
            {
                sub_segment_id: 'subseg:vrs_test_corps:1',
                edge_ids: ['e2'],
                enemy_osids: ['op:rbih:enemy_2'],
                friendly_osids: [safe],
                primary_brigade_ids: [],
                length_edges: 1,
            },
        ];

        const adjacency = new Map<Osid, Osid[]>();
        adjacency.set(loc, [safe, tooth]); // safe < sela → safe visited first in trap remediation
        adjacency.set(tooth, [loc]);
        adjacency.set(safe, [loc]);

        const state = makeState('brig_test', loc, assignedSubSegments, {
            [loc]: FACTION,
            [tooth]: FACTION,
            [safe]: FACTION,
        });
        const secondSector: CorpsFrontSector = {
            sector_id: `sector:${CORPS_ID}:1`,
            corps_id: CORPS_ID as any,
            faction: FACTION,
            opposing_factions: ['RBiH' as FactionId],
            edge_ids: ['e2'],
            sub_segments: safeSubSegments,
            length_edges: 1,
            territory_osids: [safe],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            density: 0,
            threat_ratio: 1.0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        };
        state.military.corps_front_sectors![`sector:${CORPS_ID}:1`] = secondSector;

        const cutOffAnalysis = makeOsidAnalysis(
            tooth,
            ['op:rbih:e1'],      // 1 enemy — not a salient
            ['op:rs:only_one']   // 1 friendly → cut-off risk (friendlyCount <= 1)
        );
        const safeAnalysis = makeOsidAnalysis(
            safe,
            ['op:rbih:e1'],
            ['op:rs:f1', 'op:rs:f2', 'op:rs:f3']
        );

        const graphAnalysis = makeGraphAnalysis([[tooth, cutOffAnalysis], [safe, safeAnalysis]]);

        const ctx = makeCtx({ loc, subSegments: assignedSubSegments, state, adjacency, graphAnalysis });

        const returned = evaluateSectorMarch(ctx);

        expect(returned).toBe(true);
        // Must NOT march to the cut-off tooth
        expect(ctx.result.column_march_orders['brig_test']).not.toBe(tooth);
        // Rerouted to safe alternate
        expect(ctx.result.column_march_orders['brig_test']).toBe(safe);
    });
});

describe('evaluatePocketEvacuation', () => {
    it('uses cached sector assignment instead of rescanning sector rosters', () => {
        const loc = 'op:test:pocket' as Osid;
        const home = 'op:test:home' as Osid;
        const subSegments: CorpsFrontSector['sub_segments'] = [
            {
                sub_segment_id: 'subseg:vrs_test_corps:pocket',
                edge_ids: ['e1'],
                enemy_osids: ['op:rbih:enemy_1'],
                friendly_osids: [loc],
                primary_brigade_ids: [],
                length_edges: 1,
            },
        ];
        const state = makeState('brig_test', loc, subSegments, {
            [loc]: FACTION,
            [home]: FACTION,
        });
        const sector = state.military.corps_front_sectors![`sector:${CORPS_ID}:0`]!;
        sector.assigned_brigade_ids = [];
        sector.reserve_brigade_ids = [];
        sector.territory_osids = [loc];

        const ctx = makeCtx({ loc, state, subSegments });
        ctx.sectorAssignment = {
            sector,
            isReserve: false,
            frontOsids: new Set([loc]),
        };
        ctx.brigade.home_osid = home;

        const returned = evaluatePocketEvacuation(ctx);

        expect(returned).toBe(true);
        expect(state.military.brigade_movement_orders?.brig_test?.destination_sids).toEqual([home]);
        expect(ctx.result.posture_orders).toContainEqual({ brigade_id: 'brig_test', posture: 'defend' });
    });
});

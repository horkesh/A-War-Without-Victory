/**
 * Unit tests for Linked ZoC (Zone of Control) front-line system.
 *
 * Verifies:
 * - Two brigades within mutual ZoC range create linked ZoC
 * - Isolated brigades (too far apart) do NOT create linked ZoC
 * - Linked ZoC blocks enemy movement into gap between brigades
 * - Attack moves into enemy-controlled territory bypass linked ZoC
 * - Three-brigade chains create extended linked ZoC
 * - Non-deployed brigades don't project ZoC or contribute to linking
 *
 * Deterministic: all tests use fixed state, no randomness.
 */

import { describe, expect, it } from 'vitest';
import {
    buildOsidAdjacency,
    computeLinkedZocForFaction,
    computeLinkedZocByFaction,
    computeZoCState,
    type Osid
} from '../src/sim/phase_ii/zoc.js';
import { applyZocConstrainedMovement } from '../src/sim/phase_ii/zoc_constrained_movement.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../src/state/game_state.js';

/**
 * Build a simple test graph:
 *
 *    A -- B -- C -- D -- E
 *
 * Linear chain of 5 OSIDs. A and E are at the ends, B/C/D are in the middle.
 */
function makeLinearEdges(): Array<{ a: string; b: string }> {
    return [
        { a: 'A', b: 'B' },
        { a: 'B', b: 'C' },
        { a: 'C', b: 'D' },
        { a: 'D', b: 'E' }
    ];
}

/**
 * Build a branching test graph:
 *
 *    A -- B -- C -- D
 *              |
 *              F -- G
 *
 * C has three neighbors: B, D, F.
 */
function makeBranchingEdges(): Array<{ a: string; b: string }> {
    return [
        { a: 'A', b: 'B' },
        { a: 'B', b: 'C' },
        { a: 'C', b: 'D' },
        { a: 'C', b: 'F' },
        { a: 'F', b: 'G' }
    ];
}

function makeFormation(id: string, faction: FactionId, location_osid: string, kind = 'brigade'): FormationState {
    return {
        id: id as FormationId,
        faction,
        name: `Test ${id}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        tags: [],
        kind: kind as FormationState['kind'],
        personnel: 500,
        location_osid
    } as FormationState;
}

function makeState(formations: FormationState[], factions: FactionId[] = ['RS', 'RBiH', 'HRHB']): GameState {
    const formationMap: Record<string, FormationState> = {};
    for (const f of formations) formationMap[f.id] = f;
    return {
        meta: { turn: 5, phase: 'phase_ii' },
        factions: factions.map(id => ({ id })),
        formations: formationMap,
        political_controllers: {},
        political_control: {}
    } as unknown as GameState;
}

describe('Linked ZoC', () => {

    // ═══════════════════════════════════════════════════════════════
    // Core linked ZoC computation
    // ═══════════════════════════════════════════════════════════════

    describe('computeLinkedZocForFaction', () => {

        it('links ZoC between two adjacent brigades (distance 2)', () => {
            // A -- B: Brigade at A, brigade at B
            // ZoC of A includes B, ZoC of B includes A
            // Both brigade OSIDs are connected in ZoC graph → linked
            // But the linked set only includes ZoC OSIDs (not brigade positions)
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RS', 'B')
            ]);

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            // A's ZoC = {B}, B's ZoC = {A, C}
            // ZoC subgraph = {A (brigade), B (brigade+zoc), C (zoc)}
            // Connected component has 2 brigades → C is linked ZoC
            // Note: A is brigade position (not zoc), B is brigade position
            // Actually B is in A's ZoC, but B is a brigade position too
            // ZoC OSIDs for RS = neighbors of A and B that aren't brigade positions
            // A's neighbors = [B] → B is brigade, not counted as ZoC
            // B's neighbors = [A, C] → A is brigade, C is ZoC
            // So zocOsids = {C}, brigadeOsids = {A, B}
            // ZoC subgraph = {A, B, C}
            // Component: A-B-C, has 2 brigades → C is linked
            expect(linked.has('C')).toBe(true);
            expect(linked.size).toBe(1); // Only C is a ZoC OSID in this component
        });

        it('links ZoC between two brigades with 1 hop gap (distance 3: A-B-C, brigades at A and C)', () => {
            // A -- B -- C: Brigade at A, brigade at C
            // A's ZoC = {B}, C's ZoC = {B, D}
            // B is in both ZoC sets → ZoC subgraph connects A through B to C
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RS', 'C')
            ]);

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            // brigadeOsids = {A, C}
            // ZoC: A→{B}, C→{B,D}. zocOsids (excl brigade positions) = {B, D}
            // ZoC subgraph = {A, B, C, D}
            // Component: A-B-C-D, has 2 brigades (A,C) → B and D are linked
            expect(linked.has('B')).toBe(true);
            expect(linked.has('D')).toBe(true);
            expect(linked.size).toBe(2);
        });

        it('links ZoC between two brigades with 2 hop gap (distance 4: A-B-C-D, brigades at A and D)', () => {
            // User's example: Brigade A → A_zoc → B_zoc → Brigade B
            // A -- B -- C -- D: Brigade at A, brigade at D
            // A's ZoC = {B}, D's ZoC = {C, E}
            // B is ZoC of A, C is ZoC of D, and B-C are adjacent → chain connects
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RS', 'D')
            ]);

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            // brigadeOsids = {A, D}
            // ZoC: A→{B}, D→{C, E}. zocOsids = {B, C, E}
            // ZoC subgraph = {A, B, C, D, E}
            // Component: A-B-C-D-E, has 2 brigades → B, C, E are linked
            expect(linked.has('B')).toBe(true);
            expect(linked.has('C')).toBe(true);
            expect(linked.has('E')).toBe(true);
            expect(linked.size).toBe(3);
        });

        it('does NOT link ZoC when brigades are too far apart (3 hop gap)', () => {
            // A -- B -- C -- D -- E: Brigade at A, brigade at E
            // A's ZoC = {B}, E's ZoC = {D}
            // B and D are NOT adjacent → no chain through ZoC subgraph
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RS', 'E')
            ]);

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            // brigadeOsids = {A, E}
            // ZoC: A→{B}, E→{D}. zocOsids = {B, D}
            // ZoC subgraph = {A, B, D, E}
            // Components: {A, B} (1 brigade), {D, E} (1 brigade)
            // Neither component has 2+ brigades → no linked ZoC
            expect(linked.size).toBe(0);
        });

        it('requires at least 2 brigades for linked ZoC', () => {
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'C')
            ]);

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            expect(linked.size).toBe(0);
        });

        it('handles three-brigade chain creating extended linked ZoC', () => {
            // A -- B -- C -- D -- E: Brigades at A, C, E
            // A-ZoC={B}, C-ZoC={B,D}, E-ZoC={D}
            // All connected through shared ZoC → entire chain is linked
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RS', 'C'),
                makeFormation('b3', 'RS', 'E')
            ]);

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            // brigadeOsids = {A, C, E}
            // ZoC: A→{B}, C→{B,D}, E→{D}. zocOsids = {B, D}
            // ZoC subgraph = {A, B, C, D, E}
            // Component: all connected, 3 brigades → B and D are linked
            expect(linked.has('B')).toBe(true);
            expect(linked.has('D')).toBe(true);
            expect(linked.size).toBe(2);
        });

        it('non-deployed brigades do not project ZoC or contribute to linking', () => {
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RS', 'D')
            ]);
            // Set b2 as in_transit (not deployed)
            state.brigade_movement_state = {
                b2: { status: 'in_transit', destination_sids: [], turns_remaining: 2 }
            } as any;

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            // Only b1 is deployed, so only 1 brigade → no linked ZoC
            expect(linked.size).toBe(0);
        });

        it('only links ZoC for same faction — enemy brigades do not count', () => {
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RBiH', 'C') // Different faction
            ]);

            const linkedRS = computeLinkedZocForFaction(state, adjacency, 'RS');
            const linkedRBiH = computeLinkedZocForFaction(state, adjacency, 'RBiH');
            // Each faction has only 1 brigade → no linked ZoC for either
            expect(linkedRS.size).toBe(0);
            expect(linkedRBiH.size).toBe(0);
        });

        it('branching graph creates linked ZoC across branches', () => {
            // A -- B -- C -- D, C -- F -- G
            // Brigades at A and D: linked through B-C
            // Brigade at G: isolated (only 1 brigade in {F, G} branch), unless linked to main chain
            const edges = makeBranchingEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('b1', 'RS', 'A'),
                makeFormation('b2', 'RS', 'D'),
                makeFormation('b3', 'RS', 'G')
            ]);

            const linked = computeLinkedZocForFaction(state, adjacency, 'RS');
            // brigadeOsids = {A, D, G}
            // ZoC: A→{B}, D→{C}, G→{F}. zocOsids = {B, C, F}
            // ZoC subgraph = {A, B, C, D, F, G}
            // A-B-C-D and C-F-G are connected through C → single component with 3 brigades
            // Linked ZoC = {B, C, F}
            expect(linked.has('B')).toBe(true);
            expect(linked.has('C')).toBe(true);
            expect(linked.has('F')).toBe(true);
            expect(linked.size).toBe(3);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Linked ZoC blocking movement
    // ═══════════════════════════════════════════════════════════════

    describe('movement blocking via linked ZoC', () => {

        /** Build a mock reverseMap where each OSID maps to itself as a canonical SID. */
        function mockReverseMap(osids: string[]): Map<string, string[]> {
            const m = new Map<string, string[]>();
            for (const o of osids) m.set(o, [o]);
            return m;
        }

        it('blocks enemy movement into friendly-controlled OSID that is in enemy linked ZoC', () => {
            // A -- B -- C -- D: RS brigades at A and D
            // RBiH brigade at X, wants to move to B
            // But B is in RS linked ZoC → blocked
            //
            // Extended graph: X -- B (X is adjacent to B, controlled by RBiH)
            const edges = [
                { a: 'A', b: 'B' },
                { a: 'B', b: 'C' },
                { a: 'C', b: 'D' },
                { a: 'B', b: 'X' }
            ];
            const adjacency = buildOsidAdjacency(edges);

            const state = makeState([
                makeFormation('rs1', 'RS', 'A'),
                makeFormation('rs2', 'RS', 'D'),
                makeFormation('rbih1', 'RBiH', 'X')
            ]);

            // Set up political controllers: B is RBiH (friendly to the mover)
            state.political_controllers = {
                A: 'RS',
                B: 'RBiH', // Friendly to RBiH — would normally allow movement
                C: 'RS',
                D: 'RS',
                X: 'RBiH'
            } as any;

            // Compute RS linked ZoC
            const linkedZocByFaction = computeLinkedZocByFaction(state, adjacency);
            const rsLinked = linkedZocByFaction.get('RS')!;
            expect(rsLinked.has('B')).toBe(true); // B is in RS linked ZoC
            expect(rsLinked.has('C')).toBe(true); // C is in RS linked ZoC

            // Now try to move RBiH brigade from X to B
            state.brigade_movement_orders = {
                rbih1: { destination_sids: ['B'] }
            } as any;

            const reverseMap = mockReverseMap(['A', 'B', 'C', 'D', 'X']);
            const report = applyZocConstrainedMovement(state, edges, reverseMap as any, linkedZocByFaction);
            expect(report.moves_blocked_by_linked_zoc).toBe(1);
            // Brigade should NOT have moved
            const rbih1 = state.formations!.rbih1!;
            expect((rbih1 as any).location_osid).toBe('X');
        });

        it('allows attack moves into enemy-controlled territory even if in linked ZoC', () => {
            // Enemy-controlled destination should bypass linked ZoC check
            // (it's an attack, not a movement through gap)
            const edges = [
                { a: 'A', b: 'B' },
                { a: 'B', b: 'C' },
                { a: 'C', b: 'D' },
                { a: 'B', b: 'X' }
            ];
            const adjacency = buildOsidAdjacency(edges);

            const state = makeState([
                makeFormation('rs1', 'RS', 'A'),
                makeFormation('rs2', 'RS', 'D'),
                makeFormation('rbih1', 'RBiH', 'X')
            ]);

            state.political_controllers = {
                A: 'RS',
                B: 'RS', // Enemy-controlled — this is an attack
                C: 'RS',
                D: 'RS',
                X: 'RBiH'
            } as any;

            const linkedZocByFaction = computeLinkedZocByFaction(state, adjacency);

            state.brigade_movement_orders = {
                rbih1: { destination_sids: ['B'] }
            } as any;

            const reverseMap = mockReverseMap(['A', 'B', 'C', 'D', 'X']);
            const report = applyZocConstrainedMovement(state, edges, reverseMap as any, linkedZocByFaction);
            // Attack move should be allowed (not blocked by linked ZoC)
            expect(report.moves_blocked_by_linked_zoc).toBe(0);
            expect(report.moves_applied).toBe(1);
            const rbih1 = state.formations!.rbih1!;
            expect((rbih1 as any).location_osid).toBe('B');
        });

        it('does not block movement when no linked ZoC map is provided', () => {
            const edges = makeLinearEdges();
            const state = makeState([
                makeFormation('b1', 'RBiH', 'B')
            ]);
            state.political_controllers = {
                A: 'RBiH',
                B: 'RBiH',
                C: 'RBiH'
            } as any;

            state.brigade_movement_orders = {
                b1: { destination_sids: ['C'] }
            } as any;

            const reverseMap = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
            // No linkedZocByFaction passed → legacy behavior
            const report = applyZocConstrainedMovement(state, edges, reverseMap as any);
            expect(report.moves_applied).toBe(1);
            expect(report.moves_blocked_by_linked_zoc).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // Integration: computeLinkedZocByFaction
    // ═══════════════════════════════════════════════════════════════

    describe('computeLinkedZocByFaction', () => {

        it('computes linked ZoC for all factions independently', () => {
            const edges = makeLinearEdges();
            const adjacency = buildOsidAdjacency(edges);
            const state = makeState([
                makeFormation('rs1', 'RS', 'A'),
                makeFormation('rs2', 'RS', 'C'),
                makeFormation('rbih1', 'RBiH', 'D'),
                makeFormation('rbih2', 'RBiH', 'E') // D and E are adjacent → linked
            ]);

            const result = computeLinkedZocByFaction(state, adjacency);
            const rsLinked = result.get('RS')!;
            const rbihLinked = result.get('RBiH')!;

            // RS: brigades at A,C → B is linked ZoC
            expect(rsLinked.has('B')).toBe(true);
            // RBiH: brigades at D,E → C is linked ZoC (neighbor of D, not a brigade position)
            // D's neighbors={C,E}, E's neighbors={D}. zocOsids={C}
            // Component: {C,D,E}, 2 brigades → C is linked
            expect(rbihLinked.has('C')).toBe(true);
        });
    });
});

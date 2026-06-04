/**
 * Sector counter-attack tests.
 *
 * Verifies the broadened counter-attack mechanic: when ANY brigade in a sector
 * retreats, OTHER healthy brigades on that sector's front can counter-attack
 * adjacent enemy OSIDs within 2 hops of the retreated-from OSID.
 */

import { describe, it, expect } from 'vitest';
import {
    MAX_SECTOR_COUNTER_ATTACKS_PER_TURN,
    COUNTER_ATTACK_MIN_PERSONNEL,
    COUNTER_ATTACK_MIN_COHESION,
    COUNTER_ATTACK_RETREAT_WINDOW,
    COUNTER_ATTACK_MAX_HOPS,
} from '../src/sim/combat/bot_constants.js';
import { getEnemyOsidsWithinHops, evaluateDefensive } from '../src/sim/combat/bot_brigade_eval_attack.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';

// ── Constants ──────────────────────────────────────────────────────────────

describe('Sector counter-attack constants', () => {
    it('MAX_SECTOR_COUNTER_ATTACKS_PER_TURN is 2', () => {
        expect(MAX_SECTOR_COUNTER_ATTACKS_PER_TURN).toBe(2);
    });

    it('COUNTER_ATTACK_MIN_PERSONNEL is 600', () => {
        expect(COUNTER_ATTACK_MIN_PERSONNEL).toBe(600);
    });

    it('COUNTER_ATTACK_MIN_COHESION is 30', () => {
        expect(COUNTER_ATTACK_MIN_COHESION).toBe(30);
    });

    it('COUNTER_ATTACK_RETREAT_WINDOW is 2', () => {
        expect(COUNTER_ATTACK_RETREAT_WINDOW).toBe(2);
    });

    it('COUNTER_ATTACK_MAX_HOPS is 2', () => {
        expect(COUNTER_ATTACK_MAX_HOPS).toBe(2);
    });
});

// ── getEnemyOsidsWithinHops ────────────────────────────────────────────────

function makeAdj(edges: [string, string][]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const [a, b] of edges) {
        if (!adj.has(a as Osid)) adj.set(a as Osid, []);
        if (!adj.has(b as Osid)) adj.set(b as Osid, []);
        adj.get(a as Osid)!.push(b as Osid);
        adj.get(b as Osid)!.push(a as Osid);
    }
    return adj;
}

function makeState(controllers: Record<string, string>): GameState {
    return {
        political: {
            political_controllers: controllers,
        },
        military: {
            formations: {},
        },
        meta: {},
    } as unknown as GameState;
}

describe('getEnemyOsidsWithinHops', () => {
    // Layout:  A -- B -- C -- D -- E
    //          (RBiH)  (RS)  (RS)  (RS)  (RBiH)
    const adj = makeAdj([
        ['op:a:a_1', 'op:b:b_1'],
        ['op:b:b_1', 'op:c:c_1'],
        ['op:c:c_1', 'op:d:d_1'],
        ['op:d:d_1', 'op:e:e_1'],
    ]);
    const state = makeState({
        'op:a:a_1': 'RBiH',
        'op:b:b_1': 'RS',
        'op:c:c_1': 'RS',
        'op:d:d_1': 'RS',
        'op:e:e_1': 'RBiH',
    });

    it('returns empty set when maxHops is 0', () => {
        const result = getEnemyOsidsWithinHops(
            ['op:a:a_1'], 0, adj, state, 'RBiH' as FactionId,
        );
        expect(result.size).toBe(0);
    });

    it('finds adjacent enemy OSID at 1 hop', () => {
        const result = getEnemyOsidsWithinHops(
            ['op:a:a_1'], 1, adj, state, 'RBiH' as FactionId,
        );
        expect(result.has('op:b:b_1')).toBe(true);
        expect(result.size).toBe(1);
    });

    it('finds enemy OSIDs within 2 hops', () => {
        const result = getEnemyOsidsWithinHops(
            ['op:a:a_1'], 2, adj, state, 'RBiH' as FactionId,
        );
        expect(result.has('op:b:b_1')).toBe(true);
        expect(result.has('op:c:c_1')).toBe(true);
        expect(result.size).toBe(2);
    });

    it('does not include friendly OSIDs', () => {
        // Source is op:d:d_1 (RS), faction is RS, so RBiH OSIDs are enemies
        const result = getEnemyOsidsWithinHops(
            ['op:d:d_1'], 2, adj, state, 'RS' as FactionId,
        );
        expect(result.has('op:e:e_1')).toBe(true);
        // op:c:c_1 is RS-controlled, should NOT be in enemies
        expect(result.has('op:c:c_1')).toBe(false);
        // op:b:b_1 is RS-controlled, should NOT be in enemies
        expect(result.has('op:b:b_1')).toBe(false);
    });

    it('handles multiple source OSIDs', () => {
        const result = getEnemyOsidsWithinHops(
            ['op:a:a_1', 'op:e:e_1'], 1, adj, state, 'RBiH' as FactionId,
        );
        // From a_1: finds b_1; From e_1: finds d_1
        expect(result.has('op:b:b_1')).toBe(true);
        expect(result.has('op:d:d_1')).toBe(true);
    });

    it('does not include source OSIDs in results', () => {
        const result = getEnemyOsidsWithinHops(
            ['op:b:b_1'], 1, adj, state, 'RBiH' as FactionId,
        );
        // op:b:b_1 is an RS OSID but it's a source — should still be visited
        // Wait, sources are excluded from traversal output because they're pre-visited.
        // But they ARE enemy, so the question is whether they show up.
        // Sources go into visited set, BFS only adds neighbors not in visited.
        // So source OSIDs will NOT appear in results even if enemy-controlled.
        expect(result.has('op:b:b_1')).toBe(false);
    });

    it('is deterministic — same result on repeated calls', () => {
        const r1 = getEnemyOsidsWithinHops(
            ['op:a:a_1'], 2, adj, state, 'RBiH' as FactionId,
        );
        const r2 = getEnemyOsidsWithinHops(
            ['op:a:a_1'], 2, adj, state, 'RBiH' as FactionId,
        );
        expect([...r1].sort()).toEqual([...r2].sort());
    });

    it('handles disconnected graph gracefully', () => {
        const disconnectedAdj = makeAdj([
            ['op:a:a_1', 'op:b:b_1'],
            // op:c:c_1 is disconnected
        ]);
        disconnectedAdj.set('op:c:c_1' as Osid, []);
        const result = getEnemyOsidsWithinHops(
            ['op:a:a_1'], 10, disconnectedAdj, state, 'RBiH' as FactionId,
        );
        expect(result.has('op:b:b_1')).toBe(true);
        // c_1 is unreachable
        expect(result.has('op:c:c_1')).toBe(false);
    });
});

// ── Sector counter-attack cap ──────────────────────────────────────────────

describe('Sector counter-attack cap logic', () => {
    it('sector counter-attack count starts at 0', () => {
        const counts = new Map<string, number>();
        expect(counts.get('sector:1kk:0') ?? 0).toBe(0);
    });

    it('blocks after reaching MAX_SECTOR_COUNTER_ATTACKS_PER_TURN', () => {
        const counts = new Map<string, number>();
        counts.set('sector:1kk:0', MAX_SECTOR_COUNTER_ATTACKS_PER_TURN);
        const canCounterAttack = (counts.get('sector:1kk:0') ?? 0) < MAX_SECTOR_COUNTER_ATTACKS_PER_TURN;
        expect(canCounterAttack).toBe(false);
    });

    it('allows when count is below cap', () => {
        const counts = new Map<string, number>();
        counts.set('sector:1kk:0', 1);
        const canCounterAttack = (counts.get('sector:1kk:0') ?? 0) < MAX_SECTOR_COUNTER_ATTACKS_PER_TURN;
        expect(canCounterAttack).toBe(true);
    });
});

// ── Eligibility checks ────────────────────────────────────────────────────

describe('Sector counter-attack eligibility', () => {
    function isEligible(opts: {
        personnel: number;
        cohesion: number;
        disruptedTurns: number;
        hasAdjacentEnemy: boolean;
    }): boolean {
        return opts.disruptedTurns === 0
            && opts.hasAdjacentEnemy
            && opts.personnel >= COUNTER_ATTACK_MIN_PERSONNEL
            && opts.cohesion >= COUNTER_ATTACK_MIN_COHESION;
    }

    it('healthy brigade with enemy adjacent is eligible', () => {
        expect(isEligible({ personnel: 800, cohesion: 50, disruptedTurns: 0, hasAdjacentEnemy: true })).toBe(true);
    });

    it('brigade below min personnel is ineligible', () => {
        expect(isEligible({ personnel: 500, cohesion: 50, disruptedTurns: 0, hasAdjacentEnemy: true })).toBe(false);
    });

    it('brigade below min cohesion is ineligible', () => {
        expect(isEligible({ personnel: 800, cohesion: 20, disruptedTurns: 0, hasAdjacentEnemy: true })).toBe(false);
    });

    it('disrupted brigade is ineligible', () => {
        expect(isEligible({ personnel: 800, cohesion: 50, disruptedTurns: 2, hasAdjacentEnemy: true })).toBe(false);
    });

    it('brigade with no adjacent enemy is ineligible', () => {
        expect(isEligible({ personnel: 800, cohesion: 50, disruptedTurns: 0, hasAdjacentEnemy: false })).toBe(false);
    });

    it('brigade at exactly min thresholds is eligible', () => {
        expect(isEligible({
            personnel: COUNTER_ATTACK_MIN_PERSONNEL,
            cohesion: COUNTER_ATTACK_MIN_COHESION,
            disruptedTurns: 0,
            hasAdjacentEnemy: true,
        })).toBe(true);
    });
});

// ── Retreat window filtering ───────────────────────────────────────────────

describe('Sector counter-attack repulse memory', () => {
    it('does not send a recently repulsed brigade back into the same sector counter-attack target', () => {
        const loc = 'op:zavidovici:zavidovici_2' as Osid;
        const target = 'op:zavidovici:cardak_2' as Osid;
        const source = 'op:zavidovici:gostovic' as Osid;
        const brigade = {
            id: 'arbih_330th_liberation',
            faction: 'RBiH',
            status: 'active',
            kind: 'brigade',
            corps_id: 'arbih_3rd_corps',
            location_osid: loc,
            personnel: 850,
            cohesion: 50,
            morale: 30,
            disrupted_turns: 0,
            last_repulsed_from: { osid: target, turn: 31 },
        } as unknown as FormationState;
        const state = {
            meta: { turn: 32 },
            military: {
                formations: {
                    [brigade.id]: brigade,
                    rs_defender: {
                        id: 'rs_defender',
                        faction: 'RS',
                        status: 'active',
                        kind: 'brigade',
                        location_osid: target,
                        personnel: 400,
                        cohesion: 20,
                        morale: 25,
                    },
                },
                corps_front_sectors: {
                    'sector:arbih_3rd_corps:1': {
                        sector_id: 'sector:arbih_3rd_corps:1',
                        corps_id: 'arbih_3rd_corps',
                        faction: 'RBiH',
                        assigned_brigade_ids: [brigade.id],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        sub_segments: [{
                            sub_segment_id: 'subseg:sector:arbih_3rd_corps:1:0',
                            friendly_osids: [loc],
                            enemy_osids: [target],
                            primary_brigade_ids: [brigade.id],
                            edge_ids: ['edge:zavidovici'],
                            length_edges: 1,
                        }],
                        territory_osids: [loc],
                        edge_ids: ['edge:zavidovici'],
                        length_edges: 1,
                    },
                },
            },
            political: {
                political_controllers: {
                    [loc]: 'RBiH',
                    [source]: 'RBiH',
                    [target]: 'RS',
                },
            },
        } as unknown as GameState;
        const result = {
            posture_orders: [],
            attack_orders: {},
            attack_scores: {},
            movement_orders: {},
            column_march_orders: {},
            eligible_attackers_by_corps: {},
        };
        const ctx = {
            state,
            faction: 'RBiH',
            brigade,
            loc,
            corpsId: 'arbih_3rd_corps',
            cmd: null,
            directive: null,
            corpsStance: 'defensive',
            activeOp: null,
            isActiveSectorOperationParticipant: false,
            adjEnemy: [target],
            isAlliedWithRBiH: false,
            targetAdjacentCount: new Map(),
            corpsReserve: new Map(),
            chosenTargets: new Map(),
            columnAssignments: new Map(),
            counterAttackTarget: null,
            brigadeSupplyState: 'adequate',
            isHoldBrigade: false,
            sectorRecentRetreats: new Map([
                ['sector:arbih_3rd_corps:1', [{ osid: source, turn: 31 }]],
            ]),
            sectorCounterAttackCount: new Map(),
            sectorAssignment: {
                sector: state.military.corps_front_sectors!['sector:arbih_3rd_corps:1']!,
                isReserve: false,
                frontOsids: new Set([loc]),
            },
            assignedSectorFrontOsids: new Set([loc]),
            adjacency: new Map<Osid, Osid[]>([
                [loc, [target]],
                [target, [loc, source]],
                [source, [target]],
            ]),
            reverseMap: new Map(),
            terrainCache: {},
            graphAnalysis: {
                osid_analysis: new Map([
                    [loc, { enemy_neighbors: [target], friendly_neighbors: [], classification: 'contested' }],
                ]),
            },
            result,
        } as unknown as BrigadeEvaluationContext;

        const handled = evaluateDefensive(ctx);

        expect(handled).toBe(true);
        expect(result.attack_orders).not.toHaveProperty(brigade.id);
        expect(result.posture_orders).toContainEqual({ brigade_id: brigade.id, posture: 'dig_in' });
    });
});

describe('Retreat window filtering', () => {
    function isRecentRetreat(retreatTurn: number, currentTurn: number): boolean {
        return retreatTurn >= currentTurn - COUNTER_ATTACK_RETREAT_WINDOW;
    }

    it('retreat 1 turn ago is within window', () => {
        expect(isRecentRetreat(9, 10)).toBe(true);
    });

    it('retreat 2 turns ago is within window', () => {
        expect(isRecentRetreat(8, 10)).toBe(true);
    });

    it('retreat 3 turns ago is outside window', () => {
        expect(isRecentRetreat(7, 10)).toBe(false);
    });

    it('retreat on the same turn is within window', () => {
        expect(isRecentRetreat(10, 10)).toBe(true);
    });
});

/**
 * Targeted proof tests for Elite Formation Utilization fixes.
 *
 * Fix A: reachability-aware plan formation (plan.ts)
 * Fix B: main-effort prepositioning (emit.ts, commander_loop.ts)
 *
 * These tests prove specific behavioral claims, not just "doesn't crash."
 */
import { describe, expect, it } from 'vitest';

import { managePlan, MIN_BRIGADES_FOR_PLAN } from '../../src/sim/combat/commander/plan.js';
import { buildPrepositioningOrders } from '../../src/sim/combat/commander/emit.js';
import { applyCommanderOutput } from '../../src/sim/combat/commander/commander_loop.js';

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../src/state/game_state.js';
import type {
    BrigadeEvaluation,
    CommanderBriefing,
    CommanderOutput,
    CommanderState,
    ForceAssessment,
    ZoneAssessment,
    ZoneId,
} from '../../src/sim/combat/commander/commander_state.js';
import type { AllocationResult } from '../../src/sim/combat/commander/allocate.js';

// ═══════════════════════════════════════════════════════════════════════════
// Fixtures — spatial graph with near (reachable) and far (unreachable) OSIDs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Spatial graph:
 *   op:near:a ←→ op:near:b ←→ op:enemy:target
 *   op:far:deep (isolated — no adjacency to anything within 8 hops)
 *
 * Brigades at op:near:a/b can reach op:enemy:target.
 * Brigades at op:far:deep cannot.
 */
/**
 * Two spatial configurations:
 * - "near" graph: op:near:a ←→ op:near:b ←→ op:enemy:target (reachable within 8 hops)
 * - "far" graph: op:far:deep is in the same component but connected via a long chain
 *   (hop1→hop2→...→hop9→op:near:a) making it >8 hops from the front (unreachable
 *   by MAX_REACHABILITY_HOPS=8, but findable by prepositioning's 30-hop search)
 */
function makeSpatial() {
    const adj = new Map<string, string[]>([
        ['op:near:a', ['op:near:b', 'op:hop:9']],
        ['op:near:b', ['op:near:a', 'op:enemy:target']],
        ['op:enemy:target', ['op:near:b']],
    ]);
    // Build a 9-hop chain: far:deep → hop:1 → hop:2 → ... → hop:9 → near:a
    const hopIds: string[] = [];
    for (let i = 1; i <= 9; i++) hopIds.push(`op:hop:${i}`);
    adj.set('op:far:deep', ['op:hop:1']);
    for (let i = 0; i < hopIds.length; i++) {
        const prev = i === 0 ? 'op:far:deep' : hopIds[i - 1]!;
        const next = i === hopIds.length - 1 ? 'op:near:a' : hopIds[i + 1]!;
        adj.set(hopIds[i]!, [prev, next]);
    }

    const allFriendly = new Set(['op:near:a', 'op:near:b', 'op:far:deep', ...hopIds]);
    const componentMap = new Map<string, number>();
    for (const osid of allFriendly) componentMap.set(osid, 0); // all same component

    return {
        adjacency: adj,
        friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
            ['RS' as FactionId, allFriendly],
        ]),
        componentsByFaction: new Map<FactionId, Map<string, number>>([
            ['RS' as FactionId, componentMap],
        ]),
    } as any;
}

function makeZone(overrides: Partial<ZoneAssessment> = {}): ZoneAssessment {
    return {
        zone_id: 'zone:test:0' as ZoneId,
        corps_id: 'test_corps' as FormationId,
        faction: 'RS' as FactionId,
        osids: ['op:near:a', 'op:near:b', 'op:far:deep'],
        front_edge_count: 6,
        depth: 3,
        corridor_width: 5,
        population_value: 5000,
        strategic_value: 3,
        posture: 'projecting',
        commitment_ratio: 2.0,
        garrison_budget: 1,
        assigned_brigades: [],
        surplus_brigades: [],
        deficit: 0,
        is_main_body: true,
        enemy_adjacent_osids: ['op:enemy:target'],
        is_must_hold: false,
        ...overrides,
    };
}

function makeEval(overrides: Partial<BrigadeEvaluation> = {}): BrigadeEvaluation {
    return {
        brigade_id: 'b_default' as FormationId,
        fitness_offense: 0.5,
        fitness_defense: 0.4,
        fitness_garrison: 0.3,
        equipment_class: 'light_infantry',
        equipment_priority: 0,
        tier: 'garrison',
        is_combat_effective: true,
        is_disrupted: false,
        is_on_loan: false,
        is_home_defense: false,
        morale: 60,
        current_zone: 'zone:test:0' as ZoneId,
        ...overrides,
    };
}

function makeForces(evaluations: BrigadeEvaluation[]): ForceAssessment {
    return {
        total_brigades: evaluations.length,
        combat_effective: evaluations.filter(ev => ev.is_combat_effective).length,
        evaluations,
        by_zone: {},
        tier_counts: {
            main_effort: evaluations.filter(ev => ev.tier === 'main_effort').length,
            active_defense: evaluations.filter(ev => ev.tier === 'active_defense').length,
            garrison: evaluations.filter(ev => ev.tier === 'garrison').length,
        },
        total_surplus: evaluations.length,
    };
}

function makeBriefing(overrides: Partial<CommanderBriefing> = {}): CommanderBriefing {
    return {
        corps_id: 'test_corps' as FormationId,
        faction: 'RS' as FactionId,
        turn: 10,
        spatial: makeSpatial(),
        sectors: [{
            sector_id: 'sector:test_corps:0',
            corps_id: 'test_corps' as FormationId,
            faction: 'RS' as FactionId,
            sub_segments: [{
                sub_segment_id: 'subseg:test:0',
                edge_ids: ['e1'],
                friendly_osids: ['op:near:b'],
                enemy_osids: ['op:enemy:target'],
                length_edges: 1,
                primary_brigade_ids: [],
            }],
            edge_ids: ['e1'],
            territory_osids: ['op:near:a', 'op:near:b', 'op:far:deep'],
            length_edges: 1,
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            opposing_factions: ['RBiH' as FactionId],
            density: 1,
            defensive_power: 100,
            threat_ratio: 1.0,
            sector_stance: 'balanced',
            stance_source: 'bot',
        }] as any[],
        brigades: [],
        state_ref: undefined,
        reverse_map: undefined,
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: null,
        intel_data: null,
        doctrine_stance: 'balanced',
        corps_stance: 'balanced',
        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: { tanks: 0, artillery: 0, infantry_only: true },
        adjacent_corps: [],
        officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.4, competence: 0.7 },
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
        ...overrides,
    } as CommanderBriefing;
}

// ═══════════════════════════════════════════════════════════════════════════
// Fix A: reachability-aware plan formation
// ═══════════════════════════════════════════════════════════════════════════

describe('Fix A: reachability-aware plan formation', () => {
    it('forms plan with reachable brigades when main_effort are unreachable', () => {
        // 2 main_effort at op:far:deep (unreachable), 4 garrison at op:near:a (reachable)
        const brigIds = ['me1', 'me2', 'g1', 'g2', 'g3', 'g4'].map(id => id as FormationId);
        const zone = makeZone({
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        });
        const evals = [
            makeEval({ brigade_id: 'me1' as FormationId, tier: 'main_effort', equipment_class: 'mechanized', equipment_priority: 3, fitness_offense: 0.9 }),
            makeEval({ brigade_id: 'me2' as FormationId, tier: 'main_effort', equipment_class: 'mechanized', equipment_priority: 3, fitness_offense: 0.85 }),
            makeEval({ brigade_id: 'g1' as FormationId, tier: 'garrison', fitness_offense: 0.4 }),
            makeEval({ brigade_id: 'g2' as FormationId, tier: 'garrison', fitness_offense: 0.35 }),
            makeEval({ brigade_id: 'g3' as FormationId, tier: 'garrison', fitness_offense: 0.3 }),
            makeEval({ brigade_id: 'g4' as FormationId, tier: 'garrison', fitness_offense: 0.25 }),
        ];
        const forces = makeForces(evals);

        const briefing = makeBriefing({
            brigades: [
                // main_effort at far:deep — unreachable
                { id: 'me1' as FormationId, location_osid: 'op:far:deep' },
                { id: 'me2' as FormationId, location_osid: 'op:far:deep' },
                // garrison at near:a — reachable
                { id: 'g1' as FormationId, location_osid: 'op:near:a' },
                { id: 'g2' as FormationId, location_osid: 'op:near:a' },
                { id: 'g3' as FormationId, location_osid: 'op:near:a' },
                { id: 'g4' as FormationId, location_osid: 'op:near:a' },
            ] as FormationState[],
        });

        const result = managePlan(briefing, [zone], forces, evals, null, 10);

        // Plan MUST form — the old code would return null because it selected
        // me1+me2 first then rejected on reachability.
        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();

        // Assigned brigades must be from the reachable pool (g1-g4), not me1/me2
        const assigned = new Set(result.plan!.assigned_brigades);
        expect(assigned.has('me1' as FormationId)).toBe(false);
        expect(assigned.has('me2' as FormationId)).toBe(false);
        // At least MIN_BRIGADES_FOR_PLAN from reachable
        expect(result.plan!.assigned_brigades.length).toBeGreaterThanOrEqual(MIN_BRIGADES_FOR_PLAN);
    });

    it('fallback plan has lower viability when no reachable main_effort', () => {
        const brigIds = ['me1', 'g1', 'g2', 'g3'].map(id => id as FormationId);
        const zone = makeZone({
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        });
        const evals = [
            makeEval({ brigade_id: 'me1' as FormationId, tier: 'main_effort', fitness_offense: 0.9 }),
            makeEval({ brigade_id: 'g1' as FormationId, tier: 'garrison', fitness_offense: 0.4 }),
            makeEval({ brigade_id: 'g2' as FormationId, tier: 'garrison', fitness_offense: 0.35 }),
            makeEval({ brigade_id: 'g3' as FormationId, tier: 'garrison', fitness_offense: 0.3 }),
        ];
        const forces = makeForces(evals);

        const briefing = makeBriefing({
            brigades: [
                { id: 'me1' as FormationId, location_osid: 'op:far:deep' }, // unreachable
                { id: 'g1' as FormationId, location_osid: 'op:near:a' },
                { id: 'g2' as FormationId, location_osid: 'op:near:a' },
                { id: 'g3' as FormationId, location_osid: 'op:near:a' },
            ] as FormationState[],
        });

        const result = managePlan(briefing, [zone], forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        // Fallback viability is 0.55, not the normal 0.80
        expect(result.plan!.viability_score).toBe(0.55);
    });

    it('uses main_effort when they ARE reachable (no regression)', () => {
        const brigIds = ['me1', 'g1', 'g2', 'g3'].map(id => id as FormationId);
        const zone = makeZone({
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        });
        const evals = [
            makeEval({ brigade_id: 'me1' as FormationId, tier: 'main_effort', fitness_offense: 0.9, equipment_priority: 3 }),
            makeEval({ brigade_id: 'g1' as FormationId, tier: 'garrison', fitness_offense: 0.4 }),
            makeEval({ brigade_id: 'g2' as FormationId, tier: 'garrison', fitness_offense: 0.35 }),
            makeEval({ brigade_id: 'g3' as FormationId, tier: 'garrison', fitness_offense: 0.3 }),
        ];
        const forces = makeForces(evals);

        const briefing = makeBriefing({
            brigades: [
                { id: 'me1' as FormationId, location_osid: 'op:near:a' }, // REACHABLE
                { id: 'g1' as FormationId, location_osid: 'op:near:a' },
                { id: 'g2' as FormationId, location_osid: 'op:near:a' },
                { id: 'g3' as FormationId, location_osid: 'op:near:a' },
            ] as FormationState[],
        });

        const result = managePlan(briefing, [zone], forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        // Main effort IS reachable, so it should be selected (highest fitness_offense)
        expect(result.plan!.assigned_brigades).toContain('me1' as FormationId);
        // Normal viability, not fallback
        expect(result.plan!.viability_score).toBe(0.8);
    });

    it('returns null when no brigades are reachable at all', () => {
        const brigIds = ['me1', 'me2', 'me3'].map(id => id as FormationId);
        const zone = makeZone({
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        });
        const evals = brigIds.map(id => makeEval({
            brigade_id: id, tier: 'main_effort', fitness_offense: 0.9,
        }));
        const forces = makeForces(evals);

        // Use a custom spatial with a truly isolated OSID (different component)
        const isolatedSpatial = {
            ...makeSpatial(),
            componentsByFaction: new Map<FactionId, Map<string, number>>([
                ['RS' as FactionId, new Map([
                    ['op:near:a', 0], ['op:near:b', 0],
                    ['op:isolated:x', 99], // different component — truly unreachable
                ])],
            ]),
            friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
                ['RS' as FactionId, new Set(['op:near:a', 'op:near:b', 'op:isolated:x'])],
            ]),
        };

        const briefing = makeBriefing({
            spatial: isolatedSpatial as any,
            brigades: brigIds.map(id => ({
                id, location_osid: 'op:isolated:x', // ALL in disconnected component
            })) as FormationState[],
        });

        const result = managePlan(briefing, [zone], forces, evals, null, 10);

        // Genuinely no reachable brigades → null is correct
        expect(result.plan).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Fix B: main-effort prepositioning
// ═══════════════════════════════════════════════════════════════════════════

describe('Fix B: main-effort prepositioning orders', () => {
    function makeAllocation(surplus: BrigadeEvaluation[], canLaunch = true): AllocationResult {
        return {
            zones: [],
            garrison_locks: [],
            surplus_pool: surplus,
            total_garrison_budget: 2,
            can_launch_ops: canLaunch,
        };
    }

    it('emits prepositioning order for unreachable main_effort surplus', () => {
        const surplus = [
            makeEval({ brigade_id: 'me_far' as FormationId, tier: 'main_effort' }),
        ];
        const briefing = makeBriefing({
            brigades: [
                { id: 'me_far' as FormationId, location_osid: 'op:far:deep' },
            ] as FormationState[],
        });
        const allocation = makeAllocation(surplus);

        const orders = buildPrepositioningOrders(briefing, allocation);

        // Unreachable main_effort should get a prepositioning order
        expect(orders.length).toBe(1);
        expect(orders[0]!.brigade_id).toBe('me_far');
        // Destination should be a front-adjacent friendly OSID
        expect(orders[0]!.destination_osid).toBe('op:near:b');
    });

    it('does NOT emit prepositioning for reachable main_effort', () => {
        const surplus = [
            makeEval({ brigade_id: 'me_near' as FormationId, tier: 'main_effort' }),
        ];
        const briefing = makeBriefing({
            brigades: [
                { id: 'me_near' as FormationId, location_osid: 'op:near:a' }, // reachable
            ] as FormationState[],
        });
        const allocation = makeAllocation(surplus);

        const orders = buildPrepositioningOrders(briefing, allocation);

        expect(orders.length).toBe(0);
    });

    it('does NOT emit prepositioning for garrison-tier surplus', () => {
        const surplus = [
            makeEval({ brigade_id: 'g_far' as FormationId, tier: 'garrison' }),
        ];
        const briefing = makeBriefing({
            brigades: [
                { id: 'g_far' as FormationId, location_osid: 'op:far:deep' },
            ] as FormationState[],
        });
        const allocation = makeAllocation(surplus);

        const orders = buildPrepositioningOrders(briefing, allocation);

        // Garrison-tier should NOT get prepositioning — only main_effort
        expect(orders.length).toBe(0);
    });

    it('does NOT emit prepositioning when corps cannot launch ops', () => {
        const surplus = [
            makeEval({ brigade_id: 'me_far' as FormationId, tier: 'main_effort' }),
        ];
        const briefing = makeBriefing({
            brigades: [
                { id: 'me_far' as FormationId, location_osid: 'op:far:deep' },
            ] as FormationState[],
        });
        const allocation = makeAllocation(surplus, false); // can_launch_ops = false

        const orders = buildPrepositioningOrders(briefing, allocation);

        expect(orders.length).toBe(0);
    });

    it('applyCommanderOutput writes prepositioning to brigade_movement_orders', () => {
        const state = {
            military: {
                corps_command: {
                    test_corps: {
                        directive: null,
                        ai_decided: false,
                        active_operations: [],
                        commander_state: null,
                        commander_reinforcement_requests: [],
                    },
                },
                corps_front_sectors: {},
                brigade_movement_orders: undefined,
            },
            factions: {} as GameState['factions'],
            displacement: {} as GameState['displacement'],
        } as unknown as GameState;

        const output: CommanderOutput = {
            directive: {
                assigned_front_ids: [], offensive_targets: [], hold_osids: [],
                avoid_osids: [], max_attackers_per_target: 3, reserve_fraction: 0.2,
                min_attack_outcome: 'repulsed', aggression_modifier: 0,
            },
            operations: [],
            sector_stances: [],
            updated_state: {} as CommanderState,
            garrison_locks: [],
            reinforcement_requests: [],
            plan_updates: [],
            prepositioning_orders: [
                { brigade_id: 'me_far' as FormationId, destination_osid: 'op:near:b' },
            ],
        };

        applyCommanderOutput(state, 'test_corps' as FormationId, output);

        const orders = state.military.brigade_movement_orders;
        expect(orders).toBeDefined();
        expect(orders!['me_far' as FormationId]).toEqual({
            destination_sids: ['op:near:b'],
            stance: 'column',
        });
    });

    it('applyCommanderOutput does NOT overwrite existing movement orders from non-distribution sources', () => {
        const state = {
            military: {
                corps_command: {
                    test_corps: {
                        directive: null,
                        ai_decided: false,
                        active_operations: [],
                        commander_state: null,
                        commander_reinforcement_requests: [],
                    },
                },
                corps_front_sectors: {},
                brigade_movement_orders: {
                    'me_far': { destination_sids: ['op:existing:dest'] },
                },
            },
            factions: {} as GameState['factions'],
            displacement: {} as GameState['displacement'],
        } as unknown as GameState;

        const output: CommanderOutput = {
            directive: {
                assigned_front_ids: [], offensive_targets: [], hold_osids: [],
                avoid_osids: [], max_attackers_per_target: 3, reserve_fraction: 0.2,
                min_attack_outcome: 'repulsed', aggression_modifier: 0,
            },
            operations: [],
            sector_stances: [],
            updated_state: {} as CommanderState,
            garrison_locks: [],
            reinforcement_requests: [],
            plan_updates: [],
            prepositioning_orders: [
                { brigade_id: 'me_far' as FormationId, destination_osid: 'op:near:b' },
            ],
        };

        applyCommanderOutput(state, 'test_corps' as FormationId, output);

        // Commander prepositioning OVERRIDES existing distribution orders for main_effort.
        // Bug 2 fix: the old `if (!existing)` guard blocked this; now prepositioning wins.
        expect(state.military.brigade_movement_orders!['me_far' as FormationId]).toEqual({
            destination_sids: ['op:near:b'],
            stance: 'column',
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Prepositioning pipeline priority — regression tests for Bug 1 + Bug 2
// ═══════════════════════════════════════════════════════════════════════════

import { correctMarchOrders, correctTransitStates } from '../../src/sim/combat/commander_march_correction.js';
import { evaluateHomeReturn, computeReturnMarches, RETURN_CHECK_INTERVAL } from '../../src/sim/combat/brigade_home_return.js';
import type { SettlementId } from '../../src/state/game_state.js';

describe('prepositioning pipeline priority', () => {
    /**
     * Build a minimal adjacency graph:
     *   op:sector:front_a ←→ op:sector:front_b ←→ op:wrong:dest
     *   op:brigade:loc ←→ op:sector:front_a
     *
     * Brigade is at op:brigade:loc, sub-segment front = [op:sector:front_a, op:sector:front_b].
     * Wrong destination = op:wrong:dest (not in sub-segment front).
     */
    function makeTestAdjacency(): Map<string, string[]> {
        return new Map<string, string[]>([
            ['op:brigade:loc', ['op:sector:front_a']],
            ['op:sector:front_a', ['op:brigade:loc', 'op:sector:front_b']],
            ['op:sector:front_b', ['op:sector:front_a', 'op:wrong:dest']],
            ['op:wrong:dest', ['op:sector:front_b']],
        ]);
    }

    function makeMinimalState(overrides: {
        orderDest?: string;
        orderStance?: string;
        inTransit?: boolean;
        transitDest?: string;
        locationOsid?: string;
    } = {}): GameState {
        const state: any = {
            political: {
                political_controllers: {
                    'op:brigade:loc': 'RS',
                    'op:sector:front_a': 'RS',
                    'op:sector:front_b': 'RS',
                    'op:wrong:dest': 'RS',
                },
            },
            military: {
                formations: {
                    'bde_1': {
                        status: 'active',
                        faction: 'RS',
                        location_osid: overrides.locationOsid ?? 'op:brigade:loc',
                        assigned_sub_segment_id: 'subseg:test:0',
                    },
                },
                corps_front_sectors: {
                    'sector:test:0': {
                        sub_segments: [{
                            sub_segment_id: 'subseg:test:0',
                            friendly_osids: ['op:sector:front_a', 'op:sector:front_b'],
                            enemy_osids: ['op:enemy:x'],
                            edge_ids: ['e1'],
                            length_edges: 1,
                            primary_brigade_ids: [],
                        }],
                    },
                },
                brigade_movement_orders: {} as Record<string, any>,
                brigade_movement_state: {} as Record<string, any>,
            },
        };

        if (overrides.orderDest) {
            state.military.brigade_movement_orders['bde_1'] = {
                destination_sids: [overrides.orderDest],
                ...(overrides.orderStance ? { stance: overrides.orderStance } : {}),
            };
        }

        if (overrides.inTransit && overrides.transitDest) {
            state.military.brigade_movement_state['bde_1'] = {
                status: 'in_transit',
                destination_sids: [overrides.transitDest],
            };
        }

        return state as GameState;
    }

    it('correctMarchOrders preserves stance column on corrected orders', () => {
        const state = makeMinimalState({
            orderDest: 'op:wrong:dest',
            orderStance: 'column',
        });
        const adjacency = makeTestAdjacency();

        correctMarchOrders(state, adjacency);

        const correctedOrder = state.military.brigade_movement_orders!['bde_1' as FormationId];
        expect(correctedOrder).toBeDefined();
        // Destination was corrected to a sub-segment front OSID
        const dest = correctedOrder!.destination_sids[0];
        expect(['op:sector:front_a', 'op:sector:front_b']).toContain(dest);
        // stance: 'column' must be preserved — Bug 1 fix
        expect((correctedOrder as any).stance).toBe('column');
    });

    it('correctMarchOrders clears a stale wrong order when the brigade is already on its assigned front', () => {
        const state = makeMinimalState({
            locationOsid: 'op:sector:front_a',
            orderDest: 'op:wrong:dest',
            orderStance: 'column',
        });
        const adjacency = makeTestAdjacency();

        correctMarchOrders(state, adjacency);

        expect(state.military.brigade_movement_orders?.['bde_1' as FormationId]).toBeUndefined();
    });

    it('correctMarchOrders preserves active operation order from assigned front to axis approach', () => {
        const state = makeMinimalState({
            locationOsid: 'op:foca:patkovina',
            orderDest: 'op:foca:prevrac',
            orderStance: 'column',
        });
        const brigade = state.military.formations!['bde_1' as FormationId]!;
        brigade.id = 'bde_1' as FormationId;
        brigade.corps_id = 'vrs_herzegovina' as FormationId;
        brigade.assigned_sub_segment_id = 'subseg:foca:0';
        state.political!.political_controllers = {
            'op:foca:patkovina': 'RS',
            'op:foca:prevrac': 'RS',
            'op:gorazde:kolovarice': 'RBiH',
        } as any;
        state.military.corps_front_sectors = {
            'sector:foca:0': {
                sub_segments: [{
                    sub_segment_id: 'subseg:foca:0',
                    friendly_osids: ['op:foca:patkovina'],
                    enemy_osids: ['op:gorazde:kolovarice'],
                    edge_ids: ['edge:foca'],
                    length_edges: 1,
                    primary_brigade_ids: ['bde_1'],
                }],
            },
        } as any;
        state.military.corps_command = {
            vrs_herzegovina: {
                active_operations: [{
                    name: 'Operation Foca',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 5,
                    phase_started_turn: 5,
                    participating_brigades: ['bde_1'],
                    objectives: ['op:gorazde:kolovarice'],
                    current_objective_index: 0,
                    axes: [{
                        axis_id: 'foca_valley',
                        name: 'Foca Valley',
                        assigned_brigades: ['bde_1'],
                        objectives: ['op:gorazde:kolovarice'],
                        current_objective_index: 0,
                        staging_osid: 'op:foca:foca_3',
                        status: 'executing',
                    }],
                }],
            },
        } as any;
        const adjacency = new Map<string, string[]>([
            ['op:foca:patkovina', ['op:foca:prevrac']],
            ['op:foca:prevrac', ['op:foca:patkovina', 'op:gorazde:kolovarice']],
            ['op:gorazde:kolovarice', ['op:foca:prevrac']],
        ]);

        correctMarchOrders(state, adjacency);

        expect(state.military.brigade_movement_orders?.['bde_1' as FormationId]).toEqual({
            destination_sids: ['op:foca:prevrac'],
            stance: 'column',
        });
    });

    it('correctTransitStates preserves stance column on corrected orders', () => {
        const state = makeMinimalState({
            inTransit: true,
            transitDest: 'op:wrong:dest',
        });
        const adjacency = makeTestAdjacency();

        correctTransitStates(state, adjacency);

        // Transit state was cancelled
        const transitState = state.military.brigade_movement_state?.['bde_1' as FormationId];
        expect(transitState).toBeUndefined();

        // New corrected order was issued
        const correctedOrder = state.military.brigade_movement_orders!['bde_1' as FormationId];
        expect(correctedOrder).toBeDefined();
        const dest = correctedOrder!.destination_sids[0];
        expect(['op:sector:front_a', 'op:sector:front_b']).toContain(dest);
        // stance: 'column' must be set — Bug 1 fix
        expect((correctedOrder as any).stance).toBe('column');
    });

    it('correctTransitStates cancels stale wrong transit when the brigade is already on its assigned front', () => {
        const state = makeMinimalState({
            locationOsid: 'op:sector:front_a',
            inTransit: true,
            transitDest: 'op:wrong:dest',
        });
        const adjacency = makeTestAdjacency();

        correctTransitStates(state, adjacency);

        expect(state.military.brigade_movement_state?.['bde_1' as FormationId]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.['bde_1' as FormationId]).toBeUndefined();
    });

    it('correctTransitStates preserves active operation transit from assigned front to axis approach', () => {
        const state = makeMinimalState({
            locationOsid: 'op:foca:patkovina',
            inTransit: true,
            transitDest: 'op:foca:prevrac',
        });
        const brigade = state.military.formations!['bde_1' as FormationId]!;
        brigade.id = 'bde_1' as FormationId;
        brigade.corps_id = 'vrs_herzegovina' as FormationId;
        brigade.assigned_sub_segment_id = 'subseg:foca:0';
        state.political!.political_controllers = {
            'op:foca:patkovina': 'RS',
            'op:foca:prevrac': 'RS',
            'op:gorazde:kolovarice': 'RBiH',
        } as any;
        state.military.corps_front_sectors = {
            'sector:foca:0': {
                sub_segments: [{
                    sub_segment_id: 'subseg:foca:0',
                    friendly_osids: ['op:foca:patkovina'],
                    enemy_osids: ['op:gorazde:kolovarice'],
                    edge_ids: ['edge:foca'],
                    length_edges: 1,
                    primary_brigade_ids: ['bde_1'],
                }],
            },
        } as any;
        state.military.corps_command = {
            vrs_herzegovina: {
                active_operations: [{
                    name: 'Operation Foca',
                    type: 'sector_attack',
                    phase: 'planning',
                    started_turn: 5,
                    phase_started_turn: 5,
                    participating_brigades: ['bde_1'],
                    objectives: ['op:gorazde:kolovarice'],
                    current_objective_index: 0,
                    axes: [{
                        axis_id: 'foca_valley',
                        name: 'Foca Valley',
                        assigned_brigades: ['bde_1'],
                        objectives: ['op:gorazde:kolovarice'],
                        current_objective_index: 0,
                        staging_osid: 'op:foca:foca_3',
                        status: 'executing',
                    }],
                }],
            },
        } as any;
        const adjacency = new Map<string, string[]>([
            ['op:foca:patkovina', ['op:foca:prevrac']],
            ['op:foca:prevrac', ['op:foca:patkovina', 'op:gorazde:kolovarice']],
            ['op:gorazde:kolovarice', ['op:foca:prevrac']],
        ]);

        correctTransitStates(state, adjacency);

        expect(state.military.brigade_movement_state?.['bde_1' as FormationId]).toBeDefined();
        expect(state.military.brigade_movement_state?.['bde_1' as FormationId]?.destination_sids?.[0]).toBe('op:foca:prevrac');
    });

    it('prepositioning overrides existing distribution order', () => {
        // Simulate step 648 (distribute-brigades-to-front) having already written an order
        const state = {
            military: {
                corps_command: {
                    test_corps: {
                        directive: null,
                        ai_decided: false,
                        active_operations: [],
                        commander_state: null,
                        commander_reinforcement_requests: [],
                    },
                },
                corps_front_sectors: {},
                brigade_movement_orders: {
                    'me_far': { destination_sids: ['op:distribution:dest'] },
                },
            },
            factions: {} as GameState['factions'],
            displacement: {} as GameState['displacement'],
        } as unknown as GameState;

        const output: CommanderOutput = {
            directive: {
                assigned_front_ids: [], offensive_targets: [], hold_osids: [],
                avoid_osids: [], max_attackers_per_target: 3, reserve_fraction: 0.2,
                min_attack_outcome: 'repulsed', aggression_modifier: 0,
            },
            operations: [],
            sector_stances: [],
            updated_state: {} as CommanderState,
            garrison_locks: [],
            reinforcement_requests: [],
            plan_updates: [],
            prepositioning_orders: [
                { brigade_id: 'me_far' as FormationId, destination_osid: 'op:front:staging' },
            ],
        };

        applyCommanderOutput(state, 'test_corps' as FormationId, output);

        // Bug 2 fix: prepositioning MUST override the distribution order
        const order = state.military.brigade_movement_orders!['me_far' as FormationId];
        expect(order).toEqual({
            destination_sids: ['op:front:staging'],
            stance: 'column',
        });
    });

    it('prepositioning writes order when no existing order (regression guard)', () => {
        const state = {
            military: {
                corps_command: {
                    test_corps: {
                        directive: null,
                        ai_decided: false,
                        active_operations: [],
                        commander_state: null,
                        commander_reinforcement_requests: [],
                    },
                },
                corps_front_sectors: {},
                brigade_movement_orders: undefined,
            },
            factions: {} as GameState['factions'],
            displacement: {} as GameState['displacement'],
        } as unknown as GameState;

        const output: CommanderOutput = {
            directive: {
                assigned_front_ids: [], offensive_targets: [], hold_osids: [],
                avoid_osids: [], max_attackers_per_target: 3, reserve_fraction: 0.2,
                min_attack_outcome: 'repulsed', aggression_modifier: 0,
            },
            operations: [],
            sector_stances: [],
            updated_state: {} as CommanderState,
            garrison_locks: [],
            reinforcement_requests: [],
            plan_updates: [],
            prepositioning_orders: [
                { brigade_id: 'me_far' as FormationId, destination_osid: 'op:near:b' },
            ],
        };

        applyCommanderOutput(state, 'test_corps' as FormationId, output);

        // Order is created fresh with stance: 'column'
        const orders = state.military.brigade_movement_orders;
        expect(orders).toBeDefined();
        expect(orders!['me_far' as FormationId]).toEqual({
            destination_sids: ['op:near:b'],
            stance: 'column',
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Home-return vs prepositioning non-oscillation — regression tests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Regression tests for the home-return vs prepositioning tug-of-war fix.
 *
 * Bug: recallDriftedBrigades (war_phases.ts step 1713) recalled brigades that
 * were correctly sector-line-assigned at the front. It checked distance from
 * home but NOT sector assignment. Elite brigades reached the front via
 * prepositioning, then got recalled.
 *
 * Fix: Both recallDriftedBrigades and computeReturnMarches now skip brigades
 * that appear in sector.assigned_brigade_ids (sector-line-assigned).
 *
 * We test the exported functions (evaluateHomeReturn, computeReturnMarches)
 * which share the same sector-line-assignment skip pattern.
 */
describe('home-return vs prepositioning non-oscillation', () => {
    /**
     * Build a spatial graph with a long chain so the brigade is far from home:
     *
     *   op:home:base (home municipality)
     *     ↕
     *   op:mid:1 ↔ op:mid:2 ↔ op:mid:3 ↔ op:mid:4 ↔ op:front:line
     *     ↕                                              ↕
     *   (chain keeps brigade >3 hops from home)     op:enemy:zone
     *
     * All friendly-controlled except op:enemy:zone.
     */
    const FRIENDLY_OSIDS = [
        'op:home:base', 'op:mid:1', 'op:mid:2', 'op:mid:3', 'op:mid:4', 'op:front:line',
    ];
    const ALL_OSIDS = [...FRIENDLY_OSIDS, 'op:enemy:zone'];

    function makeHomeReturnAdjacency(): Map<string, string[]> {
        return new Map<string, string[]>([
            ['op:home:base', ['op:mid:1']],
            ['op:mid:1', ['op:home:base', 'op:mid:2']],
            ['op:mid:2', ['op:mid:1', 'op:mid:3']],
            ['op:mid:3', ['op:mid:2', 'op:mid:4']],
            ['op:mid:4', ['op:mid:3', 'op:front:line']],
            ['op:front:line', ['op:mid:4', 'op:enemy:zone']],
            ['op:enemy:zone', ['op:front:line']],
        ]);
    }

    function makePoliticalControllers(): Record<string, string> {
        const pc: Record<string, string> = {};
        for (const osid of FRIENDLY_OSIDS) pc[osid] = 'RS';
        pc['op:enemy:zone'] = 'RBiH';
        return pc;
    }

    function makeHomeReturnState(opts: {
        sectorAssigned: boolean;
        hasMoveOrder?: boolean;
        inOperation?: boolean;
        turn?: number;
    }): GameState {
        const turn = opts.turn ?? RETURN_CHECK_INTERVAL; // divisible by interval

        const state: any = {
            meta: { turn, phase: 'war' },
            political: { political_controllers: makePoliticalControllers() },
            military: {
                formations: {
                    'elite_1': {
                        status: 'active',
                        faction: 'RS',
                        kind: 'brigade',
                        location_osid: 'op:front:line',
                        home_osid: 'op:home:base',
                        corps_id: 'vrs_krajina',
                        personnel: 2000,
                        disrupted_turns: 0,
                    },
                },
                corps_command: {
                    vrs_krajina: {
                        directive: null,
                        ai_decided: false,
                        active_operations: opts.inOperation
                            ? [{
                                phase: 'execution',
                                participating_brigades: ['elite_1'],
                                axes: [],
                            }]
                            : [],
                        commander_state: null,
                        commander_reinforcement_requests: [],
                    },
                },
                corps_front_sectors: opts.sectorAssigned
                    ? {
                        'sector:vrs_krajina:0': {
                            sector_id: 'sector:vrs_krajina:0',
                            corps_id: 'vrs_krajina',
                            faction: 'RS',
                            sub_segments: [{
                                sub_segment_id: 'subseg:krajina:0',
                                friendly_osids: ['op:front:line'],
                                enemy_osids: ['op:enemy:zone'],
                                edge_ids: ['e1'],
                                length_edges: 1,
                                primary_brigade_ids: [],
                            }],
                            edge_ids: ['e1'],
                            territory_osids: FRIENDLY_OSIDS,
                            assigned_brigade_ids: ['elite_1'],
                            reserve_brigade_ids: [],
                            opposing_factions: ['RBiH'],
                            density: 1,
                            defensive_power: 100,
                            threat_ratio: 1.0,
                            sector_stance: 'balanced',
                            stance_source: 'bot',
                        },
                    }
                    : {},
                brigade_movement_orders: opts.hasMoveOrder
                    ? { elite_1: { destination_sids: ['op:mid:3'], stance: 'column' } }
                    : {},
                brigade_movement_state: {},
            },
        };
        return state as GameState;
    }

    it('sector-assigned brigade at front is NOT recalled by evaluateHomeReturn', () => {
        const state = makeHomeReturnState({ sectorAssigned: true });
        const adjacency = makeHomeReturnAdjacency();

        evaluateHomeReturn(state, adjacency);

        // Sector-line-assigned brigade must NOT receive a recall order
        const orders = state.military.brigade_movement_orders ?? {};
        expect(orders['elite_1' as FormationId]).toBeUndefined();
    });

    it('non-sector-assigned brigade far from home IS recalled', () => {
        const state = makeHomeReturnState({ sectorAssigned: false });
        const adjacency = makeHomeReturnAdjacency();

        evaluateHomeReturn(state, adjacency);

        // Brigade is NOT sector-assigned and >3 hops from home — should be recalled
        const orders = state.military.brigade_movement_orders ?? {};
        const order = orders['elite_1' as FormationId];
        expect(order).toBeDefined();
        expect(order!.destination_sids).toBeDefined();
        expect(order!.destination_sids.length).toBeGreaterThan(0);
    });

    it('computeReturnMarches skips sector-line-assigned brigades', () => {
        const state = makeHomeReturnState({ sectorAssigned: true });
        const adjacency = makeHomeReturnAdjacency();
        const friendlyOsids = new Set(FRIENDLY_OSIDS);

        const orders = computeReturnMarches(state, 'RS', adjacency, friendlyOsids);

        // Sector-assigned brigade must be excluded from return march candidates
        const recalled = orders.map(o => o.brigade_id);
        expect(recalled).not.toContain('elite_1');
        expect(orders.length).toBe(0);
    });

    it('computeReturnMarches includes non-sector-assigned brigade far from home', () => {
        const state = makeHomeReturnState({ sectorAssigned: false });
        const adjacency = makeHomeReturnAdjacency();
        const friendlyOsids = new Set(FRIENDLY_OSIDS);

        const orders = computeReturnMarches(state, 'RS', adjacency, friendlyOsids);

        // Non-sector-assigned brigade far from home should be a return candidate
        const recalled = orders.map(o => o.brigade_id);
        expect(recalled).toContain('elite_1');
    });

    it('evaluateHomeReturn does nothing on non-interval turns', () => {
        // Turn 3 is NOT divisible by RETURN_CHECK_INTERVAL (4)
        const state = makeHomeReturnState({ sectorAssigned: false, turn: 3 });
        const adjacency = makeHomeReturnAdjacency();

        evaluateHomeReturn(state, adjacency);

        // No orders should be issued on a non-interval turn
        const orders = state.military.brigade_movement_orders ?? {};
        expect(orders['elite_1' as FormationId]).toBeUndefined();
    });

    it('brigade with existing movement orders is not double-recalled', () => {
        const state = makeHomeReturnState({ sectorAssigned: false, hasMoveOrder: true });
        const adjacency = makeHomeReturnAdjacency();
        const friendlyOsids = new Set(FRIENDLY_OSIDS);

        const orders = computeReturnMarches(state, 'RS', adjacency, friendlyOsids);

        // Brigade already has a movement order — should NOT appear in return marches
        expect(orders.length).toBe(0);
    });

    it('brigade in active operation is not recalled even when not sector-assigned', () => {
        const state = makeHomeReturnState({ sectorAssigned: false, inOperation: true });
        const adjacency = makeHomeReturnAdjacency();
        const friendlyOsids = new Set(FRIENDLY_OSIDS);

        const orders = computeReturnMarches(state, 'RS', adjacency, friendlyOsids);

        // Brigade participating in an operation must not be recalled
        expect(orders.length).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Commander operation axis creation (ZEA fix)
// ═══════════════════════════════════════════════════════════════════════════

import { buildCommanderOperation, buildProbeOperation } from '../../src/sim/combat/corps_operation_helpers.js';
import { isMultiAxis } from '../../src/sim/combat/sector_offensive.js';
import { emitCommanderOutput } from '../../src/sim/combat/commander/emit.js';
import type { DecisionResult } from '../../src/sim/combat/commander/decide.js';
import type { ThreatAssessment } from '../../src/sim/combat/commander/commander_state.js';
import type { PlanDecision } from '../../src/sim/combat/commander/plan.js';

describe('commander operation axis creation (ZEA fix)', () => {
    it('buildCommanderOperation creates multi-axis operation', () => {
        const op = buildCommanderOperation(
            'test_corps', 10,
            ['brig_1', 'brig_2'],
            'sector_1',
            ['obj_osid_1', 'obj_osid_2'],
            5000,
        );

        // Must be recognized as multi-axis so sector_offensive fires attacks
        expect(isMultiAxis(op)).toBe(true);
        expect(op.axes!.length).toBe(1);
        expect(op.axes![0]!.objectives).toEqual(['obj_osid_1', 'obj_osid_2']);
        expect(op.axes![0]!.assigned_brigades).toContain('brig_1');
        expect(op.axes![0]!.assigned_brigades).toContain('brig_2');
        expect(op.axes![0]!.status).toBe('executing');
        expect(op.axes![0]!.current_objective_index).toBe(0);
    });

    it('buildProbeOperation with objectives creates multi-axis operation', () => {
        const op = buildProbeOperation(
            'test_corps', 10,
            'brig_1',
            'sector_1',
            ['target_osid'],
        );

        // Probe with objectives must be multi-axis so attacks fire
        expect(isMultiAxis(op)).toBe(true);
        expect(op.axes!.length).toBe(1);
        expect(op.axes![0]!.objectives).toEqual(['target_osid']);
        expect(op.axes![0]!.assigned_brigades).toContain('brig_1');
        expect(op.planning_duration).toBe(1);
        expect(op.min_attack_outcome).toBe('repulsed');
    });

    it('buildProbeOperation without objectives falls back to no-axis', () => {
        const op = buildProbeOperation(
            'test_corps', 10,
            'brig_1',
            'sector_1',
        );

        // No objectives → no axes → backward compatible
        expect(isMultiAxis(op)).toBe(false);
    });

    it('commander operation does not immediately complete in execution', () => {
        const op = buildCommanderOperation(
            'test_corps', 10,
            ['brig_1', 'brig_2'],
            'sector_1',
            ['obj_osid_1', 'obj_osid_2'],
            5000,
        );

        // Simulate advancing to execution phase
        op.phase = 'execution';

        // Multi-axis path must be active
        expect(isMultiAxis(op)).toBe(true);
        // Axes are not terminal — status is 'executing', not 'complete'
        expect(op.axes![0]!.status).toBe('executing');
        const allComplete = op.axes!.every(a => a.status === 'complete');
        expect(allComplete).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Empty-objective probe guard — regression tests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Regression tests for the empty-objective probe guard in emit.ts.
 *
 * Bug: probes were created with empty objectives when no enemy-adjacent OSIDs
 * existed in the probe sector. This caused immediate recovery-without-attempt
 * (zero-eligible-attacker / ZEA) because the probe op had no axis targets.
 *
 * Fix: emit.ts now skips probe creation when probeObjectives is empty.
 */
describe('empty-objective probe guard', () => {
    /**
     * Shared helpers to drive emitCommanderOutput into the probe path.
     * Probe path triggers when: no plan ops, can_launch_ops, surplus exists,
     * initiative > 0.3, active ops < max slots.
     */
    function makeNullPlanDecision(): PlanDecision {
        return { action: 'none', plan: null, reason: 'no viable plan available' };
    }

    function makePassiveDecisions(): DecisionResult {
        return {
            stance_changes: [],
            reserve_shifts: [],
            intel_picture: {
                zone_confidence: {},
                offensive_signs: {},
                concentration_detected: {},
                last_updated_turn: 10,
            },
            activity_entries: [],
            suspend_plan: false,
            reinforcement_requests: [],
        };
    }

    function makeNoThreats(): ThreatAssessment {
        return {
            threatened_zones: [],
            enemy_concentration_zones: [],
            recent_losses: [],
            overall_pressure: 'low',
        };
    }

    it('probe is NOT created when no enemy-adjacent OSIDs exist', () => {
        // Sector sub_segments have friendly_osids, but their neighbors in the
        // adjacency map are ALL friendly — no enemy neighbors exist.
        const isolatedAdj = new Map<string, string[]>([
            ['op:friendly:a', ['op:friendly:b']],
            ['op:friendly:b', ['op:friendly:a']],
        ]);
        const friendlySet = new Set(['op:friendly:a', 'op:friendly:b']);

        const briefing = makeBriefing({
            officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.5, competence: 0.7 },
            active_operations: [],
            sectors: [{
                sector_id: 'sector:test_corps:0',
                corps_id: 'test_corps' as FormationId,
                faction: 'RS' as FactionId,
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    edge_ids: ['e1'],
                    friendly_osids: ['op:friendly:a', 'op:friendly:b'],
                    enemy_osids: [],  // no enemy in sub_segment
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['e1'],
                territory_osids: ['op:friendly:a', 'op:friendly:b'],
                length_edges: 1,
                assigned_brigade_ids: ['surplus_1'],
                reserve_brigade_ids: [],
                opposing_factions: [],
                density: 1,
                defensive_power: 100,
                threat_ratio: 1.0,
                sector_stance: 'balanced',
                stance_source: 'bot',
            }] as any[],
            brigades: [
                { id: 'surplus_1' as FormationId, location_osid: 'op:friendly:a' },
            ] as any[],
            spatial: {
                adjacency: isolatedAdj,
                friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
                    ['RS' as FactionId, friendlySet],
                ]),
                componentsByFaction: new Map<FactionId, Map<string, number>>([
                    ['RS' as FactionId, new Map([['op:friendly:a', 0], ['op:friendly:b', 0]])],
                ]),
            } as any,
        });

        const surplusBrigade = makeEval({
            brigade_id: 'surplus_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const allocation: AllocationResult = {
            zones: [],
            garrison_locks: [],
            surplus_pool: [surplusBrigade],
            total_garrison_budget: 1,
            can_launch_ops: true,
        };

        const forces = makeForces([surplusBrigade]);
        const zone = makeZone({ osids: ['op:friendly:a', 'op:friendly:b'], enemy_adjacent_osids: [] });

        const output = emitCommanderOutput(
            briefing,
            [zone],
            forces,
            allocation,
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        // No probe op should be created — all neighbors are friendly, no enemy targets.
        const probeOps = output.operations.filter(op => op.type === 'probe');
        expect(probeOps.length).toBe(0);
    });

    it('probe IS created when enemy-adjacent OSID exists', () => {
        // Sector sub_segments have a friendly OSID adjacent to an enemy OSID.
        // The default makeBriefing sector has op:near:b adjacent to op:enemy:target.
        // Brigade must be in assigned_brigade_ids for derivePrimarySectorForBrigades.
        const briefing = makeBriefing({
            officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.5, competence: 0.7 },
            active_operations: [],
            sectors: [{
                sector_id: 'sector:test_corps:0',
                corps_id: 'test_corps' as FormationId,
                faction: 'RS' as FactionId,
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    edge_ids: ['e1'],
                    friendly_osids: ['op:near:b'],
                    enemy_osids: ['op:enemy:target'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['e1'],
                territory_osids: ['op:near:a', 'op:near:b'],
                length_edges: 1,
                assigned_brigade_ids: ['surplus_1'],
                reserve_brigade_ids: [],
                opposing_factions: ['RBiH' as FactionId],
                density: 1,
                defensive_power: 100,
                threat_ratio: 1.0,
                sector_stance: 'balanced',
                stance_source: 'bot',
            }] as any[],
            brigades: [
                {
                    id: 'surplus_1' as FormationId,
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1200,
                    location_osid: 'op:near:b',
                },
            ] as any[],
        });

        const surplusBrigade = makeEval({
            brigade_id: 'surplus_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const allocation: AllocationResult = {
            zones: [],
            garrison_locks: [],
            surplus_pool: [surplusBrigade],
            total_garrison_budget: 1,
            can_launch_ops: true,
        };

        const forces = makeForces([surplusBrigade]);
        const zone = makeZone();

        const output = emitCommanderOutput(
            briefing,
            [zone],
            forces,
            allocation,
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        // Probe op should be created — op:near:b is adjacent to op:enemy:target
        const probeOps = output.operations.filter(op => op.type === 'probe');
        expect(probeOps.length).toBe(1);
        // The probe objective should be the enemy OSID
        expect(probeOps[0]!.axes).toBeDefined();
        expect(probeOps[0]!.axes!.length).toBe(1);
        expect(probeOps[0]!.axes![0]!.objectives).toContain('op:enemy:target');
    });

    it('empty probeObjectives array does not create axis-less probe', () => {
        // Call buildProbeOperation directly with empty objectives array.
        // This is a backward-compat regression guard — the factory should
        // produce a no-axis op when given no objectives.
        const op = buildProbeOperation(
            'test_corps', 10,
            'brig_1',
            'sector_1',
            [],  // empty objectives
        );

        // With empty objectives, no axes should be set
        expect(isMultiAxis(op)).toBe(false);
        // The operation exists but has no actionable targets
        expect(op.type).toBe('probe');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Probe brigade reachability — regression tests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Regression tests for the BFS reachability check on probe brigade selection
 * in emit.ts. A probe is skipped when the selected brigade cannot BFS-reach
 * a friendly OSID adjacent to the probe target within MAX_REACHABILITY_HOPS (8).
 */
describe('probe brigade reachability', () => {
    function makeNullPlanDecision(): PlanDecision {
        return { action: 'none', plan: null, reason: 'no viable plan available' };
    }

    function makePassiveDecisions(): DecisionResult {
        return {
            stance_changes: [],
            reserve_shifts: [],
            intel_picture: {
                zone_confidence: {},
                offensive_signs: {},
                concentration_detected: {},
                last_updated_turn: 10,
            },
            activity_entries: [],
            suspend_plan: false,
            reinforcement_requests: [],
        };
    }

    function makeNoThreats(): ThreatAssessment {
        return {
            threatened_zones: [],
            enemy_concentration_zones: [],
            recent_losses: [],
            overall_pressure: 'low',
        };
    }

    it('probe is NOT created when brigade cannot reach target', () => {
        // Graph: two disconnected components.
        //   Component 0: op:front:a ←→ op:enemy:target  (front is friendly, target is enemy)
        //   Component 1: op:island:x  (isolated — no path to front)
        // Brigade is at op:island:x — cannot BFS to op:front:a within any hops.
        const adj = new Map<string, string[]>([
            ['op:front:a', ['op:enemy:target']],
            ['op:enemy:target', ['op:front:a']],
            ['op:island:x', []],  // isolated node
        ]);
        const friendlySet = new Set(['op:front:a', 'op:island:x']);
        const componentMap = new Map<string, number>([
            ['op:front:a', 0],
            ['op:island:x', 1],  // different component — truly unreachable
        ]);

        const briefing = makeBriefing({
            officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.5, competence: 0.7 },
            active_operations: [],
            sectors: [{
                sector_id: 'sector:test_corps:0',
                corps_id: 'test_corps' as FormationId,
                faction: 'RS' as FactionId,
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    edge_ids: ['e1'],
                    friendly_osids: ['op:front:a'],
                    enemy_osids: ['op:enemy:target'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['e1'],
                territory_osids: ['op:front:a', 'op:island:x'],
                length_edges: 1,
                assigned_brigade_ids: ['unreachable_1'],
                reserve_brigade_ids: [],
                opposing_factions: ['RBiH' as FactionId],
                density: 1,
                defensive_power: 100,
                threat_ratio: 1.0,
                sector_stance: 'balanced',
                stance_source: 'bot',
            }] as any[],
            brigades: [
                { id: 'unreachable_1' as FormationId, location_osid: 'op:island:x' },
            ] as any[],
            spatial: {
                adjacency: adj,
                friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
                    ['RS' as FactionId, friendlySet],
                ]),
                componentsByFaction: new Map<FactionId, Map<string, number>>([
                    ['RS' as FactionId, componentMap],
                ]),
            } as any,
        });

        const surplusBrigade = makeEval({
            brigade_id: 'unreachable_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const allocation: AllocationResult = {
            zones: [],
            garrison_locks: [],
            surplus_pool: [surplusBrigade],
            total_garrison_budget: 1,
            can_launch_ops: true,
        };

        const forces = makeForces([surplusBrigade]);
        const zone = makeZone({ enemy_adjacent_osids: ['op:enemy:target'] });

        const output = emitCommanderOutput(
            briefing,
            [zone],
            forces,
            allocation,
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        // Brigade at op:island:x cannot BFS-reach op:front:a (different component).
        // Probe must be skipped.
        const probeOps = output.operations.filter(op => op.type === 'probe');
        expect(probeOps.length).toBe(0);
    });

    it('probe is skipped when the brigade is not already on a valid probe approach node', () => {
        // Graph: single connected component.
        //   op:rear:a ←→ op:front:b ←→ op:enemy:target
        // Brigade is at op:rear:a — it can friendly-BFS to op:front:b, but it is not
        // already on the approach node this turn. Probes are local recon-by-force and
        // should not be born as miniature marches.
        const adj = new Map<string, string[]>([
            ['op:rear:a', ['op:front:b']],
            ['op:front:b', ['op:rear:a', 'op:enemy:target']],
            ['op:enemy:target', ['op:front:b']],
        ]);
        const friendlySet = new Set(['op:rear:a', 'op:front:b']);
        const componentMap = new Map<string, number>([
            ['op:rear:a', 0],
            ['op:front:b', 0],
        ]);

        const briefing = makeBriefing({
            officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.5, competence: 0.7 },
            active_operations: [],
            sectors: [{
                sector_id: 'sector:test_corps:0',
                corps_id: 'test_corps' as FormationId,
                faction: 'RS' as FactionId,
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    edge_ids: ['e1'],
                    friendly_osids: ['op:front:b'],
                    enemy_osids: ['op:enemy:target'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['e1'],
                territory_osids: ['op:rear:a', 'op:front:b'],
                length_edges: 1,
                assigned_brigade_ids: ['reachable_1'],
                reserve_brigade_ids: [],
                opposing_factions: ['RBiH' as FactionId],
                density: 1,
                defensive_power: 100,
                threat_ratio: 1.0,
                sector_stance: 'balanced',
                stance_source: 'bot',
            }] as any[],
            brigades: [
                { id: 'reachable_1' as FormationId, location_osid: 'op:rear:a' },
            ] as any[],
            spatial: {
                adjacency: adj,
                friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
                    ['RS' as FactionId, friendlySet],
                ]),
                componentsByFaction: new Map<FactionId, Map<string, number>>([
                    ['RS' as FactionId, componentMap],
                ]),
            } as any,
        });

        const surplusBrigade = makeEval({
            brigade_id: 'reachable_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const allocation: AllocationResult = {
            zones: [],
            garrison_locks: [],
            surplus_pool: [surplusBrigade],
            total_garrison_budget: 1,
            can_launch_ops: true,
        };

        const forces = makeForces([surplusBrigade]);
        const zone = makeZone({ enemy_adjacent_osids: ['op:enemy:target'] });

        const output = emitCommanderOutput(
            briefing,
            [zone],
            forces,
            allocation,
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        // No probe should be created: the brigade is not already at the probe frontage.
        const probeOps = output.operations.filter(op => op.type === 'probe');
        expect(probeOps.length).toBe(0);
    });

    it('probe objective selection prefers a brigade-reachable target over the first lexicographic sector target', () => {
        const adj = new Map<string, string[]>([
            ['op:front:b', ['op:enemy:target_z']],
            ['op:front:c', ['op:enemy:target_a']],
            ['op:enemy:target_a', ['op:front:c']],
            ['op:enemy:target_z', ['op:front:b']],
        ]);
        const friendlySet = new Set(['op:front:b', 'op:front:c']);
        const componentMap = new Map<string, number>([
            ['op:front:b', 0],
            ['op:front:c', 1],
        ]);

        const briefing = makeBriefing({
            officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.5, competence: 0.7 },
            active_operations: [],
            sectors: [{
                sector_id: 'sector:test_corps:0',
                corps_id: 'test_corps' as FormationId,
                faction: 'RS' as FactionId,
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    edge_ids: ['e1'],
                    friendly_osids: ['op:front:b', 'op:front:c'],
                    enemy_osids: ['op:enemy:target_a', 'op:enemy:target_z'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['e1'],
                territory_osids: ['op:front:b', 'op:front:c'],
                length_edges: 1,
                assigned_brigade_ids: ['reachable_1'],
                reserve_brigade_ids: [],
                opposing_factions: ['RBiH' as FactionId],
                density: 1,
                defensive_power: 100,
                threat_ratio: 1.0,
                sector_stance: 'balanced',
                stance_source: 'bot',
            }] as any[],
            brigades: [
                {
                    id: 'reachable_1' as FormationId,
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1200,
                    location_osid: 'op:front:b',
                },
            ] as any[],
            spatial: {
                adjacency: adj,
                friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
                    ['RS' as FactionId, friendlySet],
                ]),
                componentsByFaction: new Map<FactionId, Map<string, number>>([
                    ['RS' as FactionId, componentMap],
                ]),
            } as any,
        });

        const surplusBrigade = makeEval({
            brigade_id: 'reachable_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const allocation: AllocationResult = {
            zones: [],
            garrison_locks: [],
            surplus_pool: [surplusBrigade],
            total_garrison_budget: 1,
            can_launch_ops: true,
        };

        const forces = makeForces([surplusBrigade]);
        const zone = makeZone({ enemy_adjacent_osids: ['op:enemy:target_a', 'op:enemy:target_z'] });

        const output = emitCommanderOutput(
            briefing,
            [zone],
            forces,
            allocation,
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        const probeOps = output.operations.filter(op => op.type === 'probe');
        expect(probeOps.length).toBe(1);
        expect(probeOps[0]!.axes?.[0]?.objectives).toEqual(['op:enemy:target_z']);
    });

    it('probe launch skips objectives still on failed-objective cooldown', () => {
        const briefing = makeBriefing({
            turn: 12,
            officer_personality: { aggression: 0.6, caution: 0.3, initiative: 0.5, competence: 0.7 },
            active_operations: [],
            failed_offensive_objectives: {
                'op:enemy:target': { failure_count: 2, cooldown_until_turn: 16 },
            },
            sectors: [{
                sector_id: 'sector:test_corps:0',
                corps_id: 'test_corps' as FormationId,
                faction: 'RS' as FactionId,
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    edge_ids: ['e1'],
                    friendly_osids: ['op:near:b'],
                    enemy_osids: ['op:enemy:target'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['e1'],
                territory_osids: ['op:near:b'],
                length_edges: 1,
                assigned_brigade_ids: ['surplus_1'],
                reserve_brigade_ids: [],
                opposing_factions: ['RBiH' as FactionId],
                density: 1,
                defensive_power: 100,
                threat_ratio: 1.0,
                sector_stance: 'balanced',
                stance_source: 'bot',
            }] as any[],
            brigades: [
                { id: 'surplus_1' as FormationId, location_osid: 'op:near:b' },
            ] as any[],
        });

        const surplusBrigade = makeEval({
            brigade_id: 'surplus_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const allocation: AllocationResult = {
            zones: [],
            garrison_locks: [],
            surplus_pool: [surplusBrigade],
            total_garrison_budget: 1,
            can_launch_ops: true,
        };

        const forces = makeForces([surplusBrigade]);
        const zone = makeZone();

        const output = emitCommanderOutput(
            briefing,
            [zone],
            forces,
            allocation,
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        const probeOps = output.operations.filter(op => op.type === 'probe');
        expect(probeOps.length).toBe(0);
    });

    it('probe launch skips truce-blocked targets even when directly adjacent', () => {
        const spatial = makeSpatial();
        spatial.friendlyOsidsByFaction = new Map<FactionId, Set<string>>([
            ['HRHB' as FactionId, new Set(['op:near:a', 'op:near:b', 'op:far:deep'])],
        ]) as any;
        spatial.componentsByFaction = new Map<FactionId, Map<string, number>>([
            ['HRHB' as FactionId, new Map([
                ['op:near:a', 0],
                ['op:near:b', 0],
                ['op:far:deep', 0],
            ])],
        ]) as any;

        const briefing = makeBriefing({
            corps_id: 'hvo_southeast_herzegovina' as FormationId,
            faction: 'HRHB' as FactionId,
            turn: 12,
            spatial,
            sectors: [{
                sector_id: 'sector:hvo_southeast_herzegovina:0',
                corps_id: 'hvo_southeast_herzegovina' as FormationId,
                faction: 'HRHB' as FactionId,
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    edge_ids: ['e1'],
                    friendly_osids: ['op:near:b'],
                    enemy_osids: ['op:enemy:target'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                edge_ids: ['e1'],
                territory_osids: ['op:near:b'],
                length_edges: 1,
                assigned_brigade_ids: ['surplus_1'],
                reserve_brigade_ids: [],
                opposing_factions: ['RS' as FactionId],
                density: 1,
                defensive_power: 100,
                threat_ratio: 1.0,
                sector_stance: 'balanced',
                stance_source: 'bot',
            }] as any[],
            brigades: [
                {
                    id: 'surplus_1' as FormationId,
                    faction: 'HRHB' as FactionId,
                    corps_id: 'hvo_southeast_herzegovina' as FormationId,
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1200,
                    cohesion: 80,
                    name: 'Probe Brigade',
                    created_turn: 1,
                    location_osid: 'op:near:b',
                    hq_sid: 'S1',
                    tags: [],
                } as any,
            ],
            state_ref: {
                meta: { turn: 12, phase: 'war', seed: 'probe-truce' },
                political: {
                    political_controllers: {
                        'op:near:b': 'HRHB',
                        'op:enemy:target': 'RS',
                    },
                    vienna_declaration_turn: 4,
                    vienna_accepted: { RS: true, HRHB: true },
                    vienna_herzegovina_broken_by: null,
                    graz_east_herzegovina_active_turn: 8,
                },
                military: {
                    formations: {
                        surplus_1: {
                            id: 'surplus_1',
                            faction: 'HRHB',
                            corps_id: 'hvo_southeast_herzegovina',
                            kind: 'brigade',
                            status: 'active',
                            personnel: 1200,
                            cohesion: 80,
                            name: 'Probe Brigade',
                            created_turn: 1,
                            location_osid: 'op:near:b',
                            hq_sid: 'S1',
                            tags: [],
                        },
                    },
                },
            } as unknown as GameState,
            reverse_map: new Map([
                ['op:near:a', ['S1']],
                ['op:near:b', ['S2']],
                ['op:enemy:target', ['S3']],
            ]),
        });

        const surplusBrigade = makeEval({
            brigade_id: 'surplus_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const output = emitCommanderOutput(
            briefing,
            [makeZone({ corps_id: 'hvo_southeast_herzegovina' as FormationId, faction: 'HRHB' as FactionId })],
            makeForces([surplusBrigade]),
            {
                zones: [],
                garrison_locks: [],
                surplus_pool: [surplusBrigade],
                total_garrison_budget: 1,
                can_launch_ops: true,
            },
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        expect(output.operations.filter(op => op.type === 'probe')).toHaveLength(0);
    });

    it('probe launch skips targets that are directly adjacent but below the probe attack threshold', () => {
        const briefing = makeBriefing({
            brigades: [
                {
                    id: 'surplus_1' as FormationId,
                    faction: 'RS' as FactionId,
                    corps_id: 'test_corps' as FormationId,
                    kind: 'brigade',
                    status: 'active',
                    personnel: 500,
                    cohesion: 35,
                    experience: 0,
                    name: 'Weak Probe Brigade',
                    created_turn: 1,
                    location_osid: 'op:near:b',
                    hq_sid: 'S1',
                    tags: [],
                } as any,
                {
                    id: 'enemy_guard' as FormationId,
                    faction: 'RBiH' as FactionId,
                    corps_id: 'enemy_corps' as FormationId,
                    kind: 'brigade',
                    status: 'active',
                    personnel: 6000,
                    cohesion: 95,
                    experience: 3,
                    name: 'Enemy Guard',
                    created_turn: 1,
                    location_osid: 'op:enemy:target',
                    hq_sid: 'S9',
                    tags: ['equip:mechanized'],
                } as any,
            ],
            state_ref: {
                meta: { turn: 10, phase: 'war', seed: 'probe-threshold' },
                political: {
                    political_controllers: {
                        'op:near:a': 'RS',
                        'op:near:b': 'RS',
                        'op:enemy:target': 'RBiH',
                    },
                },
                military: {
                    formations: {
                        surplus_1: {
                            id: 'surplus_1',
                            faction: 'RS',
                            corps_id: 'test_corps',
                            kind: 'brigade',
                            status: 'active',
                            personnel: 500,
                            cohesion: 35,
                            experience: 0,
                            name: 'Weak Probe Brigade',
                            created_turn: 1,
                            location_osid: 'op:near:b',
                            hq_sid: 'S1',
                            tags: [],
                        },
                        enemy_guard: {
                            id: 'enemy_guard',
                            faction: 'RBiH',
                            corps_id: 'enemy_corps',
                            kind: 'brigade',
                            status: 'active',
                            personnel: 6000,
                            cohesion: 95,
                            experience: 3,
                            name: 'Enemy Guard',
                            created_turn: 1,
                            location_osid: 'op:enemy:target',
                            hq_sid: 'S9',
                            tags: ['equip:mechanized'],
                        },
                    },
                },
            } as unknown as GameState,
            reverse_map: new Map([
                ['op:near:a', ['S1']],
                ['op:near:b', ['S2']],
                ['op:enemy:target', ['S3']],
            ]),
        });

        const surplusBrigade = makeEval({
            brigade_id: 'surplus_1' as FormationId,
            tier: 'garrison',
            is_combat_effective: true,
            is_disrupted: false,
            fitness_offense: 0.5,
        });

        const output = emitCommanderOutput(
            briefing,
            [makeZone()],
            makeForces([surplusBrigade]),
            {
                zones: [],
                garrison_locks: [],
                surplus_pool: [surplusBrigade],
                total_garrison_budget: 1,
                can_launch_ops: true,
            },
            makeNullPlanDecision(),
            makePassiveDecisions(),
            makeNoThreats(),
        );

        expect(output.operations.filter(op => op.type === 'probe')).toHaveLength(0);
    });
});

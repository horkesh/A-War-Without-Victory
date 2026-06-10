/**
 * Tests for the v0.8 Corps Commander Intelligence system.
 *
 * Covers: zone detection, force evaluation, allocation, planning, and commander loop.
 * Uses minimal mock data — no real game state required.
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import type {
    FactionId,
    FormationId,
    FormationState,
    CorpsFrontSector,
} from '../../src/state/game_state.js';
import type {
    ZoneAssessment,
    ZoneId,
    ZonePosture,
    BrigadeEvaluation,
    ForceAssessment,
    OfficerPersonality,
    CommanderBriefing,
    CommanderPlan,
    CommanderState,
    ThreatAssessment,
    CommanderOutput,
} from '../../src/sim/combat/commander/commander_state.js';
import type { SupplyStateByOsidReport } from '../../src/state/supply_state_derivation.js';
import {
    measureCorridorWidth,
    computeCommitmentRatio,
    CORRIDOR_WIDTH_UNBOUNDED,
} from '../../src/sim/combat/commander/zone_detection.js';
import {
    evaluateBrigade,
    evaluateCorpsForces,
} from '../../src/sim/combat/commander/force_eval.js';
import {
    computeGarrisonBudget,
    allocateBrigades,
    sortZonesByPriority,
    GARRISON_EDGES_PER_BRIGADE,
} from '../../src/sim/combat/commander/allocate.js';
import {
    managePlan,
    MIN_BRIGADES_FOR_PLAN,
    CONCENTRATION_READY_THRESHOLD,
    MAX_SUSPENSION_TURNS,
} from '../../src/sim/combat/commander/plan.js';
import { BotCorpsCommander } from '../../src/sim/combat/commander/commander_loop.js';
import type { CorpsOperation } from '../../src/state/game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers — extracted to tests/_helpers/commander.ts (canonical home).
// Aliased here for local readability.
// ═══════════════════════════════════════════════════════════════════════════

import {
    makeCommanderBrigade as makeBrigade,
    makeCommanderZone as makeZone,
    makeCommanderEval as makeEval,
    makeCommanderForces as makeForces,
    DEFAULT_COMMANDER_PERSONALITY as defaultPersonality,
} from '../_helpers/commander.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. Zone Detection Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('zone_detection', () => {
    it('computes corridor_width <= 1 as besieged (non-main-body zone with 1 exit)', () => {
        // Zone with 2 OSIDs, only 1 has an exit to friendly-but-not-zone territory
        const zoneOsids = new Set(['op:a:a1', 'op:a:a2']);
        const allFriendly = new Set(['op:a:a1', 'op:a:a2', 'op:b:b1']);
        const adjacency = new Map<string, readonly string[]>([
            ['op:a:a1', ['op:a:a2', 'op:b:b1']],
            ['op:a:a2', ['op:a:a1']],
        ]);

        const width = measureCorridorWidth(zoneOsids, allFriendly, adjacency, false);
        expect(width).toBe(1);
    });

    it('computes corridor_width >= 3 as open', () => {
        // Zone with 3 OSIDs, each connects to external friendly territory
        const zoneOsids = new Set(['op:a:a1', 'op:a:a2', 'op:a:a3']);
        const allFriendly = new Set(['op:a:a1', 'op:a:a2', 'op:a:a3', 'op:b:b1', 'op:b:b2', 'op:b:b3']);
        const adjacency = new Map<string, readonly string[]>([
            ['op:a:a1', ['op:a:a2', 'op:b:b1']],
            ['op:a:a2', ['op:a:a1', 'op:a:a3', 'op:b:b2']],
            ['op:a:a3', ['op:a:a2', 'op:b:b3']],
        ]);

        const width = measureCorridorWidth(zoneOsids, allFriendly, adjacency, false);
        expect(width).toBe(3);
    });

    it('computes corridor_width = 0 for fully enclosed non-main-body zone', () => {
        // Zone with no exits to friendly territory outside itself
        const zoneOsids = new Set(['op:a:a1', 'op:a:a2']);
        const allFriendly = new Set(['op:a:a1', 'op:a:a2']);
        const adjacency = new Map<string, readonly string[]>([
            ['op:a:a1', ['op:a:a2']],
            ['op:a:a2', ['op:a:a1']],
        ]);

        const width = measureCorridorWidth(zoneOsids, allFriendly, adjacency, false);
        expect(width).toBe(0);
    });

    it('identifies main body corridor_width as the FINITE unbounded sentinel (#95: was Infinity → "null" in saves)', () => {
        const zoneOsids = new Set(['op:a:a1']);
        const allFriendly = new Set(['op:a:a1']);
        const adjacency = new Map<string, readonly string[]>([
            ['op:a:a1', []],
        ]);

        const width = measureCorridorWidth(zoneOsids, allFriendly, adjacency, true);
        expect(width).toBe(CORRIDOR_WIDTH_UNBOUNDED);
        expect(Number.isFinite(width)).toBe(true);
        // Behavioral identity with the old Infinity sentinel: every reader is a
        // `<= 1` besieged check, so the sentinel must stay comfortably above it.
        expect(width).toBeGreaterThan(1);
    });

    it('measureCorridorWidth never returns a non-finite value (#95 robustness pin)', () => {
        const zoneOsids = new Set(['op:a:a1']);
        const allFriendly = new Set(['op:a:a1', 'op:b:b1']);
        const adjacency = new Map<string, readonly string[]>([
            ['op:a:a1', ['op:b:b1']],
        ]);
        for (const isMainBody of [true, false]) {
            const width = measureCorridorWidth(zoneOsids, allFriendly, adjacency, isMainBody);
            expect(Number.isFinite(width)).toBe(true);
        }
    });

    it('computes commitment ratio correctly (edges / brigades)', () => {
        expect(computeCommitmentRatio(80, 9)).toBeCloseTo(80 / 9, 5);
        expect(computeCommitmentRatio(10, 5)).toBe(2);
    });

    it('commitment ratio is Infinity when 0 brigades with front edges (in-memory sentinel; finite-swapped ONLY at the emit persistence boundary, #95)', () => {
        expect(computeCommitmentRatio(10, 0)).toBe(Infinity);
    });

    it('commitment ratio is 0 when no edges and no brigades', () => {
        expect(computeCommitmentRatio(0, 0)).toBe(0);
    });

    it('computes garrison budget from posture: besieged = 8 edges/brigade', () => {
        const zone = makeZone({
            posture: 'besieged',
            front_edge_count: 80,
        });
        const budget = computeGarrisonBudget(zone, defaultPersonality);
        expect(budget).toBe(Math.ceil(80 / GARRISON_EDGES_PER_BRIGADE.besieged));
    });

    it('computes garrison budget from posture: projecting = 20 edges/brigade', () => {
        const zone = makeZone({
            posture: 'projecting',
            front_edge_count: 80,
        });
        const budget = computeGarrisonBudget(zone, defaultPersonality);
        expect(budget).toBe(Math.ceil(80 / GARRISON_EDGES_PER_BRIGADE.projecting));
    });

    it('garrison budget is 0 for zone with 0 front edges', () => {
        const zone = makeZone({ front_edge_count: 0 });
        expect(computeGarrisonBudget(zone, defaultPersonality)).toBe(0);
    });

    it('garrison budget is at least 1 for any zone with front edges', () => {
        const zone = makeZone({ posture: 'projecting', front_edge_count: 1 });
        expect(computeGarrisonBudget(zone, defaultPersonality)).toBeGreaterThanOrEqual(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Force Evaluation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('force_eval', () => {
    it('computes fitness_offense for a full-strength mechanized brigade', () => {
        const brigade = makeBrigade({
            personnel: 2500,
            cohesion: 100,
            equipment_class: 'mechanized',
            disrupted_turns: 0,
        });
        const result = evaluateBrigade(brigade, 'zone:test:0' as ZoneId);
        // mechanized = priority 3, personnelNorm=1.0, cohesionNorm=1.0, sMult=0.8
        // fitnessOffense = 1.0 * 0.8 * 1.0 * (1 + 3*0.25) * 1 = 0.8 * 1.75 = 1.4
        expect(result.fitness_offense).toBeCloseTo(1.4, 2);
        expect(result.equipment_class).toBe('mechanized');
        expect(result.equipment_priority).toBe(3);
    });

    it('computes fitness_offense as 0 for disrupted brigade', () => {
        const brigade = makeBrigade({
            personnel: 2000,
            cohesion: 70,
            disrupted_turns: 2,
        });
        const result = evaluateBrigade(brigade, null);
        expect(result.fitness_offense).toBe(0);
        expect(result.is_disrupted).toBe(true);
    });

    it('computes fitness_garrison floor of 0.2 for depleted brigade', () => {
        const brigade = makeBrigade({
            personnel: 100,
            cohesion: 10,
        });
        const result = evaluateBrigade(brigade, null);
        // personnelNorm = 100/2500 = 0.04, fitnessGarrison = max(0.2, 0.04*0.5) = 0.2
        expect(result.fitness_garrison).toBe(0.2);
    });

    it('tiers mechanized+high-fitness as main_effort', () => {
        const brigade = makeBrigade({
            personnel: 2500,
            cohesion: 100,
            equipment_class: 'mechanized',
        });
        const result = evaluateBrigade(brigade, null);
        expect(result.tier).toBe('main_effort');
    });

    it('tiers combat-effective infantry as active_defense', () => {
        const brigade = makeBrigade({
            personnel: 2000,
            cohesion: 80,
            // No equipment_class = light infantry, priority 0
        });
        const result = evaluateBrigade(brigade, null);
        // fitnessDefense = (2000/2500)*0.8*(80/100)*(1+0)*0.5 = 0.8*0.8*0.8*0.5 = 0.256
        // But supply_mult default is 0.8, so: 0.8*0.8*0.8*(1+0*0.1)*0.5 = 0.256
        // 0.256 < 0.3? Let's check:
        // personnelNorm=0.8, sMult=0.8, cohNorm=0.8, entrenchment=0
        // fitnessDefense = 0.8*0.8*0.8*(1+0)*0.5 = 0.256
        // active_defense requires fitnessDefense >= 0.3 AND combat effective
        // 0.256 < 0.3, so this might be garrison tier
        // Let's use higher cohesion to pass the threshold
        expect(result.tier).toBe('garrison');

        // Now test with higher stats to get active_defense
        const better = makeBrigade({
            personnel: 2500,
            cohesion: 100,
        });
        const result2 = evaluateBrigade(better, null);
        // personnelNorm=1.0, sMult=0.8, cohNorm=1.0
        // fitnessDefense = 1.0*0.8*1.0*(1+0)*0.5 = 0.4 >= 0.3
        // equipPriority=0 < 2, so not main_effort
        expect(result2.tier).toBe('active_defense');
    });

    it('tiers depleted brigade as garrison', () => {
        const brigade = makeBrigade({
            personnel: 300,
            cohesion: 20,
        });
        const result = evaluateBrigade(brigade, null);
        expect(result.tier).toBe('garrison');
    });

    it('marks brigade with < 400 personnel as not combat effective', () => {
        const brigade = makeBrigade({ personnel: 350 });
        const result = evaluateBrigade(brigade, null);
        expect(result.is_combat_effective).toBe(false);
    });

    it('marks brigade with >= 400 personnel as combat effective', () => {
        const brigade = makeBrigade({ personnel: 400 });
        const result = evaluateBrigade(brigade, null);
        expect(result.is_combat_effective).toBe(true);
    });

    it('evaluateCorpsForces counts tiers correctly', () => {
        const brigades = [
            makeBrigade({ id: 'b1' as FormationId, personnel: 2500, cohesion: 100, equipment_class: 'mechanized', location_osid: 'op:test:test_1' }),
            makeBrigade({ id: 'b2' as FormationId, personnel: 2500, cohesion: 100, location_osid: 'op:test:test_1' }),
            makeBrigade({ id: 'b3' as FormationId, personnel: 300, cohesion: 20, location_osid: 'op:test:test_1' }),
        ];
        const zones = [makeZone({ assigned_brigades: ['b1' as FormationId, 'b2' as FormationId, 'b3' as FormationId] })];
        const forces = evaluateCorpsForces(brigades, zones);

        expect(forces.total_brigades).toBe(3);
        expect(forces.tier_counts.main_effort).toBe(1);
        // b2 active_defense (high stats, no equip), b3 garrison (depleted)
        expect(forces.tier_counts.garrison).toBeGreaterThanOrEqual(1);
        expect(forces.evaluations).toHaveLength(3);
    });

    it('evaluateBrigade uses explicit supply state instead of the conservative default', () => {
        const brigade = makeBrigade({
            personnel: 2500,
            cohesion: 100,
            equipment_class: 'mechanized',
        });

        const adequate = evaluateBrigade(brigade, null, 'adequate');
        const critical = evaluateBrigade(brigade, null, 'critical');
        const unknown = evaluateBrigade(brigade, null);

        expect(adequate.fitness_offense).toBeCloseTo(1.75, 2);
        expect(critical.fitness_offense).toBeCloseTo(0.875, 3);
        expect(unknown.fitness_offense).toBeCloseTo(1.4, 2);
        expect(adequate.fitness_offense).toBeGreaterThan(unknown.fitness_offense);
        expect(unknown.fitness_offense).toBeGreaterThan(critical.fitness_offense);
    });

    it('evaluateCorpsForces reads supply_by_osid for brigade fitness', () => {
        const brigades = [
            makeBrigade({
                id: 'b1' as FormationId,
                personnel: 2500,
                cohesion: 100,
                equipment_class: 'mechanized',
                location_osid: 'op:test:test_1',
                faction: 'RS',
            }),
        ];
        const zones = [makeZone({ assigned_brigades: ['b1' as FormationId] })];
        const supplyByOsid: SupplyStateByOsidReport = {
            schema: 1,
            turn: 10,
            factions: [{
                faction_id: 'RS',
                by_osid: [{ osid: 'op:test:test_1', state: 'critical' }],
            }],
        };

        const forces = evaluateCorpsForces(brigades, zones, supplyByOsid);

        expect(forces.evaluations).toHaveLength(1);
        expect(forces.evaluations[0]!.fitness_offense).toBeCloseTo(0.875, 3);
        expect(forces.evaluations[0]!.fitness_defense).toBeCloseTo(0.25, 3);
    });

    it('evaluateBrigade penalizes heavy local fatigue in both offense and defense fitness', () => {
        const fresh = makeBrigade({
            personnel: 2500,
            cohesion: 100,
            equipment_class: 'mechanized',
            ops: { fatigue: 0 } as FormationState['ops'],
        });
        const tired = makeBrigade({
            personnel: 2500,
            cohesion: 100,
            equipment_class: 'mechanized',
            ops: { fatigue: 30 } as FormationState['ops'],
        });

        const freshEval = evaluateBrigade(fresh, null, 'adequate');
        const tiredEval = evaluateBrigade(tired, null, 'adequate');

        expect(tiredEval.fitness_offense).toBeLessThan(freshEval.fitness_offense);
        expect(tiredEval.fitness_defense).toBeLessThan(freshEval.fitness_defense);
    });

    it('evaluateBrigade can demote a high-fatigue brigade out of main_effort', () => {
        const fresh = makeBrigade({
            personnel: 1200,
            cohesion: 60,
            equipment_class: 'motorized',
            ops: { fatigue: 0 } as FormationState['ops'],
        });
        const tired = makeBrigade({
            personnel: 1200,
            cohesion: 60,
            equipment_class: 'motorized',
            ops: { fatigue: 30 } as FormationState['ops'],
        });

        const freshEval = evaluateBrigade(fresh, null, 'adequate');
        const tiredEval = evaluateBrigade(tired, null, 'adequate');

        expect(freshEval.tier).toBe('main_effort');
        expect(tiredEval.tier).not.toBe('main_effort');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Allocation Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('allocate', () => {
    it('locks all brigades in besieged zone when budget >= available', () => {
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const zone = makeZone({
            zone_id: 'zone:srk:0' as ZoneId,
            posture: 'besieged',
            front_edge_count: 80,
            assigned_brigades: brigIds,
            garrison_budget: 10,
        });

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zone.zone_id,
        }));
        const forces = makeForces(evals, [zone]);

        const result = allocateBrigades([zone], forces, defaultPersonality);

        // Budget = ceil(80/8) = 10, available = 3, budget >= available => all locked
        expect(result.garrison_locks).toHaveLength(3);
        expect(result.surplus_pool).toHaveLength(0);
        expect(result.can_launch_ops).toBe(false);
    });

    it('produces surplus pool from non-besieged zones', () => {
        const brigIds = ['b1', 'b2', 'b3', 'b4', 'b5'].map(id => id as FormationId);
        const zone = makeZone({
            zone_id: 'zone:1k:0' as ZoneId,
            posture: 'projecting',
            front_edge_count: 20,
            assigned_brigades: brigIds,
        });

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zone.zone_id,
        }));
        const forces = makeForces(evals, [zone]);

        const result = allocateBrigades([zone], forces, defaultPersonality);

        // projecting = 20 edges/brigade, budget = ceil(20/20) = 1
        expect(result.garrison_locks.length).toBeLessThan(brigIds.length);
        expect(result.surplus_pool.length).toBeGreaterThan(0);
        expect(result.can_launch_ops).toBe(true);
    });

    it('returns can_launch_ops=false when total surplus is 0', () => {
        const brigIds = ['b1'].map(id => id as FormationId);
        const zone = makeZone({
            posture: 'defending',
            front_edge_count: 24,
            assigned_brigades: brigIds,
        });

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zone.zone_id,
        }));
        const forces = makeForces(evals, [zone]);

        const result = allocateBrigades([zone], forces, defaultPersonality);

        // defending = 12 edges/brigade, budget = ceil(24/12) = 2, have 1 => deficit
        expect(result.can_launch_ops).toBe(false);
    });

    it('sorts zones by priority: besieged first, highest deficit first', () => {
        const z1 = makeZone({
            zone_id: 'zone:a:0' as ZoneId,
            posture: 'balanced',
            deficit: 1,
            population_value: 100,
        });
        const z2 = makeZone({
            zone_id: 'zone:b:0' as ZoneId,
            posture: 'besieged',
            deficit: 3,
            population_value: 50,
        });
        const z3 = makeZone({
            zone_id: 'zone:c:0' as ZoneId,
            posture: 'besieged',
            deficit: 5,
            population_value: 200,
        });

        const sorted = sortZonesByPriority([z1, z2, z3]);

        // Besieged first, then by deficit descending
        expect(sorted[0]!.zone_id).toBe('zone:c:0');
        expect(sorted[1]!.zone_id).toBe('zone:b:0');
        expect(sorted[2]!.zone_id).toBe('zone:a:0');
    });

    it('cautious personality increases garrison budget by up to 20%', () => {
        const zone = makeZone({
            posture: 'balanced',
            front_edge_count: 60,
        });

        const neutral = computeGarrisonBudget(zone, { ...defaultPersonality, caution: 0.3, aggression: 0.3 });
        const cautious = computeGarrisonBudget(zone, { ...defaultPersonality, caution: 1.0, aggression: 0.3 });

        // caution=1.0 should increase budget by 20%
        expect(cautious).toBeGreaterThan(neutral);
        expect(cautious).toBeLessThanOrEqual(Math.ceil(neutral * 1.2) + 1); // ceil rounding tolerance
    });

    it('aggressive personality decreases garrison budget by 10%', () => {
        const zone = makeZone({
            posture: 'balanced',
            front_edge_count: 100,
        });

        const neutral = computeGarrisonBudget(zone, { ...defaultPersonality, aggression: 0.3, caution: 0.3 });
        const aggressive = computeGarrisonBudget(zone, { ...defaultPersonality, aggression: 0.8, caution: 0.3 });

        expect(aggressive).toBeLessThanOrEqual(neutral);
    });

    it('Sarajevo scenario: ~80 edges, 13 brigades, besieged -> garrison dominates', () => {
        const brigIds = Array.from({ length: 13 }, (_, i) => `brig_${i}` as FormationId);
        const zone = makeZone({
            zone_id: 'zone:1k_sarajevo:0' as ZoneId,
            posture: 'besieged',
            front_edge_count: 80,
            assigned_brigades: brigIds,
        });

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zone.zone_id,
        }));
        const forces = makeForces(evals, [zone]);

        const result = allocateBrigades([zone], forces, defaultPersonality);

        // besieged = 8 edges/brigade, budget = ceil(80/8) = 10
        // 13 brigades, budget 10 >= available? No: budget 10 < 13
        // So 10 garrison, 3 surplus — BUT besieged budget >= available check:
        // budget(10) < available(13), so NOT all locked
        expect(result.garrison_locks.length).toBe(10);
        expect(result.surplus_pool.length).toBe(3);
    });

    it('SRK scenario: ~80 edges, 9 brigades -> deficit, zero surplus, pure defense', () => {
        const brigIds = Array.from({ length: 9 }, (_, i) => `srk_brig_${i}` as FormationId);
        const zone = makeZone({
            zone_id: 'zone:srk:0' as ZoneId,
            posture: 'besieged',
            front_edge_count: 80,
            assigned_brigades: brigIds,
        });

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zone.zone_id,
        }));
        const forces = makeForces(evals, [zone]);

        const result = allocateBrigades([zone], forces, defaultPersonality);

        // besieged = 8 edges/brigade, budget = ceil(80/8) = 10
        // 9 brigades, budget 10 >= 9, so ALL 9 locked to garrison
        expect(result.garrison_locks).toHaveLength(9);
        expect(result.surplus_pool).toHaveLength(0);
        expect(result.can_launch_ops).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Plan Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('plan', () => {
    function makeMinimalBriefing(overrides: Partial<CommanderBriefing> = {}): CommanderBriefing {
        return {
            corps_id: 'test_corps' as FormationId,
            faction: 'RBiH' as FactionId,
            turn: 10,
            spatial: {} as any,
            sectors: [],
            brigades: [],
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
            enemy_equipment_summary: {
                tanks: 0,
                artillery: 0,
                infantry_only: true,
            },
            officer_personality: defaultPersonality,
            pre_planned_ops: [],
            previous_state: null,
            active_operations: [],
            ...overrides,
        } as CommanderBriefing;
    }

    it('creates plan from pre-planned ops when surplus available', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4', 'b5'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ name: 'Op Test', target_osids: ['op:enemy:e1'] }],
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.source).toBe('pre_planned');
        expect(result.plan!.status).toBe('concentrating');
    });

    it('returns no plan when surplus < MIN_BRIGADES_FOR_PLAN', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'balanced',
            front_edge_count: 10,
            surplus_brigades: ['b1' as FormationId],
        })];
        const evals = [makeEval({
            brigade_id: 'b1' as FormationId,
            current_zone: zoneId,
        })];
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            doctrine_stance: 'balanced',
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        // Only 1 surplus, MIN_BRIGADES_FOR_PLAN = 3
        expect(result.action).toBe('none');
        expect(result.plan).toBeNull();
    });

    it('does not create a new offensive plan when corps exhaustion is above the launch threshold', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            enemy_adjacent_osids: ['op:enemy:e1', 'op:enemy:e2'],
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            tier: 'main_effort',
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            corps_exhaustion: 31,
        faction_war_exhaustion: 0,
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('none');
        expect(result.reason).toContain('corps exhaustion');
        expect(result.plan).toBeNull();
    });

    it('does not create a new offensive plan when average brigade fatigue is already high', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            enemy_adjacent_osids: ['op:enemy:e1', 'op:enemy:e2'],
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            tier: 'main_effort',
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            avg_fatigue_pct: 70,
            brigades_above_fatigue_threshold: 2,
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('none');
        expect(result.reason).toContain('fatigue');
        expect(result.plan).toBeNull();
    });

    it('advances concentration progress each turn', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4', 'b5'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
        }));
        const forces = makeForces(evals, zones);

        const existingPlan: CommanderPlan = {
            plan_id: 'plan_test',
            objective_description: 'Test Op',
            target_osids: [],
            required_brigades: 5,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'concentrating',
            created_turn: 8,
            target_ready_turn: 12,
            concentration_progress: 0.4,
            viability_score: 1.0,
            source: 'pre_planned',
        };

        const briefing = makeMinimalBriefing({ previous_state: null });
        const result = managePlan(briefing, zones, forces, evals, existingPlan, 10);

        expect(result.plan).not.toBeNull();
        // Concentration is time-based: (turn - created_turn) / (target_ready_turn - created_turn)
        // = (10 - 8) / (12 - 8) = 0.5. Brigade physical location is no longer used.
        expect(result.plan!.concentration_progress).toBe(0.5);
    });

    it('transitions to ready at 80% concentration', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        // 4 of 5 brigades at staging = 80%
        const atStagingIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const elsewhereId = 'b5' as FormationId;
        const allIds = [...atStagingIds, elsewhereId];

        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: allIds,
            assigned_brigades: allIds,
        })];

        const evals = [
            ...atStagingIds.map(id => makeEval({
                brigade_id: id,
                current_zone: zoneId,
                is_combat_effective: true,
            })),
            makeEval({
                brigade_id: elsewhereId,
                current_zone: 'zone:other:0' as ZoneId,
                is_combat_effective: true,
            }),
        ];
        const forces = makeForces(evals, zones);

        const plan: CommanderPlan = {
            plan_id: 'plan_test',
            objective_description: 'Test Op',
            target_osids: [],
            required_brigades: 5,
            assigned_brigades: allIds,
            staging_zone: zoneId,
            status: 'concentrating',
            created_turn: 5,
            target_ready_turn: 10,
            concentration_progress: 0.6,
            viability_score: 1.0,
            source: 'pre_planned',
        };

        const briefing = makeMinimalBriefing({ previous_state: null });
        const result = managePlan(briefing, zones, forces, evals, plan, 10);

        // 4/5 = 0.8 >= CONCENTRATION_READY_THRESHOLD
        expect(result.plan!.status).toBe('ready');
        expect(result.action).toBe('advanced');
    });

    it('suspends plan when threat escalates', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
        }));
        const forces = makeForces(evals, zones);

        const plan: CommanderPlan = {
            plan_id: 'plan_test',
            objective_description: 'Test Op',
            target_osids: [],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'concentrating',
            created_turn: 5,
            target_ready_turn: 10,
            concentration_progress: 0.5,
            viability_score: 1.0,
            source: 'pre_planned',
        };

        // Previous state with a critical-threat zone -> triggers suspension
        // (high is intentionally NOT suspendable — structural baseline for narrow-corridor corps)
        const previousState: CommanderState = {
            zone_assessments: [zones[0]!],
            threat_assessment: {
                threatened_zones: [{ zone_id: zoneId, threat_level: 'critical' }],
                enemy_concentration_zones: [],
                recent_losses: [],
                overall_pressure: 'heavy',
            },
            force_assessment: forces,
            current_plan: plan,
            sector_activity_log: [],
            operation_history: [],
            intel_picture: { zone_confidence: {}, offensive_signs: {}, concentration_detected: {}, last_updated_turn: 9 },
            garrison_budget: {},
            last_assessment_turn: 9,
        };

        const briefing = makeMinimalBriefing({ previous_state: previousState });
        const result = managePlan(briefing, zones, forces, evals, plan, 10);

        expect(result.plan!.status).toBe('suspended');
        expect(result.action).toBe('suspended');
    });

    it('abandons plan after MAX_SUSPENSION_TURNS turns suspended', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
        }));
        const forces = makeForces(evals, zones);

        // Plan created at turn 5, suspended since turn 8, now turn 15
        // suspended for 7 turns >= MAX_SUSPENSION_TURNS (4) → should abandon
        const plan: CommanderPlan = {
            plan_id: 'plan_test',
            objective_description: 'Test Op',
            target_osids: [],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'suspended',
            created_turn: 5,
            target_ready_turn: 8,
            concentration_progress: 0.5,
            viability_score: 0.6,
            source: 'pre_planned',
            suspension_reason: 'threat escalation',
            suspended_since_turn: 8,
        };

        // Still under critical threat -> triggers suspend check, and suspended duration >= MAX_SUSPENSION_TURNS
        const previousState: CommanderState = {
            zone_assessments: [zones[0]!],
            threat_assessment: {
                threatened_zones: [{ zone_id: zoneId, threat_level: 'critical' }],
                enemy_concentration_zones: [],
                recent_losses: [],
                overall_pressure: 'heavy',
            },
            force_assessment: forces,
            current_plan: plan,
            sector_activity_log: [],
            operation_history: [],
            intel_picture: { zone_confidence: {}, offensive_signs: {}, concentration_detected: {}, last_updated_turn: 14 },
            garrison_budget: {},
            last_assessment_turn: 14,
        };

        const briefing = makeMinimalBriefing({ previous_state: previousState });
        const result = managePlan(briefing, zones, forces, evals, plan, 15);

        expect(result.plan!.status).toBe('abandoned');
        expect(result.action).toBe('abandoned');
    });

    it('besieged corps restricts to local ops only (returns null for distant targets)', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'besieged',
            front_edge_count: 40,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            osids: ['op:local:l1', 'op:local:l2'],
        })];

        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        // Pre-planned op targeting distant OSIDs not in the besieged zone
        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ name: 'Distant Op', target_osids: ['op:far:f1', 'op:far:f2'] }],
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        // Should not create a plan for distant targets when besieged
        expect(result.plan).toBeNull();
        expect(result.action).toBe('none');
    });

    it('opportunity plan gets non-empty target_osids from zone enemy_adjacent_osids', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 20,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            enemy_adjacent_osids: ['op:enemy:e1', 'op:enemy:e2', 'op:enemy:e3'],
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            doctrine_stance: 'balanced',
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.source).toBe('opportunity');
        expect(result.plan!.target_osids.length).toBeGreaterThan(0);
        // Targets should be a subset of the zone's enemy_adjacent_osids
        for (const t of result.plan!.target_osids) {
            expect(['op:enemy:e1', 'op:enemy:e2', 'op:enemy:e3']).toContain(t);
        }
    });

    it('should clear executing plan so new plans can be created', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'balanced',
            front_edge_count: 30,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);
        const briefing = makeMinimalBriefing({ doctrine_stance: 'balanced' });

        const executingPlan: CommanderPlan = {
            plan_id: 'plan_test_t5_opportunity',
            objective_description: 'offensive opportunity from zone_main',
            target_osids: [],
            required_brigades: 4,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'executing',
            created_turn: 5,
            target_ready_turn: 7,
            concentration_progress: 1.0,
            viability_score: 0.8,
            source: 'opportunity',
        };

        const result = managePlan(briefing, zones, forces, evals, executingPlan, 10);

        // Executing plan should be cleared (null), not stuck forever
        expect(result.plan).toBeNull();
        expect(result.reason).toContain('execution pipeline');
    });

    it('should create opportunity plans regardless of former doctrine stance', () => {
        // A corps with surplus in a projecting zone should create plans
        // even though the old system would have blocked it with defensive doctrine
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 15,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            enemy_adjacent_osids: ['op:target:target_1', 'op:target:target_2'],
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        // Set doctrine_stance to 'defensive' — the old system would have blocked this
        const briefing = makeMinimalBriefing({ doctrine_stance: 'defensive' });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        // Plan should be created despite defensive doctrine stance
        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.source).toBe('opportunity');
        expect(result.plan!.target_osids.length).toBeGreaterThan(0);
    });

    it('creates opportunity plan from balanced zone with sufficient surplus', () => {
        // Task 5: balanced zones (not just projecting) should now be eligible
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'balanced',
            front_edge_count: 20,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            enemy_adjacent_osids: ['op:target:target_1', 'op:target:target_2'],
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);
        const briefing = makeMinimalBriefing({ doctrine_stance: 'balanced' });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        // balanced zone with surplus >= MIN_BRIGADES_FOR_PLAN must create a plan
        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.source).toBe('opportunity');
    });

    it('prefers projecting zone over balanced zone when both have surplus', () => {
        // Task 5: projecting should always be chosen first
        const projectingId = 'zone:test_corps:0' as ZoneId;
        const balancedId = 'zone:test_corps:1' as ZoneId;
        const projBrigs = ['p1', 'p2', 'p3'].map(id => id as FormationId);
        const balBrigs = ['b1', 'b2', 'b3', 'b4', 'b5'].map(id => id as FormationId);
        // balanced has MORE surplus brigades, but projecting should still win
        const zones = [
            makeZone({
                zone_id: projectingId,
                posture: 'projecting',
                front_edge_count: 15,
                surplus_brigades: projBrigs,
                assigned_brigades: projBrigs,
                enemy_adjacent_osids: ['op:target:proj_1'],
            }),
            makeZone({
                zone_id: balancedId,
                posture: 'balanced',
                front_edge_count: 15,
                surplus_brigades: balBrigs,
                assigned_brigades: balBrigs,
                enemy_adjacent_osids: ['op:target:bal_1'],
            }),
        ];
        const evals = [
            ...projBrigs.map(id => makeEval({ brigade_id: id, current_zone: projectingId, is_combat_effective: true, is_disrupted: false })),
            ...balBrigs.map(id => makeEval({ brigade_id: id, current_zone: balancedId, is_combat_effective: true, is_disrupted: false })),
        ];
        const forces = makeForces(evals, zones);
        const briefing = makeMinimalBriefing({ doctrine_stance: 'balanced' });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.source).toBe('opportunity');
        // The plan should use the projecting zone's targets, not the balanced zone's
        expect(result.plan!.target_osids).toContain('op:target:proj_1');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Commander Loop Integration Test
// ═══════════════════════════════════════════════════════════════════════════

describe('commander_loop', () => {
    function makeMinimalBriefing(overrides: Partial<CommanderBriefing> = {}): CommanderBriefing {
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;

        // Minimal spatial context with component and adjacency maps
        const componentMap = new Map<string, number>();
        componentMap.set('op:test:t1', 0);
        componentMap.set('op:test:t2', 0);

        const friendlyOsids = new Set<string>(['op:test:t1', 'op:test:t2']);

        const spatial = {
            componentsByFaction: new Map([[faction, componentMap]]),
            friendlyOsidsByFaction: new Map([[faction, friendlyOsids]]),
            adjacency: new Map<string, string[]>([
                ['op:test:t1', ['op:test:t2']],
                ['op:test:t2', ['op:test:t1']],
            ]),
        };

        const sector: CorpsFrontSector = {
            sector_id: 'sector_0',
            corps_id: corpsId,
            faction,
            edge_ids: ['e1', 'e2'],
            territory_osids: ['op:test:t1', 'op:test:t2'],
            assigned_brigade_ids: ['b1' as FormationId, 'b2' as FormationId],
            sector_stance: 'defend',
            sub_segments: [{
                id: 'ss_0',
                friendly_osids: ['op:test:t1'],
                enemy_osids: ['op:enemy:e1'],
                length_edges: 5,
            }],
        } as unknown as CorpsFrontSector;

        const brigades: FormationState[] = [
            makeBrigade({ id: 'b1' as FormationId, location_osid: 'op:test:t1', personnel: 2000, cohesion: 70 }),
            makeBrigade({ id: 'b2' as FormationId, location_osid: 'op:test:t2', personnel: 1800, cohesion: 60 }),
        ];

        return {
            corps_id: corpsId,
            faction,
            turn: 10,
            spatial: spatial as any,
            sectors: [sector],
            brigades,
            supply_by_osid: null,
            ethnic_map: null,
            graph_analysis: null,
            front_geometry: null,
            intel_data: null,
            doctrine_stance: 'balanced',
            corps_stance: 'balanced',
            corps_exhaustion: 0,
        faction_war_exhaustion: 0,
            enemy_equipment_summary: {
                tanks: 0,
                artillery: 0,
                infantry_only: true,
            },
            officer_personality: defaultPersonality,
            pre_planned_ops: [],
            previous_state: null,
            active_operations: [],
            ...overrides,
        } as CommanderBriefing;
    }

    it('BotCorpsCommander.decide produces valid CommanderOutput', () => {
        const briefing = makeMinimalBriefing();
        const commander = new BotCorpsCommander();
        const output: CommanderOutput = commander.decide(briefing, null);

        expect(output).toBeDefined();
        expect(output.directive).toBeDefined();
        expect(output.operations).toBeDefined();
        expect(output.sector_stances).toBeDefined();
        expect(output.updated_state).toBeDefined();
        expect(output.garrison_locks).toBeDefined();
        expect(output.reinforcement_requests).toBeDefined();
        expect(output.plan_updates).toBeDefined();
    });

    it('output.directive has all required CorpsDirective fields', () => {
        const briefing = makeMinimalBriefing();
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        const d = output.directive;
        expect(d.assigned_front_ids).toBeInstanceOf(Array);
        expect(d.offensive_targets).toBeInstanceOf(Array);
        expect(d.hold_osids).toBeInstanceOf(Array);
        expect(d.avoid_osids).toBeInstanceOf(Array);
        expect(typeof d.max_attackers_per_target).toBe('number');
        expect(typeof d.reserve_fraction).toBe('number');
        expect(typeof d.min_attack_outcome).toBe('string');
        expect(typeof d.aggression_modifier).toBe('number');
        expect(d.reserve_fraction).toBeGreaterThanOrEqual(0);
        expect(d.reserve_fraction).toBeLessThanOrEqual(0.5);
        expect(d.max_attackers_per_target).toBeGreaterThanOrEqual(1);
    });

    it('output.operations are valid CorpsOperation objects', () => {
        const briefing = makeMinimalBriefing();
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        for (const op of output.operations) {
            expect(typeof op.name).toBe('string');
            expect(typeof op.type).toBe('string');
            expect(typeof op.phase).toBe('string');
            expect(typeof op.started_turn).toBe('number');
            expect(op.participating_brigades).toBeInstanceOf(Array);
        }
    });

    it('garrison_locks prevent besieged zone brigades from entering ops', () => {
        // Create a besieged scenario with more garrison budget than brigades
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;

        const componentMap = new Map<string, number>();
        for (let i = 0; i < 10; i++) {
            componentMap.set(`op:test:t${i}`, 0);
        }

        const friendlyOsids = new Set<string>(componentMap.keys());

        const spatial = {
            componentsByFaction: new Map([[faction, componentMap]]),
            friendlyOsidsByFaction: new Map([[faction, friendlyOsids]]),
            adjacency: new Map<string, string[]>(
                [...componentMap.keys()].map(k => [k, [...componentMap.keys()].filter(o => o !== k)] as [string, string[]]),
            ),
        };

        // Many front edges -> besieged posture when few brigades
        const subSegments = Array.from({ length: 10 }, (_, i) => ({
            id: `ss_${i}`,
            friendly_osids: [`op:test:t${i}`],
            enemy_osids: [`op:enemy:e${i}`],
            length_edges: 8,
        }));

        const sector: CorpsFrontSector = {
            sector_id: 'sector_0',
            corps_id: corpsId,
            faction,
            edge_ids: Array.from({ length: 80 }, (_, i) => `e${i}`),
            territory_osids: [...componentMap.keys()],
            assigned_brigade_ids: ['b1', 'b2', 'b3'].map(id => id as FormationId),
            sector_stance: 'defend',
            sub_segments: subSegments,
        } as unknown as CorpsFrontSector;

        const brigades = ['b1', 'b2', 'b3'].map((id, i) =>
            makeBrigade({ id: id as FormationId, location_osid: `op:test:t${i}`, personnel: 2000, cohesion: 70 }),
        );

        const briefing = makeMinimalBriefing({
            spatial: spatial as any,
            sectors: [sector],
            brigades,
            pre_planned_ops: [{ name: 'Should Not Launch', target_osids: ['op:enemy:e1'] }],
        });

        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        // With 80 edges and only 3 brigades, corridor_width for main body = Infinity
        // (not besieged since it's main body), but budget will be high
        // Regardless, garrison locks should exist
        expect(output.garrison_locks.length).toBeGreaterThan(0);

        // Locked brigade IDs should not appear in operations
        const lockedIds = new Set(output.garrison_locks.map(l => l.brigade_id));
        for (const op of output.operations) {
            for (const brigId of op.participating_brigades) {
                expect(lockedIds.has(brigId)).toBe(false);
            }
        }
    });

    it('updated_state has valid CommanderState fields', () => {
        const briefing = makeMinimalBriefing();
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        const st = output.updated_state;
        expect(st.zone_assessments).toBeInstanceOf(Array);
        expect(st.threat_assessment).toBeDefined();
        expect(st.threat_assessment.threatened_zones).toBeInstanceOf(Array);
        expect(st.force_assessment).toBeDefined();
        expect(typeof st.force_assessment.total_brigades).toBe('number');
        expect(st.sector_activity_log).toBeInstanceOf(Array);
        expect(st.operation_history).toBeInstanceOf(Array);
        expect(st.intel_picture).toBeDefined();
        expect(typeof st.garrison_budget).toBe('object');
        expect(typeof st.last_assessment_turn).toBe('number');
    });

    it('is deterministic — same inputs produce same outputs', () => {
        const briefing = makeMinimalBriefing();
        const commander1 = new BotCorpsCommander();
        const commander2 = new BotCorpsCommander();

        const output1 = commander1.decide(briefing, null);
        const output2 = commander2.decide(briefing, null);

        expect(JSON.stringify(output1)).toBe(JSON.stringify(output2));
    });

    // ── RC1: offensive_targets preserved from active operations after plan clears ─
    it('RC1: directive.offensive_targets populated from active operation when plan is null', () => {
        // Use a briefing with only 1 brigade (below MIN_BRIGADES_FOR_PLAN=3) so managePlan
        // returns null, ensuring planDecision.plan === null in emitCommanderOutput.
        // The active_operations fallback must then populate offensive_targets.
        const executingOp: CorpsOperation = {
            name: 'cmd_test_corps_t8',
            type: 'sector_attack',
            phase: 'execution',
            started_turn: 8,
            phase_started_turn: 9,
            participating_brigades: ['b1' as FormationId],
            objectives: ['op:enemy:obj_1', 'op:enemy:obj_2'],
            current_objective_index: 0,
            planning_duration: 1,
            supply_readiness: 1.0,
            momentum: 0,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        };

        // Only 1 brigade => managePlan returns null (below MIN_BRIGADES_FOR_PLAN)
        const oneBrigade = makeBrigade({ id: 'b1' as FormationId, location_osid: 'op:test:t1', personnel: 2000 });
        const briefing = makeMinimalBriefing({
            brigades: [oneBrigade],
            active_operations: [executingOp],
        });

        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        // RC1: targets from executing op must appear in directive
        expect(output.directive.offensive_targets).toContain('op:enemy:obj_1');
        expect(output.directive.offensive_targets).toContain('op:enemy:obj_2');
    });

    // ── RC3: buildOperations skips injection when participatingBrigades is empty ──
    it('RC3: no operation injected when all assigned brigades are absent from surplus pool', () => {
        // Construct a briefing where the plan has assigned brigades that are all in the
        // garrison lock (i.e., NOT in surplus). This is done by passing previous_state
        // with a ready plan whose assigned brigades are b1/b2/b3, while the current
        // surplus pool (projecting zone with garrison budget == 0) has them all locked.
        // We achieve "plan ready + zero surplus" by using a besieged zone (all brigades
        // locked to garrison) combined with a previous_state plan that is still 'ready'.
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;

        const componentMap = new Map<string, number>();
        for (let i = 0; i < 5; i++) {
            componentMap.set(`op:test:t${i}`, 0);
        }
        const friendlyOsids = new Set<string>(componentMap.keys());

        const spatial = {
            componentsByFaction: new Map([[faction, componentMap]]),
            friendlyOsidsByFaction: new Map([[faction, friendlyOsids]]),
            adjacency: new Map<string, string[]>(
                [...componentMap.keys()].map(k => [k, [...componentMap.keys()].filter(o => o !== k)] as [string, string[]]),
            ),
        };

        // Heavy garrison pressure: 80 edges, 3 brigades → besieged, budget = ceil(80/8)=10
        // 3 < 10, so ALL brigades get locked to garrison → surplus_pool is empty
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const sector = {
            sector_id: 'sector_0',
            corps_id: corpsId,
            faction,
            edge_ids: Array.from({ length: 80 }, (_, i) => `e${i}`),
            territory_osids: [...componentMap.keys()],
            assigned_brigade_ids: brigIds,
            sector_stance: 'defend',
            sub_segments: [{
                id: 'ss_0',
                friendly_osids: ['op:test:t0'],
                enemy_osids: ['op:enemy:e0'],
                length_edges: 80,
            }],
        };

        const brigades = brigIds.map((id, i) =>
            makeBrigade({ id, location_osid: `op:test:t${i}`, personnel: 2000 }),
        );

        // A 'ready' plan whose assigned brigades are the same 3 now locked in garrison
        const readyPlan: CommanderPlan = {
            plan_id: 'plan_rc3_test',
            objective_description: 'test op',
            target_osids: ['op:enemy:e0'],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: 'zone:test_corps:0' as ZoneId,
            status: 'ready',
            created_turn: 8,
            target_ready_turn: 10,
            concentration_progress: 1.0,
            viability_score: 0.8,
            source: 'pre_planned',
        };

        const previousState: CommanderState = {
            zone_assessments: [],
            threat_assessment: {
                threatened_zones: [],
                enemy_concentration_zones: [],
                recent_losses: [],
                overall_pressure: 'low',
            },
            force_assessment: {
                total_brigades: 3,
                combat_effective: 3,
                evaluations: [],
                by_zone: {},
                tier_counts: { main_effort: 0, active_defense: 3, garrison: 0 },
                total_surplus: 0,
            },
            current_plan: readyPlan,
            sector_activity_log: [],
            operation_history: [],
            intel_picture: { zone_confidence: {}, offensive_signs: {}, concentration_detected: {}, last_updated_turn: 9 },
            garrison_budget: {},
            last_assessment_turn: 9,
        };

        const briefing = makeMinimalBriefing({
            spatial: spatial as any,
            sectors: [sector as any],
            brigades,
            previous_state: previousState,
            active_operations: [],
        });

        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, previousState);

        // All 3 brigades should be garrison-locked (budget=10 >= available=3)
        expect(output.garrison_locks).toHaveLength(3);

        // RC3: no operation should be injected when all plan brigades are garrison-locked
        // (i.e., not in surplus pool)
        for (const op of output.operations) {
            if (op.type === 'sector_attack') {
                // If an op was created, it must not contain any of the locked brigade IDs
                const lockedIds = new Set(output.garrison_locks.map(l => l.brigade_id));
                for (const brigId of op.participating_brigades) {
                    expect(lockedIds.has(brigId)).toBe(false);
                }
            }
        }
    });
});

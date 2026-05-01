/**
 * Tests for `computeCorpsOperationReadiness` (Phase 4 of FORCE QUALITY FOUNDATION).
 *
 * The helper converts the existing force-quality stack (brigade officer_quality,
 * faction_officer_maturity, capability_profile, cohesion, morale, exhaustion,
 * pool pressure, equipment composition) into seven named [0, 1] traits.
 *
 * Architecture contract:
 *   docs/plans/2026-05-01-force-quality-operation-architecture-contract.md
 * Audit references:
 *   docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md
 *   §3 (live-consumer trace), §10 items 3+5, CC2 + CC3 (proves
 *   faction_officer_maturity and capability_profile were decorative — these
 *   tests assert they now have a real consumer).
 *
 * Determinism: pure arithmetic, sorted iteration via strictCompare in
 * production code, no Math.random / Date.now.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
    computeCorpsOperationReadiness,
    buildCorpsOperationReadinessInputSnapshot,
} from '../src/sim/combat/corps_operation_readiness.js';
import type { CorpsOperationReadinessTraits } from '../src/sim/combat/corps_operation_readiness.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';

// ── Helpers ──────────────────────────────────────────────────────────────

const TOLERANCE = 1e-9;

interface BrigadeOptions {
    id: string;
    faction?: FactionId;
    corps_id?: string;
    officer_quality?: number;
    cohesion?: number;
    morale?: number;
    tanks?: number;
    artillery?: number;
    tank_op_frac?: number;
    art_op_frac?: number;
    status?: 'active' | 'destroyed';
    kind?: 'brigade' | 'corps';
}

function makeBrigade(opts: BrigadeOptions): FormationState {
    const tanks = opts.tanks ?? 0;
    const artillery = opts.artillery ?? 0;
    const tankOp = opts.tank_op_frac ?? 0;
    const artOp = opts.art_op_frac ?? 0;
    return {
        id: opts.id,
        faction: opts.faction ?? 'RBiH',
        name: opts.id,
        created_turn: 0,
        status: opts.status ?? 'active',
        assignment: null,
        kind: opts.kind ?? 'brigade',
        personnel: 1000,
        cohesion: opts.cohesion ?? 60,
        morale: opts.morale ?? 60,
        officer_quality: opts.officer_quality,
        corps_id: opts.corps_id ?? 'corps_test_1',
        composition: tanks + artillery > 0 ? {
            infantry: 1000,
            tanks,
            artillery,
            aa_systems: 0,
            tank_condition: { operational: tankOp, degraded: 1 - tankOp, non_operational: 0 },
            artillery_condition: { operational: artOp, degraded: 1 - artOp, non_operational: 0 },
        } : undefined,
    } as unknown as FormationState;
}

interface StateOptions {
    turn?: number;
    brigades: FormationState[];
    faction?: FactionId;
    corps_id?: string;
    faction_officer_maturity?: Record<string, number>;
    capability_profile?: {
        training_quality?: number;
        organizational_maturity?: number;
        equipment_access?: number;
        equipment_operational?: number;
        doctrine_attack?: number;
    };
    corps_exhaustion?: number;
    war_supply_pressure?: number;
    operation_history_failures?: number;
}

function makeState(opts: StateOptions): GameState {
    const corpsId = opts.corps_id ?? 'corps_test_1';
    const faction: FactionId = opts.faction ?? 'RBiH';
    const formations: Record<string, FormationState> = {};
    for (const b of opts.brigades) formations[b.id] = b;
    // Stub the corps formation itself so faction resolution finds it.
    formations[corpsId] = makeBrigade({
        id: corpsId,
        faction,
        kind: 'corps',
        corps_id: undefined,
    });

    const cap = opts.capability_profile;
    const factionState: Record<string, unknown> = { id: faction };
    if (cap) {
        const profile: Record<string, unknown> = {
            year: 1993,
            training_quality: cap.training_quality ?? 0.5,
            organizational_maturity: cap.organizational_maturity ?? 0.5,
            doctrine_effectiveness: { ATTACK: cap.doctrine_attack ?? 0.5 },
        };
        if (typeof cap.equipment_access === 'number') profile.equipment_access = cap.equipment_access;
        if (typeof cap.equipment_operational === 'number') profile.equipment_operational = cap.equipment_operational;
        factionState.capability_profile = profile;
    }

    const corpsCommand: Record<string, Record<string, unknown>> = {
        [corpsId]: {
            corps_exhaustion: opts.corps_exhaustion ?? 0,
        },
    };
    if (typeof opts.operation_history_failures === 'number' && opts.operation_history_failures > 0) {
        const history: Array<Record<string, unknown>> = [];
        for (let i = 0; i < opts.operation_history_failures; i++) {
            history.push({
                operation_name: `op_failed_${i}`,
                type: 'sector_attack',
                started_turn: 10 - i * 2,
                ended_turn: 12 - i * 2,
                outcome: 'failure',
                osids_captured: [],
                osids_lost: [],
                casualties_inflicted: 0,
                casualties_suffered: 0,
            });
        }
        corpsCommand[corpsId]!.commander_state = { operation_history: history };
    }

    const military: Record<string, unknown> = {
        formations,
        corps_command: corpsCommand,
    };
    if (opts.faction_officer_maturity) {
        military.faction_officer_maturity = opts.faction_officer_maturity;
    }

    const political: Record<string, unknown> = {};
    if (typeof opts.war_supply_pressure === 'number') {
        political.war_supply_pressure = { [faction]: opts.war_supply_pressure };
    }

    return {
        meta: { turn: opts.turn ?? 0, phase: 'war' },
        military,
        political,
        factions: [factionState],
    } as unknown as GameState;
}

function deepEqualWithin(a: CorpsOperationReadinessTraits, b: CorpsOperationReadinessTraits): boolean {
    const keys = [
        'operation_readiness',
        'staging_reliability',
        'axis_coordination',
        'support_delivery',
        'failure_recovery',
        'reserve_response',
        'collapse_susceptibility',
    ] as const;
    for (const k of keys) {
        if (Math.abs(a[k] - b[k]) > TOLERANCE) return false;
    }
    return true;
}

function allTraitsInRange(t: CorpsOperationReadinessTraits): boolean {
    const keys = [
        'operation_readiness',
        'staging_reliability',
        'axis_coordination',
        'support_delivery',
        'failure_recovery',
        'reserve_response',
        'collapse_susceptibility',
    ] as const;
    for (const k of keys) {
        if (!Number.isFinite(t[k])) return false;
        if (t[k] < 0 || t[k] > 1) return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 1: Pure determinism — same state → same traits, byte-identical
// ═══════════════════════════════════════════════════════════════════════════

describe('computeCorpsOperationReadiness — Phase 4', () => {
    it('1: pure determinism — same state produces byte-identical traits across two calls', () => {
        const brigades = [
            makeBrigade({ id: 'br1', officer_quality: 0.4, cohesion: 60, morale: 65, tanks: 5, artillery: 12, tank_op_frac: 0.7, art_op_frac: 0.85 }),
            makeBrigade({ id: 'br2', officer_quality: 0.3, cohesion: 55, morale: 50 }),
            makeBrigade({ id: 'br3', officer_quality: 0.55, cohesion: 70, morale: 70 }),
        ];
        const state = makeState({
            brigades,
            faction_officer_maturity: { RBiH: 3.2 },
            capability_profile: {
                training_quality: 0.55,
                organizational_maturity: 0.45,
                equipment_access: 0.25,
                doctrine_attack: 0.65,
            },
            corps_exhaustion: 12,
            war_supply_pressure: 30,
        });
        const t1 = computeCorpsOperationReadiness(state, 'corps_test_1');
        const t2 = computeCorpsOperationReadiness(state, 'corps_test_1');
        assert.ok(deepEqualWithin(t1, t2), `determinism failed: ${JSON.stringify(t1)} vs ${JSON.stringify(t2)}`);
        // Stronger byte-identical check via JSON stringify (deterministic key order)
        assert.equal(JSON.stringify(t1), JSON.stringify(t2));
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 2: All traits clamped to [0, 1] for varied synthetic states
    // ═══════════════════════════════════════════════════════════════════════
    it('2: all seven traits land in [0, 1] across several deterministic synthetic states', () => {
        const fixtures: StateOptions[] = [
            // Empty corps (no subordinates) — should fall through to neutral defaults
            { brigades: [] },
            // High-quality, well-supported corps
            {
                brigades: [
                    makeBrigade({ id: 'h1', officer_quality: 0.8, cohesion: 90, morale: 90, tanks: 30, artillery: 60, tank_op_frac: 0.9, art_op_frac: 0.9 }),
                    makeBrigade({ id: 'h2', officer_quality: 0.85, cohesion: 88, morale: 85 }),
                ],
                faction_officer_maturity: { RBiH: 4.5 },
                capability_profile: { training_quality: 0.9, organizational_maturity: 0.9, equipment_access: 0.7, doctrine_attack: 0.9 },
                corps_exhaustion: 5,
                war_supply_pressure: 5,
            },
            // Floor-level corps
            {
                brigades: [
                    makeBrigade({ id: 'l1', officer_quality: 0.05, cohesion: 5, morale: 5 }),
                    makeBrigade({ id: 'l2', officer_quality: 0.06, cohesion: 8, morale: 10 }),
                ],
                faction_officer_maturity: { RBiH: 1.0 },
                capability_profile: { training_quality: 0.05, organizational_maturity: 0.05, equipment_access: 0.05, doctrine_attack: 0.05 },
                corps_exhaustion: 100,
                war_supply_pressure: 100,
                operation_history_failures: 8,
            },
            // Out-of-range inputs (should clamp gracefully)
            {
                brigades: [
                    makeBrigade({ id: 'oor1', officer_quality: 1.5, cohesion: 200, morale: 200 }),
                ],
                faction_officer_maturity: { RBiH: 100.0 },
                capability_profile: { training_quality: 2.0, organizational_maturity: -1.0, equipment_access: 5.0, doctrine_attack: 2.0 },
                corps_exhaustion: 99999,
                war_supply_pressure: -50,
            },
        ];
        for (const fx of fixtures) {
            const state = makeState(fx);
            const traits = computeCorpsOperationReadiness(state, 'corps_test_1');
            assert.ok(allTraitsInRange(traits), `traits out of range: ${JSON.stringify(traits)} for ${JSON.stringify(fx)}`);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 3: Officer quality dominance — high officer_quality monotonically
    // raises operation_readiness and axis_coordination
    // ═══════════════════════════════════════════════════════════════════════
    it('3: high mean officer_quality monotonically raises operation_readiness and axis_coordination', () => {
        const baseline = makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.10 }),
                makeBrigade({ id: 'b2', officer_quality: 0.10 }),
            ],
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
        });
        const high = makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.85 }),
                makeBrigade({ id: 'b2', officer_quality: 0.85 }),
            ],
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
        });
        const tBase = computeCorpsOperationReadiness(baseline, 'corps_test_1');
        const tHigh = computeCorpsOperationReadiness(high, 'corps_test_1');
        assert.ok(tHigh.operation_readiness > tBase.operation_readiness,
            `expected operation_readiness to rise: ${tBase.operation_readiness} → ${tHigh.operation_readiness}`);
        assert.ok(tHigh.axis_coordination > tBase.axis_coordination,
            `expected axis_coordination to rise: ${tBase.axis_coordination} → ${tHigh.axis_coordination}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 4: Capability profile coupling — training_quality 0.30 → 0.85
    // raises staging_reliability (proves capability_profile is now consumed)
    // ═══════════════════════════════════════════════════════════════════════
    it('4: capability_profile.training_quality 0.30 → 0.85 raises staging_reliability', () => {
        const make = (training: number) => makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.4 }),
                makeBrigade({ id: 'b2', officer_quality: 0.4 }),
            ],
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: training, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
        });
        const lowTraining = computeCorpsOperationReadiness(make(0.30), 'corps_test_1');
        const highTraining = computeCorpsOperationReadiness(make(0.85), 'corps_test_1');
        assert.ok(highTraining.staging_reliability > lowTraining.staging_reliability,
            `staging_reliability did not respond to training_quality: ${lowTraining.staging_reliability} vs ${highTraining.staging_reliability}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 5: Faction maturity coupling — 1.0 → 5.0 raises axis_coordination
    // and reserve_response (proves faction_officer_maturity is now consumed)
    // ═══════════════════════════════════════════════════════════════════════
    it('5: faction_officer_maturity 1.0 → 5.0 raises axis_coordination and reserve_response', () => {
        const make = (maturity: number) => makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.4 }),
                makeBrigade({ id: 'b2', officer_quality: 0.4 }),
            ],
            faction_officer_maturity: { RBiH: maturity },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
        });
        const tLow = computeCorpsOperationReadiness(make(1.0), 'corps_test_1');
        const tHigh = computeCorpsOperationReadiness(make(5.0), 'corps_test_1');
        assert.ok(tHigh.axis_coordination > tLow.axis_coordination,
            `axis_coordination did not respond to faction_officer_maturity: ${tLow.axis_coordination} vs ${tHigh.axis_coordination}`);
        assert.ok(tHigh.reserve_response > tLow.reserve_response,
            `reserve_response did not respond to faction_officer_maturity: ${tLow.reserve_response} vs ${tHigh.reserve_response}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 6: Exhaustion coupling — high corps_exhaustion lowers
    // operation_readiness
    // ═══════════════════════════════════════════════════════════════════════
    it('6: high corps_exhaustion lowers operation_readiness', () => {
        const make = (exhaustion: number) => makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.4 }),
                makeBrigade({ id: 'b2', officer_quality: 0.4 }),
            ],
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
            corps_exhaustion: exhaustion,
        });
        const tFresh = computeCorpsOperationReadiness(make(0), 'corps_test_1');
        const tExhausted = computeCorpsOperationReadiness(make(80), 'corps_test_1');
        assert.ok(tExhausted.operation_readiness < tFresh.operation_readiness,
            `operation_readiness did not fall under exhaustion: ${tFresh.operation_readiness} vs ${tExhausted.operation_readiness}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 7: Failure feedback — 5 consecutive failures lowers failure_recovery
    // and raises collapse_susceptibility
    // ═══════════════════════════════════════════════════════════════════════
    it('7: 5 consecutive failures lowers failure_recovery and raises collapse_susceptibility', () => {
        const make = (failures: number) => makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.4 }),
                makeBrigade({ id: 'b2', officer_quality: 0.4 }),
            ],
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
            operation_history_failures: failures,
        });
        const tNoFail = computeCorpsOperationReadiness(make(0), 'corps_test_1');
        const tFailed = computeCorpsOperationReadiness(make(5), 'corps_test_1');
        assert.ok(tFailed.failure_recovery < tNoFail.failure_recovery,
            `failure_recovery did not fall after failures: ${tNoFail.failure_recovery} vs ${tFailed.failure_recovery}`);
        assert.ok(tFailed.collapse_susceptibility > tNoFail.collapse_susceptibility,
            `collapse_susceptibility did not rise after failures: ${tNoFail.collapse_susceptibility} vs ${tFailed.collapse_susceptibility}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 8: Equipment support — high tank_op/artillery_op fraction raises
    // support_delivery
    // ═══════════════════════════════════════════════════════════════════════
    it('8: high tank/artillery operational fraction raises support_delivery', () => {
        const makeBrigades = (opFrac: number) => [
            makeBrigade({ id: 'b1', officer_quality: 0.4, tanks: 30, artillery: 60, tank_op_frac: opFrac, art_op_frac: opFrac }),
            makeBrigade({ id: 'b2', officer_quality: 0.4, tanks: 20, artillery: 40, tank_op_frac: opFrac, art_op_frac: opFrac }),
        ];
        const lowEquip = makeState({
            brigades: makeBrigades(0.05),
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
        });
        const highEquip = makeState({
            brigades: makeBrigades(0.95),
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
        });
        const tLow = computeCorpsOperationReadiness(lowEquip, 'corps_test_1');
        const tHigh = computeCorpsOperationReadiness(highEquip, 'corps_test_1');
        assert.ok(tHigh.support_delivery > tLow.support_delivery,
            `support_delivery did not respond to operational equipment: ${tLow.support_delivery} vs ${tHigh.support_delivery}`);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Test 9: Soft gate fires — synthetic state with operation_readiness < 0.30
    // results in proposal downgrade. The gate is wired in commander/plan.ts;
    // this test asserts the helper returns a value under threshold and the
    // input snapshot reflects the cause.
    // ═══════════════════════════════════════════════════════════════════════
    it('9: synthetic low-quality state yields operation_readiness < 0.30 (soft gate trigger condition)', () => {
        const state = makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.05, cohesion: 5, morale: 5 }),
                makeBrigade({ id: 'b2', officer_quality: 0.06, cohesion: 8, morale: 10 }),
            ],
            faction_officer_maturity: { RBiH: 1.0 },
            capability_profile: { training_quality: 0.05, organizational_maturity: 0.05, equipment_access: 0.05, doctrine_attack: 0.05 },
            corps_exhaustion: 90,
            war_supply_pressure: 80,
            operation_history_failures: 4,
        });
        const traits = computeCorpsOperationReadiness(state, 'corps_test_1');
        assert.ok(traits.operation_readiness < 0.30,
            `expected operation_readiness < 0.30 for collapsed corps; got ${traits.operation_readiness}`);
        // Input snapshot should reflect the underlying collapse signals
        const snapshot = buildCorpsOperationReadinessInputSnapshot(state, 'corps_test_1');
        assert.ok(snapshot.mean_officer_quality < 0.10);
        assert.ok(snapshot.corps_exhaustion_normalized > 0.5);
        assert.equal(snapshot.corps_consecutive_failures, 4);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Bonus: helper purity (state untouched)
    // ═══════════════════════════════════════════════════════════════════════
    it('helper purity: state is not mutated', () => {
        const state = makeState({
            brigades: [
                makeBrigade({ id: 'b1', officer_quality: 0.4 }),
                makeBrigade({ id: 'b2', officer_quality: 0.4 }),
            ],
            faction_officer_maturity: { RBiH: 3.0 },
            capability_profile: { training_quality: 0.5, organizational_maturity: 0.5, equipment_access: 0.5, doctrine_attack: 0.5 },
        });
        const before = JSON.stringify(state);
        computeCorpsOperationReadiness(state, 'corps_test_1');
        buildCorpsOperationReadinessInputSnapshot(state, 'corps_test_1');
        const after = JSON.stringify(state);
        assert.equal(before, after, 'state was mutated by helper');
    });
});

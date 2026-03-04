import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
    lookupStepCurve,
    interpolateKeyframeCurve,
    resolveCohesionBound,
    computeMaintenanceMult,
    validateWarTimeline,
    type StepCurveEntry,
    type KeyframeCurve,
    type WarTimeline,
    type MaintenanceDecayConfig,
} from '../src/state/war_timeline.js';

// Import hardcoded consumer functions for parity checks
import { getActiveDoctrinePhase, getEffectiveAttackShare, getActiveStandingOrder } from '../src/sim/combat/bot_strategy.js';
import { getFactionCohesionFloor, getFactionCohesionCeiling, getRSMaintenanceCapacityMult } from '../src/sim/combat/faction_progression.js';
import { getFactionReinforcementMult } from '../src/state/formation_constants.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadTimeline(): Promise<WarTimeline> {
    const path = resolve(process.cwd(), 'data/scenarios/timelines/apr1992.json');
    const raw = JSON.parse(await readFile(path, 'utf8'));
    return validateWarTimeline(raw);
}

// ── lookupStepCurve ──────────────────────────────────────────────────────────

describe('lookupStepCurve', () => {
    const entries: StepCurveEntry[] = [
        { start_turn: 0, end_turn: 10, value: 1.0 },
        { start_turn: 10, end_turn: 20, value: 2.0 },
        { start_turn: 20, end_turn: 9999, value: 3.0 },
    ];

    it('returns value for turn at start of first entry', () => {
        expect(lookupStepCurve(entries, 0, -1)).toBe(1.0);
    });

    it('returns value for turn at boundary (exclusive end)', () => {
        expect(lookupStepCurve(entries, 10, -1)).toBe(2.0);
    });

    it('returns value for turn in last entry', () => {
        expect(lookupStepCurve(entries, 500, -1)).toBe(3.0);
    });

    it('returns default for undefined entries', () => {
        expect(lookupStepCurve(undefined, 5, -1)).toBe(-1);
    });

    it('returns default for empty entries', () => {
        expect(lookupStepCurve([], 5, -1)).toBe(-1);
    });

    it('returns default when no entry matches', () => {
        const gapped: StepCurveEntry[] = [
            { start_turn: 5, end_turn: 10, value: 42 },
        ];
        expect(lookupStepCurve(gapped, 3, -1)).toBe(-1);
    });
});

// ── interpolateKeyframeCurve ─────────────────────────────────────────────────

describe('interpolateKeyframeCurve', () => {
    const keyframes: KeyframeCurve = [[0, 35], [13, 42], [26, 50], [39, 56], [52, 62]];

    it('returns first value at turn 0', () => {
        expect(interpolateKeyframeCurve(keyframes, 0, -1)).toBe(35);
    });

    it('returns last value at turn >= last keyframe', () => {
        expect(interpolateKeyframeCurve(keyframes, 52, -1)).toBe(62);
        expect(interpolateKeyframeCurve(keyframes, 100, -1)).toBe(62);
    });

    it('interpolates at midpoint between keyframes', () => {
        // Midpoint of [0,35] and [13,42]: turn 6.5 should give 38.5
        const result = interpolateKeyframeCurve(keyframes, 6.5, -1);
        expect(result).toBeCloseTo(38.5, 5);
    });

    it('returns exact value at keyframe turn', () => {
        expect(interpolateKeyframeCurve(keyframes, 13, -1)).toBe(42);
        expect(interpolateKeyframeCurve(keyframes, 26, -1)).toBe(50);
    });

    it('clamps below first keyframe', () => {
        expect(interpolateKeyframeCurve(keyframes, -5, -1)).toBe(35);
    });

    it('returns default for undefined', () => {
        expect(interpolateKeyframeCurve(undefined, 10, -1)).toBe(-1);
    });

    it('returns default for empty array', () => {
        expect(interpolateKeyframeCurve([], 10, -1)).toBe(-1);
    });

    it('handles single keyframe', () => {
        expect(interpolateKeyframeCurve([[5, 42]], 0, -1)).toBe(42);
        expect(interpolateKeyframeCurve([[5, 42]], 100, -1)).toBe(42);
    });
});

// ── resolveCohesionBound ─────────────────────────────────────────────────────

describe('resolveCohesionBound', () => {
    it('returns constant when spec is a number', () => {
        expect(resolveCohesionBound(50, 25, -1)).toBe(50);
    });

    it('interpolates when spec is a keyframe curve', () => {
        const keyframes: KeyframeCurve = [[0, 85], [52, 68]];
        const result = resolveCohesionBound(keyframes, 26, -1);
        expect(result).toBeCloseTo(76.5, 5);
    });

    it('returns default when spec is undefined', () => {
        expect(resolveCohesionBound(undefined, 25, -1)).toBe(-1);
    });
});

// ── computeMaintenanceMult ───────────────────────────────────────────────────

describe('computeMaintenanceMult', () => {
    const config: MaintenanceDecayConfig = { faction: 'RS', formula: 'linear_decay', floor: 0.5, divisor: 200 };

    it('returns 1.0 at turn 0', () => {
        expect(computeMaintenanceMult(config, 0)).toBe(1.0);
    });

    it('returns expected value at turn 26', () => {
        expect(computeMaintenanceMult(config, 26)).toBeCloseTo(0.87, 5);
    });

    it('returns expected value at turn 52', () => {
        expect(computeMaintenanceMult(config, 52)).toBeCloseTo(0.74, 5);
    });

    it('never goes below floor', () => {
        expect(computeMaintenanceMult(config, 1000)).toBe(0.5);
    });

    it('returns 1.0 when config is undefined', () => {
        expect(computeMaintenanceMult(undefined, 50)).toBe(1.0);
    });
});

// ── validateWarTimeline ──────────────────────────────────────────────────────

describe('validateWarTimeline', () => {
    it('rejects null', () => {
        expect(() => validateWarTimeline(null)).toThrow('expected an object');
    });

    it('rejects missing id', () => {
        expect(() => validateWarTimeline({
            doctrine_phases: {}, standing_orders: {}, cohesion_drift: {},
            cohesion_floor: {}, cohesion_ceiling: {}, reinforcement_mult: {},
            equipment_decay: [], external_support: [], maintenance_decay: []
        })).toThrow('"id"');
    });

    it('rejects reversed step curve range (start_turn >= end_turn)', () => {
        expect(() => validateWarTimeline({
            id: 'test', doctrine_phases: {}, standing_orders: {},
            cohesion_drift: { RS: [{ start_turn: 10, end_turn: 5, value: 0 }] },
            cohesion_floor: {}, cohesion_ceiling: {}, reinforcement_mult: {},
            equipment_decay: [], external_support: [], maintenance_decay: []
        })).toThrow('start_turn >= end_turn');
    });

    it('rejects non-contiguous step curve entries', () => {
        expect(() => validateWarTimeline({
            id: 'test', doctrine_phases: {}, standing_orders: {},
            cohesion_drift: {
                RS: [
                    { start_turn: 0, end_turn: 10, value: 0 },
                    { start_turn: 15, end_turn: 20, value: 1 }
                ]
            },
            cohesion_floor: {}, cohesion_ceiling: {}, reinforcement_mult: {},
            equipment_decay: [], external_support: [], maintenance_decay: []
        })).toThrow('gap/overlap');
    });

    it('rejects equipment_decay with missing fields', () => {
        expect(() => validateWarTimeline({
            id: 'test', doctrine_phases: {}, standing_orders: {},
            cohesion_drift: {}, cohesion_floor: {}, cohesion_ceiling: {},
            reinforcement_mult: {},
            equipment_decay: [{ faction: 'RS', start_week: 26 }],
            external_support: [], maintenance_decay: []
        })).toThrow('rate_per_week');
    });

    it('validates apr1992.json successfully', async () => {
        const timeline = await loadTimeline();
        expect(timeline.id).toBe('apr1992');
        expect(Object.keys(timeline.doctrine_phases)).toContain('RS');
    });
});

// ── Round-trip parity ────────────────────────────────────────────────────────

describe('round-trip parity: timeline-driven matches hardcoded', () => {
    it('doctrine phases match at sample turns', async () => {
        const timeline = await loadTimeline();
        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            for (const turn of [0, 5, 12, 19, 20, 25, 39, 40, 55, 56, 79, 80, 9998]) {
                const hardcoded = getActiveDoctrinePhase(faction, turn);
                const fromTimeline = getActiveDoctrinePhase(faction, turn, timeline);
                if (hardcoded === null) {
                    expect(fromTimeline).toBeNull();
                } else {
                    expect(fromTimeline?.max_attack_share_override).toBe(hardcoded.max_attack_share_override);
                    expect(fromTimeline?.aggression_modifier).toBe(hardcoded.aggression_modifier);
                    expect(fromTimeline?.default_corps_stance).toBe(hardcoded.default_corps_stance);
                }
            }
        }
    });

    it('effective attack share matches (including HRHB Lasva range)', async () => {
        const timeline = await loadTimeline();
        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            for (const turn of [0, 11, 12, 13, 19, 20, 25, 26, 39, 40, 55, 56, 79, 80]) {
                const hardcoded = getEffectiveAttackShare(faction, turn);
                const fromTimeline = getEffectiveAttackShare(faction, turn, timeline);
                expect(fromTimeline).toBe(hardcoded);
            }
        }
    });

    it('standing orders match at sample turns', async () => {
        const timeline = await loadTimeline();
        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            for (const turn of [0, 11, 12, 19, 20, 25, 26, 39, 40, 55, 56, 79, 80]) {
                const hardcoded = getActiveStandingOrder(faction, turn);
                const fromTimeline = getActiveStandingOrder(faction, turn, timeline);
                expect(fromTimeline?.name).toBe(hardcoded?.name);
                expect(fromTimeline?.army_stance).toBe(hardcoded?.army_stance);
            }
        }
    });

    it('cohesion floor matches at sample turns', async () => {
        const timeline = await loadTimeline();
        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            for (const turn of [0, 6, 13, 20, 26, 33, 39, 45, 52, 60]) {
                const hardcoded = getFactionCohesionFloor(faction, turn);
                const fromTimeline = getFactionCohesionFloor(faction, turn, timeline);
                expect(fromTimeline).toBeCloseTo(hardcoded, 5);
            }
        }
    });

    it('cohesion ceiling matches at sample turns', async () => {
        const timeline = await loadTimeline();
        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            for (const turn of [0, 6, 13, 20, 26, 33, 39, 45, 52, 60]) {
                const hardcoded = getFactionCohesionCeiling(faction, turn);
                const fromTimeline = getFactionCohesionCeiling(faction, turn, timeline);
                expect(fromTimeline).toBeCloseTo(hardcoded, 5);
            }
        }
    });

    it('reinforcement mult matches at sample turns', async () => {
        const timeline = await loadTimeline();
        for (const faction of ['RS', 'RBiH', 'HRHB'] as const) {
            for (const turn of [0, 5, 11, 12, 25, 26, 51, 52, 100]) {
                const hardcoded = getFactionReinforcementMult(faction, turn);
                const fromTimeline = getFactionReinforcementMult(faction, turn, timeline);
                expect(fromTimeline).toBe(hardcoded);
            }
        }
    });

    it('RS maintenance capacity mult matches at sample turns', async () => {
        const timeline = await loadTimeline();
        for (const turn of [0, 10, 26, 52, 100, 200, 300]) {
            const hardcoded = getRSMaintenanceCapacityMult(turn);
            const fromTimeline = getRSMaintenanceCapacityMult(turn, timeline);
            expect(fromTimeline).toBeCloseTo(hardcoded, 10);
        }
    });
});

// ── Backward compatibility ───────────────────────────────────────────────────

describe('backward compatibility: no timeline = same behavior', () => {
    it('getActiveDoctrinePhase without timeline returns hardcoded values', () => {
        const result = getActiveDoctrinePhase('RS', 10);
        expect(result?.default_corps_stance).toBe('offensive');
        expect(result?.max_attack_share_override).toBe(0.28);
    });

    it('getFactionReinforcementMult without timeline returns hardcoded values', () => {
        expect(getFactionReinforcementMult('RBiH', 5)).toBe(0.25);
        expect(getFactionReinforcementMult('RS', 0)).toBe(1.0);
    });

    it('getRSMaintenanceCapacityMult without timeline returns hardcoded values', () => {
        expect(getRSMaintenanceCapacityMult(0)).toBe(1.0);
        expect(getRSMaintenanceCapacityMult(100)).toBe(0.5);
    });
});

/**
 * Phase E Packet 4 — political_dimensions diagnostic surface tests.
 *
 * Validates that `buildPoliticalDimensionsSnapshot` correctly reads a save's
 * strategic-dimensions block, detects penalty zones via the exported
 * sector_offensive multiplier helpers, reports current Phase E gate
 * activation state from process.env, and computes cumulative per-faction
 * op-launch multipliers consistent with the production consumer formula.
 *
 * Determinism: no Math.random, no Date.now, no real env-var manipulation
 * (envOverride parameter only). No file I/O — all tests pass `rawSave` inline.
 */

import { describe, expect, it } from 'vitest';

import {
    buildGateActivation,
    buildPoliticalDimensionsSnapshot,
    SNAPSHOT_FACTIONS,
    type PoliticalDimensionsSnapshot,
} from '../tools/diagnostics/political_dimensions_snapshot.js';
import { DIMENSION_IDS } from '../src/sim/events/strategic_dimensions.js';

const ALL_FLAGS_OFF: NodeJS.ProcessEnv = {};

const ALL_FLAGS_ON: NodeJS.ProcessEnv = {
    AWWV_POLITICAL_DIMENSION_PROPAGATION: 'true',
    AWWV_PDP_INTL_STANDING_OPS_HESITATION: 'true',
    AWWV_PDP_COHESION_CAUTION_BIAS: 'true',
};

function mockSave(overrides: Record<string, Partial<Record<string, { base_value: number; event_modifier: number; effective_value: number }>>> = {}): unknown {
    const factions: Array<'RBiH' | 'RS' | 'HRHB'> = ['RBiH', 'RS', 'HRHB'];
    const dims: Record<string, Record<string, { base_value: number; event_modifier: number; effective_value: number }>> = {};
    for (const f of factions) {
        dims[f] = {};
        for (const d of DIMENSION_IDS) {
            // Default: every dimension at 50, well above both thresholds.
            dims[f][d] = { base_value: 50, event_modifier: 0, effective_value: 50 };
        }
    }
    for (const [faction, factionOverrides] of Object.entries(overrides)) {
        for (const [dim, cell] of Object.entries(factionOverrides)) {
            if (cell) dims[faction][dim] = cell;
        }
    }
    return {
        meta: { turn: 12, scenario_id: 'apr1992_test', seed: 'test-seed' },
        military: {
            negotiation: { strategic_dimensions: dims },
        },
    };
}

function findCell(snapshot: PoliticalDimensionsSnapshot, faction: string, dim: string) {
    const factionBlock = snapshot.factions.find((f) => f.faction === faction);
    return factionBlock?.cells.find((c) => c.dimension === dim);
}

describe('buildPoliticalDimensionsSnapshot', () => {
    it('builds without throwing on a minimal mock state and surfaces meta', () => {
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave(),
            envOverride: ALL_FLAGS_OFF,
        });
        expect(snapshot.turn).toBe(12);
        expect(snapshot.scenario_id).toBe('apr1992_test');
        expect(snapshot.seed).toBe('test-seed');
        expect(snapshot.factions.length).toBe(3);
        for (const f of SNAPSHOT_FACTIONS) {
            expect(snapshot.factions.some((entry) => entry.faction === f)).toBe(true);
        }
        // Every faction has exactly 6 typed dimensions in the cells array.
        for (const factionBlock of snapshot.factions) {
            expect(factionBlock.cells.length).toBe(DIMENSION_IDS.length);
        }
    });

    it('JSON-serializable snapshot shape matches expected fields', () => {
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave(),
            envOverride: ALL_FLAGS_OFF,
        });
        // Round-trip through JSON to confirm structured serialization.
        const reparsed = JSON.parse(JSON.stringify(snapshot)) as PoliticalDimensionsSnapshot;
        expect(reparsed.gate_activation.global_propagation).toBe('INACTIVE');
        expect(reparsed.gate_activation.intl_standing_ops_hesitation).toBe('INACTIVE');
        expect(reparsed.gate_activation.cohesion_caution_bias).toBe('INACTIVE');
        const cell = findCell(reparsed, 'RBiH', 'international_standing');
        expect(cell).toBeDefined();
        expect(cell!.effective_value).toBe(50);
        expect(cell!.penalty_zone).toBeNull();
        expect(cell!.active_multiplier_if_flag_on).toBe(1.0);
    });

    it('flags intl_standing penalty zone when effective_value < threshold', () => {
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave({
                RBiH: {
                    international_standing: { base_value: 30, event_modifier: -10, effective_value: 20 },
                },
            }),
            envOverride: ALL_FLAGS_OFF,
        });
        const cell = findCell(snapshot, 'RBiH', 'international_standing');
        expect(cell).toBeDefined();
        expect(cell!.effective_value).toBe(20);
        expect(cell!.penalty_zone).toBe('intl_standing_hesitation');
        expect(cell!.penalty_zone_reason).toContain('WOULD-TRIGGER hesitation');
        // Multiplier matches production helper (0.7 below threshold).
        expect(cell!.active_multiplier_if_flag_on).toBe(0.7);
    });

    it('flags cohesion penalty zone when effective_value < threshold', () => {
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave({
                RS: {
                    internal_cohesion: { base_value: 40, event_modifier: -20, effective_value: 20 },
                },
            }),
            envOverride: ALL_FLAGS_OFF,
        });
        const cell = findCell(snapshot, 'RS', 'internal_cohesion');
        expect(cell).toBeDefined();
        expect(cell!.penalty_zone).toBe('cohesion_caution_bias');
        expect(cell!.active_multiplier_if_flag_on).toBe(0.85);
    });

    it('current cumulative multiplier is 1.0 when global flag OFF (default)', () => {
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave({
                RBiH: {
                    international_standing: { base_value: 30, event_modifier: -10, effective_value: 20 },
                    internal_cohesion: { base_value: 30, event_modifier: -10, effective_value: 20 },
                },
            }),
            envOverride: ALL_FLAGS_OFF,
        });
        const faction = snapshot.factions.find((f) => f.faction === 'RBiH')!;
        expect(faction.current_cumulative_multiplier).toBe(1.0);
        expect(faction.cumulative_multiplier_note).toContain('gate OFF');
        // But if-flags-on path still computes the would-be product.
        expect(faction.cumulative_multiplier_if_flags_on).toBeCloseTo(0.7 * 0.85, 10);
    });

    it('current cumulative multiplier reflects both sub-flags when all flags ON', () => {
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave({
                HRHB: {
                    international_standing: { base_value: 30, event_modifier: -10, effective_value: 20 },
                    internal_cohesion: { base_value: 30, event_modifier: -10, effective_value: 20 },
                },
            }),
            envOverride: ALL_FLAGS_ON,
        });
        const faction = snapshot.factions.find((f) => f.faction === 'HRHB')!;
        expect(faction.current_cumulative_multiplier).toBeCloseTo(0.7 * 0.85, 10);
        expect(faction.cumulative_multiplier_note).toContain('intl_standing');
        expect(faction.cumulative_multiplier_note).toContain('cohesion');
    });

    it('current cumulative multiplier reflects only the active sub-flag in partial activation', () => {
        const partialEnv: NodeJS.ProcessEnv = {
            AWWV_POLITICAL_DIMENSION_PROPAGATION: 'true',
            AWWV_PDP_INTL_STANDING_OPS_HESITATION: 'true',
            // cohesion sub-flag stays OFF
        };
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave({
                RBiH: {
                    international_standing: { base_value: 30, event_modifier: -10, effective_value: 20 },
                    internal_cohesion: { base_value: 30, event_modifier: -10, effective_value: 20 },
                },
            }),
            envOverride: partialEnv,
        });
        const faction = snapshot.factions.find((f) => f.faction === 'RBiH')!;
        expect(faction.current_cumulative_multiplier).toBeCloseTo(0.7, 10);
        expect(faction.cumulative_multiplier_note).toContain('intl_standing');
        expect(faction.cumulative_multiplier_note).not.toContain('cohesion');
    });

    it('--faction filter restricts output to a single faction', () => {
        const snapshot = buildPoliticalDimensionsSnapshot({
            rawSave: mockSave(),
            envOverride: ALL_FLAGS_OFF,
            faction: 'RS',
        });
        expect(snapshot.factions.length).toBe(1);
        expect(snapshot.factions[0].faction).toBe('RS');
    });

    it('gate activation snapshot reads process.env keys directly via override', () => {
        const onAll = buildGateActivation(ALL_FLAGS_ON);
        expect(onAll.global_propagation).toBe('ACTIVE');
        expect(onAll.intl_standing_ops_hesitation).toBe('ACTIVE');
        expect(onAll.cohesion_caution_bias).toBe('ACTIVE');
        expect(onAll.intl_standing_combined_active).toBe(true);
        expect(onAll.cohesion_combined_active).toBe(true);

        const offAll = buildGateActivation(ALL_FLAGS_OFF);
        expect(offAll.global_propagation).toBe('INACTIVE');
        expect(offAll.intl_standing_combined_active).toBe(false);
        expect(offAll.cohesion_combined_active).toBe(false);

        // Sub-flag ON but global OFF must NOT report combined active.
        const subOnly = buildGateActivation({
            AWWV_PDP_INTL_STANDING_OPS_HESITATION: 'true',
        });
        expect(subOnly.intl_standing_ops_hesitation).toBe('ACTIVE');
        expect(subOnly.intl_standing_combined_active).toBe(false);
    });
});

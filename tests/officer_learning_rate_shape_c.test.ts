/**
 * Tests for Shape C officer learning-rate semantics (Phase 2 of FORCE QUALITY
 * FOUNDATION milestone, 2026-05-01).
 *
 * Resolves the 100× unit-mismatch bug confirmed in
 * docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md §4
 * by introducing explicit precedence over three timeline-config fields:
 *
 *   1. `learning_rate_per_turn`     — absolute per-turn combat growth (preferred).
 *   2. `learning_rate_multiplier`   — multiplier on COMBAT_GROWTH_BASE.
 *   3. `learning_rate` (DEPRECATED) — compat-treated as multiplier.
 *
 * Plus the hardcoded fallback (`FACTION_LEARNING_RATE`) when no timeline config
 * is bound for the faction.
 *
 * Frontline growth scales by FRONTLINE_GROWTH_BASE / COMBAT_GROWTH_BASE (= 0.5×)
 * relative to combat growth regardless of which input shape is used.
 *
 * Deterministic: pure arithmetic, sorted iteration via strictCompare in the
 * production code, no Math.random / Date.now / locale-sensitive sort.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
    updateBrigadeOfficerQuality,
    COMBAT_GROWTH_BASE,
    FRONTLINE_GROWTH_BASE,
    FACTION_LEARNING_RATE,
} from '../src/sim/combat/officer_quality_update.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

// ── Helpers ──────────────────────────────────────────────────────────────

const TOLERANCE = 1e-9;

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade_1',
        faction: 'RBiH',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 60,
        ...overrides,
    } as FormationState;
}

function makeStateWithTimeline(
    formations: Record<string, FormationState>,
    officerConfig: Record<string, Record<string, unknown>> | null,
    turn: number = 5,
): GameState {
    const military: Record<string, unknown> = {
        formations,
        corps_front_sectors: {},
    };
    if (officerConfig !== null) {
        military.war_timeline = {
            officer_config: officerConfig,
        };
    }
    return {
        meta: { turn, phase: 'war' },
        military,
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// §1: Absolute path — learning_rate_per_turn
// ═══════════════════════════════════════════════════════════════════════════

describe('Shape C precedence: learning_rate_per_turn (absolute)', () => {
    it('absolute path: combat growth = rate * (1 - quality*0.5)', () => {
        const f = makeFormation({
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { test_brigade_1: f },
            {
                RBiH: { faction: 'RBiH', learning_rate_per_turn: 0.02 },
            },
        );
        updateBrigadeOfficerQuality(state, new Set(['test_brigade_1']));
        // Expected: 0.30 + 0.02 * (1 - 0.30 * 0.5) = 0.30 + 0.02 * 0.85 = 0.30 + 0.017 = 0.317
        assert.ok(
            Math.abs(f.officer_quality! - 0.317) < TOLERANCE,
            `Absolute path expected 0.317, got ${f.officer_quality}`,
        );
    });

    // ═════════════════════════════════════════════════════════════════════
    // §2: Multiplier path — learning_rate_multiplier
    // ═════════════════════════════════════════════════════════════════════

    it('multiplier path: combat growth = COMBAT_GROWTH_BASE * mult * (1 - quality*0.5)', () => {
        const f = makeFormation({
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { test_brigade_1: f },
            {
                RBiH: { faction: 'RBiH', learning_rate_multiplier: 1.5 },
            },
        );
        updateBrigadeOfficerQuality(state, new Set(['test_brigade_1']));
        // Expected: 0.30 + 0.01 * 1.5 * 0.85 = 0.30 + 0.01275 = 0.31275
        assert.ok(
            Math.abs(f.officer_quality! - 0.31275) < TOLERANCE,
            `Multiplier path expected 0.31275, got ${f.officer_quality}`,
        );
    });

    // ═════════════════════════════════════════════════════════════════════
    // §3: Legacy compat path — learning_rate (DEPRECATED)
    // ═════════════════════════════════════════════════════════════════════

    it('DEPRECATED legacy compat path: learning_rate is treated as multiplier', () => {
        const f = makeFormation({
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { test_brigade_1: f },
            {
                RBiH: { faction: 'RBiH', learning_rate: 1.5 },
            },
        );
        updateBrigadeOfficerQuality(state, new Set(['test_brigade_1']));
        // Expected: identical to multiplier path: 0.31275.
        assert.ok(
            Math.abs(f.officer_quality! - 0.31275) < TOLERANCE,
            `Legacy compat path (DEPRECATED) expected 0.31275 (matches multiplier), got ${f.officer_quality}. ` +
                `New scenarios MUST use learning_rate_per_turn or learning_rate_multiplier.`,
        );
    });

    // ═════════════════════════════════════════════════════════════════════
    // §4: Fallback path — no timeline officer_config
    // ═════════════════════════════════════════════════════════════════════

    it('fallback path: no timeline officer_config uses FACTION_LEARNING_RATE multiplier', () => {
        const f = makeFormation({
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
        });
        // No officer_config in timeline at all.
        const state = makeStateWithTimeline({ test_brigade_1: f }, null);
        updateBrigadeOfficerQuality(state, new Set(['test_brigade_1']));
        // Expected: 0.30 + COMBAT_GROWTH_BASE * FACTION_LEARNING_RATE.RBiH (1.5) * 0.85
        //         = 0.30 + 0.01 * 1.5 * 0.85 = 0.31275.
        const expected = 0.30 + COMBAT_GROWTH_BASE * FACTION_LEARNING_RATE.RBiH! * (1 - 0.30 * 0.5);
        assert.ok(
            Math.abs(expected - 0.31275) < TOLERANCE,
            `Fallback identity check broken: expected 0.31275 from constants, got ${expected}`,
        );
        assert.ok(
            Math.abs(f.officer_quality! - 0.31275) < TOLERANCE,
            `Fallback path expected 0.31275, got ${f.officer_quality}`,
        );
    });

    // ═════════════════════════════════════════════════════════════════════
    // §5: Frontline scaling preserves the 0.5× ratio for the absolute path
    // ═════════════════════════════════════════════════════════════════════

    it('frontline scaling: frontline growth = 0.5 × combat growth (absolute path)', () => {
        // Combat brigade: applies absolute rate.
        const fCombat = makeFormation({
            id: 'combat_brigade',
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
            posture: 'attack',
        });
        // Frontline (non-combat) brigade: relies on posture fallback (no live sectors).
        const fFrontline = makeFormation({
            id: 'frontline_brigade',
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
            posture: 'attack',
        });
        const state = makeStateWithTimeline(
            { combat_brigade: fCombat, frontline_brigade: fFrontline },
            {
                RBiH: { faction: 'RBiH', learning_rate_per_turn: 0.02 },
            },
        );
        // Disable live sector truth so posture fallback is used.
        state.military.corps_front_sectors =
            undefined as unknown as GameState['military']['corps_front_sectors'];
        updateBrigadeOfficerQuality(state, new Set(['combat_brigade']));

        const combatGrowth = fCombat.officer_quality! - 0.30;
        const frontlineGrowth = fFrontline.officer_quality! - 0.30;
        // Frontline growth should equal exactly 0.5 × combat growth at the same starting quality.
        assert.ok(
            Math.abs(frontlineGrowth - 0.5 * combatGrowth) < TOLERANCE,
            `Frontline ratio expected 0.5×combat (combat=${combatGrowth}, frontline=${frontlineGrowth}, ` +
                `ratio=${frontlineGrowth / combatGrowth})`,
        );
        // Sanity: combat growth = 0.02 * 0.85 = 0.017.
        assert.ok(
            Math.abs(combatGrowth - 0.017) < TOLERANCE,
            `Combat growth expected 0.017, got ${combatGrowth}`,
        );
        // Sanity: frontline growth = 0.5 * 0.017 = 0.0085.
        assert.ok(
            Math.abs(frontlineGrowth - 0.0085) < TOLERANCE,
            `Frontline growth expected 0.0085, got ${frontlineGrowth}`,
        );
    });

    // ═════════════════════════════════════════════════════════════════════
    // §6: Precedence — absolute beats multiplier beats legacy
    // ═════════════════════════════════════════════════════════════════════

    it('precedence: absolute > multiplier > legacy when multiple fields are present', () => {
        const f = makeFormation({
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { test_brigade_1: f },
            {
                RBiH: {
                    faction: 'RBiH',
                    learning_rate_per_turn: 0.02,
                    learning_rate_multiplier: 1.5,
                    learning_rate: 1.5,
                },
            },
        );
        updateBrigadeOfficerQuality(state, new Set(['test_brigade_1']));
        // Expected: absolute wins, growth = 0.017, NOT 0.01275.
        assert.ok(
            Math.abs(f.officer_quality! - 0.317) < TOLERANCE,
            `Precedence broken: expected absolute path (0.317), got ${f.officer_quality} ` +
                `(would be 0.31275 if multiplier or legacy won)`,
        );
    });
});

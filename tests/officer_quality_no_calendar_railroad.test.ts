/**
 * Tests proving the VRS calendar brain-drain railroad is REMOVED
 * (Phase 3 of FORCE QUALITY FOUNDATION milestone, 2026-05-01).
 *
 * Pre-Phase-3 behavior:
 *   src/sim/combat/officer_quality_update.ts:134-136 unconditionally subtracted
 *   `brain_drain_rate` (default 0.001) from every active RS brigade's
 *   officer_quality on every turn at or after `brain_drain_start_week`
 *   (default 40). This was a calendar-driven railroad — it fired regardless of
 *   casualties, supply, exhaustion, alliance posture, or any signal.
 *
 * Audit reference:
 *   docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md
 *   §8 "Confirmed calendar-driven railroad". Architecture contract:
 *   docs/plans/2026-05-01-force-quality-operation-architecture-contract.md
 *   §"Forbidden Shapes" ("no calendar victory rails", "no total VRS collapse switch").
 *
 * Replacement (per audit §10 item 4):
 *   - Per-battle officer-quality attrition is owned by `applyOfficerCasualtyLoss`
 *     in `src/sim/combat/attack_post_battle_effects.ts` (LIVE; untouched).
 *   - Systemic late-war VRS degradation will be expressed via
 *     `computeCorpsOperationReadiness` in Phase 4 of the milestone.
 *
 * Determinism: pure arithmetic, sorted iteration in production code via
 * strictCompare, no Math.random / Date.now / locale-sensitive sort.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
    updateBrigadeOfficerQuality,
} from '../src/sim/combat/officer_quality_update.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

// ── Helpers ──────────────────────────────────────────────────────────────

const TOLERANCE = 1e-9;

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade_1',
        faction: 'RS',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 60,
        // Critical: posture must NOT be 'attack' or any non-defend value, otherwise
        // posture-fallback frontline growth would mask a calendar decay. 'defend'
        // forces inCombat=false AND onFrontline=false in the absence of live sectors.
        posture: 'defend',
        ...overrides,
    } as FormationState;
}

function makeState(
    formations: Record<string, FormationState>,
    turn: number,
    officerConfig?: Record<string, Record<string, unknown>>,
): GameState {
    const military: Record<string, unknown> = {
        formations,
        // No live sectors — forces the function to use posture-fallback frontline truth.
        corps_front_sectors: undefined,
    };
    if (officerConfig !== undefined) {
        military.war_timeline = { officer_config: officerConfig };
    }
    return {
        meta: { turn, phase: 'war' },
        military,
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// §1: No unconditional decay — RS brigade not in combat, not on frontline,
// across turns straddling the old brain-drain threshold.
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3: VRS calendar brain-drain railroad is removed (no unconditional decay)', () => {
    it('RS brigade with no combat / no frontline preserves quality across turns 39, 41, 100', () => {
        const startQuality = 0.30;
        // Run independently per turn to mimic three turn-snapshots; each call
        // should be a no-op when no combat and no frontline service apply.
        for (const turn of [39, 41, 100]) {
            const f = makeFormation({ faction: 'RS', officer_quality: startQuality });
            const state = makeState({ test_brigade_1: f }, turn);
            updateBrigadeOfficerQuality(state, new Set()); // empty engaged set
            assert.ok(
                Math.abs(f.officer_quality! - startQuality) < TOLERANCE,
                `Turn ${turn}: expected unchanged ${startQuality}, got ${f.officer_quality}`,
            );
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §2: Timeline override — even an explicit timeline brain_drain_* config is
// inert. The schema fields remain (deprecated) for compat but the engine
// never reads them.
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3: timeline brain_drain_* fields are inert (cannot reintroduce the railroad)', () => {
    it('RS brigade with brain_drain_start_week=1 and brain_drain_rate=0.5 still preserves quality', () => {
        const startQuality = 0.30;
        const f = makeFormation({ faction: 'RS', officer_quality: startQuality });
        const state = makeState(
            { test_brigade_1: f },
            10,
            {
                RS: {
                    faction: 'RS',
                    // Authoring values that — pre-Phase-3 — would have wiped officer_quality
                    // straight to the floor. They must now be inert.
                    brain_drain_start_week: 1,
                    brain_drain_rate: 0.5,
                },
            },
        );
        updateBrigadeOfficerQuality(state, new Set());
        assert.ok(
            Math.abs(f.officer_quality! - startQuality) < TOLERANCE,
            `Timeline brain_drain_* override must be inert: expected ${startQuality}, got ${f.officer_quality}`,
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §3: Casualty/growth path still works — combat brigades still grow.
// Casualty-driven LOSS lives in attack_post_battle_effects.ts and is not the
// owner of this test, but this assertion confirms the per-turn growth side of
// updateBrigadeOfficerQuality() was not collateral damage from the railroad
// removal.
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3: combat-engaged brigades still grow (mechanic-coupled growth intact)', () => {
    it('RS brigade engaged in combat gains officer_quality (>0 delta)', () => {
        const startQuality = 0.30;
        const f = makeFormation({ faction: 'RS', officer_quality: startQuality });
        const state = makeState({ test_brigade_1: f }, 50); // post-old-railroad turn
        updateBrigadeOfficerQuality(state, new Set(['test_brigade_1']));
        assert.ok(
            f.officer_quality! > startQuality,
            `Combat-engaged growth expected >${startQuality}, got ${f.officer_quality}`,
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §4: Determinism — repeated runs on the same input produce byte-identical output.
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3: determinism preserved (no clock/random drift after railroad removal)', () => {
    it('two runs with identical inputs produce identical officer_quality outputs', () => {
        const startQuality = 0.30;

        const fA = makeFormation({ faction: 'RS', officer_quality: startQuality });
        const stateA = makeState({ test_brigade_1: fA }, 100);
        updateBrigadeOfficerQuality(stateA, new Set());

        const fB = makeFormation({ faction: 'RS', officer_quality: startQuality });
        const stateB = makeState({ test_brigade_1: fB }, 100);
        updateBrigadeOfficerQuality(stateB, new Set());

        assert.strictEqual(
            fA.officer_quality,
            fB.officer_quality,
            `Determinism violated: run A=${fA.officer_quality} vs run B=${fB.officer_quality}`,
        );
    });
});

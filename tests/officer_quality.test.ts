/**
 * Tests for the Officers System — Phase A: Brigade Officer Quality (Tier 2).
 *
 * Covers: faction defaults, brigade modifier, growth mechanics, VRS brain drain,
 * floor/cap, backward compat, OOB overrides, learning rate differences.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
    getFactionDefaultOfficerQuality,
    getBrigadeOfficerMod,
    getOfficerQualityMult,
} from '../src/sim/combat/combat_math.js';
import {
    updateBrigadeOfficerQuality,
    OFFICER_QUALITY_FLOOR,
    OFFICER_QUALITY_CAP,
    COMBAT_GROWTH_BASE,
    FRONTLINE_GROWTH_BASE,
    // VRS_BRAIN_DRAIN_START_WEEK retained for the no-decay assertion (Phase 3 of
    // FORCE QUALITY FOUNDATION); VRS_BRAIN_DRAIN_RATE is no longer referenced
    // because the calendar railroad was deleted from the engine in Phase 3.
    VRS_BRAIN_DRAIN_START_WEEK,
    FACTION_LEARNING_RATE,
} from '../src/sim/combat/officer_quality_update.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

// ── Helpers ──────────────────────────────────────────────────────────────

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

function makeState(formations: Record<string, FormationState>, turn: number = 0): GameState {
    return {
        meta: { turn, phase: 'war' },
        military: {
            formations,
            corps_front_sectors: {},
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// §1: Faction defaults
// ═══════════════════════════════════════════════════════════════════════════

describe('getFactionDefaultOfficerQuality', () => {
    it('RS starts at 0.55 and decays', () => {
        assert.strictEqual(getFactionDefaultOfficerQuality('RS', 0), 0.55);
        // At turn 20: 0.55 - 20*0.002 = 0.51
        assert.ok(Math.abs(getFactionDefaultOfficerQuality('RS', 20) - 0.51) < 0.001);
        // At turn 40: 0.55 - 40*0.002 = 0.47
        assert.ok(Math.abs(getFactionDefaultOfficerQuality('RS', 40) - 0.47) < 0.001);
        // Floor at 0.45
        assert.strictEqual(getFactionDefaultOfficerQuality('RS', 200), 0.45);
    });

    it('RBiH starts at 0.05 and grows', () => {
        assert.strictEqual(getFactionDefaultOfficerQuality('RBiH', 0), 0.05);
        // At turn 20: 0.05 + 20*0.004 = 0.13
        assert.ok(Math.abs(getFactionDefaultOfficerQuality('RBiH', 20) - 0.13) < 0.001);
        // At turn 40: 0.05 + 40*0.004 = 0.21
        assert.ok(Math.abs(getFactionDefaultOfficerQuality('RBiH', 40) - 0.21) < 0.001);
        // Cap at 0.50
        assert.strictEqual(getFactionDefaultOfficerQuality('RBiH', 200), 0.50);
    });

    it('HRHB is constant at 0.225', () => {
        assert.strictEqual(getFactionDefaultOfficerQuality('HRHB', 0), 0.225);
        assert.strictEqual(getFactionDefaultOfficerQuality('HRHB', 40), 0.225);
        assert.strictEqual(getFactionDefaultOfficerQuality('HRHB', 100), 0.225);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §2: Brigade officer modifier
// ═══════════════════════════════════════════════════════════════════════════

describe('getBrigadeOfficerMod', () => {
    it('quality 0.30 gives modifier 1.0 (neutral)', () => {
        const f = makeFormation({ officer_quality: 0.30 });
        assert.ok(Math.abs(getBrigadeOfficerMod(f, 0) - 1.0) < 0.001);
    });

    it('quality 0.10 gives modifier < 1.0', () => {
        const f = makeFormation({ officer_quality: 0.10 });
        const mod = getBrigadeOfficerMod(f, 0);
        assert.ok(mod < 1.0, `Expected < 1.0, got ${mod}`);
        // 1.0 + (0.10 - 0.30) * 0.4 = 1.0 - 0.08 = 0.92
        assert.ok(Math.abs(mod - 0.92) < 0.001);
    });

    it('quality 0.80 gives modifier > 1.0', () => {
        const f = makeFormation({ officer_quality: 0.80 });
        const mod = getBrigadeOfficerMod(f, 0);
        assert.ok(mod > 1.0, `Expected > 1.0, got ${mod}`);
        // 1.0 + (0.80 - 0.30) * 0.4 = 1.0 + 0.20 = 1.20
        assert.ok(Math.abs(mod - 1.20) < 0.001);
    });

    it('falls back to faction default when officer_quality is undefined', () => {
        const f = makeFormation({ faction: 'RS', officer_quality: undefined });
        const mod = getBrigadeOfficerMod(f, 0);
        // RS default at t=0: 0.55 → 1.0 + (0.55-0.30)*0.4 = 1.10
        assert.ok(Math.abs(mod - 1.10) < 0.001);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §3: Backward compatibility
// ═══════════════════════════════════════════════════════════════════════════

describe('backward compatibility', () => {
    it('RS at t=0: getBrigadeOfficerMod(default) ≈ getOfficerQualityMult', () => {
        const f = makeFormation({ faction: 'RS', officer_quality: undefined });
        const newMod = getBrigadeOfficerMod(f, 0);
        const legacyMod = getOfficerQualityMult('RS', 0);
        assert.ok(Math.abs(newMod - legacyMod) < 0.02, `New ${newMod} vs legacy ${legacyMod}`);
    });

    it('HRHB: getBrigadeOfficerMod(default) ≈ getOfficerQualityMult', () => {
        const f = makeFormation({ faction: 'HRHB', officer_quality: undefined });
        const newMod = getBrigadeOfficerMod(f, 0);
        const legacyMod = getOfficerQualityMult('HRHB', 0);
        assert.ok(Math.abs(newMod - legacyMod) < 0.02, `New ${newMod} vs legacy ${legacyMod}`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §4: Growth mechanics
// ═══════════════════════════════════════════════════════════════════════════

describe('updateBrigadeOfficerQuality', () => {
    it('combat growth applies to engaged formations', () => {
        const f = makeFormation({ faction: 'RBiH', officer_quality: 0.10, kind: 'brigade' });
        const state = makeState({ test_brigade_1: f }, 5);
        const engaged = new Set(['test_brigade_1']);
        const report = updateBrigadeOfficerQuality(state, engaged);
        assert.strictEqual(report.formations_updated, 1);
        // 0.10 + 0.01 * 1.5 * (1 - 0.10*0.5) = 0.10 + 0.01425 = 0.11425
        assert.ok(f.officer_quality! > 0.10, `Expected growth, got ${f.officer_quality}`);
    });

    it('frontline growth applies to non-engaged formations with non-defend posture', () => {
        const f = makeFormation({ faction: 'RBiH', officer_quality: 0.10, kind: 'brigade', posture: 'attack' });
        const state = makeState({ test_brigade_1: f }, 5);
        const engaged = new Set<string>();
        updateBrigadeOfficerQuality(state, engaged);
        assert.ok(f.officer_quality! > 0.10, `Expected frontline growth, got ${f.officer_quality}`);
    });

    it('uses sector frontline truth instead of posture when live sectors exist', () => {
        const rearBrigade = makeFormation({
            id: 'rear_brigade',
            faction: 'RBiH',
            officer_quality: 0.10,
            kind: 'brigade',
            posture: 'attack',
        });
        const frontlineBrigade = makeFormation({
            id: 'frontline_brigade',
            faction: 'RBiH',
            officer_quality: 0.10,
            kind: 'brigade',
            posture: 'defend',
        });
        const state = makeState(
            {
                rear_brigade: rearBrigade,
                frontline_brigade: frontlineBrigade,
            },
            5,
        );
        state.military.corps_front_sectors = {
            'sector:rbih:0': {
                id: 'sector:rbih:0',
                assigned_brigade_ids: ['frontline_brigade'],
                reserve_brigade_ids: [],
            },
        } as unknown as GameState['military']['corps_front_sectors'];

        updateBrigadeOfficerQuality(state, new Set());

        assert.equal(rearBrigade.officer_quality, 0.10);
        assert.ok(frontlineBrigade.officer_quality! > 0.10, `Expected frontline growth, got ${frontlineBrigade.officer_quality}`);
    });

    it('falls back to posture only when no live sector truth exists', () => {
        const f = makeFormation({
            faction: 'RBiH',
            officer_quality: 0.10,
            kind: 'brigade',
            posture: 'attack',
        });
        const state = makeState({ test_brigade_1: f }, 5);
        state.military.corps_front_sectors = undefined as unknown as GameState['military']['corps_front_sectors'];

        updateBrigadeOfficerQuality(state, new Set());

        assert.ok(f.officer_quality! > 0.10, `Expected posture fallback growth, got ${f.officer_quality}`);
    });

    it('RBiH learns faster than RS', () => {
        const fRBiH = makeFormation({ id: 'rbih_1', faction: 'RBiH', officer_quality: 0.10, kind: 'brigade' });
        const fRS = makeFormation({ id: 'rs_1', faction: 'RS', officer_quality: 0.10, kind: 'brigade' });
        const state = makeState({ rbih_1: fRBiH, rs_1: fRS }, 5);
        const engaged = new Set(['rbih_1', 'rs_1']);
        updateBrigadeOfficerQuality(state, engaged);
        assert.ok(fRBiH.officer_quality! > fRS.officer_quality!,
            `RBiH ${fRBiH.officer_quality} should be > RS ${fRS.officer_quality}`);
    });

    it('VRS calendar brain drain (railroad) is REMOVED — no decay after w40 without combat (Phase 3 of FORCE QUALITY FOUNDATION)', () => {
        // Pre-Phase-3 behavior: turn>=VRS_BRAIN_DRAIN_START_WEEK unconditionally
        // subtracted a fixed brain-drain rate every turn for RS brigades regardless
        // of casualties/supply/etc. That calendar railroad was deleted in
        // src/sim/combat/officer_quality_update.ts as part of Phase 3 of the
        // FORCE QUALITY FOUNDATION milestone (2026-05-01). RS brigades that take
        // no casualties and don't fight should preserve quality. See
        // docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md §8.
        const f = makeFormation({ faction: 'RS', officer_quality: 0.55, kind: 'brigade' });
        const state = makeState({ test_brigade_1: f }, VRS_BRAIN_DRAIN_START_WEEK + 5);
        updateBrigadeOfficerQuality(state, new Set());
        assert.strictEqual(
            f.officer_quality,
            0.55,
            `Calendar railroad removed: expected 0.55 unchanged, got ${f.officer_quality}`,
        );
    });

    it('VRS brain drain does not apply before w40', () => {
        const f = makeFormation({ faction: 'RS', officer_quality: 0.55, kind: 'brigade' });
        const state = makeState({ test_brigade_1: f }, VRS_BRAIN_DRAIN_START_WEEK - 1);
        updateBrigadeOfficerQuality(state, new Set());
        // No growth (no combat/frontline), no brain drain → unchanged
        assert.strictEqual(f.officer_quality, 0.55);
    });

    it('quality respects floor', () => {
        // Phase 3 note: per-turn calendar decay was removed; this test now exercises
        // the floor only when growth on a low-quality brigade would push it past
        // the floor in the wrong direction (it cannot — growth is positive). The
        // floor remains live for casualty-driven attrition in
        // attack_post_battle_effects.ts (applyOfficerCasualtyLoss).
        const f = makeFormation({ faction: 'RS', officer_quality: OFFICER_QUALITY_FLOOR + 0.001, kind: 'brigade' });
        const state = makeState({ test_brigade_1: f }, 200); // far future — proves no calendar decay
        updateBrigadeOfficerQuality(state, new Set());
        assert.ok(f.officer_quality! >= OFFICER_QUALITY_FLOOR, `Floor violated: ${f.officer_quality}`);
        // Pre-Phase-3 this would have decayed below the start; now stays at start.
        assert.strictEqual(
            f.officer_quality,
            OFFICER_QUALITY_FLOOR + 0.001,
            `Calendar railroad removed: expected unchanged, got ${f.officer_quality}`,
        );
    });

    it('quality respects cap', () => {
        const f = makeFormation({ faction: 'RBiH', officer_quality: OFFICER_QUALITY_CAP - 0.001, kind: 'brigade' });
        const state = makeState({ test_brigade_1: f }, 5);
        const engaged = new Set(['test_brigade_1']);
        updateBrigadeOfficerQuality(state, engaged);
        assert.ok(f.officer_quality! <= OFFICER_QUALITY_CAP, `Cap violated: ${f.officer_quality}`);
    });

    it('initializes officer_quality if missing', () => {
        const f = makeFormation({ faction: 'RBiH', kind: 'brigade' });
        delete (f as unknown as Record<string, unknown>).officer_quality;
        const state = makeState({ test_brigade_1: f }, 10);
        updateBrigadeOfficerQuality(state, new Set());
        assert.ok(f.officer_quality !== undefined, 'officer_quality should be initialized');
    });

    it('skips inactive formations', () => {
        const f = makeFormation({ status: 'inactive', officer_quality: 0.30, kind: 'brigade' });
        const state = makeState({ test_brigade_1: f }, 5);
        updateBrigadeOfficerQuality(state, new Set(['test_brigade_1']));
        assert.strictEqual(f.officer_quality, 0.30, 'Inactive formation should not change');
    });

    it('produces per-faction average in report', () => {
        const f1 = makeFormation({ id: 'a', faction: 'RBiH', officer_quality: 0.20, kind: 'brigade' });
        const f2 = makeFormation({ id: 'b', faction: 'RBiH', officer_quality: 0.40, kind: 'brigade' });
        const state = makeState({ a: f1, b: f2 }, 5);
        const report = updateBrigadeOfficerQuality(state, new Set());
        assert.ok(report.avg_quality_by_faction.RBiH !== undefined);
    });
});

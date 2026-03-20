/**
 * Task 1.3: Suppress HRHB-RBiH combat during mobilization period.
 *
 * During the 4-turn mobilization buildup (alliance <= ALLIED_THRESHOLD but
 * combat not yet enabled), neither HRHB nor RBiH should attack the other.
 * After mobilization expires or alliance drops to <= HOSTILE_THRESHOLD,
 * combat becomes immediate.
 *
 * Deterministic: no randomness, no timestamps.
 */

import { describe, it, expect } from 'vitest';
import {
    isRbihHrhbCombatEnabled,
    isRbihHrhbMobilizing,
    ALLIED_THRESHOLD,
    HOSTILE_THRESHOLD,
    MOBILIZATION_DURATION_TURNS,
    ensureRbihHrhbState,
} from '../src/sim/early_war/alliance_update.js';
import type { GameState, FactionId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Cross-target pair (RBiH↔HRHB) without TS narrowing that flags impossible faction literals. */
function isRbihHrhbControllerPair(attacker: FactionId, targetController: string): boolean {
  if (attacker === 'RBiH') return targetController === 'HRHB';
  if (attacker === 'HRHB') return targetController === 'RBiH';
  return false;
}

function isRbihHrhbFactionPair(a: FactionId, b: FactionId): boolean {
  if (a === 'RBiH') return b === 'HRHB';
  if (a === 'HRHB') return b === 'RBiH';
  return false;
}

// ── Helpers ──

/** Minimal GameState for mobilization combat suppression tests. */
function makeState(overrides?: {
    turn?: number;
    allianceValue?: number;
    mobilizationStartedTurn?: number | null;
    warStartedTurn?: number | null;
    earliestWarTurn?: number;
    politicalControllers?: Record<string, string>;
    formations?: Record<string, any>;
}): GameState {
    const turn = overrides?.turn ?? 30;
    const allianceValue = overrides?.allianceValue ?? 0.10; // below ALLIED_THRESHOLD (0.20), mobilizing
    const mobilizationStartedTurn = overrides?.mobilizationStartedTurn ?? 28;
    const warStartedTurn = overrides?.warStartedTurn ?? null;
    const earliestWarTurn = overrides?.earliestWarTurn ?? 26;

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            seed: 'mob-combat-test',
            phase: 'war',
            referendum_held: true,
            war_start_turn: 1,
            rbih_hrhb_war_earliest_turn: earliestWarTurn,
        },
        factions: [
            {
                id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1
            },
            {
                id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1
            },
            {
                id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2,
                patron_state: { material_support_level: 0.5, diplomatic_isolation: 0.2, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 5 }
            }
        ],
        political: {
            war_alliance_rbih_hrhb: allianceValue,
            rbih_hrhb_state: {
                war_started_turn: warStartedTurn,
                mobilization_started_turn: mobilizationStartedTurn,
                ceasefire_active: false,
                ceasefire_since_turn: null,
                washington_signed: false,
                washington_turn: null,
                stalemate_turns: 0,
                bilateral_flips_this_turn: 0,
                total_bilateral_flips: 0,
                allied_mixed_municipalities: [],
            },
            political_controllers: overrides?.politicalControllers ?? {
                'op:bugojno:bugojno_1': 'RBiH',
                'op:bugojno:bugojno_2': 'HRHB',
                'op:bugojno:bugojno_3': 'RS',
            },
        },
        military: {
            formations: overrides?.formations ?? {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
    } as unknown as GameState;
}

// ── isRbihHrhbCombatEnabled / isRbihHrhbMobilizing contract tests ──

describe('isRbihHrhbCombatEnabled', () => {
    it('returns false when allied (alliance > ALLIED_THRESHOLD)', () => {
        const state = makeState({ allianceValue: 0.50, mobilizationStartedTurn: null });
        expect(isRbihHrhbCombatEnabled(state)).toBe(false);
    });

    it('returns false during mobilization (alliance <= threshold, within 4 turns)', () => {
        // mobilization started turn 28, current turn 30 => 2 turns elapsed < 4
        const state = makeState({ turn: 30, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        expect(isRbihHrhbCombatEnabled(state)).toBe(false);
        expect(isRbihHrhbMobilizing(state)).toBe(true);
    });

    it('returns true after mobilization expires (4+ turns elapsed)', () => {
        // mobilization started turn 28, current turn 32 => 4 turns elapsed >= MOBILIZATION_DURATION_TURNS
        const state = makeState({ turn: 32, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        expect(isRbihHrhbCombatEnabled(state)).toBe(true);
        expect(isRbihHrhbMobilizing(state)).toBe(false);
    });

    it('returns true immediately when alliance drops to hostile threshold', () => {
        // alliance <= 0.00 => combat enabled immediately, regardless of mobilization turn
        const state = makeState({ turn: 29, allianceValue: HOSTILE_THRESHOLD, mobilizationStartedTurn: 28 });
        expect(isRbihHrhbCombatEnabled(state)).toBe(true);
    });

    it('returns true when alliance is negative (full war)', () => {
        const state = makeState({ turn: 29, allianceValue: -0.30, mobilizationStartedTurn: 28 });
        expect(isRbihHrhbCombatEnabled(state)).toBe(true);
    });
});

// ── Combat suppression during mobilization: target filtering ──

describe('mobilization combat suppression — target filtering logic', () => {
    it('HRHB-controlled OSID is filtered out for RBiH attacker during mobilization', () => {
        const state = makeState({ turn: 30, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        const attackerFaction: FactionId = 'RBiH';
        const targetController = 'HRHB';
        const pair = isRbihHrhbControllerPair(attackerFaction, targetController);
        // During mobilization, combat not enabled => filter out
        expect(pair && !isRbihHrhbCombatEnabled(state)).toBe(true);
    });

    it('RBiH-controlled OSID is filtered out for HRHB attacker during mobilization', () => {
        const state = makeState({ turn: 30, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        const attackerFaction: FactionId = 'HRHB';
        const targetController = 'RBiH';
        const pair = isRbihHrhbControllerPair(attackerFaction, targetController);
        expect(pair && !isRbihHrhbCombatEnabled(state)).toBe(true);
    });

    it('RS-controlled OSID is NOT filtered for RBiH attacker during mobilization', () => {
        const state = makeState({ turn: 30, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        const attackerFaction: FactionId = 'RBiH';
        const targetController = 'RS';
        const pair = isRbihHrhbControllerPair(attackerFaction, targetController);
        // RS target => not an HRHB-RBiH pair => not filtered
        expect(pair).toBe(false);
    });

    it('HRHB-controlled OSID becomes attackable after mobilization expires', () => {
        const state = makeState({ turn: 32, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        const attackerFaction: FactionId = 'RBiH';
        const targetController = 'HRHB';
        const pair = isRbihHrhbControllerPair(attackerFaction, targetController);
        // After mobilization, combat enabled => NOT filtered
        expect(pair && !isRbihHrhbCombatEnabled(state)).toBe(false);
    });

    it('when alliance drops directly to hostile (no mobilization gap), combat is immediate', () => {
        const state = makeState({ turn: 29, allianceValue: HOSTILE_THRESHOLD, mobilizationStartedTurn: 28 });
        const attackerFaction: FactionId = 'HRHB';
        const targetController = 'RBiH';
        const pair = isRbihHrhbControllerPair(attackerFaction, targetController);
        // Alliance at hostile threshold => combat enabled immediately
        expect(isRbihHrhbCombatEnabled(state)).toBe(true);
        expect(pair && !isRbihHrhbCombatEnabled(state)).toBe(false);
    });
});

// ── attack_resolution_osid safety gate ──

describe('attack resolution safety gate', () => {
    it('HRHB vs RBiH attack should be blocked during mobilization', () => {
        const state = makeState({ turn: 30, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        // Simulate what the gate does: check attacker faction vs target controller
        const attackerFaction: FactionId = 'HRHB';
        const targetFaction: FactionId = 'RBiH';
        const pair = isRbihHrhbFactionPair(attackerFaction, targetFaction);
        const shouldBlock = pair && !isRbihHrhbCombatEnabled(state);
        expect(shouldBlock).toBe(true);
    });

    it('VRS vs RBiH attack should NOT be blocked during mobilization', () => {
        const state = makeState({ turn: 30, allianceValue: 0.10, mobilizationStartedTurn: 28 });
        expect(isRbihHrhbCombatEnabled(state)).toBe(false);
        const attackerFaction: FactionId = 'RS';
        const targetFaction: FactionId = 'RBiH';
        expect(isRbihHrhbFactionPair(attackerFaction, targetFaction)).toBe(false);
    });
});

/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Post-battle resource & ops-tempo side effects
 * DOMAIN:    Supply expenditure, facility damage, combat fatigue
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts (tranche 6).
 * Three fire-and-forget aftermath functions that mutate state
 * after each battle resolution.
 *
 * UPSTREAM:  attack_resolution_osid.ts (calls after combat outcome)
 * DOWNSTREAM: supply_reserves (reserve pools), production_facilities, formation ops.fatigue
 * ═══════════════════════════════════════════════════════════════
 */

import type { FactionId, FormationState, GameState } from '../../state/game_state.js';
import { deductCombatExpenditure } from '../../state/supply_reserves.js';
import { FACILITY_COMBAT_DAMAGE_RATE } from '../../state/supply_reserve_constants.js';
import { FATIGUE_MAX } from '../../state/formation_constants.js';

// ── Constants ───────────────────────────────────────────────────────────────

/** Fatigue points accumulated per battle for each attacking formation. */
export const FATIGUE_ATTACKER = 2;

/** Fatigue points accumulated per battle for the defending formation. */
export const FATIGUE_DEFENDER = 1;

// ── Supply Reserve Expenditure (Phase A) ────────────────────────────────────

/**
 * Deduct combat supply expenditure from faction reserves after a battle.
 * Attacker pays full rate; defender (if present) pays half rate.
 * No-op when supply reserves are disabled or reserve fields are missing.
 *
 * Exact reproduction of the inline block formerly at attack_resolution_osid.ts Part 6b.
 */
export function deductCombatSupplyExpenditure(params: {
    state: GameState;
    attackerFaction: FactionId;
    attackerCount: number;
    powerRatio: number;
    defenderFormation: FormationState | null;
}): void {
    const { state, attackerFaction, attackerCount, powerRatio, defenderFormation } = params;
    if (state.meta.supply_reserves_enabled && state.military.general_supply_reserve && state.military.heavy_munitions_reserve) {
        deductCombatExpenditure(state, attackerFaction, attackerCount, powerRatio);
        if (defenderFormation) {
            deductCombatExpenditure(state, defenderFormation.faction, 1, powerRatio * 0.5);
        }
    }
}

// ── Facility Combat Damage (Phase B) ────────────────────────────────────────

/**
 * Reduce condition of production facilities in the municipality where combat occurred.
 * Deterministic: facility IDs are sorted before iteration.
 * No-op when supply reserves are disabled or production_facilities is missing.
 *
 * Exact reproduction of the inline block formerly at attack_resolution_osid.ts Part 6c.
 */
export function applyFacilityCombatDamage(params: {
    state: GameState;
    targetOsid: string;
}): void {
    const { state, targetOsid } = params;
    if (state.meta.supply_reserves_enabled && state.military.production_facilities) {
        const osidParts = targetOsid.split(':');
        if (osidParts.length >= 2) {
            const munId = osidParts[1];
            const facilityIds = Object.keys(state.military.production_facilities).sort((a, b) => a.localeCompare(b));
            for (const fId of facilityIds) {
                const facility = state.military.production_facilities[fId];
                if (facility && facility.municipality_id === munId) {
                    facility.current_condition = Math.max(0, facility.current_condition - FACILITY_COMBAT_DAMAGE_RATE);
                }
            }
        }
    }
}

// ── Combat Fatigue ──────────────────────────────────────────────────────────

/**
 * Apply combat fatigue to all participating formations.
 * Attackers accumulate +2 fatigue per battle; defender +1.
 * Fatigue is capped at FATIGUE_MAX. Initializes ops if missing.
 *
 * Exact reproduction of the inline block formerly at attack_resolution_osid.ts "COMBAT FATIGUE".
 */
export function applyCombatFatigue(params: {
    attackerFormations: FormationState[];
    defenderFormation: FormationState | null;
}): void {
    const { attackerFormations, defenderFormation } = params;
    for (const af of attackerFormations) {
        if (!af.ops) af.ops = { fatigue: 0, last_supplied_turn: null };
        af.ops.fatigue = Math.min(FATIGUE_MAX, (af.ops.fatigue ?? 0) + FATIGUE_ATTACKER);
    }
    if (defenderFormation) {
        if (!defenderFormation.ops) defenderFormation.ops = { fatigue: 0, last_supplied_turn: null };
        defenderFormation.ops.fatigue = Math.min(FATIGUE_MAX, (defenderFormation.ops.fatigue ?? 0) + FATIGUE_DEFENDER);
    }
}

/**
 * v0.9.0 Consequence System — central reader + GC for event-driven time-limited
 * modifiers. Writers live in apply_effects.ts; this module is the canonical
 * query and cleanup surface.
 *
 * Readers MUST use these helpers rather than inspecting MilitaryState arrays
 * directly, to avoid drift in expiration semantics.
 *
 * Deterministic: no randomness, sorted iteration where order matters.
 */

import type { FactionId, GameState } from '../../state/game_state.js';

/** Product of all active recruitment modifiers for the given faction.
 *  Stacks multiplicatively (consistent with the plan's stacking rule).
 *  Returns 1.0 when no modifiers are active. */
export function getActiveRecruitmentMultiplier(
    state: GameState,
    faction: FactionId,
    currentTurn: number
): number {
    const mods = state.military.recruitment_modifiers;
    if (!mods || mods.length === 0) return 1.0;
    let product = 1.0;
    for (const m of mods) {
        if (m.expires_turn <= currentTurn) continue;
        if (m.faction !== faction) continue;
        product *= m.pool_multiplier;
    }
    return product;
}

/** Product of all active equipment-quality modifiers for the given faction.
 *  Stacks multiplicatively. Returns 1.0 (no-op, byte-stable) when no
 *  modifiers are active for the faction. The 1.0 fast-path is the contract
 *  the combat-math consumer relies on to gate `if (eqMult !== 1.0)` and
 *  preserve historical byte-stability when no embargo-lift / arms-flow
 *  events have fired.
 *
 *  Mirrors `getActiveRecruitmentMultiplier` exactly (faction-scoped,
 *  multiplicative, time-bounded). Audit:
 *  `docs/40_reports/audits/20260504_EQUIPMENT_QUALITY_MODIFIER_SUBSTRATE.md`. */
export function getActiveEquipmentQualityMultiplier(
    state: GameState,
    faction: FactionId,
    currentTurn: number
): number {
    const mods = state.military.equipment_quality_modifiers;
    if (!mods || mods.length === 0) return 1.0;
    let product = 1.0;
    for (const m of mods) {
        if (m.expires_turn <= currentTurn) continue;
        if (m.faction !== faction) continue;
        product *= m.multiplier;
    }
    return product;
}

/** Tightest floor and loosest ceiling across active alliance locks. Undefined
 *  when no lock of that mode is active. Multiple locks of the same mode take
 *  the most restrictive value (highest floor, lowest ceiling). */
export function getActiveAllianceBounds(
    state: GameState,
    currentTurn: number
): { floor?: number; ceiling?: number } {
    const locks = state.military.alliance_locks;
    if (!locks || locks.length === 0) return {};
    let floor: number | undefined;
    let ceiling: number | undefined;
    for (const lock of locks) {
        if (lock.expires_turn <= currentTurn) continue;
        if (lock.mode === 'floor') {
            floor = floor === undefined ? lock.value : Math.max(floor, lock.value);
        } else {
            ceiling = ceiling === undefined ? lock.value : Math.min(ceiling, lock.value);
        }
    }
    return { floor, ceiling };
}

/** Merged add/remove sets across active bot_priority_shifts for the given
 *  faction. Sets are returned (not arrays) for O(1) `.has()` lookups in
 *  bot_strategy accessors. Both sets are empty when no shifts are active. */
export function getActiveBotObjectiveShifts(
    state: GameState,
    faction: FactionId,
    currentTurn: number
): { adds: Set<string>; removes: Set<string> } {
    const adds = new Set<string>();
    const removes = new Set<string>();
    const shifts = state.military.bot_priority_shifts;
    if (!shifts || shifts.length === 0) return { adds, removes };
    for (const s of shifts) {
        if (s.expires_turn <= currentTurn) continue;
        if (s.faction !== faction) continue;
        if (s.add_objectives) for (const m of s.add_objectives) adds.add(m);
        if (s.remove_objectives) for (const m of s.remove_objectives) removes.add(m);
    }
    return { adds, removes };
}

/** Maximum intensity across active guerrilla threats targeting the given
 *  (faction, munId). Returns 0 when no threat is active. Conservative
 *  stacking rule: max not sum, to avoid runaway attrition when multiple
 *  chains target the same municipality. */
export function getActiveGuerrillaThreatIntensity(
    state: GameState,
    faction: FactionId,
    munId: string,
    currentTurn: number
): number {
    const threats = state.military.guerrilla_threats;
    if (!threats || threats.length === 0) return 0;
    let max = 0;
    for (const t of threats) {
        if (t.expires_turn <= currentTurn) continue;
        if (t.faction !== faction) continue;
        if (!t.municipalities.includes(munId)) continue;
        if (t.intensity > max) max = t.intensity;
    }
    return max;
}

/** Remove expired modifier entries whose `expires_turn <= currentTurn`.
 *
 *  Scoped to the v0.9.0 Consequence System's own arrays:
 *    - `state.military.guerrilla_threats`
 *    - `state.military.recruitment_modifiers`
 *    - `state.military.equipment_quality_modifiers`
 *    - `state.military.alliance_locks`
 *    - `state.military.bot_priority_shifts`
 *
 *  Deliberately does NOT touch pre-existing arrays
 *  (`event_aggression_modifiers`, `event_constraints.*`). Those were unbounded
 *  before this session and are out of scope for this PR — retrofitting a GC
 *  onto them would change the golden `final_save.json` hash on historical
 *  runs. Their readers filter by `expires_turn > currentTurn` so the
 *  behavior contract is unaffected by keeping expired entries around.
 *
 *  Must run at turn start, before `evaluate-events` writes this turn's new
 *  modifiers. Readers of the new arrays still guard with
 *  `expires_turn > currentTurn` because this GC runs only once per turn. */
export function cleanupExpiredEventModifiers(
    state: GameState,
    currentTurn: number
): void {
    const mil = state.military;

    if (mil.guerrilla_threats) {
        mil.guerrilla_threats = mil.guerrilla_threats.filter(t => t.expires_turn > currentTurn);
    }
    if (mil.recruitment_modifiers) {
        mil.recruitment_modifiers = mil.recruitment_modifiers.filter(m => m.expires_turn > currentTurn);
    }
    if (mil.equipment_quality_modifiers) {
        mil.equipment_quality_modifiers = mil.equipment_quality_modifiers.filter(m => m.expires_turn > currentTurn);
    }
    if (mil.alliance_locks) {
        mil.alliance_locks = mil.alliance_locks.filter(l => l.expires_turn > currentTurn);
    }
    if (mil.bot_priority_shifts) {
        mil.bot_priority_shifts = mil.bot_priority_shifts.filter(s => s.expires_turn > currentTurn);
    }
}

/**
 * Presidential stance holds: the read and clamp side of posture model option 2
 * (docs/plans/2026-11-12-posture-model-option2-stance-matters.md; panel record
 * docs/40_reports/governance/20261112_POSTURE_MODEL_OPTION2_PANEL.md).
 *
 * A hold exists only after the president countermanded or constrained a corps/OG
 * commander's stance change (live play at autonomy 2). Every function here returns
 * early when `military.stance_matter_state` or its holds are absent, so the bot,
 * headless and calibration paths are untouched by construction.
 *
 * Leaf module: type imports plus the patron-directive reader only, so
 * corps_command.ts can import it without a cycle. OG clamping lives in
 * stance_matters.ts.
 *
 * Deterministic: holds are iterated in stored (sorted) order; no RNG, no wall clock.
 */

import type { CorpsStance, FactionId, GameState, PresidentialStanceHold } from '../../state/game_state.js';
import { getActivePatronDirective } from './patron_directive_scope.js';

/** Corps stance aggressiveness (same order as bot_corps_stance.ts STANCE_RANK). */
export const HOLD_STANCE_RANK: Record<CorpsStance, number> = {
    reorganize: 0, defensive: 1, balanced: 2, offensive: 3,
};

function isCorpsStance(value: unknown): value is CorpsStance {
    return value === 'reorganize' || value === 'defensive' || value === 'balanced' || value === 'offensive';
}

/** The active corps-scope hold for this corps at `turn`, if any. */
export function activeCorpsHold(
    state: GameState,
    corpsId: string,
    turn: number,
): PresidentialStanceHold | null {
    const holds = state.military?.stance_matter_state?.holds;
    if (!holds || holds.length === 0) return null;
    for (const hold of holds) {
        if (hold.scope !== 'corps' || hold.corps_id !== corpsId) continue;
        if (turn < hold.effective_from_turn || turn > hold.until_turn) continue;
        return hold;
    }
    return null;
}

/** True when any hold (corps or OG) for this corps is recorded and not yet expired, including during a Main Staff delay. */
export function corpsHasPendingOrActiveHold(state: GameState, corpsId: string, turn: number): boolean {
    const holds = state.military?.stance_matter_state?.holds;
    if (!holds || holds.length === 0) return false;
    return holds.some((hold) => hold.corps_id === corpsId && turn <= hold.until_turn);
}

/**
 * Apply a corps hold to a stance. `reorganize` (critical condition) is never
 * overridden. The HRHB patron ceiling caps the result (Zagreb wins).
 */
export function applyCorpsHoldToStance(
    state: GameState,
    faction: FactionId,
    corpsId: string,
    stance: CorpsStance,
    turn: number,
): CorpsStance {
    const hold = activeCorpsHold(state, corpsId, turn);
    if (!hold || stance === 'reorganize') return stance;
    let next: CorpsStance = stance;
    if (hold.mode === 'fixed' && isCorpsStance(hold.stance)) {
        next = hold.stance;
    } else if (hold.mode === 'ceiling' && isCorpsStance(hold.stance)
        && HOLD_STANCE_RANK[next] > HOLD_STANCE_RANK[hold.stance]) {
        next = hold.stance;
    }
    const directive = getActivePatronDirective(faction, turn, state, corpsId);
    const ceiling = directive?.stance_ceiling;
    if (isCorpsStance(ceiling) && HOLD_STANCE_RANK[next] > HOLD_STANCE_RANK[ceiling]) {
        next = ceiling;
    }
    return next;
}

/**
 * Clamp every held corps of `faction` (writes `corps_command[id].stance`). Called at
 * the three clamp points of the bot pass so the hold is the last writer.
 */
export function clampHeldCorpsStances(state: GameState, faction: FactionId): void {
    const holds = state.military?.stance_matter_state?.holds;
    if (!holds || holds.length === 0) return;
    const turn = state.meta?.turn ?? 0;
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;
    for (const hold of holds) {
        if (hold.scope !== 'corps' || hold.faction !== faction) continue;
        const cmd = corpsCommand[hold.corps_id];
        if (!cmd) continue;
        cmd.stance = applyCorpsHoldToStance(state, faction, hold.corps_id, cmd.stance, turn);
    }
}

/** True when an active corps hold keeps this corps below offensive (no new offensive such as a corridor breach). */
export function corpsHoldForbidsNewOffensive(state: GameState, corpsId: string, turn: number): boolean {
    const hold = activeCorpsHold(state, corpsId, turn);
    if (!hold || !isCorpsStance(hold.stance)) return false;
    return HOLD_STANCE_RANK[hold.stance] < HOLD_STANCE_RANK.offensive;
}

/**
 * True when an active corps hold keeps this corps at Defensive or below, where a commander
 * may not start a new offensive plan (managePlan's stance guard). The commander planner also
 * reads this to stop a plan that was already concentrating from becoming ready, because a
 * ready plan launches its operation in the same pass. Operations already running are not
 * touched. Inert without a hold.
 */
export function corpsHoldForbidsNewPlans(state: GameState | undefined, corpsId: string, turn: number): boolean {
    if (!state?.military?.stance_matter_state?.holds?.length) return false;
    const hold = activeCorpsHold(state, corpsId, turn);
    if (!hold || !isCorpsStance(hold.stance)) return false;
    return HOLD_STANCE_RANK[hold.stance] <= HOLD_STANCE_RANK.defensive;
}

/**
 * Cap a combat-effective corps stance by an active hold (used by getEffectiveCorpsStance,
 * so an army general offensive cannot bypass the president's hold). Inert without a hold.
 */
export function capEffectiveStanceByHold(state: GameState, corpsId: string, effective: CorpsStance): CorpsStance {
    if (!state.military?.stance_matter_state?.holds?.length) return effective;
    const turn = state.meta?.turn ?? 0;
    const hold = activeCorpsHold(state, corpsId, turn);
    if (!hold || effective === 'reorganize' || !isCorpsStance(hold.stance)) return effective;
    // Combat cap only narrows (fixed and ceiling alike): an army general_defensive
    // or total_mobilization below the held stance still governs.
    return HOLD_STANCE_RANK[effective] > HOLD_STANCE_RANK[hold.stance] ? hold.stance : effective;
}

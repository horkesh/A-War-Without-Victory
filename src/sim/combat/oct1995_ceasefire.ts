/**
 * The October 1995 general ceasefire (Player Experience Council fix 3 / B10,
 * docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md).
 *
 * WHAT: when Sarajevo answers Holbrooke's demand (`holbrooke_ceasefire_demand_oct95`) with
 * `accept_ceasefire`, the response records `event_flags.ceasefire_oct1995_in_force = true`.
 * From the turn after the demand card fired, and while that flag is true, the ceasefire holds
 * for every party:
 *   - the operation channel is closed: no new offensive CorpsOperation is admitted and the
 *     staff puts no offensive to the president;
 *   - offensives still planning enter recovery once (reason `ceasefire`); offensives already
 *     executing take only the current objective of each engaged axis, then stand down;
 *   - corps stances are held at Defensive or below, and no army-wide offensive is ordered;
 *   - combat is suspended as under the COHA: brigade attack orders, counter-attacks included,
 *     are cleared at generation and suppressed with receipts at resolution. Movement stays, and
 *     emergency strategic-defence operations (which issue no attack orders) are kept.
 *
 * SCOPE: general, by the canon precedent of the COHA (Engine Invariants "COHA ceasefire
 * ownership"; Systems Manual COHA implementation-note): a cessation-of-hostilities agreement
 * suppresses operation attack orders for all parties. Sarajevo's acceptance is the last
 * signature in the game's model of the October agreement.
 *
 * ENDS: refusing (`continue_offensive`) never sets the flag. Declining Dayton reopens the war
 * (`reopenWarAfterDaytonDecline` sets the flag false), after which queued operations resume.
 *
 * Leaf module: type imports only, so stance, operation and negotiation code can all read it
 * without an import cycle. Deterministic: pure reads of serialized state.
 */

import type { CorpsOperation, CorpsStance, FactionId, GameState } from '../../state/game_state.js';

/** Event flag written by the `accept_ceasefire` response (data/scenarios/events/war_1995.json). */
export const OCT1995_CEASEFIRE_FLAG = 'ceasefire_oct1995_in_force';

/** Corps stance ceiling while the ceasefire holds ("hold"). */
export const OCT1995_CEASEFIRE_STANCE_CEILING: CorpsStance = 'defensive';

const STANCE_RANK: Record<CorpsStance, number> = {
    reorganize: 0, defensive: 1, balanced: 2, offensive: 3,
};

/** The event whose `accept_ceasefire` response records the flag. */
export const OCT1995_CEASEFIRE_DEMAND_EVENT = 'holbrooke_ceasefire_demand_oct95';

/**
 * True while the October 1995 general ceasefire holds: the flag is set and the turn is later than
 * the turn the demand card fired. The one-week lag gives the president (who answers the card after
 * that turn has resolved) and a bot (which answers inside that turn's event step) the same first
 * ceasefire turn, and mirrors the record: agreed on 5 October, in force from 12 October 1995.
 */
export function isOct1995CeasefireInForce(state: GameState | undefined | null): boolean {
    if (state?.military?.event_flags?.[OCT1995_CEASEFIRE_FLAG] !== true) return false;
    const firedTurn = state.military.event_last_fired_turn?.[OCT1995_CEASEFIRE_DEMAND_EVENT];
    if (typeof firedTurn !== 'number') return true;
    return (state.meta?.turn ?? 0) > firedTurn;
}

/**
 * True when `faction` is bound by the ceasefire. The scope rule (general: every party) has
 * this single owner; callers never branch on faction themselves.
 */
export function isFactionBoundByOct1995Ceasefire(
    state: GameState | undefined | null,
    faction: FactionId | string | null | undefined,
): boolean {
    if (!isOct1995CeasefireInForce(state)) return false;
    return faction === 'RBiH' || faction === 'RS' || faction === 'HRHB';
}

/** Faction of a corps formation, or null when the corps is unknown. */
export function corpsFaction(state: GameState, corpsId: string): FactionId | null {
    const faction = state.military?.formations?.[corpsId]?.faction;
    return faction === 'RBiH' || faction === 'RS' || faction === 'HRHB' ? faction : null;
}

/** True when the ceasefire binds the faction that owns `corpsId`. */
export function isCorpsBoundByOct1995Ceasefire(state: GameState | undefined | null, corpsId: string): boolean {
    if (!state || !isOct1995CeasefireInForce(state)) return false;
    return isFactionBoundByOct1995Ceasefire(state, corpsFaction(state, corpsId));
}

/** Offensive operation types the ceasefire closes. `strategic_defense` and `reorganization` stay open. */
export function isOffensiveOperationType(type: CorpsOperation['type'] | string | undefined): boolean {
    return type === 'sector_attack' || type === 'feint' || type === 'probe' || type === 'general_offensive';
}

// ─── Stand-down of offensives already executing ──────────────────────────────────────────────
// The ceasefire freezes the line where it stands. An offensive that is executing on the first
// ceasefire turn may take only the current objective of each axis that had already engaged
// (attacked or captured), even an objective it had not yet attacked; it takes no further objective
// and then stands down (fighting went on locally until about 20 October 1995). An axis that never
// engaged gets cap -1 and stands down at once. Bounded by the ordinary failure caps
// (MAX_CONSECUTIVE_FAILURES_ON_CURRENT). Tightening this to "the cell already under assault"
// breaches the Farz guard while the simulated Farz runs late (REAL_WAR_MASTER, council fix 3).

/** Key used in `objective_cap_by_axis` for a single-axis (legacy) operation. */
export const SINGLE_AXIS_STAND_DOWN_KEY = '__op__';

function axisHasEngaged(axis: NonNullable<CorpsOperation['axes']>[number]): boolean {
    return (axis.attack_attempt_count ?? 0) > 0
        || (axis.objective_capture_count ?? 0) > 0
        || (axis.current_objective_index ?? 0) > 0;
}

function singleAxisHasEngaged(op: CorpsOperation): boolean {
    return (op.attack_attempt_count ?? 0) > 0
        || (op.objective_capture_count ?? 0) > 0
        || (op.current_objective_index ?? 0) > 0;
}

/** Record the stand-down caps once, on the first ceasefire turn. Idempotent. */
export function recordOct1995CeasefireStandDown(op: CorpsOperation, turn: number): void {
    if (op.ceasefire_stand_down) return;
    const caps: Record<string, number> = {};
    if (op.axes && op.axes.length > 0) {
        for (const axis of op.axes) {
            caps[axis.axis_id] = axis.status === 'executing' && axisHasEngaged(axis)
                ? (axis.current_objective_index ?? 0)
                : -1;
        }
    } else {
        caps[SINGLE_AXIS_STAND_DOWN_KEY] = singleAxisHasEngaged(op) ? (op.current_objective_index ?? 0) : -1;
    }
    op.ceasefire_stand_down = { from_turn: turn, objective_cap_by_axis: caps };
}

/** True once every axis has moved past its cap or stopped executing. False when no stand-down is recorded. */
export function isOct1995CeasefireStandDownComplete(op: CorpsOperation): boolean {
    const record = op.ceasefire_stand_down;
    if (!record) return false;
    if (op.axes && op.axes.length > 0) {
        return op.axes.every((axis) => axis.status !== 'executing'
            || (axis.current_objective_index ?? 0) > (record.objective_cap_by_axis[axis.axis_id] ?? -1));
    }
    return (op.current_objective_index ?? 0) > (record.objective_cap_by_axis[SINGLE_AXIS_STAND_DOWN_KEY] ?? -1);
}

/**
 * True when `brigadeId`'s attack on `targetOsid` concludes the fight its executing offensive was
 * already conducting when the ceasefire took effect: the brigade is on an executing axis whose
 * current objective is the target and is within the stand-down cap. Every other attack order of a
 * bound faction, counter-attacks included, is suppressed while the ceasefire holds.
 */
export function isOct1995CeasefireStandDownAttackOrder(
    state: GameState,
    brigadeId: string,
    targetOsid: string,
): boolean {
    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand) return false;
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        for (const op of corpsCommand[corpsId]?.active_operations ?? []) {
            const record = op.ceasefire_stand_down;
            if (!record || op.phase !== 'execution' || !op.participating_brigades.includes(brigadeId)) continue;
            if (op.axes && op.axes.length > 0) {
                const axis = op.axes.find((candidate) => candidate.assigned_brigades.includes(brigadeId));
                if (!axis || axis.status !== 'executing') continue;
                const index = axis.current_objective_index ?? 0;
                if (index > (record.objective_cap_by_axis[axis.axis_id] ?? -1)) continue;
                if (axis.objectives[index] === targetOsid) return true;
            } else {
                const index = op.current_objective_index ?? 0;
                if (index > (record.objective_cap_by_axis[SINGLE_AXIS_STAND_DOWN_KEY] ?? -1)) continue;
                if ((op.objectives ?? [])[index] === targetOsid) return true;
            }
        }
    }
    return false;
}

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/**
 * Hold every bound corps at the ceasefire ceiling (writes `corps_command[id].stance`).
 * Run at turn start by the `enforce-oct1995-ceasefire` war step, so a stance written between
 * turns (a presidential order, a carried-over offensive) cannot outlive the ceasefire.
 * Returns the corps ids whose stance was lowered, in strictCompare order.
 */
export function clampCorpsStancesForOct1995Ceasefire(state: GameState): string[] {
    const lowered: string[] = [];
    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand || !isOct1995CeasefireInForce(state)) return lowered;
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cmd = corpsCommand[corpsId];
        if (!cmd) continue;
        const faction = corpsFaction(state, corpsId);
        const capped = capStanceForOct1995Ceasefire(state, faction, cmd.stance);
        if (capped !== cmd.stance) {
            cmd.stance = capped;
            lowered.push(corpsId);
        }
    }
    return lowered;
}

/**
 * Cap a corps stance at the ceasefire ceiling when the faction is bound. `reorganize` (a corps in
 * critical condition) is below the ceiling and is kept. Returns the stance unchanged otherwise.
 */
export function capStanceForOct1995Ceasefire(
    state: GameState | undefined | null,
    faction: FactionId | string | null | undefined,
    stance: CorpsStance,
): CorpsStance {
    if (!isFactionBoundByOct1995Ceasefire(state, faction)) return stance;
    return STANCE_RANK[stance] > STANCE_RANK[OCT1995_CEASEFIRE_STANCE_CEILING]
        ? OCT1995_CEASEFIRE_STANCE_CEILING
        : stance;
}

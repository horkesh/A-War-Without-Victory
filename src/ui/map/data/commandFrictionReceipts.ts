// Command-Friction Consequence-Receipt read-model — surfaces the faction-asymmetric
// political fallout of the presidential command levers (Presidential Command Model §4).
//
// The engine apply steps (war_phases.ts apply-co-replacements / inject-op-directive)
// now append a `command_friction_record` per corps when a REPLACE-CO triggers an
// officer-corps revolt or a FORCE-OP is forced past a commander objection. Each entry
// records the lever, the faction, the patron_confidence / internal_cohesion deltas
// applied, and (replace-CO only) whether a revolt fired. This pure read-model projects
// those records into sober, player-facing receipts — "sacking General X cost you Y
// patron confidence and paralysed the corps" — factual, negative-sum, never celebratory.
//
// Design rules (mirrors officerResentmentReceipts.ts / forcedOpReceipts.ts):
//   - PURE. No state mutation. No engine calls.
//   - DEFENSIVE. Flag-off / pre-substrate saves carry no records; collapses to [].
//   - DETERMINISTIC. Sorted iteration via `strictCompare` (turn then corps id then lever).
//     No Math.random, no Date.now, no timestamps.
//   - REALIZED ONLY. We render the consequence the engine already persisted.
//
// PLAYER-ORIGIN: `command_friction_record` is written ONLY by the two player-only apply
// steps, each gated on a staged field absent in headless/historical runs
// (pending_co_replacement / pending_op_directive.forced_over_objection). The bot/historical
// projection is therefore [] → calibration untouched.

import type { GameState } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

/** One receipt: a single applied command-lever consequence on a corps. */
export interface CommandFrictionReceipt {
    /** Stable id for keying/dedupe (corps + turn + lever). */
    id: string;
    /** Which lever produced the consequence. */
    lever: 'replace_co' | 'force_op' | 'stop_op';
    /** Faction that paid the price. */
    faction: string;
    /** Corps the consequence landed on. */
    corpsId: string;
    /** Turn the consequence was applied. */
    turn: number;
    /** patron_confidence delta applied (negative). */
    patronConfidenceDelta: number;
    /** internal_cohesion delta applied (negative; 0 when none). */
    cohesionDelta: number;
    /** True only on a replace-CO that crossed the revolt threshold. */
    revolt: boolean;
}

/**
 * Build the realized command-friction receipt list from the per-corps records persisted
 * on `state.military.corps_command[*].command_friction_record`. Returns `[]` defensively
 * when state or the corps_command map is absent.
 *
 * Deterministic ordering: turn ascending, then corps id, then lever via `strictCompare`.
 */
export function buildCommandFrictionReceipts(
    state: GameState | null | undefined,
): CommandFrictionReceipt[] {
    const corpsCommand = state?.military?.corps_command;
    if (!corpsCommand) return [];

    const out: CommandFrictionReceipt[] = [];
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const records = corpsCommand[corpsId]?.command_friction_record;
        if (!Array.isArray(records)) continue;
        for (const r of records) {
            if (!r) continue;
            out.push({
                id: `${r.corps_id}:${r.turn}:${r.lever}`,
                lever: r.lever,
                faction: r.faction,
                corpsId: r.corps_id,
                turn: r.turn,
                patronConfidenceDelta: r.patron_confidence_delta,
                cohesionDelta: r.cohesion_delta,
                revolt: r.revolt,
            });
        }
    }

    return out.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        if (a.corpsId !== b.corpsId) return strictCompare(a.corpsId, b.corpsId);
        return strictCompare(a.lever, b.lever);
    });
}

/** Convenience filter: receipts applied on `turn`. Used by the Turn Aftermath section. */
export function commandFrictionReceiptsRealizedOnTurn(
    receipts: readonly CommandFrictionReceipt[],
    turn: number,
): CommandFrictionReceipt[] {
    return receipts.filter((r) => r.turn === turn);
}

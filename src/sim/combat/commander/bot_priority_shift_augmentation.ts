/**
 * v0.9.0 Consequence System — bot_priority_shift production consumer.
 *
 * The canonical write site for `CorpsDirective.offensive_targets` is
 * `commander/emit.ts#buildDirective`. This module augments that write with
 * any active `bot_priority_shift` entries the faction has accrued this turn,
 * so that consequence events actually influence the corps' target-scoring
 * (via `scoreTargetFromDirective`) in the downstream bot AI.
 *
 * Integration path (shift → behavior):
 *   1. `apply_effects.applyBotPriorityShift` pushes into `state.military.bot_priority_shifts`
 *   2. `augmentOffensiveTargetsWithShifts` merges the mun-level shift into the
 *      OSID-level directive at directive-emission time.
 *   3. `scoreTargetFromDirective` reads `directive.offensive_targets` and boosts
 *      the score by +200 for any OSID it contains.
 *   4. Bot brigade AI picks the highest-scoring target; priority shift is felt.
 *
 * Mun-level vs OSID-level: shift entries use municipality names (the grain
 * authors think in — `sarajevo`, `zvornik`). Expansion to OSIDs uses the
 * canonical OSID key format `op:<mun>:<cluster>` and `political_controllers`.
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type { CommanderBriefing } from './commander_state.js';
import { strictCompare } from '../../../state/validateGameState.js';

/** Extract the municipality slug from an OSID key of the form `op:<mun>:<cluster>`.
 *  Returns undefined if the shape doesn't match. */
function osidMun(osid: string): string | undefined {
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : undefined;
}

/** Collect active bot_priority_shifts for the briefing's faction, returning
 *  unioned add/remove municipality sets. Absent / expired shifts do not
 *  contribute. */
function collectActiveMunShifts(briefing: CommanderBriefing): { adds: Set<string>; removes: Set<string> } {
    const adds = new Set<string>();
    const removes = new Set<string>();
    const state = briefing.state_ref;
    if (!state) return { adds, removes };
    const shifts = state.military.bot_priority_shifts;
    if (!shifts || shifts.length === 0) return { adds, removes };
    const turn = briefing.turn;
    for (const s of shifts) {
        if (s.expires_turn <= turn) continue;
        if (s.faction !== briefing.faction) continue;
        if (s.add_objectives) for (const m of s.add_objectives) adds.add(m);
        if (s.remove_objectives) for (const m of s.remove_objectives) removes.add(m);
    }
    return { adds, removes };
}

/** All OSIDs in the given municipality set that are NOT currently controlled
 *  by the shifting faction (attacking your own territory is meaningless and
 *  would inflate offensive_targets with noise). */
function osidsInMunsNotHeldByFaction(
    briefing: CommanderBriefing,
    muns: Set<string>,
): string[] {
    const state = briefing.state_ref;
    if (!state || muns.size === 0) return [];
    const controllers = state.political?.political_controllers;
    if (!controllers) return [];
    const faction = briefing.faction;
    const out: string[] = [];
    for (const osid of Object.keys(controllers).sort(strictCompare)) {
        const mun = osidMun(osid);
        if (!mun || !muns.has(mun)) continue;
        if (controllers[osid] === faction) continue;
        out.push(osid);
    }
    return out;
}

/** Augment a corps directive's offensive_targets with active bot_priority_shifts.
 *
 *  - Adds: every OSID in the active `add_objectives` municipalities that is
 *    NOT held by this faction is unioned into `baseTargets`.
 *  - Removes: any OSID in `baseTargets` whose municipality is in the active
 *    `remove_objectives` set is filtered out.
 *
 *  Removes apply to the *augmented* set (i.e. they can suppress both adds and
 *  pre-existing base targets). Returns a deterministically sorted array.
 *
 *  No-op when `state_ref` is unavailable or no active shifts match the faction. */
export function augmentOffensiveTargetsWithShifts(
    baseTargets: readonly string[],
    briefing: CommanderBriefing,
): string[] {
    const { adds, removes } = collectActiveMunShifts(briefing);
    if (adds.size === 0 && removes.size === 0) {
        // Return a mutable copy so callers can safely sort/modify without
        // reaching back into directive-owned arrays.
        return [...baseTargets];
    }

    const merged = new Set<string>(baseTargets);

    if (adds.size > 0) {
        for (const osid of osidsInMunsNotHeldByFaction(briefing, adds)) {
            merged.add(osid);
        }
    }

    if (removes.size > 0) {
        for (const osid of [...merged]) {
            const mun = osidMun(osid);
            if (mun && removes.has(mun)) merged.delete(osid);
        }
    }

    return [...merged].sort(strictCompare);
}

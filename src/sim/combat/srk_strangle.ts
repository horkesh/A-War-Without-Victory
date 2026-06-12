/**
 * SRK strangle-not-capture doctrine (§6, DEFAULT-OFF).
 *
 * The VRS Sarajevo-Romanija Corps (SRK) historically STRANGLED the Sarajevo
 * urban core rather than assaulting it (Galić Appeal §389). When
 * `AWWV_SRK_STRANGLE_POSTURE` is ON, the SRK's organic CAPTURE intent against
 * the four urban-core municipalities is suppressed by merging their RBiH-held
 * OSIDs into `last_contained_osids_by_faction.RS` — the same field the contain
 * Lane V filter reads (commander/plan.ts ~line 1364).
 *
 * SCOPE:
 *   - Suppressed: centar_sarajevo, novi_grad_sarajevo, novo_sarajevo,
 *                 stari_grad_sarajevo (the four urban-core municipalities).
 *   - NOT suppressed: ilidza, vogosca, ilijas, hadzici, pale, sokolac — the
 *     outer ring remains a legitimate SRK objective.
 *
 * NO RELEASE PREDICATE: the SRK never historically pivoted to assault the city.
 * The posture is permanent for the sim duration. The player can still order
 * the ahistorical assault via `authorize_op` (presidential lever — injects an
 * op directly, bypassing the organic targeting path).
 *
 * MERGE SEMANTICS: `computeSrkStrangleOsids` returns the sorted set of
 * RBiH-controlled OSIDs inside the urban-core municipalities. The caller in
 * war_phases.ts UNIONS this set with whatever Lane V wrote (or nothing when
 * Lane V is OFF) so the two lanes stay independent and additive.
 *
 * §6 GUARD: an RS capture of a Sarajevo urban-core OSID via `authorize_op`
 * awards NO positive reward — the scoring system applies the atrocity-cost
 * penalty (raises war_cost_index, lowers verdict grade, forces hollow_victory
 * or worse via condemnation flags). The bright line is intact.
 *
 * DEFAULT-OFF contract: when `AWWV_SRK_STRANGLE_POSTURE` is unset (or any
 * value other than 'true'/'1'), `computeSrkStrangleOsids` is never called and
 * nothing is written to state → 40w + 188w BYTE-IDENTICAL to the floor.
 *
 * Deterministic: sorted iteration via strictCompare; pure read of
 * `political_controllers`; no Math.random(), no timestamps.
 */

import type { GameState } from '../../state/game_state.js';
import { SARAJEVO_CITY_CORE_MUN_IDS } from '../../state/enclave_integrity.js';
import { strictCompare } from '../../state/validateGameState.js';
import { munFromOsid } from './osid_adjacency.js';

/**
 * The four Sarajevo urban-core municipality IDs that the SRK historically
 * strangled but never assaulted. Reuses the canonical constant from
 * enclave_integrity.ts (SARAJEVO_ID_SET_ENGINE_GEOMETRY_CANON).
 *
 * Outer-ring municipalities (ilidza / vogosca / ilijas / hadzici / pale /
 * sokolac) are intentionally absent — those remain legitimate SRK objectives.
 */
export const SRK_STRANGLE_SUPPRESSED_MUN_IDS: readonly string[] =
    SARAJEVO_CITY_CORE_MUN_IDS as readonly string[];

/** Fast lookup set built once from the canonical list. */
const SRK_SUPPRESSED_MUN_SET: ReadonlySet<string> = new Set(
    SRK_STRANGLE_SUPPRESSED_MUN_IDS,
);

/**
 * Compute the sorted set of OSIDs inside the Sarajevo urban-core municipalities
 * that are currently controlled by RBiH (an enemy of RS).
 *
 * These are the capture targets to suppress in the SRK organic plan. Returns
 * an empty array when `political_controllers` is absent (safe fallback).
 *
 * Deterministic: sorted via strictCompare; pure read of state; no side-effects.
 *
 * Called only when `isSrkStranglePostureEnabled()` is true — callers MUST gate
 * on the flag before calling this function so DEFAULT-OFF remains a true no-op.
 */
export function computeSrkStrangleOsids(state: GameState): string[] {
    const controllers = state.political?.political_controllers;
    if (!controllers) return [];

    const result: string[] = [];
    for (const osid of Object.keys(controllers)) {
        const controller = controllers[osid as keyof typeof controllers];
        if (controller !== 'RBiH') continue;
        const mun = munFromOsid(osid);
        if (!mun) continue;
        if (!SRK_SUPPRESSED_MUN_SET.has(mun)) continue;
        result.push(osid);
    }

    result.sort(strictCompare);
    return result;
}

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
 * DEFAULT-ON (activated 2026-06-13, task #34, Pyrrhic-panel GO): the posture is
 * ON unless `AWWV_SRK_STRANGLE_POSTURE` is explicitly `'false'`/`'0'`. Activation
 * is TERRITORY-FLAT — the SRK already strangled emergently, so control_delta +
 * formation_delta stay BYTE-IDENTICAL at 40w/52w/188w (40w structural fingerprint
 * `78af6fc7a3278a3e` unchanged); only the persisted observer field
 * `last_contained_osids_by_faction.RS` moves the full-save hash (golden manifest
 * re-blessed: final_save + run_summary for apr1992_52w / baseline_ops_4w / noop_4w).
 * Setting env=`'false'`/`'0'` restores the byte-identical-OFF diagnostic path.
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
 * Called for pure derivation and by mutation sites gated on
 * `isSrkStranglePostureEnabled()`. Explicit env false/0 keeps mutation sites as
 * a diagnostic no-op while the derivation itself remains deterministic.
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

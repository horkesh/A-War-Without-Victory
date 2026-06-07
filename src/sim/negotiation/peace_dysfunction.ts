/**
 * Peace Dysfunction Index — the Dayton-endgame keystone (Comprehensive Dayton, D3).
 *
 * Owner ruling D3 (2026-06-07): score the GAP between a functional settlement and
 * what was actually signed. The index (0-100, higher = more dysfunctional) CAPS the
 * verdict outcome_class — a high-dysfunction peace can never grade above
 * hollow_victory / pyrrhic_success regardless of how much territory a faction holds.
 * The player CAN sign a dysfunctional peace; it never reads as a clean win. This
 * mirrors the existing condemnation-flag cap in scoring.ts (classifyOutcome).
 *
 * The index blends five deterministic sub-components, each in [0,100]:
 *   1. autonomy        — how decentralized the state is (entity_autonomy_index, D2).
 *                        Dayton's residual-powers-to-the-Entities constitution is the
 *                        historical maximum; high autonomy = high dysfunction.
 *   2. fragmentation   — how fragmented the signed territorial map is (Shannon
 *                        evenness of the three-faction footprint; a clean partition
 *                        and a balanced three-way split are both fragmenting).
 *   3. brcko           — Brčko left to international arbitration (the unresolved knot,
 *                        Annex 2) rather than cleanly assigned to one entity.
 *   4. refugees        — war-displaced persons not returned (Annex 7 failure).
 *   5. condemnation    — locked Ring-2 rupture flags (atrocity/genocide) entrenched
 *                        by the settlement (a peace that ratifies cleansing).
 *
 * Determinism: pure read of already-frozen settlement + endgame state. No RNG, no
 * timestamps, sorted iteration via strictCompare, integer-rounded outputs.
 *
 * EMERGENT-GATED: the index is computed only when meta.decision_mode === 'emergent'.
 * In historical/unset mode it returns null and writes nothing — so historical
 * baselines (40w/52w/188w) stay byte-identical by construction. (Dayton fires
 * post-w188 and is never reached on the 40w/52w calibration path, so this is belt-
 * and-suspenders; it also keeps the gate identical to the atrocity term in scoring.ts.)
 */

import type { GameState } from '../../state/game_state.js';
import type { DaytonResult, PeaceDysfunctionBreakdown } from '../../state/negotiation_types.js';
import { collectCondemnationFlags } from './rupture_consequences.js';
import { computeEntityAutonomyIndex } from './institutional_packages.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

// ── OWNER-TUNABLE BLEND WEIGHTS (must sum to 1.0) ────────────────────────────
// How much each sub-component drives the composite dysfunction index. Autonomy
// and fragmentation are the structural heart of the Pyrrhic thesis ("rewarded
// ethnic territorial control with constitutional status"); refugees and
// condemnation are the human ledger; Brčko is the signature unresolved knot.
const DYSFUNCTION_WEIGHTS = Object.freeze({
    autonomy: 0.30,
    fragmentation: 0.25,
    brcko: 0.10,
    refugees: 0.20,
    condemnation: 0.15,
});

/** Total war-displaced count at which the refugees sub-component saturates to 100. */
const REFUGEES_SATURATION = 200_000;

/**
 * Functional-autonomy floor. Below this autonomy level the autonomy component is
 * 0 (a centralized-enough state is functional). At/above 100 it saturates. The
 * historical Dayton default (maximally decentralized) sits at the top of the band.
 */
const AUTONOMY_FUNCTIONAL_FLOOR = 40;

// ── Structural flags ─────────────────────────────────────────────────────────
const FLAG_FROZEN_PARTITION = 'frozen_partition';
const FLAG_GRIDLOCK_BY_DESIGN = 'gridlock_by_design';
const FLAG_BRCKO_UNRESOLVED = 'brcko_unresolved';
const FLAG_REFUGEES_NOT_RETURNED = 'refugees_not_returned';
const FLAG_RATIFIED_CLEANSING = 'ratified_cleansing';

function clamp0to100(v: number): number {
    if (!Number.isFinite(v) || v <= 0) return 0;
    return v >= 100 ? 100 : v;
}

function round1(v: number): number {
    return Math.round(v * 10) / 10;
}

/**
 * Autonomy sub-component (0-100). Reuses the D2 entity_autonomy_index when present
 * on the result; otherwise derives it directly from the institutional choices so
 * this keystone is self-sufficient before D2 ships. Decentralized = high autonomy
 * = high dysfunction, measured as the distance above the functional floor.
 */
function autonomyComponent(result: DaytonResult): number {
    const autonomy = typeof result.entity_autonomy_index === 'number'
        ? result.entity_autonomy_index
        : computeEntityAutonomyIndex(result.institutional_choices ?? {});
    if (autonomy <= AUTONOMY_FUNCTIONAL_FLOOR) return 0;
    const span = 100 - AUTONOMY_FUNCTIONAL_FLOOR;
    return clamp0to100(((autonomy - AUTONOMY_FUNCTIONAL_FLOOR) / span) * 100);
}

/**
 * Territorial fragmentation sub-component (0-100). Uses the normalized Shannon
 * evenness of the three-faction footprint: a single faction holding ~everything
 * is 0 (cohesive), a perfectly even three-way split is 100 (maximally fragmented).
 * A 51:49 partition lands high — the signed map is itself a fragmentation, exactly
 * the Pyrrhic thesis. Pure arithmetic over the frozen split.
 */
function fragmentationComponent(result: DaytonResult): number {
    const split = result.final_territory_split ?? {};
    const shares: number[] = [];
    let sum = 0;
    for (const f of [...CANONICAL_FACTIONS].sort(strictCompare)) {
        const v = split[f];
        const s = typeof v === 'number' && v > 0 ? v : 0;
        shares.push(s);
        sum += s;
    }
    if (sum <= 0) return 0;
    // Shannon entropy normalized by log(3) → evenness in [0,1].
    let entropy = 0;
    for (const s of shares) {
        if (s <= 0) continue;
        const p = s / sum;
        entropy -= p * Math.log(p);
    }
    const evenness = entropy / Math.log(CANONICAL_FACTIONS.length);
    return clamp0to100(evenness * 100);
}

/**
 * Brčko sub-component (0-100). 100 when Brčko is left to international arbitration
 * (the unresolved condominium — the hardest knot, deferred at Dayton), a modest
 * residual when cleanly assigned to one entity (a clean assignment is still a
 * contested corridor but is at least resolved).
 */
function brckoComponent(result: DaytonResult): number {
    if (result.brcko_status === 'arbitration' || result.brcko_arbitration === true) return 100;
    return 20;
}

/** Refugees sub-component (0-100): total war-displaced not returned, saturating. */
function refugeesComponent(state: GameState): number {
    const cap = state.military?.negotiation?.capital ?? {};
    let total = 0;
    for (const f of [...CANONICAL_FACTIONS].sort(strictCompare)) {
        total += cap[f]?.refugees_created ?? 0;
    }
    return clamp0to100((total / REFUGEES_SATURATION) * 100);
}

/**
 * Condemnation sub-component (0-100): locked Ring-2 rupture flags entrenched by the
 * settlement. Any flag → at least 50 (a peace that does not undo a rupture ratifies
 * it); a genocide condemnation saturates to 100. Non-tradeable by canon — return/
 * justice choices cannot erase a locked rupture.
 */
function condemnationComponent(state: GameState): { score: number; hasGenocide: boolean; any: boolean } {
    const all = new Set<string>();
    for (const f of [...CANONICAL_FACTIONS].sort(strictCompare)) {
        for (const flag of collectCondemnationFlags(state, f)) all.add(flag);
    }
    if (all.size === 0) return { score: 0, hasGenocide: false, any: false };
    const hasGenocide = all.has('genocide_condemnation');
    const score = hasGenocide ? 100 : Math.min(100, 50 + (all.size - 1) * 15);
    return { score, hasGenocide, any: true };
}

/**
 * Compute the full deterministic PeaceDysfunctionBreakdown for the frozen Dayton
 * settlement, or null if there is no Dayton result or the run is not emergent-mode.
 */
export function computePeaceDysfunctionBreakdown(state: GameState): PeaceDysfunctionBreakdown | null {
    // EMERGENT-GATED — keep historical baselines byte-identical.
    if (state.meta?.decision_mode !== 'emergent') return null;

    const result = state.military?.negotiation?.dayton_result;
    if (!result) return null;

    const autonomy = autonomyComponent(result);
    const fragmentation = fragmentationComponent(result);
    const brcko = brckoComponent(result);
    const refugees = refugeesComponent(state);
    const condemnation = condemnationComponent(state);

    const index = clamp0to100(
        autonomy * DYSFUNCTION_WEIGHTS.autonomy +
        fragmentation * DYSFUNCTION_WEIGHTS.fragmentation +
        brcko * DYSFUNCTION_WEIGHTS.brcko +
        refugees * DYSFUNCTION_WEIGHTS.refugees +
        condemnation.score * DYSFUNCTION_WEIGHTS.condemnation,
    );

    // Structural flags — deterministic, sorted.
    const flags: string[] = [];
    if (fragmentation >= 60) flags.push(FLAG_FROZEN_PARTITION);
    if (autonomy >= 60) flags.push(FLAG_GRIDLOCK_BY_DESIGN);
    if (brcko >= 100) flags.push(FLAG_BRCKO_UNRESOLVED);
    if (refugees >= 50) flags.push(FLAG_REFUGEES_NOT_RETURNED);
    if (condemnation.any) flags.push(FLAG_RATIFIED_CLEANSING);
    flags.sort(strictCompare);

    return {
        index: round1(index),
        autonomy_component: round1(autonomy),
        fragmentation_component: round1(fragmentation),
        brcko_component: round1(brcko),
        refugees_component: round1(refugees),
        condemnation_component: round1(condemnation.score),
        flags,
    };
}

/**
 * Convenience: just the 0-100 index (or null when not applicable). Used by the
 * endgame snapshot freeze and the verdict outcome-class cap.
 */
export function computePeaceDysfunctionIndex(state: GameState): number | null {
    const breakdown = computePeaceDysfunctionBreakdown(state);
    return breakdown ? breakdown.index : null;
}

// ── Outcome-class cap (D3) ───────────────────────────────────────────────────
//
// A high-dysfunction peace can never grade above hollow_victory / pyrrhic_success
// regardless of territory. This mirrors the condemnation-flag cap in
// classifyOutcome (scoring.ts). Worse outcome classes are left untouched; only the
// "clean win" tiers (strategic_success / survival / negotiated_escape) are pulled
// down. Pure, deterministic.

/** Dysfunction index at/above which the verdict cannot read as a clean settlement. */
export const PEACE_DYSFUNCTION_CAP_THRESHOLD = 60;

/** Outcome classes considered "clean wins" that a dysfunctional peace must cap. */
const CLEAN_WIN_CLASSES = new Set(['strategic_success', 'survival', 'negotiated_escape']);

/**
 * Cap an outcome class by the peace dysfunction index. When the index meets the
 * threshold, any clean-win class collapses to 'hollow_victory'. Never improves an
 * outcome; pyrrhic_success and worse are returned unchanged.
 */
export function capOutcomeByPeaceDysfunction<T extends string>(
    outcomeClass: T,
    dysfunctionIndex: number | null | undefined,
): T {
    if (typeof dysfunctionIndex !== 'number') return outcomeClass;
    if (dysfunctionIndex < PEACE_DYSFUNCTION_CAP_THRESHOLD) return outcomeClass;
    if (CLEAN_WIN_CLASSES.has(outcomeClass)) return 'hollow_victory' as T;
    return outcomeClass;
}

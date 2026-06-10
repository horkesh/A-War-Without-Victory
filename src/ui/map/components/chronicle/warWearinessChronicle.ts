/**
 * War-Weariness Chronicle beats — Collapse Repurpose Design A (the narrative half).
 *
 * Provenance: docs/40_reports/proposals/20260610_COLLAPSE_REPURPOSE_EXHAUSTION_SCOPE.md
 * (Design A, framing (c) — the Chronicle/consequence-log surface).
 *
 * Emits a somber Chronicle beat when a faction has CROSSED a war-weariness
 * threshold (into strained / cracking / collapsing), conveying the negative-sum
 * grind — war-weariness, not victory. Reuses the existing Chronicle generation
 * path (generateChronicleEntries appends these).
 *
 * WHY THIS IS DETERMINISTIC AND PERSISTED-STATE-FREE:
 *   `war_exhaustion` is MONOTONIC and irreversible (Engine Invariants §8). A
 *   faction's CURRENT band is therefore also the highest band it has ever
 *   reached — so "has this faction crossed into <band>?" is answerable from the
 *   current value alone, with NO per-turn history field and NO read-model cache.
 *   For a faction now at rank R we emit one beat per crossed band 1..R
 *   (strained, cracking, collapsing), each carrying a STABLE id
 *   (`war-weariness-<faction>-<band>`) so the Chronicle layer de-duplicates them
 *   naturally and they never double-fire. The beats are dated at the latest
 *   recorded turn (the read cannot recover the exact crossing turn without a
 *   history field, which the scope explicitly tells us to avoid; monotonicity
 *   makes "currently crossed" the honest, inert signal).
 *
 * UNIVERSAL / NEGATIVE-SUM: beats are emitted for ALL three factions, not just
 * the player's — by 1995 everyone was spent. The prose is faction-agnostic
 * grind, never a "winning" frame.
 *
 * CALIBRATION-INERT: pure read of state.political.war_exhaustion (+ optional
 * collapse_eligibility). Touches no sim state, writes nothing, moves no
 * territory. Byte-identical sim.
 *
 * Determinism: factions iterated in fixed order; no RNG, no clock.
 */

import type { FactionId, GameState } from '../../../../state/game_state.js';
import { getPlayerSafeMilitaryFactionName } from '../../utils/playerSafeText.js';
import {
    WAR_WEARINESS_GLOSS,
    WAR_WEARINESS_LABEL,
    WAR_WEARINESS_RANK,
    deriveWarWeariness,
    type WarWearinessLevel,
} from '../../data/warWeariness.js';
import type { ChronicleEntry } from './generateChronicleEntries.js';

/** Bands that warrant a beat (steady is the baseline — no beat), lowest → highest. */
const BEAT_BANDS: readonly WarWearinessLevel[] = ['strained', 'cracking', 'collapsing'];

/** Fixed faction iteration order for determinism. */
const FACTION_ORDER: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'];

/** Headline only the deepest band (collapsing) — the rest are quiet ledger beats. */
function isHeadlineBand(band: WarWearinessLevel): boolean {
    return band === 'collapsing';
}

/**
 * Build war-weariness threshold-crossing Chronicle beats from the live raw
 * GameState (carried on the parsed chronicle view as `rawGameState`, the same
 * handle buildConsequenceReceiptEntries reads). Returns [] when the raw state or
 * the war_exhaustion map is absent (e.g. legacy fixtures) — never throws.
 *
 * @param rawState   live GameState handle, or undefined.
 * @param latestTurn turn to date the beats at (latest recorded turn).
 */
export function buildWarWearinessChronicleEntries(
    rawState: GameState | undefined,
    latestTurn: number,
): ChronicleEntry[] {
    const warExhaustion = rawState?.political?.war_exhaustion;
    if (!warExhaustion || typeof warExhaustion !== 'object') return [];

    const collapseEligibility = rawState?.political?.collapse_eligibility;
    const turn = Number.isFinite(latestTurn) ? latestTurn : 0;
    const entries: ChronicleEntry[] = [];

    for (const fid of FACTION_ORDER) {
        const raw = Number((warExhaustion as Partial<Record<FactionId, number>>)[fid] ?? 0);
        const descriptor = deriveWarWeariness(raw, collapseEligibility?.[fid]);
        if (descriptor.rank <= WAR_WEARINESS_RANK.steady) continue;

        const factionName = getPlayerSafeMilitaryFactionName(fid);

        // Monotonic accumulator ⇒ emit one beat per band crossed up to the
        // current rank (strained .. current). Stable ids dedupe across reads.
        for (const band of BEAT_BANDS) {
            const bandRank = WAR_WEARINESS_RANK[band];
            if (bandRank > descriptor.rank) break; // bands are ordered; nothing deeper crossed
            entries.push({
                id: `war-weariness-${fid}-${band}`,
                turn,
                type: 'consequence',
                headline: isHeadlineBand(band),
                title: `War-weariness: ${factionName} — ${WAR_WEARINESS_LABEL[band]}`,
                detail: WAR_WEARINESS_GLOSS[band],
            });
        }
    }

    return entries;
}

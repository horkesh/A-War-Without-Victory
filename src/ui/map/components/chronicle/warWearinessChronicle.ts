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
 * WHY THIS IS DETERMINISTIC:
 *   `war_exhaustion` is MONOTONIC and irreversible (Engine Invariants §8). A
 *   faction's CURRENT band is therefore also the highest band it has ever
 *   reached — so "has this faction crossed into <band>?" is answerable from the
 *   current value alone. For a faction now at rank R we emit one beat per crossed
 *   band 1..R (strained, cracking, collapsing), each carrying a STABLE id
 *   (`war-weariness-<faction>-<band>`).
 *
 * WHY EACH BEAT IS PINNED TO THE CROSSING TURN (Codex #402 fix):
 *   The Chronicle UI groups entries by `entry.turn` and does NOT de-dupe by id,
 *   so a beat dated at the *latest* turn re-surfaces as a fresh current-week
 *   item on EVERY render once a faction stays in a non-steady band (the
 *   monotonic accumulator never drops back). To make each (faction, band) beat
 *   appear ONCE, at the week it was actually crossed, we pin `turn` to
 *   `political.war_weariness_band_first_reached[faction][band]` — the engine's
 *   OBSERVATIONAL first-crossing anchor (recordWarWearinessBandCrossings, written
 *   once per crossing and never moved). The current monotonic value tells us a
 *   band IS crossed but not WHEN; the anchor supplies the when. Legacy/absent
 *   anchor (pre-fix saves, or the headless read path) falls back to `latestTurn`
 *   — degraded but still emitted, never throwing.
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

import type { FactionId, GameState, WarWearinessBand } from '../../../../state/game_state.js';
import { getPlayerSafeMilitaryFactionName } from '../../utils/playerSafeText.js';
import {
    WAR_WEARINESS_RANK,
    deriveWarWeariness,
    type WarWearinessLevel,
} from '../../data/warWeariness.js';
import { t, type MessageKey } from '../../i18n/index.js';
import type { ChronicleEntry } from './generateChronicleEntries.js';

/** Bands that warrant a beat (steady is the baseline — no beat), lowest → highest.
 *  Typed as the steady-excluded WarWearinessBand so it can index the
 *  war_weariness_band_first_reached anchor without a steady key. */
const BEAT_BANDS: readonly WarWearinessBand[] = ['strained', 'cracking', 'collapsing'];

/** Fixed faction iteration order for determinism. */
const FACTION_ORDER: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'];

const WAR_WEARINESS_LABEL_KEYS: Record<WarWearinessBand, MessageKey> = {
    strained: 'chronicle.generated.warWeariness.label.strained',
    cracking: 'chronicle.generated.warWeariness.label.cracking',
    collapsing: 'chronicle.generated.warWeariness.label.collapsing',
};

const WAR_WEARINESS_GLOSS_KEYS: Record<WarWearinessBand, MessageKey> = {
    strained: 'chronicle.generated.warWeariness.gloss.strained',
    cracking: 'chronicle.generated.warWeariness.gloss.cracking',
    collapsing: 'chronicle.generated.warWeariness.gloss.collapsing',
};

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
    const firstReached = rawState?.political?.war_weariness_band_first_reached;
    const fallbackTurn = Number.isFinite(latestTurn) ? latestTurn : 0;
    const entries: ChronicleEntry[] = [];

    for (const fid of FACTION_ORDER) {
        const raw = Number((warExhaustion as Partial<Record<FactionId, number>>)[fid] ?? 0);
        const descriptor = deriveWarWeariness(raw, collapseEligibility?.[fid]);
        if (descriptor.rank <= WAR_WEARINESS_RANK.steady) continue;

        const factionName = getPlayerSafeMilitaryFactionName(fid);
        const reachedByBand = firstReached?.[fid];

        // Monotonic accumulator ⇒ emit one beat per band crossed up to the
        // current rank (strained .. current). Each beat is pinned to the turn
        // that band was FIRST crossed (observational anchor) so it appears once
        // at that week — not re-dated to the latest turn every render (#402).
        for (const band of BEAT_BANDS) {
            const bandRank = WAR_WEARINESS_RANK[band];
            if (bandRank > descriptor.rank) break; // bands are ordered; nothing deeper crossed
            const crossedTurn = reachedByBand?.[band];
            const turn = typeof crossedTurn === 'number' && Number.isFinite(crossedTurn)
                ? crossedTurn
                : fallbackTurn; // legacy/absent anchor: degrade to latest turn
            entries.push({
                id: `war-weariness-${fid}-${band}`,
                turn,
                type: 'consequence',
                headline: isHeadlineBand(band),
                title: t('chronicle.generated.warWeariness.title', {
                    factionName,
                    label: t(WAR_WEARINESS_LABEL_KEYS[band]),
                }),
                detail: t(WAR_WEARINESS_GLOSS_KEYS[band]),
            });
        }
    }

    return entries;
}

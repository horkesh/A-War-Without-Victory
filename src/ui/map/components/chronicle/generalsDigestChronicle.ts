/**
 * Generals' Digest Chronicle beats — "what your generals did this week" (D2 task #42).
 *
 * Fills the silent stretches with the PLAYER'S OWN military week: on a turn when no
 * decision fires in their chair, the Chronicle still carries one factual digest card —
 * which of their corps held the line, which pressed an advance, what ground changed
 * hands, what it cost — so advancing a turn always shows the war continuing through
 * their generals. This is the "what did my corps do for 3 years" gap (REAL_WAR_MASTER)
 * made legible.
 *
 * WHAT IT EMITS (one beat family, `generals-digest-<turn>`, at most one per turn):
 *   - For each turn in the player's recorded history, a single military digest card
 *     dated AT THAT TURN with a STABLE id. The card reports the player faction's week:
 *     corps operations under way, settlements held/taken/lost, own attrition. The
 *     newest turn is additionally enriched with the live in-execution operations off
 *     the corps_command snapshot (which is a CURRENT-state field, not a per-turn
 *     history — so it only colours the latest week, never re-dated into the past).
 *   - A genuinely SILENT week (no ops, no battles, no ground change, no losses) earns a
 *     quiet "the fronts were quiet" beat — the war grinding on without a battle to mark
 *     the week. These are NOT headlines (they are ambient cadence, the dead-air filler).
 *
 * §6 GUARDRAIL: this is a MILITARY digest — corps lines, advances, attrition, quiet
 * fronts. It is NOT the Srebrenica/Žepa rupture receipt (task #39, separately §6-gated)
 * and authors no atrocity, perpetrator, or enclave-by-name. The prose is the dry
 * order-of-battle week, pinned clean by `assertDigestProseClean` in the unit test.
 *
 * FACTION-AWARE: scoped strictly to the player's OWN faction's generals (corps by
 * id-prefix, battles by the player as a party, ground by the player's territory_net).
 * An observer (no player faction) gets nothing — the digest is a chair surface.
 *
 * CALIBRATION-INERT: pure read of the parsed TurnSummary history + the live
 * corps_command snapshot. Touches no sim state, writes nothing, moves no territory.
 * Byte-identical sim.
 *
 * Determinism: turns iterated in ascending numeric order; corps sorted via
 * strictCompare in the derivation; no RNG, no clock.
 */

import {
    deriveDigestTurn,
    generalsDigestGloss,
    generalsDigestTitle,
    isQuietWeek,
    type DigestFaction,
} from '../../data/generalsDigest.js';
import type { ChronicleEntry } from './generateChronicleEntries.js';

function asDigestFaction(fid: string | null | undefined): DigestFaction | null {
    return fid === 'RBiH' || fid === 'RS' || fid === 'HRHB' ? fid : null;
}

/**
 * Build the per-turn generals'-digest Chronicle beats.
 *
 * @param turnSummaries the parsed per-turn TurnSummary history (state.turnSummaries).
 * @param playerFaction the viewing player's faction (the digest is their chair), or null.
 * @param corpsCommand  the live corps_command snapshot (state.rawGameState.corps_command);
 *                      only the LATEST turn's digest reads it (it is current-state, not history).
 * @param latestTurn    the newest recorded turn — the only turn enriched with live ops.
 *
 * Returns [] when there is no player faction (observer) or no turn history. Never throws.
 */
export function buildGeneralsDigestChronicleEntries(
    turnSummaries: unknown,
    playerFaction: string | null | undefined,
    corpsCommand: unknown,
    latestTurn: number,
): ChronicleEntry[] {
    const faction = asDigestFaction(playerFaction);
    if (!faction) return [];
    if (!Array.isArray(turnSummaries) || turnSummaries.length === 0) return [];

    const upper = Number.isFinite(latestTurn) ? latestTurn : Number.POSITIVE_INFINITY;

    // Sort summaries ascending by turn for deterministic, in-order emission.
    const ordered = [...turnSummaries]
        .filter((s) => {
            const t = Number((s as { turn?: unknown })?.turn ?? NaN);
            return Number.isFinite(t) && t <= upper;
        })
        .sort((a, b) => Number((a as { turn?: unknown }).turn ?? 0) - Number((b as { turn?: unknown }).turn ?? 0));
    if (ordered.length === 0) return [];

    const latestRecorded = Number((ordered[ordered.length - 1] as { turn?: unknown }).turn ?? 0) || 0;
    const entries: ChronicleEntry[] = [];

    for (const summary of ordered) {
        const turn = Number((summary as { turn?: unknown }).turn ?? 0) || 0;
        // Live ops are a current-state snapshot → only the newest turn reads them.
        const cmd = turn === latestRecorded ? corpsCommand : undefined;
        const digest = deriveDigestTurn(summary, faction, cmd);
        const quiet = isQuietWeek(digest);

        entries.push({
            id: `generals-digest-${turn}`,
            turn,
            type: 'military',
            // Active operations or own losses earn a headline; ambient/quiet weeks do not.
            headline: digest.activeOps.some((op) => op.pressing) || digest.ownFormationsDestroyed > 0,
            title: generalsDigestTitle(digest),
            detail: generalsDigestGloss(digest),
            metadata: quiet
                ? undefined
                : {
                    corpsId: digest.activeOps.length > 0 ? digest.activeOps[0].corpsId : undefined,
                    casualties: digest.friendlyCasualties > 0 ? digest.friendlyCasualties : undefined,
                    netFriendlyTerritory: digest.netTerritory !== 0 ? digest.netTerritory : undefined,
                    ownFormationsDestroyed: digest.ownFormationsDestroyed,
                },
        });
    }

    return entries;
}

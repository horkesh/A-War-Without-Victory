/**
 * Refugee-Flow Chronicle beats — D2 cadence beats for the mid-1995 void (task #40).
 *
 * Provenance: docs/40_reports/playtest/20260610_D2_PREP_AUDIT.md (the w140-160
 * decision-void diagnosis). Fills the silent stretches — where the front barely
 * moves and no event fires for many weeks — with somber, OBSERVATIONAL
 * humanitarian cadence so advancing turns through the worst dead stretch (the
 * Srebrenica/Žepa climax) is not dead air.
 *
 * WHAT IT EMITS (two beat families, both keyed off the persisted, turn-keyed
 * `displacement.displacement_recent_by_turn` field — no new persisted field):
 *   1. CUMULATIVE-MILESTONE beats — one per ascending displacement rung
 *      (250k, 500k, … 2M), pinned to the FIRST turn the running total crossed
 *      that rung. The early-war expulsions cross the low rungs in 1992; the slow
 *      late-war grind plus the 1995 enclave-flight waves push the total across
 *      the upper rungs through mid/late 1995 — landing cadence in the void.
 *   2. SURGE beats — one per turn whose refugee flow stands well above the
 *      steady trickle (>= absolute floor AND >= ratio × the prior turn's flow),
 *      pinned to that turn. These mark the sudden displacement waves (the 1992
 *      expulsions and the 1995 enclave-flight weeks) without attributing them.
 *
 * WHY DETERMINISTIC + WHY TURN-PINNED:
 *   `displacement_recent_by_turn` is a per-turn additive tally. Accumulating it
 *   in sorted turn order (sums commute) recovers a monotonic running total whose
 *   crossing turns and surge turns are stable functions of the state alone. Each
 *   beat carries a STABLE id and is dated at the turn the milestone/surge
 *   actually occurred — so it surfaces ONCE, at that week, not re-dated to the
 *   latest turn on every render (the #402 monotonic-re-emit trap the
 *   war-weariness beats also avoid).
 *
 * §6 GUARDRAIL: this is the AMBIENT cadence AROUND the Srebrenica/Žepa rupture,
 * never the rupture receipt (task #39, separately §6-gated). The prose observes
 * displacement totals/waves; it names no atrocity, perpetrator, or enclave, and
 * must not pre-empt or minimise the §6 record. Tone stays somber and
 * faction-agnostic — the negative-sum human cost, not a scoreboard.
 *
 * CALIBRATION-INERT: pure read of state.displacement.displacement_recent_by_turn.
 * Touches no sim state, writes nothing, moves no territory. Byte-identical sim.
 *
 * Determinism: turns iterated in ascending numeric order; rungs in fixed order;
 * no RNG, no clock.
 */

import type { GameState } from '../../../../state/game_state.js';
import {
    REFUGEE_MILESTONE_RUNGS,
    REFUGEE_SURGE_ABSOLUTE_FLOOR,
    REFUGEE_SURGE_RATIO,
    refugeeMilestoneGloss,
    refugeeSurgeGloss,
} from '../../data/refugeeFlow.js';
import type { ChronicleEntry } from './generateChronicleEntries.js';

/**
 * Build refugee-flow cadence Chronicle beats from the live raw GameState
 * (carried on the parsed chronicle view as `rawGameState`, the same handle the
 * war-weariness beats read). Returns [] when the raw state or the per-turn
 * displacement tally is absent (e.g. legacy fixtures / headless paths that don't
 * carry it) — never throws.
 *
 * @param rawState   live GameState handle, or undefined.
 * @param latestTurn upper bound; turns beyond it are ignored (defensive — the
 *                   tally should never carry a future turn, but a beat is never
 *                   dated past the current week).
 */
export function buildRefugeeFlowChronicleEntries(
    rawState: GameState | undefined,
    latestTurn: number,
): ChronicleEntry[] {
    const recentByTurn = rawState?.displacement?.displacement_recent_by_turn;
    if (!recentByTurn || typeof recentByTurn !== 'object') return [];

    const upperBound = Number.isFinite(latestTurn) ? latestTurn : Number.POSITIVE_INFINITY;

    // Sorted ascending numeric turn order — deterministic accumulation.
    const turns = Object.keys(recentByTurn)
        .map((k) => Number(k))
        .filter((t) => Number.isFinite(t) && t <= upperBound)
        .sort((a, b) => a - b);
    if (turns.length === 0) return [];

    const entries: ChronicleEntry[] = [];

    // --- Family 1: cumulative-displacement milestone crossings ---
    let cumulative = 0;
    let nextRung = 0; // index into REFUGEE_MILESTONE_RUNGS
    for (const turn of turns) {
        const flow = Number((recentByTurn as Record<number, number>)[turn] ?? 0);
        const safeFlow = Number.isFinite(flow) && flow > 0 ? flow : 0;
        cumulative += safeFlow;

        // Cross every rung the running total has now reached (a single big turn
        // can cross several at once — each gets its own beat at this turn).
        while (
            nextRung < REFUGEE_MILESTONE_RUNGS.length
            && cumulative >= REFUGEE_MILESTONE_RUNGS[nextRung]
        ) {
            const rung = REFUGEE_MILESTONE_RUNGS[nextRung];
            entries.push({
                id: `refugee-milestone-${rung}`,
                turn,
                type: 'humanitarian',
                // The deepest rungs (>= 1M displaced) headline; the rest are
                // quiet ledger beats so the cadence never shouts.
                headline: rung >= 1_000_000,
                title: `Refugee tally: ${(rung / 1000).toLocaleString('en-US')},000 displaced`,
                detail: refugeeMilestoneGloss(rung),
                metadata: { displaced: rung },
            });
            nextRung += 1;
        }

        // --- Family 2: single-turn displacement surges ---
        // A sudden wave standing well above the actual prior week. Missing
        // weeks are true zero-flow weeks, not aliases for the last recorded key.
        const priorFlow = Number((recentByTurn as Record<number, number>)[turn - 1] ?? 0);
        const safePriorFlow = Number.isFinite(priorFlow) && priorFlow > 0 ? priorFlow : 0;
        if (
            safeFlow >= REFUGEE_SURGE_ABSOLUTE_FLOOR
            && safeFlow >= REFUGEE_SURGE_RATIO * Math.max(safePriorFlow, 1)
        ) {
            entries.push({
                id: `refugee-surge-${turn}`,
                turn,
                type: 'humanitarian',
                headline: false,
                title: 'Displacement wave',
                detail: refugeeSurgeGloss(safeFlow),
                metadata: { displaced: safeFlow },
            });
        }
    }

    return entries;
}

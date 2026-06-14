/**
 * Refugee-Flow FEEL surface — D2 cadence beats (task #40, the mid-1995 void).
 *
 * Provenance: docs/40_reports/playtest/20260610_D2_PREP_AUDIT.md (the w140-160
 * "decision void" diagnosis — 17 of 21 weeks in that window fire zero events,
 * the worst 10-week dead stretch sits exactly on the Srebrenica/Žepa climax).
 *
 * PURE READ-MODEL. This module derives somber refugee-flow cadence notes from a
 * field already on the live GameState — it touches NO sim state, writes NO
 * persisted field, bumps NO save schema, and moves NO territory or combat. It is
 * the AMBIENT humanitarian cadence AROUND the §6 rupture, never the rupture
 * receipt itself (that is task #39, separately §6-gated). These notes observe
 * the displacement TOTALS and SURGES; they do NOT name an atrocity, a
 * perpetrator, or an enclave — they must not pre-empt or minimise the §6 record.
 *
 * SIGNAL: `state.displacement.displacement_recent_by_turn` — the per-turn sum of
 * `displaced + killed + fled_abroad` for that turn's displacement events. This
 * field is PERSISTED (schema substrate), turn-keyed, and survives the per-turn
 * event-log clear (war_phases.ts clear-displacement-event-log), so the exact
 * turn a cumulative milestone is crossed — or a single-turn surge occurs — is
 * recoverable deterministically from the live state alone, with no new history
 * field. Accumulating it in sorted turn order is order-insensitive (sums
 * commute) and gives a monotonic running total.
 *
 * HISTORY: the Bosnian war displaced ~2.2M people — over half the pre-war
 * population. The flow was front-loaded (the 1992 expulsions) then ground on in
 * waves through the enclave falls of 1995. These notes make that grinding,
 * negative-sum human cost LEGIBLE across the long stretches where the front
 * barely moves and no decision lands in the player's chair — the country
 * emptying out even as the map sits still.
 *
 * Determinism: pure function of its numeric input. No RNG, no clock.
 */

/** Cumulative-displacement milestone rungs (people displaced, ascending).
 *  A beat fires at the FIRST turn the running total crosses each rung. Chosen to
 *  span the whole war: the early-war expulsions cross the low rungs in 1992, and
 *  the slow late-war grind plus the 1995 enclave-flight waves push the running
 *  total across the upper rungs through mid/late 1995 — landing cadence in the
 *  w140-160 void. */
export const REFUGEE_MILESTONE_RUNGS: readonly number[] = [
    250_000,
    500_000,
    750_000,
    1_000_000,
    1_250_000,
    1_500_000,
    1_750_000,
    2_000_000,
];

/** A single-turn displacement SURGE fires when that turn's refugee flow is at
 *  least this many people AND at least SURGE_RATIO times the prior turn's flow —
 *  i.e. a sudden wave standing well above the steady trickle, not the baseline. */
export const REFUGEE_SURGE_ABSOLUTE_FLOOR = 1000;
export const REFUGEE_SURGE_RATIO = 3;

/** Format a people-count as a compact, somber figure (e.g. 1,500,000). */
export function formatRefugeeCount(n: number): string {
    const safe = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    return safe.toLocaleString('en-US');
}

/** Prose for a cumulative-milestone note. Faction-agnostic, non-gamified — the
 *  grind in words. Never names an enclave or perpetrator. */
export function refugeeMilestoneGloss(cumulativeRung: number): string {
    return `The war has now driven ${formatRefugeeCount(cumulativeRung)} people from their homes. `
        + `The front has barely moved; the country empties out regardless.`;
}

/** Prose for a single-turn surge note. Observes a sudden displacement wave
 *  without attributing it — refugee-flow observation only, never the §6 record. */
export function refugeeSurgeGloss(turnFlow: number): string {
    return `A fresh wave of displacement this week — roughly ${formatRefugeeCount(turnFlow)} people uprooted at once. `
        + `Columns on the roads, villages emptied, the human cost arriving faster than any front line.`;
}

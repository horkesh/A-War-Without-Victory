/**
 * Bounded Dayton rounds (DC plan amendment A2, owner 2026-11-08).
 *
 * The table is no longer probed for free. The player TABLES a draft; every other
 * delegation answers; the round is recorded on the pending packet and persisted.
 * There are at most DAYTON_MAX_ROUNDS rounds. Each tabled round raises the patrons'
 * pressure on their clients by ROUND_PRESSURE_STEP authority points, up to two steps,
 * for every later answer and for the signature. After the last round the player can
 * only sign or decline (the existing decline path, which leads to the forced table).
 *
 * Pressure has one reader: `effectiveDaytonOverride`. Every Dayton check that asks
 * whether a patron can force its client (bot willingness, territorial forcing and its
 * area budget, institutional and constitutional forcing) reads it. With no tabled
 * round, as in every headless or historical-default resolution, it returns the stored
 * authority unchanged, so those results are byte-identical.
 *
 * Deterministic: sorted faction iteration, integer arithmetic, no clock or RNG.
 */
import type { FactionId, GameState } from '../../state/game_state.js';
import type { DaytonProposal, DaytonRound, NegotiationState } from '../../state/negotiation_types.js';

export const DAYTON_MAX_ROUNDS = 3;
/** Authority points each tabled round adds to every patron's hold on its client. */
export const ROUND_PRESSURE_STEP = 10;
/** Pressure stops rising after this many tabled rounds. */
const MAX_PRESSURE_STEPS = 2;

/** Rounds tabled so far on the open table (0 when none or no table). */
export function daytonRoundsTabled(neg: Pick<NegotiationState, 'pending_dayton'> | undefined): number {
    return Math.min(DAYTON_MAX_ROUNDS, neg?.pending_dayton?.rounds?.length ?? 0);
}

/** Added patron authority from the rounds tabled so far. */
export function daytonRoundPressure(neg: Pick<NegotiationState, 'pending_dayton'> | undefined): number {
    return ROUND_PRESSURE_STEP * Math.min(MAX_PRESSURE_STEPS, daytonRoundsTabled(neg));
}

/**
 * The mediator's deadline (walkthrough 2026-11-08): patron authority alone rarely sits
 * near a threshold, so +20 authority changed no answer on the retained saves. Each
 * tabled round also widens what every delegation is willing to give by this fraction
 * of its capital, two steps at most, in the bot's answer and in the signing checks.
 */
export const ROUND_WILLINGNESS_STEP = 0.05;

/** Added willingness (fraction of capital) from the rounds tabled so far; 0 with none. */
export function daytonRoundWillingness(neg: Pick<NegotiationState, 'pending_dayton'> | undefined): number {
    return ROUND_WILLINGNESS_STEP * Math.min(MAX_PRESSURE_STEPS, daytonRoundsTabled(neg));
}

/** A patron's authority over `faction` at the table, including round pressure (0..100). */
export function effectiveDaytonOverride(neg: NegotiationState | undefined, faction: string): number {
    const base = neg?.patron_relationships?.[faction]?.override_authority ?? 0;
    const pressure = daytonRoundPressure(neg);
    return pressure === 0 ? base : Math.min(100, base + pressure);
}

/** The round the next tabled draft would be (1..3), or null when the rounds are spent. */
export function nextDaytonRound(neg: Pick<NegotiationState, 'pending_dayton'> | undefined): number | null {
    const tabled = daytonRoundsTabled(neg);
    return tabled >= DAYTON_MAX_ROUNDS ? null : tabled + 1;
}

export type TableDaytonRoundResult =
    | { ok: true; round: DaytonRound }
    | { ok: false; error: 'no_table' | 'already_signed' | 'rounds_spent' };

/**
 * Table a draft: every non-player delegation answers under the current pressure, and
 * the round is appended to the pending packet. `evaluate` is the bot evaluator
 * (injected to keep this module free of an import cycle with bot_negotiation.ts).
 */
export function tableDaytonRound(
    state: GameState,
    proposal: DaytonProposal,
    evaluate: (state: GameState, faction: FactionId, proposal: DaytonProposal) => DaytonRound['responses'][string],
): TableDaytonRoundResult {
    const neg = state.military?.negotiation;
    if (!neg?.pending_dayton) return { ok: false, error: 'no_table' };
    if (neg.dayton_result) return { ok: false, error: 'already_signed' };
    const roundNumber = nextDaytonRound(neg);
    if (roundNumber === null) return { ok: false, error: 'rounds_spent' };
    const player = state.meta.player_faction;
    const responses: DaytonRound['responses'] = {};
    const parties: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'];
    for (const faction of parties) {
        if (faction === player) continue;
        responses[faction] = evaluate(state, faction, proposal);
    }
    const round: DaytonRound = {
        round: roundNumber,
        turn: state.meta.turn,
        pressure: daytonRoundPressure(neg),
        proposal: structuredClone(proposal),
        responses,
    };
    neg.pending_dayton.rounds = [...(neg.pending_dayton.rounds ?? []), round];
    return { ok: true, round };
}

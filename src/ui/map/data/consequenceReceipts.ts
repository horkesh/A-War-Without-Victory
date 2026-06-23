// Consequence-Receipt read-model — closes the promise→receipt loop.
//
// Event decision modals PROMISE downstream consequences via each response
// option's `future_consequences[*].opens_events` / `closes_events`. The engine
// later DELIVERS (or forecloses) those events and records the causal edge in
// `state.military.event_causality_log`. This pure read-model surfaces the
// RECEIPT: "the consequence your dossier predicted N turns ago has now actually
// happened (or was foreclosed) because of your choice."
//
// Design rules (mirrors causality_query.ts + backTheOfficer.ts):
//   - PURE. No state mutation. No engine calls.
//   - DEFENSIVE. Flag-off / pre-substrate saves carry none of these fields;
//     every projection collapses to an empty array.
//   - DETERMINISTIC. Sorted iteration via `strictCompare`. No Math.random,
//     no Date.now, no timestamps.
//   - REALIZED ONLY. We render what the engine already decided — we do NOT
//     compute predictions or re-simulate "what if". The promise is the
//     engine's; we render the receipt.
//
// Reference data contract:
//   - `EventResponseOption.future_consequences[*].opens_events` — predicted ids.
//     The loader (event_loader.ts) enforces enables_events_runtime ⊆
//     future_consequences[*].opens_events, so prediction ids == real causal-edge
//     ids written to event_causality_log with kind:'enables'.
//   - `state.military.event_decision_log` — the player's decisions
//     (event_id, response_id, faction, turn, decision_source).
//   - `state.military.event_causality_log` — {turn, from_event, to_event, kind,
//     source_response_id?}; CONFIRMED requires an enables edge from the
//     deciding event to the predicted event tagged with the chosen response.
//   - `state.military.fired_event_ids` / `event_last_fired_turn[id]` — fired set
//     + per-event fired turn.
//   - `state.military.closed_event_ids` — foreclosed set (→ CONTRADICTED).

import type { GameState } from '../../../state/game_state.js';
import type {
    EventDefinition,
    EventResponseOption,
} from '../../../sim/events/event_types.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { getPlayerSafeDisplayLabel } from '../utils/playerSafeText.js';
import { t } from '../i18n/index.js';
import { playerFactionMatch } from './playerFactionMatch.js';

/** Realization status of a single predicted downstream event. */
export type ConsequenceReceiptStatus = 'confirmed' | 'pending' | 'contradicted';

/** One receipt: a single predicted downstream event from one player decision,
 *  resolved against the engine's realized causality substrate. */
export interface ConsequenceReceipt {
    /** Stable id for keying/dedupe: `<event>::<response>::<predicted>`. */
    id: string;
    /** Originating decision — the event the player responded to. */
    decisionEventId: string;
    /** Player-facing title of the originating event (resolved from catalog;
     *  falls back to a player-safe label when the catalog lacks it). */
    decisionTitle: string;
    /** Player-facing label of the chosen option (resolved from catalog; falls
     *  back to a player-safe label). */
    decisionOptionLabel: string;
    /** Turn the player made the decision. */
    decisionTurn: number;
    /** The predicted downstream event id. */
    predictedEventId: string;
    /** Player-facing label of the predicted consequence (from the dossier's
     *  future_consequence entry; falls back to a player-safe predicted event label). */
    predictedLabel: string;
    /** Dossier explanation of the predicted consequence (when authored). */
    predictedExplanation: string;
    /** Realization status. */
    status: ConsequenceReceiptStatus;
    /** Turn the predicted event actually fired (CONFIRMED only; null otherwise). */
    firedTurn: number | null;
    /** Turns between the decision and the consequence firing (CONFIRMED only;
     *  null otherwise). Non-negative. */
    turnsElapsed: number | null;
}

/** Build a chosen-option lookup keyed by event_id. Last decision wins for
 *  recurring events (matches causality_query's decisionByEvent semantics). */
function chosenResponseByEvent(
    state: GameState,
    playerFaction: string | null,
): Map<string, string> {
    const out = new Map<string, string>();
    for (const dec of state.military?.event_decision_log ?? []) {
        if (dec.decision_source !== 'player') continue;
        if (!playerFactionMatch(dec.faction, playerFaction)) continue;
        out.set(dec.event_id, dec.response_id);
    }
    return out;
}

/** Index enables-edges by `from_event::to_event::response_id` for O(1) CONFIRMED
 *  lookup. Only kind:'enables' edges with a non-null to_event participate. */
function enablesEdgeKeySet(state: GameState): Set<string> {
    const out = new Set<string>();
    for (const entry of state.military?.event_causality_log ?? []) {
        if (entry.kind !== 'enables') continue;
        if (entry.to_event === null) continue;
        out.add(`${entry.from_event}::${entry.to_event}::${entry.source_response_id ?? ''}`);
    }
    return out;
}

function findOption(
    def: EventDefinition | undefined,
    responseId: string,
): EventResponseOption | undefined {
    if (!def) return undefined;
    return (def.response_options ?? []).find((o) => o.id === responseId);
}

function resolveEventFallbackLabel(fallbackId: string): string {
    const displayId = fallbackId.trim().replace(/^(?:evt|event|csq)_/i, '');
    return getPlayerSafeDisplayLabel(displayId || fallbackId, 'Recorded event');
}

/** Resolve a player-facing event title from the catalog, defensively. `title`
 *  is the canonical (typed) display field on EventDefinition; fall back to a
 *  generic, human-readable label so raw event/consequence ids stay internal. */
function resolveEventTitle(
    def: EventDefinition | undefined,
    fallbackId: string,
): string {
    const title = def?.title;
    return typeof title === 'string' && title.trim().length > 0
        ? title
        : resolveEventFallbackLabel(fallbackId);
}

function resolveOptionLabel(option: EventResponseOption, fallbackId: string): string {
    const label = option.label;
    return typeof label === 'string' && label.trim().length > 0
        ? label
        : getPlayerSafeDisplayLabel(fallbackId, 'Recorded response');
}

/** Player-facing label for a faction's coercive patron — sober, factual. */
function patronLabelForFaction(factionId: string): string {
    switch (factionId) {
        case 'RS': return t('chronicle.generated.patron.belgradePossessive');
        case 'HRHB': return t('chronicle.generated.patron.zagrebPossessive');
        default: return t('chronicle.generated.patron.genericPossessive');
    }
}

/**
 * Slice 4a — project the engine's realized patron-defiance supply cuts into
 * one-shot ConsequenceReceipts. Each entry of
 * `state.military.patron_defiance_supply_cuts` records a turn on which refusing /
 * distancing from the patron actually STARVED a faction's materiel (emergent-only;
 * the engine never writes these in historical/calibration mode, so this projection
 * collapses to [] there). Unlike the event-causality receipts, these have no
 * promise→receipt edge (the cut is an engine-state mechanic, not an event decision):
 * we emit a one-shot RECEIPT marked `confirmed` with `firedTurn` = the cut turn,
 * so the existing Turn-Aftermath "Consequences Realized This Turn" section surfaces
 * it via `receiptsRealizedOnTurn`. Wording is factual and never framed as a reward.
 */
function buildPatronDefianceReceipts(state: GameState): ConsequenceReceipt[] {
    const cuts = state.military?.patron_defiance_supply_cuts ?? [];
    if (cuts.length === 0) return [];
    const out: ConsequenceReceipt[] = [];
    for (const cut of cuts) {
        const pct = Math.round(cut.cut_fraction * 100);
        const supportPct = Math.round(cut.support_after * 100);
        const patron = patronLabelForFaction(cut.faction);
        out.push({
            id: `patron_defiance::${cut.faction}::${cut.turn}`,
            decisionEventId: `patron_defiance_${cut.faction}`,
            decisionTitle: t('chronicle.generated.patron.defianceTitle'),
            decisionOptionLabel: t('chronicle.generated.patron.refusedDemand', { patron }),
            decisionTurn: cut.turn,
            predictedEventId: `patron_supply_cut_${cut.faction}`,
            predictedLabel: t('chronicle.generated.patron.materielCut', { patron, pct }),
            predictedExplanation:
                t('chronicle.generated.patron.predictedExplanation', { patron, supportPct }),
            status: 'confirmed',
            firedTurn: cut.turn,
            turnsElapsed: 0,
        });
    }
    return out;
}

/**
 * Build the realized consequence-receipt list from the persisted causality
 * substrate. Returns `[]` when state is absent, or when neither an event-decision
 * prediction nor an emergent patron-defiance cut has been realized.
 *
 * Two receipt sources merge here:
 *   1. Event-causality receipts (promise→receipt; requires a player decision whose
 *      chosen option has `opens_events` and a realized causal edge). Needs `catalog`.
 *   2. Emergent patron-defiance supply-cut receipts (one-shot; engine-state mechanic,
 *      no catalog needed). Emitted only when the engine wrote a non-zero cut.
 *
 * Output is sorted deterministically: CONFIRMED-fired turn ascending (with
 * null fired turns — pending/contradicted — sorted last), then by receipt id
 * via `strictCompare`.
 */
export function buildConsequenceReceipts(
    state: GameState | null | undefined,
    catalog: ReadonlyMap<string, EventDefinition> | null | undefined,
): ConsequenceReceipt[] {
    if (!state) return [];

    // Patron-defiance receipts need no catalog and no event-decision log — they
    // project directly from the engine's realized-cut substrate. Gather them first
    // so they survive the event-causality early-returns below.
    const patronReceipts = buildPatronDefianceReceipts(state);

    const decisionLog = state.military?.event_decision_log ?? [];
    if (!catalog || catalog.size === 0 || decisionLog.length === 0) {
        return sortReceipts(patronReceipts);
    }
    const playerFaction = typeof state.meta?.player_faction === 'string' ? state.meta.player_faction : null;

    const firedIds = new Set(state.military?.fired_event_ids ?? []);
    const closedIds = new Set(state.military?.closed_event_ids ?? []);
    const lastFiredTurn = state.military?.event_last_fired_turn ?? {};
    const edges = enablesEdgeKeySet(state);
    const chosenByEvent = chosenResponseByEvent(state, playerFaction);

    const receipts: ConsequenceReceipt[] = [...patronReceipts];

    for (const dec of decisionLog) {
        // Only player decisions earn a receipt — bot choices are not the
        // player's promise→receipt loop.
        if (dec.decision_source !== 'player') continue;
        if (!playerFactionMatch(dec.faction, playerFaction)) continue;
        // Last-wins: only score the decision that currently owns this event.
        if (chosenByEvent.get(dec.event_id) !== dec.response_id) continue;

        const def = catalog.get(dec.event_id);
        const option = findOption(def, dec.response_id);
        if (!option) continue;
        const futureConsequences = option.future_consequences ?? [];
        if (futureConsequences.length === 0) continue;

        const decisionTitle = resolveEventTitle(def, dec.event_id);
        const decisionOptionLabel = resolveOptionLabel(option, dec.response_id);

        // Dedupe predicted ids within this decision (a predicted id may appear
        // across multiple future_consequence entries).
        const seenPredicted = new Set<string>();

        for (const fc of futureConsequences) {
            const opens = fc.opens_events ?? [];
            for (const predictedId of opens) {
                if (seenPredicted.has(predictedId)) continue;
                seenPredicted.add(predictedId);

                let status: ConsequenceReceiptStatus;
                let firedTurn: number | null = null;
                let turnsElapsed: number | null = null;

                // CONFIRMED requires the predicted event to have fired, a
                // response-tagged enables edge, AND a fired turn AT OR AFTER the
                // decision turn. The engine still records an enables edge when a
                // response "enables" an already-fired event (audit), so the edge
                // alone does not prove causation — confirming a P that fired
                // BEFORE the decision would be a false causal claim. When P fired
                // earlier (or has no recorded fired turn), it is not a receipt of
                // THIS decision: fall through to closed → contradicted, else
                // pending.
                const edgeKey = `${dec.event_id}::${predictedId}::${dec.response_id}`;
                const ft = lastFiredTurn[predictedId];
                const firedAtOrAfterDecision = typeof ft === 'number' && ft >= dec.turn;
                if (firedIds.has(predictedId) && edges.has(edgeKey) && firedAtOrAfterDecision) {
                    status = 'confirmed';
                    firedTurn = ft;
                    turnsElapsed = ft - dec.turn;
                } else if (closedIds.has(predictedId)) {
                    status = 'contradicted';
                } else {
                    status = 'pending';
                }

                const predictedDef = catalog.get(predictedId);
                const predictedLabel = (fc.label?.trim())
                    || resolveEventTitle(predictedDef, predictedId);

                receipts.push({
                    id: `${dec.event_id}::${dec.response_id}::${predictedId}`,
                    decisionEventId: dec.event_id,
                    decisionTitle,
                    decisionOptionLabel,
                    decisionTurn: dec.turn,
                    predictedEventId: predictedId,
                    predictedLabel,
                    predictedExplanation: fc.explanation ?? '',
                    status,
                    firedTurn,
                    turnsElapsed,
                });
            }
        }
    }

    return sortReceipts(receipts);
}

/** Deterministic receipt ordering: CONFIRMED rows (firedTurn != null) by fired
 *  turn ascending; pending/contradicted (firedTurn == null) sort last; tiebreak
 *  by id via `strictCompare`. Pure; returns a new sorted array. */
function sortReceipts(receipts: ConsequenceReceipt[]): ConsequenceReceipt[] {
    return [...receipts].sort((a, b) => {
        const aFired = a.firedTurn;
        const bFired = b.firedTurn;
        if (aFired !== null && bFired !== null && aFired !== bFired) {
            return aFired - bFired;
        }
        if (aFired === null && bFired !== null) return 1;
        if (aFired !== null && bFired === null) return -1;
        return strictCompare(a.id, b.id);
    });
}

/** Convenience filter: receipts whose CONFIRMED firing landed on `turn`.
 *  Used by the Turn Aftermath "consequences realized this turn" section. */
export function receiptsRealizedOnTurn(
    receipts: readonly ConsequenceReceipt[],
    turn: number,
): ConsequenceReceipt[] {
    return receipts.filter((r) => r.status === 'confirmed' && r.firedTurn === turn);
}

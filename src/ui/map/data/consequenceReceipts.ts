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
     *  falls back to the raw id when the catalog lacks it). */
    decisionTitle: string;
    /** Player-facing label of the chosen option (resolved from catalog; falls
     *  back to the raw response id). */
    decisionOptionLabel: string;
    /** Turn the player made the decision. */
    decisionTurn: number;
    /** The predicted downstream event id. */
    predictedEventId: string;
    /** Player-facing label of the predicted consequence (from the dossier's
     *  future_consequence entry; falls back to the predicted event title or id). */
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
function chosenResponseByEvent(state: GameState): Map<string, string> {
    const out = new Map<string, string>();
    for (const dec of state.military?.event_decision_log ?? []) {
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

/** Resolve a player-facing event title from the catalog, defensively. `title`
 *  is the canonical (typed) display field on EventDefinition; fall back to the
 *  raw id when it is absent/blank. */
function resolveEventTitle(
    def: EventDefinition | undefined,
    fallbackId: string,
): string {
    const title = def?.title;
    return typeof title === 'string' && title.trim().length > 0 ? title : fallbackId;
}

/**
 * Build the realized consequence-receipt list from the persisted causality
 * substrate. Returns `[]` when state or catalog is absent/empty, or when no
 * player decision has any `opens_events` prediction.
 *
 * Output is sorted deterministically: CONFIRMED-fired turn ascending (with
 * null fired turns — pending/contradicted — sorted last), then by receipt id
 * via `strictCompare`.
 */
export function buildConsequenceReceipts(
    state: GameState | null | undefined,
    catalog: ReadonlyMap<string, EventDefinition> | null | undefined,
): ConsequenceReceipt[] {
    if (!state || !catalog || catalog.size === 0) return [];
    const decisionLog = state.military?.event_decision_log ?? [];
    if (decisionLog.length === 0) return [];

    const firedIds = new Set(state.military?.fired_event_ids ?? []);
    const closedIds = new Set(state.military?.closed_event_ids ?? []);
    const lastFiredTurn = state.military?.event_last_fired_turn ?? {};
    const edges = enablesEdgeKeySet(state);
    const chosenByEvent = chosenResponseByEvent(state);

    const receipts: ConsequenceReceipt[] = [];

    for (const dec of decisionLog) {
        // Only player decisions earn a receipt — bot choices are not the
        // player's promise→receipt loop.
        if (dec.decision_source !== 'player') continue;
        // Last-wins: only score the decision that currently owns this event.
        if (chosenByEvent.get(dec.event_id) !== dec.response_id) continue;

        const def = catalog.get(dec.event_id);
        const option = findOption(def, dec.response_id);
        if (!option) continue;
        const futureConsequences = option.future_consequences ?? [];
        if (futureConsequences.length === 0) continue;

        const decisionTitle = resolveEventTitle(def, dec.event_id);
        const decisionOptionLabel = option.label?.trim() || dec.response_id;

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

    receipts.sort((a, b) => {
        // CONFIRMED rows (firedTurn != null) sort by fired turn ascending;
        // pending/contradicted (firedTurn == null) sort last. Tiebreak by id.
        const aFired = a.firedTurn;
        const bFired = b.firedTurn;
        if (aFired !== null && bFired !== null && aFired !== bFired) {
            return aFired - bFired;
        }
        if (aFired === null && bFired !== null) return 1;
        if (aFired !== null && bFired === null) return -1;
        return strictCompare(a.id, b.id);
    });

    return receipts;
}

/** Convenience filter: receipts whose CONFIRMED firing landed on `turn`.
 *  Used by the Turn Aftermath "consequences realized this turn" section. */
export function receiptsRealizedOnTurn(
    receipts: readonly ConsequenceReceipt[],
    turn: number,
): ConsequenceReceipt[] {
    return receipts.filter((r) => r.status === 'confirmed' && r.firedTurn === turn);
}

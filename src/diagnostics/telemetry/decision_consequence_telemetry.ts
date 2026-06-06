/**
 * Decision -> Consequence coverage telemetry (READ-ONLY AGGREGATOR).
 *
 * Surfaces the promise->receipt loop into a single deterministic digest suitable
 * for run/session telemetry, end-of-campaign "Wrapped" summaries, and headless
 * coverage diagnostics. It answers: of the consequences the player's decisions
 * PROMISED (each chosen option's `future_consequences[*].opens_events`), how many
 * has the engine since DELIVERED (confirmed), how many are still PENDING, and how
 * many were FORECLOSED (contradicted)? Plus: which branches the player foreclosed,
 * per-faction decision counts, and emergent patron-defiance realized supply cuts.
 *
 * Why a new aggregator (vs. the existing UI read-model `consequenceReceipts.ts`):
 *   - The UI model lives under `src/ui/map/data/` and emits per-receipt rows for a
 *     panel. It is not engine-reusable for headless telemetry and produces no
 *     aggregate coverage rollup. This module is engine-layer (sits beside
 *     `playtest_telemetry.ts`), reuses the canonical engine-side causality query
 *     helpers, and rolls the substrate up into counts + small sorted id lists.
 *   - It is purely ADDITIVE: it reads already-persisted GameState audit fields and
 *     never mutates state, RNG, or any serialized/hashed output.
 *
 * Determinism contract (mirrors causality_query.ts + playtest_telemetry.ts):
 *   - PURE. No state mutation, no engine calls with side effects.
 *   - DEFENSIVE. Flag-off / pre-substrate / legacy saves carry none of these
 *     fields; every projection collapses to zero counts + empty arrays.
 *   - DETERMINISTIC. All id lists sorted via `strictCompare`. No `Math.random`,
 *     no wall-clock, no timestamps. Same state in -> byte-identical digest out.
 *   - REALIZED ONLY. We report what the engine already decided; we never
 *     re-simulate or predict.
 *
 * Catalog-optional:
 *   - WITHOUT a catalog we can still report decision counts, realized
 *     enables-edges from player decisions, foreclosed (closed) ids, and
 *     patron-defiance cuts. (`coverage` requires the catalog because the
 *     PROMISE set lives in each option's `future_consequences`, which is not
 *     persisted in state — only the chosen `response_id` is.)
 *   - WITH a catalog we additionally compute promise->receipt coverage
 *     (confirmed / pending / contradicted) and player-divergence count.
 */

import type { GameState } from '../../state/game_state.js';
import type { EventDefinition, EventResponseOption } from '../../sim/events/event_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    getPlayerDecisionHistory,
    getEventChainSummary,
} from '../../sim/events/causality_query.js';

/** Schema version for the emitted digest (bump on shape change). */
export const DECISION_CONSEQUENCE_TELEMETRY_SCHEMA = 1 as const;

/** Promise->receipt coverage rollup (catalog-derived). All counts are
 *  non-negative integers; `confirmed + pending + contradicted === total`. */
export interface ConsequenceCoverage {
    /** Total distinct (decision-event, response, predicted-event) promises made
     *  by the player's currently-owning decisions. */
    total_promises: number;
    /** Promises whose predicted event has fired with a response-tagged enables
     *  edge AND a fired turn at or after the decision turn. */
    confirmed: number;
    /** Promises whose predicted event has neither fired-as-receipt nor been
     *  foreclosed yet. */
    pending: number;
    /** Promises whose predicted event was explicitly foreclosed (closed). */
    contradicted: number;
    /** confirmed / total_promises, rounded to 4 decimals (0 when no promises). */
    confirmed_ratio: number;
}

/** Per-faction count of player decisions. Sorted by faction id. */
export interface FactionDecisionCountRow {
    faction: string;
    decisions: number;
}

/** Deterministic decision->consequence coverage digest. No timestamps. */
export interface DecisionConsequenceTelemetryDigest {
    schema: typeof DECISION_CONSEQUENCE_TELEMETRY_SCHEMA;
    /** Total player-sourced decisions in the decision log. */
    player_decision_count: number;
    /** Player decisions grouped by faction (sorted by faction id; null faction
     *  is folded into the literal key `unknown`). */
    player_decisions_by_faction: FactionDecisionCountRow[];
    /** Distinct event ids the player decided on (sorted). */
    decided_event_ids: string[];
    /** Distinct event ids explicitly foreclosed (`closed_event_ids`), sorted. */
    foreclosed_event_ids: string[];
    /** Count of realized enables-edges (kind:'enables', non-null to_event) that
     *  originate from an event the player decided on. The engine's delivered
     *  downstream consequences attributable to player decisions. */
    player_enabled_edge_count: number;
    /** Emergent patron-defiance realized supply-cut count (0 in historical /
     *  calibration mode by construction). */
    patron_defiance_cut_count: number;
    /** Promise->receipt coverage. `null` when no catalog was supplied (the
     *  promise set is catalog-only). */
    coverage: ConsequenceCoverage | null;
    /** Player counterfactual-divergence count (decisions diverging from the
     *  event's historical default). `null` without a catalog. */
    player_divergence_count: number | null;
}

/** Round a ratio to 4 decimals deterministically. */
function round4(n: number): number {
    return Math.round(n * 10000) / 10000;
}

/** Build a chosen-option lookup keyed by event_id; last decision wins for
 *  recurring events (matches consequenceReceipts + causality_query semantics). */
function chosenResponseByEvent(state: GameState): Map<string, string> {
    const out = new Map<string, string>();
    for (const dec of state.military?.event_decision_log ?? []) {
        out.set(dec.event_id, dec.response_id);
    }
    return out;
}

/** Index enables-edges by `from_event::to_event::response_id` for O(1) lookup.
 *  Only kind:'enables' edges with a non-null to_event participate. */
function enablesEdgeKeySet(state: GameState): Set<string> {
    const out = new Set<string>();
    for (const entry of state.military?.event_causality_log ?? []) {
        if (entry.kind !== 'enables') continue;
        if (entry.to_event === null) continue;
        out.add(`${entry.from_event}::${entry.to_event}::${entry.source_response_id ?? ''}`);
    }
    return out;
}

/** Find a response option on an event definition. */
function findOption(
    def: EventDefinition | undefined,
    responseId: string,
): EventResponseOption | undefined {
    if (!def) return undefined;
    return (def.response_options ?? []).find((o) => o.id === responseId);
}

/**
 * Compute promise->receipt coverage from the persisted substrate plus the
 * event catalog. Mirrors the per-receipt classification in
 * `src/ui/map/data/consequenceReceipts.ts` (confirmed / pending / contradicted)
 * but rolls it up into counts. Returns zeroed coverage when there are no player
 * promises.
 */
function computeCoverage(
    state: GameState,
    catalog: ReadonlyMap<string, EventDefinition>,
): ConsequenceCoverage {
    const decisionLog = state.military?.event_decision_log ?? [];
    const firedIds = new Set(state.military?.fired_event_ids ?? []);
    const closedIds = new Set(state.military?.closed_event_ids ?? []);
    const lastFiredTurn = state.military?.event_last_fired_turn ?? {};
    const edges = enablesEdgeKeySet(state);
    const chosenByEvent = chosenResponseByEvent(state);

    let total = 0;
    let confirmed = 0;
    let contradicted = 0;

    for (const dec of decisionLog) {
        // Only the player's promise->receipt loop counts here.
        if (dec.decision_source !== 'player') continue;
        // Last-wins: only score the decision currently owning this event.
        if (chosenByEvent.get(dec.event_id) !== dec.response_id) continue;

        const option = findOption(catalog.get(dec.event_id), dec.response_id);
        if (!option) continue;
        const futureConsequences = option.future_consequences ?? [];
        if (futureConsequences.length === 0) continue;

        // Dedupe predicted ids within this decision (a predicted id may appear
        // across multiple future_consequence entries).
        const seenPredicted = new Set<string>();
        for (const fc of futureConsequences) {
            for (const predictedId of fc.opens_events ?? []) {
                if (seenPredicted.has(predictedId)) continue;
                seenPredicted.add(predictedId);

                total += 1;
                const edgeKey = `${dec.event_id}::${predictedId}::${dec.response_id}`;
                const ft = lastFiredTurn[predictedId];
                const firedAtOrAfter = typeof ft === 'number' && ft >= dec.turn;
                if (firedIds.has(predictedId) && edges.has(edgeKey) && firedAtOrAfter) {
                    confirmed += 1;
                } else if (closedIds.has(predictedId)) {
                    contradicted += 1;
                }
                // else: pending (derived below).
            }
        }
    }

    const pending = total - confirmed - contradicted;
    return {
        total_promises: total,
        confirmed,
        pending,
        contradicted,
        confirmed_ratio: total > 0 ? round4(confirmed / total) : 0,
    };
}

/** Count realized enables-edges that originate from an event the player decided
 *  on. Engine-delivered downstream consequences attributable to player choices. */
function countPlayerEnabledEdges(
    state: GameState,
    decidedEventIds: ReadonlySet<string>,
): number {
    let count = 0;
    for (const entry of state.military?.event_causality_log ?? []) {
        if (entry.kind !== 'enables') continue;
        if (entry.to_event === null) continue;
        if (decidedEventIds.has(entry.from_event)) count += 1;
    }
    return count;
}

/**
 * Build the deterministic decision->consequence coverage digest from the
 * persisted causality substrate. `catalog` is OPTIONAL: without it, `coverage`
 * and `player_divergence_count` are `null` but all substrate-only counts are
 * still produced. Returns a fully-zeroed digest for absent/empty state.
 */
export function buildDecisionConsequenceTelemetry(
    state: GameState | null | undefined,
    catalog?: ReadonlyMap<string, EventDefinition> | null,
): DecisionConsequenceTelemetryDigest {
    const hasCatalog = !!catalog && catalog.size > 0;

    if (!state) {
        return {
            schema: DECISION_CONSEQUENCE_TELEMETRY_SCHEMA,
            player_decision_count: 0,
            player_decisions_by_faction: [],
            decided_event_ids: [],
            foreclosed_event_ids: [],
            player_enabled_edge_count: 0,
            patron_defiance_cut_count: 0,
            coverage: hasCatalog
                ? { total_promises: 0, confirmed: 0, pending: 0, contradicted: 0, confirmed_ratio: 0 }
                : null,
            player_divergence_count: hasCatalog ? 0 : null,
        };
    }

    const players = getPlayerDecisionHistory(state);

    // Per-faction decision counts (null faction folds into 'unknown').
    const byFaction = new Map<string, number>();
    const decidedEventIds = new Set<string>();
    for (const dec of players) {
        const key = dec.faction ?? 'unknown';
        byFaction.set(key, (byFaction.get(key) ?? 0) + 1);
        decidedEventIds.add(dec.event_id);
    }
    const player_decisions_by_faction: FactionDecisionCountRow[] = Array.from(byFaction.keys())
        .sort(strictCompare)
        .map((faction) => ({ faction, decisions: byFaction.get(faction)! }));

    const foreclosed_event_ids = Array.from(
        new Set(state.military?.closed_event_ids ?? []),
    ).sort(strictCompare);

    const player_enabled_edge_count = countPlayerEnabledEdges(state, decidedEventIds);

    const patron_defiance_cut_count = (state.military?.patron_defiance_supply_cuts ?? []).length;

    const coverage = hasCatalog ? computeCoverage(state, catalog!) : null;
    const player_divergence_count = hasCatalog
        ? getEventChainSummary(state, catalog!).player_divergence_count
        : null;

    return {
        schema: DECISION_CONSEQUENCE_TELEMETRY_SCHEMA,
        player_decision_count: players.length,
        player_decisions_by_faction,
        decided_event_ids: Array.from(decidedEventIds).sort(strictCompare),
        foreclosed_event_ids,
        player_enabled_edge_count,
        patron_defiance_cut_count,
        coverage,
        player_divergence_count,
    };
}

/** Serialize a digest to stable, human-diffable JSON (key order is fixed by
 *  the object literal above; arrays are pre-sorted). */
export function serializeDecisionConsequenceTelemetry(
    digest: DecisionConsequenceTelemetryDigest,
): string {
    return JSON.stringify(digest, null, 2);
}

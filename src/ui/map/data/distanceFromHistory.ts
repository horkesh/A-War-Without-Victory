// Distance-from-History read-model v1 — "the benchmark, not a script".
//
// Makes the divergence between the player's emergent war and the historical
// 1992-95 LEGIBLE. The Historian's framing: history is a benchmark to measure
// against, not a rail the player must follow. This v1 measures the cheapest,
// most direct divergence signal available with no new reference data:
// EVENT-DECISION divergence.
//
// The "correct historical answer" for a decision event is its
// `historical_default_response_id` (authored on the event catalog). What
// actually happened in this run is in `state.military.event_decision_log`
// (`{event_id, response_id, decision_source, faction, turn}`). A resolved
// decision DIVERGED from history iff its chosen `response_id` differs from the
// event's `historical_default_response_id`. This is exactly the hand
// computation the playtests performed ("6/13 diverge").
//
// Design rules (mirror dilemmaSpine.ts):
//   - PURE. No state mutation, no engine calls, no Math.random / Date.now /
//     timestamps. Sorted iteration where order matters (strictCompare).
//   - DEFENSIVE. Missing decision log / no events with a historical default →
//     a zero-divergence view. Never throws on malformed input.
//   - DETERMINISTIC. A pure function of already-projected UI state. The
//     historical-default lookup is computed once at module load from the
//     build-time-bundled event JSON (same import pattern dilemmaSpine uses).
//   - READ-ONLY / DISPLAY-ONLY. Reads `event_decision_log`, changes nothing.
//     Zero hash / calibration impact.

import { strictCompare } from '../../../state/validateGameState.js';

// Static, build-time-bundled event catalog — used to resolve the historical
// default response id and a readable title per event. Mirrors dilemmaSpine.ts,
// which statically imports the same war_*.json. Pure module-load lookup; never
// read at engine runtime.
import war1992 from '../../../../data/scenarios/events/war_1992.json';
import war1993 from '../../../../data/scenarios/events/war_1993.json';
import war1994 from '../../../../data/scenarios/events/war_1994.json';
import war1995 from '../../../../data/scenarios/events/war_1995.json';

/** One resolved decision that differs from the historical default. */
export interface DistanceFromHistoryDivergence {
    /** Event whose chosen response differs from history. */
    eventId: string;
    /** Readable event title (from the catalog) or the raw event id when absent. */
    title: string;
    /** The response id the player/bot actually chose. */
    chosen: string;
    /** The historical default response id for this event. */
    historical: string;
    /** Turn the divergent decision was recorded. */
    turn: number;
    /** Faction that owned the decision (may be null on older logs). */
    faction: string | null;
    /** Who chose it: bot_political | bot_v1 | bot_ai_default | player. */
    source: string;
}

/**
 * Projected "distance from history" view over the player's run.
 *
 * `totalDecided` counts resolved decisions that HAVE a historical default
 * (events with no default are skipped — there is nothing to diverge from).
 * `playerDiverged` is the war the PLAYER authored: divergences whose
 * `decision_source === 'player'`.
 */
export interface DistanceFromHistoryView {
    /** Resolved decisions that have a historical default to compare against. */
    totalDecided: number;
    /** Decisions whose chosen response matched the historical default. */
    matchedHistory: number;
    /** Decisions whose chosen response differed from the historical default. */
    diverged: number;
    /** diverged / totalDecided as an integer percent (0 when nothing decided). */
    divergencePct: number;
    /** Of the divergences, how many the PLAYER authored (decision_source === 'player'). */
    playerDiverged: number;
    /** The divergent decisions, sorted by turn asc, strictCompare(eventId) tie-break. */
    divergences: DistanceFromHistoryDivergence[];
}

/** Minimal structural shape of a raw event row we read at module load. */
interface RawEventRowForHistory {
    id?: unknown;
    title?: unknown;
    historical_default_response_id?: unknown;
}

/** Per-event historical-default + title metadata resolved from the catalog. */
interface EventHistoryMeta {
    historicalDefault: string;
    title: string;
}

/**
 * Build an `event_id -> { historicalDefault, title }` lookup, restricted to
 * events that carry a `historical_default_response_id`. Pure, computed once at
 * module load from the build-time-bundled event JSON. Defensive against
 * malformed rows. Events without a historical default are intentionally absent
 * (a decision for such an event has nothing to diverge from and is skipped).
 */
function buildEventHistoryMap(): ReadonlyMap<string, EventHistoryMeta> {
    const out = new Map<string, EventHistoryMeta>();
    const files: unknown[] = [war1992, war1993, war1994, war1995];
    for (const file of files) {
        if (!Array.isArray(file)) continue;
        for (const rawRow of file as RawEventRowForHistory[]) {
            const eventId = typeof rawRow?.id === 'string' ? rawRow.id : undefined;
            if (!eventId) continue;
            const historicalDefault =
                typeof rawRow.historical_default_response_id === 'string'
                    ? rawRow.historical_default_response_id.trim()
                    : '';
            if (historicalDefault.length === 0) continue;
            const title =
                typeof rawRow.title === 'string' && rawRow.title.trim().length > 0
                    ? rawRow.title.trim()
                    : eventId;
            // First definition wins (catalog ids are unique; guard anyway).
            if (!out.has(eventId)) {
                out.set(eventId, { historicalDefault, title });
            }
        }
    }
    return out;
}

const EVENT_HISTORY_MAP: ReadonlyMap<string, EventHistoryMeta> = buildEventHistoryMap();

/** Narrow input shape — just the raw causality substrate we read. Kept narrow
 *  so the adapter call needs NO `as`-cast (strict-null escape-hatch ratchet). */
export interface DistanceFromHistoryInput {
    rawGameState?: {
        military?: {
            event_decision_log?: ReadonlyArray<{
                event_id?: unknown;
                response_id?: unknown;
                decision_source?: unknown;
                faction?: unknown;
                turn?: unknown;
            }>;
        };
    };
}

/** The zero-divergence view (empty / flag-off / pre-substrate saves). */
function emptyView(): DistanceFromHistoryView {
    return {
        totalDecided: 0,
        matchedHistory: 0,
        diverged: 0,
        divergencePct: 0,
        playerDiverged: 0,
        divergences: [],
    };
}

/**
 * Project the distance-from-history view against a loaded UI game state.
 *
 * Joins each resolved decision in `military.event_decision_log` against the
 * module-load historical-default map. A decision counts toward `totalDecided`
 * only if its event has a historical default. It DIVERGED iff its chosen
 * `response_id` differs from that default.
 *
 * Last-wins per event (matches dilemmaSpine / consequenceReceipts semantics):
 * the LAST log entry for an event owns the current decision, so re-decisions
 * (e.g. a later override) are counted once, by their final choice.
 *
 * Pure + deterministic. Returns the zero view (never throws) for absent /
 * malformed logs. Divergences are sorted by turn asc, strictCompare(eventId)
 * tie-break.
 */
export function buildDistanceFromHistory(
    loaded: DistanceFromHistoryInput | null | undefined,
): DistanceFromHistoryView {
    const rawLog = loaded?.rawGameState?.military?.event_decision_log;
    if (!Array.isArray(rawLog) || rawLog.length === 0) {
        return emptyView();
    }

    // Last-wins per event: walk the ordered log forward, keep the last entry per
    // event_id. Iteration order of the source array fully determines output.
    const lastByEvent = new Map<
        string,
        { responseId: string; turn: number; faction: string | null; source: string }
    >();
    for (const entry of rawLog) {
        const eventId = typeof entry?.event_id === 'string' ? entry.event_id : undefined;
        const responseId = typeof entry?.response_id === 'string' ? entry.response_id : undefined;
        if (!eventId || !responseId) continue;
        const turn = typeof entry.turn === 'number' && Number.isFinite(entry.turn) ? entry.turn : 0;
        const faction = typeof entry.faction === 'string' ? entry.faction : null;
        const source = typeof entry.decision_source === 'string' ? entry.decision_source : 'unknown';
        lastByEvent.set(eventId, { responseId, turn, faction, source });
    }

    let totalDecided = 0;
    let matchedHistory = 0;
    let playerDiverged = 0;
    const divergences: DistanceFromHistoryDivergence[] = [];

    for (const [eventId, decision] of lastByEvent) {
        const meta = EVENT_HISTORY_MAP.get(eventId);
        // Skip events with no historical default — nothing to diverge from.
        if (!meta) continue;
        totalDecided += 1;
        if (decision.responseId === meta.historicalDefault) {
            matchedHistory += 1;
            continue;
        }
        if (decision.source === 'player') {
            playerDiverged += 1;
        }
        divergences.push({
            eventId,
            title: meta.title,
            chosen: decision.responseId,
            historical: meta.historicalDefault,
            turn: decision.turn,
            faction: decision.faction,
            source: decision.source,
        });
    }

    const diverged = divergences.length;
    const divergencePct = totalDecided > 0 ? Math.round((diverged / totalDecided) * 100) : 0;

    divergences.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        return strictCompare(a.eventId, b.eventId);
    });

    return {
        totalDecided,
        matchedHistory,
        diverged,
        divergencePct,
        playerDiverged,
        divergences,
    };
}

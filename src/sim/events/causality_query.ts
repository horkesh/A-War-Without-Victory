/**
 * Phase H Packet 2 (wave 1) — read-only causality query helpers.
 *
 * Pure functions over the Phase B/D persistent causality substrate:
 *   - `state.military.fired_event_ids`
 *   - `state.military.enabled_event_ids`
 *   - `state.military.closed_event_ids`
 *   - `state.military.event_causality_log`
 *   - `state.military.event_decision_log`
 *
 * Foundation for UI consumption per H1 scoping doc §3.2 (Component A —
 * Decision-context modal panel, Component B — Decision History overlay,
 * Component E — Wrapped causality slides). Same helpers are reusable by
 * existing diagnostic tools (F1 event_causality_chain + E4
 * political_dimensions_snapshot).
 *
 * Design rule (per H1 §3.2): every helper is PURE. No side effects on state.
 * No engine mutation. No new save-state fields. All iteration is sorted via
 * `strictCompare` to match the on-read sort contract used throughout the
 * Phase B substrate. No `Math.random`, no `Date.now`, no timestamps.
 *
 * Reference: docs/40_reports/proposals/20260528_UI_CODEX_INTEGRATION_SCOPING.md §3.2
 */

import type { CausalityLogEntry, FactionId, GameState } from '../../state/game_state.js';
import type { EventDefinition } from './event_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    isCohesionCautionBiasActive,
    isIntlStandingOpsHesitationActive,
} from '../political/political_dimension_propagation_gate.js';
import {
    getCohesionCautionBiasMultiplier,
    getIntlStandingOpsHesitationMultiplier,
} from '../combat/sector_offensive.js';

function playerFactionFromState(state: GameState): FactionId | null {
    const faction = state.meta?.player_faction;
    return faction === 'RBiH' || faction === 'RS' || faction === 'HRHB' ? faction : null;
}

function isPlayerFiledDecisionForFaction(
    entry: { decision_source?: string; faction?: FactionId | null },
    playerFaction: FactionId | null,
): boolean {
    if (entry.decision_source !== 'player') return false;
    return playerFaction === null || entry.faction === playerFaction;
}

// ---------------------------------------------------------------------------
// Local type alias for decision-log entries.
//
// `state.military.event_decision_log` is an inline-typed array on
// MilitaryState (no exported interface in event_types.ts). We mirror its
// shape here so callers can hold a typed reference without importing the
// full GameState surface.
// ---------------------------------------------------------------------------

/** Single entry in `state.military.event_decision_log`. Mirrors the inline
 *  shape in `MilitaryState`. Written by `recordEventDecision` in
 *  evaluate_events.ts (bot paths) and resolve_decision.ts (player path). */
export interface EventDecision {
    event_id: string;
    response_id: string;
    decision_source: 'bot_political' | 'bot_v1' | 'bot_ai_default' | 'player';
    faction: FactionId | null;
    turn: number;
}

// ---------------------------------------------------------------------------
// Adjacency helpers — local, pure, used only by ancestor/descendant walks.
// ---------------------------------------------------------------------------

/** Build forward adjacency from an event id to its `enables`-target ids.
 *  Only event-to-event `enables` edges participate (matches F1 ChainNode
 *  topology rules — flag opens / mutex_suppressed / overflowed do not
 *  contribute to causal-event ancestry). */
function buildForwardEnablesAdjacency(
    log: readonly CausalityLogEntry[],
): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const entry of log) {
        if (entry.kind !== 'enables') continue;
        if (entry.to_event === null) continue;
        const arr = out.get(entry.from_event) ?? [];
        arr.push(entry.to_event);
        out.set(entry.from_event, arr);
    }
    return out;
}

/** Build reverse adjacency: target id → ids that enabled it. */
function buildReverseEnablesAdjacency(
    log: readonly CausalityLogEntry[],
): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const entry of log) {
        if (entry.kind !== 'enables') continue;
        if (entry.to_event === null) continue;
        const arr = out.get(entry.to_event) ?? [];
        arr.push(entry.from_event);
        out.set(entry.to_event, arr);
    }
    return out;
}

/** Sorted union of strings via strictCompare. */
function sortedUnique(ids: Iterable<string>): string[] {
    return Array.from(new Set(ids)).sort(strictCompare);
}

// ===========================================================================
// 1. getCausalDescendants
// ===========================================================================

/** Returns all transitively-enabled event ids reachable from `eventId` via
 *  `event_causality_log` entries with `kind === 'enables'`. Excludes the
 *  source `eventId` itself. Sorted alphabetical via `strictCompare`.
 *
 *  Mirrors the downstream half of F1 `collectEventNeighborhood` but exposes
 *  a sorted readonly string[] rather than a Set, suitable for UI consumption.
 */
export function getCausalDescendants(
    eventId: string,
    state: GameState,
): readonly string[] {
    const log = state.military?.event_causality_log ?? [];
    if (log.length === 0) return [];
    const forward = buildForwardEnablesAdjacency(log);
    const visited = new Set<string>();
    const queue: string[] = [eventId];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const next of forward.get(current) ?? []) {
            if (visited.has(next)) continue;
            if (next === eventId) continue;
            visited.add(next);
            queue.push(next);
        }
    }
    return sortedUnique(visited);
}

// ===========================================================================
// 2. getCausalAncestors
// ===========================================================================

/** Returns all event ids whose causal chain transitively enabled `eventId`,
 *  via `event_causality_log` entries with `kind === 'enables'`. Excludes
 *  `eventId` itself. Sorted alphabetical via `strictCompare`.
 *
 *  Mirrors the upstream half of F1 `collectEventNeighborhood`. */
export function getCausalAncestors(
    eventId: string,
    state: GameState,
): readonly string[] {
    const log = state.military?.event_causality_log ?? [];
    if (log.length === 0) return [];
    const reverse = buildReverseEnablesAdjacency(log);
    const visited = new Set<string>();
    const queue: string[] = [eventId];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const prev of reverse.get(current) ?? []) {
            if (visited.has(prev)) continue;
            if (prev === eventId) continue;
            visited.add(prev);
            queue.push(prev);
        }
    }
    return sortedUnique(visited);
}

// ===========================================================================
// 3. getPlayerDecisionHistory
// ===========================================================================

/** Returns the loaded player's subset of `event_decision_log`, sorted by
 *  turn ascending (tiebroken by event_id, then response_id, via
 *  `strictCompare` — deterministic). Empty array when the log is missing
 *  or empty. When older saves lack `meta.player_faction`, this preserves the
 *  previous player-source-only behavior. */
export function getPlayerDecisionHistory(
    state: GameState,
): readonly EventDecision[] {
    const log = state.military?.event_decision_log ?? [];
    if (log.length === 0) return [];
    const playerFaction = playerFactionFromState(state);
    const filtered: EventDecision[] = [];
    for (const entry of log) {
        if (!isPlayerFiledDecisionForFaction(entry, playerFaction)) continue;
        filtered.push({
            event_id: entry.event_id,
            response_id: entry.response_id,
            decision_source: entry.decision_source,
            faction: entry.faction,
            turn: entry.turn,
        });
    }
    filtered.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        const e = strictCompare(a.event_id, b.event_id);
        if (e !== 0) return e;
        return strictCompare(a.response_id, b.response_id);
    });
    return filtered;
}

// ===========================================================================
// 4. getCounterfactualDivergencePoints
// ===========================================================================

/** One row per player decision where the chosen option diverged from the
 *  event's `historical_default_response_id`. Requires an `eventCatalog` for
 *  the historical-default lookup; when an event id is absent from the
 *  catalog (or the catalog has no `historical_default_response_id`), that
 *  decision is silently skipped (cannot classify divergence).
 *
 *  Sorted by turn ascending (tiebroken by event_id via `strictCompare`). */
export function getCounterfactualDivergencePoints(
    state: GameState,
    eventCatalog?: ReadonlyMap<string, EventDefinition>,
): readonly {
    event_id: string;
    turn: number;
    chosen_option: string;
    historical_default: string;
}[] {
    const players = getPlayerDecisionHistory(state);
    if (players.length === 0) return [];
    if (!eventCatalog || eventCatalog.size === 0) return [];
    const rows: { event_id: string; turn: number; chosen_option: string; historical_default: string }[] = [];
    for (const dec of players) {
        const def = eventCatalog.get(dec.event_id);
        if (!def) continue;
        const histDefault = def.historical_default_response_id;
        if (typeof histDefault !== 'string' || histDefault.length === 0) continue;
        if (dec.response_id === histDefault) continue;
        rows.push({
            event_id: dec.event_id,
            turn: dec.turn,
            chosen_option: dec.response_id,
            historical_default: histDefault,
        });
    }
    rows.sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        return strictCompare(a.event_id, b.event_id);
    });
    return rows;
}

// ===========================================================================
// 5. getBranchTagsActive
// ===========================================================================

/** Returns the sorted, faction-relevant branch tags activated by every event
 *  in `fired_event_ids`. A "branch tag" is any flag key written via the
 *  chosen option's `sets_flags` payload at decision-resolution time.
 *
 *  Filtering by faction uses the documented convention: tags start with the
 *  lowercased faction id followed by `_` (e.g. `rbih_civic`, `rs_aggressive`,
 *  `hrhb_alliance_sustained`). Tags that do not match the faction prefix
 *  are excluded.
 *
 *  Requires an `eventCatalog` for the chosen-option `sets_flags` lookup —
 *  the persisted state stores only the chosen `response_id`, not the
 *  per-option flag payload. Returns an empty array when the catalog is
 *  absent or empty. */
export function getBranchTagsActive(
    state: GameState,
    faction: FactionId,
    eventCatalog?: ReadonlyMap<string, EventDefinition>,
): readonly string[] {
    if (!eventCatalog || eventCatalog.size === 0) return [];
    const firedIds = state.military?.fired_event_ids ?? [];
    if (firedIds.length === 0) return [];
    const decisionLog = state.military?.event_decision_log ?? [];
    // Index player-filed decisions for this faction by event_id for chosen-option lookup. Last-wins for
    // recurring events (matches F1 `decisionByEvent` semantics).
    const decisionByEvent = new Map<string, string>();
    for (const dec of decisionLog) {
        if (!isPlayerFiledDecisionForFaction(dec, faction)) continue;
        decisionByEvent.set(dec.event_id, dec.response_id);
    }
    const prefix = faction.toLowerCase() + '_';
    const tags = new Set<string>();
    for (const eventId of firedIds) {
        const def = eventCatalog.get(eventId);
        if (!def) continue;
        const responseId = decisionByEvent.get(eventId);
        if (responseId === undefined) continue;
        const option = (def.response_options ?? []).find((o) => o.id === responseId);
        if (!option) continue;
        const sets = option.sets_flags;
        if (!sets) continue;
        for (const key of Object.keys(sets)) {
            if (!key.startsWith(prefix)) continue;
            tags.add(key);
        }
    }
    return Array.from(tags).sort(strictCompare);
}

// ===========================================================================
// 6. getCausalChainAt
// ===========================================================================

/** Turn-bounded snapshot of every causality substrate field at or before
 *  `turn`. All four logs are filtered by turn:
 *  - `fired` / `enabled` / `closed`: include ids whose firing/enabling/
 *    closure was recorded at or before `turn` per `event_decision_log`
 *    (for fired/enabled) and `event_causality_log` (for closed). Because
 *    only the decision log holds per-event turn for fires (and not all
 *    fired events are decisions), we additionally cross-reference
 *    `event_last_fired_turn`.
 *  - `causality_log`: entries with `entry.turn <= turn`, sorted by the
 *    canonical (turn, from_event, to_event, to_flag, kind, source_response_id)
 *    tuple. */
export function getCausalChainAt(
    turn: number,
    state: GameState,
): {
    fired: readonly string[];
    enabled: readonly string[];
    closed: readonly string[];
    causality_log: readonly CausalityLogEntry[];
} {
    const military = state.military;
    const firedIds = military?.fired_event_ids ?? [];
    const enabledIds = military?.enabled_event_ids ?? [];
    const closedIds = military?.closed_event_ids ?? [];
    const causalityLog = military?.event_causality_log ?? [];
    const lastFiredTurn = military?.event_last_fired_turn ?? {};

    // Decision-log lookup for per-event turn classification on fired.
    const decisionTurnByEvent = new Map<string, number>();
    for (const dec of (military?.event_decision_log ?? [])) {
        const existing = decisionTurnByEvent.get(dec.event_id);
        if (existing === undefined || dec.turn < existing) {
            decisionTurnByEvent.set(dec.event_id, dec.turn);
        }
    }

    // Filter the causality log first; reused for closed-turn lookup.
    const filteredLog = causalityLog.filter((e) => e.turn <= turn).slice();
    filteredLog.sort(compareCausalityEntries);

    // Build enabling-turn lookup for enabled ids.
    const enabledTurnByEvent = new Map<string, number>();
    for (const entry of causalityLog) {
        if (entry.kind !== 'enables') continue;
        if (entry.to_event === null) continue;
        const existing = enabledTurnByEvent.get(entry.to_event);
        if (existing === undefined || entry.turn < existing) {
            enabledTurnByEvent.set(entry.to_event, entry.turn);
        }
    }

    // Build closure-turn lookup for closed ids.
    const closedTurnByEvent = new Map<string, number>();
    for (const entry of causalityLog) {
        if (entry.kind !== 'closes') continue;
        if (entry.to_event === null) continue;
        const existing = closedTurnByEvent.get(entry.to_event);
        if (existing === undefined || entry.turn < existing) {
            closedTurnByEvent.set(entry.to_event, entry.turn);
        }
    }

    const fired: string[] = [];
    for (const id of firedIds) {
        const t = decisionTurnByEvent.get(id) ?? lastFiredTurn[id];
        if (typeof t === 'number' && t <= turn) fired.push(id);
    }
    const enabled: string[] = [];
    for (const id of enabledIds) {
        const t = enabledTurnByEvent.get(id);
        // Conservative: include if no entry (event-level enables in
        // sub-slice B3 always writes a row; absent → include if any
        // event_last_fired_turn record is at or before turn).
        if (t === undefined) {
            const lf = lastFiredTurn[id];
            if (typeof lf === 'number' && lf <= turn) enabled.push(id);
            continue;
        }
        if (t <= turn) enabled.push(id);
    }
    const closed: string[] = [];
    for (const id of closedIds) {
        const t = closedTurnByEvent.get(id);
        if (t !== undefined && t <= turn) closed.push(id);
    }

    return {
        fired: fired.slice().sort(strictCompare),
        enabled: enabled.slice().sort(strictCompare),
        closed: closed.slice().sort(strictCompare),
        causality_log: filteredLog,
    };
}

/** Canonical comparator for CausalityLogEntry — matches the on-read sort
 *  contract documented on `MilitaryState.event_causality_log`:
 *  (turn, from_event, to_event ?? '', to_flag ?? '', kind, source_response_id ?? '').
 *  Mirrors the F1 local `compareCausalityRows` helper. */
function compareCausalityEntries(a: CausalityLogEntry, b: CausalityLogEntry): number {
    if (a.turn !== b.turn) return a.turn - b.turn;
    const fe = strictCompare(a.from_event, b.from_event);
    if (fe !== 0) return fe;
    const te = strictCompare(a.to_event ?? '', b.to_event ?? '');
    if (te !== 0) return te;
    const tf = strictCompare(a.to_flag ?? '', b.to_flag ?? '');
    if (tf !== 0) return tf;
    const k = strictCompare(a.kind, b.kind);
    if (k !== 0) return k;
    return strictCompare(a.source_response_id ?? '', b.source_response_id ?? '');
}

// ===========================================================================
// 7. getActivePhaseEFlags
// ===========================================================================

/** Returns the sorted list of active Phase E propagation sub-flag names.
 *  Reads via the canonical gate-module exports (env + override aware). When
 *  the global propagation switch is OFF, returns `[]` (sub-flags require
 *  Tier 1 + Tier 2). Useful for UI debug surfaces ("which Phase E levers
 *  are currently affecting the bot?"). */
export function getActivePhaseEFlags(): readonly string[] {
    const out: string[] = [];
    if (isIntlStandingOpsHesitationActive()) out.push('intl_standing_ops_hesitation');
    if (isCohesionCautionBiasActive()) out.push('cohesion_caution_bias');
    return out.slice().sort(strictCompare);
}

// ===========================================================================
// 8. getProjectedDimensionMultiplier
// ===========================================================================

/** Returns the multiplier each Phase E sub-flag WOULD apply to bot ops
 *  eligibility for the given faction, given the current dimension values.
 *  Projection does NOT gate on flag activation (it answers "if you flipped the
 *  flag right now, your bot ops scoring would scale by this factor"), but it
 *  DOES honor the intl_standing turn-gate — the channel is inert before
 *  mid-1994 (INTL_STANDING_OPS_HESITATION_MIN_TURN) even with the flag ON, so a
 *  truthful HUD must reflect that. The current turn is read from
 *  `state.meta.turn` and passed to the intl helper. This is the canonical
 *  HUD reader for UI surfaces.
 *
 *  Returns 1.0 / 1.0 / 1.0 when the negotiation substrate has no dimension
 *  values for the faction (consistent with the helper-level no-op
 *  fast-path in sector_offensive.ts). */
export function getProjectedDimensionMultiplier(
    state: GameState,
    faction: FactionId,
): { intl_standing: number; cohesion: number; combined: number } {
    const dims = state.military?.negotiation?.strategic_dimensions?.[faction];
    const intlValue = dims?.international_standing?.effective_value;
    const cohValue = dims?.internal_cohesion?.effective_value;
    const currentTurn = state.meta?.turn;
    const intl = getIntlStandingOpsHesitationMultiplier(
        typeof intlValue === 'number' ? intlValue : undefined,
        typeof currentTurn === 'number' ? currentTurn : undefined,
    );
    const coh = getCohesionCautionBiasMultiplier(
        typeof cohValue === 'number' ? cohValue : undefined,
    );
    return {
        intl_standing: intl,
        cohesion: coh,
        combined: intl * coh,
    };
}

// ===========================================================================
// 9. getEventChainSummary
// ===========================================================================

/** Aggregate causality statistics suitable for end-of-campaign Wrapped
 *  slides and end-of-session summaries. Pure derivation over the four
 *  causality state fields plus the catalog (for foundational
 *  classification + divergence count).
 *
 *  Field semantics:
 *  - `foundational_count`: count of distinct `from_event` ids in the
 *    causality log that have at least one outgoing event-to-event `enables`
 *    edge AND no incoming `enables` edge (matches F1 `findFoundationals`).
 *  - `downstream_fired_count`: ids in `fired_event_ids` that have at least
 *    one ancestor in the `enables` graph (i.e. not foundationals).
 *  - `closed_count`: size of `closed_event_ids`.
 *  - `max_depth`: longest path length from any foundational down through
 *    fired-event descendants. 0 when no chains.
 *  - `player_divergence_count`: `getCounterfactualDivergencePoints` size. */
export function getEventChainSummary(
    state: GameState,
    eventCatalog: ReadonlyMap<string, EventDefinition>,
): {
    foundational_count: number;
    downstream_fired_count: number;
    closed_count: number;
    max_depth: number;
    player_divergence_count: number;
} {
    const military = state.military;
    const firedIds = military?.fired_event_ids ?? [];
    const closedIds = military?.closed_event_ids ?? [];
    const log = military?.event_causality_log ?? [];

    // Build adjacency for depth + foundational classification.
    const forward = buildForwardEnablesAdjacency(log);
    const reverse = buildReverseEnablesAdjacency(log);

    // Foundational = has outgoing enables edge AND no incoming enables edge.
    const allSources = new Set<string>();
    for (const entry of log) {
        if (entry.kind !== 'enables') continue;
        if (entry.to_event === null) continue;
        allSources.add(entry.from_event);
    }
    const foundationals: string[] = [];
    for (const id of allSources) {
        if (!reverse.has(id)) foundationals.push(id);
    }
    foundationals.sort(strictCompare);

    // Downstream-fired = fired ids that have at least one incoming enables edge.
    let downstreamFiredCount = 0;
    for (const id of firedIds) {
        if (reverse.has(id)) downstreamFiredCount++;
    }

    // Max depth: BFS depth from each foundational, taking the max across
    // all chains. Cycle-safe via visited set per traversal.
    let maxDepth = 0;
    for (const root of foundationals) {
        const visited = new Set<string>([root]);
        // Each queue entry carries (id, depth).
        const queue: Array<{ id: string; depth: number }> = [{ id: root, depth: 1 }];
        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            if (depth > maxDepth) maxDepth = depth;
            for (const next of forward.get(id) ?? []) {
                if (visited.has(next)) continue;
                visited.add(next);
                queue.push({ id: next, depth: depth + 1 });
            }
        }
    }

    const divergences = getCounterfactualDivergencePoints(state, eventCatalog);

    return {
        foundational_count: foundationals.length,
        downstream_fired_count: downstreamFiredCount,
        closed_count: closedIds.length,
        max_depth: maxDepth,
        player_divergence_count: divergences.length,
    };
}

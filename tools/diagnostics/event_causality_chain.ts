/**
 * Phase F Packet 1 — event_causality_chain diagnostic surface.
 *
 * Read-only visualization of the Phase B/D persistent causality substrate:
 *   - `state.military.closed_event_ids` (schema v32, packet §3.2)
 *   - `state.military.event_causality_log` (schema v33, packet §3.4)
 *   - `state.military.fired_event_ids` + `event_decision_log` for chosen option enrichment
 *
 * Today this is a developer diagnostic for verifying Phase D event chains
 * fired as designed. Tomorrow it is the foundation for the player-facing
 * Codex-unlock display / decision-history readout. Purely observational —
 * never mutates state or fires anything.
 *
 * Determinism: sorted iteration everywhere via `strictCompare` and the shared
 * `compareCausalityEntries` (re-implemented locally to avoid pulling the
 * validator surface). No Math.random, no Date.now, no timestamps.
 *
 * CLI:
 *   node node_modules/tsx/dist/cli.mjs tools/diagnostics/event_causality_chain.ts [options]
 *
 * Options:
 *   --save <path>            Path to final_save.json (defaults to
 *                            data/derived/latest_run_final_save.json).
 *   --json                   Emit structured JSON; otherwise plain-text report.
 *   --event <event-id>       Restrict to one event's causality (ancestors + descendants).
 *   --family <family-id>     Restrict to events belonging to a specific family.
 *   --show-closed            Include closed_event_ids section (default: included).
 *   --show-causality-log     Include raw causality_log section (default: included).
 *   --hide-closed            Omit closed_event_ids section.
 *   --hide-causality-log     Omit raw causality_log section.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_SAVE_PATH = 'data/derived/latest_run_final_save.json';

const CATALOG_FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1992_hrhb_summer.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
    'data/scenarios/events/consequences.json',
] as const;

export type CausalityKind = 'enables' | 'closes' | 'opens_flag' | 'closes_flag' | 'mutex_suppressed' | 'overflowed';

export interface RawCausalityEntry {
    turn: number;
    from_event: string;
    to_event: string | null;
    to_flag: string | null;
    kind: CausalityKind;
    source_response_id?: string;
}

export interface FiredEventRow {
    event_id: string;
    family: string | null;
    turn_fired: number | null;
    option_id: string | null;
    decision_source: string | null;
    faction: string | null;
    source_tier: string | null;
}

export interface ClosedEventRow {
    event_id: string;
    closed_by: string | null;
    turn_closed: number | null;
    source_response_id: string | null;
}

export interface CausalityLogRow {
    turn: number;
    source: string;
    target: string | null;
    to_flag: string | null;
    relation: CausalityKind;
    option_id: string | null;
}

export interface ChainNode {
    event_id: string;
    family: string | null;
    fired: boolean;
    turn_fired: number | null;
    option_id: string | null;
    relation_from_parent: CausalityKind | 'root';
    children: ChainNode[];
}

export interface ChainSummary {
    root: string;
    depth: number;
    fanout: number;
    tree: ChainNode;
}

export interface EventCausalitySnapshot {
    save_path: string | null;
    turn: number | null;
    scenario_id: string | null;
    seed: string | null;
    filter: {
        event: string | null;
        family: string | null;
        show_closed: boolean;
        show_causality_log: boolean;
    };
    fired_events: FiredEventRow[];
    closed_events: ClosedEventRow[];
    causality_log: CausalityLogRow[];
    chains: ChainSummary[];
    summary: {
        total_fired: number;
        total_enabled_unfired: number;
        total_closed: number;
        total_causality_entries: number;
        max_depth: number;
        max_fanout: number;
    };
}

export interface SnapshotOptions {
    /** Absolute or repo-relative path to a final_save.json. */
    savePath?: string | null;
    /** Pre-loaded raw save object (skips file I/O). Tests use this. */
    rawSave?: unknown;
    /** Pre-loaded catalog entries. Tests use this to avoid disk I/O. */
    catalog?: Map<string, CatalogEntry> | null;
    /** Restrict snapshot to a single event id (chain UP + DOWN). */
    event?: string | null;
    /** Restrict snapshot to events of a single family. */
    family?: string | null;
    /** Include `closed_events` section in output (default true). */
    showClosed?: boolean;
    /** Include `causality_log` section in output (default true). */
    showCausalityLog?: boolean;
}

export interface CatalogEntry {
    id: string;
    family: string | null;
    source_tier: string | null;
}

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/** Mirror of the on-read sort contract in validateGameState.ts. */
function compareCausalityRows(a: CausalityLogRow, b: CausalityLogRow): number {
    if (a.turn !== b.turn) return a.turn - b.turn;
    const fe = strictCompare(a.source, b.source);
    if (fe !== 0) return fe;
    const te = strictCompare(a.target ?? '', b.target ?? '');
    if (te !== 0) return te;
    const tf = strictCompare(a.to_flag ?? '', b.to_flag ?? '');
    if (tf !== 0) return tf;
    const k = strictCompare(a.relation, b.relation);
    if (k !== 0) return k;
    return strictCompare(a.option_id ?? '', b.option_id ?? '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function repoRoot(): string {
    return process.cwd();
}

function resolveSavePath(savePath: string | null | undefined): string | null {
    if (savePath && savePath.length > 0) {
        return path.isAbsolute(savePath) ? savePath : path.join(repoRoot(), savePath);
    }
    const candidate = path.join(repoRoot(), DEFAULT_SAVE_PATH);
    return existsSync(candidate) ? candidate : null;
}

/** Load and index the authored event catalog by id → { family, source_tier }.
 *  Disk I/O isolated here so tests can inject a pre-built map via options. */
export function loadEventCatalog(): Map<string, CatalogEntry> {
    const map = new Map<string, CatalogEntry>();
    for (const file of CATALOG_FILES) {
        const fullPath = path.join(repoRoot(), file);
        if (!existsSync(fullPath)) continue;
        const parsed = JSON.parse(readFileSync(fullPath, 'utf8')) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const entry of parsed) {
            if (!isRecord(entry)) continue;
            const id = stringOrNull(entry.id);
            if (id === null) continue;
            const family = stringOrNull(entry.family);
            const sourceTier = stringOrNull(entry.source_tier);
            map.set(id, { id, family, source_tier: sourceTier });
        }
    }
    return map;
}

function readMeta(rawSave: unknown): { turn: number | null; scenario_id: string | null; seed: string | null } {
    if (!isRecord(rawSave) || !isRecord(rawSave.meta)) {
        return { turn: null, scenario_id: null, seed: null };
    }
    const meta = rawSave.meta;
    return {
        turn: numberOrNull(meta.turn),
        scenario_id: stringOrNull(meta.scenario_id) ?? stringOrNull(meta.scenario_name),
        seed: stringOrNull(meta.seed),
    };
}

function readMilitary(rawSave: unknown): Record<string, unknown> | null {
    if (!isRecord(rawSave)) return null;
    return isRecord(rawSave.military) ? rawSave.military : null;
}

function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string');
}

function isCausalityKind(value: unknown): value is CausalityKind {
    return value === 'enables' || value === 'closes' || value === 'opens_flag' ||
        value === 'closes_flag' || value === 'mutex_suppressed' || value === 'overflowed';
}

function readCausalityLog(value: unknown): RawCausalityEntry[] {
    if (!Array.isArray(value)) return [];
    const out: RawCausalityEntry[] = [];
    for (const entry of value) {
        if (!isRecord(entry)) continue;
        const turn = numberOrNull(entry.turn);
        const fromEvent = stringOrNull(entry.from_event);
        if (turn === null || fromEvent === null) continue;
        if (!isCausalityKind(entry.kind)) continue;
        const toEvent = typeof entry.to_event === 'string' && entry.to_event.length > 0
            ? entry.to_event : null;
        const toFlag = typeof entry.to_flag === 'string' && entry.to_flag.length > 0
            ? entry.to_flag : null;
        const sourceResponseId = typeof entry.source_response_id === 'string' && entry.source_response_id.length > 0
            ? entry.source_response_id : undefined;
        out.push({
            turn,
            from_event: fromEvent,
            to_event: toEvent,
            to_flag: toFlag,
            kind: entry.kind,
            source_response_id: sourceResponseId,
        });
    }
    return out;
}

interface DecisionLogEntry {
    event_id: string;
    response_id: string;
    decision_source: string | null;
    faction: string | null;
    turn: number | null;
}

function readDecisionLog(value: unknown): DecisionLogEntry[] {
    if (!Array.isArray(value)) return [];
    const out: DecisionLogEntry[] = [];
    for (const entry of value) {
        if (!isRecord(entry)) continue;
        const eventId = stringOrNull(entry.event_id);
        const responseId = stringOrNull(entry.response_id);
        if (eventId === null || responseId === null) continue;
        out.push({
            event_id: eventId,
            response_id: responseId,
            decision_source: stringOrNull(entry.decision_source),
            faction: stringOrNull(entry.faction),
            turn: numberOrNull(entry.turn),
        });
    }
    return out;
}

function readNumberMap(value: unknown): Record<string, number> {
    if (!isRecord(value)) return {};
    const out: Record<string, number> = {};
    for (const [key, raw] of Object.entries(value)) {
        if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw;
    }
    return out;
}

function buildFiredEventRows(
    firedIds: string[],
    decisionByEvent: Map<string, DecisionLogEntry>,
    eventLastFiredTurn: Record<string, number>,
    catalog: Map<string, CatalogEntry>,
): FiredEventRow[] {
    const rows: FiredEventRow[] = [];
    for (const eventId of firedIds) {
        const decision = decisionByEvent.get(eventId) ?? null;
        const cat = catalog.get(eventId) ?? null;
        rows.push({
            event_id: eventId,
            family: cat?.family ?? null,
            turn_fired: decision?.turn ?? (Object.prototype.hasOwnProperty.call(eventLastFiredTurn, eventId) ? eventLastFiredTurn[eventId] : null),
            option_id: decision?.response_id ?? null,
            decision_source: decision?.decision_source ?? null,
            faction: decision?.faction ?? null,
            source_tier: cat?.source_tier ?? null,
        });
    }
    return rows.sort((a, b) => strictCompare(a.event_id, b.event_id));
}

function buildClosedEventRows(
    closedIds: string[],
    causalityLog: RawCausalityEntry[],
): ClosedEventRow[] {
    // For each closed event id, find the most recent 'closes' causality entry
    // whose to_event matches. Determinism: scan in sorted causality order; keep
    // last match (highest turn, then canonical tie-break order).
    const sortedLog = [...causalityLog].sort((a, b) => {
        if (a.turn !== b.turn) return a.turn - b.turn;
        const fe = strictCompare(a.from_event, b.from_event);
        if (fe !== 0) return fe;
        return strictCompare(a.to_event ?? '', b.to_event ?? '');
    });
    const closedBy = new Map<string, { from: string; turn: number; source_response_id: string | null }>();
    for (const entry of sortedLog) {
        if (entry.kind !== 'closes') continue;
        if (entry.to_event === null) continue;
        closedBy.set(entry.to_event, {
            from: entry.from_event,
            turn: entry.turn,
            source_response_id: entry.source_response_id ?? null,
        });
    }

    const rows: ClosedEventRow[] = [];
    for (const id of closedIds) {
        const meta = closedBy.get(id) ?? null;
        rows.push({
            event_id: id,
            closed_by: meta?.from ?? null,
            turn_closed: meta?.turn ?? null,
            source_response_id: meta?.source_response_id ?? null,
        });
    }
    return rows.sort((a, b) => strictCompare(a.event_id, b.event_id));
}

function buildCausalityLogRows(
    causalityLog: RawCausalityEntry[],
): CausalityLogRow[] {
    const rows: CausalityLogRow[] = causalityLog.map((entry) => ({
        turn: entry.turn,
        source: entry.from_event,
        target: entry.to_event,
        to_flag: entry.to_flag,
        relation: entry.kind,
        option_id: entry.source_response_id ?? null,
    }));
    return rows.sort(compareCausalityRows);
}

interface AdjacencyEdge {
    target: string;
    relation: CausalityKind;
}

function buildAdjacency(causalityLog: RawCausalityEntry[]): {
    forward: Map<string, AdjacencyEdge[]>;
    incoming: Map<string, AdjacencyEdge[]>;
} {
    const forward = new Map<string, AdjacencyEdge[]>();
    const incoming = new Map<string, AdjacencyEdge[]>();
    for (const entry of causalityLog) {
        if (entry.to_event === null) continue;
        // Only event-to-event relations participate in chain construction.
        // mutex_suppressed/overflowed have to_event === null and are excluded
        // from tree topology; they still appear in the raw causality_log.
        const edge: AdjacencyEdge = { target: entry.to_event, relation: entry.kind };
        const fwd = forward.get(entry.from_event) ?? [];
        fwd.push(edge);
        forward.set(entry.from_event, fwd);
        const inc = incoming.get(entry.to_event) ?? [];
        inc.push({ target: entry.from_event, relation: entry.kind });
        incoming.set(entry.to_event, inc);
    }
    return { forward, incoming };
}

function findFoundationals(
    causalityLog: RawCausalityEntry[],
    forward: Map<string, AdjacencyEdge[]>,
    incoming: Map<string, AdjacencyEdge[]>,
): string[] {
    // A foundational is a `from_event` that has at least one event-to-event
    // outgoing edge (otherwise there is no tree to render) AND has no
    // incoming 'enables' edge (otherwise it is a descendant, not a root).
    // `mutex_suppressed`/`overflowed` entries appear with to_event === null
    // and are excluded from chain topology by the forward-edge check.
    const candidateSources = new Set<string>();
    for (const entry of causalityLog) {
        if (entry.to_event === null) continue;
        candidateSources.add(entry.from_event);
    }
    const roots: string[] = [];
    for (const id of candidateSources) {
        // Must have at least one event-to-event outgoing edge (enables/closes).
        const outEdges = (forward.get(id) ?? []).filter((e) => e.relation === 'enables' || e.relation === 'closes');
        if (outEdges.length === 0) continue;
        const inEdges = incoming.get(id) ?? [];
        const enabledFrom = inEdges.filter((e) => e.relation === 'enables');
        if (enabledFrom.length === 0) roots.push(id);
    }
    return roots.sort(strictCompare);
}

function buildChainNode(
    eventId: string,
    relationFromParent: CausalityKind | 'root',
    forward: Map<string, AdjacencyEdge[]>,
    visited: Set<string>,
    firedRowsById: Map<string, FiredEventRow>,
    catalog: Map<string, CatalogEntry>,
): ChainNode {
    visited.add(eventId);
    const firedRow = firedRowsById.get(eventId);
    const cat = catalog.get(eventId) ?? null;
    const edges = (forward.get(eventId) ?? [])
        .filter((edge) => edge.relation === 'enables' || edge.relation === 'closes')
        .slice()
        .sort((a, b) => {
            const t = strictCompare(a.target, b.target);
            if (t !== 0) return t;
            return strictCompare(a.relation, b.relation);
        });
    const children: ChainNode[] = [];
    for (const edge of edges) {
        if (visited.has(edge.target)) continue; // cycle/diamond guard
        children.push(buildChainNode(edge.target, edge.relation, forward, visited, firedRowsById, catalog));
    }
    return {
        event_id: eventId,
        family: firedRow?.family ?? cat?.family ?? null,
        fired: firedRow !== undefined,
        turn_fired: firedRow?.turn_fired ?? null,
        option_id: firedRow?.option_id ?? null,
        relation_from_parent: relationFromParent,
        children,
    };
}

function computeDepth(node: ChainNode): number {
    if (node.children.length === 0) return 1;
    let max = 0;
    for (const child of node.children) {
        const d = computeDepth(child);
        if (d > max) max = d;
    }
    return 1 + max;
}

function computeFanout(node: ChainNode): number {
    let max = node.children.length;
    for (const child of node.children) {
        const f = computeFanout(child);
        if (f > max) max = f;
    }
    return max;
}

function buildChains(
    foundationals: string[],
    forward: Map<string, AdjacencyEdge[]>,
    firedRowsById: Map<string, FiredEventRow>,
    catalog: Map<string, CatalogEntry>,
): ChainSummary[] {
    const chains: ChainSummary[] = [];
    for (const root of foundationals) {
        // Each chain gets its own visited set so a downstream event that is
        // reachable from multiple foundationals appears in each tree (with
        // cycle guard within the single traversal).
        const tree = buildChainNode(root, 'root', forward, new Set<string>(), firedRowsById, catalog);
        chains.push({
            root,
            depth: computeDepth(tree),
            fanout: computeFanout(tree),
            tree,
        });
    }
    return chains;
}

/** Collect ancestors (events that enable/close target) + descendants of an
 *  event id. Used by --event filter. Returns a Set of ids the filter retains. */
function collectEventNeighborhood(
    eventId: string,
    forward: Map<string, AdjacencyEdge[]>,
    incoming: Map<string, AdjacencyEdge[]>,
): Set<string> {
    const keep = new Set<string>([eventId]);
    const queueUp = [eventId];
    while (queueUp.length > 0) {
        const cur = queueUp.shift()!;
        for (const edge of incoming.get(cur) ?? []) {
            if (keep.has(edge.target)) continue;
            keep.add(edge.target);
            queueUp.push(edge.target);
        }
    }
    const queueDown = [eventId];
    while (queueDown.length > 0) {
        const cur = queueDown.shift()!;
        for (const edge of forward.get(cur) ?? []) {
            if (keep.has(edge.target)) continue;
            keep.add(edge.target);
            queueDown.push(edge.target);
        }
    }
    return keep;
}

/** Filter the causality log to entries whose endpoints all lie in `keep`. */
function filterCausalityLog(
    log: RawCausalityEntry[],
    keep: Set<string> | null,
): RawCausalityEntry[] {
    if (keep === null) return log;
    return log.filter((entry) => {
        if (!keep.has(entry.from_event)) return false;
        if (entry.to_event !== null && !keep.has(entry.to_event)) return false;
        return true;
    });
}

/** Build a complete event-causality snapshot from a save object or path.
 *  Pure given inputs. Sorted iteration. Deterministic. */
export function buildEventCausalitySnapshot(
    options: SnapshotOptions = {},
): EventCausalitySnapshot {
    let rawSave: unknown = options.rawSave;
    let resolvedPath: string | null = null;
    if (rawSave === undefined) {
        resolvedPath = resolveSavePath(options.savePath ?? null);
        if (resolvedPath === null) {
            const hint = options.savePath
                ? `Save path not found: ${options.savePath}`
                : `No save path supplied and default ${DEFAULT_SAVE_PATH} does not exist. Pass --save <path> or run a scenario first.`;
            throw new Error(hint);
        }
        rawSave = JSON.parse(readFileSync(resolvedPath, 'utf8')) as unknown;
    }

    const meta = readMeta(rawSave);
    const military = readMilitary(rawSave) ?? {};
    const firedIds = readStringArray(military.fired_event_ids).slice().sort(strictCompare);
    const enabledIds = readStringArray(military.enabled_event_ids);
    const closedIds = readStringArray(military.closed_event_ids).slice().sort(strictCompare);
    const causalityLog = readCausalityLog(military.event_causality_log);
    const decisionLog = readDecisionLog(military.event_decision_log);
    const eventLastFiredTurn = readNumberMap(military.event_last_fired_turn);

    const catalog = options.catalog ?? loadEventCatalog();

    const decisionByEvent = new Map<string, DecisionLogEntry>();
    for (const entry of decisionLog) {
        // Keep the most recent decision per event id (last entry wins).
        decisionByEvent.set(entry.event_id, entry);
    }

    // Apply --family filter first to narrow the universe of relevant ids.
    const familyFilter = options.family ?? null;
    let familyKeep: Set<string> | null = null;
    if (familyFilter !== null) {
        familyKeep = new Set<string>();
        for (const [id, entry] of catalog.entries()) {
            if (entry.family === familyFilter) familyKeep.add(id);
        }
    }

    // Apply --event filter next.
    const eventFilter = options.event ?? null;
    let neighborhoodKeep: Set<string> | null = null;
    if (eventFilter !== null) {
        const { forward, incoming } = buildAdjacency(causalityLog);
        neighborhoodKeep = collectEventNeighborhood(eventFilter, forward, incoming);
    }

    // Combine filters.
    let combinedKeep: Set<string> | null = null;
    if (familyKeep !== null && neighborhoodKeep !== null) {
        combinedKeep = new Set<string>();
        for (const id of familyKeep) if (neighborhoodKeep.has(id)) combinedKeep.add(id);
    } else if (familyKeep !== null) {
        combinedKeep = familyKeep;
    } else if (neighborhoodKeep !== null) {
        combinedKeep = neighborhoodKeep;
    }

    const filteredLog = filterCausalityLog(causalityLog, combinedKeep);
    const { forward: filteredForward, incoming: filteredIncoming } = buildAdjacency(filteredLog);

    const filteredFiredIds = combinedKeep === null
        ? firedIds
        : firedIds.filter((id) => combinedKeep!.has(id));
    const filteredClosedIds = combinedKeep === null
        ? closedIds
        : closedIds.filter((id) => combinedKeep!.has(id));

    const firedRows = buildFiredEventRows(filteredFiredIds, decisionByEvent, eventLastFiredTurn, catalog);
    const firedRowsById = new Map<string, FiredEventRow>();
    for (const row of firedRows) firedRowsById.set(row.event_id, row);

    const closedRows = buildClosedEventRows(filteredClosedIds, filteredLog);
    const logRows = buildCausalityLogRows(filteredLog);

    const foundationals = findFoundationals(filteredLog, filteredForward, filteredIncoming);
    const chains = buildChains(foundationals, filteredForward, firedRowsById, catalog);

    let maxDepth = 0;
    let maxFanout = 0;
    for (const chain of chains) {
        if (chain.depth > maxDepth) maxDepth = chain.depth;
        if (chain.fanout > maxFanout) maxFanout = chain.fanout;
    }

    // total_enabled_unfired: ids in enabled_event_ids that did NOT fire.
    const firedSet = new Set(firedIds);
    const enabledUnfired = enabledIds.filter((id) => !firedSet.has(id));

    return {
        save_path: resolvedPath,
        turn: meta.turn,
        scenario_id: meta.scenario_id,
        seed: meta.seed,
        filter: {
            event: eventFilter,
            family: familyFilter,
            show_closed: options.showClosed ?? true,
            show_causality_log: options.showCausalityLog ?? true,
        },
        fired_events: firedRows,
        closed_events: closedRows,
        causality_log: logRows,
        chains,
        summary: {
            total_fired: firedRows.length,
            total_enabled_unfired: enabledUnfired.length,
            total_closed: closedRows.length,
            total_causality_entries: logRows.length,
            max_depth: maxDepth,
            max_fanout: maxFanout,
        },
    };
}

function renderTreeLines(node: ChainNode, prefix: string, isLast: boolean, depth: number): string[] {
    const lines: string[] = [];
    const branch = depth === 0 ? '' : (isLast ? '`-- ' : '|-- ');
    const status = node.fired
        ? `[fired turn ${node.turn_fired ?? '?'}${node.option_id ? `, option=${node.option_id}` : ''}]`
        : '[unfired]';
    const rel = node.relation_from_parent === 'root' ? '' : ` (${node.relation_from_parent})`;
    const family = node.family ? ` <${node.family}>` : '';
    lines.push(`${prefix}${branch}${node.event_id}${family}${rel} ${status}`);
    const childPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '|   ');
    node.children.forEach((child, idx) => {
        const childIsLast = idx === node.children.length - 1;
        lines.push(...renderTreeLines(child, childPrefix, childIsLast, depth + 1));
    });
    return lines;
}

function printTextReport(snapshot: EventCausalitySnapshot): void {
    const lines: string[] = [];
    lines.push('Event causality chain diagnostic');
    lines.push(`  save_path: ${snapshot.save_path ?? '<inline>'}`);
    lines.push(`  turn: ${snapshot.turn ?? 'n/a'} | scenario: ${snapshot.scenario_id ?? 'n/a'} | seed: ${snapshot.seed ?? 'n/a'}`);
    if (snapshot.filter.event !== null) lines.push(`  filter.event: ${snapshot.filter.event}`);
    if (snapshot.filter.family !== null) lines.push(`  filter.family: ${snapshot.filter.family}`);
    lines.push('');
    lines.push('Summary:');
    lines.push(`  total_fired: ${snapshot.summary.total_fired}`);
    lines.push(`  total_enabled_unfired: ${snapshot.summary.total_enabled_unfired}`);
    lines.push(`  total_closed: ${snapshot.summary.total_closed}`);
    lines.push(`  total_causality_entries: ${snapshot.summary.total_causality_entries}`);
    lines.push(`  max_depth: ${snapshot.summary.max_depth} | max_fanout: ${snapshot.summary.max_fanout}`);
    lines.push('');

    lines.push('Fired events:');
    if (snapshot.fired_events.length === 0) {
        lines.push('  (none)');
    } else {
        for (const row of snapshot.fired_events) {
            const family = row.family ? ` family=${row.family}` : '';
            const tier = row.source_tier ? ` tier=${row.source_tier}` : '';
            const turn = row.turn_fired !== null ? ` turn=${row.turn_fired}` : '';
            const option = row.option_id ? ` option=${row.option_id}` : '';
            const decision = row.decision_source ? ` source=${row.decision_source}` : '';
            const faction = row.faction ? ` faction=${row.faction}` : '';
            lines.push(`  - ${row.event_id}${family}${tier}${turn}${option}${decision}${faction}`);
        }
    }
    lines.push('');

    lines.push('Causality graph (foundational -> descendants):');
    if (snapshot.chains.length === 0) {
        lines.push('  (no causality edges)');
    } else {
        for (const chain of snapshot.chains) {
            lines.push(`  Chain root: ${chain.root} (depth=${chain.depth}, fanout=${chain.fanout})`);
            for (const line of renderTreeLines(chain.tree, '    ', true, 0)) {
                lines.push(line);
            }
            lines.push('');
        }
    }

    if (snapshot.filter.show_closed) {
        lines.push('Closed events:');
        if (snapshot.closed_events.length === 0) {
            lines.push('  (none)');
        } else {
            for (const row of snapshot.closed_events) {
                const by = row.closed_by ? ` closed_by=${row.closed_by}` : '';
                const turn = row.turn_closed !== null ? ` turn=${row.turn_closed}` : '';
                const opt = row.source_response_id ? ` option=${row.source_response_id}` : '';
                lines.push(`  - ${row.event_id}${by}${turn}${opt}`);
            }
        }
        lines.push('');
    }

    if (snapshot.filter.show_causality_log) {
        lines.push('Causality log (raw):');
        if (snapshot.causality_log.length === 0) {
            lines.push('  (empty)');
        } else {
            for (const row of snapshot.causality_log) {
                const target = row.target ?? (row.to_flag !== null ? `flag:${row.to_flag}` : '<none>');
                const opt = row.option_id ? ` [option=${row.option_id}]` : '';
                lines.push(`  turn ${row.turn}: ${row.source} -> ${target} (${row.relation})${opt}`);
            }
        }
        lines.push('');
    }

    process.stdout.write(`${lines.join('\n')}\n`);
}

interface CliArgs {
    savePath: string | null;
    json: boolean;
    event: string | null;
    family: string | null;
    showClosed: boolean;
    showCausalityLog: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        savePath: null,
        json: false,
        event: null,
        family: null,
        showClosed: true,
        showCausalityLog: true,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--json') args.json = true;
        else if (arg === '--save') { args.savePath = argv[i + 1] ?? null; i++; }
        else if (arg === '--event') { args.event = argv[i + 1] ?? null; i++; }
        else if (arg === '--family') { args.family = argv[i + 1] ?? null; i++; }
        else if (arg === '--show-closed') args.showClosed = true;
        else if (arg === '--hide-closed') args.showClosed = false;
        else if (arg === '--show-causality-log') args.showCausalityLog = true;
        else if (arg === '--hide-causality-log') args.showCausalityLog = false;
    }
    return args;
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    let snapshot: EventCausalitySnapshot;
    try {
        snapshot = buildEventCausalitySnapshot({
            savePath: args.savePath,
            event: args.event,
            family: args.family,
            showClosed: args.showClosed,
            showCausalityLog: args.showCausalityLog,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`event_causality_chain: ${message}\n`);
        process.exit(1);
    }

    if (args.json) {
        process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
        return;
    }
    printTextReport(snapshot);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}

/**
 * Phase F Packet 3 — event_family_graph static authoring-level causal map.
 *
 * Read-only static visualization of the authoring-time event causality graph
 * across war_1992/1993/1994/1995.json + consequences.json. Complements Phase F
 * Packet 1 (`event_causality_chain.ts`), which renders the RUNTIME causality
 * substrate from a save file. This tool renders the STATIC graph derived from
 * the JSON event catalog itself — no runtime state required.
 *
 * Edge sources (per `EventDefinition` / `EventResponseOption` shape):
 *   - response_options[].enables_events_runtime[]   → relation 'enables'
 *   - response_options[].closes_events_runtime[]    → relation 'closes'
 *   - response_options[].future_consequences[].opens_events[]
 *                                                   → relation 'future_consequence'
 *
 * Renders to DOT (Graphviz), ASCII tree, or JSON adjacency. Family colors:
 *   RS-*     lightcoral
 *   RBiH-*   lightblue
 *   HRHB-*   lightgreen
 *   X / x_*  lightyellow (cross-faction)
 *   Ring 3   red border (warning), via `isRing3SensitiveFamily`
 *
 * Determinism: sorted iteration via strictCompare everywhere; no Math.random,
 * no Date.now, no timestamps. Pure function given catalog rows.
 *
 * CLI:
 *   node node_modules/tsx/dist/cli.mjs tools/diagnostics/event_family_graph.ts [options]
 *
 * Options:
 *   --format <dot|tree|json>     Output format (default: tree).
 *   --root <event-id>            Filter to subtree rooted at this event.
 *   --family <id>                Restrict to events with this family.
 *   --depth <n>                  BFS depth limit (default unbounded).
 *   --include-future-consequences  Include future_consequence edges (default true).
 *   --exclude-closes             Exclude closes_events_runtime edges (default false).
 *   --out <path>                 Write to file instead of stdout.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { isRing3SensitiveFamily } from '../../src/sim/events/event_families.js';

const CATALOG_FILES = [
    'data/scenarios/events/war_1992.json',
    'data/scenarios/events/war_1992_hrhb_summer.json',
    'data/scenarios/events/war_1993.json',
    'data/scenarios/events/war_1994.json',
    'data/scenarios/events/war_1995.json',
    'data/scenarios/events/consequences.json',
] as const;

export type EdgeRelation = 'enables' | 'closes' | 'future_consequence';

export interface GraphNode {
    id: string;
    family: string | null;
    source_tier: string | null;
    is_ring3: boolean;
}

export interface GraphEdge {
    source: string;
    target: string;
    relation: EdgeRelation;
    option_id: string | null;
    /** Only populated for future_consequence edges. */
    future_consequence_id: string | null;
}

export interface GraphStats {
    total_nodes: number;
    total_edges: number;
    foundationals: string[];
    ring3_count: number;
    max_depth: number;
    max_fanout: number;
}

export interface EventFamilyGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: GraphStats;
}

export interface BuildOptions {
    /** Pre-loaded catalog rows (skips disk I/O). */
    rows?: unknown[] | null;
    /** Restrict to subtree rooted at this event. */
    root?: string | null;
    /** Restrict to events with this family. */
    family?: string | null;
    /** BFS depth limit. */
    depth?: number | null;
    /** Include future_consequences[].opens_events edges (default true). */
    includeFutureConsequences?: boolean;
    /** Exclude closes_events_runtime edges (default false). */
    excludeCloses?: boolean;
}

// ─── Utilities ────────────────────────────────────────────────────────────

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function repoRoot(): string {
    return process.cwd();
}

function relationRank(r: EdgeRelation): number {
    if (r === 'closes') return 0;
    if (r === 'enables') return 1;
    return 2;
}

function compareEdges(a: GraphEdge, b: GraphEdge): number {
    const s = strictCompare(a.source, b.source);
    if (s !== 0) return s;
    const t = strictCompare(a.target, b.target);
    if (t !== 0) return t;
    const r = relationRank(a.relation) - relationRank(b.relation);
    if (r !== 0) return r;
    const o = strictCompare(a.option_id ?? '', b.option_id ?? '');
    if (o !== 0) return o;
    return strictCompare(a.future_consequence_id ?? '', b.future_consequence_id ?? '');
}

// ─── Catalog loader ───────────────────────────────────────────────────────

/** Load every catalog row from disk. Disk I/O isolated for test injection. */
export function loadCatalogRows(): unknown[] {
    const out: unknown[] = [];
    for (const rel of CATALOG_FILES) {
        const full = path.join(repoRoot(), rel);
        if (!existsSync(full)) continue;
        const parsed = JSON.parse(readFileSync(full, 'utf8')) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const entry of parsed) out.push(entry);
    }
    return out;
}

// ─── Edge extraction ──────────────────────────────────────────────────────

/** Extract all authoring-level edges (enables / closes / future_consequence)
 *  from one event row. Sorted, deduplicated within the row. */
export function extractEdgesFromRow(
    row: Record<string, unknown>,
    options: { includeFutureConsequences: boolean; excludeCloses: boolean },
): GraphEdge[] {
    const eventId = stringOrNull(row.id);
    if (eventId === null) return [];
    const out: GraphEdge[] = [];
    const optionList = Array.isArray(row.response_options) ? row.response_options : [];
    for (const option of optionList) {
        if (!isRecord(option)) continue;
        const optionId = stringOrNull(option.id);
        // enables_events_runtime
        const enables = Array.isArray(option.enables_events_runtime) ? option.enables_events_runtime : [];
        for (const tgt of enables) {
            if (typeof tgt !== 'string' || tgt.length === 0) continue;
            out.push({
                source: eventId,
                target: tgt,
                relation: 'enables',
                option_id: optionId,
                future_consequence_id: null,
            });
        }
        // closes_events_runtime
        if (!options.excludeCloses) {
            const closes = Array.isArray(option.closes_events_runtime) ? option.closes_events_runtime : [];
            for (const tgt of closes) {
                if (typeof tgt !== 'string' || tgt.length === 0) continue;
                out.push({
                    source: eventId,
                    target: tgt,
                    relation: 'closes',
                    option_id: optionId,
                    future_consequence_id: null,
                });
            }
        }
        // future_consequences[].opens_events
        if (options.includeFutureConsequences) {
            const fcs = Array.isArray(option.future_consequences) ? option.future_consequences : [];
            for (const fc of fcs) {
                if (!isRecord(fc)) continue;
                const fcId = stringOrNull(fc.id);
                const opens = Array.isArray(fc.opens_events) ? fc.opens_events : [];
                for (const tgt of opens) {
                    if (typeof tgt !== 'string' || tgt.length === 0) continue;
                    out.push({
                        source: eventId,
                        target: tgt,
                        relation: 'future_consequence',
                        option_id: optionId,
                        future_consequence_id: fcId,
                    });
                }
            }
        }
    }
    return out;
}

// ─── Graph build + filters ────────────────────────────────────────────────

function buildAllNodes(rows: Array<Record<string, unknown>>): Map<string, GraphNode> {
    const map = new Map<string, GraphNode>();
    for (const row of rows) {
        const id = stringOrNull(row.id);
        if (id === null) continue;
        map.set(id, {
            id,
            family: stringOrNull(row.family),
            source_tier: stringOrNull(row.source_tier),
            is_ring3: isRing3SensitiveFamily(stringOrNull(row.family) ?? undefined),
        });
    }
    return map;
}

function dedupeEdges(edges: GraphEdge[]): GraphEdge[] {
    // Same source+target+relation+option_id+future_consequence_id collapses to one row.
    const seen = new Map<string, GraphEdge>();
    for (const edge of edges) {
        const key = `${edge.source}\x1f${edge.target}\x1f${edge.relation}\x1f${edge.option_id ?? ''}\x1f${edge.future_consequence_id ?? ''}`;
        if (!seen.has(key)) seen.set(key, edge);
    }
    return [...seen.values()];
}

function buildForwardAdjacency(edges: GraphEdge[]): Map<string, GraphEdge[]> {
    const fwd = new Map<string, GraphEdge[]>();
    for (const edge of edges) {
        const list = fwd.get(edge.source) ?? [];
        list.push(edge);
        fwd.set(edge.source, list);
    }
    return fwd;
}

/** BFS descendants of `eventId` via forward edges, with depth limit. */
export function getDescendants(
    eventId: string,
    forward: Map<string, GraphEdge[]>,
    depthLimit: number | null,
): Set<string> {
    const visited = new Set<string>([eventId]);
    const queue: Array<{ id: string; depth: number }> = [{ id: eventId, depth: 0 }];
    while (queue.length > 0) {
        const cur = queue.shift()!;
        if (depthLimit !== null && cur.depth >= depthLimit) continue;
        const out = forward.get(cur.id) ?? [];
        const sortedTargets = [...new Set(out.map((e) => e.target))].sort(strictCompare);
        for (const tgt of sortedTargets) {
            if (visited.has(tgt)) continue;
            visited.add(tgt);
            queue.push({ id: tgt, depth: cur.depth + 1 });
        }
    }
    return visited;
}

function findFoundationals(
    nodeIds: string[],
    edges: GraphEdge[],
): string[] {
    // A foundational is a node with at least one outgoing edge AND no incoming
    // 'enables' or 'future_consequence' edge from any other event.
    const sourceWithOut = new Set<string>();
    const targetIncomingEnable = new Set<string>();
    for (const edge of edges) {
        sourceWithOut.add(edge.source);
        if (edge.relation === 'enables' || edge.relation === 'future_consequence') {
            targetIncomingEnable.add(edge.target);
        }
    }
    const roots: string[] = [];
    for (const id of nodeIds) {
        if (!sourceWithOut.has(id)) continue;
        if (targetIncomingEnable.has(id)) continue;
        roots.push(id);
    }
    return roots.sort(strictCompare);
}

/** Build a deterministic, filtered event-family graph. */
export function buildEventFamilyGraph(options: BuildOptions = {}): EventFamilyGraph {
    const rawRows = options.rows ?? loadCatalogRows();
    const includeFc = options.includeFutureConsequences ?? true;
    const excludeCloses = options.excludeCloses ?? false;
    const depthLimit = options.depth ?? null;

    // Normalize rows: keep only records with `id`. Sort by id for determinism.
    const rows = rawRows
        .filter((r): r is Record<string, unknown> => isRecord(r) && stringOrNull(r.id) !== null)
        .slice()
        .sort((a, b) => strictCompare(String(a.id), String(b.id)));

    // Build nodes (catalog-wide).
    const allNodes = buildAllNodes(rows);

    // Extract edges from every row, dedupe, sort.
    const rawEdges: GraphEdge[] = [];
    for (const row of rows) {
        for (const edge of extractEdgesFromRow(row, { includeFutureConsequences: includeFc, excludeCloses })) {
            rawEdges.push(edge);
        }
    }
    const allEdges = dedupeEdges(rawEdges).sort(compareEdges);

    // Apply --family filter: keep only nodes with matching family, plus the
    // edges whose source AND target are in the kept node set.
    let keepIds: Set<string> | null = null;
    if (options.family != null && options.family.length > 0) {
        const fam = options.family;
        keepIds = new Set<string>();
        for (const node of allNodes.values()) {
            if (node.family === fam) keepIds.add(node.id);
        }
    }

    // Apply --root filter: BFS descendants from the named root, respecting depth.
    if (options.root != null && options.root.length > 0) {
        const forward = buildForwardAdjacency(allEdges);
        const reachable = getDescendants(options.root, forward, depthLimit);
        if (keepIds === null) {
            keepIds = reachable;
        } else {
            const intersect = new Set<string>();
            for (const id of keepIds) if (reachable.has(id)) intersect.add(id);
            keepIds = intersect;
        }
    }

    // Apply combined filter.
    let filteredEdges: GraphEdge[];
    let filteredNodes: GraphNode[];
    if (keepIds !== null) {
        filteredEdges = allEdges.filter((e) => keepIds!.has(e.source) && keepIds!.has(e.target));
        filteredNodes = [...allNodes.values()].filter((n) => keepIds!.has(n.id));
    } else {
        filteredEdges = allEdges;
        filteredNodes = [...allNodes.values()];
    }

    filteredNodes.sort((a, b) => strictCompare(a.id, b.id));
    filteredEdges.sort(compareEdges);

    // Stats: depth + fanout computed by BFS from each foundational.
    const forwardFiltered = buildForwardAdjacency(filteredEdges);
    const nodeIdsSorted = filteredNodes.map((n) => n.id).sort(strictCompare);
    const foundationals = findFoundationals(nodeIdsSorted, filteredEdges);
    let maxDepth = 0;
    let maxFanout = 0;
    for (const root of foundationals) {
        const { depth, fanout } = computeDepthFanout(root, forwardFiltered);
        if (depth > maxDepth) maxDepth = depth;
        if (fanout > maxFanout) maxFanout = fanout;
    }

    // Also consider the per-node out-degree across the whole filtered graph
    // for max_fanout (a non-foundational node can be the high-fanout one when
    // filters exclude its ancestors).
    for (const id of nodeIdsSorted) {
        const out = forwardFiltered.get(id) ?? [];
        const uniqueTargets = new Set(out.map((e) => e.target)).size;
        if (uniqueTargets > maxFanout) maxFanout = uniqueTargets;
    }

    let ring3Count = 0;
    for (const n of filteredNodes) if (n.is_ring3) ring3Count += 1;

    return {
        nodes: filteredNodes,
        edges: filteredEdges,
        stats: {
            total_nodes: filteredNodes.length,
            total_edges: filteredEdges.length,
            foundationals,
            ring3_count: ring3Count,
            max_depth: maxDepth,
            max_fanout: maxFanout,
        },
    };
}

function computeDepthFanout(
    rootId: string,
    forward: Map<string, GraphEdge[]>,
): { depth: number; fanout: number } {
    // BFS depth from root. Fanout = max out-degree (unique targets) along the way.
    const visited = new Set<string>([rootId]);
    let queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 1 }];
    let maxDepth = 1;
    let maxFanout = 0;
    while (queue.length > 0) {
        const next: Array<{ id: string; depth: number }> = [];
        for (const cur of queue) {
            const out = forward.get(cur.id) ?? [];
            const uniqueTargets = [...new Set(out.map((e) => e.target))].sort(strictCompare);
            if (uniqueTargets.length > maxFanout) maxFanout = uniqueTargets.length;
            for (const tgt of uniqueTargets) {
                if (visited.has(tgt)) continue;
                visited.add(tgt);
                if (cur.depth + 1 > maxDepth) maxDepth = cur.depth + 1;
                next.push({ id: tgt, depth: cur.depth + 1 });
            }
        }
        queue = next;
    }
    return { depth: maxDepth, fanout: maxFanout };
}

// ─── Family classification + color ────────────────────────────────────────

type FamilyGroup = 'rs' | 'rbih' | 'hrhb' | 'cross' | 'other';

function classifyFamily(family: string | null): FamilyGroup {
    if (family === null) return 'other';
    const lower = family.toLowerCase();
    if (lower.startsWith('rs_') || lower === 'rs') return 'rs';
    if (lower.startsWith('rbih_') || lower === 'rbih') return 'rbih';
    if (lower.startsWith('hrhb_') || lower === 'hrhb') return 'hrhb';
    if (lower.startsWith('x_') || lower === 'x') return 'cross';
    if (lower.startsWith('h5_') || lower.startsWith('h8_') ||
        lower.startsWith('h6_') || lower.startsWith('h7_') ||
        lower.startsWith('un_')) return 'cross';
    return 'other';
}

function nodeFillColor(group: FamilyGroup): string {
    switch (group) {
        case 'rs': return 'lightcoral';
        case 'rbih': return 'lightblue';
        case 'hrhb': return 'lightgreen';
        case 'cross': return 'lightyellow';
        case 'other': return 'white';
    }
}

function edgeStyleForRelation(rel: EdgeRelation): { color: string; style?: string; label: string } {
    switch (rel) {
        case 'enables':
            return { color: 'blue', label: 'enables' };
        case 'closes':
            return { color: 'red', label: 'closes' };
        case 'future_consequence':
            return { color: 'gray', style: 'dashed', label: 'future_consequence' };
    }
}

// ─── DOT renderer ─────────────────────────────────────────────────────────

function quoteDotId(s: string): string {
    return `"${s.replace(/"/g, '\\"')}"`;
}

function sanitizeClusterId(s: string): string {
    return s.replace(/[^A-Za-z0-9_]/g, '_');
}

/** Render the graph in Graphviz DOT format. */
export function renderDot(graph: EventFamilyGraph): string {
    const lines: string[] = [];
    lines.push('digraph event_family {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box, style=filled];');
    lines.push('  edge [fontsize=8];');
    lines.push('');
    // Legend node at top.
    lines.push('  // Legend');
    lines.push('  subgraph cluster_legend {');
    lines.push('    label="Legend";');
    lines.push('    style=dashed;');
    lines.push('    legend_rs [label="RS family", fillcolor=lightcoral];');
    lines.push('    legend_rbih [label="RBiH family", fillcolor=lightblue];');
    lines.push('    legend_hrhb [label="HRHB family", fillcolor=lightgreen];');
    lines.push('    legend_cross [label="Cross-faction", fillcolor=lightyellow];');
    lines.push('    legend_ring3 [label="Ring 3 sensitive", fillcolor=white, color=red, penwidth=2];');
    lines.push('  }');
    lines.push('');

    // Group nodes by family into subgraphs.
    const nodesByFamily = new Map<string, GraphNode[]>();
    for (const node of graph.nodes) {
        const key = node.family ?? '<no-family>';
        const list = nodesByFamily.get(key) ?? [];
        list.push(node);
        nodesByFamily.set(key, list);
    }
    const sortedFamilies = [...nodesByFamily.keys()].sort(strictCompare);
    for (const family of sortedFamilies) {
        const members = (nodesByFamily.get(family) ?? []).slice().sort((a, b) => strictCompare(a.id, b.id));
        const group = classifyFamily(family === '<no-family>' ? null : family);
        const fill = nodeFillColor(group);
        lines.push(`  subgraph cluster_${sanitizeClusterId(family)} {`);
        lines.push(`    label=${quoteDotId(family)};`);
        lines.push('    style=filled;');
        lines.push(`    color=${fill};`);
        for (const node of members) {
            const attrs: string[] = [];
            attrs.push(`label=${quoteDotId(node.id)}`);
            attrs.push(`fillcolor=${fill}`);
            if (node.is_ring3) {
                attrs.push('color=red');
                attrs.push('penwidth=2');
            }
            lines.push(`    ${quoteDotId(node.id)} [${attrs.join(', ')}];`);
        }
        lines.push('  }');
    }

    lines.push('');
    lines.push('  // Edges');
    for (const edge of graph.edges) {
        const style = edgeStyleForRelation(edge.relation);
        const attrs: string[] = [`color=${style.color}`, `label=${quoteDotId(style.label)}`];
        if (style.style) attrs.push(`style=${style.style}`);
        lines.push(`  ${quoteDotId(edge.source)} -> ${quoteDotId(edge.target)} [${attrs.join(', ')}];`);
    }

    lines.push('}');
    return lines.join('\n');
}

// ─── ASCII tree renderer ──────────────────────────────────────────────────

interface TreeNode {
    id: string;
    relation_from_parent: EdgeRelation | 'root';
    children: TreeNode[];
}

function relationMarker(rel: EdgeRelation | 'root'): string {
    if (rel === 'enables') return '[enables]';
    if (rel === 'closes') return '[closes]';
    if (rel === 'future_consequence') return '[fc]';
    return '';
}

function buildTree(
    rootId: string,
    forward: Map<string, GraphEdge[]>,
    depthLimit: number | null,
): TreeNode {
    interface Frame {
        id: string;
        node: TreeNode;
        depth: number;
    }
    const root: TreeNode = { id: rootId, relation_from_parent: 'root', children: [] };
    const seenStack: Set<string> = new Set();
    function expand(node: TreeNode, depth: number): void {
        if (depthLimit !== null && depth >= depthLimit) return;
        if (seenStack.has(node.id)) return; // cycle guard
        seenStack.add(node.id);
        const out = (forward.get(node.id) ?? []).slice().sort((a, b) => {
            const t = strictCompare(a.target, b.target);
            if (t !== 0) return t;
            return relationRank(a.relation) - relationRank(b.relation);
        });
        const childTargets = new Set<string>();
        for (const edge of out) {
            const key = `${edge.target}\x1f${edge.relation}`;
            if (childTargets.has(key)) continue;
            childTargets.add(key);
            const child: TreeNode = {
                id: edge.target,
                relation_from_parent: edge.relation,
                children: [],
            };
            node.children.push(child);
            expand(child, depth + 1);
        }
        seenStack.delete(node.id);
    }
    expand(root, 0);
    return root;
}

function renderTreeLines(
    node: TreeNode,
    nodeIndex: Map<string, GraphNode>,
    prefix: string,
    isLast: boolean,
    isRoot: boolean,
    rootFanout: number,
): string[] {
    const lines: string[] = [];
    const branch = isRoot ? '' : (isLast ? '`-- ' : '|-- ');
    const meta = nodeIndex.get(node.id);
    const ring3Tag = meta?.is_ring3 ? ' (Ring 3)' : '';
    const familyTag = meta?.family ? ` [family=${meta.family}]` : '';
    const marker = relationMarker(node.relation_from_parent);
    const markerSuffix = marker.length > 0 ? `${marker} ` : '';
    if (isRoot) {
        const rootSuffix = ` (root, fanout=${rootFanout})`;
        lines.push(`${prefix}${branch}${node.id}${familyTag}${ring3Tag}${rootSuffix}`);
    } else {
        lines.push(`${prefix}${branch}${markerSuffix}${node.id}${familyTag}${ring3Tag}`);
    }
    const childPrefix = isRoot ? prefix : prefix + (isLast ? '    ' : '|   ');
    node.children.forEach((child, idx) => {
        const childIsLast = idx === node.children.length - 1;
        lines.push(...renderTreeLines(child, nodeIndex, childPrefix, childIsLast, false, 0));
    });
    return lines;
}

/** Render the graph as an ASCII tree, one section per foundational root. */
export function renderTree(graph: EventFamilyGraph, options: { depth: number | null }): string {
    const nodeIndex = new Map<string, GraphNode>();
    for (const n of graph.nodes) nodeIndex.set(n.id, n);
    const forward = buildForwardAdjacency(graph.edges);

    const lines: string[] = [];
    lines.push('Event family graph (static authoring-level causality)');
    lines.push(`  total_nodes: ${graph.stats.total_nodes}`);
    lines.push(`  total_edges: ${graph.stats.total_edges}`);
    lines.push(`  foundationals: ${graph.stats.foundationals.length}`);
    lines.push(`  ring3_count: ${graph.stats.ring3_count}`);
    lines.push(`  max_depth: ${graph.stats.max_depth}`);
    lines.push(`  max_fanout: ${graph.stats.max_fanout}`);
    lines.push('');

    if (graph.stats.foundationals.length === 0) {
        if (graph.nodes.length === 0) {
            lines.push('(no nodes match filters)');
        } else {
            lines.push('(no foundational roots in filtered set)');
        }
        return lines.join('\n');
    }

    for (const root of graph.stats.foundationals) {
        const tree = buildTree(root, forward, options.depth);
        const { fanout } = computeDepthFanout(root, forward);
        for (const line of renderTreeLines(tree, nodeIndex, '', true, true, fanout)) {
            lines.push(line);
        }
        lines.push('');
    }
    return lines.join('\n');
}

// ─── JSON adjacency renderer ──────────────────────────────────────────────

/** Render the graph as a JSON adjacency document. */
export function renderJson(graph: EventFamilyGraph): string {
    return JSON.stringify(graph, null, 2);
}

// ─── CLI ──────────────────────────────────────────────────────────────────

interface CliArgs {
    format: 'dot' | 'tree' | 'json';
    root: string | null;
    family: string | null;
    depth: number | null;
    includeFutureConsequences: boolean;
    excludeCloses: boolean;
    out: string | null;
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        format: 'tree',
        root: null,
        family: null,
        depth: null,
        includeFutureConsequences: true,
        excludeCloses: false,
        out: null,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--format') {
            const v = argv[i + 1] ?? '';
            if (v === 'dot' || v === 'tree' || v === 'json') args.format = v;
            i += 1;
        } else if (arg === '--root') {
            args.root = argv[i + 1] ?? null;
            i += 1;
        } else if (arg === '--family') {
            args.family = argv[i + 1] ?? null;
            i += 1;
        } else if (arg === '--depth') {
            const raw = argv[i + 1];
            const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
            args.depth = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
            i += 1;
        } else if (arg === '--include-future-consequences') {
            args.includeFutureConsequences = true;
        } else if (arg === '--exclude-future-consequences') {
            args.includeFutureConsequences = false;
        } else if (arg === '--exclude-closes') {
            args.excludeCloses = true;
        } else if (arg === '--out') {
            args.out = argv[i + 1] ?? null;
            i += 1;
        }
    }
    return args;
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    let graph: EventFamilyGraph;
    try {
        graph = buildEventFamilyGraph({
            root: args.root,
            family: args.family,
            depth: args.depth,
            includeFutureConsequences: args.includeFutureConsequences,
            excludeCloses: args.excludeCloses,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`event_family_graph: ${message}\n`);
        process.exit(1);
        return;
    }

    let payload: string;
    if (args.format === 'dot') {
        payload = renderDot(graph);
    } else if (args.format === 'json') {
        payload = renderJson(graph);
    } else {
        payload = renderTree(graph, { depth: args.depth });
    }

    if (args.out !== null && args.out.length > 0) {
        const outPath = path.isAbsolute(args.out) ? args.out : path.join(repoRoot(), args.out);
        writeFileSync(outPath, `${payload}\n`, 'utf8');
    } else {
        process.stdout.write(`${payload}\n`);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}

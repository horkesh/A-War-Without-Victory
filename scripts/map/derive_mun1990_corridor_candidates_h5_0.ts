/**
 * Phase H5.0: Derive mun1990 corridor candidates (articulation points + bridges) from adjacency graph.
 *
 * Purely analytical: compute articulation points, bridge edges, and per-node stats (degree,
 * optional articulation participation). No new mechanics; output for later supply reasoning.
 *
 * Usage: npm run map:derive:mun1990-corridor-candidates:h5_0
 *   or: tsx scripts/map/derive_mun1990_corridor_candidates_h5_0.ts
 *
 * Output: data/derived/mun1990_corridor_candidates_h5_0.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';


const DERIVED_DIR = resolve('data/derived');
const ADJACENCY_PATH = resolve(DERIVED_DIR, 'mun1990_adjacency_graph.json');
const OUTPUT_PATH = resolve(DERIVED_DIR, 'mun1990_corridor_candidates_h5_0.json');

function buildAdjacencyList(edges: Array<{ a: string; b: string }>): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.a)) adj.set(e.a, []);
    adj.get(e.a)!.push(e.b);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.b)!.push(e.a);
  }
  return adj;
}

function countComponents(nodes: string[], adj: Map<string, string[]>): number {
  const visited = new Set<string>();
  let count = 0;
  for (const u of nodes) {
    if (visited.has(u)) continue;
    count++;
    const stack = [u];
    visited.add(u);
    while (stack.length > 0) {
      const v = stack.pop()!;
      for (const w of adj.get(v) ?? []) {
        if (!visited.has(w)) {
          visited.add(w);
          stack.push(w);
        }
      }
    }
  }
  return count;
}

function edgeKey(a: string, b: string): string {
  const [minM, maxM] = [a, b].sort((x, y) => x.localeCompare(y));
  return `${minM}\t${maxM}`;
}

function main(): void {
  mkdirSync(DERIVED_DIR, { recursive: true });

  process.stdout.write('Loading mun1990_adjacency_graph.json...\n');
  const graph = JSON.parse(readFileSync(ADJACENCY_PATH, 'utf8')) as {
    nodes: string[];
    edges: Array<{ a: string; b: string }>;
  };
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const adj = buildAdjacencyList(edges);
  const baseComponents = countComponents(nodes, adj);
  process.stdout.write(`  nodes: ${nodes.length}, edges: ${edges.length}, components: ${baseComponents}\n`);

  const articulation_municipalities: string[] = [];
  for (const v of nodes) {
    const adjWithoutV = new Map<string, string[]>();
    for (const [a, list] of adj.entries()) {
      if (a === v) continue;
      adjWithoutV.set(a, list.filter((w) => w !== v));
    }
    const nodesWithoutV = nodes.filter((n) => n !== v);
    const comp = countComponents(nodesWithoutV, adjWithoutV);
    if (comp > baseComponents) articulation_municipalities.push(v);
  }
  articulation_municipalities.sort((a, b) => a.localeCompare(b));

  const bridge_edges: Array<{ a: string; b: string }> = [];
  const edgeSet = new Set(edges.map((e) => edgeKey(e.a, e.b)));
  for (const e of edges) {
    const adjWithoutE = new Map<string, string[]>();
    for (const [a, list] of adj.entries()) {
      adjWithoutE.set(a, list.filter((w) => !(a === e.a && w === e.b) && !(a === e.b && w === e.a)));
    }
    const comp = countComponents(nodes, adjWithoutE);
    if (comp > baseComponents) bridge_edges.push({ a: e.a, b: e.b });
  }
  bridge_edges.sort((x, y) => {
    const kx = edgeKey(x.a, x.b);
    const ky = edgeKey(y.a, y.b);
    return kx.localeCompare(ky);
  });

  const articulationSet = new Set(articulation_municipalities);
  const per_node: Record<string, { degree: number; is_articulation: boolean }> = {};
  for (const id of nodes) {
    per_node[id] = {
      degree: (adj.get(id) ?? []).length,
      is_articulation: articulationSet.has(id),
    };
  }

  const out = {
    awwv_meta: {
      role: 'mun1990_corridor_candidates',
      version: 'h5_0',
      source: 'mun1990_adjacency_graph.json',
    },
    articulation_municipalities,
    bridge_edges,
    per_node,
    meta: {
      node_count: nodes.length,
      edge_count: edges.length,
      component_count: baseComponents,
      articulation_count: articulation_municipalities.length,
      bridge_count: bridge_edges.length,
    },
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2), 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_PATH} (articulations: ${articulation_municipalities.length}, bridges: ${bridge_edges.length})\n`);
}

main();

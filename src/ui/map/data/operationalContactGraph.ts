/**
 * Load operational_contact_graph.json and expose OSID adjacency for selection ZoC.
 * Single fetch, cached; neighbor arrays sorted for determinism.
 */

const OPERATIONAL_CONTACT_GRAPH_URL = '/data/derived/operational/operational_contact_graph.json';

interface ContactEdge {
  a: string;
  b: string;
  type?: string;
}

interface ContactGraphJson {
  edges?: ContactEdge[];
}

let cached: Map<string, string[]> | null = null;

/**
 * Build adjacency map from contact graph edges. Each node's neighbors are sorted (localeCompare).
 * Cached after first successful load.
 */
export async function getOsidAdjacency(
  getBaseUrl: () => string
): Promise<Map<string, string[]>> {
  if (cached) return cached;
  const base = getBaseUrl();
  const res = await fetch(`${base}${OPERATIONAL_CONTACT_GRAPH_URL}`);
  if (!res.ok) return new Map();
  const data = (await res.json()) as ContactGraphJson;
  const edges = data.edges ?? [];
  const adj = new Map<string, string[]>();
  for (const { a, b } of edges) {
    if (!a || !b) continue;
    const listA = adj.get(a) ?? [];
    if (!listA.includes(b)) listA.push(b);
    adj.set(a, listA);
    const listB = adj.get(b) ?? [];
    if (!listB.includes(a)) listB.push(a);
    adj.set(b, listB);
  }
  for (const list of adj.values()) {
    list.sort((x, y) => x.localeCompare(y));
  }
  cached = adj;
  return adj;
}

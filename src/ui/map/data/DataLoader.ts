import type { FeatureCollection } from 'geojson';

interface PoliticalControlPayload {
  by_settlement_id?: Record<string, string | null>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function loadOperationalSettlements(): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>('/data/derived/operational/operational_settlements.geojson');
}

export async function loadOperationalPoliticalControl(): Promise<Record<string, string | null>> {
  const payload = await fetchJson<PoliticalControlPayload>('/data/derived/operational/operational_political_control.json');
  return payload.by_settlement_id ?? {};
}

interface ContactGraphPayload {
  nodes: { id: string }[];
  edges: { a: string; b: string }[];
}

/**
 * Load the OSID contact graph and build an adjacency Map.
 * Used by the defense strength heat map for BFS distance computation.
 */
export async function loadOsidAdjacency(): Promise<Map<string, string[]>> {
  const payload = await fetchJson<ContactGraphPayload>('/data/derived/operational/operational_contact_graph.json');
  const adj = new Map<string, string[]>();
  for (const edge of payload.edges) {
    if (!edge.a || !edge.b) continue;
    let listA = adj.get(edge.a);
    if (!listA) { listA = []; adj.set(edge.a, listA); }
    if (!listA.includes(edge.b)) listA.push(edge.b);
    let listB = adj.get(edge.b);
    if (!listB) { listB = []; adj.set(edge.b, listB); }
    if (!listB.includes(edge.a)) listB.push(edge.a);
  }
  return adj;
}

/** Fetch latest run save as raw text. Use with loadSave(text) to parse after yielding so UI can show loading state. */
export async function loadLatestRunSaveAsText(): Promise<string> {
  const response = await fetch('/data/derived/latest_run_final_save.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch latest run save: HTTP ${response.status}`);
  }
  return response.text();
}

/** Fetch a specific run's final_save.json by run folder name (e.g. apr1992_definitive_40w__205b3676c8fe3ce4__w40_n286). For debugging. */
export async function loadRunFinalSaveAsText(runId: string): Promise<string> {
  const encoded = runId.replace(/\/|\\/g, '').trim();
  if (!encoded) throw new Error('Run ID is empty');
  const response = await fetch(`/data/runs/${encodeURIComponent(encoded)}/final_save.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch run save "${runId}": HTTP ${response.status}`);
  }
  return response.text();
}

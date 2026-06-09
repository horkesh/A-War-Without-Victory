import type { FeatureCollection } from 'geojson';
import type { EventDefinition } from '../../../sim/events/event_types.js';
import { getPlayerSafeDisplayLabel } from '../utils/playerSafeText.js';

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

export async function loadCensusSettlements(): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>('/data/derived/settlements_wgs84_1990.geojson');
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

/** Event definition from scenario JSON files. */
export interface EventDefinitionView {
  id: string;
  title: string;
  narrative: string;
  category: string;
  effects?: Array<{ kind: string; faction?: string; delta?: number; text?: string }>;
  decision?: { options: Array<{ id: string; label: string; description?: string }> };
  /** Optional documentary-realism illustration key (basename or path). */
  image?: string;
}

let _eventDefCache: Map<string, EventDefinitionView> | null = null;

/**
 * Load all event definitions from scenario event JSON files.
 * Returns a Map<eventId, definition>. Cached after first call.
 */
export async function loadEventDefinitions(): Promise<Map<string, EventDefinitionView>> {
  if (_eventDefCache) return _eventDefCache;

  const files = [
    '/data/scenarios/events/war_1992.json',
    '/data/scenarios/events/war_1993.json',
    '/data/scenarios/events/war_1994.json',
    '/data/scenarios/events/war_1995.json',
  ];

  const map = new Map<string, EventDefinitionView>();
  const results = await Promise.allSettled(files.map(f => fetchJson<any[]>(f)));
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const ev of result.value) {
      if (!ev.id) continue;
      map.set(ev.id, {
        id: ev.id,
        title: getPlayerSafeDisplayLabel(ev.title ?? ev.id, 'Untitled event'),
        narrative: ev.narrative ?? '',
        category: ev.category ?? 'military',
        effects: Array.isArray(ev.effects) ? ev.effects : ev.effect ? [ev.effect] : [],
        decision: ev.decision,
        image: typeof ev.image === 'string' ? ev.image : undefined,
      });
    }
  }

  _eventDefCache = map;
  return map;
}

/**
 * Phase H Packet 7 — browser-side full-`EventDefinition` catalog loader.
 *
 * Companion to {@link loadEventDefinitions} (which returns the trimmed
 * `EventDefinitionView` consumed by `EventModal`). The full canonical
 * `EventDefinition` shape is required by the Phase H bridges:
 *   - H3 `EventDecisionModal` Decision Context (family + source_tier)
 *   - H4 `BranchTagBadgeRow` (response_options[].sets_flags walk)
 *   - H5 `CodexPanel` Unlock State (family + source_tier per row)
 *   - H6 `generateWrappedSlides` causality slides (source_note + sets_flags)
 *
 * Backwards-compatible: this is an additive export. The existing
 * `loadEventDefinitions()` view-loader remains the sole consumer for
 * `EventModal`. Both loaders read the same on-disk JSON; the full loader
 * preserves every authored field so downstream consumers see canon-typed
 * records.
 *
 * Cached separately from the view cache.
 */
let _eventDefFullCache: Map<string, EventDefinition> | null = null;

export async function loadEventDefinitionsFull(): Promise<Map<string, EventDefinition>> {
  if (_eventDefFullCache) return _eventDefFullCache;

  const files = [
    '/data/scenarios/events/war_1992.json',
    '/data/scenarios/events/war_1993.json',
    '/data/scenarios/events/war_1994.json',
    '/data/scenarios/events/war_1995.json',
    '/data/scenarios/events/consequences.json',
  ];

  const map = new Map<string, EventDefinition>();
  const results = await Promise.allSettled(files.map(f => fetchJson<unknown[]>(f)));
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    if (!Array.isArray(result.value)) continue;
    for (const raw of result.value) {
      if (!raw || typeof raw !== 'object') continue;
      const ev = raw as EventDefinition;
      if (typeof ev.id !== 'string' || ev.id.length === 0) continue;
      // Last write wins on duplicate id — matches the engine-side loader's
      // duplicate-detection error behavior at runtime catalog assembly; we
      // tolerate here because browser-side bridges only do read-only lookups.
      map.set(ev.id, ev);
    }
  }

  _eventDefFullCache = map;
  return map;
}

/**
 * Load the SID→OSID mapping (canonical_to_operational_map.json).
 * Returns Map<SID, OSID> (e.g. "S100013" → "op:banovici:banovici_2").
 * Used to resolve legacy SID keys against the OSID centroid lookup.
 */
let _sidToOsidCache: Map<string, string> | null = null;
export async function loadSidToOsidMapping(): Promise<Map<string, string>> {
  if (_sidToOsidCache) return _sidToOsidCache;
  const raw = await fetchJson<Record<string, string>>('/data/derived/operational/canonical_to_operational_map.json');
  _sidToOsidCache = new Map(Object.entries(raw));
  return _sidToOsidCache;
}

/** Terrain scalars per settlement (SID-keyed). */
export interface TerrainScalars {
  road_access_index: number;
  river_crossing_penalty: number;
  elevation_mean_m: number;
  elevation_stddev_m: number;
  slope_index: number;
  terrain_friction_index: number;
}

let _terrainScalarsCache: Map<string, TerrainScalars> | null = null;
export async function loadTerrainScalars(): Promise<Map<string, TerrainScalars>> {
  if (_terrainScalarsCache) return _terrainScalarsCache;
  const raw = await fetchJson<{ by_sid: Record<string, TerrainScalars> }>('/data/derived/terrain/settlements_terrain_scalars.json');
  _terrainScalarsCache = new Map(Object.entries(raw.by_sid));
  return _terrainScalarsCache;
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

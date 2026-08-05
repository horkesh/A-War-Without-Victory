import type { FeatureCollection } from 'geojson';
import type { EventDefinition } from '../../../sim/events/event_types.js';
import { getPlayerSafeDisplayLabel } from '../utils/playerSafeText.js';
import { countMapTransitionResource } from '../perf/mapTransitionTiming.js';
import type { OsidDamageSeed } from '../layers/buildOsidDamageOverlay.js';

interface PoliticalControlPayload {
  by_settlement_id?: Record<string, string | null>;
}

const STATIC_RESOURCE_KEYS: Readonly<Record<string, string>> = {
  '/data/derived/operational/operational_settlements.geojson': 'operational-settlements',
  '/data/derived/settlements_wgs84_1990.geojson': 'census-settlements',
  '/data/derived/operational/operational_political_control.json': 'operational-political-control',
  '/data/derived/operational/operational_contact_graph.json': 'osid-adjacency',
  '/data/derived/operational/canonical_to_operational_map.json': 'sid-to-osid',
  '/data/derived/terrain/settlements_terrain_scalars.json': 'terrain-scalars',
  '/data/derived/osid_damage_seed.json': 'osid-damage-seed',
  '/data/scenarios/events/war_1992.json': 'events-war-1992',
  '/data/scenarios/events/war_1992_hrhb_summer.json': 'events-war-1992-hrhb-summer',
  '/data/scenarios/events/war_1993.json': 'events-war-1993',
  '/data/scenarios/events/war_1994.json': 'events-war-1994',
  '/data/scenarios/events/war_1995.json': 'events-war-1995',
  '/data/scenarios/events/consequences.json': 'events-consequences',
};

const staticResourcePromises = new Map<string, Promise<unknown>>();
const immutableMapMutators = new Set<PropertyKey>(['set', 'delete', 'clear']);

function freezeStaticResource<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);

  if (value instanceof Map) {
    for (const [key, entry] of value) {
      freezeStaticResource(key, seen);
      freezeStaticResource(entry, seen);
    }
    let readonlyMap: Map<unknown, unknown>;
    readonlyMap = new Proxy(value as Map<unknown, unknown>, {
      get(target, property) {
        if (immutableMapMutators.has(property)) {
          return () => { throw new TypeError('Static map resources are immutable'); };
        }
        if (property === 'size') return target.size;
        if (property === 'get') return target.get.bind(target);
        if (property === 'has') return target.has.bind(target);
        if (property === 'entries') return target.entries.bind(target);
        if (property === 'keys') return target.keys.bind(target);
        if (property === 'values') return target.values.bind(target);
        if (property === Symbol.iterator) return target[Symbol.iterator].bind(target);
        if (property === 'forEach') {
          return (callback: (entry: unknown, key: unknown, map: Map<unknown, unknown>) => void, thisArg?: unknown) => {
            target.forEach((entry, key) => callback.call(thisArg, entry, key, readonlyMap));
          };
        }
        if (property === 'valueOf') return () => readonlyMap;
        return Reflect.get(target, property, readonlyMap) as unknown;
      },
    });
    return Object.freeze(readonlyMap) as T;
  }

  for (const property of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);
    if (descriptor && 'value' in descriptor) freezeStaticResource(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function loadStaticResource<T>(key: string, load: () => Promise<T>): Promise<T> {
  const cached = staticResourcePromises.get(key) as Promise<T> | undefined;
  if (cached) return cached;

  const promise = Promise.resolve().then(load).then((value) => freezeStaticResource(value));
  staticResourcePromises.set(key, promise);
  void promise.catch(() => {
    if (staticResourcePromises.get(key) === promise) staticResourcePromises.delete(key);
  });
  return promise;
}

function fetchJson<T>(url: string): Promise<T> {
  return loadStaticResource(`json:${url}`, async () => {
    const resourceKey = STATIC_RESOURCE_KEYS[url];
    if (resourceKey) countMapTransitionResource(resourceKey);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  });
}

export function loadOperationalSettlements(): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>('/data/derived/operational/operational_settlements.geojson');
}

export function loadCensusSettlements(): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>('/data/derived/settlements_wgs84_1990.geojson');
}

export function loadOperationalPoliticalControl(): Promise<Record<string, string | null>> {
  return loadStaticResource('operational-political-control', async () => {
    const payload = await fetchJson<PoliticalControlPayload>('/data/derived/operational/operational_political_control.json');
    return payload.by_settlement_id ?? {};
  });
}

interface ContactGraphPayload {
  nodes: { id: string }[];
  edges: { a: string; b: string }[];
}

/**
 * Load the OSID contact graph and build an adjacency Map.
 * Used by the defense strength heat map for BFS distance computation.
 */
export function loadOsidAdjacency(): Promise<Map<string, string[]>> {
  return loadStaticResource('osid-adjacency', async () => {
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
  });
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

/**
 * Load all event definitions from scenario event JSON files.
 * Returns a Map<eventId, definition>. Cached after first call.
 */
export function loadEventDefinitions(): Promise<Map<string, EventDefinitionView>> {
  return loadStaticResource('event-definitions-view', async () => {
    const files = [
      '/data/scenarios/events/war_1992.json',
      '/data/scenarios/events/war_1992_hrhb_summer.json',
      '/data/scenarios/events/war_1993.json',
      '/data/scenarios/events/war_1994.json',
      '/data/scenarios/events/war_1995.json',
      // Consequence events (csq_*) fire as non-decision notifications and flash
      // an acknowledge EventModal (deriveFiredEvents → isDecision:false). Include
      // them here so their documentary `image` (e.g. mobilization/supply stills)
      // resolves in the modal — matches loadEventDefinitionsFull's file set.
      '/data/scenarios/events/consequences.json',
    ];

    const map = new Map<string, EventDefinitionView>();
    const results = await Promise.all(files.map(f => fetchJson<any[]>(f)));
    for (const events of results) {
      for (const ev of events) {
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

    return map;
  });
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
export function loadEventDefinitionsFull(): Promise<Map<string, EventDefinition>> {
  return loadStaticResource('event-definitions-full', async () => {
    const files = [
      '/data/scenarios/events/war_1992.json',
      '/data/scenarios/events/war_1992_hrhb_summer.json',
      '/data/scenarios/events/war_1993.json',
      '/data/scenarios/events/war_1994.json',
      '/data/scenarios/events/war_1995.json',
      '/data/scenarios/events/consequences.json',
    ];

    const map = new Map<string, EventDefinition>();
    const results = await Promise.all(files.map(f => fetchJson<unknown[]>(f)));
    for (const events of results) {
      if (!Array.isArray(events)) continue;
      for (const raw of events) {
        if (!raw || typeof raw !== 'object') continue;
        const ev = raw as EventDefinition;
        if (typeof ev.id !== 'string' || ev.id.length === 0) continue;
        // Last write wins on duplicate id — matches the engine-side loader's
        // duplicate-detection error behavior at runtime catalog assembly; we
        // tolerate here because browser-side bridges only do read-only lookups.
        map.set(ev.id, ev);
      }
    }

    return map;
  });
}

/**
 * Load the SID→OSID mapping (canonical_to_operational_map.json).
 * Returns Map<SID, OSID> (e.g. "S100013" → "op:banovici:banovici_2").
 * Used to resolve legacy SID keys against the OSID centroid lookup.
 */
export function loadSidToOsidMapping(): Promise<Map<string, string>> {
  return loadStaticResource('sid-to-osid', async () => {
    const raw = await fetchJson<Record<string, string>>('/data/derived/operational/canonical_to_operational_map.json');
    return new Map(Object.entries(raw));
  });
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

export function loadTerrainScalars(): Promise<Map<string, TerrainScalars>> {
  return loadStaticResource('terrain-scalars', async () => {
    const raw = await fetchJson<{ by_sid: Record<string, TerrainScalars> }>('/data/derived/terrain/settlements_terrain_scalars.json');
    return new Map(Object.entries(raw.by_sid));
  });
}

export function loadOsidDamageSeed(): Promise<OsidDamageSeed> {
  return fetchJson<OsidDamageSeed>('/data/derived/osid_damage_seed.json');
}

/** Test isolation only. Static renderer resources otherwise live for the renderer session. */
export function resetStaticMapResourceCachesForTests(): void {
  staticResourcePromises.clear();
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

export const MAP_TRANSITION_MARKS = [
  'command',
  'viewport-visible',
  'core-data-ready',
  'map-created',
  'style-loaded',
  'current-state-rendered',
  'interactive',
] as const;

export type MapTransitionMark = (typeof MAP_TRANSITION_MARKS)[number];
export type MapTransitionKind = 'cold' | 'warm';

export interface MapTransitionSampleMetadata {
  kind: MapTransitionKind;
  cycleIndex: number;
  loadedTurn: number;
  fingerprintMatches: boolean;
  currentStateReady: boolean;
}

export interface MapTransitionCountersInput {
  mapConstructions: number;
  webglReleases: number;
  deckConstructions?: number;
  deckReleases?: number;
  staticResourceRequests: ReadonlyMap<string, number>;
}

export interface MapTransitionSample {
  kind: MapTransitionKind;
  cycle_index: number;
  loaded_turn: number;
  fingerprint_matches: boolean;
  current_state_ready: boolean;
  durations_ms: Partial<Record<MapTransitionMark, number>>;
  counters: {
    map_constructions: number;
    webgl_releases: number;
    deck_constructions: number;
    deck_releases: number;
    static_resource_requests: Record<string, number>;
  };
}

export interface MapTransitionProfileSnapshot {
  enabled: boolean;
  samples: MapTransitionSample[];
  lifetime_counters: {
    map_constructions: number;
    webgl_releases: number;
    deck_constructions: number;
    deck_releases: number;
    static_resource_requests: Record<string, number>;
  };
}

export interface MapTransitionDebugState {
  active: boolean;
  marks: MapTransitionMark[];
  pending_metadata: boolean;
}

const SAFE_METADATA_KEYS = new Set([
  'kind',
  'cycleIndex',
  'loadedTurn',
  'fingerprintMatches',
  'currentStateReady',
]);

function strictCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}

function sortedResourceCounts(counts: ReadonlyMap<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key of [...counts.keys()].sort(strictCompare)) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
      throw new Error(`Unsafe map transition resource key: ${key}`);
    }
    const value = counts.get(key) ?? 0;
    assertFiniteNonNegative(value, `Resource count ${key}`);
    result[key] = value;
  }
  return result;
}

export function isMapTransitionProfilingEnabled(search?: string): boolean {
  const query = search ?? (typeof window === 'undefined' ? '' : window.location.search);
  return new URLSearchParams(query).get('profile_map_transition') === '1';
}

export function percentile(values: readonly number[], requestedPercentile: number): number {
  if (values.length === 0) throw new Error('Percentile requires at least one finite value');
  if (!Number.isFinite(requestedPercentile) || requestedPercentile < 0 || requestedPercentile > 100) {
    throw new Error('Percentile must be a finite number from 0 through 100');
  }
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error('Percentile input values must be finite');
  }
  const sorted = [...values].sort((left, right) => left - right);
  const rank = (requestedPercentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sorted[lowerIndex] ?? sorted[0];
  const upper = sorted[upperIndex] ?? sorted[sorted.length - 1];
  return roundMilliseconds(lower + (upper - lower) * (rank - lowerIndex));
}

export function createMapTransitionSample(
  metadata: MapTransitionSampleMetadata,
  marks: ReadonlyMap<string, number>,
  counters: MapTransitionCountersInput,
): MapTransitionSample {
  for (const key of Object.keys(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) {
      throw new Error(`Unsafe map transition metadata key: ${key}`);
    }
  }
  if (metadata.kind !== 'cold' && metadata.kind !== 'warm') {
    throw new Error(`Unsafe map transition kind: ${String(metadata.kind)}`);
  }
  if (!Number.isInteger(metadata.cycleIndex) || metadata.cycleIndex < 0) {
    throw new Error('Map transition cycle index must be a non-negative integer');
  }
  if (!Number.isInteger(metadata.loadedTurn) || metadata.loadedTurn < 0) {
    throw new Error('Map transition loaded turn must be a non-negative integer');
  }
  assertFiniteNonNegative(counters.mapConstructions, 'Map construction count');
  assertFiniteNonNegative(counters.webglReleases, 'WebGL release count');
  assertFiniteNonNegative(counters.deckConstructions ?? 0, 'Deck construction count');
  assertFiniteNonNegative(counters.deckReleases ?? 0, 'Deck release count');

  const commandAt = marks.get('command');
  if (commandAt == null || !Number.isFinite(commandAt)) {
    throw new Error('Map transition sample requires the command mark');
  }
  const durations: Partial<Record<MapTransitionMark, number>> = {};
  let previousMark: MapTransitionMark | null = null;
  let previousMarkedAt = commandAt;
  for (const mark of MAP_TRANSITION_MARKS) {
    const markedAt = marks.get(mark);
    if (markedAt == null) continue;
    if (!Number.isFinite(markedAt) || markedAt < previousMarkedAt) {
      const predecessor = previousMark ?? 'command';
      throw new Error(
        `Map transition mark ${mark} violates locked vocabulary order after ${predecessor}`,
      );
    }
    durations[mark] = roundMilliseconds(markedAt - commandAt);
    previousMark = mark;
    previousMarkedAt = markedAt;
  }

  return {
    kind: metadata.kind,
    cycle_index: metadata.cycleIndex,
    loaded_turn: metadata.loadedTurn,
    fingerprint_matches: metadata.fingerprintMatches,
    current_state_ready: metadata.currentStateReady,
    durations_ms: durations,
    counters: {
      map_constructions: counters.mapConstructions,
      webgl_releases: counters.webglReleases,
      deck_constructions: counters.deckConstructions ?? 0,
      deck_releases: counters.deckReleases ?? 0,
      static_resource_requests: sortedResourceCounts(counters.staticResourceRequests),
    },
  };
}

class MapTransitionProfiler {
  readonly enabled: boolean;
  private readonly now: () => number;
  private readonly marks = new Map<MapTransitionMark, number>();
  private readonly resourceCounts = new Map<string, number>();
  private readonly lifetimeResourceCounts = new Map<string, number>();
  private readonly samples: MapTransitionSample[] = [];
  private kind: MapTransitionKind = 'cold';
  private cycleIndex = -1;
  private active = false;
  private mapConstructions = 0;
  private webglReleases = 0;
  private deckConstructions = 0;
  private deckReleases = 0;
  private lifetimeMapConstructions = 0;
  private lifetimeWebglReleases = 0;
  private lifetimeDeckConstructions = 0;
  private lifetimeDeckReleases = 0;
  private pendingMetadata: Omit<MapTransitionSampleMetadata, 'kind' | 'cycleIndex'> | null = null;

  constructor(enabled: boolean, now: () => number) {
    this.enabled = enabled;
    this.now = now;
  }

  setKind(kind: MapTransitionKind): void {
    if (kind !== 'cold' && kind !== 'warm') throw new Error(`Unsupported map transition kind: ${kind}`);
    this.kind = kind;
  }

  begin(): void {
    if (!this.enabled) return;
    this.active = true;
    this.cycleIndex += 1;
    this.marks.clear();
    this.resourceCounts.clear();
    this.mapConstructions = 0;
    this.webglReleases = 0;
    this.deckConstructions = 0;
    this.deckReleases = 0;
    this.pendingMetadata = null;
    this.mark('command');
  }

  mark(mark: MapTransitionMark): void {
    if (!this.enabled || !this.active || this.marks.has(mark)) return;
    this.marks.set(mark, this.now());
    this.tryFinalize();
  }

  countConstruction(): void {
    if (!this.enabled) return;
    this.lifetimeMapConstructions += 1;
    if (this.active) this.mapConstructions += 1;
  }

  countRelease(): void {
    if (!this.enabled) return;
    this.lifetimeWebglReleases += 1;
    if (this.active) this.webglReleases += 1;
  }

  countDeckConstruction(): void {
    if (!this.enabled) return;
    this.lifetimeDeckConstructions += 1;
    if (this.active) this.deckConstructions += 1;
  }

  countDeckRelease(): void {
    if (!this.enabled) return;
    this.lifetimeDeckReleases += 1;
    if (this.active) this.deckReleases += 1;
  }

  countResource(resourceKey: string): void {
    if (!this.enabled) return;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(resourceKey)) {
      throw new Error(`Unsafe map transition resource key: ${resourceKey}`);
    }
    this.lifetimeResourceCounts.set(resourceKey, (this.lifetimeResourceCounts.get(resourceKey) ?? 0) + 1);
    if (this.active) this.resourceCounts.set(resourceKey, (this.resourceCounts.get(resourceKey) ?? 0) + 1);
  }

  complete(metadata: Omit<MapTransitionSampleMetadata, 'kind' | 'cycleIndex'>): MapTransitionSample | null {
    if (!this.enabled || !this.active) return null;
    this.pendingMetadata = metadata;
    this.mark('interactive');
    return this.tryFinalize();
  }

  private tryFinalize(): MapTransitionSample | null {
    if (!this.active || !this.pendingMetadata) return null;
    if (MAP_TRANSITION_MARKS.some((mark) => !this.marks.has(mark))) return null;
    const sample = createMapTransitionSample(
      { ...this.pendingMetadata, kind: this.kind, cycleIndex: this.cycleIndex },
      this.marks,
      {
        mapConstructions: this.mapConstructions,
        webglReleases: this.webglReleases,
        deckConstructions: this.deckConstructions,
        deckReleases: this.deckReleases,
        staticResourceRequests: this.resourceCounts,
      },
    );
    this.samples.push(sample);
    this.active = false;
    this.pendingMetadata = null;
    return sample;
  }

  snapshot(): MapTransitionProfileSnapshot {
    return {
      enabled: this.enabled,
      samples: this.samples.map((sample) => ({
        ...sample,
        durations_ms: { ...sample.durations_ms },
        counters: {
          ...sample.counters,
          static_resource_requests: { ...sample.counters.static_resource_requests },
        },
      })),
      lifetime_counters: {
        map_constructions: this.lifetimeMapConstructions,
        webgl_releases: this.lifetimeWebglReleases,
        deck_constructions: this.lifetimeDeckConstructions,
        deck_releases: this.lifetimeDeckReleases,
        static_resource_requests: sortedResourceCounts(this.lifetimeResourceCounts),
      },
    };
  }

  debugState(): MapTransitionDebugState {
    return {
      active: this.active,
      marks: MAP_TRANSITION_MARKS.filter((mark) => this.marks.has(mark)),
      pending_metadata: this.pendingMetadata != null,
    };
  }
}

export function createMapTransitionProfiler(
  enabled: boolean,
  now: () => number,
): MapTransitionProfiler {
  return new MapTransitionProfiler(enabled, now);
}

const profiler = createMapTransitionProfiler(
  isMapTransitionProfilingEnabled(),
  () => (typeof performance === 'undefined' ? 0 : performance.now()),
);

export function setMapTransitionKind(kind: MapTransitionKind): void {
  profiler.setKind(kind);
}

export function beginMapTransition(): void {
  profiler.begin();
}

export function markMapTransition(mark: MapTransitionMark): void {
  profiler.mark(mark);
}

export function countMapTransitionConstruction(): void {
  profiler.countConstruction();
}

export function countMapTransitionRelease(): void {
  profiler.countRelease();
}

export function countMapTransitionDeckConstruction(): void {
  profiler.countDeckConstruction();
}

export function countMapTransitionDeckRelease(): void {
  profiler.countDeckRelease();
}

export function countMapTransitionResource(resourceKey: string): void {
  profiler.countResource(resourceKey);
}

export function completeMapTransition(
  metadata: Omit<MapTransitionSampleMetadata, 'kind' | 'cycleIndex'>,
): MapTransitionSample | null {
  return profiler.complete(metadata);
}

export function getMapTransitionProfileSnapshot(): MapTransitionProfileSnapshot {
  return profiler.snapshot();
}

export function getMapTransitionDebugState(): MapTransitionDebugState {
  return profiler.debugState();
}

declare global {
  interface Window {
    __AWWV_MAP_TRANSITION_PROFILE__?: {
      setKind: typeof setMapTransitionKind;
      snapshot: typeof getMapTransitionProfileSnapshot;
      debugState: typeof getMapTransitionDebugState;
    };
  }
}

if (typeof window !== 'undefined' && profiler.enabled) {
  window.__AWWV_MAP_TRANSITION_PROFILE__ = {
    setKind: setMapTransitionKind,
    snapshot: getMapTransitionProfileSnapshot,
    debugState: getMapTransitionDebugState,
  };
}

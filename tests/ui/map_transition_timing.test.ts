import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modulePath = '../../src/ui/map/perf/mapTransitionTiming.js';
const sourcePath = 'src/ui/map/perf/mapTransitionTiming.ts';

describe('map transition timing contract', () => {
  it('provides the profiling helper before exercising its behavior', () => {
    expect(existsSync(sourcePath)).toBe(true);
  });

  it('is disabled unless profile_map_transition=1 is present', async () => {
    if (!existsSync(sourcePath)) return;
    const { isMapTransitionProfilingEnabled } = await import(modulePath);
    expect(isMapTransitionProfilingEnabled('')).toBe(false);
    expect(isMapTransitionProfilingEnabled('?profile_map_transition=0')).toBe(false);
    expect(isMapTransitionProfilingEnabled('?profile_map_transition=true')).toBe(false);
    expect(isMapTransitionProfilingEnabled('?profile_map_transition=1')).toBe(true);
    expect(isMapTransitionProfilingEnabled('?view=warroom&profile_map_transition=1')).toBe(true);
  });

  it('records the stable milestone vocabulary and safe sample fields only', async () => {
    if (!existsSync(sourcePath)) return;
    const { MAP_TRANSITION_MARKS, createMapTransitionSample } = await import(modulePath);
    expect(MAP_TRANSITION_MARKS).toEqual([
      'command',
      'viewport-visible',
      'core-data-ready',
      'map-created',
      'style-loaded',
      'current-state-rendered',
      'interactive',
    ]);

    const sample = createMapTransitionSample(
      {
        kind: 'warm',
        cycleIndex: 4,
        loadedTurn: 12,
        fingerprintMatches: true,
        currentStateReady: true,
      },
      new Map(MAP_TRANSITION_MARKS.map((mark: string, index: number) => [mark, 100 + index * 5])),
      {
        mapConstructions: 1,
        webglReleases: 0,
        staticResourceRequests: new Map([
          ['terrain-scalars', 1],
          ['operational-settlements', 2],
        ]),
      },
    );

    expect(sample).toEqual({
      kind: 'warm',
      cycle_index: 4,
      loaded_turn: 12,
      fingerprint_matches: true,
      current_state_ready: true,
      durations_ms: {
        command: 0,
        'viewport-visible': 5,
        'core-data-ready': 10,
        'map-created': 15,
        'style-loaded': 20,
        'current-state-rendered': 25,
        interactive: 30,
      },
      counters: {
        map_constructions: 1,
        webgl_releases: 0,
        deck_constructions: 0,
        deck_releases: 0,
        static_resource_requests: {
          'operational-settlements': 2,
          'terrain-scalars': 1,
        },
      },
    });
    expect(JSON.stringify(sample)).not.toMatch(/raw_fingerprint|date|timestamp|path|state_json|raw_state/i);
  });

  it('rejects unsafe metadata rather than copying wall clock, path, or state fields', async () => {
    if (!existsSync(sourcePath)) return;
    const { createMapTransitionSample } = await import(modulePath);
    const marks = new Map([['command', 0], ['interactive', 1]]);
    const counters = {
      mapConstructions: 0,
      webglReleases: 0,
      staticResourceRequests: new Map<string, number>(),
    };
    const safe = {
      kind: 'cold' as const,
      cycleIndex: 0,
      loadedTurn: 0,
      fingerprintMatches: true,
      currentStateReady: true,
    };

    for (const forbidden of ['timestamp', 'date', 'path', 'state', 'rawState', 'fingerprint']) {
      expect(() => createMapTransitionSample({ ...safe, [forbidden]: 'forbidden' }, marks, counters))
        .toThrow(/unsafe map transition metadata key/i);
    }
  });

  it('calculates stable percentiles without depending on numeric input order', async () => {
    if (!existsSync(sourcePath)) return;
    const { percentile } = await import(modulePath);
    const ordered = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const shuffled = [17, 1, 13, 5, 19, 9, 3, 15, 7, 11];
    expect(percentile(ordered, 50)).toBe(10);
    expect(percentile(shuffled, 50)).toBe(10);
    expect(percentile(ordered, 95)).toBe(percentile(shuffled, 95));
    expect(ordered).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
    expect(() => percentile([1, Number.NaN], 50)).toThrow(/finite/i);
  });

  it('publishes only after every ordered lifecycle mark and completion metadata exist', async () => {
    if (!existsSync(sourcePath)) return;
    const { MAP_TRANSITION_MARKS, createMapTransitionProfiler } = await import(modulePath);
    let now = 0;
    const profile = createMapTransitionProfiler(true, () => now);
    profile.begin();
    for (const mark of MAP_TRANSITION_MARKS.filter((mark: string) => mark !== 'interactive')) {
      now += 1;
      profile.mark(mark);
    }
    expect(profile.snapshot().samples).toHaveLength(0);
    now += 1;
    profile.complete({
      loadedTurn: 0,
      fingerprintMatches: true,
      currentStateReady: true,
    });
    expect(profile.snapshot().samples).toHaveLength(1);
    expect(profile.snapshot().samples[0]?.durations_ms).toEqual(expect.objectContaining({
      'style-loaded': expect.any(Number),
      interactive: expect.any(Number),
    }));
  });

  it('exposes bounded active-mark diagnostics without timestamps or state payloads', async () => {
    if (!existsSync(sourcePath)) return;
    const { createMapTransitionProfiler } = await import(modulePath);
    const profile = createMapTransitionProfiler(true, () => 42);
    profile.begin();
    profile.mark('viewport-visible');

    expect(profile.debugState()).toEqual({
      active: true,
      marks: ['command', 'viewport-visible'],
      pending_metadata: false,
    });
    expect(JSON.stringify(profile.debugState())).not.toMatch(/timestamp|duration|path|state_json|raw_state/i);
  });

  it('rejects a complete sample whose marks violate the locked vocabulary order', async () => {
    if (!existsSync(sourcePath)) return;
    const { MAP_TRANSITION_MARKS, createMapTransitionSample } = await import(modulePath);
    const orderedMarks = new Map(
      MAP_TRANSITION_MARKS.map((mark: string, index: number) => [mark, index * 10]),
    );
    const invalidMarks = new Map(orderedMarks);
    invalidMarks.set('style-loaded', 45);
    invalidMarks.set('current-state-rendered', 40);
    const metadata = {
      kind: 'cold' as const,
      cycleIndex: 0,
      loadedTurn: 0,
      fingerprintMatches: true,
      currentStateReady: true,
    };
    const counters = {
      mapConstructions: 1,
      webglReleases: 0,
      staticResourceRequests: new Map<string, number>(),
    };

    expect(createMapTransitionSample(metadata, orderedMarks, counters).durations_ms)
      .toEqual(expect.objectContaining({ interactive: 60 }));
    expect(() => createMapTransitionSample(metadata, invalidMarks, counters))
      .toThrow(/locked vocabulary order/i);
  });

  it('counts both main-map and minimap context churn in one transition', async () => {
    if (!existsSync(sourcePath)) return;
    const { MAP_TRANSITION_MARKS, createMapTransitionProfiler } = await import(modulePath);
    let now = 0;
    const profile = createMapTransitionProfiler(true, () => now);
    profile.begin();
    profile.countConstruction();
    profile.countConstruction();
    profile.countRelease();
    profile.countRelease();
    profile.countDeckConstruction();
    profile.countDeckRelease();
    for (const mark of MAP_TRANSITION_MARKS.slice(1)) {
      now += 1;
      profile.mark(mark);
    }
    profile.complete({
      loadedTurn: 0,
      fingerprintMatches: true,
      currentStateReady: true,
    });

    expect(profile.snapshot()).toEqual(expect.objectContaining({
      lifetime_counters: expect.objectContaining({
        map_constructions: 2,
        webgl_releases: 2,
        deck_constructions: 1,
        deck_releases: 1,
      }),
      samples: [expect.objectContaining({
        counters: expect.objectContaining({
          map_constructions: 2,
          webgl_releases: 2,
          deck_constructions: 1,
          deck_releases: 1,
        }),
      })],
    }));
  });

  it('exposes camera state only through an explicitly enabled profiling probe', async () => {
    if (!existsSync(sourcePath)) return;
    const { createMapTransitionCameraProbe } = await import(modulePath);
    let reads = 0;
    const reader = () => {
      reads += 1;
      return { longitude: 17.82, latitude: 44.18, zoom: 8.2, pitch: 30 };
    };
    const disabled = createMapTransitionCameraProbe(false);
    const releaseDisabled = disabled.setReader(reader);
    expect(disabled.read()).toBeNull();
    expect(reads).toBe(0);
    releaseDisabled();

    const enabled = createMapTransitionCameraProbe(true);
    const releaseFirst = enabled.setReader(reader);
    expect(enabled.read()).toEqual({ longitude: 17.82, latitude: 44.18, zoom: 8.2, pitch: 30 });
    const replacement = () => ({ longitude: 18, latitude: 44, zoom: 9, pitch: 30 });
    const releaseReplacement = enabled.setReader(replacement);
    releaseFirst();
    expect(enabled.read()).toEqual({ longitude: 18, latitude: 44, zoom: 9, pitch: 30 });
    releaseReplacement();
    expect(enabled.read()).toBeNull();
  });

  it('rejects unsafe camera telemetry from the profiling probe', async () => {
    if (!existsSync(sourcePath)) return;
    const { createMapTransitionCameraProbe } = await import(modulePath);
    const enabled = createMapTransitionCameraProbe(true);
    enabled.setReader(() => ({ longitude: Number.NaN, latitude: 44, zoom: 8, pitch: 30 }));
    expect(() => enabled.read()).toThrow(/camera.*finite/i);
  });
});

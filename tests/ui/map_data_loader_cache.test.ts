import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadCensusSettlements,
  loadEventDefinitions,
  loadEventDefinitionsFull,
  loadOperationalPoliticalControl,
  loadOperationalSettlements,
  loadOsidAdjacency,
  loadOsidDamageSeed,
  loadSidToOsidMapping,
  loadTerrainScalars,
  resetStaticMapResourceCachesForTests,
} from '../../src/ui/map/data/DataLoader.js';

const URLS = {
  operational: '/data/derived/operational/operational_settlements.geojson',
  census: '/data/derived/settlements_wgs84_1990.geojson',
  control: '/data/derived/operational/operational_political_control.json',
  adjacency: '/data/derived/operational/operational_contact_graph.json',
  aliases: '/data/derived/operational/canonical_to_operational_map.json',
  terrain: '/data/derived/terrain/settlements_terrain_scalars.json',
  damage: '/data/derived/osid_damage_seed.json',
} as const;

const geometry = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { osid: 'op:test:test', sid: 'S1' },
    geometry: { type: 'Point', coordinates: [18, 44] },
  }],
};

function payloadFor(url: string): unknown {
  if (url === URLS.operational || url === URLS.census) return geometry;
  if (url === URLS.control) return { by_settlement_id: { 'op:test:test': 'RBiH' } };
  if (url === URLS.adjacency) {
    return {
      nodes: [{ id: 'op:test:test' }, { id: 'op:test:other' }],
      edges: [{ a: 'op:test:test', b: 'op:test:other' }],
    };
  }
  if (url === URLS.aliases) return { S1: 'op:test:test' };
  if (url === URLS.terrain) {
    return {
      by_sid: {
        S1: {
          road_access_index: 1,
          river_crossing_penalty: 0,
          elevation_mean_m: 100,
          elevation_stddev_m: 10,
          slope_index: 0.1,
          terrain_friction_index: 0.2,
        },
      },
    };
  }
  if (url === URLS.damage) {
    return {
      'op:test:test': {
        damage_score: 2,
        battles: 1,
        casualties_total: 0,
        flips: 0,
        displacement_spike_turns: [],
      },
    };
  }
  if (url.startsWith('/data/scenarios/events/')) {
    return [{ id: `event:${url}`, title: 'Event', narrative: '', category: 'military' }];
  }
  throw new Error(`Unexpected URL: ${url}`);
}

describe('static tactical-map resource cache', () => {
  beforeEach(() => {
    resetStaticMapResourceCachesForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetStaticMapResourceCachesForTests();
  });

  it('deduplicates concurrent and sequential loads of every immutable map resource', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return new Response(JSON.stringify(payloadFor(url)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const loaders = [
      loadOperationalSettlements,
      loadCensusSettlements,
      loadOperationalPoliticalControl,
      loadOsidAdjacency,
      loadSidToOsidMapping,
      loadTerrainScalars,
      loadOsidDamageSeed,
      loadEventDefinitions,
      loadEventDefinitionsFull,
    ] as const;

    const first = await Promise.all(loaders.map(async (load) => {
      const [a, b] = await Promise.all([load(), load()]);
      expect(a).toBe(b);
      return a;
    }));
    const second = await Promise.all(loaders.map((load) => load()));

    second.forEach((value, index) => expect(value).toBe(first[index]));
    const countByUrl = new Map<string, number>();
    for (const [input] of fetchSpy.mock.calls) {
      const url = String(input);
      countByUrl.set(url, (countByUrl.get(url) ?? 0) + 1);
    }
    expect([...countByUrl.values()].every((count) => count === 1)).toBe(true);
    expect(countByUrl.get(URLS.operational)).toBe(1);
    expect(countByUrl.get(URLS.damage)).toBe(1);
  });

  it('publishes deeply immutable cached resources', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => new Response(
      JSON.stringify(payloadFor(String(input))),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )));

    const geometryResult = await loadOperationalSettlements();
    const control = await loadOperationalPoliticalControl();
    const adjacency = await loadOsidAdjacency();
    const aliases = await loadSidToOsidMapping();
    const terrain = await loadTerrainScalars();
    const events = await loadEventDefinitions();

    expect(Object.isFrozen(geometryResult)).toBe(true);
    expect(Object.isFrozen(geometryResult.features)).toBe(true);
    expect(Object.isFrozen(geometryResult.features[0]?.properties)).toBe(true);
    expect(Object.isFrozen(control)).toBe(true);
    expect(() => geometryResult.features.push(geometryResult.features[0]!)).toThrow(TypeError);
    expect(() => { control['op:test:test'] = 'RS'; }).toThrow(TypeError);
    expect(() => adjacency.set('poison', [])).toThrow(TypeError);
    expect(() => adjacency.get('op:test:test')?.push('poison')).toThrow(TypeError);
    expect(() => aliases.set('poison', 'poison')).toThrow(TypeError);
    expect(() => terrain.set('poison', terrain.get('S1')!)).toThrow(TypeError);
    expect(() => events.set('poison', events.values().next().value!)).toThrow(TypeError);
    expect(Object.isFrozen(events.values().next().value)).toBe(true);
    expect(() => (adjacency.valueOf() as Map<string, string[]>).set('poison-via-value-of', [])).toThrow(TypeError);
    expect(() => adjacency.forEach((_value, _key, map) => map.set('poison-via-for-each', []))).toThrow(TypeError);
  });

  it('rejects a partial event catalog and retries only the transiently failed file', async () => {
    const failedUrl = '/data/scenarios/events/war_1993.json';
    const counts = new Map<string, number>();
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const attempt = (counts.get(url) ?? 0) + 1;
      counts.set(url, attempt);
      if (url === failedUrl && attempt === 1) return new Response('failed', { status: 503 });
      return new Response(JSON.stringify(payloadFor(url)), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchSpy);

    await expect(loadEventDefinitions()).rejects.toThrow('HTTP 503');
    const recovered = await loadEventDefinitions();

    expect(recovered.has(`event:${failedUrl}`)).toBe(true);
    expect(counts.get(failedUrl)).toBe(2);
    for (const [url, count] of counts) {
      if (url !== failedUrl) expect(count).toBe(1);
    }
  });

  it('evicts a rejected in-flight load so Retry can fetch the required source again', async () => {
    let attempt = 0;
    const fetchSpy = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) return new Response('failed', { status: 503 });
      return new Response(JSON.stringify(geometry), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const first = loadOperationalSettlements();
    const concurrent = loadOperationalSettlements();
    await expect(first).rejects.toThrow('HTTP 503');
    await expect(concurrent).rejects.toThrow('HTTP 503');
    await expect(loadOperationalSettlements()).resolves.toStrictEqual(geometry);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('never memoizes game-state-derived control projection', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(geometry), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const base = await loadOperationalSettlements();
    const { buildControlGeoJSON } = await import('../../src/ui/map/map/builders/buildControlGeoJSON.js');
    const rbih = buildControlGeoJSON(base, { 'op:test:test': 'RBiH' });
    const rs = buildControlGeoJSON(base, { 'op:test:test': 'RS' });

    expect(rbih).not.toBe(rs);
    expect(rbih.features[0]?.properties?.controller).toBe('RBiH');
    expect(rs.features[0]?.properties?.controller).toBe('RS');
  });
});

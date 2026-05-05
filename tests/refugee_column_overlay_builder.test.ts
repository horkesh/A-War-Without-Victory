/**
 * refugee_column_overlay_builder.test.ts
 *
 * Validates src/ui/map/layers/buildRefugeeColumnOverlay.ts. Sibling test to
 * `tests/force_quality_overlay_builder.test.ts` and
 * `tests/osid_damage_overlay_builder.test.ts`; mirrors the T1..T8 pattern
 * from LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW.
 *
 *   T1 (builder shape):       `buildRefugeeColumnData` returns the expected
 *                             RefugeeColumnDatum[] shape with required fields
 *                             and skips records that fail filters.
 *   T2 (empty-input safe):    Empty event array → empty data array; the
 *                             resulting PathLayer carries `data:[]` without
 *                             throwing — safe to enable on a fresh save.
 *   T3 (zero-displacement skip): Events with `displaced` <= 0 / NaN /
 *                             non-finite are NOT emitted into the layer.
 *   T4 (per-route aggregation): Multiple events on the same
 *                             (origin_osid, dest_osid, turn, faction)
 *                             collapse into ONE datum whose `displaced_count`
 *                             is the sum.
 *   T5 (faction-symmetric):   Color comes from a pure palette lookup
 *                             (`FACTION_GLOW_RGB`); every faction enters the
 *                             same code path. Asserted structurally by
 *                             cycling RBiH/RS/HRHB through the same route
 *                             and confirming RGB matches the table per
 *                             faction.
 *   T6 (width scaling):       displacedCountToWidth follows the spec tiers:
 *                             0 → 0, <100 → 300m, [100,1k) → 600m,
 *                             [1k,10k) → 1200m, ≥10k → 2000m (cap so a
 *                             single mass-displacement does not dominate).
 *   T7 (capability gate):     `composeTacticalDeckLayers` with
 *                             `refugeeColumnVisible: true` but empty data
 *                             returns NO refugee-column layer (mirror Force-
 *                             Quality Glow `length > 0` gate). Capability
 *                             OFF + non-empty data → no layer either.
 *   T8 (deterministic):       Two builds over byte-equal inputs produce
 *                             arrays sorted by
 *                             (from_osid, to_osid, week_index, faction_origin)
 *                             strictCompare; insertion order of input events
 *                             does NOT affect output order.
 *
 * LANE-NIGHTSHIFT-V094-THIRD-VISUAL-FEATURE (closes third v0.9.4 Visual Layer
 * feature). Path A validation: deterministic deck.gl layer-descriptor
 * assertions, no headless renderer required.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRefugeeColumnData,
  buildRefugeeColumnOverlay,
  displacedCountToWidth,
  factionGlowRgb,
  FACTION_GLOW_RGB,
  type DisplacementEventRecord,
  type RefugeeColumnDatum,
} from '../src/ui/map/layers/buildRefugeeColumnOverlay';
import {
  composeTacticalDeckLayers,
  DEFAULT_DECK_LAYER_CAPABILITIES,
} from '../src/ui/map/layers/composeTacticalDeckLayers';

// --- fixtures ---------------------------------------------------------------

/** Build a centroid lookup matching a list of OSIDs (each at integer offset). */
function makeCentroids(osids: string[]): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  osids.forEach((o, i) => m.set(o, [17 + i * 0.1, 44 + i * 0.1]));
  return m;
}

function makeEvent(args: {
  turn: number;
  origin_osid?: string;
  dest_osid?: string;
  ethnicity?: string;
  displaced: number;
}): DisplacementEventRecord {
  return {
    turn: args.turn,
    origin_osid: args.origin_osid,
    dest_osid: args.dest_osid,
    ethnicity: args.ethnicity,
    displaced: args.displaced,
  };
}

// --- tests ------------------------------------------------------------------

describe('buildRefugeeColumnOverlay', () => {
  it('T1 builder-shape: returns RefugeeColumnDatum[] with from/to/week/faction/displaced/path; filters events missing origin or dest', () => {
    const centroids = makeCentroids(['op:foo:alpha', 'op:foo:beta', 'op:foo:gamma']);
    const events: DisplacementEventRecord[] = [
      makeEvent({ turn: 4, origin_osid: 'op:foo:alpha', dest_osid: 'op:foo:beta', ethnicity: 'RBiH', displaced: 250 }),
      makeEvent({ turn: 4, origin_osid: 'op:foo:beta', dest_osid: 'op:foo:gamma', ethnicity: 'RS', displaced: 800 }),
      // No dest_osid: filtered (no path to draw).
      makeEvent({ turn: 4, origin_osid: 'op:foo:alpha', dest_osid: undefined, ethnicity: 'RBiH', displaced: 100 }),
      // No origin_osid: filtered.
      makeEvent({ turn: 4, origin_osid: undefined, dest_osid: 'op:foo:beta', ethnicity: 'RBiH', displaced: 100 }),
      // Missing centroid: filtered.
      makeEvent({ turn: 4, origin_osid: 'op:foo:alpha', dest_osid: 'op:foo:nowhere', ethnicity: 'RBiH', displaced: 100 }),
      // Self-loop: filtered.
      makeEvent({ turn: 4, origin_osid: 'op:foo:alpha', dest_osid: 'op:foo:alpha', ethnicity: 'RBiH', displaced: 100 }),
    ];

    const data = buildRefugeeColumnData(events, centroids);
    expect(data.length).toBe(2);

    const first = data[0];
    expect(first.from_osid).toBe('op:foo:alpha');
    expect(first.to_osid).toBe('op:foo:beta');
    expect(first.week_index).toBe(4);
    expect(first.faction_origin).toBe('RBiH');
    expect(first.displaced_count).toBe(250);
    expect(first.path[0]).toEqual(centroids.get('op:foo:alpha'));
    expect(first.path[1]).toEqual(centroids.get('op:foo:beta'));

    const second = data[1];
    expect(second.from_osid).toBe('op:foo:beta');
    expect(second.to_osid).toBe('op:foo:gamma');
    expect(second.faction_origin).toBe('RS');
    expect(second.displaced_count).toBe(800);
  });

  it('T2 empty-input-safe: empty event list yields empty data + a no-op layer', () => {
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b']);
    const data = buildRefugeeColumnData([], centroids);
    expect(data).toEqual([]);

    const layer = buildRefugeeColumnOverlay(data);
    expect(layer.id).toBe('refugee-column-overlay');
    expect(layer.props.data).toEqual([]);
    expect(Array.isArray(layer.props.data)).toBe(true);
    expect((layer.props.data as readonly unknown[]).length).toBe(0);
  });

  it('T3 zero-displacement-skip: displaced 0 / negative / NaN events do NOT enter the layer', () => {
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b']);
    const events: DisplacementEventRecord[] = [
      makeEvent({ turn: 1, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: 0 }),
      makeEvent({ turn: 2, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: -50 }),
      makeEvent({ turn: 3, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: Number.NaN }),
      makeEvent({ turn: 4, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: 250 }),
    ];

    const data = buildRefugeeColumnData(events, centroids);
    expect(data.length).toBe(1);
    expect(data[0].week_index).toBe(4);
    expect(data[0].displaced_count).toBe(250);

    // Sanity: the width function agrees that all three skipped values map to 0.
    expect(displacedCountToWidth(0)).toBe(0);
    expect(displacedCountToWidth(-50)).toBe(0);
    expect(displacedCountToWidth(Number.NaN)).toBe(0);
  });

  it('T4 per-route aggregation: events on same (origin, dest, turn, faction) collapse into ONE datum with summed displaced_count', () => {
    const centroids = makeCentroids(['op:foo:src', 'op:foo:dst']);
    const events: DisplacementEventRecord[] = [
      makeEvent({ turn: 5, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: 'RBiH', displaced: 100 }),
      makeEvent({ turn: 5, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: 'RBiH', displaced: 200 }),
      makeEvent({ turn: 5, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: 'RBiH', displaced: 350 }),
      // Different faction at same route+turn → distinct datum.
      makeEvent({ turn: 5, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: 'RS', displaced: 80 }),
      // Different turn at same route+faction → distinct datum.
      makeEvent({ turn: 6, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: 'RBiH', displaced: 50 }),
    ];

    const data = buildRefugeeColumnData(events, centroids);
    expect(data.length).toBe(3);

    const aggregated = data.find(
      (d) => d.from_osid === 'op:foo:src' && d.to_osid === 'op:foo:dst' && d.week_index === 5 && d.faction_origin === 'RBiH',
    );
    expect(aggregated).toBeDefined();
    expect(aggregated!.displaced_count).toBe(100 + 200 + 350);

    const rsRoute = data.find((d) => d.faction_origin === 'RS');
    expect(rsRoute).toBeDefined();
    expect(rsRoute!.displaced_count).toBe(80);

    const w6Route = data.find((d) => d.week_index === 6);
    expect(w6Route).toBeDefined();
    expect(w6Route!.displaced_count).toBe(50);
  });

  it('T5 faction-symmetric: color comes from pure palette lookup; every faction enters the same code path with no asymmetric branching', () => {
    // Structural assertion: factionGlowRgb is a pure lookup over FACTION_GLOW_RGB.
    expect(factionGlowRgb('RBiH')).toEqual(FACTION_GLOW_RGB.RBiH);
    expect(factionGlowRgb('RS')).toEqual(FACTION_GLOW_RGB.RS);
    expect(factionGlowRgb('HRHB')).toEqual(FACTION_GLOW_RGB.HRHB);

    // Each faction has a distinct entry — but the LOOKUP MECHANISM is the same.
    expect(factionGlowRgb('RBiH')).not.toEqual(factionGlowRgb('RS'));
    expect(factionGlowRgb('RS')).not.toEqual(factionGlowRgb('HRHB'));

    // Cycle the same route + same displaced count through each faction; the
    // accessor must yield the palette RGB for that faction (no branch).
    const centroids = makeCentroids(['op:foo:src', 'op:foo:dst']);
    const factions = ['RBiH', 'RS', 'HRHB'];
    type FillColor = [number, number, number, number];

    for (const faction of factions) {
      const data = buildRefugeeColumnData(
        [makeEvent({ turn: 7, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: faction, displaced: 500 })],
        centroids,
      );
      expect(data.length).toBe(1);
      const layer = buildRefugeeColumnOverlay(data);
      const fill = (layer.props.getColor as (d: RefugeeColumnDatum) => FillColor)(data[0]);
      const expectedRgb = FACTION_GLOW_RGB[faction];
      expect(fill[0]).toBe(expectedRgb[0]);
      expect(fill[1]).toBe(expectedRgb[1]);
      expect(fill[2]).toBe(expectedRgb[2]);
      // Alpha is the same byte for every faction — symmetric.
      expect(typeof fill[3]).toBe('number');
    }

    // All three factions share the same alpha byte (symmetric).
    const dataR = buildRefugeeColumnData(
      [makeEvent({ turn: 7, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: 'RBiH', displaced: 500 })],
      centroids,
    );
    const dataS = buildRefugeeColumnData(
      [makeEvent({ turn: 7, origin_osid: 'op:foo:src', dest_osid: 'op:foo:dst', ethnicity: 'RS', displaced: 500 })],
      centroids,
    );
    const layerR = buildRefugeeColumnOverlay(dataR);
    const layerS = buildRefugeeColumnOverlay(dataS);
    type FillColor2 = [number, number, number, number];
    const alphaR = (layerR.props.getColor as (d: RefugeeColumnDatum) => FillColor2)(dataR[0])[3];
    const alphaS = (layerS.props.getColor as (d: RefugeeColumnDatum) => FillColor2)(dataS[0])[3];
    expect(alphaR).toBe(alphaS);
  });

  it('T6 width scaling: displaced_count → width follows the spec tiers (capped at 2000m so a Srebrenica-class event does not dominate)', () => {
    // Below or zero count → 0.
    expect(displacedCountToWidth(0)).toBe(0);
    expect(displacedCountToWidth(-1)).toBe(0);
    expect(displacedCountToWidth(Number.NaN)).toBe(0);

    // 0 < count < 100 → 300m (faint trickle).
    expect(displacedCountToWidth(1)).toBe(300);
    expect(displacedCountToWidth(50)).toBe(300);
    expect(displacedCountToWidth(99)).toBe(300);

    // [100, 1000) → 600m (column).
    expect(displacedCountToWidth(100)).toBe(600);
    expect(displacedCountToWidth(500)).toBe(600);
    expect(displacedCountToWidth(999)).toBe(600);

    // [1000, 10000) → 1200m (mass flight).
    expect(displacedCountToWidth(1000)).toBe(1200);
    expect(displacedCountToWidth(5000)).toBe(1200);
    expect(displacedCountToWidth(9999)).toBe(1200);

    // ≥ 10000 → 2000m (catastrophe; cap).
    expect(displacedCountToWidth(10000)).toBe(2000);
    expect(displacedCountToWidth(50000)).toBe(2000);
    // Cap holds even at extreme counts (Srebrenica-class).
    expect(displacedCountToWidth(1_000_000)).toBe(2000);

    // Layer accessor must call the same width function.
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b']);
    const events: DisplacementEventRecord[] = [
      makeEvent({ turn: 1, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: 50 }),
      makeEvent({ turn: 2, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: 500 }),
      makeEvent({ turn: 3, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: 5000 }),
      makeEvent({ turn: 4, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: 50000 }),
    ];
    const data = buildRefugeeColumnData(events, centroids);
    const layer = buildRefugeeColumnOverlay(data);
    const widths = data.map((d) => (layer.props.getWidth as (d: RefugeeColumnDatum) => number)(d));
    // Sort by (from, to, week, faction) puts these in turn order 1..4.
    expect(widths).toEqual([300, 600, 1200, 2000]);
  });

  it('T7 capability-gate: composeTacticalDeckLayers does NOT add the refugee-column layer when data empty OR feature flag off', () => {
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b']);

    // refugeeColumnVisible: true BUT empty data → layer is NOT added.
    const data = buildRefugeeColumnData([], centroids);
    expect(data).toEqual([]);
    const layers = composeTacticalDeckLayers({
      formationsGeoJson: { type: 'FeatureCollection', features: [] },
      labelsVisible: false,
      formationsVisible: false,
      zoom: 8,
      loadedGameState: null,
      centroidLookup: new Map(),
      capabilities: {
        ...DEFAULT_DECK_LAYER_CAPABILITIES,
        deckFormationCounters: false,
        refugeeColumnVisible: true,
      },
      refugeeColumnData: data,
    });
    expect(layers.map((l) => l.id)).not.toContain('refugee-column-overlay');

    // With non-empty data and capability ON, the layer IS added.
    const liveEvents: DisplacementEventRecord[] = [
      makeEvent({ turn: 4, origin_osid: 'op:foo:a', dest_osid: 'op:foo:b', ethnicity: 'RBiH', displaced: 250 }),
    ];
    const liveData = buildRefugeeColumnData(liveEvents, centroids);
    expect(liveData.length).toBe(1);
    const layersLive = composeTacticalDeckLayers({
      formationsGeoJson: { type: 'FeatureCollection', features: [] },
      labelsVisible: false,
      formationsVisible: false,
      zoom: 8,
      loadedGameState: null,
      centroidLookup: new Map(),
      capabilities: {
        ...DEFAULT_DECK_LAYER_CAPABILITIES,
        deckFormationCounters: false,
        refugeeColumnVisible: true,
      },
      refugeeColumnData: liveData,
    });
    expect(layersLive.map((l) => l.id)).toContain('refugee-column-overlay');

    // Capability OFF + non-empty data → layer NOT added.
    const layersOff = composeTacticalDeckLayers({
      formationsGeoJson: { type: 'FeatureCollection', features: [] },
      labelsVisible: false,
      formationsVisible: false,
      zoom: 8,
      loadedGameState: null,
      centroidLookup: new Map(),
      capabilities: {
        ...DEFAULT_DECK_LAYER_CAPABILITIES,
        deckFormationCounters: false,
        refugeeColumnVisible: false,
      },
      refugeeColumnData: liveData,
    });
    expect(layersOff.map((l) => l.id)).not.toContain('refugee-column-overlay');
  });

  it('T8 deterministic: byte-equal inputs in different insertion orders produce byte-equal output', () => {
    const centroids = makeCentroids([
      'op:bar:zulu',
      'op:bar:alpha',
      'op:bar:mike',
      'op:bar:bravo',
    ]);

    const eventsA: DisplacementEventRecord[] = [
      makeEvent({ turn: 8, origin_osid: 'op:bar:mike', dest_osid: 'op:bar:zulu', ethnicity: 'RS', displaced: 200 }),
      makeEvent({ turn: 4, origin_osid: 'op:bar:zulu', dest_osid: 'op:bar:alpha', ethnicity: 'RBiH', displaced: 800 }),
      makeEvent({ turn: 4, origin_osid: 'op:bar:alpha', dest_osid: 'op:bar:bravo', ethnicity: 'HRHB', displaced: 50 }),
      makeEvent({ turn: 6, origin_osid: 'op:bar:bravo', dest_osid: 'op:bar:mike', ethnicity: 'RBiH', displaced: 1500 }),
      makeEvent({ turn: 4, origin_osid: 'op:bar:zulu', dest_osid: 'op:bar:alpha', ethnicity: 'RBiH', displaced: 200 }),
    ];

    // events B: same data, reversed insertion order.
    const eventsB: DisplacementEventRecord[] = [...eventsA].reverse();

    const dataA = buildRefugeeColumnData(eventsA, centroids);
    const dataB = buildRefugeeColumnData(eventsB, centroids);

    // Five events, four distinct routes (two events on
    // (zulu→alpha, w4, RBiH) collapse → 4 datums).
    expect(dataA.length).toBe(4);

    // strictCompare sort on (from_osid, to_osid, week_index, faction_origin).
    expect(dataA.map((d) => `${d.from_osid}->${d.to_osid}|w${d.week_index}|${d.faction_origin}`)).toEqual([
      'op:bar:alpha->op:bar:bravo|w4|HRHB',
      'op:bar:bravo->op:bar:mike|w6|RBiH',
      'op:bar:mike->op:bar:zulu|w8|RS',
      'op:bar:zulu->op:bar:alpha|w4|RBiH',
    ]);

    // The aggregated zulu→alpha route carries the summed displaced count.
    const zuluAlpha = dataA.find((d) => d.from_osid === 'op:bar:zulu' && d.to_osid === 'op:bar:alpha');
    expect(zuluAlpha).toBeDefined();
    expect(zuluAlpha!.displaced_count).toBe(800 + 200);

    // Byte-equivalent across two builds (same content, same order).
    expect(JSON.stringify(dataA)).toBe(JSON.stringify(dataB));
  });
});

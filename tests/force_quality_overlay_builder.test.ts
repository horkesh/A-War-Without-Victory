/**
 * force_quality_overlay_builder.test.ts
 *
 * Validates src/ui/map/layers/buildForceQualityOverlay.ts. Sibling test to
 * `tests/osid_damage_overlay_builder.test.ts`; mirrors the T1..T8 pattern from
 * LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION.
 *
 *   T1 (builder shape):       `buildForceQualityData` returns the expected
 *                             ForceQualityDatum[] shape with required fields
 *                             and skips records that fail filters.
 *   T2 (empty-input safe):    Empty formation array → empty data array; the
 *                             resulting PolygonLayer carries `data:[]` without
 *                             throwing — safe to enable on a fresh save.
 *   T3 (zero-quality skip):   OSIDs whose mean officer_quality is 0 / negative
 *                             / NaN are NOT emitted into the layer data
 *                             (territory fill underneath is preserved).
 *   T4 (per-osid aggregation):Multiple brigades at the same (osid, faction)
 *                             aggregate to a single mean datum (not multiple
 *                             stacked records).
 *   T5 (faction-symmetric):   Color comes from a pure palette lookup
 *                             (FACTION_GLOW_RGB); every faction enters the
 *                             same code path. Asserted structurally by
 *                             cycling RBiH/RS/HRHB through the same osid and
 *                             confirming RGB matches the table per faction.
 *   T6 (per-tier alpha):      officerQualityToAlpha follows the spec gradient:
 *                             0 → 0, <0.30 → 0.05, [0.30,0.60) → 0.15,
 *                             ≥0.60 → 0.30. Layer accessor returns the round
 *                             of (alpha * 255).
 *   T7 (capability-gate):     `composeTacticalDeckLayers` with
 *                             `forceQualityVisible: true` but empty data
 *                             returns NO force-quality layer (mirror Map That
 *                             Scars `length > 0` gate).
 *   T8 (deterministic):       Two builds over byte-equal inputs produce
 *                             arrays with identical (osid, faction) order and
 *                             identical contour content; insertion order of
 *                             input formations does NOT affect output order.
 *
 * LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW (closes second v0.9.4 Visual Layer
 * feature). Path A validation: deterministic deck.gl layer-descriptor
 * assertions, no headless renderer required.
 */
import { describe, it, expect } from 'vitest';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import {
  buildForceQualityData,
  buildForceQualityOverlay,
  officerQualityToAlpha,
  factionGlowRgb,
  FACTION_GLOW_RGB,
  type ForceQualityDatum,
} from '../src/ui/map/layers/buildForceQualityOverlay';
import { composeTacticalDeckLayers, DEFAULT_DECK_LAYER_CAPABILITIES } from '../src/ui/map/layers/composeTacticalDeckLayers';
import type { FormationView } from '../src/ui/map/data/types';

// --- fixtures ---------------------------------------------------------------

function makeOsidFeature(osid: string, n: number): FeatureCollection['features'][number] {
  const x = n;
  const y = n;
  const ring: number[][] = [
    [x, y],
    [x + 1, y],
    [x + 1, y + 1],
    [x, y + 1],
    [x, y],
  ];
  const geom: Polygon = { type: 'Polygon', coordinates: [ring] };
  return {
    type: 'Feature',
    properties: { osid, area_km2: 1.0 },
    geometry: geom,
  };
}

function makeFC(osids: string[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: osids.map((o, i) => makeOsidFeature(o, i)),
  };
}

function makeMultiOsidFeature(osid: string): FeatureCollection['features'][number] {
  const first: number[][][] = [[
    [10, 10],
    [11, 10],
    [11, 11],
    [10, 11],
    [10, 10],
  ]];
  const second: number[][][] = [[
    [12, 12],
    [13, 12],
    [13, 13],
    [12, 13],
    [12, 12],
  ]];
  const geom: MultiPolygon = { type: 'MultiPolygon', coordinates: [first, second] };
  return {
    type: 'Feature',
    properties: { osid, area_km2: 2.0 },
    geometry: geom,
  };
}

/** Make a minimal active-brigade FormationView. */
function makeBrigade(args: {
  id: string;
  faction: string;
  location_osid: string;
  officer_quality: number;
  status?: string;
  kind?: string;
}): FormationView {
  return {
    id: args.id,
    faction: args.faction,
    name: args.id,
    kind: args.kind ?? 'brigade',
    readiness: 'ready',
    cohesion: 70,
    fatigue: 0,
    status: args.status ?? 'active',
    createdTurn: 0,
    tags: [],
    location_osid: args.location_osid,
    officer_quality: args.officer_quality,
  };
}

// --- tests ------------------------------------------------------------------

describe('buildForceQualityOverlay', () => {
  it('T1 builder-shape: returns ForceQualityDatum[] with osid/faction/contour/officerQualityMean/brigadeCount, filtering non-active and non-brigade kinds', () => {
    const polygons = makeFC(['op:foo:alpha', 'op:foo:beta', 'op:foo:delta']);
    const formations: FormationView[] = [
      makeBrigade({ id: 'b1', faction: 'RBiH', location_osid: 'op:foo:alpha', officer_quality: 0.45 }),
      makeBrigade({ id: 'b2', faction: 'RS', location_osid: 'op:foo:beta', officer_quality: 0.70 }),
      // Inactive: filtered.
      makeBrigade({ id: 'b3', faction: 'RBiH', location_osid: 'op:foo:delta', officer_quality: 0.50, status: 'inactive' }),
      // Wrong kind: filtered.
      makeBrigade({ id: 'corps1', faction: 'RBiH', location_osid: 'op:foo:alpha', officer_quality: 0.80, kind: 'corps' }),
      // No polygon match: filtered.
      makeBrigade({ id: 'b4', faction: 'RBiH', location_osid: 'op:foo:gamma', officer_quality: 0.50 }),
    ];

    const data = buildForceQualityData(formations, polygons);
    expect(data.length).toBe(2);

    const first = data[0];
    expect(first.osid).toBe('op:foo:alpha');
    expect(first.faction).toBe('RBiH');
    expect(first.officerQualityMean).toBeCloseTo(0.45);
    expect(first.brigadeCount).toBe(1);
    expect(Array.isArray(first.contour)).toBe(true);
    expect(first.isMulti).toBe(false);

    const second = data[1];
    expect(second.osid).toBe('op:foo:beta');
    expect(second.faction).toBe('RS');
    expect(second.officerQualityMean).toBeCloseTo(0.70);
    expect(second.brigadeCount).toBe(1);
  });

  it('T2 empty-input-safe: empty formation list yields empty data + a no-op layer', () => {
    const polygons = makeFC(['op:foo:a', 'op:foo:b']);
    const data = buildForceQualityData([], polygons);
    expect(data).toEqual([]);

    const layer = buildForceQualityOverlay(data);
    expect(layer.id).toBe('force-quality-glow-overlay');
    expect(layer.props.data).toEqual([]);
    expect(Array.isArray(layer.props.data)).toBe(true);
    expect((layer.props.data as readonly unknown[]).length).toBe(0);
  });

  it('T3 zero-quality-skip: officer_quality 0 / negative / NaN brigades do NOT enter the layer', () => {
    const polygons = makeFC(['op:foo:zero', 'op:foo:neg', 'op:foo:nan', 'op:foo:positive']);
    const formations: FormationView[] = [
      makeBrigade({ id: 'b_zero', faction: 'RBiH', location_osid: 'op:foo:zero', officer_quality: 0 }),
      makeBrigade({ id: 'b_neg', faction: 'RBiH', location_osid: 'op:foo:neg', officer_quality: -0.1 }),
      makeBrigade({ id: 'b_nan', faction: 'RBiH', location_osid: 'op:foo:nan', officer_quality: Number.NaN }),
      makeBrigade({ id: 'b_pos', faction: 'RBiH', location_osid: 'op:foo:positive', officer_quality: 0.45 }),
    ];

    const data = buildForceQualityData(formations, polygons);
    expect(data.map((d) => d.osid)).toEqual(['op:foo:positive']);

    // Sanity: the gradient agrees that all three skipped values map to alpha 0.
    expect(officerQualityToAlpha(0)).toBe(0);
    expect(officerQualityToAlpha(-0.1)).toBe(0);
    expect(officerQualityToAlpha(Number.NaN)).toBe(0);
  });

  it('T4 per-osid aggregation: multiple brigades at the same (osid, faction) collapse to a single mean datum', () => {
    const polygons = makeFC(['op:foo:hub']);
    const formations: FormationView[] = [
      makeBrigade({ id: 'b_alpha', faction: 'RBiH', location_osid: 'op:foo:hub', officer_quality: 0.20 }),
      makeBrigade({ id: 'b_bravo', faction: 'RBiH', location_osid: 'op:foo:hub', officer_quality: 0.40 }),
      makeBrigade({ id: 'b_chrl', faction: 'RBiH', location_osid: 'op:foo:hub', officer_quality: 0.60 }),
      // Different faction at same OSID should NOT merge.
      makeBrigade({ id: 'b_delt', faction: 'RS', location_osid: 'op:foo:hub', officer_quality: 0.80 }),
    ];

    const data = buildForceQualityData(formations, polygons);

    // One datum per (osid, faction) pair; 1 RBiH + 1 RS at op:foo:hub.
    expect(data.length).toBe(2);
    const rbih = data.find((d) => d.osid === 'op:foo:hub' && d.faction === 'RBiH');
    const rs = data.find((d) => d.osid === 'op:foo:hub' && d.faction === 'RS');
    expect(rbih).toBeDefined();
    expect(rs).toBeDefined();
    // RBiH mean = (0.20 + 0.40 + 0.60) / 3 = 0.40, count = 3.
    expect(rbih!.officerQualityMean).toBeCloseTo(0.40);
    expect(rbih!.brigadeCount).toBe(3);
    // RS mean = 0.80, count = 1.
    expect(rs!.officerQualityMean).toBeCloseTo(0.80);
    expect(rs!.brigadeCount).toBe(1);
  });

  it('T4b multipolygon-split: MultiPolygon OSIDs emit one PolygonLayer-safe datum per part', () => {
    const multiFeature = makeMultiOsidFeature('op:foo:multi');
    const polygons: FeatureCollection = {
      type: 'FeatureCollection',
      features: [multiFeature],
    };
    const formations: FormationView[] = [
      makeBrigade({ id: 'b_multi', faction: 'RBiH', location_osid: 'op:foo:multi', officer_quality: 0.45 }),
    ];

    const data = buildForceQualityData(formations, polygons);

    expect(data.map((d) => `${d.osid}|${d.faction}`)).toEqual([
      'op:foo:multi|RBiH',
      'op:foo:multi|RBiH',
    ]);
    expect(data.every((d) => d.isMulti)).toBe(true);
    expect(data[0].contour).toEqual((multiFeature.geometry as MultiPolygon).coordinates[0]);
    expect(data[1].contour).toEqual((multiFeature.geometry as MultiPolygon).coordinates[1]);

    const layer = buildForceQualityOverlay(data);
    const getPolygon = layer.props.getPolygon as (d: ForceQualityDatum) => number[][][];
    expect(getPolygon(data[0])).toEqual((multiFeature.geometry as MultiPolygon).coordinates[0]);
    expect(Array.isArray(getPolygon(data[0])[0][0])).toBe(true);
    expect(typeof getPolygon(data[0])[0][0][0]).toBe('number');
  });

  it('T5 faction-symmetric: color comes from pure palette lookup; every faction enters the same code path with no asymmetric branching', () => {
    // Structural assertion: factionGlowRgb is a pure lookup over FACTION_GLOW_RGB.
    expect(factionGlowRgb('RBiH')).toEqual(FACTION_GLOW_RGB.RBiH);
    expect(factionGlowRgb('RS')).toEqual(FACTION_GLOW_RGB.RS);
    expect(factionGlowRgb('HRHB')).toEqual(FACTION_GLOW_RGB.HRHB);

    // Each faction has a distinct entry — but the LOOKUP MECHANISM is the same.
    expect(factionGlowRgb('RBiH')).not.toEqual(factionGlowRgb('RS'));
    expect(factionGlowRgb('RS')).not.toEqual(factionGlowRgb('HRHB'));

    // Cycle the same OSID + same officer_quality through each faction; the
    // accessor must yield the palette RGB for that faction (no branch).
    const polygons = makeFC(['op:foo:cycle']);
    const factions = ['RBiH', 'RS', 'HRHB'];
    type FillColor = [number, number, number, number];
    const expectedAlpha = Math.round(0.30 * 255); // officer_quality 0.75 → strong tier

    for (const faction of factions) {
      const data = buildForceQualityData(
        [makeBrigade({ id: `b_${faction}`, faction, location_osid: 'op:foo:cycle', officer_quality: 0.75 })],
        polygons,
      );
      expect(data.length).toBe(1);
      const layer = buildForceQualityOverlay(data);
      const fill = (layer.props.getFillColor as (d: ForceQualityDatum) => FillColor)(data[0]);
      const expectedRgb = FACTION_GLOW_RGB[faction];
      expect(fill[0]).toBe(expectedRgb[0]);
      expect(fill[1]).toBe(expectedRgb[1]);
      expect(fill[2]).toBe(expectedRgb[2]);
      expect(fill[3]).toBe(expectedAlpha);
    }
  });

  it('T6 per-tier alpha: officer_quality → alpha follows the spec gradient', () => {
    // Below or zero quality → alpha 0.
    expect(officerQualityToAlpha(0)).toBe(0);
    expect(officerQualityToAlpha(-0.1)).toBe(0);
    expect(officerQualityToAlpha(Number.NaN)).toBe(0);

    // 0 < quality < 0.30 → 0.05 (faint glow).
    expect(officerQualityToAlpha(0.01)).toBeCloseTo(0.05);
    expect(officerQualityToAlpha(0.15)).toBeCloseTo(0.05);
    expect(officerQualityToAlpha(0.299)).toBeCloseTo(0.05);

    // [0.30, 0.60) → 0.15 (moderate glow).
    expect(officerQualityToAlpha(0.30)).toBeCloseTo(0.15);
    expect(officerQualityToAlpha(0.45)).toBeCloseTo(0.15);
    expect(officerQualityToAlpha(0.599)).toBeCloseTo(0.15);

    // ≥ 0.60 → 0.30 (strong glow).
    expect(officerQualityToAlpha(0.60)).toBeCloseTo(0.30);
    expect(officerQualityToAlpha(0.75)).toBeCloseTo(0.30);
    expect(officerQualityToAlpha(0.90)).toBeCloseTo(0.30);

    // The accessor on the layer must round (alpha * 255).
    const polygons = makeFC(['op:foo:a', 'op:foo:b', 'op:foo:c']);
    const formations: FormationView[] = [
      makeBrigade({ id: 'b_low', faction: 'RBiH', location_osid: 'op:foo:a', officer_quality: 0.20 }),  // faint  → 13
      makeBrigade({ id: 'b_mid', faction: 'RBiH', location_osid: 'op:foo:b', officer_quality: 0.45 }),  // mod    → 38
      makeBrigade({ id: 'b_hi',  faction: 'RBiH', location_osid: 'op:foo:c', officer_quality: 0.80 }),  // strong → 77
    ];
    const data = buildForceQualityData(formations, polygons);
    const layer = buildForceQualityOverlay(data);
    type FillColor = [number, number, number, number];
    const fills = data.map((d) => (layer.props.getFillColor as (d: ForceQualityDatum) => FillColor)(d));
    const alphas = fills.map((f) => f[3]);
    // Sort by osid in builder yields a < b < c → faint, moderate, strong.
    expect(alphas).toEqual([
      Math.round(0.05 * 255),
      Math.round(0.15 * 255),
      Math.round(0.30 * 255),
    ]);
  });

  it('T7 capability-gate: composeTacticalDeckLayers does NOT add the force-quality layer when data is empty', () => {
    const polygons = makeFC(['op:foo:a']);
    const formations: FormationView[] = [];
    const data = buildForceQualityData(formations, polygons);
    expect(data).toEqual([]);

    // forceQualityVisible: true BUT empty data → layer is NOT added.
    const layers = composeTacticalDeckLayers({
      formationsGeoJson: { type: 'FeatureCollection', features: [] },
      labelsVisible: false,
      formationsVisible: false,
      zoom: 8,
      loadedGameState: null,
      centroidLookup: new Map(),
      capabilities: {
        ...DEFAULT_DECK_LAYER_CAPABILITIES,
        deckFormationCounters: false, // keep the layer set tight
        forceQualityVisible: true,
      },
      forceQualityData: data,
    });
    const ids = layers.map((l) => l.id);
    expect(ids).not.toContain('force-quality-glow-overlay');

    // With non-empty data and capability ON, the layer IS added.
    const formationsLive: FormationView[] = [
      makeBrigade({ id: 'b1', faction: 'RBiH', location_osid: 'op:foo:a', officer_quality: 0.45 }),
    ];
    const liveData = buildForceQualityData(formationsLive, polygons);
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
        forceQualityVisible: true,
      },
      forceQualityData: liveData,
    });
    expect(layersLive.map((l) => l.id)).toContain('force-quality-glow-overlay');

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
        forceQualityVisible: false,
      },
      forceQualityData: liveData,
    });
    expect(layersOff.map((l) => l.id)).not.toContain('force-quality-glow-overlay');
  });

  it('T8 deterministic: byte-equal inputs in different insertion orders produce byte-equal output', () => {
    const polygons = makeFC([
      'op:bar:zulu',
      'op:bar:alpha',
      'op:bar:mike',
      'op:bar:bravo',
    ]);

    const formationsA: FormationView[] = [
      makeBrigade({ id: 'f_mike', faction: 'RS', location_osid: 'op:bar:mike', officer_quality: 0.45 }),
      makeBrigade({ id: 'f_zulu', faction: 'RBiH', location_osid: 'op:bar:zulu', officer_quality: 0.80 }),
      makeBrigade({ id: 'f_alpha', faction: 'HRHB', location_osid: 'op:bar:alpha', officer_quality: 0.20 }),
      makeBrigade({ id: 'f_bravo', faction: 'RBiH', location_osid: 'op:bar:bravo', officer_quality: 0.55 }),
    ];

    // formations B: same data, reversed insertion order.
    const formationsB: FormationView[] = [...formationsA].reverse();

    const dataA = buildForceQualityData(formationsA, polygons);
    const dataB = buildForceQualityData(formationsB, polygons);

    // strictCompare sort on (osid|faction):
    //   op:bar:alpha|HRHB, op:bar:bravo|RBiH, op:bar:mike|RS, op:bar:zulu|RBiH
    expect(dataA.map((d) => `${d.osid}|${d.faction}`)).toEqual([
      'op:bar:alpha|HRHB',
      'op:bar:bravo|RBiH',
      'op:bar:mike|RS',
      'op:bar:zulu|RBiH',
    ]);

    // Byte-equivalent across two builds (same content, same order).
    expect(JSON.stringify(dataA)).toBe(JSON.stringify(dataB));
  });
});

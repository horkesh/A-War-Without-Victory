/**
 * osid_damage_overlay_builder.test.ts
 *
 * Validates src/ui/map/layers/buildOsidDamageOverlay.ts:
 *   T1 (data extraction):    `buildOsidDamageData` extracts polygons for the
 *                             OSIDs present in the seed, skipping seed entries
 *                             with no matching polygon and skipping records
 *                             whose `damage_score` maps to alpha 0.
 *   T2 (gradient):            `damageScoreToAlpha` follows the spec gradient:
 *                             0 → 0, <10 → 0.05, [10,50) → 0.15, ≥50 → 0.30.
 *   T3 (faction-agnostic):    Output records carry no `faction` field; the
 *                             scar tint is independent of any faction-specific
 *                             metadata in either input.
 *   T4 (deterministic):       Two builds over the same inputs produce
 *                             arrays with identical OSID order and identical
 *                             contour content; OSID iteration order matches
 *                             strictCompare-sorted seed keys regardless of
 *                             insertion order in the input record.
 *
 * LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION extension (4 additional tests):
 *   T5 (layer-descriptor):    `buildOsidDamageOverlay` produces a deck.gl
 *                             PolygonLayer with the expected layer id, data
 *                             reference, and getFillColor accessor that emits
 *                             a faction-neutral RGB triple plus per-tier alpha.
 *   T6 (no-faction-mutation): The PolygonLayer's fill color is invariant to
 *                             faction metadata on the polygon Feature — i.e.
 *                             the scar layer never reads or mutates faction
 *                             colors; it is a pure dark-grey overlay.
 *   T7 (empty-graceful):      Empty seed (`{}`) produces an empty data array,
 *                             and the resulting PolygonLayer carries `data:[]`
 *                             without throwing — i.e. the renderer is safe to
 *                             enable on a fresh save before any combat.
 *   T8 (zero-score-skip):     OSIDs whose `damage_score` is 0 (or negative,
 *                             or NaN) are NOT emitted into the layer data —
 *                             they receive zero opacity and territory fill
 *                             beneath them is preserved.
 *
 * Part of LANE-NIGHTSHIFT-MAP-THAT-SCARS-RENDERER (T1–T4) and
 * LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION (T5–T8).
 */
import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';
import {
  buildOsidDamageData,
  buildOsidDamageOverlay,
  damageScoreToAlpha,
  type OsidDamageDatum,
  type OsidDamageSeed,
} from '../src/ui/map/layers/buildOsidDamageOverlay';

// --- fixtures ---------------------------------------------------------------

/** Make a unit-square Polygon Feature for OSID `osid` at integer offset `n`. */
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

function makeSeed(entries: Array<[string, number]>): OsidDamageSeed {
  const seed: OsidDamageSeed = {};
  for (const [osid, score] of entries) {
    seed[osid] = {
      damage_score: score,
      battles: 0,
      casualties_total: 0,
      flips: 0,
      displacement_spike_turns: [],
    };
  }
  return seed;
}

// --- tests ------------------------------------------------------------------

describe('buildOsidDamageOverlay', () => {
  it('T1 data-extraction: keeps OSIDs that have polygons + non-zero damage; skips orphans + zero-alpha records', () => {
    const polygons = makeFC([
      'op:foo:alpha',
      'op:foo:beta',
      'op:foo:delta',
    ]);
    const seed = makeSeed([
      ['op:foo:alpha', 5],         // < 10  → kept (faint alpha)
      ['op:foo:beta', 60],         // >= 50 → kept (wound alpha)
      ['op:foo:gamma', 30],        // no polygon → skipped silently
      ['op:foo:delta', 0],         // alpha 0 → skipped
    ]);

    const data = buildOsidDamageData(seed, polygons);
    const osidsOut = data.map((d) => d.osid);

    expect(osidsOut).toEqual(['op:foo:alpha', 'op:foo:beta']);
    // Each kept record carries a contour and a damageScore.
    for (const d of data) {
      expect(Array.isArray(d.contour)).toBe(true);
      expect(d.damageScore).toBeGreaterThan(0);
    }
  });

  it('T2 gradient: damage_score → alpha follows the spec tiers', () => {
    // Below or zero score → alpha 0.
    expect(damageScoreToAlpha(0)).toBe(0);
    expect(damageScoreToAlpha(-1)).toBe(0);
    expect(damageScoreToAlpha(NaN)).toBe(0);

    // 0 < score < 10 → 0.05 (faint smudge).
    expect(damageScoreToAlpha(0.5)).toBeCloseTo(0.05);
    expect(damageScoreToAlpha(5)).toBeCloseTo(0.05);
    expect(damageScoreToAlpha(9.999)).toBeCloseTo(0.05);

    // [10, 50) → 0.15 (moderate scar).
    expect(damageScoreToAlpha(10)).toBeCloseTo(0.15);
    expect(damageScoreToAlpha(25)).toBeCloseTo(0.15);
    expect(damageScoreToAlpha(49.999)).toBeCloseTo(0.15);

    // ≥ 50 → 0.30 (dark wound).
    expect(damageScoreToAlpha(50)).toBeCloseTo(0.30);
    expect(damageScoreToAlpha(100)).toBeCloseTo(0.30);
    expect(damageScoreToAlpha(1000)).toBeCloseTo(0.30);
  });

  it('T3 faction-agnostic: emitted data carries no faction; output is invariant under per-feature faction props', () => {
    const polygons = makeFC(['op:foo:a', 'op:foo:b']);
    // Inject faction-flavored properties into the polygon features.
    polygons.features[0].properties = { ...(polygons.features[0].properties ?? {}), osid: 'op:foo:a', faction: 'RBiH' };
    polygons.features[1].properties = { ...(polygons.features[1].properties ?? {}), osid: 'op:foo:b', faction: 'RS' };

    const seed = makeSeed([
      ['op:foo:a', 12],
      ['op:foo:b', 75],
    ]);

    const data = buildOsidDamageData(seed, polygons);
    expect(data.length).toBe(2);

    for (const d of data) {
      // No faction field on the output record (structural assertion).
      expect(Object.prototype.hasOwnProperty.call(d, 'faction')).toBe(false);
    }

    // Swap the faction properties between the two features and rebuild —
    // alpha tiers / OSID order / contour content must be identical.
    const polygonsSwapped: FeatureCollection = {
      type: 'FeatureCollection',
      features: polygons.features.map((f) => ({
        ...f,
        properties: {
          ...(f.properties ?? {}),
          // Swap faction; OSID property unchanged.
          faction: f.properties?.faction === 'RBiH' ? 'RS' : 'RBiH',
        },
      })),
    };
    const dataSwapped = buildOsidDamageData(seed, polygonsSwapped);

    expect(dataSwapped.map((d) => d.osid)).toEqual(data.map((d) => d.osid));
    expect(dataSwapped.map((d) => damageScoreToAlpha(d.damageScore))).toEqual(
      data.map((d) => damageScoreToAlpha(d.damageScore)),
    );
    expect(JSON.stringify(dataSwapped.map((d) => d.contour))).toEqual(
      JSON.stringify(data.map((d) => d.contour)),
    );
  });

  it('T4 deterministic: output order is strictCompare-sorted by OSID and stable across reorderings of the seed', () => {
    const polygons = makeFC([
      'op:bar:zulu',
      'op:bar:alpha',
      'op:bar:mike',
      'op:bar:bravo',
    ]);

    // Seed keys inserted in non-sorted order.
    const seedA: OsidDamageSeed = {};
    seedA['op:bar:mike'] = { damage_score: 12, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };
    seedA['op:bar:zulu'] = { damage_score: 60, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };
    seedA['op:bar:alpha'] = { damage_score: 5, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };
    seedA['op:bar:bravo'] = { damage_score: 0.5, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };

    // Seed B: same data, reversed insertion order.
    const seedB: OsidDamageSeed = {};
    seedB['op:bar:bravo'] = { damage_score: 0.5, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };
    seedB['op:bar:alpha'] = { damage_score: 5, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };
    seedB['op:bar:zulu'] = { damage_score: 60, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };
    seedB['op:bar:mike'] = { damage_score: 12, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] };

    const dataA = buildOsidDamageData(seedA, polygons);
    const dataB = buildOsidDamageData(seedB, polygons);

    // strictCompare sort: 'alpha' < 'bravo' < 'mike' < 'zulu'.
    expect(dataA.map((d) => d.osid)).toEqual([
      'op:bar:alpha',
      'op:bar:bravo',
      'op:bar:mike',
      'op:bar:zulu',
    ]);

    // Byte-equivalent across two builds (same content, same order).
    expect(JSON.stringify(dataA)).toBe(JSON.stringify(dataB));
  });

  // -------------------------------------------------------------------------
  // LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION (T5..T8)
  //
  // Path A: deterministic deck.gl layer-descriptor validation. The layer
  // descriptor is a deterministic function of input data — we can assert
  // visual semantics (color, alpha, data reference, layer id) without
  // running a headless renderer.
  // -------------------------------------------------------------------------

  it('T5 layer-descriptor: PolygonLayer carries the expected id, data ref, and faction-neutral RGB + tier alpha', () => {
    const polygons = makeFC(['op:foo:a', 'op:foo:b', 'op:foo:c']);
    const seed = makeSeed([
      ['op:foo:a', 5],   // faint  → alpha 0.05 → round(0.05*255) = 13
      ['op:foo:b', 25],  // mid    → alpha 0.15 → round(0.15*255) = 38
      ['op:foo:c', 75],  // wound  → alpha 0.30 → round(0.30*255) = 77
    ]);
    const data = buildOsidDamageData(seed, polygons);
    const layer = buildOsidDamageOverlay(data);

    // Identity / data reference: the layer's data MUST be the exact array we
    // passed in (no defensive clone — clones would defeat byte-stability and
    // re-render gating in deck.gl).
    expect(layer.id).toBe('osid-damage-overlay');
    expect(layer.props.data).toBe(data);

    // The accessor MUST return faction-neutral dark grey RGB [20,20,24] and
    // an alpha that matches the per-OSID damage tier. We invoke the accessor
    // directly on each datum — this is the same call deck.gl performs when
    // rasterizing a feature.
    type FillColor = [number, number, number, number];
    const getFill = layer.props.getFillColor as (d: OsidDamageDatum) => FillColor;

    const expectations: Array<{ osid: string; alpha: number }> = [
      { osid: 'op:foo:a', alpha: Math.round(0.05 * 255) },
      { osid: 'op:foo:b', alpha: Math.round(0.15 * 255) },
      { osid: 'op:foo:c', alpha: Math.round(0.30 * 255) },
    ];
    for (const { osid, alpha } of expectations) {
      const datum = data.find((d) => d.osid === osid);
      expect(datum).toBeDefined();
      const rgba = getFill(datum!);
      // RGB is the faction-neutral dark grey; alpha is the tier value.
      expect(rgba[0]).toBe(20);
      expect(rgba[1]).toBe(20);
      expect(rgba[2]).toBe(24);
      expect(rgba[3]).toBe(alpha);
    }

    // Stroke off, fill on, not pickable, not extruded — the renderer is a
    // pure overlay and must not intercept clicks or contribute z-fighting.
    expect(layer.props.stroked).toBe(false);
    expect(layer.props.filled).toBe(true);
    expect(layer.props.extruded).toBe(false);
    expect(layer.props.pickable).toBe(false);
  });

  it('T6 no-faction-mutation: layer fill is invariant to faction props on the polygon feature', () => {
    const polygonsRBiH = makeFC(['op:foo:x']);
    polygonsRBiH.features[0].properties = {
      ...(polygonsRBiH.features[0].properties ?? {}),
      osid: 'op:foo:x',
      faction: 'RBiH',
      // A faction stroke color the scar layer must NEVER read.
      stroke_color_rgb: [0, 200, 0],
    };

    const polygonsRS: FeatureCollection = {
      type: 'FeatureCollection',
      features: polygonsRBiH.features.map((f) => ({
        ...f,
        properties: {
          ...(f.properties ?? {}),
          faction: 'RS',
          stroke_color_rgb: [200, 0, 0],
        },
      })),
    };

    const seed = makeSeed([['op:foo:x', 60]]);

    const dataR = buildOsidDamageData(seed, polygonsRBiH);
    const dataS = buildOsidDamageData(seed, polygonsRS);
    const layerR = buildOsidDamageOverlay(dataR);
    const layerS = buildOsidDamageOverlay(dataS);

    type FillColor = [number, number, number, number];
    const fillR = (layerR.props.getFillColor as (d: OsidDamageDatum) => FillColor)(dataR[0]);
    const fillS = (layerS.props.getFillColor as (d: OsidDamageDatum) => FillColor)(dataS[0]);

    // Faction-neutral RGB regardless of faction prop on input feature.
    expect(fillR).toEqual([20, 20, 24, Math.round(0.30 * 255)]);
    expect(fillS).toEqual([20, 20, 24, Math.round(0.30 * 255)]);
    // Cross-faction equality: the fill is byte-identical between RBiH and RS.
    expect(fillR).toEqual(fillS);

    // The emitted datum exposes no faction-coupled fields.
    for (const d of dataR) {
      expect(Object.prototype.hasOwnProperty.call(d, 'faction')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(d, 'stroke_color_rgb')).toBe(false);
    }
  });

  it('T7 empty-graceful: empty seed yields empty data and a no-op layer (no throw)', () => {
    const polygons = makeFC(['op:foo:a', 'op:foo:b']);
    const emptySeed: OsidDamageSeed = {};

    const data = buildOsidDamageData(emptySeed, polygons);
    expect(data).toEqual([]);

    // Construction must not throw; the resulting layer carries data:[].
    const layer = buildOsidDamageOverlay(data);
    expect(layer.id).toBe('osid-damage-overlay');
    expect(layer.props.data).toEqual([]);
    expect(Array.isArray(layer.props.data)).toBe(true);
    expect((layer.props.data as readonly unknown[]).length).toBe(0);
  });

  it('T8 zero-score-skip: damage_score 0 / negative / NaN OSIDs do NOT enter the layer (territory fill preserved)', () => {
    const polygons = makeFC([
      'op:foo:zero',
      'op:foo:neg',
      'op:foo:nan',
      'op:foo:positive',
    ]);
    const seed: OsidDamageSeed = {
      'op:foo:zero': { damage_score: 0, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] },
      'op:foo:neg': { damage_score: -5, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] },
      'op:foo:nan': { damage_score: Number.NaN, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] },
      'op:foo:positive': { damage_score: 12, battles: 0, casualties_total: 0, flips: 0, displacement_spike_turns: [] },
    };

    const data = buildOsidDamageData(seed, polygons);

    // Only the positive-score OSID survives the filter; the other three are
    // skipped so the territory fill underneath them is fully preserved.
    expect(data.map((d) => d.osid)).toEqual(['op:foo:positive']);

    // Sanity: damageScoreToAlpha agrees that all three skipped scores map to
    // alpha 0 — confirming the renderer's contract that "no signal == no paint".
    expect(damageScoreToAlpha(0)).toBe(0);
    expect(damageScoreToAlpha(-5)).toBe(0);
    expect(damageScoreToAlpha(Number.NaN)).toBe(0);
  });
});

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
 * Part of LANE-NIGHTSHIFT-MAP-THAT-SCARS-RENDERER.
 */
import { describe, it, expect } from 'vitest';
import type { FeatureCollection, Polygon } from 'geojson';
import {
  buildOsidDamageData,
  damageScoreToAlpha,
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
});

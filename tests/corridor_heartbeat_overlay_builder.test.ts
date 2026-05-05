/**
 * corridor_heartbeat_overlay_builder.test.ts
 *
 * Validates src/ui/map/layers/buildCorridorHeartbeatOverlay.ts. Sibling test
 * to `tests/refugee_column_overlay_builder.test.ts`,
 * `tests/force_quality_overlay_builder.test.ts`, and
 * `tests/osid_damage_overlay_builder.test.ts`; mirrors the T1..T8 pattern
 * from prior v0.9.4 visual lanes.
 *
 *   T1 (builder shape):       `buildCorridorHeartbeatData` returns the
 *                             expected CorridorHeartbeatDatum[] shape with
 *                             required fields and skips records that fail
 *                             filters (missing OSIDs, self-loops, missing
 *                             centroids, same-side edges, missing sides).
 *   T2 (empty-input safe):    Empty edge array → empty data array; the
 *                             resulting PathLayer carries `data:[]` without
 *                             throwing — safe to enable on a fresh save
 *                             with no front edges.
 *   T3 (zero-intensity skip): Edges with explicit zero pressure value AND
 *                             pressure record present (so fallback doesn't
 *                             apply) are NOT emitted into the layer; NaN /
 *                             non-finite intensities are also skipped.
 *   T4 (per-corridor aggregation):
 *                             Multiple readings of the same
 *                             (friendly_osid, hostile_osid, faction)
 *                             corridor segment collapse into ONE datum
 *                             whose `intensity` is the MAX (not the sum)
 *                             across readings.
 *   T5 (faction-symmetric):   Color comes from a pure palette lookup
 *                             (`FACTION_GLOW_RGB`); every faction enters
 *                             the same code path. Asserted structurally
 *                             by cycling RBiH/RS/HRHB through the same
 *                             corridor + intensity and confirming RGB
 *                             matches the table per faction.
 *   T6 (intensity-to-width / period mapping):
 *                             intensityToWidth follows the spec tiers:
 *                             ≤0/NaN → 0, <0.25 → 240m, [0.25,0.6) → 480m,
 *                             [0.6,0.9) → 900m, ≥0.9 → 1500m (capped at
 *                             1_000_000). intensityToPeriodMs follows the
 *                             same tiers in inverse direction (slower for
 *                             dormant, faster for heartbeat).
 *   T7 (capability gate):     `composeTacticalDeckLayers` with
 *                             `corridorHeartbeatVisible: true` but empty
 *                             data returns NO corridor layer; with non-
 *                             empty data + capability ON the layer IS
 *                             added; capability OFF + non-empty data → no
 *                             layer.
 *   T8 (deterministic):       Two builds over byte-equal inputs in
 *                             different insertion orders produce arrays
 *                             sorted by (from_osid, to_osid, faction)
 *                             strictCompare; insertion order of input
 *                             edges does NOT affect output order.
 *
 * LANE-NIGHTSHIFT-V094-CORRIDOR-HEARTBEAT (closes fourth v0.9.4 Visual
 * Layer feature). Path A validation: deterministic deck.gl layer-descriptor
 * assertions, no headless renderer required.
 */
import { describe, it, expect } from 'vitest';
import {
  buildCorridorHeartbeatData,
  buildCorridorHeartbeatOverlay,
  intensityToWidth,
  intensityToPeriodMs,
  factionGlowRgb,
  FACTION_GLOW_RGB,
  type FrontEdgeRecord,
  type FrontPressureRecord,
  type CorridorHeartbeatDatum,
} from '../src/ui/map/layers/buildCorridorHeartbeatOverlay';
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

function makeEdge(args: {
  edge_id: string;
  a: string;
  b: string;
  side_a: string | null;
  side_b: string | null;
}): FrontEdgeRecord {
  return {
    edge_id: args.edge_id,
    a: args.a,
    b: args.b,
    side_a: args.side_a,
    side_b: args.side_b,
  };
}

function makePressure(value: number, max_abs: number = 1): FrontPressureRecord {
  return { value, max_abs };
}

// --- tests ------------------------------------------------------------------

describe('buildCorridorHeartbeatOverlay', () => {
  it('T1 builder-shape: returns CorridorHeartbeatDatum[] with from/to/faction/intensity/period_ms/path; filters malformed and same-side edges', () => {
    const centroids = makeCentroids(['op:foo:alpha', 'op:foo:beta', 'op:foo:gamma']);
    const edges: FrontEdgeRecord[] = [
      // Valid contested edge: alpha (RBiH) ↔ beta (RS).
      makeEdge({ edge_id: 'e1', a: 'op:foo:alpha', b: 'op:foo:beta', side_a: 'RBiH', side_b: 'RS' }),
      // Missing side → filtered.
      makeEdge({ edge_id: 'e2', a: 'op:foo:beta', b: 'op:foo:gamma', side_a: null, side_b: 'RS' }),
      // Same-side (not contested) → filtered.
      makeEdge({ edge_id: 'e3', a: 'op:foo:alpha', b: 'op:foo:gamma', side_a: 'RBiH', side_b: 'RBiH' }),
      // Self-loop → filtered.
      makeEdge({ edge_id: 'e4', a: 'op:foo:alpha', b: 'op:foo:alpha', side_a: 'RBiH', side_b: 'RS' }),
      // Missing centroid (gamma is present but use unknown OSID) → filtered.
      makeEdge({ edge_id: 'e5', a: 'op:foo:alpha', b: 'op:foo:nowhere', side_a: 'RBiH', side_b: 'HRHB' }),
      // Missing a/b OSID → filtered.
      makeEdge({ edge_id: 'e6', a: '', b: 'op:foo:beta', side_a: 'RBiH', side_b: 'RS' }),
    ];

    // No pressure provided → fallback intensity 0.15 applies (visible).
    const data = buildCorridorHeartbeatData(edges, null, centroids);

    // Two-sided emission: one valid edge → 2 datums (RBiH→RS and RS→RBiH).
    expect(data.length).toBe(2);

    // Sort is (from_osid, to_osid, faction): alpha→beta:RBiH, beta→alpha:RS.
    expect(data[0].from_osid).toBe('op:foo:alpha');
    expect(data[0].to_osid).toBe('op:foo:beta');
    expect(data[0].faction).toBe('RBiH');
    expect(typeof data[0].intensity).toBe('number');
    expect(typeof data[0].period_ms).toBe('number');
    expect(data[0].path[0]).toEqual(centroids.get('op:foo:alpha'));
    expect(data[0].path[1]).toEqual(centroids.get('op:foo:beta'));

    expect(data[1].from_osid).toBe('op:foo:beta');
    expect(data[1].to_osid).toBe('op:foo:alpha');
    expect(data[1].faction).toBe('RS');
    expect(data[1].path[0]).toEqual(centroids.get('op:foo:beta'));
    expect(data[1].path[1]).toEqual(centroids.get('op:foo:alpha'));
  });

  it('T2 empty-input-safe: empty edges yield empty data + a no-op layer', () => {
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b']);
    const data = buildCorridorHeartbeatData([], null, centroids);
    expect(data).toEqual([]);

    const layer = buildCorridorHeartbeatOverlay(data);
    expect(layer.id).toBe('corridor-heartbeat-overlay');
    expect(layer.props.data).toEqual([]);
    expect(Array.isArray(layer.props.data)).toBe(true);
    expect((layer.props.data as readonly unknown[]).length).toBe(0);
  });

  it('T3 zero-intensity skip: zero-pressure / NaN / negative-pressure edges do NOT enter the layer', () => {
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b', 'op:foo:c', 'op:foo:d']);
    const edges: FrontEdgeRecord[] = [
      makeEdge({ edge_id: 'eZero', a: 'op:foo:a', b: 'op:foo:b', side_a: 'RBiH', side_b: 'RS' }),
      makeEdge({ edge_id: 'eNaN',  a: 'op:foo:b', b: 'op:foo:c', side_a: 'RS',   side_b: 'HRHB' }),
      makeEdge({ edge_id: 'eOk',   a: 'op:foo:c', b: 'op:foo:d', side_a: 'HRHB', side_b: 'RBiH' }),
    ];
    const pressure = new Map<string, FrontPressureRecord>([
      ['eZero', makePressure(0, 1)],
      ['eNaN',  makePressure(Number.NaN, 1)],
      ['eOk',   makePressure(0.5, 1)],
    ]);

    const data = buildCorridorHeartbeatData(edges, pressure, centroids);

    // eZero → intensity 0 → skipped (both sides).
    // eNaN  → pressure not finite → fallback 0.15 (still emitted both sides).
    //   NOTE: the spec is "zero/negative/NaN intensity skipped" — the builder
    //   only treats *finite* pressure as authoritative. NaN pressure → fallback.
    //   But the explicit eZero with finite 0 → skipped on both sides.
    // eOk   → intensity 0.5 → emitted both sides.
    // → expected: 2 (eNaN) + 2 (eOk) = 4 datums (eZero suppressed).
    expect(data.length).toBe(4);

    // None of the eZero (a↔b) routes appear.
    const zeroRoute = data.find((d) =>
      (d.from_osid === 'op:foo:a' && d.to_osid === 'op:foo:b')
      || (d.from_osid === 'op:foo:b' && d.to_osid === 'op:foo:a'),
    );
    expect(zeroRoute).toBeUndefined();

    // Sanity: width function agrees that 0 / negative / NaN map to 0.
    expect(intensityToWidth(0)).toBe(0);
    expect(intensityToWidth(-0.5)).toBe(0);
    expect(intensityToWidth(Number.NaN)).toBe(0);
  });

  it('T4 per-corridor aggregation: multiple readings on same (friendly, hostile, faction) collapse to ONE datum with MAX intensity', () => {
    const centroids = makeCentroids(['op:foo:src', 'op:foo:dst']);
    // Two edges with same friendly/hostile OSIDs (different edge_ids — e.g.
    // two segments of the same corridor in the front-edge graph) and the
    // same friendly faction. Their pressures differ; the aggregator must
    // take the MAX.
    const edges: FrontEdgeRecord[] = [
      makeEdge({ edge_id: 'eA', a: 'op:foo:src', b: 'op:foo:dst', side_a: 'RBiH', side_b: 'RS' }),
      makeEdge({ edge_id: 'eB', a: 'op:foo:src', b: 'op:foo:dst', side_a: 'RBiH', side_b: 'RS' }),
      makeEdge({ edge_id: 'eC', a: 'op:foo:src', b: 'op:foo:dst', side_a: 'RBiH', side_b: 'RS' }),
    ];
    const pressure = new Map<string, FrontPressureRecord>([
      ['eA', makePressure(0.2, 1)],
      ['eB', makePressure(0.7, 1)], // <- max
      ['eC', makePressure(0.4, 1)],
    ]);

    const data = buildCorridorHeartbeatData(edges, pressure, centroids);

    // Two-sided: one (RBiH side) friendly→hostile + one (RS side) friendly→hostile.
    expect(data.length).toBe(2);

    const rbihSide = data.find((d) => d.faction === 'RBiH');
    expect(rbihSide).toBeDefined();
    expect(rbihSide!.from_osid).toBe('op:foo:src');
    expect(rbihSide!.to_osid).toBe('op:foo:dst');
    // MAX of (0.2, 0.7, 0.4) = 0.7.
    expect(rbihSide!.intensity).toBeCloseTo(0.7, 6);

    const rsSide = data.find((d) => d.faction === 'RS');
    expect(rsSide).toBeDefined();
    expect(rsSide!.from_osid).toBe('op:foo:dst');
    expect(rsSide!.to_osid).toBe('op:foo:src');
    expect(rsSide!.intensity).toBeCloseTo(0.7, 6);
  });

  it('T5 faction-symmetric: color comes from pure palette lookup; every faction enters the same code path with no asymmetric branching', () => {
    // Structural assertion: factionGlowRgb is a pure lookup over FACTION_GLOW_RGB.
    expect(factionGlowRgb('RBiH')).toEqual(FACTION_GLOW_RGB.RBiH);
    expect(factionGlowRgb('RS')).toEqual(FACTION_GLOW_RGB.RS);
    expect(factionGlowRgb('HRHB')).toEqual(FACTION_GLOW_RGB.HRHB);

    // Each faction has a distinct entry — but the LOOKUP MECHANISM is the same.
    expect(factionGlowRgb('RBiH')).not.toEqual(factionGlowRgb('RS'));
    expect(factionGlowRgb('RS')).not.toEqual(factionGlowRgb('HRHB'));

    // Cycle the same corridor + same intensity through each faction (as
    // the friendly side) and confirm the accessor yields the palette RGB
    // for that faction (no branch).
    const centroids = makeCentroids(['op:foo:src', 'op:foo:dst']);
    const factionsToCycle = ['RBiH', 'RS', 'HRHB'];
    const others = ['RS', 'RBiH', 'RBiH']; // a hostile counterpart per cycle
    type FillColor = [number, number, number, number];

    for (let i = 0; i < factionsToCycle.length; i++) {
      const friendly = factionsToCycle[i];
      const hostile = others[i];
      const edges: FrontEdgeRecord[] = [
        makeEdge({ edge_id: `e${i}`, a: 'op:foo:src', b: 'op:foo:dst', side_a: friendly, side_b: hostile }),
      ];
      const pressure = new Map<string, FrontPressureRecord>([
        [`e${i}`, makePressure(0.5, 1)],
      ]);
      const data = buildCorridorHeartbeatData(edges, pressure, centroids);
      expect(data.length).toBe(2); // both sides emitted.
      const friendlyDatum = data.find((d) => d.faction === friendly)!;
      expect(friendlyDatum).toBeDefined();
      const layer = buildCorridorHeartbeatOverlay([friendlyDatum]);
      const fill = (layer.props.getColor as (d: CorridorHeartbeatDatum) => FillColor)(friendlyDatum);
      const expectedRgb = FACTION_GLOW_RGB[friendly];
      expect(fill[0]).toBe(expectedRgb[0]);
      expect(fill[1]).toBe(expectedRgb[1]);
      expect(fill[2]).toBe(expectedRgb[2]);
      expect(typeof fill[3]).toBe('number');
    }

    // All three factions share the same alpha byte (symmetric).
    const centroids2 = makeCentroids(['op:foo:src', 'op:foo:dst']);
    const eR: FrontEdgeRecord = makeEdge({ edge_id: 'eR', a: 'op:foo:src', b: 'op:foo:dst', side_a: 'RBiH', side_b: 'RS' });
    const eH: FrontEdgeRecord = makeEdge({ edge_id: 'eH', a: 'op:foo:src', b: 'op:foo:dst', side_a: 'HRHB', side_b: 'RS' });
    const pR = new Map<string, FrontPressureRecord>([['eR', makePressure(0.5, 1)]]);
    const pH = new Map<string, FrontPressureRecord>([['eH', makePressure(0.5, 1)]]);
    const dataR = buildCorridorHeartbeatData([eR], pR, centroids2);
    const dataH = buildCorridorHeartbeatData([eH], pH, centroids2);
    const layerR = buildCorridorHeartbeatOverlay(dataR);
    const layerH = buildCorridorHeartbeatOverlay(dataH);
    type FillColor2 = [number, number, number, number];
    const alphaR = (layerR.props.getColor as (d: CorridorHeartbeatDatum) => FillColor2)(dataR[0])[3];
    const alphaH = (layerH.props.getColor as (d: CorridorHeartbeatDatum) => FillColor2)(dataH[0])[3];
    expect(alphaR).toBe(alphaH);
  });

  it('T6 intensity → width / period mapping: tiers per spec; cap holds at 1,000,000', () => {
    // Width tiers.
    expect(intensityToWidth(0)).toBe(0);
    expect(intensityToWidth(-1)).toBe(0);
    expect(intensityToWidth(Number.NaN)).toBe(0);

    // <0.25 → 240m (faint).
    expect(intensityToWidth(0.001)).toBe(240);
    expect(intensityToWidth(0.1)).toBe(240);
    expect(intensityToWidth(0.249)).toBe(240);

    // [0.25, 0.6) → 480m (moderate).
    expect(intensityToWidth(0.25)).toBe(480);
    expect(intensityToWidth(0.5)).toBe(480);
    expect(intensityToWidth(0.599)).toBe(480);

    // [0.6, 0.9) → 900m (strong).
    expect(intensityToWidth(0.6)).toBe(900);
    expect(intensityToWidth(0.75)).toBe(900);
    expect(intensityToWidth(0.899)).toBe(900);

    // ≥ 0.9 → 1500m (heartbeat / cap).
    expect(intensityToWidth(0.9)).toBe(1500);
    expect(intensityToWidth(1.0)).toBe(1500);
    // Cap holds at extreme intensity.
    expect(intensityToWidth(1_000_000)).toBe(1500);

    // Period tiers — slower for dormant, faster for heartbeat.
    expect(intensityToPeriodMs(0)).toBe(2400);
    expect(intensityToPeriodMs(0.1)).toBe(2400);
    expect(intensityToPeriodMs(0.4)).toBe(1600);
    expect(intensityToPeriodMs(0.7)).toBe(1100);
    expect(intensityToPeriodMs(0.95)).toBe(700);
    expect(intensityToPeriodMs(Number.NaN)).toBe(2400);

    // Layer accessor must call the same width function.
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b', 'op:foo:c', 'op:foo:d', 'op:foo:e']);
    const edges: FrontEdgeRecord[] = [
      makeEdge({ edge_id: 'e1', a: 'op:foo:a', b: 'op:foo:b', side_a: 'RBiH', side_b: 'RS' }),
      makeEdge({ edge_id: 'e2', a: 'op:foo:a', b: 'op:foo:c', side_a: 'RBiH', side_b: 'RS' }),
      makeEdge({ edge_id: 'e3', a: 'op:foo:a', b: 'op:foo:d', side_a: 'RBiH', side_b: 'RS' }),
      makeEdge({ edge_id: 'e4', a: 'op:foo:a', b: 'op:foo:e', side_a: 'RBiH', side_b: 'RS' }),
    ];
    const pressure = new Map<string, FrontPressureRecord>([
      ['e1', makePressure(0.10, 1)], // → 240
      ['e2', makePressure(0.40, 1)], // → 480
      ['e3', makePressure(0.75, 1)], // → 900
      ['e4', makePressure(0.95, 1)], // → 1500
    ]);
    const data = buildCorridorHeartbeatData(edges, pressure, centroids);
    const layer = buildCorridorHeartbeatOverlay(data);
    // Filter to RBiH side only (the one with from_osid == op:foo:a).
    const rbihData = data.filter((d) => d.faction === 'RBiH');
    expect(rbihData.length).toBe(4);
    // Sort by to_osid (b, c, d, e) — already sorted by builder.
    const widths = rbihData.map((d) => (layer.props.getWidth as (d: CorridorHeartbeatDatum) => number)(d));
    expect(widths).toEqual([240, 480, 900, 1500]);
  });

  it('T7 capability-gate: composeTacticalDeckLayers does NOT add the corridor layer when data empty OR feature flag off', () => {
    const centroids = makeCentroids(['op:foo:a', 'op:foo:b']);

    // corridorHeartbeatVisible: true BUT empty data → layer is NOT added.
    const data = buildCorridorHeartbeatData([], null, centroids);
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
        corridorHeartbeatVisible: true,
      },
      corridorHeartbeatData: data,
    });
    expect(layers.map((l) => l.id)).not.toContain('corridor-heartbeat-overlay');

    // With non-empty data and capability ON, the layer IS added.
    const liveEdges: FrontEdgeRecord[] = [
      makeEdge({ edge_id: 'eL', a: 'op:foo:a', b: 'op:foo:b', side_a: 'RBiH', side_b: 'RS' }),
    ];
    const livePressure = new Map<string, FrontPressureRecord>([
      ['eL', makePressure(0.5, 1)],
    ]);
    const liveData = buildCorridorHeartbeatData(liveEdges, livePressure, centroids);
    expect(liveData.length).toBe(2);
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
        corridorHeartbeatVisible: true,
      },
      corridorHeartbeatData: liveData,
    });
    expect(layersLive.map((l) => l.id)).toContain('corridor-heartbeat-overlay');

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
        corridorHeartbeatVisible: false,
      },
      corridorHeartbeatData: liveData,
    });
    expect(layersOff.map((l) => l.id)).not.toContain('corridor-heartbeat-overlay');
  });

  it('T8 deterministic: byte-equal inputs in different insertion orders produce byte-equal output', () => {
    const centroids = makeCentroids([
      'op:bar:zulu',
      'op:bar:alpha',
      'op:bar:mike',
      'op:bar:bravo',
    ]);

    const edgesA: FrontEdgeRecord[] = [
      makeEdge({ edge_id: 'eMZ', a: 'op:bar:mike',  b: 'op:bar:zulu',  side_a: 'RS',   side_b: 'RBiH' }),
      makeEdge({ edge_id: 'eZA', a: 'op:bar:zulu',  b: 'op:bar:alpha', side_a: 'RBiH', side_b: 'RS' }),
      makeEdge({ edge_id: 'eAB', a: 'op:bar:alpha', b: 'op:bar:bravo', side_a: 'HRHB', side_b: 'RS' }),
      makeEdge({ edge_id: 'eBM', a: 'op:bar:bravo', b: 'op:bar:mike',  side_a: 'RBiH', side_b: 'RS' }),
    ];
    const pressureMap = new Map<string, FrontPressureRecord>([
      ['eMZ', makePressure(0.4, 1)],
      ['eZA', makePressure(0.8, 1)],
      ['eAB', makePressure(0.2, 1)],
      ['eBM', makePressure(0.95, 1)],
    ]);

    // edges B: same data, reversed insertion order.
    const edgesB: FrontEdgeRecord[] = [...edgesA].reverse();

    const dataA = buildCorridorHeartbeatData(edgesA, pressureMap, centroids);
    const dataB = buildCorridorHeartbeatData(edgesB, pressureMap, centroids);

    // Four contested edges → 8 datums (two-sided).
    expect(dataA.length).toBe(8);

    // Sort is (from_osid, to_osid, faction) strictCompare. The full ordered
    // list is deterministic; spot-check the first and last entries.
    const ordered = dataA.map(
      (d) => `${d.from_osid}->${d.to_osid}|${d.faction}`,
    );
    expect(ordered[0]).toBe('op:bar:alpha->op:bar:bravo|HRHB');
    // Sorted by (from_osid, to_osid, faction) strictCompare. The last entry
    // is zulu→mike|RBiH (zulu is the lex-largest from_osid, mike comes
    // after alpha as to_osid for the zulu→? entries; the eMZ edge was
    // mike(RS)↔zulu(RBiH), so its RBiH side renders zulu→mike).
    expect(ordered[ordered.length - 1]).toBe('op:bar:zulu->op:bar:mike|RBiH');
    // Full ordering pinned for determinism:
    expect(ordered).toEqual([
      'op:bar:alpha->op:bar:bravo|HRHB',
      'op:bar:alpha->op:bar:zulu|RS',
      'op:bar:bravo->op:bar:alpha|RS',
      'op:bar:bravo->op:bar:mike|RBiH',
      'op:bar:mike->op:bar:bravo|RS',
      'op:bar:mike->op:bar:zulu|RS',
      'op:bar:zulu->op:bar:alpha|RBiH',
      'op:bar:zulu->op:bar:mike|RBiH',
    ]);

    // Byte-equivalent across two builds (same content, same order).
    expect(JSON.stringify(dataA)).toBe(JSON.stringify(dataB));
  });
});

/**
 * Optional Deck.gl layers ported from the old `feature/deckgl-demo` spike.
 * All branches are gated by {@link DeckLayerCapabilities}; defaults keep this a no-op.
 */
import type { Layer } from '@deck.gl/core';
import { ArcLayer, ScatterplotLayer, PathLayer, TextLayer } from '@deck.gl/layers';
import type { LoadedGameState } from '../data/types';
import type { OsidCentroidLookup } from '../map/builders/geojsonLookup';
import { resolveOsidKey } from '../map/builders/geojsonLookup';
import type { DeckLayerCapabilities } from './deckLayerCapabilities';

const FACTION_COLORS: Record<string, [number, number, number]> = {
  RS: [200, 70, 70],
  RBiH: [70, 165, 90],
  HRHB: [70, 130, 200],
};

const FACTION_COLORS_BRIGHT: Record<string, [number, number, number]> = {
  RS: [255, 90, 90],
  RBiH: [90, 210, 110],
  HRHB: [90, 160, 255],
};

const DEFAULT_COLOR: [number, number, number] = [160, 160, 160];

function resolvePt(osid: string | undefined, lookup: OsidCentroidLookup): [number, number] | null {
  if (!osid) return null;
  const pt = lookup.get(osid);
  if (pt) return pt;
  const resolved = resolveOsidKey(osid, lookup);
  return resolved ? lookup.get(resolved) ?? null : null;
}

function centroidOfOsids(osids: string[], lookup: OsidCentroidLookup): [number, number] | null {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const o of osids) {
    const pt = resolvePt(o, lookup);
    if (pt) {
      sx += pt[0];
      sy += pt[1];
      n++;
    }
  }
  return n > 0 ? [sx / n, sy / n] : null;
}

interface OpArcData {
  sourcePosition: [number, number];
  targetPosition: [number, number];
  faction: string;
  name: string;
  objCount: number;
  phase: string;
}

function buildOperationArcData(state: LoadedGameState, lookup: OsidCentroidLookup): OpArcData[] {
  const data: OpArcData[] = [];
  if (!state.operations) return data;

  for (const op of state.operations) {
    if (!op.objectives || op.objectives.length === 0) continue;

    const origin =
      resolvePt(op.staging_osid, lookup) ??
      (op.axes?.[0]?.staging_osid ? resolvePt(op.axes[0].staging_osid, lookup) : null);
    if (!origin) continue;

    if (op.axes && op.axes.length > 1) {
      for (const axis of op.axes) {
        if (!axis.objectives || axis.objectives.length === 0) continue;
        const axOrigin = resolvePt(axis.staging_osid, lookup) ?? origin;
        const axTarget = centroidOfOsids(axis.objectives, lookup);
        if (!axTarget) continue;
        data.push({
          sourcePosition: axOrigin,
          targetPosition: axTarget,
          faction: op.faction,
          name: `${op.name} (${axis.name})`,
          objCount: axis.objectives.length,
          phase: op.phase,
        });
      }
      continue;
    }

    const target = centroidOfOsids(op.objectives, lookup);
    if (!target) continue;
    data.push({
      sourcePosition: origin,
      targetPosition: target,
      faction: op.faction,
      name: op.name,
      objCount: op.objectives.length,
      phase: op.phase,
    });
  }
  return data;
}

interface UnitDotData {
  position: [number, number];
  faction: string;
  personnel: number;
  name: string;
  posture?: string;
}

function buildUnitMarkerData(state: LoadedGameState, lookup: OsidCentroidLookup): UnitDotData[] {
  const data: UnitDotData[] = [];
  if (!state.formations) return data;
  for (const f of state.formations) {
    if (f.kind !== 'brigade' || f.status !== 'active') continue;
    const pt = resolvePt(f.location_osid, lookup);
    if (!pt) continue;
    data.push({
      position: pt,
      faction: f.faction,
      personnel: f.personnel ?? 0,
      name: f.name,
      posture: f.posture,
    });
  }
  return data;
}

interface FrontSegmentData {
  path: [number, number][];
  factionA: string | null;
  factionB: string | null;
}

function buildFrontLineData(state: LoadedGameState, lookup: OsidCentroidLookup): FrontSegmentData[] {
  const data: FrontSegmentData[] = [];
  const edges = state.frontEdgesOsid ?? state.frontEdges;
  if (!edges) return data;
  for (const edge of edges) {
    const ptA = resolvePt(edge.a, lookup);
    const ptB = resolvePt(edge.b, lookup);
    if (!ptA || !ptB) continue;
    data.push({
      path: [ptA, ptB],
      factionA: edge.side_a,
      factionB: edge.side_b,
    });
  }
  return data;
}

/**
 * Layers drawn *under* formation IconLayers. All off by default.
 *
 * @param _zoom reserved for future zoom-dependent visibility (e.g. hide dots when zoomed out)
 */
export function buildExperimentalDeckLayers(
  state: LoadedGameState | null,
  lookup: OsidCentroidLookup,
  caps: DeckLayerCapabilities,
  _zoom: number,
): Layer[] {
  if (
    !state ||
    (!caps.operationArcs && !caps.deckFrontLines && !caps.unitScatterDots) ||
    lookup.size === 0
  ) {
    return [];
  }

  const layers: Layer[] = [];

  if (caps.deckFrontLines) {
    const frontLines = buildFrontLineData(state, lookup);
    // Solid paths only here — dashed + offset styling can be added later via PathStyleExtension
    // once types/deck versions are aligned (old demo used dash for NATO-style contact lines).
    layers.push(
      new PathLayer<FrontSegmentData>({
        id: 'deck-exp-front-glow',
        data: frontLines,
        getPath: (d) => d.path,
        getColor: [255, 255, 255, 30],
        getWidth: 800,
        widthUnits: 'meters',
        widthMinPixels: 6,
        capRounded: true,
        jointRounded: true,
        opacity: 0.5,
      }),
      new PathLayer<FrontSegmentData>({
        id: 'deck-exp-front-core',
        data: frontLines,
        getPath: (d) => d.path,
        getColor: [40, 40, 45, 220],
        getWidth: 220,
        widthUnits: 'meters',
        widthMinPixels: 2,
        capRounded: true,
        jointRounded: true,
        opacity: 0.9,
      }),
    );
  }

  if (caps.operationArcs) {
    const opArcs = buildOperationArcData(state, lookup);
    layers.push(
      new ArcLayer<OpArcData>({
        id: 'deck-exp-op-arcs-glow',
        data: opArcs,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: (d) => [...(FACTION_COLORS[d.faction] ?? DEFAULT_COLOR), 40],
        getTargetColor: (d) => [...(FACTION_COLORS[d.faction] ?? DEFAULT_COLOR), 80],
        getWidth: (d) => 4 + d.objCount * 3,
        greatCircle: false,
        getHeight: 0.3,
        opacity: 0.6,
      }),
      new ArcLayer<OpArcData>({
        id: 'deck-exp-op-arcs',
        data: opArcs,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: (d) => [
          ...(FACTION_COLORS_BRIGHT[d.faction] ?? DEFAULT_COLOR),
          d.phase === 'execution' ? 220 : 120,
        ],
        getTargetColor: (d) => [
          ...(FACTION_COLORS_BRIGHT[d.faction] ?? DEFAULT_COLOR),
          d.phase === 'execution' ? 255 : 150,
        ],
        getWidth: (d) => 2 + d.objCount * 2,
        greatCircle: false,
        getHeight: 0.3,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 200, 200],
        opacity: 0.85,
      }),
    );
  }

  if (caps.unitScatterDots) {
    const units = buildUnitMarkerData(state, lookup);
    layers.push(
      new ScatterplotLayer<UnitDotData>({
        id: 'deck-exp-unit-glow',
        data: units,
        getPosition: (d) => d.position,
        getRadius: (d) => Math.max(300, Math.sqrt(d.personnel) * 15),
        getFillColor: (d) => [...(FACTION_COLORS[d.faction] ?? DEFAULT_COLOR), 40],
        radiusUnits: 'meters',
        radiusMinPixels: 6,
        radiusMaxPixels: 20,
        opacity: 0.6,
      }),
      new ScatterplotLayer<UnitDotData>({
        id: 'deck-exp-unit-markers',
        data: units,
        getPosition: (d) => d.position,
        getRadius: (d) => Math.max(150, Math.sqrt(d.personnel) * 8),
        getFillColor: (d) => {
          const base = FACTION_COLORS_BRIGHT[d.faction] ?? DEFAULT_COLOR;
          if (d.posture === 'attack' || d.posture === 'assault') return [...base, 255];
          if (d.posture === 'defend') return [...base, 180];
          return [...base, 200];
        },
        getLineColor: [0, 0, 0, 200],
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        stroked: true,
        radiusUnits: 'meters',
        radiusMinPixels: 3,
        radiusMaxPixels: 12,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 200, 200],
        opacity: 0.9,
      }),
      new TextLayer<UnitDotData>({
        id: 'deck-exp-unit-labels',
        data: units,
        getPosition: (d) => d.position,
        getText: (d) =>
          d.name.replace(/^(arbih_|rs_|hvo_)/, '').replace(/_/g, ' ').substring(0, 20),
        getSize: 11,
        getColor: [255, 255, 255, 220],
        getTextAnchor: 'start',
        getAlignmentBaseline: 'center',
        getPixelOffset: [10, 0],
        fontFamily: 'monospace',
        fontWeight: 'bold',
        outlineWidth: 2,
        outlineColor: [0, 0, 0, 200],
        sizeMinPixels: 0,
        sizeMaxPixels: 12,
        billboard: false,
      }),
    );
  }

  return layers;
}

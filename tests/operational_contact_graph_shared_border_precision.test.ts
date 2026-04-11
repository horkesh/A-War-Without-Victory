import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

const GEO_PATH = resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
const GRAPH_PATH = resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_contact_graph.json');
const hasFixtures = existsSync(GEO_PATH) && existsSync(GRAPH_PATH);

type OsidFeatureCollection = FeatureCollection<Polygon | MultiPolygon, { osid: string }>;
type ContactEdge = { a: string; b: string; min_dist?: number; shared_segments?: number };

function getOuterRings(feature: { geometry: Polygon | MultiPolygon }): number[][][] {
  return feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
}

function coordKey(coord: number[]): string {
  return `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
}

function edgeKey(a: number[], b: number[]): string {
  const ak = coordKey(a);
  const bk = coordKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

describe.skipIf(!hasFixtures)('operational contact graph shared-border precision', () => {
  const geo = JSON.parse(readFileSync(GEO_PATH, 'utf8')) as OsidFeatureCollection;
  const graph = JSON.parse(readFileSync(GRAPH_PATH, 'utf8')) as { edges: ContactEdge[] };

  it('does not downgrade Donje Zesce and Mazlina to point-only contact when their polygons share boundary edges', () => {
    const donje = geo.features.find((feature) => feature.properties.osid === 'op:foca:donje_zesce');
    const mazlina = geo.features.find((feature) => feature.properties.osid === 'op:foca:mazlina');

    expect(donje).toBeDefined();
    expect(mazlina).toBeDefined();

    const donjeEdges = new Set<string>();
    for (const ring of getOuterRings(donje!)) {
      for (let i = 1; i < ring.length; i++) donjeEdges.add(edgeKey(ring[i - 1]!, ring[i]!));
    }

    const mazlinaEdges = new Set<string>();
    for (const ring of getOuterRings(mazlina!)) {
      for (let i = 1; i < ring.length; i++) mazlinaEdges.add(edgeKey(ring[i - 1]!, ring[i]!));
    }

    const sharedBoundaryEdgeCount = [...donjeEdges].filter((key) => mazlinaEdges.has(key)).length;
    expect(sharedBoundaryEdgeCount).toBeGreaterThan(0);

    const edge = graph.edges.find((candidate) =>
      (candidate.a === 'op:foca:donje_zesce' && candidate.b === 'op:foca:mazlina')
      || (candidate.a === 'op:foca:mazlina' && candidate.b === 'op:foca:donje_zesce'),
    );

    expect(edge).toBeDefined();
    expect(edge?.shared_segments ?? 0).toBeGreaterThan(0);
  });
});

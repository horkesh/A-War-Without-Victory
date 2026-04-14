import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildFrontEdgesHoverGeoJSON } from '../src/ui/map/map/builders/buildFrontEdgesHoverGeoJSON.js';
import { buildDisplayFrontEdgeOwnership, buildDisplayOsidAdjacency } from '../src/ui/map/map/builders/displayFrontEdgeOwnership.js';

const SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const GEO_PATH = resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
const hasFixtures = existsSync(SAVE_PATH) && existsSync(GEO_PATH);

type ControlledFeatureCollection = FeatureCollection<Polygon | MultiPolygon, { osid: string; controller: string | null }>;

function buildPolygonEdgeOwners(geo: ControlledFeatureCollection): Map<string, Set<string>> {
  const coordKey = (c: number[]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
  const edgeOwners = new Map<string, Set<string>>();
  for (const feature of geo.features) {
    const osid = feature.properties.osid;
    const rings = feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates
      : feature.geometry.coordinates.flat();
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i] as number[];
        const b = ring[i + 1] as number[];
        const keyA = coordKey(a);
        const keyB = coordKey(b);
        const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
        const owners = edgeOwners.get(edgeKey) ?? new Set<string>();
        owners.add(osid);
        edgeOwners.set(edgeKey, owners);
      }
    }
  }
  return edgeOwners;
}

describe.skipIf(!hasFixtures)('real-save front-edge display ownership', () => {
  const raw = JSON.parse(readFileSync(SAVE_PATH, 'utf8'));
  const geo = JSON.parse(readFileSync(GEO_PATH, 'utf8')) as ControlledFeatureCollection;
  const parsed = parseGameState(raw);

  it('gives every visible hover edge a sector id in the live save', () => {
    const hover = buildFrontEdgesHoverGeoJSON(
      geo,
      parsed.frontEdgesOsid ?? [],
      parsed.corpsFrontSectors ?? [],
    );

    const missing = hover.features.filter((feature) => {
      const faction = feature.properties?.faction;
      return (faction === 'RS' || faction === 'RBiH' || faction === 'HRHB')
        && !feature.properties?.sector_id;
    });

    expect(missing).toEqual([]);
  });

  it('keeps every live Donje Zesce front edge selectable from both sector sides', () => {
    const controllerMap = new Map(
      geo.features.map((feature) => [feature.properties.osid, feature.properties.controller] as const),
    );
    const displayOwnership = buildDisplayFrontEdgeOwnership(
      parsed.corpsFrontSectors ?? [],
      parsed.frontEdgesOsid ?? [],
      controllerMap,
      buildDisplayOsidAdjacency(buildPolygonEdgeOwners(geo)),
    );

    const donjeZesceEdges = (parsed.frontEdgesOsid ?? []).filter((edge) =>
      edge.edge_id.includes('op:foca:donje_zesce__') || edge.edge_id.includes('__op:foca:donje_zesce'),
    );

    expect(donjeZesceEdges.length).toBeGreaterThan(0);
    for (const edge of donjeZesceEdges) {
      const sideA = edge.side_a;
      const sideB = edge.side_b;
      expect(sideA).toBeTruthy();
      expect(sideB).toBeTruthy();
      expect(displayOwnership.sectorByEdgeAndFaction.has(`${edge.edge_id}\0${sideA}`)).toBe(true);
      expect(displayOwnership.sectorByEdgeAndFaction.has(`${edge.edge_id}\0${sideB}`)).toBe(true);
    }
  });

  it('demotes rear-only sector packets behind staffed display owners in the live save when a staffed sibling also claims the edge', () => {
    const controllerMap = new Map(
      geo.features.map((feature) => [feature.properties.osid, feature.properties.controller] as const),
    );
    const displayOwnership = buildDisplayFrontEdgeOwnership(
      parsed.corpsFrontSectors ?? [],
      parsed.frontEdgesOsid ?? [],
      controllerMap,
      buildDisplayOsidAdjacency(buildPolygonEdgeOwners(geo)),
    );

    const rearOnly = (parsed.corpsFrontSectors ?? [])
      .filter((sector) =>
        (sector.edge_ids?.length ?? 0) > 0
        && (sector.assigned_brigade_ids?.length ?? 0) === 0
        && (sector.reserve_brigade_ids?.length ?? 0) === 0
        && (sector.rear_brigade_ids?.length ?? 0) > 0,
      );

    for (const sector of rearOnly) {
      for (const edgeId of sector.edge_ids ?? []) {
        const projected = displayOwnership.sectorByEdgeAndFaction.get(`${edgeId}\0${sector.faction}`);
        expect(projected?.sector_id, `${edgeId} should project to a display owner`).toBeTruthy();

        const siblingOwners = (parsed.corpsFrontSectors ?? []).filter((entry) =>
          entry.faction === sector.faction
          && (entry.edge_ids ?? []).includes(edgeId),
        );
        const staffedSiblingExists = siblingOwners.some((entry) =>
          entry.sector_id !== sector.sector_id
          && ((entry.assigned_brigade_ids?.length ?? 0) > 0 || (entry.reserve_brigade_ids?.length ?? 0) > 0),
        );

        if (staffedSiblingExists) {
          expect(
            projected?.sector_id,
            `${edgeId} should not stay owned by rear-only packet ${sector.sector_id} when a staffed sibling exists`,
          ).not.toBe(sector.sector_id);
        }
      }
    }
  });
});

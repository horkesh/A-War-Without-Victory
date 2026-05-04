import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FeatureCollection, Polygon } from 'geojson';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildControlGeoJSON } from '../src/ui/map/map/builders/buildControlGeoJSON.js';
import { buildSectorDemarcationGeoJSON } from '../src/ui/map/map/builders/buildSectorDemarcationGeoJSON.js';
import type { CorpsFrontSectorView } from '../src/ui/map/data/types.js';

const REAL_SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const REAL_GEO_PATH = resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
const realSaveFixturesAvailable = existsSync(REAL_SAVE_PATH) && existsSync(REAL_GEO_PATH);

function rect(x0: number, y0: number, x1: number, y1: number): number[][][] {
  return [[
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ]];
}

function feature(osid: string, controller: string, coords: number[][][]): { type: 'Feature'; geometry: Polygon; properties: { osid: string; controller: string } } {
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: coords },
    properties: { osid, controller },
  };
}

function makeSector(
  sector_id: string,
  corps_id: string,
  faction: string,
  territory_osids: string[],
  front_osids: string[],
  edge_ids: string[],
): CorpsFrontSectorView {
  return {
    sector_id,
    corps_id,
    corps_name: corps_id,
    display_name: sector_id,
    faction,
    opposing_factions: ['RBiH'],
    edge_ids,
    sub_segments: [{
      sub_segment_id: `sub:${sector_id}:0`,
      friendly_osids: front_osids,
      enemy_osids: ['op:enemy:top_left', 'op:enemy:top_right'],
      edge_ids,
      length_edges: edge_ids.length,
      primary_brigade_ids: [],
    }],
    sub_segment_count: 1,
    length_edges: edge_ids.length,
    territory_osids,
    assigned_brigade_ids: [],
    reserve_brigade_ids: [],
    rear_brigade_ids: [],
    density: 0,
    threat_ratio: 0,
    defensive_power: 0,
    intel_confidence: 1,
    offensive_signs: false,
    sector_stance: 'defend',
    stance_source: 'bot',
  };
}

describe('buildSectorDemarcationGeoJSON', () => {
  it('keeps a continuous demarcation chain when only the first segment directly touches the frontline', () => {
    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        feature('op:left:top', 'RS', rect(0, 2, 1, 3)),
        feature('op:left:mid', 'RS', rect(0, 1, 1, 2)),
        feature('op:left:bot', 'RS', rect(0, 0, 1, 1)),
        feature('op:right:top', 'RS', rect(1, 2, 2, 3)),
        feature('op:right:mid', 'RS', rect(1, 1, 2, 2)),
        feature('op:right:bot', 'RS', rect(1, 0, 2, 1)),
        feature('op:enemy:top_left', 'RBiH', rect(0, 3, 1, 4)),
        feature('op:enemy:top_right', 'RBiH', rect(1, 3, 2, 4)),
      ],
    };

    const sectors: CorpsFrontSectorView[] = [
      makeSector(
        'sector:vrs_left:0',
        'vrs_left',
        'RS',
        ['op:left:top', 'op:left:mid', 'op:left:bot'],
        ['op:left:top'],
        ['op:enemy:top_left__op:left:top'],
      ),
      makeSector(
        'sector:vrs_right:0',
        'vrs_right',
        'RS',
        ['op:right:top', 'op:right:mid', 'op:right:bot'],
        ['op:right:top'],
        ['op:enemy:top_right__op:right:top'],
      ),
    ];

    const frontEdgesOsid = [
      {
        edge_id: 'op:enemy:top_left__op:left:top',
        a: 'op:enemy:top_left',
        b: 'op:left:top',
        side_a: 'RBiH',
        side_b: 'RS',
      },
      {
        edge_id: 'op:enemy:top_right__op:right:top',
        a: 'op:enemy:top_right',
        b: 'op:right:top',
        side_a: 'RBiH',
        side_b: 'RS',
      },
    ];

    const out = buildSectorDemarcationGeoJSON(geojson, sectors, frontEdgesOsid);

    expect(out.features).toHaveLength(1);
    expect(out.features[0]!.properties).toMatchObject({
      sector_id: 'sector:vrs_left:0',
      sector_a: 'sector:vrs_left:0',
      sector_b: 'sector:vrs_right:0',
    });
    const coords = out.features[0]!.geometry.coordinates;
    expect(coords[0]).toEqual([1, 0]);
    expect(coords[coords.length - 1]).toEqual([1, 3]);
    expect(coords.length).toBeGreaterThanOrEqual(2);
  });
});

// Absorbed from sector_demarcation_real_save.test.ts (Phase 3 §2 leftover)
describe.skipIf(!realSaveFixturesAvailable)('sector demarcation real-save contract', () => {
  it('renders at most one demarcation chain per sector pair in the live save', () => {
    const raw = JSON.parse(readFileSync(REAL_SAVE_PATH, 'utf8'));
    const base = JSON.parse(readFileSync(REAL_GEO_PATH, 'utf8'));
    const parsed = parseGameState(raw);
    const controlled = buildControlGeoJSON(
      base,
      parsed.controlBySettlement ?? {},
    );
    const demarcation = buildSectorDemarcationGeoJSON(
      controlled,
      parsed.corpsFrontSectors ?? [],
      parsed.frontEdgesOsid ?? [],
    );

    expect(demarcation.features.length).toBeGreaterThan(0);

    const byPair = new Map<string, number>();
    for (const feature of demarcation.features) {
      const sectorA = feature.properties?.sector_a;
      const sectorB = feature.properties?.sector_b;
      expect(sectorA).toBeTruthy();
      expect(sectorB).toBeTruthy();
      const key = `${sectorA}__${sectorB}`;
      byPair.set(key, (byPair.get(key) ?? 0) + 1);
    }

    const fragmented = [...byPair.entries()]
      .filter(([, count]) => count > 1)
      .map(([pair, count]) => ({ pair, count }));

    expect(fragmented).toEqual([]);
  });
});

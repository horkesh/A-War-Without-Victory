import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildControlGeoJSON } from '../src/ui/map/map/builders/buildControlGeoJSON.js';
import { buildSectorDemarcationGeoJSON } from '../src/ui/map/map/builders/buildSectorDemarcationGeoJSON.js';

const SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const GEO_PATH = resolve(__dirname, '..', 'data', 'derived', 'operational', 'operational_settlements.geojson');
const hasFixtures = existsSync(SAVE_PATH) && existsSync(GEO_PATH);

describe.skipIf(!hasFixtures)('sector demarcation real-save contract', () => {
  it('renders at most one demarcation chain per sector pair in the live save', () => {
    const raw = JSON.parse(readFileSync(SAVE_PATH, 'utf8'));
    const base = JSON.parse(readFileSync(GEO_PATH, 'utf8'));
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

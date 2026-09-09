import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection } from 'geojson';
import { describe, expect, it } from 'vitest';
import { buildOsidDisplayNameMap } from '../../src/ui/map/utils/osidDisplayName.js';
import { buildMunicipalityDisplayNameMap, getMunicipalityDisplayName } from '../../src/ui/map/utils/municipalityDisplayName.js';

interface OperationalMaster {
  meta: { settlement_count: number };
  settlements: Array<{ sid: string }>;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function loadJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(join(process.cwd(), ...segments), 'utf8')) as T;
}

describe('operational display-name integrity', () => {
  const geojson = loadJson<FeatureCollection>(
    'data', 'derived', 'operational', 'operational_settlements.geojson',
  );
  const master = loadJson<OperationalMaster>(
    'data', 'derived', 'operational', 'operational_initial_master.json',
  );

  it('resolves all 712 scored OSIDs through the production helper without display collisions', () => {
    const displayNames = buildOsidDisplayNameMap(geojson);
    const scoredIds = master.settlements.map((settlement) => settlement.sid);
    const scoredNames = scoredIds.map((osid) => displayNames[osid]);

    expect(master.meta.settlement_count).toBe(712);
    expect(scoredIds).toHaveLength(712);
    expect(new Set(scoredIds).size).toBe(712);
    expect(scoredNames.every((name) => typeof name === 'string' && name.length > 0)).toBe(true);
    expect(new Set(scoredNames).size).toBe(712);
    expect(scoredNames.some((name) => /\(\+\d+\)$/.test(name))).toBe(false);
    expect(displayNames['op:mostar:mostar_istok_2']).toContain('Mostar Istok');
    expect(displayNames['op:mostar:mostar_zapad_2']).toContain('Mostar Zapad');
  });

  it('builds the 110-name municipality lookup deterministically from supplied properties', () => {
    const osidProperties = Object.fromEntries(geojson.features.map((feature) => {
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      return [properties.osid, properties];
    }).filter(([osid]) => typeof osid === 'string')) as Record<string, Record<string, unknown>>;
    const municipalityNames = buildMunicipalityDisplayNameMap(osidProperties);
    const municipalityIds = Object.keys(municipalityNames);

    expect(municipalityIds).toHaveLength(110);
    expect(municipalityIds).toEqual([...municipalityIds].sort(compareStrings));
    expect(municipalityNames.vogosca).toBe('Vogošća');
    expect(municipalityNames.cajnice).toBe('Čajniče');

    for (const properties of Object.values(osidProperties)) {
      if (typeof properties.mun1990_id !== 'string' || typeof properties.mun1990_name !== 'string') continue;
      expect(municipalityNames[properties.mun1990_id]).toBe(properties.mun1990_name);
    }
  });

  it('does not reconstruct a municipality name when canonical properties are unavailable', () => {
    expect(getMunicipalityDisplayName('vogosca', {}, '—')).toBe('—');
  });
});

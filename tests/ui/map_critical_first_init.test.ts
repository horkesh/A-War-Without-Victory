import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tactical map critical-first initialization contract', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'map', 'MapContainer.tsx'),
    'utf8',
  );

  it('constructs the base map after required geography and control without optional enrichment', () => {
    const geometryStart = source.indexOf('const operationalGeometryPromise = loadOperationalSettlements()');
    const controlStart = source.indexOf('const politicalControlPromise = loadOperationalPoliticalControl()');
    const aliasesStart = source.indexOf('const sidAliasesPromise = loadSidToOsidMapping()');
    const terrainStart = source.indexOf('const terrainScalarsPromise = loadTerrainScalars()');
    const coreAwait = source.indexOf('await Promise.all([operationalGeometryPromise, politicalControlPromise])');
    const mapConstruction = source.indexOf('const map = new maplibregl.Map(');
    const aliasesAwait = source.indexOf('await sidAliasesPromise');

    expect(geometryStart).toBeGreaterThan(-1);
    expect(controlStart).toBeGreaterThan(geometryStart);
    expect(aliasesStart).toBeGreaterThan(controlStart);
    expect(terrainStart).toBeGreaterThan(aliasesStart);
    expect(coreAwait).toBeGreaterThan(terrainStart);
    expect(mapConstruction).toBeGreaterThan(coreAwait);
    expect(aliasesAwait).toBeGreaterThan(mapConstruction);
    expect(source.slice(coreAwait, mapConstruction)).not.toMatch(/loadCensusSettlements|loadOsidAdjacency|loadOsidDamageSeed/);
  });

  it('keeps exact SID aliases inside the required current-state readiness path', () => {
    const mapConstruction = source.indexOf('const map = new maplibregl.Map(');
    const aliasesAwait = source.indexOf('await sidAliasesPromise');
    const centroidCommit = source.indexOf('osidCentroidsRef.current = buildOsidCentroidLookup(geojson, sidAliasesResult.value)');
    const mapReady = source.indexOf('setMapReady(true)', centroidCommit);

    expect(aliasesAwait).toBeGreaterThan(mapConstruction);
    expect(centroidCommit).toBeGreaterThan(aliasesAwait);
    expect(mapReady).toBeGreaterThan(centroidCommit);
  });

  it('loads optional census, adjacency, terrain, and scar enrichment only at their demand points', () => {
    expect(source).toMatch(/if \(!ghostMapVisible \|\| ghostMapDataRef\.current\) return;[\s\S]*loadCensusSettlements\(\)/);
    expect(source).toMatch(/if \(mapMode !== 'defense' \|\| osidAdjacencyRef\.current\) return;[\s\S]*loadOsidAdjacency\(\)/);
    expect(source).toMatch(/terrainScalarsPromise\.then\([\s\S]*setOsidPropertiesMap/);
    expect(source).toMatch(/if \(!MAP_SCARS_FEATURE_FLAG \|\| !currentRevisionReady[\s\S]*loadOsidDamageSeed\(\)/);
    expect(source).toMatch(/console\.warn\('\[MapContainer\] Optional census enrichment failed:'/);
    expect(source).toMatch(/console\.warn\('\[MapContainer\] Optional adjacency enrichment failed:'/);
    expect(source).toMatch(/console\.warn\('\[MapContainer\] Optional terrain enrichment failed:'/);
    expect(source).toMatch(/console\.warn\('\[MapContainer\] Optional scar enrichment failed:'/);
  });
});

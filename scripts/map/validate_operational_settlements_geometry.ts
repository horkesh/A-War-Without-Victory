import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { validateOperationalSettlementsGeometry } from '../../src/map/operational_settlements_geometry_validator';

const DEFAULT_GEOJSON_PATH = resolve(process.cwd(), 'data', 'derived', 'operational', 'operational_settlements.geojson');

function main(): void {
  const geojsonPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_GEOJSON_PATH);
  if (!existsSync(geojsonPath)) {
    console.error(`[operational-geometry] Missing artifact: ${geojsonPath}`);
    process.exitCode = 1;
    return;
  }

  const collection = JSON.parse(readFileSync(geojsonPath, 'utf8')) as FeatureCollection<Polygon | MultiPolygon>;
  const report = validateOperationalSettlementsGeometry(collection);

  console.log(
    `[operational-geometry] features=${report.featureCount} polygonParts=${report.polygonPartCount} rings=${report.ringCount} invalidRings=${report.invalidRings.length}`,
  );

  if (report.invalidRings.length > 0) {
    for (const issue of report.invalidRings.slice(0, 50)) {
      console.error(
        `[operational-geometry] ${issue.osid} polygonIndex=${issue.polygonIndex} ringIndex=${issue.ringIndex} reason=${issue.reason} ${issue.detail}`,
      );
    }
    if (report.invalidRings.length > 50) {
      console.error(`[operational-geometry] ... ${report.invalidRings.length - 50} additional invalid rings omitted`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}

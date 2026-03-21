/**
 * One label point per major municipality (MAJOR_MUN_IDS + deriveUrbanTier), at the centroid of the
 * most populous OSID polygon in that mun. Deterministic: muns sorted, ties broken by osid.
 */
import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon } from 'geojson';
import { deriveUrbanTier } from './urbanSettlementTiers';

function polygonRingCentroid(coordinates: number[][]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const [x, y] of coordinates) {
    sumX += x;
    sumY += y;
    count++;
  }
  return count > 0 ? [sumX / count, sumY / count] : [0, 0];
}

function geometryCentroid(geometry: Polygon | MultiPolygon): [number, number] {
  if (geometry.type === 'Polygon') {
    return polygonRingCentroid(geometry.coordinates[0]);
  }
  const first = geometry.coordinates[0];
  return polygonRingCentroid(first[0]);
}

export function buildMajorCityLabelGeoJSON(controlGeoJson: FeatureCollection): FeatureCollection<Point> {
  type Candidate = {
    munId: string;
    munName: string;
    pop: number;
    osid: string;
    geom: Polygon | MultiPolygon;
  };

  const byMun = new Map<string, Candidate>();

  for (const feature of controlGeoJson.features) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const munId = typeof props.mun1990_id === 'string' ? props.mun1990_id : '';
    if (!munId) continue;
    const popRaw = props.population_total;
    const pop = typeof popRaw === 'number' && Number.isFinite(popRaw) ? popRaw : 0;
    if (deriveUrbanTier(munId, pop) !== 'major') continue;
    const osid = typeof props.osid === 'string' ? props.osid : '';
    const munName = typeof props.mun1990_name === 'string' ? props.mun1990_name : munId;
    const geom = feature.geometry;
    if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') continue;

    const existing = byMun.get(munId);
    if (!existing || pop > existing.pop || (pop === existing.pop && osid.localeCompare(existing.osid) < 0)) {
      byMun.set(munId, { munId, munName, pop, osid, geom: geom as Polygon | MultiPolygon });
    }
  }

  // Merge Sarajevo municipalities into a single "Sarajevo" label
  const SARAJEVO_MUNS = new Set(['centar_sarajevo', 'ilidza', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo']);
  let sarajevoBest: Candidate | null = null;
  for (const munId of SARAJEVO_MUNS) {
    const c = byMun.get(munId);
    if (c && (!sarajevoBest || c.pop > sarajevoBest.pop)) sarajevoBest = c;
    byMun.delete(munId);
  }
  if (sarajevoBest) {
    byMun.set('sarajevo', { ...sarajevoBest, munId: 'sarajevo', munName: 'Sarajevo' });
  }

  const features: Feature<Point>[] = [];
  for (const munId of [...byMun.keys()].sort((a, b) => a.localeCompare(b))) {
    const c = byMun.get(munId)!;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: geometryCentroid(c.geom) },
      properties: {
        mun1990_id: c.munId,
        name: c.munName,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Ghost Map — pre-war (1991) census demographics as Deck.gl ScatterplotLayer dots.
 * Each settlement becomes a colored dot sized by population and colored by ethnic majority.
 * Renders UNDER all other layers (prepended to layer array).
 */
import { ScatterplotLayer } from '@deck.gl/layers';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';

export interface GhostMapDatum {
  position: [number, number];  // [lng, lat] centroid
  population: number;          // population_total
  bosniaks: number;
  croats: number;
  serbs: number;
  others: number;
  majority: 'bosniak' | 'croat' | 'serb' | 'other' | 'mixed';
  majorityPct: number;         // 0-1, percentage of majority group
  name: string;
}

/** Ethnicity colors — semi-transparent for ghostly effect under military layers. */
const ETHNICITY_COLORS: Record<string, [number, number, number, number]> = {
  bosniak: [90, 180, 90, 180],    // green
  croat:   [70, 130, 220, 180],   // blue
  serb:    [200, 80, 80, 180],    // red
  other:   [180, 180, 100, 180],  // yellow-grey
  mixed:   [160, 140, 120, 140],  // muted brown, more transparent
};

/** Compute centroid as arithmetic mean of all polygon coordinate pairs. */
function computeCentroid(geometry: Polygon | MultiPolygon): [number, number] | null {
  const rings: number[][][] =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.coordinates.flat();

  let sumLng = 0;
  let sumLat = 0;
  let count = 0;

  for (const ring of rings) {
    for (const coord of ring) {
      sumLng += coord[0];
      sumLat += coord[1];
      count++;
    }
  }

  if (count === 0) return null;
  return [sumLng / count, sumLat / count];
}

/** Transform census GeoJSON features into flat Deck.gl data array. */
export function buildGhostMapData(geojson: FeatureCollection): GhostMapDatum[] {
  const result: GhostMapDatum[] = [];

  for (const feature of geojson.features) {
    const props = feature.properties;
    if (!props) continue;

    const population = typeof props.population_total === 'number' ? props.population_total : 0;
    if (population <= 0) continue;

    const geom = feature.geometry;
    if (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon') continue;

    const centroid = computeCentroid(geom as Polygon | MultiPolygon);
    if (!centroid) continue;

    const bosniaks = typeof props.population_bosniaks === 'number' ? props.population_bosniaks : 0;
    const croats = typeof props.population_croats === 'number' ? props.population_croats : 0;
    const serbs = typeof props.population_serbs === 'number' ? props.population_serbs : 0;
    const others = typeof props.population_others === 'number' ? props.population_others : 0;

    // Determine majority: highest of the three main groups
    let majority: GhostMapDatum['majority'];
    let majorityCount: number;

    if (others > bosniaks && others > croats && others > serbs) {
      majority = 'other';
      majorityCount = others;
    } else if (bosniaks >= croats && bosniaks >= serbs) {
      majority = 'bosniak';
      majorityCount = bosniaks;
    } else if (croats >= serbs) {
      majority = 'croat';
      majorityCount = croats;
    } else {
      majority = 'serb';
      majorityCount = serbs;
    }

    // If leading group is < 50% of total, classify as 'mixed'
    const majorityPct = population > 0 ? majorityCount / population : 0;
    if (majorityPct < 0.5) {
      majority = 'mixed';
    }

    result.push({
      position: centroid,
      population,
      bosniaks,
      croats,
      serbs,
      others,
      majority,
      majorityPct,
      name: typeof props.settlement_name === 'string' ? props.settlement_name : '',
    });
  }

  return result;
}

/** Build Deck.gl ScatterplotLayer for the ghost map census overlay. */
export function buildGhostMapLayer(data: GhostMapDatum[]): ScatterplotLayer {
  return new ScatterplotLayer<GhostMapDatum>({
    id: 'ghost-map-census',
    data,
    pickable: true,
    opacity: 0.7,
    stroked: false,
    filled: true,
    radiusUnits: 'meters',
    radiusMinPixels: 2,
    radiusMaxPixels: 18,
    getPosition: (d: GhostMapDatum) => d.position,
    getRadius: (d: GhostMapDatum) => Math.sqrt(d.population) * 15,
    getFillColor: (d: GhostMapDatum) =>
      ETHNICITY_COLORS[d.majority] ?? ETHNICITY_COLORS.other,
    updateTriggers: {},
  });
}

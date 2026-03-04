import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import type { EnclaveResilienceView } from '../../data/types';
import { buildOsidCentroidLookup } from './geojsonLookup';

interface EnclaveDefinitionUI {
  id: string;
  faction: string;
  label: string;
  osid_prefixes: readonly string[];
}

/**
 * Mirrors ENCLAVE_DEFINITIONS in enclave_resilience.ts — UI-side copy with display labels.
 * Must stay in sync with the sim-side definitions.
 */
const ENCLAVE_DEFINITIONS_UI: readonly EnclaveDefinitionUI[] = [
  {
    id: 'bihac_pocket',
    faction: 'RBiH',
    label: 'BIHAĆ POCKET',
    osid_prefixes: ['op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:'],
  },
  {
    id: 'srebrenica',
    faction: 'RBiH',
    label: 'SREBRENICA',
    osid_prefixes: ['op:srebrenica:'],
  },
  {
    id: 'zepa',
    faction: 'RBiH',
    label: 'ŽEPA',
    osid_prefixes: ['op:rogatica:zepa'],
  },
  {
    id: 'gorazde',
    faction: 'RBiH',
    label: 'GORAŽDE',
    osid_prefixes: ['op:gorazde:'],
  },
  {
    id: 'sarajevo',
    faction: 'RBiH',
    label: 'SARAJEVO',
    osid_prefixes: [
      'op:centar_sarajevo:',
      'op:novo_sarajevo:',
      'op:stari_grad_sarajevo:',
      'op:novi_grad_sarajevo:',
    ],
  },
] as const;

export interface EnclavePolygonProperties {
  enclave_id: string;
  faction: string;
  label: string;
  resilience: number;
  hardening_active: boolean;
}

export interface EnclaveLabelProperties {
  enclave_id: string;
  faction: string;
  label: string;
  resilience: number;
  hardening_active: boolean;
}

/**
 * Builds two GeoJSON collections for enclave visualization:
 * - `polygons`: OSID polygons belonging to enclaves still held by their faction (for fill + outline).
 * - `labels`: One point per enclave at the centroid of its held OSIDs (for text labels).
 *
 * An enclave is shown only when at least one of its OSIDs is currently controlled by its faction.
 * If an enclave falls completely, it disappears from both outputs.
 */
export function buildEnclaveGeoJSON(
  allOsidGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  enclaveResilience?: Record<string, EnclaveResilienceView>,
): {
  polygons: FeatureCollection<Geometry, EnclavePolygonProperties>;
  labels: FeatureCollection<Point, EnclaveLabelProperties>;
} {
  const centroidLookup = buildOsidCentroidLookup(allOsidGeoJson);

  // Index features by osid for fast lookup
  const featureByOsid = new Map<string, Feature>();
  for (const feature of allOsidGeoJson.features) {
    const osid = typeof feature.properties?.osid === 'string' ? feature.properties.osid : '';
    if (osid) featureByOsid.set(osid, feature);
  }

  const polygonFeatures: Feature<Geometry, EnclavePolygonProperties>[] = [];
  const labelFeatures: Feature<Point, EnclaveLabelProperties>[] = [];

  // Sorted OSID keys for deterministic iteration
  const sortedOsids = Object.keys(controlBySettlement).sort();

  for (const def of ENCLAVE_DEFINITIONS_UI) {
    const matchingOsids: string[] = [];
    for (const osid of sortedOsids) {
      if (controlBySettlement[osid] !== def.faction) continue;
      if (def.osid_prefixes.some((prefix) => osid.startsWith(prefix))) {
        matchingOsids.push(osid);
      }
    }

    if (matchingOsids.length === 0) continue;

    const entry = enclaveResilience?.[def.id];
    const resilience = entry?.resilience ?? 0;
    const hardening_active = entry?.hardening_active ?? false;

    // Polygon features — one per matching OSID
    for (const osid of matchingOsids) {
      const feature = featureByOsid.get(osid);
      if (!feature) continue;
      polygonFeatures.push({
        type: 'Feature',
        geometry: feature.geometry as Geometry,
        properties: {
          enclave_id: def.id,
          faction: def.faction,
          label: def.label,
          resilience,
          hardening_active,
        },
      });
    }

    // Label at average centroid of all matching OSIDs
    let sumLng = 0, sumLat = 0, count = 0;
    for (const osid of matchingOsids) {
      const c = centroidLookup.get(osid);
      if (c) { sumLng += c[0]; sumLat += c[1]; count++; }
    }
    if (count > 0) {
      labelFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [sumLng / count, sumLat / count] },
        properties: {
          enclave_id: def.id,
          faction: def.faction,
          label: def.label,
          resilience,
          hardening_active,
        },
      });
    }
  }

  return {
    polygons: { type: 'FeatureCollection', features: polygonFeatures },
    labels: { type: 'FeatureCollection', features: labelFeatures },
  };
}

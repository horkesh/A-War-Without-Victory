import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import type { EnclaveResilienceView } from '../../data/types';
import { buildOsidCentroidLookup } from './geojsonLookup';

interface EnclaveDefinitionUI {
  id: string;
  faction: string;
  label: string;
  osid_prefixes?: readonly string[];
  osid_list?: readonly string[];
}

/**
 * Mirrors ENCLAVE_DEFINITIONS in enclave_resilience.ts — UI-side copy with display labels.
 * Must stay in sync with the sim-side definitions.
 * Srebrenica (12 OSIDs), Žepa (1), Goražde (16) use explicit painted OSID lists.
 * Bihać and Sarajevo use municipality-wide prefix matching (correct for those).
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
    osid_list: [
      'op:srebrenica:bostahovine_2', 'op:srebrenica:brezovice_2',
      'op:srebrenica:donji_potocari_2', 'op:srebrenica:mala_daljegosta_2',
      'op:srebrenica:ljeskovik_2',
      'op:srebrenica:luka_2', 'op:srebrenica:milacevici',
      'op:srebrenica:radovcici',
      'op:srebrenica:srebrenica_2', 'op:srebrenica:suceska',
      'op:srebrenica:sulice_2',
    ],
  },
  {
    id: 'zepa',
    faction: 'RBiH',
    label: 'ŽEPA',
    osid_list: ['op:rogatica:zepa_2'],
  },
  {
    id: 'gorazde',
    faction: 'RBiH',
    label: 'GORAŽDE',
    osid_list: [
      'op:gorazde:bacci', 'op:gorazde:citluk_2',
      'op:gorazde:faocici_2', 'op:gorazde:gorazde_2',
      'op:gorazde:hrancici',
      'op:gorazde:kola', 'op:gorazde:kolovarice',
      'op:gorazde:mravinjac_2', 'op:gorazde:novakovici',
      'op:gorazde:osjecani_2', 'op:gorazde:semihova_2',
      'op:gorazde:slatina_2', 'op:gorazde:ustipraca_2',
      'op:gorazde:zorlaci', 'op:gorazde:zorovici',
    ],
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
  // HRHB enclaves (Bosniak-Croat conflict, April 1993+)
  {
    id: 'kiseljak',
    faction: 'HRHB',
    label: 'KISELJAK',
    osid_list: [
      'op:kiseljak:azapovici_2',
      'op:kiseljak:brnjaci_2', 'op:kiseljak:gromiljak_2',
      'op:kiseljak:kiseljak_2',
      'op:kresevo:kresevo_2', 'op:kresevo:polje_2',
    ],
  },
  {
    id: 'lasva_valley',
    faction: 'HRHB',
    label: 'LAŠVA VALLEY',
    osid_list: [
      'op:vitez:vitez_2',
      'op:busovaca:bare_2', 'op:busovaca:buselji_2',
      'op:busovaca:busovaca_2', 'op:busovaca:polje_2',
      'op:novi_travnik:rankovici_2', 'op:novi_travnik:rat_2',
      'op:novi_travnik:ruda_2',
    ],
  },
  {
    id: 'zepce',
    faction: 'HRHB',
    label: 'ŽEPČE',
    osid_list: [
      'op:zepce:ozimica_2', 'op:zepce:viniste_2',
      'op:zepce:zepce_2',
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
  playerFaction?: string | null,
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
    if (playerFaction && def.faction !== playerFaction) continue;
    const matchingOsids: string[] = [];
    for (const osid of sortedOsids) {
      if (controlBySettlement[osid] !== def.faction) continue;
      const osidMatches = def.osid_list
        ? def.osid_list.includes(osid)
        : def.osid_prefixes?.some((prefix) => osid.startsWith(prefix)) ?? false;
      if (osidMatches) {
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

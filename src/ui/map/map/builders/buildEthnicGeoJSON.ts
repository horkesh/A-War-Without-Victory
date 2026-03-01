import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Majority ethnicity from population props: Bosniak, Serb, Croat, or Other. */
export function getMajorityEthnic(props: Record<string, unknown>): string | null {
  const bosniak = num(props.population_bosniaks);
  const serb = num(props.population_serbs);
  const croat = num(props.population_croats);
  const other = num(props.population_others);
  const total = bosniak + serb + croat + other;
  if (total <= 0) return null;
  const max = Math.max(bosniak, serb, croat, other);
  if (max === bosniak && bosniak > 0) return 'Bosniak';
  if (max === serb && serb > 0) return 'Serb';
  if (max === croat && croat > 0) return 'Croat';
  if (max === other && other > 0) return 'Other';
  return null;
}

export interface DisplacementByMunEntry {
  originalPopulation: number;
  currentPopulation: number;
}

/**
 * Resolve municipality id for displacement lookup (lowercase, from mun1990_id or mun_id).
 */
function getMunIdForDisplacement(props: Record<string, unknown>): string | null {
  const raw =
    (typeof props.mun1990_id === 'string' && props.mun1990_id) ||
    (typeof props.mun_id === 'string' && props.mun_id) ||
    (typeof (props as Record<string, unknown>).municipality_id === 'string' &&
      (props as Record<string, unknown>).municipality_id);
  return raw ? String(raw).toLowerCase().trim() || null : null;
}

/**
 * Build a FeatureCollection with majority_ethnic per OSID for the ethnic map mode.
 * When displacementByMun is provided, scales initial population by current/original per mun
 * so the map reflects current (post-displacement) ethnic composition.
 */
export function buildEthnicGeoJSON(
  baseGeoJson: FeatureCollection,
  osidPropertiesMap: Record<string, Record<string, unknown>> | null,
  displacementByMun?: Record<string, DisplacementByMunEntry> | null
): FeatureCollection {
  if (!osidPropertiesMap) {
    return { type: 'FeatureCollection', features: [] };
  }
  const features = baseGeoJson.features.map((feature) => {
    const props = (feature.properties ?? {}) as GeoJsonProperties & { osid?: unknown };
    const osid = typeof props.osid === 'string' ? props.osid : '';
    const base = osid ? osidPropertiesMap[osid] ?? {} : {};
    let majority_ethnic: string | null;

    if (displacementByMun && Object.keys(displacementByMun).length > 0) {
      const munId = getMunIdForDisplacement(base);
      const disp = munId ? displacementByMun[munId] : undefined;
      if (disp && disp.originalPopulation > 0 && Number.isFinite(disp.currentPopulation)) {
        const ratio = Math.max(0, disp.currentPopulation / disp.originalPopulation);
        const scaled = {
          population_bosniaks: Math.round(num(base.population_bosniaks) * ratio),
          population_serbs: Math.round(num(base.population_serbs) * ratio),
          population_croats: Math.round(num(base.population_croats) * ratio),
          population_others: Math.round(num(base.population_others) * ratio),
        };
        majority_ethnic = getMajorityEthnic(scaled);
      } else {
        majority_ethnic = getMajorityEthnic(base);
      }
    } else {
      majority_ethnic = osid ? getMajorityEthnic(base) : null;
    }

    return {
      type: 'Feature' as const,
      geometry: feature.geometry as Geometry,
      properties: {
        ...props,
        majority_ethnic,
      },
    };
  });
  return { type: 'FeatureCollection', features };
}

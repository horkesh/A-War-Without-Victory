import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function maybeNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function getCompleteEthnicCensus(props: Record<string, unknown>): { bosniak: number; serb: number; croat: number; other: number } | null {
  const bosniak = maybeNum(props.population_bosniaks);
  const serb = maybeNum(props.population_serbs);
  const croat = maybeNum(props.population_croats);
  const other = maybeNum(props.population_others);
  return bosniak == null || serb == null || croat == null || other == null
    ? null
    : { bosniak, serb, croat, other };
}

/** Majority ethnicity from population props: Bosniak, Serb, Croat, or Other. */
export function getMajorityEthnic(props: Record<string, unknown>): string | null {
  const complete = getCompleteEthnicCensus(props);
  if (!complete) return null;
  const { bosniak, serb, croat, other } = complete;
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
  /** Per-faction arrivals at this municipality (from displaced_in_by_faction). */
  arrivedByFaction?: Partial<Record<string, number>>;
}

/** Per-OSID per-faction departed counts (from displacement_event_log). */
export type DepartedByOsid = Record<string, Partial<Record<string, number>>>;

/**
 * Current ethnic composition (counts) for a single OSID.
 * Uses the same complete-census rule as buildEthnicGeoJSON: partial census rows are unreported.
 */
export function getCurrentEthnicForOsid(
  osid: string,
  osidPropertiesMap: Record<string, Record<string, unknown>> | null,
  displacementByMun?: Record<string, { originalPopulation: number; currentPopulation: number; arrivedByFaction?: Partial<Record<string, number>> }> | null,
  departedByOsid?: DepartedByOsid | null
): { Bosniak: number; Serb: number; Croat: number; Other: number } | null {
  if (!osidPropertiesMap?.[osid]) return null;
  const base = osidPropertiesMap[osid] ?? {};
  const complete = getCompleteEthnicCensus(base);
  if (!complete) return null;

  const initB = complete.bosniak;
  const initS = complete.serb;
  const initC = complete.croat;
  const initO = complete.other;
  const munId = getMunIdForDisplacement(base);
  const dep = departedByOsid?.[osid] ?? {};
  const dispRaw = munId && displacementByMun ? displacementByMun[munId] : undefined;
  const disp = dispRaw && typeof dispRaw === 'object' && 'currentPopulation' in dispRaw ? dispRaw : undefined;
  const arr = disp && 'arrivedByFaction' in disp ? (disp.arrivedByFaction ?? {}) : {};

  const depB = num(dep['RBiH']);
  const depS = num(dep['RS']);
  const depC = num(dep['HRHB']);

  let arrB = 0, arrS = 0, arrC = 0;
  if (munId && disp && Object.keys(arr).length > 0) {
    let munB = 0, munS = 0, munC = 0;
    for (const props of Object.values(osidPropertiesMap)) {
      const m = getMunIdForDisplacement(props as Record<string, unknown>);
      if (m !== munId) continue;
      const munComplete = getCompleteEthnicCensus(props as Record<string, unknown>);
      if (!munComplete) continue;
      munB += munComplete.bosniak;
      munS += munComplete.serb;
      munC += munComplete.croat;
    }
    const fracB = munB > 0 ? initB / munB : 0;
    const fracS = munS > 0 ? initS / munS : 0;
    const fracC = munC > 0 ? initC / munC : 0;
    arrB = Math.round(num(arr['RBiH']) * fracB);
    arrS = Math.round(num(arr['RS']) * fracS);
    arrC = Math.round(num(arr['HRHB']) * fracC);
  }

  const curB = Math.max(0, initB - depB + arrB);
  const curS = Math.max(0, initS - depS + arrS);
  const curC = Math.max(0, initC - depC + arrC);
  const initTotal = initB + initS + initC + initO;
  const curMainGroups = curB + curS + curC;
  const initMainGroups = initB + initS + initC;
  const othersRatio = initMainGroups > 0 && initTotal > 0
    ? curMainGroups / initMainGroups
    : (disp && typeof disp === 'object' && 'originalPopulation' in disp && (disp as { originalPopulation: number; currentPopulation: number }).originalPopulation > 0
      ? Math.max(0, (disp as { originalPopulation: number; currentPopulation: number }).currentPopulation / (disp as { originalPopulation: number; currentPopulation: number }).originalPopulation)
      : 1);
  const curO = Math.max(0, Math.round(initO * othersRatio));

  return { Bosniak: curB, Serb: curS, Croat: curC, Other: curO };
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
 *
 * When departedByOsid is provided, computes per-ethnic-group current population at OSID
 * granularity. Partial census rows render as unreported rather than zero-filled.
 */
export function buildEthnicGeoJSON(
  baseGeoJson: FeatureCollection,
  osidPropertiesMap: Record<string, Record<string, unknown>> | null,
  displacementByMun?: Record<string, DisplacementByMunEntry> | null,
  departedByOsid?: DepartedByOsid | null
): FeatureCollection {
  if (!osidPropertiesMap) {
    return { type: 'FeatureCollection', features: [] };
  }

  const hasDisplacement = displacementByMun && Object.keys(displacementByMun).length > 0;
  const hasDepartures = departedByOsid && Object.keys(departedByOsid).length > 0;

  let munEthnicTotals: Record<string, { b: number; s: number; c: number; o: number }> | null = null;
  if (hasDisplacement && hasDepartures) {
    munEthnicTotals = {};
    for (const feature of baseGeoJson.features) {
      const fProps = (feature.properties ?? {}) as GeoJsonProperties & { osid?: unknown };
      const fOsid = typeof fProps.osid === 'string' ? fProps.osid : '';
      const fBase = fOsid ? osidPropertiesMap[fOsid] ?? {} : {};
      const complete = getCompleteEthnicCensus(fBase);
      if (!complete) continue;
      const munId = getMunIdForDisplacement(fBase);
      if (!munId) continue;
      if (!munEthnicTotals[munId]) munEthnicTotals[munId] = { b: 0, s: 0, c: 0, o: 0 };
      munEthnicTotals[munId].b += complete.bosniak;
      munEthnicTotals[munId].s += complete.serb;
      munEthnicTotals[munId].c += complete.croat;
      munEthnicTotals[munId].o += complete.other;
    }
  }

  const features = baseGeoJson.features.map((feature) => {
    const props = (feature.properties ?? {}) as GeoJsonProperties & { osid?: unknown };
    const osid = typeof props.osid === 'string' ? props.osid : '';
    const base = osid ? osidPropertiesMap[osid] ?? {} : {};
    let majority_ethnic: string | null;

    if (hasDepartures && munEthnicTotals) {
      const munId = getMunIdForDisplacement(base);
      const dep = departedByOsid?.[osid] ?? {};
      const disp = munId ? displacementByMun?.[munId] : undefined;
      const munTot = munId ? munEthnicTotals[munId] : undefined;
      const arr = disp?.arrivedByFaction ?? {};
      const complete = getCompleteEthnicCensus(base);

      if (!complete) {
        majority_ethnic = null;
      } else {
        const initB = complete.bosniak;
        const initS = complete.serb;
        const initC = complete.croat;
        const initO = complete.other;

        const depB = num(dep['RBiH']);
        const depS = num(dep['RS']);
        const depC = num(dep['HRHB']);

        const arrBMun = num(arr['RBiH']);
        const arrSMun = num(arr['RS']);
        const arrCMun = num(arr['HRHB']);
        const fracB = munTot && munTot.b > 0 ? initB / munTot.b : 0;
        const fracS = munTot && munTot.s > 0 ? initS / munTot.s : 0;
        const fracC = munTot && munTot.c > 0 ? initC / munTot.c : 0;
        const arrB = Math.round(arrBMun * fracB);
        const arrS = Math.round(arrSMun * fracS);
        const arrC = Math.round(arrCMun * fracC);

        const curB = Math.max(0, initB - depB + arrB);
        const curS = Math.max(0, initS - depS + arrS);
        const curC = Math.max(0, initC - depC + arrC);

        const initTotal = initB + initS + initC + initO;
        const curMainGroups = curB + curS + curC;
        const initMainGroups = initB + initS + initC;
        const othersRatio = initMainGroups > 0 && initTotal > 0
          ? curMainGroups / initMainGroups
          : (disp && disp.originalPopulation > 0
            ? Math.max(0, disp.currentPopulation / disp.originalPopulation)
            : 1);
        const curO = Math.max(0, Math.round(initO * othersRatio));

        majority_ethnic = getMajorityEthnic({
          population_bosniaks: curB,
          population_serbs: curS,
          population_croats: curC,
          population_others: curO,
        });
      }
    } else if (hasDisplacement) {
      const munId = getMunIdForDisplacement(base);
      const disp = munId ? displacementByMun?.[munId] : undefined;
      if (disp && disp.originalPopulation > 0 && Number.isFinite(disp.currentPopulation)) {
        const complete = getCompleteEthnicCensus(base);
        const ratio = Math.max(0, disp.currentPopulation / disp.originalPopulation);
        majority_ethnic = complete
          ? getMajorityEthnic({
            population_bosniaks: Math.round(complete.bosniak * ratio),
            population_serbs: Math.round(complete.serb * ratio),
            population_croats: Math.round(complete.croat * ratio),
            population_others: Math.round(complete.other * ratio),
          })
          : null;
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

import type { FeatureCollection } from 'geojson';

/**
 * Humanize an OSID string when no GeoJSON lookup is available:
 * use the last segment after ":", replace underscores with spaces, capitalize words.
 */
export function humanizeOsid(osid: string): string {
  if (!osid || typeof osid !== 'string') return osid;
  // Handle internal operational prefixes: strip everything before the final ":"
  const segment = osid.includes(':') ? osid.split(':').pop() ?? osid : osid;

  // Strip common technical suffixes or prefixes that shouldn't be humanized
  const clean = segment.replace(/^(op|sector)_/i, '');

  return clean
    .split('_')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim() || osid;
}

interface OsidFeatureProperties {
  osid?: string;
  settlement_name?: string;
  mun1990_name?: string;
}

/** Strip "(+N)" suffix from settlement_name and optionally append " (mun1990_name)". */
function formatSettlementDisplayName(settlementName: string, mun1990Name?: string): string {
  const base = settlementName.replace(/\s*\(\+\d+\)\s*$/, '').trim();
  if (mun1990Name && mun1990Name.trim()) return `${base} (${mun1990Name.trim()})`;
  return base;
}

/**
 * Build OSID → display name map from operational settlements GeoJSON.
 * Uses settlement_name with "(+N)" removed; adds municipality in brackets when present.
 */
export function buildOsidDisplayNameMap(geojson: FeatureCollection): Record<string, string> {
  const map: Record<string, string> = {};
  for (const feature of geojson.features) {
    const props = feature.properties as OsidFeatureProperties | undefined;
    const osid = props?.osid;
    if (!osid || typeof osid !== 'string') continue;
    const name = props?.settlement_name
      ? formatSettlementDisplayName(props.settlement_name, props.mun1990_name)
      : humanizeOsid(osid);
    map[osid] = name;
  }
  return map;
}

/**
 * Resolve display name for an OSID: use map when provided, otherwise humanize.
 */
export function getOsidDisplayName(osid: string, map: Record<string, string> | null): string {
  if (!osid) return osid;
  if (map && map[osid]) return map[osid];
  return humanizeOsid(osid);
}

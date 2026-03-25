import type { FeatureCollection } from 'geojson';

/**
 * Humanize an OSID string when no GeoJSON lookup is available:
 * use the last segment after ":", replace underscores with spaces, capitalize words.
 */
export function humanizeOsid(osid: string): string {
  if (!osid || typeof osid !== 'string') return osid;
  // Extract parts: "op:municipality:slug" → municipality and slug
  const parts = osid.split(':');
  const slug = parts.length >= 3 ? parts[2] : parts[parts.length - 1] ?? osid;
  const mun = parts.length >= 3 ? parts[1] : undefined;

  // Strip common technical suffixes/prefixes
  const clean = slug.replace(/^(op|sector)_/i, '');

  // Strip trailing numeric cluster suffix (e.g. "_2", "_13")
  const withoutSuffix = clean.replace(/_\d+$/, '');

  const name = (withoutSuffix || clean)
    .split('_')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim() || osid;

  // Append municipality in parentheses when different from the name
  if (mun) {
    const munDisplay = mun
      .split('_')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');
    if (munDisplay.toLowerCase() !== name.toLowerCase()) {
      return `${name} (${munDisplay})`;
    }
  }

  return name;
}

interface OsidFeatureProperties {
  osid?: string;
  settlement_name?: string;
  mun1990_name?: string;
}

/** Strip "(+N)" suffix from settlement_name and optionally append " (mun1990_name)".
 *  Skip municipality when it matches the base name (avoids "Tuzla (Tuzla)"). */
function formatSettlementDisplayName(settlementName: string, mun1990Name?: string): string {
  const base = settlementName.replace(/\s*\(\+\d+\)\s*$/, '').trim();
  const mun = mun1990Name?.trim();
  if (mun && mun.toLowerCase() !== base.toLowerCase()) return `${base} (${mun})`;
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

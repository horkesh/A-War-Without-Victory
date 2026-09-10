export type OsidPropertiesMap = Record<string, Record<string, unknown>>;

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Build a deterministic municipality-id lookup from operational GeoJSON properties. */
export function buildMunicipalityDisplayNameMap(
  osidPropertiesMap: OsidPropertiesMap | null,
): Record<string, string> {
  const municipalityNames: Record<string, string> = {};
  if (!osidPropertiesMap) return municipalityNames;

  for (const osid of Object.keys(osidPropertiesMap).sort(compareStrings)) {
    const properties = osidPropertiesMap[osid];
    const municipalityId = properties?.mun1990_id;
    const municipalityName = properties?.mun1990_name;
    if (
      typeof municipalityId !== 'string'
      || municipalityId.length === 0
      || typeof municipalityName !== 'string'
      || municipalityName.length === 0
    ) continue;
    municipalityNames[municipalityId] ??= municipalityName;
  }

  return municipalityNames;
}

export function getMunicipalityDisplayName(
  municipalityId: string,
  municipalityNames: Readonly<Record<string, string>>,
  fallback = '—',
): string {
  return municipalityNames[municipalityId] ?? fallback;
}

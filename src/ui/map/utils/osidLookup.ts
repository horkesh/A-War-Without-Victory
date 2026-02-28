/**
 * Lookup by OSID — supports both raw osid and S-prefixed keys (e.g. S1, op:sarajevo).
 */
export function getByOsid<T>(
  record: Record<string, T> | undefined,
  osid: string
): T | null {
  if (!record) return null;
  return record[osid] ?? record[`S${osid}`] ?? null;
}

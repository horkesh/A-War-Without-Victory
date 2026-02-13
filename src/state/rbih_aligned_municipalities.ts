/**
 * Municipalities where settlement control and spawned units align to RBiH (ARBiH) regardless of
 * Croatian majority. HVO units spawned from these areas are treated as subordinate to ARBiH;
 * in practice we force control to RBiH and redirect HRHB militia strength to RBiH so spawns are ARBiH.
 *
 * Canonical list: Maglaj, Bihać, Gradačac, Brčko, Tuzla, Lopare, Srebrenik, Tešanj.
 * Keys are mun1990_id (lowercase, no diacritics).
 */

/** mun1990_id values for municipalities aligned to RBiH (control and formations count as RBiH/ARBiH). */
export const MUN1990_IDS_ALIGNED_TO_RBIH: readonly string[] = [
  'maglaj',
  'bihac',
  'gradacac',
  'brcko',
  'tuzla',
  'lopare',
  'srebrenik',
  'tesanj',
].sort((a, b) => a.localeCompare(b));

const SET = new Set<string>(MUN1990_IDS_ALIGNED_TO_RBIH);

/** True if this mun1990_id is in the RBiH-aligned list (control and spawns → RBiH). */
export function isMunicipalityAlignedToRbih(mun1990Id: string): boolean {
  return SET.has(mun1990Id);
}

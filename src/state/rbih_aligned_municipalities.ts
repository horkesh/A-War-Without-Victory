/**
 * Municipalities where Croat-majority (HRHB) control is treated as RBiH (HVO subordinate to ARBiH).
 * Only HRHB → RBiH in init; Serb-majority (RS) settlements in these muns stay RS (e.g. Brčko, Bihać).
 * Spawns and control-flip semantics still treat these muns as RBiH-aligned.
 *
 * Canonical list: Bihać, Brčko, Gradačac, Ilijaš, Lopare, Maglaj, Srebrenik, Tešanj, Tuzla, Velika Kladuša, Vogošća.
 * Keys are mun1990_id (lowercase, no diacritics).
 */

/** mun1990_id values for municipalities aligned to RBiH (control and formations count as RBiH/ARBiH). */
export const MUN1990_IDS_ALIGNED_TO_RBIH: readonly string[] = [
  'maglaj',
  'bihac',
  'gradacac',
  'brcko',
  'ilijas',
  'tuzla',
  'lopare',
  'srebrenik',
  'tesanj',
  'velika_kladusa',
  'vogosca',
].sort((a, b) => a.localeCompare(b));

const SET = new Set<string>(MUN1990_IDS_ALIGNED_TO_RBIH);

/** True if this mun1990_id is in the RBiH-aligned list (control and spawns → RBiH). */
export function isMunicipalityAlignedToRbih(mun1990Id: string): boolean {
  return SET.has(mun1990Id);
}

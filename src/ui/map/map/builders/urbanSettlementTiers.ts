/**
 * Derives urban visualization tier from operational settlement properties.
 * Deterministic: tier depends only on mun1990_id + population_total from GeoJSON.
 */

export type UrbanTier = 'major' | 'urban' | 'rural';

/** Settlements at or above this population_total count as urban (wash). */
export const URBAN_POP_THRESHOLD = 5000;

/**
 * Municipal seats / regional centers — stronger wash + outline + game-sourced label.
 * Covers Sarajevo metro (five 1990 muns in derived data) plus other large BiH centers.
 */
export const MAJOR_MUN_IDS: ReadonlySet<string> = new Set([
  'banja_luka',
  'banovici',
  'bijeljina',
  'bihac',
  'bosanska_gradiska',
  'brcko',
  'cazin',
  'centar_sarajevo',
  'derventa',
  'doboj',
  'gracanica',
  'ilidza',
  'kakanj',
  'lukavac',
  'mostar',
  'novi_grad_sarajevo',
  'novo_sarajevo',
  'prijedor',
  'sanski_most',
  'stari_grad_sarajevo',
  'teslic',
  'travnik',
  'tuzla',
  'velika_kladusa',
  'zenica',
  'zivinice',
  'zvornik',
]);

export function deriveUrbanTier(mun1990Id: string, populationTotal: number): UrbanTier {
  if (mun1990Id && MAJOR_MUN_IDS.has(mun1990Id)) return 'major';
  if (populationTotal >= URBAN_POP_THRESHOLD) return 'urban';
  return 'rural';
}

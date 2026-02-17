/**
 * Region lists for displacement routing (canon: displacement redesign 2026-02-17).
 * Single source for motherland-preference routing and flee-abroad overrides.
 */

import type { MunicipalityId } from './game_state.js';

/** Posavina municipalities — high flee-abroad for Croats (most to Croatia). */
export const POSAVINA_MUN_IDS = new Set<MunicipalityId>([
  'brcko',
  'bosanski_samac',
  'odzak',
  'orasje',
  'gradacac',
  'derventa',
  'modrica',
  'bosanski_brod',
  'bosanska_gradiska',
  'doboj',
  'bijeljina'
]);

/** Croat Krajina source muns (Banja Luka, Prijedor area) — route to Herzegovina, not Travnik. */
export const CROAT_KRAJINA_SOURCE_MUN_IDS = new Set<MunicipalityId>([
  'banja_luka',
  'prijedor',
  'sanski_most',
  'kljuc',
  'bosanski_novi',
  'novi_grad'
]);

/** East-of-Sarajevo muns for Serb routing from Sarajevo (eastward bias). */
export const EAST_OF_SARAJEVO_MUN_IDS: readonly MunicipalityId[] = [
  'pale',
  'sokolac',
  'han_pijesak',
  'ilijas',
  'vogosca',
  'trnovo',
  'rogatica'
];

/** Sarajevo area muns — when source is here, Serbs route east-of-Sarajevo first. */
export const SARAJEVO_AREA_MUN_IDS = new Set<MunicipalityId>([
  'centar_sarajevo',
  'novi_grad_sarajevo',
  'novo_sarajevo',
  'stari_grad_sarajevo',
  'ilidza',
  'hadzici',
  'vogosca',
  'ilijas',
  'trnovo'
]);

/** Herzegovina destinations for Croat routing (Banja Luka/Prijedor area). */
export const HERZEGOVINA_DEST_MUN_IDS: readonly MunicipalityId[] = ['mostar', 'livno'];

/** Posavina Croat domestic destinations (Gradačac, Brčko, Orašje). */
export const POSAVINA_CROAT_DEST_MUN_IDS: readonly MunicipalityId[] = ['gradacac', 'brcko', 'orasje'];

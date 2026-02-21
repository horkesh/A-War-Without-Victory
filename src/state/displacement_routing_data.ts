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

/** Herzegovina destinations for Croat routing (Banja Luka/Prijedor area). Livno first, then Mostar. */
export const HERZEGOVINA_DEST_MUN_IDS: readonly MunicipalityId[] = ['livno', 'mostar'];

/** Posavina Croat domestic destinations (Gradačac, Brčko, Orašje). */
export const POSAVINA_CROAT_DEST_MUN_IDS: readonly MunicipalityId[] = ['gradacac', 'brcko', 'orasje'];

/** Receiving cap: settlements receiving displacement are capped at 150% of pre-war population; overflow disperses to other urban centers of that nationality with brigades. */
export const DISPLACEMENT_RECEIVING_CAPACITY_FRACTION = 1.5;

/** Sarajevo siege: receivers in Sarajevo area accept much less (10% above pre-war). */
export const SARAJEVO_SIEGE_RECEIVING_CAPACITY_FRACTION = 1.1;

/** Receiving capacity fraction for a municipality. Sarajevo area gets lower cap due to siege. */
export function getReceivingCapacityFraction(munId: MunicipalityId): number {
    return SARAJEVO_AREA_MUN_IDS.has(munId) ? SARAJEVO_SIEGE_RECEIVING_CAPACITY_FRACTION : DISPLACEMENT_RECEIVING_CAPACITY_FRACTION;
}

/**
 * Cumulative casualty tracking across the war.
 *
 * Records killed, wounded, missing/captured per faction and per formation,
 * plus equipment losses. Updated after each battle resolution step.
 *
 * Deterministic: no randomness, no timestamps.
 */

import type { FactionId, FormationId } from './game_state.js';

// --- Types ---

export interface FormationCasualties {
  killed: number;
  wounded: number;
  missing_captured: number;
}

export interface FactionEquipmentLosses {
  tanks: number;
  artillery: number;
  aa_systems: number;
}

export interface FactionCasualtyLedger {
  killed: number;
  wounded: number;
  missing_captured: number;
  equipment_lost: FactionEquipmentLosses;
  per_formation: Record<FormationId, FormationCasualties>;
}

export type CasualtyLedger = Record<FactionId, FactionCasualtyLedger>;

// --- Helpers ---

/** Create a zeroed-out casualty ledger for the given factions. */
export function initializeCasualtyLedger(factionIds: readonly string[]): CasualtyLedger {
  const ledger: CasualtyLedger = {};
  for (const fid of factionIds) {
    ledger[fid] = {
      killed: 0,
      wounded: 0,
      missing_captured: 0,
      equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 },
      per_formation: {}
    };
  }
  return ledger;
}

/** Ensure a faction entry exists in the ledger. */
function ensureFaction(ledger: CasualtyLedger, factionId: string): FactionCasualtyLedger {
  if (!ledger[factionId]) {
    ledger[factionId] = {
      killed: 0,
      wounded: 0,
      missing_captured: 0,
      equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 },
      per_formation: {}
    };
  }
  return ledger[factionId]!;
}

/** Ensure a formation entry exists within a faction ledger. */
function ensureFormation(factionLedger: FactionCasualtyLedger, formationId: string): FormationCasualties {
  if (!factionLedger.per_formation[formationId]) {
    factionLedger.per_formation[formationId] = { killed: 0, wounded: 0, missing_captured: 0 };
  }
  return factionLedger.per_formation[formationId]!;
}

/** Record personnel casualties for a formation in the ledger. */
export function recordBattleCasualties(
  ledger: CasualtyLedger,
  factionId: string,
  formationId: string,
  casualties: FormationCasualties
): void {
  const faction = ensureFaction(ledger, factionId);
  const formation = ensureFormation(faction, formationId);

  faction.killed += casualties.killed;
  faction.wounded += casualties.wounded;
  faction.missing_captured += casualties.missing_captured;

  formation.killed += casualties.killed;
  formation.wounded += casualties.wounded;
  formation.missing_captured += casualties.missing_captured;
}

/** Record equipment losses for a faction in the ledger. */
export function recordEquipmentLoss(
  ledger: CasualtyLedger,
  factionId: string,
  losses: Partial<FactionEquipmentLosses>
): void {
  const faction = ensureFaction(ledger, factionId);
  faction.equipment_lost.tanks += losses.tanks ?? 0;
  faction.equipment_lost.artillery += losses.artillery ?? 0;
  faction.equipment_lost.aa_systems += losses.aa_systems ?? 0;
}

/** Get total casualties (all categories) for a faction. */
export function getFactionTotalCasualties(ledger: CasualtyLedger, factionId: string): number {
  const f = ledger[factionId];
  if (!f) return 0;
  return f.killed + f.wounded + f.missing_captured;
}

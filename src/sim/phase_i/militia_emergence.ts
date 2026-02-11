/**
 * Phase C Step 3: Militia emergence (Phase_I_Specification_v0_4_0.md §4.2).
 * Converts organizational penetration into militia strength per municipality per faction.
 * Deterministic ordering; no AoR, no fronts.
 */

import type { GameState, FactionId, MunicipalityId, OrganizationalPenetration } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Militia strength domain per spec. */
export const MILITIA_STRENGTH_MIN = 0;
export const MILITIA_STRENGTH_MAX = 100;

/** Phase I spec §4.2.1: Police × 15, TO × 20, Party × 10, Paramilitary × 25. */
const WEIGHT_POLICE = 15;
const WEIGHT_TO = 20;
const WEIGHT_PARTY = 10;
const WEIGHT_PARAMILITARY = 25;

/** Phase I spec §4.2.1: Declaration multiplier when own faction declared. */
const DECLARATION_MULTIPLIER_DECLARED = 1.5;
const DECLARATION_MULTIPLIER_NOT_DECLARED = 1.0;

/** Phase I spec §4.2.3: Base organizational strength growth rate per turn. */
const BASE_GROWTH_RATE = 0.1;

/** Phase I spec §4.2.3: Declaration bonus RS in Serb-majority municipalities. */
const DECLARATION_BONUS_RS = 2;
/** Phase I spec §4.2.3: Declaration bonus HRHB in Croat-majority municipalities. */
const DECLARATION_BONUS_HRHB = 1.5;

/** Phase I spec §4.2.3: External support RS with JNA. */
const EXTERNAL_BONUS_JNA_RS = 1;
/** Phase I spec §4.2.3: External support HRHB with Croatian (stub: use 0.8 when HRHB declared; no separate Croatian flag in state yet). */
const EXTERNAL_BONUS_CROATIAN_HRHB = 0.8;

/**
 * Map police_loyalty to 0–1 scalar for a faction (Phase I §4.2.1).
 * RBiH: loyal=1, mixed=0.5, hostile=0. RS/HRHB: hostile=1, mixed=0.5, loyal=0 (police against government).
 */
function policeLoyaltyScalar(op: OrganizationalPenetration | undefined, faction: FactionId): number {
  if (!op || !op.police_loyalty) return 0.5;
  const v = op.police_loyalty;
  if (faction === 'RBiH') return v === 'loyal' ? 1 : v === 'mixed' ? 0.5 : 0;
  return v === 'hostile' ? 1 : v === 'mixed' ? 0.5 : 0;
}

/** Map to_control to 0–1 scalar. */
function toControlScalar(op: OrganizationalPenetration | undefined): number {
  if (!op || !op.to_control) return 0.5;
  if (op.to_control === 'controlled') return 1;
  if (op.to_control === 'contested') return 0.5;
  return 0;
}

/** Party penetration 0–100 → 0–1 for faction (SDA=RBiH, SDS=RS, HDZ=HRHB). */
function partyPenetrationScalar(op: OrganizationalPenetration | undefined, faction: FactionId): number {
  if (!op) return 0;
  const raw =
    faction === 'RBiH' ? (op.sda_penetration ?? 0) : faction === 'RS' ? (op.sds_penetration ?? 0) : (op.hdz_penetration ?? 0);
  return Math.min(100, Math.max(0, raw)) / 100;
}

/** Paramilitary 0–100 → 0–1 for faction. */
function paramilitaryScalar(op: OrganizationalPenetration | undefined, faction: FactionId): number {
  if (!op) return 0;
  const raw =
    faction === 'RBiH' ? (op.patriotska_liga ?? 0) : faction === 'RS' ? (op.paramilitary_rs ?? 0) : (op.paramilitary_hrhb ?? 0);
  return Math.min(100, Math.max(0, raw)) / 100;
}

/**
 * Base organizational strength (Phase I §4.2.1 formula before declaration and demographic).
 */
function baseOrganizationalStrength(op: OrganizationalPenetration | undefined, faction: FactionId): number {
  if (!op) return 0;
  const police = policeLoyaltyScalar(op, faction);
  const to = toControlScalar(op);
  const party = partyPenetrationScalar(op, faction);
  const param = paramilitaryScalar(op, faction);
  return police * WEIGHT_POLICE + to * WEIGHT_TO + party * WEIGHT_PARTY + param * WEIGHT_PARAMILITARY;
}

/** Declaration multiplier: 1.5 if faction declared, 1.0 else (Phase I §4.2.1). */
function declarationMultiplier(state: GameState, faction: FactionId): number {
  const f = state.factions.find((x) => x.id === faction);
  return f?.declared ? DECLARATION_MULTIPLIER_DECLARED : DECLARATION_MULTIPLIER_NOT_DECLARED;
}

/**
 * Demographic support factor (Phase I §4.2.1).
 * Stub: no municipality majority data in state; use 0.7 (plurality) for all. Document in ledger if needed.
 */
function demographicSupportFactor(_munId: MunicipalityId, _faction: FactionId, _state: GameState): number {
  return 0.7;
}

/**
 * Compute militia strength for one municipality, one faction (Phase I §4.2.1).
 * Bounds [0, 100].
 */
export function computeMilitiaStrength(
  op: OrganizationalPenetration | undefined,
  faction: FactionId,
  state: GameState,
  munId: MunicipalityId
): number {
  const base = baseOrganizationalStrength(op, faction);
  const declMult = declarationMultiplier(state, faction);
  const demo = demographicSupportFactor(munId, faction, state);
  const raw = base * declMult * demo;
  return Math.min(MILITIA_STRENGTH_MAX, Math.max(MILITIA_STRENGTH_MIN, Math.round(raw * 10) / 10));
}

/**
 * Growth per turn for one municipality, one faction (Phase I §4.2.3).
 */
function militiaGrowthPerTurn(
  op: OrganizationalPenetration | undefined,
  faction: FactionId,
  state: GameState,
  munId: MunicipalityId
): number {
  const baseOrg = baseOrganizationalStrength(op, faction);
  let growth = baseOrg * BASE_GROWTH_RATE;

  const f = state.factions.find((x) => x.id === faction);
  if (f?.declared) {
    if (faction === 'RS') growth += DECLARATION_BONUS_RS;
    if (faction === 'HRHB') growth += DECLARATION_BONUS_HRHB;
  }

  const jna = state.phase_i_jna;
  if (jna?.transition_begun && faction === 'RS') growth += EXTERNAL_BONUS_JNA_RS;
  if (faction === 'HRHB' && f?.declared) growth += EXTERNAL_BONUS_CROATIAN_HRHB;

  return Math.max(0, growth);
}

export interface MilitiaEmergenceReport {
  municipalities_updated: number;
  by_mun: Array<{ mun_id: MunicipalityId; by_faction: Record<FactionId, number> }>;
}

/**
 * Update phase_i_militia_strength for all municipalities and factions (Phase I §4.2).
 * Deterministic order: municipalities sorted by id, then factions sorted by id.
 * Only runs when state.meta.phase === 'phase_i' and after war_start_turn (caller gates).
 */
export function updateMilitiaEmergence(state: GameState): MilitiaEmergenceReport {
  const municipalities = state.municipalities ?? {};
  const munIds = (Object.keys(municipalities) as MunicipalityId[]).slice().sort(strictCompare);
  const factionIds: FactionId[] = (state.factions ?? [])
    .map((f) => f.id)
    .slice()
    .sort(strictCompare) as FactionId[];

  if (!state.phase_i_militia_strength) {
    (state as GameState & { phase_i_militia_strength: Record<string, Record<string, number>> }).phase_i_militia_strength = {};
  }
  const strengthMap = state.phase_i_militia_strength!;

  const by_mun: MilitiaEmergenceReport['by_mun'] = [];

  for (const munId of munIds) {
    const mun = municipalities[munId];
    const op = mun?.organizational_penetration;
    const by_faction: Record<FactionId, number> = {} as Record<FactionId, number>;

    for (const factionId of factionIds) {
      const current = strengthMap[munId]?.[factionId] ?? 0;
      const initialStrength = current > 0 ? current : computeMilitiaStrength(op, factionId, state, munId);
      const growth = militiaGrowthPerTurn(op, factionId, state, munId);
      const next = Math.min(MILITIA_STRENGTH_MAX, Math.max(MILITIA_STRENGTH_MIN, initialStrength + growth));
      const rounded = Math.round(next * 10) / 10;
      by_faction[factionId] = rounded;

      if (!strengthMap[munId]) (strengthMap as Record<string, Record<string, number>>)[munId] = {};
      strengthMap[munId][factionId] = rounded;
    }

    by_mun.push({ mun_id: munId, by_faction });
  }

  return { municipalities_updated: munIds.length, by_mun };
}

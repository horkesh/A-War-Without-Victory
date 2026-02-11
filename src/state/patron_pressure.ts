import type { GameState, FactionId, InternationalVisibilityPressure, PatronState, SarajevoState } from './game_state.js';

export const EXHAUSTION_DIPLOMATIC_MULTIPLIER = 0.1;
export const NEGOTIATION_MOMENTUM_MULTIPLIER = 0.05;
export const PATRON_COMMITMENT_RESISTANCE = 0.05;
export const SARAJEVO_VISIBILITY_RATE = 0.5;
export const ENCLAVE_PRESSURE_WEIGHT = 1.0;
export const SARAJEVO_ISOLATION_RATE = 0.05;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function getYearForTurn(turn: number): number {
  if (turn < 0 || !Number.isFinite(turn)) return 1992;
  const yearOffset = Math.floor(turn / 52);
  return Math.min(1995, 1992 + yearOffset);
}

function patronCommitmentBase(factionId: FactionId, year: number): number {
  switch (factionId) {
    case 'RBiH':
      if (year <= 1992) return 0.6;
      if (year === 1993) return 0.7;
      if (year === 1994) return 0.75;
      return 0.8;
    case 'RS':
      if (year <= 1992) return 0.8;
      if (year === 1993) return 0.7;
      if (year === 1994) return 0.6;
      return 0.55;
    case 'HRHB':
      if (year <= 1992) return 0.5;
      if (year === 1993) return 0.55;
      if (year === 1994) return 0.65;
      return 0.7;
    default:
      return 0.5;
  }
}

export function ensureInternationalVisibilityPressure(state: GameState): InternationalVisibilityPressure {
  if (!state.international_visibility_pressure) {
    state.international_visibility_pressure = {
      sarajevo_siege_visibility: 0,
      enclave_humanitarian_pressure: 0,
      atrocity_visibility: 0,
      negotiation_momentum: 0,
      last_major_shift: null
    };
  }
  return state.international_visibility_pressure;
}

export function ensurePatronState(state: GameState, factionId: FactionId): PatronState {
  const faction = state.factions.find((f) => f.id === factionId);
  if (!faction) {
    throw new Error(`Faction not found: ${factionId}`);
  }
  if (!faction.patron_state) {
    faction.patron_state = {
      material_support_level: 0.5,
      diplomatic_isolation: 0,
      constraint_severity: 0.3,
      patron_commitment: 0.5,
      last_updated: state.meta.turn
    };
  }
  return faction.patron_state;
}

export function updateInternationalVisibilityPressure(
  state: GameState,
  sarajevo: SarajevoState | undefined,
  enclaveHumanitarianPressure: number
): InternationalVisibilityPressure {
  const ivp = ensureInternationalVisibilityPressure(state);
  const turn = state.meta.turn;
  const prev = { ...ivp };

  const sarajevoVisibility = sarajevo ? sarajevo.siege_intensity * SARAJEVO_VISIBILITY_RATE : 0;
  ivp.sarajevo_siege_visibility = clamp01(ivp.sarajevo_siege_visibility + sarajevoVisibility);
  ivp.enclave_humanitarian_pressure = clamp01(enclaveHumanitarianPressure * ENCLAVE_PRESSURE_WEIGHT);
  ivp.atrocity_visibility = clamp01(ivp.atrocity_visibility);

  const negotiationPressure = state.factions.reduce((sum, f) => sum + (f.negotiation?.pressure ?? 0), 0);
  ivp.negotiation_momentum = clamp01(negotiationPressure / 100);

  const totalDelta =
    Math.abs(ivp.sarajevo_siege_visibility - prev.sarajevo_siege_visibility) +
    Math.abs(ivp.enclave_humanitarian_pressure - prev.enclave_humanitarian_pressure) +
    Math.abs(ivp.atrocity_visibility - prev.atrocity_visibility) +
    Math.abs(ivp.negotiation_momentum - prev.negotiation_momentum);
  if (totalDelta > 0.1) {
    ivp.last_major_shift = turn;
  }

  return ivp;
}

export function updatePatronState(
  state: GameState,
  sarajevo: SarajevoState | undefined,
  ivp: InternationalVisibilityPressure
): void {
  const turn = state.meta.turn;
  const year = getYearForTurn(turn);
  for (const faction of state.factions) {
    const patron = ensurePatronState(state, faction.id);
    const base = patronCommitmentBase(faction.id, year);
    const atrocity = ivp.atrocity_visibility;
    const momentum = ivp.negotiation_momentum;

    const nextCommitment = clamp01(base * (1.0 - atrocity * 0.1) * (1.0 + momentum * 0.05));
    const sarajevoIsolation = sarajevo?.siege_status === 'BESIEGED' ? SARAJEVO_ISOLATION_RATE : 0;
    const nextDiplomaticIsolation = clamp01(patron.diplomatic_isolation + sarajevoIsolation);

    const materialSupport = clamp01(base + nextCommitment * 0.1 - nextDiplomaticIsolation * 0.1);
    const constraintSeverity = clamp01(0.3 + momentum * 0.2 + ivp.enclave_humanitarian_pressure * 0.1);

    patron.patron_commitment = nextCommitment;
    patron.diplomatic_isolation = nextDiplomaticIsolation;
    patron.material_support_level = materialSupport;
    patron.constraint_severity = constraintSeverity;
    patron.last_updated = turn;
  }
}

export function getExhaustionExternalModifier(patron: PatronState | undefined, ivp: InternationalVisibilityPressure | undefined): number {
  if (!patron || !ivp) return 0;
  const diplomatic = patron.diplomatic_isolation * EXHAUSTION_DIPLOMATIC_MULTIPLIER;
  const momentum = ivp.negotiation_momentum * NEGOTIATION_MOMENTUM_MULTIPLIER;
  const resistance = patron.patron_commitment * PATRON_COMMITMENT_RESISTANCE;
  return diplomatic + momentum - resistance;
}

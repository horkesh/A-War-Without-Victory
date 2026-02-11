import type { GameState, CapabilityProfile, FactionId } from './game_state.js';

function getYearForTurn(turn: number): number {
  if (turn < 0 || !Number.isFinite(turn)) return 1992;
  const yearOffset = Math.floor(turn / 52);
  return Math.min(1995, 1992 + yearOffset);
}

function getHrhbPhase(turn: number): '1994_pre' | '1994_post' {
  const yearOffset = Math.floor(turn / 52);
  const turnWithinYear = turn - yearOffset * 52;
  return turnWithinYear < 26 ? '1994_pre' : '1994_post';
}

function arbiHProfile(year: number): CapabilityProfile {
  if (year <= 1992) {
    return {
      year,
      equipment_access: 0.15,
      training_quality: 0.35,
      organizational_maturity: 0.25,
      doctrine_effectiveness: { INFILTRATE: 0.6, ATTACK: 0.5, DEFEND: 0.6 }
    };
  }
  if (year === 1993) {
    return {
      year,
      equipment_access: 0.25,
      training_quality: 0.55,
      organizational_maturity: 0.45,
      doctrine_effectiveness: { INFILTRATE: 0.75, ATTACK: 0.65, DEFEND: 0.75 }
    };
  }
  if (year === 1994) {
    return {
      year,
      equipment_access: 0.4,
      training_quality: 0.75,
      organizational_maturity: 0.7,
      doctrine_effectiveness: { INFILTRATE: 0.85, ATTACK: 0.8, DEFEND: 0.85 }
    };
  }
  return {
    year,
    equipment_access: 0.5,
    training_quality: 0.85,
    organizational_maturity: 0.85,
    doctrine_effectiveness: { INFILTRATE: 0.9, ATTACK: 0.9, DEFEND: 0.9 }
  };
}

function vrsProfile(year: number): CapabilityProfile {
  if (year <= 1992) {
    return {
      year,
      equipment_operational: 0.9,
      training_quality: 0.8,
      organizational_maturity: 0.85,
      doctrine_effectiveness: { ARTILLERY_COUNTER: 1.0, STATIC_DEFENSE: 0.95, ATTACK: 0.9 }
    };
  }
  if (year === 1993) {
    return {
      year,
      equipment_operational: 0.75,
      training_quality: 0.75,
      organizational_maturity: 0.8,
      doctrine_effectiveness: { ARTILLERY_COUNTER: 0.9, STATIC_DEFENSE: 0.9, ATTACK: 0.8 }
    };
  }
  if (year === 1994) {
    return {
      year,
      equipment_operational: 0.6,
      training_quality: 0.7,
      organizational_maturity: 0.75,
      doctrine_effectiveness: { ARTILLERY_COUNTER: 0.75, STATIC_DEFENSE: 0.8, ATTACK: 0.65 }
    };
  }
  return {
    year,
    equipment_operational: 0.5,
    training_quality: 0.65,
    organizational_maturity: 0.7,
    doctrine_effectiveness: { ARTILLERY_COUNTER: 0.65, STATIC_DEFENSE: 0.75, ATTACK: 0.55 }
  };
}

function hrhbProfile(year: number, phase: '1994_pre' | '1994_post'): CapabilityProfile {
  if (year <= 1992) {
    return {
      year,
      equipment_access: 0.6,
      training_quality: 0.5,
      organizational_maturity: 0.45,
      croatian_support: 0.7,
      doctrine_effectiveness: { ATTACK: 0.65, DEFEND: 0.7 }
    };
  }
  if (year === 1993) {
    return {
      year,
      equipment_access: 0.55,
      training_quality: 0.45,
      organizational_maturity: 0.4,
      croatian_support: 0.8,
      doctrine_effectiveness: { ATTACK: 0.6, DEFEND: 0.65 }
    };
  }
  if (year === 1994 && phase === '1994_pre') {
    return {
      year,
      equipment_access: 0.5,
      training_quality: 0.5,
      organizational_maturity: 0.45,
      croatian_support: 0.5,
      doctrine_effectiveness: { ATTACK: 0.55, DEFEND: 0.7 }
    };
  }
  if (year === 1994) {
    return {
      year,
      equipment_access: 0.65,
      training_quality: 0.65,
      organizational_maturity: 0.6,
      croatian_support: 0.9,
      doctrine_effectiveness: { COORDINATED_STRIKE: 0.75, ATTACK: 0.7, DEFEND: 0.8 }
    };
  }
  return {
    year,
    equipment_access: 0.7,
    training_quality: 0.75,
    organizational_maturity: 0.7,
    croatian_support: 1.0,
    doctrine_effectiveness: { COORDINATED_STRIKE: 0.9, ATTACK: 0.8, DEFEND: 0.85 }
  };
}

export function updateCapabilityProfiles(state: GameState): void {
  const year = getYearForTurn(state.meta.turn);
  const hrhbPhase = year === 1994 ? getHrhbPhase(state.meta.turn) : '1994_post';
  for (const faction of state.factions) {
    let profile: CapabilityProfile;
    if (faction.id === 'RBiH') profile = arbiHProfile(year);
    else if (faction.id === 'RS') profile = vrsProfile(year);
    else if (faction.id === 'HRHB') profile = hrhbProfile(year, hrhbPhase);
    else profile = { year, training_quality: 0.5, organizational_maturity: 0.5, doctrine_effectiveness: {} };

    faction.capability_profile = profile;
  }
}

export function getFactionCapabilityModifier(state: GameState, factionId: FactionId, doctrine: string): number {
  const faction = state.factions.find((f) => f.id === factionId);
  const profile = faction?.capability_profile;
  if (!profile || !profile.doctrine_effectiveness) return 1.0;
  const value = profile.doctrine_effectiveness[doctrine];
  return typeof value === 'number' ? value : 1.0;
}

import type { FactionId, OrganizationalPenetration } from './game_state.js';

export const ORG_PEN_FORMULA_CONSTANTS = {
    population_share_sufficient_threshold: 0.35,
    party: {
        base: 20,
        mayor_bonus: 35,
        population_bonus: 20,
        brigade_bonus: 10,
        min: 0,
        max: 85
    },
    paramilitary: {
        base: 5,
        population_bonus: 20,
        brigade_bonus: 35,
        min: 0,
        max: 60
    }
} as const;

export interface OrganizationalPenetrationFormulaInputs {
    controller: FactionId | null;
    aligned_population_share_by_faction: Partial<Record<FactionId, number>>;
    planned_war_start_brigade_by_faction: Partial<Record<FactionId, boolean>>;
}

function clampInt(value: number, min: number, max: number): number {
    const bounded = Math.max(min, Math.min(max, value));
    return Math.round(bounded);
}

function clampShare(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function hasSufficientPopulation(share: number): boolean {
    return share >= ORG_PEN_FORMULA_CONSTANTS.population_share_sufficient_threshold;
}

function getAlignedShare(inputs: OrganizationalPenetrationFormulaInputs, faction: FactionId): number {
    return clampShare(inputs.aligned_population_share_by_faction[faction] ?? 0);
}

function hasPlannedWarStartBrigade(inputs: OrganizationalPenetrationFormulaInputs, faction: FactionId): boolean {
    return inputs.planned_war_start_brigade_by_faction[faction] === true;
}

function derivePoliceLoyalty(inputs: OrganizationalPenetrationFormulaInputs): 'loyal' | 'mixed' | 'hostile' {
    const controller = inputs.controller;
    if (controller == null) return 'mixed';
    const share = getAlignedShare(inputs, controller);
    const hasBrigade = hasPlannedWarStartBrigade(inputs, controller);
    if (hasSufficientPopulation(share) && hasBrigade) return 'loyal';
    if (hasSufficientPopulation(share) || hasBrigade) return 'mixed';
    return 'hostile';
}

function deriveToControl(inputs: OrganizationalPenetrationFormulaInputs): 'controlled' | 'contested' | 'lost' {
    const controller = inputs.controller;
    if (controller == null) return 'contested';
    const share = getAlignedShare(inputs, controller);
    const hasBrigade = hasPlannedWarStartBrigade(inputs, controller);
    if (hasSufficientPopulation(share) && hasBrigade) return 'controlled';
    if (hasSufficientPopulation(share) || hasBrigade) return 'contested';
    return 'lost';
}

function derivePartyPenetration(inputs: OrganizationalPenetrationFormulaInputs, faction: FactionId): number {
    let score = ORG_PEN_FORMULA_CONSTANTS.party.base;
    const share = getAlignedShare(inputs, faction);
    if (inputs.controller === faction) score += ORG_PEN_FORMULA_CONSTANTS.party.mayor_bonus;
    if (hasSufficientPopulation(share)) score += ORG_PEN_FORMULA_CONSTANTS.party.population_bonus;
    if (hasPlannedWarStartBrigade(inputs, faction)) score += ORG_PEN_FORMULA_CONSTANTS.party.brigade_bonus;
    return clampInt(score, ORG_PEN_FORMULA_CONSTANTS.party.min, ORG_PEN_FORMULA_CONSTANTS.party.max);
}

function deriveParamilitaryPresence(inputs: OrganizationalPenetrationFormulaInputs, faction: FactionId): number {
    let score = ORG_PEN_FORMULA_CONSTANTS.paramilitary.base;
    const share = getAlignedShare(inputs, faction);
    if (hasSufficientPopulation(share)) score += ORG_PEN_FORMULA_CONSTANTS.paramilitary.population_bonus;
    if (hasPlannedWarStartBrigade(inputs, faction)) score += ORG_PEN_FORMULA_CONSTANTS.paramilitary.brigade_bonus;
    return clampInt(score, ORG_PEN_FORMULA_CONSTANTS.paramilitary.min, ORG_PEN_FORMULA_CONSTANTS.paramilitary.max);
}

export function deriveOrganizationalPenetrationFromFormula(
    inputs: OrganizationalPenetrationFormulaInputs
): OrganizationalPenetration {
    const partyByFaction: Record<FactionId, number> = {
        RBiH: derivePartyPenetration(inputs, 'RBiH'),
        RS: derivePartyPenetration(inputs, 'RS'),
        HRHB: derivePartyPenetration(inputs, 'HRHB')
    };
    const paramilitaryByFaction: Record<FactionId, number> = {
        RBiH: deriveParamilitaryPresence(inputs, 'RBiH'),
        RS: deriveParamilitaryPresence(inputs, 'RS'),
        HRHB: deriveParamilitaryPresence(inputs, 'HRHB')
    };

    return {
        police_loyalty: derivePoliceLoyalty(inputs),
        to_control: deriveToControl(inputs),
        sda_penetration: partyByFaction.RBiH,
        sds_penetration: partyByFaction.RS,
        hdz_penetration: partyByFaction.HRHB,
        patriotska_liga: paramilitaryByFaction.RBiH,
        paramilitary_rs: paramilitaryByFaction.RS,
        paramilitary_hrhb: paramilitaryByFaction.HRHB
    };
}

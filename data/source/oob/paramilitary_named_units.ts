import type { FactionId } from '../../../src/state/game_state.js';

export type ParamilitaryNamedUnitMode = 'rear_pocket' | 'offensive';

export interface ParamilitaryNamedUnit {
    faction: FactionId;
    mode: ParamilitaryNamedUnitMode;
    name: string;
    citation: string;
    available_from?: number;
    available_to?: number;
}

export const PARAMILITARY_NAMED_UNITS: readonly ParamilitaryNamedUnit[] = [
    {
        faction: 'RBiH',
        mode: 'rear_pocket',
        name: 'Patriotska Liga / Green Berets',
        citation: 'BB1 p.166-168',
        available_to: 28,
    },
    {
        faction: 'HRHB',
        mode: 'offensive',
        name: 'HOS',
        citation: 'BB1 p.170',
        available_to: 28,
    },
    {
        faction: 'HRHB',
        mode: 'rear_pocket',
        name: "Convicts' Battalion",
        citation: 'ICTY Naletilic IT-98-34',
    },
    {
        faction: 'RS',
        mode: 'offensive',
        name: "Arkan's Tigers",
        citation: 'BB1 p.173-174',
    },
    {
        faction: 'RS',
        mode: 'offensive',
        name: 'White Eagles',
        citation: 'BB1 p.173',
    },
] as const;

export function lookupParamilitaryNamedUnit(
    faction: FactionId,
    mode: ParamilitaryNamedUnitMode,
    spawnIndex: number,
    turn: number,
): ParamilitaryNamedUnit | undefined {
    const candidates = PARAMILITARY_NAMED_UNITS
        .filter((unit) =>
            unit.faction === faction
            && unit.mode === mode
            && (unit.available_from === undefined || turn >= unit.available_from)
            && (unit.available_to === undefined || turn <= unit.available_to)
        );
    if (candidates.length === 0) return undefined;
    const index = Math.max(0, Math.trunc(spawnIndex)) % candidates.length;
    return candidates[index];
}

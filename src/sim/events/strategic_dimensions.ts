import type { DimensionId } from './event_types.js';

export const DIMENSION_IDS: DimensionId[] = [
    'military_credibility',
    'territorial_legitimacy',
    'international_standing',
    'patron_confidence',
    'internal_cohesion',
    'negotiating_leverage',
];

const CANONICAL_FACTIONS = ['RBiH', 'RS', 'HRHB'];

export interface DimensionStore {
    [faction: string]: {
        [dimension: string]: {
            base_value: number;
            event_modifier: number;
            effective_value: number;
        };
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function initializeStrategicDimensions(): DimensionStore {
    const store: DimensionStore = {};
    for (const faction of CANONICAL_FACTIONS) {
        store[faction] = {};
        for (const dim of DIMENSION_IDS) {
            store[faction][dim] = { base_value: 50, event_modifier: 0, effective_value: 50 };
        }
    }
    return store;
}

export function applyDimensionShift(store: DimensionStore, faction: string, dimension: string, delta: number): void {
    if (!store[faction]?.[dimension]) return;
    const dim = store[faction][dimension];
    dim.event_modifier += delta;
    dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
}

export function getDimensionEffective(store: DimensionStore, faction: string, dimension: string): number {
    return store[faction]?.[dimension]?.effective_value ?? 50;
}

export function updateBaseValue(store: DimensionStore, faction: string, dimension: string, newBase: number): void {
    if (!store[faction]?.[dimension]) return;
    const dim = store[faction][dimension];
    dim.base_value = clamp(newBase, 0, 100);
    dim.effective_value = clamp(dim.base_value + dim.event_modifier, 0, 100);
}

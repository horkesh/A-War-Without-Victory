/**
 * Brigade combat accolades — informal titles earned from cumulative performance.
 *
 * Unlike decorations (formal military honors), accolades are computed from
 * BrigadeHistory stats and reflect the brigade's combat character. Multiple
 * accolades can coexist. Purely presentational — no gameplay effect.
 *
 * Computed on demand (not stored on FormationState).
 */

import type { BrigadeHistory } from './brigade_history.js';

export interface BrigadeAccolade {
    /** Machine-readable identifier. */
    id: string;
    /** Display name for UI. */
    label: string;
    /** Short description of how it was earned. */
    description: string;
    /** Icon hint for UI rendering. */
    icon: string;
}

interface AccoladeRule {
    id: string;
    label: string;
    description: string;
    icon: string;
    test: (h: BrigadeHistory) => boolean;
}

const ACCOLADE_RULES: AccoladeRule[] = [
    // Equipment-based
    {
        id: 'tank_hunters',
        label: 'Tank Hunters',
        description: 'Destroyed 10+ enemy tanks',
        icon: 'tank-destroy',
        test: h => h.total_equipment_destroyed.tanks >= 10,
    },
    {
        id: 'artillery_killers',
        label: 'Artillery Killers',
        description: 'Destroyed 15+ enemy artillery pieces',
        icon: 'artillery-destroy',
        test: h => h.total_equipment_destroyed.artillery >= 15,
    },
    {
        id: 'scavengers',
        label: 'Scavengers',
        description: 'Captured 5+ enemy heavy weapons',
        icon: 'capture',
        test: h => (h.total_equipment_captured.tanks + h.total_equipment_captured.artillery) >= 5,
    },
    {
        id: 'armored_fist',
        label: 'Armored Fist',
        description: 'Destroyed 25+ enemy tanks',
        icon: 'tank-destroy-elite',
        test: h => h.total_equipment_destroyed.tanks >= 25,
    },
    // Combat-based
    {
        id: 'blooded',
        label: 'Blooded',
        description: 'Fought 10+ battles',
        icon: 'crossed-swords',
        test: h => h.battles_fought >= 10,
    },
    {
        id: 'veterans',
        label: 'Veterans',
        description: 'Fought 20+ battles',
        icon: 'veteran-star',
        test: h => h.battles_fought >= 20,
    },
    {
        id: 'iron_wall',
        label: 'Iron Wall',
        description: 'Longest defense streak of 5+',
        icon: 'shield',
        test: h => h.longest_defense_streak >= 5,
    },
    {
        id: 'breakthrough',
        label: 'Breakthrough',
        description: 'Captured 5+ enemy OSIDs',
        icon: 'arrow-advance',
        test: h => h.total_osids_captured >= 5,
    },
    {
        id: 'conquerors',
        label: 'Conquerors',
        description: 'Captured 10+ enemy OSIDs',
        icon: 'flag-capture',
        test: h => h.total_osids_captured >= 10,
    },
    {
        id: 'undefeated',
        label: 'Undefeated',
        description: '10+ battles without a defeat',
        icon: 'crown',
        test: h => h.battles_fought >= 10 && h.defeats === 0,
    },
    {
        id: 'last_stand',
        label: 'Last Stand',
        description: 'Survived personnel nadir below 200',
        icon: 'skull-crossbones',
        test: h => h.nadir_personnel > 0 && h.nadir_personnel < 200,
    },
    {
        id: 'meat_grinder',
        label: 'Meat Grinder',
        description: 'Inflicted 3000+ enemy casualties',
        icon: 'casualty-heavy',
        test: h => h.total_casualties_inflicted >= 3000,
    },
];

/**
 * Compute all accolades a brigade has earned based on its history.
 * Returns empty array if no history or no accolades earned.
 */
export function computeBrigadeAccolades(history: BrigadeHistory | undefined): BrigadeAccolade[] {
    if (!history) return [];
    const earned: BrigadeAccolade[] = [];
    for (const rule of ACCOLADE_RULES) {
        if (rule.test(history)) {
            earned.push({
                id: rule.id,
                label: rule.label,
                description: rule.description,
                icon: rule.icon,
            });
        }
    }
    return earned;
}

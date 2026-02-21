/**
 * Recruitment system types (recruitment_system_design_note.md).
 *
 * Three-resource recruitment: manpower (militia pools), recruitment capital (organizational readiness),
 * equipment points (heavy weapons/vehicles). Brigades are activated from the OOB catalog at a cost,
 * replacing auto-spawn of all 261 OOB brigades.
 */

import type { FactionId } from './game_state.js';

// ---------------------------------------------------------------------------
// Equipment classes
// ---------------------------------------------------------------------------

/** Equipment class determines a brigade's starting composition and equipment cost. */
export type EquipmentClass =
    | 'mechanized'       // tanks + APCs + infantry (RS JNA inheritance)
    | 'motorized'        // vehicles + infantry, light armor
    | 'mountain'         // light infantry, minimal vehicles
    | 'light_infantry'   // foot infantry, improvised
    | 'garrison'         // static defense, minimal mobility
    | 'police'           // police-origin, light arms
    | 'special';         // guards, elite -- higher cohesion, lower numbers

/** Starting composition template for an equipment class. */
export interface EquipmentClassTemplate {
    infantry: number;
    tanks: number;
    artillery: number;
    aa_systems: number;
    equipment_cost: number;
}

/** All valid equipment classes in downgrade order (heaviest first). */
export const EQUIPMENT_CLASS_DOWNGRADE_CHAIN: readonly EquipmentClass[] = [
    'mechanized',
    'motorized',
    'mountain',
    'light_infantry'
] as const;

/** Equipment class templates: class -> starting composition + cost. */
export const EQUIPMENT_CLASS_TEMPLATES: Readonly<Record<EquipmentClass, EquipmentClassTemplate>> = {
    mechanized: { infantry: 800, tanks: 12, artillery: 6, aa_systems: 2, equipment_cost: 40 },
    motorized: { infantry: 850, tanks: 4, artillery: 4, aa_systems: 1, equipment_cost: 20 },
    mountain: { infantry: 800, tanks: 0, artillery: 2, aa_systems: 0, equipment_cost: 5 },
    light_infantry: { infantry: 800, tanks: 0, artillery: 1, aa_systems: 0, equipment_cost: 0 },
    garrison: { infantry: 600, tanks: 0, artillery: 2, aa_systems: 1, equipment_cost: 5 },
    police: { infantry: 500, tanks: 0, artillery: 0, aa_systems: 0, equipment_cost: 0 },
    special: { infantry: 400, tanks: 0, artillery: 0, aa_systems: 0, equipment_cost: 5 }
};

// ---------------------------------------------------------------------------
// Resource pools
// ---------------------------------------------------------------------------

/** Per-faction recruitment capital (organizational readiness, cadre availability). */
export interface RecruitmentCapital {
    faction: FactionId;
    points: number;           // available to spend
    points_initial: number;   // set by pre-war phase outcome
}

/** Per-faction equipment pool (heavy weapons, vehicles, ammunition stocks). */
export interface EquipmentPool {
    faction: FactionId;
    points: number;           // available to spend
    points_initial: number;   // set by pre-war phase outcome
}

// ---------------------------------------------------------------------------
// Recruitment state (stored on GameState)
// ---------------------------------------------------------------------------

/** Per-faction recruitment resource state. */
export interface RecruitmentResourceState {
    recruitment_capital: Record<FactionId, RecruitmentCapital>;
    equipment_pools: Record<FactionId, EquipmentPool>;
    /** Optional fixed per-turn accrual by faction (scenario-configured). */
    recruitment_capital_trickle?: Record<FactionId, number>;
    /** Optional fixed per-turn equipment trickle by faction (scenario-configured). */
    equipment_points_trickle?: Record<FactionId, number>;
    /** Deterministic cap for elective recruits per faction per turn. */
    max_recruits_per_faction_per_turn?: number;
    /** Brigade IDs that have been recruited (activated from catalog). */
    recruited_brigade_ids: string[];
}

// ---------------------------------------------------------------------------
// Recruitment report
// ---------------------------------------------------------------------------

/** Report from a single recruitment action. */
export interface RecruitmentAction {
    brigade_id: string;
    faction: FactionId;
    home_mun: string;
    equipment_class: EquipmentClass;
    manpower_spent: number;
    capital_spent: number;
    equipment_spent: number;
    mandatory: boolean;
}

/** Report from a full setup-phase recruitment pass. */
export interface SetupPhaseRecruitmentReport {
    actions: RecruitmentAction[];
    mandatory_recruited: number;
    elective_recruited: number;
    brigades_skipped_no_control: number;
    brigades_skipped_no_manpower: number;
    brigades_skipped_no_capital: number;
    brigades_skipped_no_equipment: number;
    remaining_capital: Record<FactionId, number>;
    remaining_equipment: Record<FactionId, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the equipment cost for a given class. */
export function getEquipmentCost(equipmentClass: EquipmentClass): number {
    return EQUIPMENT_CLASS_TEMPLATES[equipmentClass].equipment_cost;
}

/** Find the best affordable equipment class, downgrading from preferred. */
export function bestAffordableClass(
    preferred: EquipmentClass,
    availableEquipment: number
): EquipmentClass {
    // Try preferred first
    if (getEquipmentCost(preferred) <= availableEquipment) return preferred;

    // Build downgrade chain starting from preferred
    const chainIdx = EQUIPMENT_CLASS_DOWNGRADE_CHAIN.indexOf(preferred);
    if (chainIdx >= 0) {
        for (let i = chainIdx + 1; i < EQUIPMENT_CLASS_DOWNGRADE_CHAIN.length; i++) {
            const cls = EQUIPMENT_CLASS_DOWNGRADE_CHAIN[i]!;
            if (getEquipmentCost(cls) <= availableEquipment) return cls;
        }
    }

    // light_infantry is always affordable (cost 0)
    return 'light_infantry';
}

/** Validate that a string is a valid EquipmentClass. */
export function isValidEquipmentClass(value: string): value is EquipmentClass {
    return value in EQUIPMENT_CLASS_TEMPLATES;
}

/** Default recruitment cost values when not specified in OOB data. */
export const RECRUITMENT_DEFAULTS = {
    manpower_cost: 800,
    capital_cost: 10,
    default_equipment_class: 'light_infantry' as EquipmentClass,
    priority: 50,
    mandatory: false,
    available_from: 0,
    max_personnel: 3000
} as const;

/** Default starting resource values by faction. */
export const DEFAULT_FACTION_RESOURCES: Readonly<Record<string, { capital: number; equipment: number }>> = {
    RS: { capital: 250, equipment: 300 },
    RBiH: { capital: 150, equipment: 60 },
    HRHB: { capital: 100, equipment: 120 }
} as const;

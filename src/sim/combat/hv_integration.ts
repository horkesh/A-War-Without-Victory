/**
 * HV (Croatian Army) Integration — Post-Washington Agreement brigade spawning.
 *
 * After the Washington Agreement is signed + a preparation delay of HV_PREPARATION_DELAY
 * weeks, 4 HV brigades spawn as HRHB-faction formations on the western front.
 *
 * These represent the Croatian Army commitment that historically enabled
 * Operation Storm / Operation Mistral (Summer 1995). They are:
 *   - High equipment (tanks, artillery from Zagreb's stockpiles)
 *   - High cohesion/morale (professional Croatian Army, not militia)
 *   - Bot-controlled (follow Zagreb strategic directives, not player orders)
 *   - Assigned to western front sectors (Glamoč, Livno, Kupres direction)
 *
 * Key mechanical effect: sudden increase in western front pressure on RS,
 * enabling the Federation counter-offensive arc.
 *
 * Deterministic: fixed brigade roster, deterministic timing, no randomness.
 *
 * Design source: docs/plans/2026-03-15-endgame-negotiation-implementation.md §6.3
 */

import type {
    BrigadeComposition,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Weeks after Washington Agreement before HV brigades arrive. */
export const HV_PREPARATION_DELAY = 6;

/** Corps assignment for spawned HV brigades. */
export const HV_CORPS_ID = 'hvo_tomislavgrad' as FormationId;

// ═══════════════════════════════════════════════════════════════════════════
// HV Brigade Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface HvBrigadeDef {
    id: FormationId;
    name: string;
    personnel: number;
    cohesion: number;
    morale: number;
    experience: number;
    equipment_class: string;
    location_osid: string;
    composition: BrigadeComposition;
    /** True = elite formation (no home distance penalty). */
    is_elite: boolean;
}

/**
 * 4 HV brigade templates representing the Croatian Army commitment.
 * Historical units, fixed stats. Spawned as HRHB faction, origin 'hv'.
 */
export const HV_BRIGADE_DEFS: readonly HvBrigadeDef[] = [
    {
        id: 'hv_4th_guards_split' as FormationId,
        name: 'HV 4th Guards Brigade (Split)',
        personnel: 3000,
        cohesion: 80,
        morale: 85,
        experience: 0.65,
        equipment_class: 'mechanized',
        location_osid: 'op:livno:livno_2',
        is_elite: true,
        composition: {
            infantry: 2000,
            tanks: 40,
            artillery: 30,
            aa_systems: 4,
            tank_condition: { operational: 0.92, degraded: 0.06, non_operational: 0.02 },
            artillery_condition: { operational: 0.92, degraded: 0.06, non_operational: 0.02 },
        },
    },
    {
        id: 'hv_7th_guards_varazdin' as FormationId,
        name: 'HV 7th Guards Brigade (Varaždin)',
        personnel: 2500,
        cohesion: 80,
        morale: 85,
        experience: 0.60,
        equipment_class: 'motorized',
        location_osid: 'op:tomislavgrad:tomislavgrad_2',
        is_elite: true,
        composition: {
            infantry: 1800,
            tanks: 20,
            artillery: 25,
            aa_systems: 3,
            tank_condition: { operational: 0.90, degraded: 0.07, non_operational: 0.03 },
            artillery_condition: { operational: 0.90, degraded: 0.07, non_operational: 0.03 },
        },
    },
    {
        id: 'hv_1st_guards_tigers' as FormationId,
        name: 'HV 1st Guards Brigade (Tigers)',
        personnel: 2000,
        cohesion: 85,
        morale: 90,
        experience: 0.70,
        equipment_class: 'motorized',
        location_osid: 'op:glamoc:glamoc_2',
        is_elite: true,
        composition: {
            infantry: 1400,
            tanks: 15,
            artillery: 20,
            aa_systems: 3,
            tank_condition: { operational: 0.93, degraded: 0.05, non_operational: 0.02 },
            artillery_condition: { operational: 0.93, degraded: 0.05, non_operational: 0.02 },
        },
    },
    {
        id: 'hv_5th_guards_karlovac' as FormationId,
        name: 'HV 5th Guards Brigade (Karlovac)',
        personnel: 2500,
        cohesion: 78,
        morale: 82,
        experience: 0.55,
        equipment_class: 'light_infantry',
        location_osid: 'op:kupres:bucovaca',
        is_elite: false,
        composition: {
            infantry: 2000,
            tanks: 10,
            artillery: 15,
            aa_systems: 2,
            tank_condition: { operational: 0.88, degraded: 0.08, non_operational: 0.04 },
            artillery_condition: { operational: 0.88, degraded: 0.08, non_operational: 0.04 },
        },
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// Report type
// ═══════════════════════════════════════════════════════════════════════════

export interface HvIntegrationReport {
    /** Whether Washington is signed. */
    washington_signed: boolean;
    /** Turn Washington was signed (null if not). */
    washington_turn: number | null;
    /** Whether HV brigades already spawned on a previous turn. */
    already_spawned: boolean;
    /** Whether HV brigades spawned this turn. */
    spawned_this_turn: boolean;
    /** IDs of brigades spawned (empty if not spawned). */
    spawned_brigade_ids: string[];
    /** Turns remaining until spawn (0 if already spawned or spawning now, -1 if Washington not signed). */
    turns_until_spawn: number;
}

type HvFormationState = FormationState & {
    is_elite?: true;
};

// ═══════════════════════════════════════════════════════════════════════════
// Spawn logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Spawn a single HV brigade into the game state.
 * Called by tickHvIntegration when conditions are met.
 */
function spawnHvBrigade(state: GameState, def: HvBrigadeDef): void {
    const turn = state.meta.turn;

    const formation: HvFormationState = {
        id: def.id,
        faction: 'HRHB',
        name: def.name,
        created_turn: turn,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: def.personnel,
        corps_id: HV_CORPS_ID,
        location_osid: def.location_osid,
        home_osid: def.location_osid,
        posture: 'attack',
        cohesion: def.cohesion,
        morale: def.morale,
        experience: def.experience,
        equipment_class: def.equipment_class,
        // E-B2: tag with both legacy 'hv_origin' (existing readers) and the
        // synthesis §3 E-B2 'attached_source:hv' so the Una negative-control
        // gate in sector_offensive.ts can detect HV-dominant operations
        // without adding a new FormationState field.
        tags: ['hv_origin', 'attached_source:hv', `corps:${HV_CORPS_ID}`],
        composition: { ...def.composition },
    };

    // Mark as elite if applicable (no home distance debuff)
    if (def.is_elite) {
        formation.is_elite = true;
    }

    state.military.formations[def.id] = formation;
}

/**
 * Tick HV integration: check if Washington is signed + delay elapsed,
 * then spawn HV brigades exactly once.
 *
 * Must run AFTER washington-check in the pipeline.
 * Pure function of state; deterministic.
 */
export function tickHvIntegration(state: GameState): HvIntegrationReport {
    const rhs = state.political.rbih_hrhb_state;

    // Not signed yet
    if (!rhs?.washington_signed || rhs.washington_turn == null) {
        return {
            washington_signed: false,
            washington_turn: null,
            already_spawned: false,
            spawned_this_turn: false,
            spawned_brigade_ids: [],
            turns_until_spawn: -1,
        };
    }

    // Already spawned on a previous turn
    if (state.meta.hv_brigades_spawned === true) {
        return {
            washington_signed: true,
            washington_turn: rhs.washington_turn,
            already_spawned: true,
            spawned_this_turn: false,
            spawned_brigade_ids: [],
            turns_until_spawn: 0,
        };
    }

    // Check preparation delay
    const turnsSinceWashington = state.meta.turn - rhs.washington_turn;
    if (turnsSinceWashington < HV_PREPARATION_DELAY) {
        return {
            washington_signed: true,
            washington_turn: rhs.washington_turn,
            already_spawned: false,
            spawned_this_turn: false,
            spawned_brigade_ids: [],
            turns_until_spawn: HV_PREPARATION_DELAY - turnsSinceWashington,
        };
    }

    // Spawn HV brigades
    if (!state.military.formations) state.military.formations = {};

    const spawnedIds: string[] = [];
    for (const def of HV_BRIGADE_DEFS) {
        // Guard: don't spawn if somehow already exists
        if (state.military.formations[def.id]) continue;

        spawnHvBrigade(state, def);
        spawnedIds.push(def.id);
    }

    // Mark as spawned (one-shot flag)
    state.meta = { ...state.meta, hv_brigades_spawned: true };

    return {
        washington_signed: true,
        washington_turn: rhs.washington_turn,
        already_spawned: false,
        spawned_this_turn: true,
        spawned_brigade_ids: spawnedIds.sort(strictCompare),
        turns_until_spawn: 0,
    };
}

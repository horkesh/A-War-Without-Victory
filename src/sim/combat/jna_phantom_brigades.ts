/**
 * JNA Phantom Brigades — temporary formations representing JNA assets
 * that fought alongside VRS in the first weeks of the war.
 *
 * They carry heavy equipment (tanks, artillery, APCs) that gets handed off
 * to VRS brigades when the JNA withdraws. Personnel disappear (returned to Serbia).
 *
 * Pipeline integration:
 *   spawn: called once at scenario start (before first runTurn)
 *   withdrawal: checked each turn during war phases
 *
 * Deterministic: sorted iteration, no randomness.
 */

import type {
    BrigadeComposition,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Equipment ceilings per equipment_class
// ═══════════════════════════════════════════════════════════════════════════

const EQUIPMENT_CEILINGS: Record<string, { max_tanks: number; max_artillery: number; max_apcs: number }> = {
    mechanized:      { max_tanks: 25, max_artillery: 20, max_apcs: 15 },
    motorized:       { max_tanks: 15, max_artillery: 15, max_apcs: 12 },
    light_infantry:  { max_tanks: 5,  max_artillery: 10, max_apcs: 8 },
    mountain:        { max_tanks: 3,  max_artillery: 8,  max_apcs: 5 },
    garrison:        { max_tanks: 2,  max_artillery: 6,  max_apcs: 3 },
    police:          { max_tanks: 0,  max_artillery: 2,  max_apcs: 2 },
    special:         { max_tanks: 2,  max_artillery: 4,  max_apcs: 3 },
};

function getEquipmentCeiling(equipmentClass: string | undefined) {
    return EQUIPMENT_CEILINGS[equipmentClass ?? 'light_infantry']
        ?? EQUIPMENT_CEILINGS['light_infantry']!;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phantom brigade definitions
// ═══════════════════════════════════════════════════════════════════════════

interface PhantomDef {
    id: FormationId;
    name: string;
    corps_id: FormationId;
    location_osid: string;
    withdrawal_turn: number;
    tanks: number;
    artillery: number;
    apcs: number;
    /** Ghost phantoms capture OSIDs at spawn and dissolve without equipment handoff. */
    capture_osids?: string[];
    /** If true, equipment disappears on withdrawal (not distributed to corps). */
    no_equipment_handoff?: boolean;
}

const JNA_PHANTOM_DEFS: PhantomDef[] = [
    {
        id: 'jna_uzice_corps_tg' as FormationId,
        name: 'JNA Uzice Corps Task Group',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:visegrad:visegrad_2',
        withdrawal_turn: 4,
        tanks: 30, artillery: 20, apcs: 8,
    },
    {
        id: 'jna_mostar_garrison_tg' as FormationId,
        name: 'JNA Mostar Garrison TG',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:foca:foca_3',
        withdrawal_turn: 5,
        tanks: 15, artillery: 15, apcs: 5,
    },
    {
        id: 'jna_17th_corps_tg' as FormationId,
        name: 'JNA 17th Corps Task Group',
        corps_id: 'vrs_east_bosnian' as FormationId,
        location_osid: 'op:bijeljina:dvorovi_2',
        withdrawal_turn: 6,
        tanks: 25, artillery: 15, apcs: 10,
    },
    {
        id: 'jna_4th_corps_tg' as FormationId,
        name: 'JNA 4th Corps Task Group',
        corps_id: 'vrs_sarajevo_romanija' as FormationId,
        location_osid: 'op:ilidza:kasindo',
        withdrawal_turn: 6,
        tanks: 20, artillery: 25, apcs: 5,
    },
    {
        id: 'jna_2nd_md_tg' as FormationId,
        name: 'JNA 2nd Military District TG',
        corps_id: 'vrs_1st_krajina' as FormationId,
        location_osid: 'op:prijedor:prijedor_2',
        withdrawal_turn: 7,
        tanks: 35, artillery: 20, apcs: 12,
    },
    {
        id: 'jna_9th_corps_tg' as FormationId,
        name: 'JNA 9th Corps Task Group',
        corps_id: 'vrs_2nd_krajina' as FormationId,
        location_osid: 'op:kupres:bucovaca',
        withdrawal_turn: 4,
        tanks: 20, artillery: 15, apcs: 6,
        capture_osids: ['op:kupres:goravci', 'op:kupres:kupres_2'],
        no_equipment_handoff: true,
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// Spawn
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Spawn JNA phantom brigades into the game state.
 * Called once at scenario start (turn 0, before first runTurn).
 */
export function spawnJnaPhantomBrigades(state: GameState): void {
    if (!state.formations) state.formations = {};
    const turn = state.meta?.turn ?? 0;

    for (const def of JNA_PHANTOM_DEFS) {
        if (state.formations[def.id]) continue; // already spawned

        const formation: FormationState = {
            id: def.id,
            faction: 'RS',
            name: def.name,
            created_turn: turn,
            status: 'active',
            assignment: null,
            kind: 'jna_phantom',
            personnel: 2000,
            corps_id: def.corps_id,
            location_osid: def.location_osid,
            withdrawal_turn: def.withdrawal_turn,
            posture: 'attack',
            cohesion: 85,
            morale: 90,
            experience: 0.6,
            equipment_class: 'mechanized',
            tags: ['jna_phantom', `corps:${def.corps_id}`],
            composition: {
                infantry: 1200,
                tanks: def.tanks,
                artillery: def.artillery,
                aa_systems: 2,
                tank_condition: { operational: 0.95, degraded: 0.04, non_operational: 0.01 },
                artillery_condition: { operational: 0.95, degraded: 0.04, non_operational: 0.01 },
            },
        } as FormationState;

        state.formations[def.id] = formation;

        // Ghost phantoms flip political control of target OSIDs at spawn
        if (def.capture_osids) {
            if (!state.political_controllers) state.political_controllers = {};
            for (const osid of def.capture_osids) {
                state.political_controllers[osid] = 'RS';
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Withdrawal + equipment handoff
// ═══════════════════════════════════════════════════════════════════════════

export interface JnaWithdrawalEvent {
    phantom_id: FormationId;
    phantom_name: string;
    corps_id: FormationId;
    tanks_distributed: number;
    artillery_distributed: number;
    apcs_distributed: number;
    tanks_to_reserve: number;
    artillery_to_reserve: number;
    apcs_to_reserve: number;
}

/**
 * Process JNA phantom withdrawals for the current turn.
 * Returns withdrawal events for notifications.
 */
export function processJnaWithdrawals(state: GameState): JnaWithdrawalEvent[] {
    if (!state.formations) return [];
    const turn = state.meta?.turn ?? 0;
    const events: JnaWithdrawalEvent[] = [];

    const phantomIds = Object.keys(state.formations)
        .filter(id => state.formations![id]?.kind === 'jna_phantom')
        .sort(strictCompare);

    for (const phantomId of phantomIds) {
        const phantom = state.formations[phantomId]!;
        if (phantom.status !== 'active') continue;
        if (phantom.withdrawal_turn == null || turn < phantom.withdrawal_turn) continue;

        // This phantom withdraws now
        const corpsId = phantom.corps_id;
        const phantomDef = JNA_PHANTOM_DEFS.find(d => d.id === phantomId);

        // Ghost phantoms dissolve without equipment handoff
        if (phantomDef?.no_equipment_handoff) {
            events.push({
                phantom_id: phantomId as FormationId,
                phantom_name: phantom.name,
                corps_id: corpsId as FormationId,
                tanks_distributed: 0,
                artillery_distributed: 0,
                apcs_distributed: 0,
                tanks_to_reserve: 0,
                artillery_to_reserve: 0,
                apcs_to_reserve: 0,
            });

            // Remove from any active operations
            if (corpsId && state.corps_command?.[corpsId]?.active_operation) {
                const op = state.corps_command[corpsId].active_operation!;
                op.participating_brigades = op.participating_brigades.filter(id => id !== phantomId);
                if (Array.isArray(op.axes)) {
                    for (const axis of op.axes) {
                        axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== phantomId);
                    }
                }
            }

            phantom.status = 'inactive';
            phantom.lifecycle_status = 'withdrawn';
            delete state.formations[phantomId];
            continue;
        }

        const comp = phantom.composition;
        let tanksToGive = comp?.tanks ?? 0;
        let artilleryToGive = comp?.artillery ?? 0;
        let apcsToGive = phantomDef?.apcs ?? 0;

        let tanksDistributed = 0;
        let artilleryDistributed = 0;
        let apcsDistributed = 0;

        if (corpsId) {
            // Find eligible receiving brigades in same corps, sorted by proximity
            const eligibleBrigades = Object.values(state.formations)
                .filter((f): f is FormationState =>
                    f != null &&
                    f.corps_id === corpsId &&
                    f.id !== phantomId &&
                    f.kind === 'brigade' &&
                    f.status === 'active' &&
                    f.faction === 'RS'
                )
                .sort((a, b) => {
                    // Sort by proximity to phantom's location (same OSID first, then alphabetical)
                    const aMatch = a.location_osid === phantom.location_osid ? 0 : 1;
                    const bMatch = b.location_osid === phantom.location_osid ? 0 : 1;
                    if (aMatch !== bMatch) return aMatch - bMatch;
                    return strictCompare(a.id, b.id);
                });

            for (const brigade of eligibleBrigades) {
                if (tanksToGive <= 0 && artilleryToGive <= 0 && apcsToGive <= 0) break;

                const ceiling = getEquipmentCeiling(brigade.equipment_class);
                if (!brigade.composition) {
                    brigade.composition = {
                        infantry: brigade.personnel ?? 1000,
                        tanks: 0,
                        artillery: 0,
                        aa_systems: 0,
                        tank_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                        artillery_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                    };
                }
                const comp = brigade.composition!;

                // Tanks
                const tankRoom = Math.max(0, ceiling.max_tanks - comp.tanks);
                const tanksGiven = Math.min(tanksToGive, tankRoom);
                if (tanksGiven > 0) {
                    const oldOp = comp.tank_condition.operational;
                    const oldCount = comp.tanks;
                    comp.tanks += tanksGiven;
                    tanksToGive -= tanksGiven;
                    tanksDistributed += tanksGiven;
                    // Blend condition: old units at old rate + new JNA units at 0.95
                    const newOp = Math.min(0.95, (oldOp * oldCount + 0.95 * tanksGiven) / comp.tanks);
                    comp.tank_condition = { operational: newOp, degraded: (1 - newOp) * 0.8, non_operational: (1 - newOp) * 0.2 };
                }

                // Artillery
                const artRoom = Math.max(0, ceiling.max_artillery - comp.artillery);
                const artGiven = Math.min(artilleryToGive, artRoom);
                if (artGiven > 0) {
                    const oldOp = comp.artillery_condition.operational;
                    const oldCount = comp.artillery;
                    comp.artillery += artGiven;
                    artilleryToGive -= artGiven;
                    artilleryDistributed += artGiven;
                    const newOp = Math.min(0.95, (oldOp * oldCount + 0.95 * artGiven) / comp.artillery);
                    comp.artillery_condition = { operational: newOp, degraded: (1 - newOp) * 0.8, non_operational: (1 - newOp) * 0.2 };
                }

                // APCs: added to tanks in composition (BrigadeComposition.tanks = MBTs + APCs)
                const tankCeilingTotal = ceiling.max_tanks + ceiling.max_apcs;
                const armorRoom = Math.max(0, tankCeilingTotal - comp.tanks);
                const actualApcs = Math.min(apcsToGive, armorRoom);
                if (actualApcs > 0) {
                    comp.tanks += actualApcs;
                    apcsToGive -= actualApcs;
                    apcsDistributed += actualApcs;
                }
            }

            // Excess goes to corps equipment reserve
            if (tanksToGive > 0 || artilleryToGive > 0 || apcsToGive > 0) {
                if (!state.corps_equipment_reserve) state.corps_equipment_reserve = {};
                const reserve = state.corps_equipment_reserve[corpsId] ?? { tanks: 0, artillery: 0, apcs: 0 };
                reserve.tanks += tanksToGive;
                reserve.artillery += artilleryToGive;
                reserve.apcs += apcsToGive;
                state.corps_equipment_reserve[corpsId] = reserve;
            }
        }

        events.push({
            phantom_id: phantomId as FormationId,
            phantom_name: phantom.name,
            corps_id: corpsId as FormationId,
            tanks_distributed: tanksDistributed,
            artillery_distributed: artilleryDistributed,
            apcs_distributed: apcsDistributed,
            tanks_to_reserve: tanksToGive,
            artillery_to_reserve: artilleryToGive,
            apcs_to_reserve: apcsToGive,
        });

        // Remove phantom from any active operations
        if (corpsId && state.corps_command?.[corpsId]?.active_operation) {
            const op = state.corps_command[corpsId].active_operation!;
            // Remove from flat participating_brigades
            op.participating_brigades = op.participating_brigades.filter(id => id !== phantomId);
            // Remove from axes
            if (Array.isArray(op.axes)) {
                for (const axis of op.axes) {
                    axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== phantomId);
                }
            }
        }

        // Disband: remove from formations
        phantom.status = 'inactive';
        phantom.lifecycle_status = 'withdrawn';
        delete state.formations[phantomId];
    }

    return events;
}

// ═══════════════════════════════════════════════════════════════════════════
// Notification helpers
// ═══════════════════════════════════════════════════════════════════════════

export interface JnaCountdownNotice {
    phantom_id: FormationId;
    phantom_name: string;
    turns_remaining: number;
}

/**
 * Generate withdrawal countdown notices for situation briefing.
 */
export function getJnaWithdrawalCountdowns(state: GameState): JnaCountdownNotice[] {
    if (!state.formations) return [];
    const turn = state.meta?.turn ?? 0;
    const notices: JnaCountdownNotice[] = [];

    const phantomIds = Object.keys(state.formations)
        .filter(id => state.formations![id]?.kind === 'jna_phantom')
        .sort(strictCompare);

    for (const id of phantomIds) {
        const f = state.formations[id]!;
        if (f.status !== 'active' || f.withdrawal_turn == null) continue;
        const remaining = f.withdrawal_turn - turn;
        if (remaining >= 0) {
            notices.push({
                phantom_id: id as FormationId,
                phantom_name: f.name,
                turns_remaining: remaining,
            });
        }
    }
    return notices;
}

/** Exported for testing. */
export const _JNA_PHANTOM_DEFS = JNA_PHANTOM_DEFS;
export const _EQUIPMENT_CEILINGS = EQUIPMENT_CEILINGS;

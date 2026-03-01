/**
 * Pre-planned VRS operations injected at scenario start.
 *
 * Historical context: VRS inherited JNA operational plans and executed
 * coordinated corps-level offensives from Day 1 of the war. These were
 * not ad-hoc — they were pre-positioned, pre-supplied, and launched
 * immediately upon JNA withdrawal.
 *
 * Five named operations, one per VRS corps (2nd Krajina excepted):
 * - Operacija Koridor (East Bosnian Corps): Brčko corridor
 * - Operacija Drina (Drina Corps): Zvornik-Bratunac sweep
 * - Operacija Prsten (SRK): Sarajevo encirclement
 * - Operacija Foča (Herzegovina Corps): Secure Foča area
 * - Operacija Prijedor (1st Krajina Corps): Secure Prijedor area
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Operation Definitions
// ═══════════════════════════════════════════════════════════════════════════

interface PrePlannedOp {
    corps: string;
    name: string;
    target_muns: string[];
}

const VRS_PRE_PLANNED: PrePlannedOp[] = [
    { corps: 'vrs_east_bosnian', name: 'Operacija Koridor',
      target_muns: ['brcko', 'bosanski_samac', 'modrica'] },
    { corps: 'vrs_drina', name: 'Operacija Drina',
      target_muns: ['zvornik', 'bratunac', 'vlasenica'] },
    { corps: 'vrs_sarajevo_romanija', name: 'Operacija Prsten',
      target_muns: ['ilidza', 'hadzici', 'vogosca', 'ilijas'] },
    { corps: 'vrs_herzegovina', name: 'Operacija Foca',
      target_muns: ['foca', 'cajnice', 'kalinovik'] },
    { corps: 'vrs_1st_krajina', name: 'Operacija Prijedor',
      target_muns: ['prijedor', 'sanski_most', 'kljuc'] },
];

/** Maximum objectives per operation. */
const MAX_OBJECTIVES = 6;

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inject pre-planned VRS operations into corps_command at scenario start.
 * Each operation starts in 'execution' phase (JNA pre-planned, no prep needed).
 * Also sets the 5 corps' stances to 'offensive'.
 */
export function injectPrePlannedOperations(state: GameState): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const formations = state.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    for (const def of VRS_PRE_PLANNED) {
        const cmd = corpsCommand[def.corps];
        if (!cmd) continue;

        // Skip if corps already has an active operation
        if (cmd.active_operation) continue;

        // Find active brigades under this corps
        const corpsBrigades: FormationId[] = [];
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const f = formations[fid];
            if (!f || f.corps_id !== def.corps) continue;
            if (f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            corpsBrigades.push(fid);
        }

        if (corpsBrigades.length === 0) continue;

        // Find enemy-controlled OSIDs in target municipalities
        const enemyOsids: string[] = [];
        const pc = state.political_controllers ?? {};
        for (const osid of Object.keys(pc).sort(strictCompare)) {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            if (controller === 'RS') continue; // Skip own territory
            if (controller === null) continue;
            // Check if OSID is in one of the target municipalities
            const parts = osid.split(':');
            if (parts.length < 2) continue;
            const mun = parts[1]!;
            if (def.target_muns.includes(mun)) {
                enemyOsids.push(osid);
            }
        }

        // Skip if < 2 enemy OSIDs (municipality already secured)
        if (enemyOsids.length < 2) continue;

        // Build objectives: sorted deterministically, cap at MAX_OBJECTIVES
        const objectives = enemyOsids.sort(strictCompare).slice(0, MAX_OBJECTIVES);

        // Participating brigades: all corps brigades minus 1 reserve
        const reserveCount = Math.max(1, Math.floor(corpsBrigades.length * 0.15));
        const participating = corpsBrigades.slice(0, corpsBrigades.length - reserveCount);

        const op: CorpsOperation = {
            name: def.name,
            type: 'sector_attack',
            phase: 'execution',
            started_turn: turn,
            phase_started_turn: turn,
            participating_brigades: participating.sort(strictCompare),
            objectives,
            current_objective_index: 0,
            momentum: 0,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            supply_readiness: 1.0,
        };

        cmd.active_operation = op;
        cmd.stance = 'offensive';
    }
}

/** Exported for testing. */
export const _VRS_PRE_PLANNED = VRS_PRE_PLANNED;

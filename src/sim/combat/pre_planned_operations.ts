/**
 * Pre-planned VRS operations injected at scenario start.
 *
 * Historical context: VRS inherited JNA operational plans and executed
 * coordinated corps-level offensives from Day 1 of the war. These were
 * not ad-hoc — they were pre-positioned, pre-supplied, and launched
 * immediately upon JNA withdrawal.
 *
 * Six named operations, one per VRS corps:
 * - Operation Koridor (East Bosnian Corps): Brčko corridor link
 * - Operation Drina (Drina Corps): Zvornik → Novo Selo → Bratunac
 * - Operation Prsten (SRK): Ilidža → Rakovica → Svrake → Hotonj
 * - Operation Foča (Herzegovina Corps): Brusna → Mazoče → Tjentište → Miljevina → Izbišno → Patkovina
 * - Operation Prijedor (1st Krajina Corps): Sweep Prijedor/Sanski Most/Ključ
 * - Operation Kupres (2nd Krajina Corps): Seize Kupres from HVO (April 1992)
 *
 * Operations inject in 'planning' phase with planning_duration: 1.
 * Bot/player orders trigger execution next turn.
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
    target_osids: string[];
    staging_osid: string;
}

const VRS_PRE_PLANNED: PrePlannedOp[] = [
    { corps: 'vrs_east_bosnian', name: 'Operation Koridor',
      staging_osid: 'op:brcko:brcko',
      target_osids: ['op:modrica:garevac_2'] },
    { corps: 'vrs_drina', name: 'Operation Drina',
      staging_osid: 'op:zvornik:kozluk_2',
      target_osids: [
          'op:zvornik:zvornik',      // Zvornik
          'op:zvornik:novo_selo',    // Novo Selo
          'op:bratunac:bratunac_2',  // Bratunac (march south through friendly RS territory)
      ] },
    { corps: 'vrs_sarajevo_romanija', name: 'Operation Prsten',
      staging_osid: 'op:ilidza:kasindo',
      target_osids: [
          'op:ilidza:sarajevo_dio_ilidza_2',  // Sarajevo Dio - Ilidža
          'op:ilidza:rakovica_2',              // Rakovica
          'op:vogosca:svrake',                 // Svrake
          'op:vogosca:hotonj',                 // Hotonj (expected stalemate — bloody battle)
      ] },
    { corps: 'vrs_herzegovina', name: 'Operation Foča',
      staging_osid: 'op:foca:foca_3',
      target_osids: [
          'op:foca:brusna_2',       // Brusna
          'op:foca:kosman',         // Mazoče (OSID slug is 'kosman')
          'op:foca:tjentiste_2',    // Tjentište
          'op:foca:miljevina_2',    // Miljevina
          'op:foca:izbisno',        // Izbišno
          'op:foca:patkovina',      // Patkovina
      ] },
    { corps: 'vrs_1st_krajina', name: 'Operation Prijedor',
      staging_osid: 'op:prijedor:prijedor_2',
      target_osids: [
          // Prijedor municipality (11 OSIDs)
          'op:prijedor:prijedor_2', 'op:prijedor:kozarac_2', 'op:prijedor:kamicani',
          'op:prijedor:cejreci', 'op:prijedor:raljas', 'op:prijedor:ljubija_2',
          'op:prijedor:brezicani', 'op:prijedor:maricka_2', 'op:prijedor:omarska_2',
          'op:prijedor:rasavci_2', 'op:prijedor:alisici',
          // Sanski Most municipality (10 OSIDs)
          'op:sanski_most:sanski_most_2', 'op:sanski_most:skucani_vakuf_2',
          'op:sanski_most:stari_majdan', 'op:sanski_most:ilidza_2',
          'op:sanski_most:donja_kozica', 'op:sanski_most:ostra_luka',
          'op:sanski_most:budimlic_japra_2', 'op:sanski_most:lusci_palanka_2',
          'op:sanski_most:jelasinovci', 'op:sanski_most:kljevci',
          // Ključ municipality (7 OSIDs)
          'op:kljuc:kljuc_2', 'op:kljuc:hadzici', 'op:kljuc:krasulje_2',
          'op:kljuc:sanica_2', 'op:kljuc:donje_ratkovo_2',
          'op:kljuc:donji_vrbljani_2', 'op:kljuc:cadjavica',
      ] },
];

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inject pre-planned VRS operations into corps_command at scenario start.
 * Each operation starts in 'planning' phase with planning_duration: 1.
 * Bot/player orders execution begins next turn.
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

        // Validate target OSIDs: only include those not already RS-controlled
        const objectives: string[] = [];
        for (const osid of def.target_osids) {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            if (controller === 'RS') continue; // Already ours
            if (controller === null) continue;
            objectives.push(osid);
        }

        if (objectives.length < 1) continue;

        // Participating brigades: all corps brigades minus 1 reserve
        const reserveCount = Math.max(1, Math.floor(corpsBrigades.length * 0.15));
        const participating = corpsBrigades.slice(0, corpsBrigades.length - reserveCount);

        const op: CorpsOperation = {
            name: def.name,
            type: 'sector_attack',
            phase: 'planning',
            started_turn: turn,
            phase_started_turn: turn,
            planning_duration: 1,
            staging_osid: def.staging_osid,
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

/**
 * Pre-planned VRS operations injected at scenario start.
 *
 * These opening operations are explicit scenario-shaping data. They should
 * use named brigades, concrete launch sectors, and short opening objective
 * chains instead of broad corps-wide participation.
 */

import type {
    CorpsOperation,
    FormationId,
    GameState,
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';

interface PrePlannedOp {
    corps: string;
    name: string;
    sector_id: string;
    participating_brigades: FormationId[];
    target_osids: string[];
    staging_osid: string;
}

const VRS_PRE_PLANNED: PrePlannedOp[] = [
    {
        corps: 'vrs_east_bosnian',
        name: 'Operation Koridor',
        sector_id: 'sector:vrs_east_bosnian:0',
        participating_brigades: [
            'rs_1st_posavina_infantry',
            'rs_2nd_posavina_light_infantry',
        ],
        staging_osid: 'op:bosanski_samac:crkvina_2',
        target_osids: [
            'op:modrica:garevac_2',
            'op:bosanski_samac:samac_2',
        ],
    },
    {
        corps: 'vrs_drina',
        name: 'Operation Drina',
        sector_id: 'sector:vrs_drina:6',
        participating_brigades: [
            'rs_1st_birac',
            'rs_1st_bratunac',
            'rs_1st_zvornik',
        ],
        staging_osid: 'op:zvornik:kozluk_2',
        target_osids: [
            'op:bratunac:bratunac_2',
            'op:zvornik:zvornik',
            'op:zvornik:novo_selo',
        ],
    },
    {
        corps: 'vrs_sarajevo_romanija',
        name: 'Operation Prsten',
        sector_id: 'sector:vrs_sarajevo_romanija:0',
        participating_brigades: [
            'rs_1st_sarajevo_mechanized',
            'rs_2nd_sarajevo_light_infantry',
            'rs_3rd_sarajevo_infantry',
        ],
        staging_osid: 'op:ilidza:kasindo',
        target_osids: [
            'op:ilidza:sarajevo_dio_ilidza_2',
            'op:ilidza:rakovica_2',
            'op:vogosca:svrake',
            'op:vogosca:hotonj',
        ],
    },
    {
        corps: 'vrs_herzegovina',
        name: 'Operation Foca',
        sector_id: 'sector:vrs_herzegovina:3',
        participating_brigades: [
            'rs_ajnie_brigade',
            'rs_foa_brigade',
            'rs_kalinovik_brigade',
        ],
        staging_osid: 'op:foca:foca_3',
        target_osids: [
            'op:foca:brusna_2',
            'op:foca:kosman',
            'op:foca:tjentiste_2',
            'op:foca:miljevina_2',
            'op:foca:izbisno',
            'op:foca:patkovina',
        ],
    },
    {
        corps: 'vrs_1st_krajina',
        name: 'Operation Prijedor',
        sector_id: 'sector:vrs_1st_krajina:18',
        participating_brigades: [
            'rs_1st_armored',
            'rs_16th_krajina_motorized',
            'rs_11th_dubica_infantry',
            'rs_1st_gradika_light_infantry',
            'rs_43rd_prijedor_motorized',
            'rs_5th_kozara_light_infantry',
            'rs_6th_sanske_infantry',
        ],
        staging_osid: 'op:prijedor:prijedor_2',
        target_osids: [
            'op:prijedor:ljubija_2',
            'op:prijedor:kozarac_2',
            'op:prijedor:kamicani',
            'op:prijedor:raljas',
            'op:sanski_most:stari_majdan',
            'op:sanski_most:sanski_most_2',
        ],
    },
];

/**
 * Inject pre-planned VRS operations into corps_command at scenario start.
 * Each operation starts in planning phase with planning_duration: 1.
 */
export function injectPrePlannedOperations(state: GameState): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const formations = state.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    for (const def of VRS_PRE_PLANNED) {
        const cmd = corpsCommand[def.corps];
        if (!cmd || cmd.active_operation) continue;

        const participating = def.participating_brigades.filter((fid) => {
            const formation = formations[fid];
            if (!formation || formation.corps_id !== def.corps) return false;
            if (formation.status !== 'active') return false;
            return formation.kind === 'brigade' || formation.kind === 'og' || formation.kind === 'operational_group';
        }).sort(strictCompare);

        if (participating.length === 0) continue;

        const objectives = def.target_osids.filter((osid) => {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            return controller !== null && controller !== 'RS';
        });

        if (objectives.length === 0) continue;

        const op: CorpsOperation = {
            name: def.name,
            type: 'sector_attack',
            phase: 'planning',
            started_turn: turn,
            phase_started_turn: turn,
            participating_brigades: participating,
            sector_id: def.sector_id,
            objectives,
            current_objective_index: 0,
            planning_duration: 1,
            supply_readiness: 1.0,
            momentum: 0,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            staging_osid: def.staging_osid,
        };

        cmd.active_operation = op;
        cmd.stance = 'offensive';
    }
}

export const _VRS_PRE_PLANNED = VRS_PRE_PLANNED;

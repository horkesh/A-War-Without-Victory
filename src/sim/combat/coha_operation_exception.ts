import type { CorpsOperation, FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { VLASIC_RIDGE_95_OPPORTUNITY } from './operation_opportunity_catalog_central_bosnia.js';
import { getBrigadeAxis } from './operation_approach_osids.js';

/**
 * The only operation admitted through the March 1995 COHA exception.
 * This is deliberately an authored identity check, not a faction/target gate.
 */
const VLASIC_OPERATION_NAME = 'Operation Vlasic Ridge';
const VLASIC_CORPS_ID = 'arbih_3rd_corps';
const VLASIC_STAGING_OSID = VLASIC_RIDGE_95_OPPORTUNITY.staging_osid;
const VLASIC_OBJECTIVES = new Set([
    'op:travnik:paklarevo',
    'op:travnik:varosluk',
    'op:travnik:gornje_krcevine',
]);
const VLASIC_AUTHORED_BRIGADES = new Set<FormationId>([
    'arbih_17th_vitezka_mountain' as FormationId,
    'arbih_706th_muslim_mountain' as FormationId,
    'arbih_727th_slavna' as FormationId,
    'arbih_712th_mountain' as FormationId,
    'arbih_737th_muslim_light' as FormationId,
    'arbih_705th_slavna_mountain' as FormationId,
]);

export function isVlasicCohaWindow(turn: number): boolean {
    return turn >= 153 && turn <= 155;
}

function operationObjectives(op: CorpsOperation): readonly string[] {
    if (op.axes && op.axes.length > 0) {
        return op.axes.flatMap((axis) => axis.objectives ?? []);
    }
    return op.objectives ?? [];
}

function isAuthoredVlasicOperation(state: GameState, corpsId: string, op: CorpsOperation): boolean {
    if (corpsId !== VLASIC_CORPS_ID
        || op.name !== VLASIC_OPERATION_NAME
        || op.type !== 'sector_attack'
        || op.staging_osid !== VLASIC_STAGING_OSID
        || state.military.formations?.[corpsId]?.faction !== 'RBiH') {
        return false;
    }
    const objectives = operationObjectives(op);
    if (objectives.length === 0 || !objectives.every((objective) => VLASIC_OBJECTIVES.has(objective))) return false;
    if (!op.participating_brigades?.some((id) => VLASIC_AUTHORED_BRIGADES.has(id))) return false;
    return op.participating_brigades.every((id) => VLASIC_AUTHORED_BRIGADES.has(id));
}

export function isVlasicCohaExceptionOperation(
    state: GameState,
    corpsId: string,
    op: CorpsOperation,
    turn = state.meta?.turn ?? 0,
): boolean {
    return state.military.event_flags?.coha_active === true
        && isVlasicCohaWindow(turn)
        && isAuthoredVlasicOperation(state, corpsId, op);
}

function operationContainsTarget(op: CorpsOperation, brigadeId: FormationId, targetOsid: string): boolean {
    if (!op.participating_brigades.includes(brigadeId)) return false;
    const axis = getBrigadeAxis(op, brigadeId);
    if (axis) {
        if (axis.status !== 'executing') return false;
        const currentObjective = axis.objectives[axis.current_objective_index ?? 0];
        return currentObjective === targetOsid;
    }
    if (op.axes && op.axes.length > 0) return false;
    return (op.objectives ?? [])[op.current_objective_index ?? 0] === targetOsid;
}

/** Return true only when one unambiguous authored operation owns this order. */
export function isVlasicCohaExceptionAttackOrder(
    state: GameState,
    brigadeId: FormationId,
    targetOsid: string,
    turn = state.meta?.turn ?? 0,
): boolean {
    const matches: CorpsOperation[] = [];
    for (const corpsId of Object.keys(state.military.corps_command ?? {}).sort(strictCompare)) {
        for (const op of state.military.corps_command?.[corpsId]?.active_operations ?? []) {
            if (isVlasicCohaExceptionOperation(state, corpsId, op, turn)
                && op.phase === 'execution'
                && operationContainsTarget(op, brigadeId, targetOsid)) {
                matches.push(op);
            }
        }
    }
    return matches.length === 1;
}

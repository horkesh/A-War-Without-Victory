import type { BrigadePosture, FormationId, GameState, SectorStanceOrder } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { canAdoptPosture } from './brigade_posture.js';

export interface SectorStanceOrderReport {
    postures_changed: number;
    postures_rejected: number;
}

function collectAssignedBrigadeIds(state: GameState, order: SectorStanceOrder): FormationId[] {
    const sector = state.military.corps_front_sectors?.[order.sector_id];
    if (!sector) return [];
    return [...sector.assigned_brigade_ids].sort(strictCompare);
}

export function applySectorStanceOrders(state: GameState): SectorStanceOrderReport {
    const report: SectorStanceOrderReport = { postures_changed: 0, postures_rejected: 0 };
    const orders = state.military.sector_stance_orders ?? [];
    if (orders.length === 0) {
        state.military.sector_stance_orders = [];
        return report;
    }

    const formations = state.military.formations ?? {};
    const postureOrders = state.military.brigade_posture_orders ?? [];
    const normalizedOrders = [...orders].sort((a, b) =>
        strictCompare(a.sector_id, b.sector_id) || strictCompare(a.stance, b.stance)
    );

    for (const order of normalizedOrders) {
        const brigadeIds = collectAssignedBrigadeIds(state, order);
        for (const brigadeId of brigadeIds) {
            const brigade = formations[brigadeId];
            if (!brigade || brigade.status !== 'active' || (brigade.kind ?? 'brigade') !== 'brigade') {
                report.postures_rejected += 1;
                continue;
            }
            const targetPosture = order.stance as BrigadePosture;
            if (!canAdoptPosture(brigade, targetPosture)) {
                report.postures_rejected += 1;
                continue;
            }
            postureOrders.push({ brigade_id: brigadeId, posture: targetPosture });
            report.postures_changed += 1;
        }
    }

    state.military.brigade_posture_orders = postureOrders;
    state.military.sector_stance_orders = [];
    return report;
}

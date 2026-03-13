import type { BrigadePosture, FormationId, GameState, SectorStance, SectorStanceOrder } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { canAdoptPosture } from './brigade_posture.js';
import { CORPS_STANCE_ALLOWED_SECTOR_STANCES } from './combat_math.js';

export interface SectorStanceOrderReport {
    stances_applied: number;
    stances_rejected: number;
    postures_changed: number;
    postures_rejected: number;
}

/**
 * Derive brigade posture from the sector stance.
 * Front brigades and reserve brigades may get different postures.
 */
function sectorStanceToBrigadePosture(stance: SectorStance, isReserve: boolean): BrigadePosture {
    switch (stance) {
        case 'fortify': return 'dig_in';
        case 'defend': return 'defend';
        case 'elastic': return isReserve ? 'counterattack' : 'defend';
        case 'active_defense': return 'attack';
        case 'screening': return 'defend';
    }
}

/**
 * Apply sector stance orders from the player.
 *
 * New behavior (Layer B): sets sector_stance + stance_source on the sector,
 * then derives brigade posture orders from the sector stance.
 *
 * Corps stance constrains which sector stances are allowed.
 * Invalid orders are rejected (stance not allowed under current corps stance).
 */
export function applySectorStanceOrders(state: GameState): SectorStanceOrderReport {
    const report: SectorStanceOrderReport = {
        stances_applied: 0,
        stances_rejected: 0,
        postures_changed: 0,
        postures_rejected: 0,
    };
    const orders = state.military.sector_stance_orders ?? [];
    if (orders.length === 0) {
        state.military.sector_stance_orders = [];
        return report;
    }

    const sectorLookup = state.military.corps_front_sectors ?? {};
    const corpsCommand = state.military.corps_command ?? {};
    const formations = state.military.formations ?? {};
    const postureOrders = state.military.brigade_posture_orders ?? [];

    const normalizedOrders = [...orders].sort((a, b) =>
        strictCompare(a.sector_id, b.sector_id) || strictCompare(a.stance, b.stance)
    );

    for (const order of normalizedOrders) {
        const sector = sectorLookup[order.sector_id];
        if (!sector) {
            report.stances_rejected += 1;
            continue;
        }

        // Validate: is this stance allowed under the corps stance?
        const cmd = corpsCommand[sector.corps_id];
        const corpsStance: string = cmd?.stance ?? 'balanced';
        const allowed = CORPS_STANCE_ALLOWED_SECTOR_STANCES[corpsStance]
            ?? CORPS_STANCE_ALLOWED_SECTOR_STANCES['balanced']!;

        if (!allowed.includes(order.stance)) {
            report.stances_rejected += 1;
            continue;
        }

        // Apply the sector stance
        sector.sector_stance = order.stance;
        sector.stance_source = 'player';
        report.stances_applied += 1;

        // Derive brigade postures from the new sector stance
        const reserveSet = new Set(sector.reserve_brigade_ids);
        const allBrigadeIds = [
            ...sector.assigned_brigade_ids,
            ...sector.reserve_brigade_ids,
        ].sort(strictCompare);

        for (const brigadeId of allBrigadeIds) {
            const brigade = formations[brigadeId];
            if (!brigade || brigade.status !== 'active' || (brigade.kind ?? 'brigade') !== 'brigade') {
                report.postures_rejected += 1;
                continue;
            }
            const isReserve = reserveSet.has(brigadeId);
            const targetPosture = sectorStanceToBrigadePosture(order.stance, isReserve);
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

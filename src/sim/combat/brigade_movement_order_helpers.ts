import type { BrigadeMovementOrder, SettlementId } from '../../state/game_state.js';

export function createColumnMovementOrder(destination: string): BrigadeMovementOrder {
    return {
        destination_sids: [destination as SettlementId],
        stance: 'column',
    };
}

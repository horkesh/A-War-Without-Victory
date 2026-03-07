import type {
    FactionId,
    GameState,
    MunicipalityId,
    MunicipalitySupportOrder,
} from '../../state/game_state.js';

export const RBIH_WEAPONS_SHIPMENT_BONUS = 25;
export const RS_STAFF_PRIORITY_RATE_BONUS = 10;
export const HRHB_SUPPORT_PACKAGE_COHESION_BONUS = 2;

const FACTION_MUNICIPALITY_SUPPORT: Record<'RBiH' | 'RS' | 'HRHB', {
    label: string;
    type: MunicipalitySupportOrder['type'];
}> = {
    RBiH: { label: 'Weapons shipment', type: 'weapons_shipment' },
    RS: { label: 'Staff priority', type: 'staff_priority' },
    HRHB: { label: 'Croatian support package', type: 'croatian_support_package' },
};

export function getActiveMunicipalitySupport(
    state: GameState,
    faction: FactionId,
    munId: MunicipalityId,
    currentTurn: number
): MunicipalitySupportOrder | null {
    if (!faction) return null;
    const order = state.municipality_support_orders?.[faction];
    if (!order) return null;
    if (order.faction !== faction) return null;
    if (order.mun_id !== munId) return null;
    if (order.staged_turn !== currentTurn) return null;
    return order;
}

export function getMunicipalitySupportLabel(faction: FactionId): string {
    if (faction === 'RBiH' || faction === 'RS' || faction === 'HRHB') {
        return FACTION_MUNICIPALITY_SUPPORT[faction].label;
    }
    return 'Local support';
}

export function getMunicipalitySupportTypeForFaction(faction: FactionId): MunicipalitySupportOrder['type'] | null {
    if (faction === 'RBiH' || faction === 'RS' || faction === 'HRHB') {
        return FACTION_MUNICIPALITY_SUPPORT[faction].type;
    }
    return null;
}

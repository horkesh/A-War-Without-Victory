/** Shared attacker-owned confidence lookup; no hidden enemy OPSEC. */
import type {GameState} from '../../state/game_state.js';
import {strictCompare} from '../../state/validateGameState.js';

function findFriendlySectorIdForOsid(state: GameState, osid: string): string | null {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return null;
    const sectorIds = Object.keys(sectors).sort(strictCompare);
    for (const sectorId of sectorIds) {
        const sector = sectors[sectorId];
        if (!sector) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            if (subSegment.friendly_osids.includes(osid)) return sectorId;
        }
    }
    return null;
}

export function getAttackIntelConfidence(
    state: GameState,
    attackerOsid: string,
    defenderSectorId: string | undefined,
    targetOsid: string,
): number {
    if (!defenderSectorId) return 0;
    const attackerSectorId = findFriendlySectorIdForOsid(state, attackerOsid);
    if (!attackerSectorId) return 0;
    const record = state.military.sector_intel?.[attackerSectorId]
        ?.find(rec => rec.enemy_sector_id === defenderSectorId);
    if (!record) return 0;
    const osidConfidence = record.osid_confidence
        ?.find(entry => entry.osid === targetOsid)
        ?.confidence;
    return osidConfidence ?? record.confidence;
}


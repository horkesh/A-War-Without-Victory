import type { CorpsFrontSector, FormationId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * ADR-0007 Phase C flag. Default off: callers preserve existing assigned-only
 * defensive fatigue and reactive-defense behavior byte-for-byte.
 */
export const ENABLE_SHARED_SECTOR_DEFENSE = false;

export function getStandingOgDefenseBrigadeIds(
    sector: Pick<CorpsFrontSector, 'assigned_brigade_ids' | 'reserve_brigade_ids' | 'rear_brigade_ids'>,
    enableSharedSectorDefense: boolean = ENABLE_SHARED_SECTOR_DEFENSE,
): FormationId[] {
    if (!enableSharedSectorDefense) return [...sector.assigned_brigade_ids];
    const brigadeIds = [
        ...sector.assigned_brigade_ids,
        ...sector.reserve_brigade_ids,
        ...(sector.rear_brigade_ids ?? []),
    ];
    return [...new Set(brigadeIds)].sort(strictCompare);
}

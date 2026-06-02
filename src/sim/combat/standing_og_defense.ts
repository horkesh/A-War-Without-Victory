import type { CorpsFrontSector, FormationId, FormationState, GameState } from '../../state/game_state.js';
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

export interface StandingOgSoloDefenderHotspot {
    sector_id: string;
    holder_brigade_id: FormationId;
    contested_osid: string;
    defender_turns: number;
    idle_same_og_brigade_ids: FormationId[];
}

export interface StandingOgSoloDefenderOptions {
    minDefenderTurns?: number;
    fullStrengthRatio?: number;
}

function defenderTurnsByOsid(formation: FormationState): Map<string, Set<number>> {
    const turnsByOsid = new Map<string, Set<number>>();
    for (const engagement of formation.brigade_history?.engagements ?? []) {
        if (engagement.role !== 'defender') continue;
        const turns = turnsByOsid.get(engagement.osid) ?? new Set<number>();
        turns.add(engagement.turn);
        turnsByOsid.set(engagement.osid, turns);
    }
    return turnsByOsid;
}

function isFullStrengthIdleBrigade(formation: FormationState, fullStrengthRatio: number): boolean {
    const peakPersonnel = formation.brigade_history?.peak_personnel ?? formation.personnel ?? 0;
    if ((formation.personnel ?? 0) < peakPersonnel * fullStrengthRatio) return false;
    return (formation.brigade_history?.battles_fought ?? 0) === 0 && (formation.ops?.fatigue ?? 0) <= 0;
}

export function detectStandingOgSoloDefenderHotspots(
    state: GameState,
    options: StandingOgSoloDefenderOptions = {},
): StandingOgSoloDefenderHotspot[] {
    const minDefenderTurns = options.minDefenderTurns ?? 8;
    const fullStrengthRatio = options.fullStrengthRatio ?? 0.85;
    const formations = state.military.formations ?? {};
    const sectors = state.military.corps_front_sectors ?? {};
    const reports: StandingOgSoloDefenderHotspot[] = [];

    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId];
        if (!sector || sector.edge_ids.length === 0) continue;

        for (const holderId of [...sector.assigned_brigade_ids].sort(strictCompare)) {
            const holder = formations[holderId];
            if (!holder || holder.status !== 'active') continue;
            const holderTurnsByOsid = defenderTurnsByOsid(holder);

            const idleSameOgIds = getStandingOgDefenseBrigadeIds(sector, true)
                .filter((id) => id !== holderId)
                .filter((id) => {
                    const formation = formations[id];
                    return formation != null
                        && formation.status === 'active'
                        && formation.faction === holder.faction
                        && isFullStrengthIdleBrigade(formation, fullStrengthRatio);
                })
                .sort(strictCompare);
            if (idleSameOgIds.length === 0) continue;

            for (const osid of [...holderTurnsByOsid.keys()].sort(strictCompare)) {
                if (!sector.territory_osids.includes(osid)) continue;
                const defenderTurns = holderTurnsByOsid.get(osid)?.size ?? 0;
                if (defenderTurns < minDefenderTurns) continue;
                reports.push({
                    sector_id: sector.sector_id,
                    holder_brigade_id: holderId,
                    contested_osid: osid,
                    defender_turns: defenderTurns,
                    idle_same_og_brigade_ids: idleSameOgIds,
                });
            }
        }
    }

    return reports.sort((a, b) => (
        strictCompare(a.sector_id, b.sector_id)
        || strictCompare(a.holder_brigade_id, b.holder_brigade_id)
        || strictCompare(a.contested_osid, b.contested_osid)
    ));
}

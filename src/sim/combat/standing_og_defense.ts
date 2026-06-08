import type { CorpsFrontSector, FormationId, FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * ADR-0007 Phase C flag. Default off (deferred): callers preserve existing
 * assigned-only defensive fatigue and reactive-defense behavior byte-for-byte.
 */
export const ENABLE_SHARED_SECTOR_DEFENSE = false;
/**
 * ADR-0007 Phase B flag. Enabled (PR-1): standing OGs commit sector reserves
 * to defense, so reserve brigades absorb attrition alongside assigned brigades.
 */
export const ENABLE_STANDING_OG_RESERVE_COMMIT = true;

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

export function getStandingOgEngagedDefenseBrigadeIds(
    defenderFormation: Pick<FormationState, 'id'> | null,
    sectorDefenseBrigades: Array<Pick<FormationState, 'id'>> | null | undefined,
    sectorBrigadeWeights: Map<FormationId, number> | null | undefined,
    enableSharedSectorDefense: boolean = ENABLE_SHARED_SECTOR_DEFENSE,
): FormationId[] {
    if (!defenderFormation) return [];
    if (!enableSharedSectorDefense || !sectorDefenseBrigades || !sectorBrigadeWeights) {
        return [defenderFormation.id];
    }

    const engagedIds = sectorDefenseBrigades
        .filter((formation) => Math.max(0, sectorBrigadeWeights.get(formation.id) ?? 0) > 0)
        .map((formation) => formation.id)
        .sort(strictCompare);
    return engagedIds.length > 0 ? engagedIds : [defenderFormation.id];
}

export function isStandingOgDefenseBrigadeAvailable(
    state: Pick<GameState, 'military'>,
    brigadeId: FormationId,
    enableSharedSectorDefense: boolean = ENABLE_SHARED_SECTOR_DEFENSE,
): boolean {
    if (!enableSharedSectorDefense) return true;

    const corpsCommand = state.military?.corps_command ?? {};
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const command = corpsCommand[corpsId];
        for (const op of command?.active_operations ?? []) {
            for (const axis of op.axes ?? []) {
                if ((axis.assigned_brigades ?? []).includes(brigadeId)) return false;
            }
            if ((op.participating_brigades ?? []).includes(brigadeId)) return false;
        }
    }

    const tacticalGroups = state.military?.tactical_groups ?? {};
    for (const tgId of Object.keys(tacticalGroups).sort(strictCompare)) {
        const tg = tacticalGroups[tgId];
        if (!tg || tg.status === 'dissolved') continue;
        if (tg.anchor_brigade_id === brigadeId) return false;
        if (tg.donor_contributions.some((donor) => donor.brigade_id === brigadeId)) return false;
    }

    return true;
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

function isCommittedToContestedSectorFront(formation: FormationState, sector: CorpsFrontSector): boolean {
    const location = formation.location_osid;
    if (!location) return false;
    for (const subSegment of sector.sub_segments ?? []) {
        if ((subSegment.enemy_osids?.length ?? 0) === 0) continue;
        if ((subSegment.friendly_osids ?? []).includes(location)) return true;
    }
    return false;
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
                        && !isCommittedToContestedSectorFront(formation, sector)
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

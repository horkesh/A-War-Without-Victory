/** Shared defender membership; preserves the authoritative resolver's guards. */
import type { FactionId, FormationState, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { MIN_ATTACK_PERSONNEL } from '../../state/formation_constants.js';
import { bfsDistanceFriendly, ANCHOR_GARRISON_LOAN_MAX_HOPS } from './combat_math.js';
import { getStandingOgDefenseBrigadeIds, isStandingOgDefenseBrigadeAvailable } from './standing_og_defense.js';

function formationBelongsToCorps(formation: FormationState, corpsId: string): boolean {
    if ((formation as { corps_id?: string }).corps_id === corpsId) return true;
    return (formation.tags ?? []).includes(`corps:${corpsId}`);
}

function findEmptySectorAdjacentDefenders(
    state: GameState,
    sector: NonNullable<GameState['military']['corps_front_sectors']>[string] | null | undefined,
    targetOsid: string,
    controller: FactionId,
    adjacency: Map<string, string[]>,
): FormationState[] {
    if (!sector) return [];
    const territory = new Set<string>(sector.territory_osids ?? []);
    for (const segment of sector.sub_segments ?? []) {
        for (const osid of segment.friendly_osids ?? []) territory.add(osid);
    }

    return Object.values(state.military.formations ?? {})
        .filter((formation): formation is FormationState => {
            if (!formation || formation.status !== 'active') return false;
            if (formation.faction !== controller) return false;
            if (!formationBelongsToCorps(formation, sector.corps_id)) return false;
            // D1 is own-sector only: never borrow any operation participant into another sector.
            if (!isStandingOgDefenseBrigadeAvailable(state, formation.id, { planningParticipantsDefend: false })) return false;
            if ((formation.personnel ?? 0) < MIN_ATTACK_PERSONNEL) return false;
            const locOsid = (formation as { location_osid?: string }).location_osid;
            if (!locOsid || locOsid === targetOsid) return false;
            if (!territory.has(locOsid)) return false;
            if (getPoliticalControllerOSID(state, locOsid, undefined) !== controller) return false;
            return bfsDistanceFriendly(locOsid, targetOsid, adjacency, state.political?.political_controllers ?? {}, controller) === 1;
        })
        .sort((a, b) => strictCompare(a.id, b.id));
}

/** Other sectors of the same corps and faction whose front (a sub-segment's friendly cells) includes the cell, by id. */
function findSameCorpsSeamSectors(
    state: GameState,
    sector: NonNullable<GameState['military']['corps_front_sectors']>[string],
    targetOsid: string,
): Array<NonNullable<GameState['military']['corps_front_sectors']>[string]> {
    const sectors = state.military.corps_front_sectors ?? {};
    return Object.keys(sectors)
        .sort(strictCompare)
        .map((id) => sectors[id]!)
        .filter((other) => other.sector_id !== sector.sector_id
            && other.corps_id === sector.corps_id
            && other.faction === sector.faction
            && (other.sub_segments ?? []).some((sub) => (sub.friendly_osids ?? []).includes(targetOsid)));
}

export function collectSectorDefenseBrigades(
    state: GameState,
    sector: NonNullable<GameState['military']['corps_front_sectors']>[string] | null | undefined,
    targetOsid: string,
    controller: FactionId,
    adjacency: Map<string, string[]>,
    defenderFormations: FormationState[],
    options: { includeSeams?: boolean } = {},
): FormationState[] {
    const pc = state.political?.political_controllers ?? {};
    const corpsMustHoldOsids = sector ? (state.military.must_hold_osids_by_corps?.[sector.corps_id] ?? []) : [];
    const sectorBrigades: FormationState[] = [];
    // Ruling D step 4 (2026-11-17): a front cell on the seam of two sectors of the SAME corps is
    // defended by both rosters. The sector lookup returns one sector per cell, so the other
    // sector's line brigades never reacted, however close (Donja Bočinja: sector 1 alone, while
    // the 2nd Armored of sector 0 stood two hops away). Other corps' sectors are not added.
    // `includeSeams: false` gives the owning sector's roster alone (see `collectAverageDefenseRoster`).
    const seamSectors = sector && options.includeSeams !== false ? findSameCorpsSeamSectors(state, sector, targetOsid) : [];
    for (const rosterSector of sector ? [sector, ...seamSectors] : []) {
        for (const id of getStandingOgDefenseBrigadeIds(rosterSector)) {
            const f = state.military.formations?.[id];
            if (f == null || f.status !== 'active' || !isStandingOgDefenseBrigadeAvailable(state, f.id)) continue;
            if (sectorBrigades.some((brigade) => brigade.id === f.id)) continue;
            const bLoc = (f as { location_osid?: string }).location_osid;
            if (bLoc && corpsMustHoldOsids.includes(bLoc) && bLoc !== targetOsid
                && bfsDistanceFriendly(bLoc, targetOsid, adjacency, pc, controller!) > ANCHOR_GARRISON_LOAN_MAX_HOPS) continue;
            sectorBrigades.push(f);
        }
    }
    for (const physicalDefender of defenderFormations) {
        if (!sectorBrigades.some((brigade) => brigade.id === physicalDefender.id)) {
            sectorBrigades.push(physicalDefender);
        }
    }
    if (sectorBrigades.length === 0 && sector) {
        sectorBrigades.push(...findEmptySectorAdjacentDefenders(
            state,
            sector,
            targetOsid,
            controller!,
            adjacency,
        ));
    }
    sectorBrigades.sort((a, b) => strictCompare(a.id, b.id));
    return sectorBrigades;
}

/**
 * The roster whose average brigade power sets the reaction's cap and floor (Fable consult 7 bound
 * on ruling D step 4, 2026-11-17): the owning sector's roster, without seam sectors. Seam brigades
 * may only ADD to the reaction pool. Averaging over the union let weak, distant seam brigades
 * dilute the average and so lower the cap and floor, making a seam cell weaker in 15 of 49 seam
 * battles. With the owning roster the defence is never below the no-seam defence: cap and floor are
 * unchanged and the pool only grows. Returns `null` (average over the full roster) when the owning
 * roster is the full roster (no seam brigade added) or is empty. The resolver
 * (`attack_resolution_osid.ts`) and the planner (`combat_predictor.ts`) both use it.
 */
export function collectAverageDefenseRoster(
    state: GameState,
    sector: NonNullable<GameState['military']['corps_front_sectors']>[string] | null | undefined,
    targetOsid: string,
    controller: FactionId,
    adjacency: Map<string, string[]>,
    defenderFormations: FormationState[],
    fullRoster: FormationState[],
): FormationState[] | null {
    const owning = collectSectorDefenseBrigades(state, sector, targetOsid, controller, adjacency, defenderFormations, { includeSeams: false });
    if (owning.length === 0) return null;
    // Both lists are sorted by id; identical ids mean no seam brigade was added.
    if (owning.length === fullRoster.length && owning.every((f, i) => f.id === fullRoster[i]!.id)) return null;
    return owning;
}

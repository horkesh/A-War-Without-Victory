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
            if (!isStandingOgDefenseBrigadeAvailable(state, formation.id)) return false;
            if ((formation.personnel ?? 0) < MIN_ATTACK_PERSONNEL) return false;
            const locOsid = (formation as { location_osid?: string }).location_osid;
            if (!locOsid || locOsid === targetOsid) return false;
            if (!territory.has(locOsid)) return false;
            if (getPoliticalControllerOSID(state, locOsid, undefined) !== controller) return false;
            return bfsDistanceFriendly(locOsid, targetOsid, adjacency, state.political?.political_controllers ?? {}, controller) === 1;
        })
        .sort((a, b) => strictCompare(a.id, b.id));
}

export function collectSectorDefenseBrigades(
    state: GameState,
    sector: NonNullable<GameState['military']['corps_front_sectors']>[string] | null | undefined,
    targetOsid: string,
    controller: FactionId,
    adjacency: Map<string, string[]>,
    defenderFormations: FormationState[],
): FormationState[] {
    const pc = state.political?.political_controllers ?? {};
    const corpsMustHoldOsids = sector ? (state.military.must_hold_osids_by_corps?.[sector.corps_id] ?? []) : [];
    const sectorBrigades = sector
        ? getStandingOgDefenseBrigadeIds(sector)
            .map(id => state.military.formations?.[id])
            .filter((f): f is FormationState =>
                f != null
                && f.status === 'active'
                && isStandingOgDefenseBrigadeAvailable(state, f.id)
            )
            .filter((f) => {
                const bLoc = (f as { location_osid?: string }).location_osid;
                if (!bLoc || !corpsMustHoldOsids.includes(bLoc) || bLoc === targetOsid) return true;
                const loanHops = bfsDistanceFriendly(bLoc, targetOsid, adjacency, pc, controller!);
                return loanHops <= ANCHOR_GARRISON_LOAN_MAX_HOPS;
            })
        : [];
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

/**
 * Phase I entry: OOB slot creation and eligibility.
 * OOB formations (brigades, corps) are created once when entering Phase I, gated by
 * faction presence in home mun (and not fragmented).
 */

import { resolveLocationOsid, type CanonicalToOperationalMap, type OperationalSettlementId, type OperationalToCanonicalReverseMap } from '../data/operational_data.js';
import type { EdgeRecord } from '../map/settlements.js';
import type { MunicipalityPopulation1991Map } from '../sim/early_war/pool_population.js';
import { getEligiblePopulationCount } from '../sim/early_war/pool_population.js';
import { analyzeFactionGraph, type FrontClassification } from '../sim/combat/osid_graph_analysis.js';
import { buildOsidAdjacency, type Osid } from '../sim/combat/osid_adjacency.js';
import { FACTION_INITIAL_COHESION, FACTION_INITIAL_PERSONNEL, MIN_BRIGADE_SPAWN, MIN_ELIGIBLE_POPULATION_FOR_BRIGADE } from '../state/formation_constants.js';
import { resolveFormationName } from '../state/formation_naming.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
    MunicipalityId,
    SettlementId
} from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import type { BrigadeDecoration } from '../state/decoration_types.js';
import type { OobBrigade, OobCorps } from './oob_loader.js';

/**
 * Returns true if faction F has presence in municipality M: at least one settlement
 * in M has political_controllers[sid] === F. Returns false if M is fragmented (no spawn).
 * Uses settlement→mun mapping (e.g. from LoadedSettlementGraph.settlements).
 */
export function factionHasPresenceInMun(
    state: GameState,
    faction: FactionId,
    munId: MunicipalityId,
    sidToMun: Map<SettlementId, MunicipalityId>
): boolean {
    if (state.municipalities?.[munId]?.control === 'fragmented') {
        return false;
    }
    const pc = state.political_controllers ?? {};
    for (const [sid, m] of sidToMun) {
        if (m === munId && pc[sid] === faction) {
            return true;
        }
    }
    return false;
}

/**
 * Build sid → mun1990_id map from a settlements Map (e.g. LoadedSettlementGraph.settlements).
 * Only includes entries where mun1990_id is present.
 */
export function buildSidToMunFromSettlements(
    settlements: Map<string, { mun1990_id?: string }>
): Map<SettlementId, MunicipalityId> {
    const out = new Map<SettlementId, MunicipalityId>();
    for (const [sid, rec] of settlements) {
        if (typeof rec.mun1990_id === 'string' && rec.mun1990_id) {
            out.set(sid, rec.mun1990_id);
        }
    }
    return out;
}

/**
 * Build OSID → mun1990_id map from operationalToCanonical reverse map + canonical SID→mun.
 * When political_controllers has been promoted to OSID keys (OSID-as-base-layer), consumers
 * like factionHasPresenceInMun need an OSID-keyed settlement→mun map instead of SID-keyed.
 *
 * For each OSID, finds the municipality by looking up one of its constituent canonical SIDs
 * in the canonical SID→mun map (all SIDs in an OSID are in the same municipality).
 *
 * Deterministic: OSIDs iterated in sorted order.
 */
export function buildOsidToMunFromReverseMap(
    operationalToCanonical: OperationalToCanonicalReverseMap,
    canonicalSidToMun: Map<SettlementId, MunicipalityId>
): Map<SettlementId, MunicipalityId> {
    const out = new Map<SettlementId, MunicipalityId>();
    const osids = Array.from(operationalToCanonical.keys()).sort((a, b) => a.localeCompare(b));
    for (const osid of osids) {
        const sids = operationalToCanonical.get(osid) ?? [];
        for (const sid of sids) {
            const mun = canonicalSidToMun.get(sid);
            if (mun) {
                out.set(osid as SettlementId, mun);
                break;
            }
        }
    }
    return out;
}

export interface CreateOobFormationsReport {
    corps_created: number;
    brigades_created: number;
}

/**
 * Convert OOB historical_decorations + legacy honor into BrigadeDecoration[].
 * Historical decorations from OOB take priority. Legacy honor is fallback.
 */
function convertOobDecorations(b: OobBrigade): BrigadeDecoration[] {
    const result: BrigadeDecoration[] = [];
    if (b.historical_decorations && b.historical_decorations.length > 0) {
        for (const hd of b.historical_decorations) {
            result.push({ tier: hd.tier, awarded_turn: 0, reason: `Historical: ${hd.name}` });
        }
    } else if (b.honor === 'slavna') {
        result.push({ tier: 'tier_1', awarded_turn: 0, reason: 'Historical: Slavna' });
    } else if (b.honor === 'viteska') {
        result.push({ tier: 'tier_2', awarded_turn: 0, reason: 'Historical: Viteška' });
    }
    return result;
}

/**
 * Create OOB formations (corps then brigades) at Phase I entry. Only creates slots when
 * faction has presence in home/hq mun and formation id does not already exist. Idempotent.
 * Mutates state.formations. Uses municipalityHqSettlement to set hq_sid on each formation.
 * When population1991ByMun is provided, brigades in muns where faction's 1991 population is
 * below MIN_ELIGIBLE_POPULATION_FOR_BRIGADE get a generic name (demographic gating).
 */
export function createOobFormationsAtPhaseIEntry(
    state: GameState,
    oobCorps: OobCorps[],
    oobBrigades: OobBrigade[],
    municipalityHqSettlement: Record<string, string>,
    sidToMun: Map<SettlementId, MunicipalityId>,
    population1991ByMun?: MunicipalityPopulation1991Map,
    canonicalToOperational?: CanonicalToOperationalMap
): CreateOobFormationsReport {
    const report: CreateOobFormationsReport = { corps_created: 0, brigades_created: 0 };
    if (!state.formations || typeof state.formations !== 'object') {
        (state as GameState & { formations: Record<string, FormationState> }).formations = {};
    }
    const currentTurn = state.meta.turn;

    // Phase I Overhaul (bottom_up mode): only RS corps and army_hq entries are created at turn 0.
    // RBiH and HRHB corps are deferred to activateCorpsForTurn() at their available_from turns.
    // RS brigades still come from OOB at turn 0 (VRS JNA exception).
    // RBiH and HRHB brigades are never created here — they emerge as TO detachments from pools.
    const isBottomUp = state.meta.recruitment_mode === 'bottom_up';

    for (const c of oobCorps) {
        // bottom_up: skip non-RS corps that are not army_hq (army_hq also follows available_from logic)
        // Exception: RS army_hq (vrs_main_staff) is kind='army_hq' and available_from=0 — keep it.
        if (isBottomUp && c.faction !== 'RS') continue;
        if (state.formations[c.id]) continue;
        if (!factionHasPresenceInMun(state, c.faction, c.hq_mun, sidToMun)) continue;
        const hq_sid = municipalityHqSettlement[c.hq_mun];
        const location_osid =
            c.hq_osid ?? (canonicalToOperational && hq_sid ? resolveLocationOsid(hq_sid, canonicalToOperational) : undefined);
        const formation: FormationState = {
            id: c.id as FormationId,
            faction: c.faction,
            name: c.name,
            created_turn: currentTurn,
            status: 'active',
            assignment: null,
            tags: [`mun:${c.hq_mun}`],
            kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
            personnel: 0,
            ...(hq_sid ? { hq_sid } : {}),
            ...(location_osid != null ? { location_osid } : {})
        };
        state.formations[c.id] = formation;
        report.corps_created += 1;
    }

    const brigadeCountByFactionMun = new Map<string, number>();
    for (const b of oobBrigades) {
        // bottom_up: skip RBiH and HRHB brigades entirely — they emerge from pools as TO detachments.
        // RS brigades are created at turn 0 (VRS JNA exception).
        if (isBottomUp && b.faction !== 'RS') continue;
        if (state.formations[b.id]) continue;
        if (!factionHasPresenceInMun(state, b.faction, b.home_mun, sidToMun)) continue;
        const hq_sid = municipalityHqSettlement[b.home_mun];
        const tags = [`mun:${b.home_mun}`];
        if (b.corps) tags.push(`corps:${b.corps}`);
        if (b.tags) tags.push(...b.tags);
        tags.sort((x, y) => x.localeCompare(y));
        const eligiblePop = getEligiblePopulationCount(population1991ByMun, b.home_mun, b.faction);
        const ordinal = (brigadeCountByFactionMun.get(`${b.faction}:${b.home_mun}`) ?? 0) + 1;
        brigadeCountByFactionMun.set(`${b.faction}:${b.home_mun}`, ordinal);
        const name =
            population1991ByMun != null && eligiblePop < MIN_ELIGIBLE_POPULATION_FOR_BRIGADE
                ? resolveFormationName(b.faction as FactionId, b.home_mun, 'brigade', ordinal)
                : b.name;
        // Resolve location OSID: use per-brigade home_osid override if present, else derive from HQ settlement.
        const location_osid = b.home_osid
            ? b.home_osid
            : (canonicalToOperational && hq_sid ? resolveLocationOsid(hq_sid, canonicalToOperational) : undefined);
        // Per-brigade personnel/cohesion overrides (April 1992 defaults; Phase 0 gameplay overrides these).
        const initialPersonnel = b.initial_personnel ?? FACTION_INITIAL_PERSONNEL[b.faction] ?? MIN_BRIGADE_SPAWN;
        const initialCohesion = b.initial_cohesion ?? FACTION_INITIAL_COHESION[b.faction] ?? 60;
        const formation: FormationState = {
            id: b.id as FormationId,
            faction: b.faction,
            name,
            created_turn: currentTurn,
            status: 'active',
            assignment: null,
            tags,
            kind: b.kind,
            personnel: initialPersonnel,
            cohesion: initialCohesion,
            ...(b.honor ? { honor: b.honor } : {}),
            ...(hq_sid ? { hq_sid } : {}),
            ...(location_osid != null ? { location_osid } : {})
        };
        // Convert OOB historical decorations + legacy honor into decorations[]
        const decorations = convertOobDecorations(b);
        if (decorations.length > 0) formation.decorations = decorations;
        // OOB elite status
        if (b.is_elite) formation.elite_loan_state = { on_loan: false, loaned_to_corps: null, loan_start_turn: null, last_recall_turn: null, loan_start_personnel: null, permanently_degraded: false };
        // OOB composition override (e.g. enclave brigades: infantry-only)
        if (b.composition) {
            formation.composition = b.composition;
        }
        // OOB morale override (e.g. enclave brigades: 70 desperation bonus)
        if (b.initial_morale !== undefined) {
            formation.morale = b.initial_morale;
        }
        // Pre-war brigades (mandatory, available from turn 0) were already organized
        // before the simulation starts. Set initial entrenchment for defense bonus.
        if (b.mandatory && (b.available_from === 0 || b.available_from === undefined)) {
            (formation as { entrenchment_turns?: number }).entrenchment_turns = 4;
        }
        state.formations[b.id] = formation;
        report.brigades_created += 1;
    }

    return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// Initial brigade front-line spreading
// ═══════════════════════════════════════════════════════════════════════════

export interface SpreadBrigadesReport {
    /** Per-faction count of brigades that moved from HQ to front. */
    brigades_spread: Record<FactionId, number>;
    /** Per-faction count of front OSIDs that now have a brigade. */
    front_osids_covered: Record<FactionId, number>;
}

/**
 * Spread brigades from stacked HQ OSIDs to unoccupied front-line positions.
 *
 * After createOobFormationsAtPhaseIEntry() all brigades from the same municipality
 * are on the same OSID. This function redistributes them to cover the front.
 *
 * Algorithm:
 * 1. For each faction, analyze the OSID graph to find front classification.
 * 2. Collect all brigade formations, grouped by current OSID.
 * 3. For each unoccupied front OSID (priority: undefended > quiet),
 *    find the nearest over-stacked OSID and move one brigade.
 * 4. Keep at least 1 brigade per source OSID.
 * 5. Respect corps assignment (corps:X tag) — stay within 8 BFS hops of corps HQ.
 *
 * Deterministic: sorted iteration, no randomness.
 * Mutates: state.formations[id].location_osid for spread brigades.
 */
export function spreadBrigadesToFrontOsids(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): SpreadBrigadesReport {
    const report: SpreadBrigadesReport = {
        brigades_spread: {} as Record<FactionId, number>,
        front_osids_covered: {} as Record<FactionId, number>
    };

    const adjacency = buildOsidAdjacency(edges);
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare) as FactionId[];
    const formations = state.formations ?? {};

    for (const faction of factions) {
        report.brigades_spread[faction] = 0;
        report.front_osids_covered[faction] = 0;

        // Analyze graph to get front classifications
        const analysis = analyzeFactionGraph(state, faction, adjacency, reverseMap);

        // Collect brigades by current OSID
        const brigadesByOsid = new Map<Osid, FormationId[]>();
        const allBrigadeIds: FormationId[] = [];
        for (const [id, f] of Object.entries(formations)) {
            if (f.faction !== faction) continue;
            if (f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            const loc = (f as { location_osid?: string }).location_osid as Osid | undefined;
            if (!loc) continue;
            allBrigadeIds.push(id as FormationId);
            const list = brigadesByOsid.get(loc) ?? [];
            list.push(id as FormationId);
            brigadesByOsid.set(loc, list);
        }
        // Sort brigade lists per OSID for determinism
        for (const list of brigadesByOsid.values()) list.sort(strictCompare);
        allBrigadeIds.sort(strictCompare);

        if (allBrigadeIds.length === 0) continue;

        // Track which OSIDs already have a brigade assigned
        const assignedOsids = new Set<Osid>();
        for (const [osid, brigades] of brigadesByOsid) {
            if (brigades.length > 0) assignedOsids.add(osid);
        }

        // Identify front OSIDs that need a brigade, priority-ordered
        const classificationPriority: FrontClassification[] = ['undefended', 'quiet'];
        const targetFrontOsids: Osid[] = [];
        for (const cls of classificationPriority) {
            for (const [osid, oa] of analysis.osid_analysis) {
                if (oa.classification === cls && !assignedOsids.has(osid)) {
                    targetFrontOsids.push(osid);
                }
            }
        }

        // For each target front OSID, find nearest over-stacked source via BFS
        const movedBrigades = new Set<FormationId>();
        for (const targetOsid of targetFrontOsids) {
            // BFS from target toward sources
            const source = findNearestOverstackedOsid(
                targetOsid, adjacency, brigadesByOsid, movedBrigades, faction, analysis, state
            );
            if (!source) continue;

            // Pop one brigade from source
            const sourceList = brigadesByOsid.get(source.osid)!;
            const brigadeId = sourceList.pop()!;
            movedBrigades.add(brigadeId);

            // Move brigade to target
            const f = formations[brigadeId]!;
            (f as { location_osid?: string }).location_osid = targetOsid;

            // Update tracking
            const targetList = brigadesByOsid.get(targetOsid) ?? [];
            targetList.push(brigadeId);
            brigadesByOsid.set(targetOsid, targetList);
            assignedOsids.add(targetOsid);

            if (sourceList.length === 0) {
                brigadesByOsid.delete(source.osid);
                assignedOsids.delete(source.osid);
            }

            report.brigades_spread[faction]++;
        }

        // Count front OSIDs now covered
        for (const [osid] of analysis.osid_analysis) {
            const oa = analysis.osid_analysis.get(osid)!;
            if (oa.classification !== 'interior') {
                const brigades = brigadesByOsid.get(osid);
                if (brigades && brigades.length > 0) {
                    report.front_osids_covered[faction]++;
                }
            }
        }
    }

    return report;
}

/**
 * BFS from targetOsid through friendly territory to find nearest OSID
 * with 2+ brigades (so one can be removed while keeping at least 1).
 *
 * Deterministic: sorted neighbor expansion, consistent tie-breaking.
 */
function findNearestOverstackedOsid(
    targetOsid: Osid,
    adjacency: Map<Osid, Osid[]>,
    brigadesByOsid: Map<Osid, FormationId[]>,
    movedBrigades: Set<FormationId>,
    faction: FactionId,
    analysis: ReturnType<typeof analyzeFactionGraph>,
    state: GameState
): { osid: Osid } | null {
    const visited = new Set<Osid>();
    const queue: Osid[] = [targetOsid];
    visited.add(targetOsid);
    const maxHops = 8; // Don't spread farther than 8 hops from front
    let depth = 0;
    let layerSize = 1;
    let nextLayerSize = 0;

    while (queue.length > 0 && depth <= maxHops) {
        const current = queue.shift()!;
        layerSize--;

        // Check if this OSID is over-stacked (2+ brigades remaining)
        const brigades = brigadesByOsid.get(current);
        if (brigades) {
            const available = brigades.filter(b => !movedBrigades.has(b));
            if (available.length >= 2) {
                return { osid: current };
            }
        }

        // Expand to neighbors (friendly only)
        const neighbors = adjacency.get(current) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            // Must be friendly-controlled
            const oa = analysis.osid_analysis.get(n);
            if (!oa) continue; // Not controlled by this faction
            visited.add(n);
            queue.push(n);
            nextLayerSize++;
        }

        if (layerSize === 0) {
            depth++;
            layerSize = nextLayerSize;
            nextLayerSize = 0;
        }
    }
    return null;
}

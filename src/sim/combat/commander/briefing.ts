/**
 * briefing.ts — Assemble a CommanderBriefing for one corps.
 *
 * Pure data assembly: reads GameState + spatial context, returns structured
 * input for the commander decision loop. No decisions, no mutations.
 *
 * Deterministic: no Math.random(), no Date.now(), no timestamps.
 */

import type { EdgeRecord } from '../../../map/settlements.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
    CorpsFrontSector,
    CorpsOperation,
} from '../../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../../data/operational_data_types.js';
import type { OsidEthnicComposition } from '../ethnic_defense.js';
import type { FactionGraphAnalysis } from '../osid_graph_analysis.js';
import type { SpatialContext } from '../../spatial_context.js';

import type {
    CommanderBriefing,
    OfficerPersonality,
} from './commander_state.js';

import { getCorpsSubordinates } from '../bot_corps_helpers.js';
import { getCorpsCommander } from '../officer_system.js';
import { analyzeFrontGeometry, type FrontGeometryAssessment } from '../front_geometry_analysis.js';
import { strictCompare } from '../../../state/validateGameState.js';

// ---------------------------------------------------------------------------
// Default officer personality (used when no named officer is assigned)
// ---------------------------------------------------------------------------

const DEFAULT_PERSONALITY: OfficerPersonality = Object.freeze({
    aggression: 0.5,
    caution: 0.3,
    initiative: 0.3,
    competence: 0.5,
});

// ---------------------------------------------------------------------------
// Officer personality derivation
// ---------------------------------------------------------------------------

/**
 * Derive OfficerPersonality from existing named officer attributes (1-5 scale).
 *
 * Mapping:
 *   aggression  = aggressiveness / 5
 *   caution     = (5 - aggressiveness) / 5 * 0.5 + defensive_skill / 5 * 0.5
 *   initiative  = competence / 5 * 0.7 + (5 - political_reliability) / 5 * 0.3
 *   competence  = competence / 5
 */
function derivePersonality(
    competence: number,
    aggressiveness: number,
    defensiveSkill: number,
    politicalReliability: number,
): OfficerPersonality {
    // Officer attributes are on a 1-5 scale; normalize to 0-1.
    const maxAttr = 5;
    return {
        aggression: aggressiveness / maxAttr,
        caution:
            ((maxAttr - aggressiveness) / maxAttr) * 0.5 +
            (defensiveSkill / maxAttr) * 0.5,
        initiative:
            (competence / maxAttr) * 0.7 +
            ((maxAttr - politicalReliability) / maxAttr) * 0.3,
        competence: competence / maxAttr,
    };
}

// ---------------------------------------------------------------------------
// Sector collection
// ---------------------------------------------------------------------------

/**
 * Collect all CorpsFrontSectors belonging to a specific corps.
 * Returns sectors sorted by sector_id for determinism.
 */
function getCorpsSectors(
    state: GameState,
    corpsId: FormationId,
): CorpsFrontSector[] {
    const sectorLookup = state.military.corps_front_sectors ?? {};
    const result: CorpsFrontSector[] = [];
    for (const sectorId of Object.keys(sectorLookup).sort(strictCompare)) {
        const sector = sectorLookup[sectorId];
        if (sector && sector.corps_id === corpsId) {
            result.push(sector);
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// Front geometry (best-effort)
// ---------------------------------------------------------------------------

/**
 * Attempt to build a FrontGeometryAssessment for this corps.
 * Returns null if required data is missing.
 */
function tryAnalyzeFrontGeometry(
    state: GameState,
    faction: FactionId,
    sectors: readonly CorpsFrontSector[],
    spatial: SpatialContext,
    ethnicMap: OsidEthnicComposition | null,
): FrontGeometryAssessment | null {
    // Need at least one sector with territory
    if (sectors.length === 0) return null;

    // Collect faction OSIDs from sectors' territory
    const factionOsidSet = new Set<string>();
    for (const sector of sectors) {
        for (const osid of sector.territory_osids) {
            factionOsidSet.add(osid);
        }
    }
    const factionOsids = [...factionOsidSet].sort(strictCompare);
    if (factionOsids.length === 0) return null;

    // Collect enemy OSIDs adjacent to this corps's front
    const enemyOsidSet = new Set<string>();
    const friendlySet = spatial.friendlyOsidsByFaction.get(faction);
    for (const osid of factionOsids) {
        const neighbors = spatial.adjacency.get(osid as string & { readonly __brand?: unknown });
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (!friendlySet || !friendlySet.has(n)) {
                enemyOsidSet.add(n);
            }
        }
    }
    const enemyOsids = [...enemyOsidSet].sort(strictCompare);

    // analyzeFrontGeometry expects mutable Map — cast adjacency (read-only access)
    const adjMap = spatial.adjacency as Map<string, string[]>;

    return analyzeFrontGeometry(
        faction,
        factionOsids,
        enemyOsids,
        enemyOsids, // target OSIDs = full hostile boundary
        adjMap,
        ethnicMap,
    );
}

// ---------------------------------------------------------------------------
// Pre-planned operations
// ---------------------------------------------------------------------------

/**
 * Get queued/pre-planned operation names for a corps.
 * Returns an array of operation name strings (loose typed for now).
 */
function getPrePlannedOps(
    state: GameState,
    corpsId: FormationId,
): readonly unknown[] {
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return [];
    return cmd.queued_operations ?? [];
}

/**
 * Get active operations currently running for a corps.
 * Used by the commander loop to derive offensive_targets when no plan is active.
 */
function getActiveOperations(
    state: GameState,
    corpsId: FormationId,
): readonly CorpsOperation[] {
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return [];
    return cmd.active_operations ?? [];
}

// ---------------------------------------------------------------------------
// Intel data (stub — collect what exists)
// ---------------------------------------------------------------------------

/**
 * Collect available intel data for this corps's sectors.
 * Returns a loose object for now; will be tightened as IntelPicture matures.
 */
function collectIntelData(
    state: GameState,
    corpsId: FormationId,
    sectors: readonly CorpsFrontSector[],
): unknown {
    const sectorIntel = state.military.sector_intel ?? {};
    const opsecSectors = new Set(state.military.opsec_sectors ?? []);

    // Gather sector intel records for this corps's sectors
    const intelBySector: Record<string, unknown> = {};
    for (const sector of sectors) {
        const records = sectorIntel[sector.sector_id];
        if (records) {
            intelBySector[sector.sector_id] = records;
        }
    }

    return {
        sector_intel: intelBySector,
        opsec_active_sectors: sectors
            .filter(s => opsecSectors.has(s.sector_id))
            .map(s => s.sector_id),
    };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Build a CommanderBriefing for one corps.
 *
 * Pure data assembly — reads state, returns structured output.
 * No side effects, no mutations, deterministic.
 */
export function buildBriefing(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    spatial: SpatialContext,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid: unknown,
    ethnicMap: OsidEthnicComposition | null,
): CommanderBriefing {
    const turn = state.meta?.turn ?? 0;

    // 1. Corps command data
    const corpsCmd = state.military.corps_command?.[corpsId];
    const corpsStance = corpsCmd?.stance ?? 'balanced';

    // 2. Sectors for this corps
    const sectors = getCorpsSectors(state, corpsId);

    // 3. Brigades subordinate to this corps
    const brigades: readonly FormationState[] = getCorpsSubordinates(state, corpsId);

    // 4. Officer personality
    let personality: OfficerPersonality = DEFAULT_PERSONALITY;
    const commander = getCorpsCommander(corpsId, state);
    if (commander) {
        personality = derivePersonality(
            commander.data.competence,
            commander.data.aggressiveness,
            commander.data.defensive_skill,
            commander.data.political_reliability,
        );
    }

    // 5. Doctrine stance — deprecated for commander system.
    // Commander decides from zone posture + personality, not hardcoded week schedule.
    // Kept as 'balanced' for interface compatibility.
    const doctrineStance = 'balanced';

    // 6. Front geometry (best-effort)
    const frontGeometry = tryAnalyzeFrontGeometry(
        state,
        faction,
        sectors,
        spatial,
        ethnicMap,
    );

    // 7. Intel data
    const intelData = collectIntelData(state, corpsId, sectors);

    // 8. Pre-planned operations
    const prePlannedOps = getPrePlannedOps(state, corpsId);

    // 9. Previous commander state from last turn's persisted state
    const previousState = corpsCmd?.commander_state ?? null;

    // 10. Active operations currently in the field (needed by emit for RC1 fallback)
    const activeOperations = getActiveOperations(state, corpsId);

    // 11. Assemble briefing
    const mustHoldOsids: string[] = state.military.must_hold_osids_by_corps?.[corpsId] ?? [];

    return {
        corps_id: corpsId,
        faction,
        turn,
        spatial,
        sectors,
        brigades,
        supply_by_osid: supplyByOsid,
        ethnic_map: ethnicMap,
        graph_analysis: graphAnalysis,
        front_geometry: frontGeometry,
        intel_data: intelData,
        doctrine_stance: doctrineStance,
        corps_stance: corpsStance,
        officer_personality: personality,
        pre_planned_ops: prePlannedOps,
        previous_state: previousState,
        active_operations: activeOperations,
        must_hold_osids: mustHoldOsids,
    };
}

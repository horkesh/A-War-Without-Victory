/**
 * Sector-facing intelligence system.
 *
 * deriveSectorIntel: runs each turn after partition-corps-front-sectors,
 *   before generate-bot-corps-orders. Builds per-friendly-sector intel records
 *   for each facing enemy sector.
 *
 * updateSectorIntelFromCombat: called after each attack engagement to set
 *   confidence to 1.0 (recon by force).
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    GameState,
    SectorIntelRecord,
    SectorIntelSource,
    SectorStrengthCategory,
    SectorPostureObserved,
} from '../../state/game_state.js';
import {
    FACTION_RECON_PROFILES,
    FACTION_INITIAL_INTEL_CONFIDENCE,
    CONFIDENCE_ROUGH_STRENGTH,
    CONFIDENCE_FRONT_BRIGADES,
    CONFIDENCE_FULL_STRENGTH,
    CONFIDENCE_DEEP_INTEL,
    SECTOR_INTEL_SOURCE_CONFIDENCE_BONUS,
} from './sector_intel_constants.js';
import { strictCompare } from '../../state/validateGameState.js';

// ===============================================================
// Main Derivation
// ===============================================================

/**
 * Derive sector-facing intelligence for the current turn.
 * Reads corps_front_sectors (already computed this turn).
 * Writes to state.sector_intel.
 */
export function deriveSectorIntel(state: GameState, turn: number): void {
    const sectors = state.military.corps_front_sectors;
    if (!sectors || Object.keys(sectors).length === 0) {
        state.military.sector_intel = {};
        return;
    }

    const edgeToSectors = buildEdgeToSectorsMap(sectors);
    const prevIntel = state.military.sector_intel ?? {};
    const nextIntel: Record<string, SectorIntelRecord[]> = {};
    const sectorIds = Object.keys(sectors).sort(strictCompare);

    for (const sectorId of sectorIds) {
        const sector = sectors[sectorId];
        if (!sector.faction) continue;
        const profile = FACTION_RECON_PROFILES[sector.faction as NonNullable<FactionId>];
        if (!profile) continue;

        const enemySectorEdgeCounts = findEnemySectorEdgeCounts(sector, edgeToSectors, sectors);
        const prevRecords = prevIntel[sectorId] ?? [];
        const prevByEnemySector = new Map<string, SectorIntelRecord>();
        for (const rec of prevRecords) {
            prevByEnemySector.set(rec.enemy_sector_id, rec);
        }

        const newRecords: SectorIntelRecord[] = [];
        const enemySectorIds = [...enemySectorEdgeCounts.keys()].sort(strictCompare);
        const initialFloor = FACTION_INITIAL_INTEL_CONFIDENCE[sector.faction as NonNullable<FactionId>] ?? 0;

        for (const enemySectorId of enemySectorIds) {
            const edgeCount = enemySectorEdgeCounts.get(enemySectorId) ?? 0;
            const enemySector = sectors[enemySectorId];
            if (!enemySector) continue;
            const prev = prevByEnemySector.get(enemySectorId);
            const prevConfidence = prev?.confidence ?? initialFloor;
            const prevTurnsInContact = prev?.turns_in_contact ?? 0;
            const passiveBuildup = (state.military.opsec_sectors ?? []).includes(enemySectorId)
                ? profile.passive_buildup_per_turn * 0.5
                : profile.passive_buildup_per_turn;
            // Intel goes stale: decay applies even in contact. Passive buildup
            // partially offsets it, but net effect is negative — only combat or
            // probes refresh intel to full confidence.
            let newConfidence = Math.min(1.0, Math.max(0, prevConfidence + passiveBuildup - profile.confidence_decay_per_turn));

            // Concentration detection: if enemy has 2+ reserve brigades, defenders detect staging
            if ((enemySector.reserve_brigade_ids?.length ?? 0) >= 2) {
                newConfidence = Math.min(1.0, newConfidence + 0.10);
            }

            const turnsInContact = prevTurnsInContact + 1;
            newRecords.push(buildRecord(
                sector, enemySectorId, enemySector, edgeCount,
                newConfidence, turnsInContact, turn, state, profile.recon_range
            ));
        }

        for (const [enemySectorId, prev] of prevByEnemySector) {
            if (enemySectorEdgeCounts.has(enemySectorId)) continue;
            const decayed = Math.max(0, prev.confidence - profile.confidence_decay_per_turn);
            if (decayed <= 0) continue;
            const enemySector = sectors[enemySectorId];
            if (!enemySector) continue;
            newRecords.push(buildRecord(
                sector, enemySectorId, enemySector, 0,
                decayed, 0, turn, state, profile.recon_range
            ));
        }

        newRecords.sort((a, b) => strictCompare(a.enemy_sector_id, b.enemy_sector_id));
        nextIntel[sectorId] = newRecords;
    }

    state.military.sector_intel = nextIntel;
}

// ===============================================================
// Recon-by-Force Update
// ===============================================================

/**
 * Called after a combat engagement to set confidence = 1.0 for the
 * sector pair involved (recon by force).
 */
export function updateSectorIntelFromCombat(
    state: GameState,
    attackerOsid: string,
    defenderOsid: string,
    turn: number
): void {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return;
    const intel = state.military.sector_intel;
    if (!intel) return;

    const friendlySectorId = findSectorByFriendlyOsid(sectors, attackerOsid);
    if (!friendlySectorId) return;
    const enemySectorId = findSectorByFriendlyOsid(sectors, defenderOsid);
    if (!enemySectorId) return;

    const friendlySector = sectors[friendlySectorId];
    const enemySector = sectors[enemySectorId];
    if (!friendlySector || !enemySector) return;
    if (friendlySector.faction === enemySector.faction) return;

    const records = intel[friendlySectorId];
    if (!records) return;
    const rec = records.find(r => r.enemy_sector_id === enemySectorId);
    if (!rec) return;

    const profile = FACTION_RECON_PROFILES[friendlySector.faction as NonNullable<FactionId>];
    if (!profile) return;

    rec.confidence = 1.0;
    rec.last_updated_turn = turn;
    rec.strength_category = computeStrengthCategory(enemySector, 1.0);
    rec.posture_observed = computePosture(enemySector, state, 1.0);
    rec.offensive_signs = computeOffensiveSigns(enemySector, state, 1.0, profile.recon_range);
    rec.visible_brigade_ids = computeVisibleBrigades(enemySector, 1.0, profile.recon_range).sort(strictCompare);
    rec.osid_confidence = [{
        osid: defenderOsid,
        confidence: 1,
        sources: ['combat'],
    }];
}

// ===============================================================
// Record Construction and Derivations
// ===============================================================

function buildRecord(
    friendlySector: CorpsFrontSector,
    enemySectorId: string,
    enemySector: CorpsFrontSector,
    edgeCount: number,
    confidence: number,
    turnsInContact: number,
    turn: number,
    state: GameState,
    reconRange: number
): SectorIntelRecord {
    return {
        enemy_sector_id: enemySectorId,
        enemy_faction: enemySector.faction,
        enemy_corps_id: enemySector.corps_id,
        front_edge_count: edgeCount,
        strength_category: computeStrengthCategory(enemySector, confidence),
        posture_observed: computePosture(enemySector, state, confidence),
        offensive_signs: computeOffensiveSigns(enemySector, state, confidence, reconRange),
        confidence,
        turns_in_contact: turnsInContact,
        visible_brigade_ids: computeVisibleBrigades(enemySector, confidence, reconRange).sort(strictCompare),
        osid_confidence: computeOsidConfidence(friendlySector, enemySector, confidence, reconRange),
        last_updated_turn: turn,
    };
}

function computeOsidConfidence(
    friendlySector: CorpsFrontSector,
    enemySector: CorpsFrontSector,
    confidence: number,
    reconRange: number,
): SectorIntelRecord['osid_confidence'] {
    const enemyOsidSet = new Set<string>([
        ...(enemySector.territory_osids ?? []),
        ...enemySector.sub_segments.flatMap(sub => sub.friendly_osids),
    ]);
    const observed = new Set<string>();
    for (const sub of friendlySector.sub_segments) {
        for (const osid of sub.enemy_osids) {
            if (enemyOsidSet.has(osid)) {
                observed.add(osid);
            }
        }
    }
    const osids = [...observed].sort(strictCompare);
    if (osids.length === 0) return [];

    const sources = computeIntelSources(friendlySector, reconRange);
    const sourceBonus = sources.reduce(
        (sum, source) => sum + SECTOR_INTEL_SOURCE_CONFIDENCE_BONUS[source],
        0,
    );
    const osidConfidence = Math.min(1, Math.max(0, confidence + sourceBonus));
    return osids.map(osid => ({
        osid,
        confidence: osidConfidence,
        sources: [...sources],
    }));
}

function computeIntelSources(
    friendlySector: CorpsFrontSector,
    reconRange: number,
): SectorIntelSource[] {
    const sources: SectorIntelSource[] = ['passive_contact'];
    if (friendlySector.sector_stance === 'screening' || friendlySector.sector_stance === 'active_defense') {
        sources.push('patrol');
    }
    if (reconRange >= 2) {
        sources.push('scout');
    }
    return sources;
}

function computeStrengthCategory(sector: CorpsFrontSector, confidence: number): SectorStrengthCategory {
    if (confidence < CONFIDENCE_ROUGH_STRENGTH) return 'unknown';
    const density = sector.density;
    if (density < 0.5) return 'thin';
    if (density < 1.0) return 'moderate';
    if (density < 2.0) return 'dense';
    return 'fortress';
}

function computePosture(sector: CorpsFrontSector, state: GameState, confidence: number): SectorPostureObserved {
    if (confidence < CONFIDENCE_FULL_STRENGTH) return 'unknown';
    const corpsCommand = state.military.corps_command?.[sector.corps_id];
    if (corpsCommand?.active_operations?.some(op => op.type === 'sector_attack' || op.type === 'feint' || op.type === 'probe')) {
        return 'offensive_prep';
    }
    if (sector.density >= 1.5) return 'entrenched';
    return 'defensive';
}

function computeOffensiveSigns(sector: CorpsFrontSector, state: GameState, confidence: number, _reconRange: number): boolean {
    // Offensive signs are rough contact intelligence, not full strength/posture truth.
    // Late-war attack sectors can remain below CONFIDENCE_FULL_STRENGTH because intel
    // decays even in contact, but defenders should still notice staging pressure.
    if (confidence < CONFIDENCE_ROUGH_STRENGTH) return false;
    const corpsCommand = state.military.corps_command?.[sector.corps_id];
    return corpsCommand?.active_operations?.some(op => op.type === 'sector_attack' || op.type === 'feint' || op.type === 'probe') ?? false;
}

function computeVisibleBrigades(sector: CorpsFrontSector, confidence: number, reconRange: number): FormationId[] {
    if (confidence < CONFIDENCE_FRONT_BRIGADES) return [];
    const assigned = sector.assigned_brigade_ids;
    if (confidence >= CONFIDENCE_DEEP_INTEL && reconRange >= 2) {
        return [...assigned, ...sector.reserve_brigade_ids];
    }
    if (confidence >= CONFIDENCE_FULL_STRENGTH) {
        return [...assigned];
    }
    const fraction = (confidence - CONFIDENCE_FRONT_BRIGADES) / (CONFIDENCE_FULL_STRENGTH - CONFIDENCE_FRONT_BRIGADES);
    const count = Math.max(1, Math.round(fraction * assigned.length));
    return assigned.slice(0, count);
}

// ===============================================================
// Utility Helpers
// ===============================================================

function buildEdgeToSectorsMap(sectors: Record<string, CorpsFrontSector>): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const [sectorId, sector] of Object.entries(sectors)) {
        for (const edgeId of sector.edge_ids) {
            let list = map.get(edgeId);
            if (!list) { list = []; map.set(edgeId, list); }
            list.push(sectorId);
        }
    }
    return map;
}

function findEnemySectorEdgeCounts(
    sector: CorpsFrontSector,
    edgeToSectors: Map<string, string[]>,
    allSectors: Record<string, CorpsFrontSector>
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const edgeId of sector.edge_ids) {
        const sectorsForEdge = edgeToSectors.get(edgeId) ?? [];
        for (const otherId of sectorsForEdge) {
            if (otherId === sector.sector_id) continue;
            const other = allSectors[otherId];
            if (!other || other.faction === sector.faction) continue;
            counts.set(otherId, (counts.get(otherId) ?? 0) + 1);
        }
    }
    return counts;
}

function findSectorByFriendlyOsid(sectors: Record<string, CorpsFrontSector>, osid: string): string | null {
    for (const [sectorId, sector] of Object.entries(sectors)) {
        for (const sub of sector.sub_segments) {
            if (sub.friendly_osids.includes(osid)) return sectorId;
        }
    }
    return null;
}

// ===============================================================
// Intel Gate Helpers
// ===============================================================

/**
 * Get the mean intel confidence for a friendly sector
 * across all its facing enemy sector records.
 * Returns 0 if no intel data exists.
 */
export function getSectorIntelConfidence(state: GameState, sectorId: string): number {
    const records = state.military.sector_intel?.[sectorId];
    if (!records || records.length === 0) return 0;
    let sum = 0;
    for (const rec of records) {
        sum += rec.confidence;
    }
    return sum / records.length;
}

/**
 * Get the LOWEST (stalest) intel confidence across all enemy sector records
 * for a friendly sector. This is the blind spot — the sector pair where
 * intelligence is most outdated.
 *
 * n1194: Used for probe decisions instead of the mean. A probe refreshes ONE
 * enemy sector pair. If we check the mean, probing one pair doesn't raise
 * the mean above threshold → triggers redundant probes.
 */
export function getStalestSectorIntelConfidence(state: GameState, sectorId: string): number {
    const records = state.military.sector_intel?.[sectorId];
    if (!records || records.length === 0) return 0;
    let min = Infinity;
    for (const rec of records) {
        if (rec.confidence < min) min = rec.confidence;
    }
    return min === Infinity ? 0 : min;
}

/**
 * Get intel confidence for a specific attacker OSID vs a specific defender sector.
 *
 * Finds which friendly sector the attackerOsid belongs to, then looks up the
 * SectorIntelRecord for the given enemy sector ID.
 * Returns 0 if no intel data exists (blind — no sector match or no record).
 */
export function getSectorPairIntelConfidence(
    state: GameState,
    attackerOsid: string,
    defenderSectorId: string,
): number {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return 0;
    const friendlySectorId = findSectorByFriendlyOsid(sectors, attackerOsid);
    if (!friendlySectorId) return 0;
    const records = state.military.sector_intel?.[friendlySectorId];
    if (!records) return 0;
    const rec = records.find(r => r.enemy_sector_id === defenderSectorId);
    return rec?.confidence ?? 0;
}

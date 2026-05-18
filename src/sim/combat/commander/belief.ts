/**
 * belief.ts — BELIEF ASSEMBLY phase for v0.8.1 Corps Commander Intelligence.
 *
 * Assembles the commander's perception of the world from raw intel, previous beliefs,
 * and force assessments. Beliefs decay without confirmation and blend with priors.
 *
 * Pure function — no mutations to external state.
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

import { strictCompare } from '../../../state/validateGameState.js';
import type {
    CommanderBeliefState,
    CommanderBriefing,
    ForceAssessment,
    ZoneAssessment,
    ZoneBelief,
    ZoneId,
} from './commander_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Blend weight for fresh observation vs previous belief. */
const FRESH_OBSERVATION_WEIGHT = 0.7;

/** Blend weight for previous belief. */
const PREVIOUS_BELIEF_WEIGHT = 0.3;

/** Decay rate toward baseline when no contact. */
const NO_CONTACT_DECAY = 0.9;

/** Baseline enemy strength when no intel. */
const BASELINE_ENEMY_STRENGTH = 500;

/** Turns without confirmation before intent degrades to 'unknown'. */
const STALENESS_THRESHOLD = 3;

/** Default confidence when no previous data. */
const DEFAULT_CONFIDENCE = 0.3;

/** Default supply continuity confidence when no supply data. */
const DEFAULT_SUPPLY_CONFIDENCE = 0.5;

/** Blend weight for current subordinate reliability vs previous. */
const SUBORDINATE_CURRENT_WEIGHT = 0.7;

/** Blend weight for previous subordinate reliability. */
const SUBORDINATE_PREVIOUS_WEIGHT = 0.3;

/** Blend weight for current neighbor support vs previous. */
const NEIGHBOR_CURRENT_WEIGHT = 0.6;

/** Blend weight for previous neighbor support. */
const NEIGHBOR_PREVIOUS_WEIGHT = 0.4;

// ═══════════════════════════════════════════════════════════════════════════
// strengthCategoryToEstimate — maps strength category to numeric estimate
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map SectorStrengthCategory to a numeric estimate for enemy strength.
 * Canonical source: decide.ts::strengthCategoryToEstimate (duplicated here
 * because that function is not exported).
 */
function strengthCategoryToEstimate(category: string): number {
    switch (category) {
        case 'fortress': return 4000;
        case 'dense': return 3000;
        case 'moderate': return 2000;
        case 'thin': return 1000;
        case 'unknown': return 500;
        default: return 500;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// assembleBeliefState — main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assemble the commander's belief state from raw intel, previous beliefs,
 * and force assessments. Beliefs blend with priors and decay without confirmation.
 */
export function assembleBeliefState(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    forceAssessment: ForceAssessment,
    previousBeliefs: CommanderBeliefState | null,
    turn: number,
): CommanderBeliefState {
    const zoneBeliefs = assembleZoneBeliefs(briefing, zones, previousBeliefs, turn);
    const supplyConfidence = assembleSupplyContinuityConfidence(briefing, zones);
    const subordinateReliability = assembleSubordinateReliability(forceAssessment, previousBeliefs);
    const neighborSupport = assembleNeighborSupportConfidence(briefing, previousBeliefs);

    return {
        zone_beliefs: zoneBeliefs,
        supply_continuity_confidence: supplyConfidence,
        subordinate_reliability: subordinateReliability,
        neighbor_support_confidence: neighborSupport,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Zone Beliefs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build zone beliefs from sector intel, blending with previous beliefs.
 */
function assembleZoneBeliefs(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    previousBeliefs: CommanderBeliefState | null,
    turn: number,
): ZoneBelief[] {
    const sectorIntel = briefing.intel_data?.sector_intel ?? {};
    const sortedZones = [...zones].sort((a, b) => strictCompare(a.zone_id, b.zone_id));

    // Build previous belief lookup by zone_id
    const prevBeliefByZone = new Map<string, ZoneBelief>();
    if (previousBeliefs) {
        for (const zb of previousBeliefs.zone_beliefs) {
            prevBeliefByZone.set(zb.zone_id, zb);
        }
    }

    const beliefs: ZoneBelief[] = [];

    for (const zone of sortedZones) {
        const prevBelief = prevBeliefByZone.get(zone.zone_id) ?? null;

        // Gather sector intel records covering this zone
        const zoneIntelRecords = gatherZoneIntelRecords(zone, briefing, sectorIntel);
        const hasContact = zoneIntelRecords.length > 0;

        // 1. estimated_enemy_strength
        const { estimatedStrength, observationConfidence } = computeEstimatedEnemyStrength(
            zoneIntelRecords, prevBelief, hasContact,
        );

        // 2. estimated_enemy_intent
        const { intent, lastConfirmedTurn } = computeEstimatedEnemyIntent(
            zone, briefing, sectorIntel, prevBelief, hasContact, turn,
        );

        // 3. confidence
        const confidence = observationConfidence
            ?? briefing.previous_state?.intel_picture?.zone_confidence?.[zone.zone_id]
            ?? DEFAULT_CONFIDENCE;

        beliefs.push({
            zone_id: zone.zone_id,
            estimated_enemy_strength: estimatedStrength,
            estimated_enemy_intent: intent,
            confidence,
            last_confirmed_turn: lastConfirmedTurn,
        });
    }

    return beliefs;
}

/**
 * Gather all sector intel records for sectors covering the given zone.
 */
function gatherZoneIntelRecords(
    zone: ZoneAssessment,
    briefing: CommanderBriefing,
    sectorIntel: Readonly<Record<string, readonly import('../../../state/game_state.js').SectorIntelRecord[]>>,
): import('../../../state/game_state.js').SectorIntelRecord[] {
    const records: import('../../../state/game_state.js').SectorIntelRecord[] = [];

    const sectors = briefing.sectors ?? [];
    const sortedSectors = [...sectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of sortedSectors) {
        // Check if this sector covers any OSID in the zone
        const covers = zone.osids.some(osid => sector.territory_osids.includes(osid));
        if (!covers) continue;

        const sectorRecords = sectorIntel[sector.sector_id];
        if (sectorRecords) {
            for (const rec of sectorRecords) {
                records.push(rec);
            }
        }
    }

    return records;
}

/**
 * Compute estimated enemy strength for a zone.
 */
function computeEstimatedEnemyStrength(
    zoneIntelRecords: readonly import('../../../state/game_state.js').SectorIntelRecord[],
    prevBelief: ZoneBelief | null,
    hasContact: boolean,
): { estimatedStrength: number; observationConfidence: number | null } {
    if (hasContact) {
        // Fresh observation: sum strength estimates from intel records
        let freshObservation = 0;
        const confidenceSamples: number[] = [];
        for (const rec of zoneIntelRecords) {
            const osidConfidence = computeRecordOsidConfidence(rec);
            if (osidConfidence !== null) {
                confidenceSamples.push(osidConfidence);
            }
            freshObservation += strengthCategoryToEstimate(rec.strength_category) * (osidConfidence ?? 1);
        }
        const observationConfidence = meanConfidence(confidenceSamples);

        if (prevBelief) {
            // Blend with previous
            return {
                estimatedStrength: FRESH_OBSERVATION_WEIGHT * freshObservation
                    + PREVIOUS_BELIEF_WEIGHT * prevBelief.estimated_enemy_strength,
                observationConfidence,
            };
        }
        return { estimatedStrength: freshObservation, observationConfidence };
    }

    // No contact this turn
    if (prevBelief) {
        // Decay toward baseline
        return {
            estimatedStrength: prevBelief.estimated_enemy_strength * NO_CONTACT_DECAY
                + BASELINE_ENEMY_STRENGTH * (1 - NO_CONTACT_DECAY),
            observationConfidence: null,
        };
    }

    // No previous, no contact
    return { estimatedStrength: BASELINE_ENEMY_STRENGTH, observationConfidence: null };
}

function computeRecordOsidConfidence(
    rec: import('../../../state/game_state.js').SectorIntelRecord,
): number | null {
    const entries = rec.osid_confidence ?? [];
    if (entries.length === 0) return null;
    let sum = 0;
    for (const entry of entries) {
        sum += Math.max(0, Math.min(1, entry.confidence));
    }
    return sum / entries.length;
}

function meanConfidence(samples: readonly number[]): number | null {
    if (samples.length === 0) return null;
    let sum = 0;
    for (const sample of samples) {
        sum += sample;
    }
    return sum / samples.length;
}

/**
 * Compute estimated enemy intent and last confirmed turn for a zone.
 */
function computeEstimatedEnemyIntent(
    zone: ZoneAssessment,
    briefing: CommanderBriefing,
    sectorIntel: Readonly<Record<string, readonly import('../../../state/game_state.js').SectorIntelRecord[]>>,
    prevBelief: ZoneBelief | null,
    hasContact: boolean,
    turn: number,
): { intent: ZoneBelief['estimated_enemy_intent']; lastConfirmedTurn: number } {
    if (hasContact) {
        // Check for offensive signs
        let hasOffensiveSigns = false;
        let maxDisruptedTurns = 0;

        const intentSectors = briefing.sectors ?? [];
        const sortedSectors = [...intentSectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
        for (const sector of sortedSectors) {
            const covers = zone.osids.some(osid => sector.territory_osids.includes(osid));
            if (!covers) continue;

            const records = sectorIntel[sector.sector_id];
            if (records) {
                for (const rec of records) {
                    if (rec.offensive_signs) {
                        hasOffensiveSigns = true;
                    }
                }
            }

            // Check assigned brigade disruption in this sector
            const brigadeIds = sector.assigned_brigade_ids ?? [];
            const brigades = briefing.brigades ?? [];
            for (const brigId of brigadeIds) {
                const brigade = brigades.find(b => b.id === brigId);
                if (brigade?.disrupted_turns != null && brigade.disrupted_turns > maxDisruptedTurns) {
                    maxDisruptedTurns = brigade.disrupted_turns;
                }
            }
        }

        let intent: ZoneBelief['estimated_enemy_intent'];
        if (hasOffensiveSigns) {
            intent = 'mass';
        } else if (maxDisruptedTurns >= 3) {
            intent = 'attack';
        } else if (maxDisruptedTurns >= 1) {
            intent = 'probe';
        } else {
            intent = 'hold';
        }

        return { intent, lastConfirmedTurn: turn };
    }

    // No contact this turn — decay intent
    if (prevBelief) {
        const turnsSinceConfirmed = turn - prevBelief.last_confirmed_turn;
        if (turnsSinceConfirmed >= STALENESS_THRESHOLD) {
            return { intent: 'unknown', lastConfirmedTurn: prevBelief.last_confirmed_turn };
        }
        // Carry forward previous intent
        return { intent: prevBelief.estimated_enemy_intent, lastConfirmedTurn: prevBelief.last_confirmed_turn };
    }

    // No previous, no contact
    return { intent: 'unknown', lastConfirmedTurn: turn };
}

// ═══════════════════════════════════════════════════════════════════════════
// Supply Continuity Confidence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute supply continuity confidence from the supply report.
 * Ratio of non-critical OSIDs to total corps territory OSIDs.
 */
function assembleSupplyContinuityConfidence(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
): number {
    if (!briefing.supply_by_osid) return DEFAULT_SUPPLY_CONFIDENCE;

    // Collect all corps territory OSIDs from zones
    const corpsOsids = new Set<string>();
    for (const zone of zones) {
        for (const osid of zone.osids) {
            corpsOsids.add(osid);
        }
    }

    if (corpsOsids.size === 0) return DEFAULT_SUPPLY_CONFIDENCE;

    // Find our faction's supply entry
    const factionEntry = briefing.supply_by_osid.factions.find(
        f => f.faction_id === briefing.faction,
    );
    if (!factionEntry) return DEFAULT_SUPPLY_CONFIDENCE;

    // Build OSID→state lookup from faction supply data
    const supplyByOsid = new Map<string, string>();
    for (const entry of factionEntry.by_osid) {
        supplyByOsid.set(entry.osid, entry.state);
    }

    let totalInReport = 0;
    let nonCritical = 0;

    for (const osid of corpsOsids) {
        const state = supplyByOsid.get(osid);
        if (state !== undefined) {
            totalInReport++;
            if (state !== 'critical') {
                nonCritical++;
            }
        }
    }

    if (totalInReport === 0) return DEFAULT_SUPPLY_CONFIDENCE;
    return nonCritical / totalInReport;
}

// ═══════════════════════════════════════════════════════════════════════════
// Subordinate Reliability
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute per-brigade reliability scores, blending with previous beliefs.
 */
function assembleSubordinateReliability(
    forceAssessment: ForceAssessment,
    previousBeliefs: CommanderBeliefState | null,
): Record<string, number> {
    const reliability: Record<string, number> = {};

    const sortedEvals = [...forceAssessment.evaluations].sort(
        (a, b) => strictCompare(a.brigade_id, b.brigade_id),
    );

    const prevReliability = previousBeliefs?.subordinate_reliability ?? {};

    for (const eval_ of sortedEvals) {
        // current_score = (fitness_offense + combat_effective_bonus + not_disrupted_bonus) / 1.5
        const combatBonus = eval_.is_combat_effective ? 0.3 : 0;
        const disruptionBonus = !eval_.is_disrupted ? 0.2 : 0;
        let currentScore = (eval_.fitness_offense + combatBonus + disruptionBonus) / 1.5;
        // Clamp to [0, 1]
        currentScore = Math.max(0, Math.min(1, currentScore));

        const prevScore = prevReliability[eval_.brigade_id];
        if (prevScore !== undefined) {
            reliability[eval_.brigade_id] =
                SUBORDINATE_CURRENT_WEIGHT * currentScore
                + SUBORDINATE_PREVIOUS_WEIGHT * prevScore;
        } else {
            reliability[eval_.brigade_id] = currentScore;
        }
    }

    return reliability;
}

// ═══════════════════════════════════════════════════════════════════════════
// Neighbor Support Confidence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute per-neighboring-corps cooperation confidence, blending with previous.
 */
function assembleNeighborSupportConfidence(
    briefing: CommanderBriefing,
    previousBeliefs: CommanderBeliefState | null,
): Record<string, number> {
    const confidence: Record<string, number> = {};

    const adjacentCorps = briefing.adjacent_corps ?? [];
    const sortedCorps = [...adjacentCorps].sort(
        (a, b) => strictCompare(a.corps_id, b.corps_id),
    );

    const prevConfidence = previousBeliefs?.neighbor_support_confidence ?? {};

    for (const corps of sortedCorps) {
        let currentScore: number;
        if (corps.active_operations > 0) {
            currentScore = 0.6;
        } else if (corps.stance !== 'defensive') {
            currentScore = 0.4;
        } else {
            currentScore = 0.2;
        }

        const prevScore = prevConfidence[corps.corps_id];
        if (prevScore !== undefined) {
            confidence[corps.corps_id] =
                NEIGHBOR_CURRENT_WEIGHT * currentScore
                + NEIGHBOR_PREVIOUS_WEIGHT * prevScore;
        } else {
            confidence[corps.corps_id] = currentScore;
        }
    }

    return confidence;
}

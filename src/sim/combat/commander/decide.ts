/**
 * decide.ts — DECIDE phase for v0.8 Corps Commander Intelligence.
 *
 * Reacts to intelligence, adjusts stance, shifts reserves.
 * This is where the commander reads the battlefield and adapts.
 *
 * Pure function — no mutations to external state.
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

import type { FormationId, SectorStance, SectorIntelRecord } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import type {
    CommanderBriefing,
    CommanderPlan,
    CommanderState,
    BrigadeEvaluation,
    IntelPicture,
    OfficerPersonality,
    SectorActivityEntry,
    ThreatAssessment,
    ZoneAssessment,
    ZoneId,
} from './commander_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Turns of quiet before a sector is eligible for thinning to 'screening'. */
const QUIET_TURNS_FOR_SCREENING = 5;

/** Casualty threshold to classify sector activity as 'skirmish'. */
const SKIRMISH_CASUALTY_THRESHOLD = 10;

/** Casualty threshold to classify sector activity as 'active'. */
const ACTIVE_CASUALTY_THRESHOLD = 50;

/** Casualty threshold to classify sector activity as 'contested'. */
const CONTESTED_CASUALTY_THRESHOLD = 150;

/** Deficit above which a reinforcement request is 'critical'. */
const CRITICAL_DEFICIT_THRESHOLD = 2;

/** Commitment ratio above which a reinforcement request is 'high'. */
const HIGH_COMMITMENT_THRESHOLD = 8;

/** Brigade losses during concentration that trigger plan suspension. */
const PLAN_SUSPENSION_LOSS_THRESHOLD = 2;

/** Base zone confidence when no intel is available. */
const BASE_ZONE_CONFIDENCE = 0.3;

/** Confidence boost per turn of contact. */
const CONFIDENCE_PER_TURN_CONTACT = 0.05;

/** Max zone confidence from passive observation. */
const MAX_PASSIVE_CONFIDENCE = 0.8;

/** Confidence boost when offensive signs are detected. */
const OFFENSIVE_SIGNS_CONFIDENCE_BOOST = 0.15;

// ═══════════════════════════════════════════════════════════════════════════
// DecisionResult
// ═══════════════════════════════════════════════════════════════════════════

export interface DecisionResult {
    /** Sectors that should change stance. */
    stance_changes: Array<{ sector_id: string; new_stance: SectorStance; reason: string }>;
    /** Reserves to shift between zones. */
    reserve_shifts: Array<{ brigade_id: FormationId; from_zone: ZoneId; to_zone: ZoneId; reason: string }>;
    /** Updated intel picture. */
    intel_picture: IntelPicture;
    /** Sector activity log entries for this turn. */
    activity_entries: SectorActivityEntry[];
    /** Whether to suspend the current plan due to reactive concerns. */
    suspend_plan: boolean;
    suspend_reason?: string;
    /** Reinforcement requests to army HQ. */
    reinforcement_requests: Array<{ zone_id: ZoneId; brigades_needed: number; priority: 'critical' | 'high' | 'medium' | 'low' }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// makeDecisions — main DECIDE entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * React to intelligence, adjust stance, shift reserves.
 * This is where the commander reads the battlefield and adapts.
 */
export function makeDecisions(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    threats: ThreatAssessment,
    surplusPool: BrigadeEvaluation[],
    currentPlan: CommanderPlan | null,
    previousState: CommanderState | null,
): DecisionResult {
    const turn = briefing.turn;
    const personality = briefing.officer_personality;

    // 1. Update intel picture from briefing data
    const intelPicture = updateIntelPicture(briefing, zones, previousState, turn);

    // 2. Log sector activity
    const activityEntries = classifySectorActivity(briefing, zones, previousState, turn);

    // 3. Reactive stance changes
    const stanceChanges = computeStanceChanges(
        zones, threats, intelPicture, activityEntries, previousState, personality,
    );

    // 4. Reserve shifting
    const reserveShifts = computeReserveShifts(
        zones, threats, surplusPool, previousState, personality,
    );

    // 5. Plan suspension check
    const { suspend_plan, suspend_reason } = evaluatePlanSuspension(
        currentPlan, zones, threats, previousState, turn,
    );

    // 6. Reinforcement requests
    const reinforcementRequests = buildReinforcementRequests(zones);

    return {
        stance_changes: stanceChanges,
        reserve_shifts: reserveShifts,
        intel_picture: intelPicture,
        activity_entries: activityEntries,
        suspend_plan,
        suspend_reason,
        reinforcement_requests: reinforcementRequests,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Update Intel Picture
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build an updated IntelPicture from sector intel records and previous state.
 * Reads briefing.intel_data (sector_intel records, opsec_active_sectors).
 */
function updateIntelPicture(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    previousState: CommanderState | null,
    turn: number,
): IntelPicture {
    const prevIntel = previousState?.intel_picture ?? null;
    const prevZoneConfidence: Readonly<Record<string, number>> = prevIntel?.zone_confidence ?? {};

    // Parse intel_data (loosely typed for now)
    const intelData = briefing.intel_data as {
        sector_intel?: Record<string, SectorIntelRecord[]>;
        opsec_active_sectors?: string[];
    } | null;

    const sectorIntel = intelData?.sector_intel ?? {};

    // Build offensive_signs and concentration_detected from sector intel records
    const offensiveSigns: Record<string, number> = {};
    const concentrationDetected: Record<string, boolean> = {};

    const sectorIds = Object.keys(sectorIntel).sort(strictCompare);
    for (const sectorId of sectorIds) {
        const records = sectorIntel[sectorId];
        if (!records) continue;

        let signsCount = 0;
        let hasConcentration = false;

        for (const rec of records) {
            if (rec.offensive_signs) {
                signsCount++;
                hasConcentration = true;
            }
        }

        if (signsCount > 0) {
            offensiveSigns[sectorId] = signsCount;
        }
        if (hasConcentration) {
            concentrationDetected[sectorId] = true;
        }
    }

    // Update zone confidence: blend previous confidence with new intel
    const zoneConfidence: Record<string, number> = {};
    const sortedZones = [...zones].sort((a, b) => strictCompare(a.zone_id, b.zone_id));

    for (const zone of sortedZones) {
        const prevConf = prevZoneConfidence[zone.zone_id] ?? BASE_ZONE_CONFIDENCE;

        // Gather all sector intel records relevant to this zone
        let maxTurnsContact = 0;
        let hasOffensiveSigns = false;

        for (const sector of briefing.sectors) {
            if (!zone.osids.some(osid => sector.territory_osids.includes(osid))) continue;

            const records = sectorIntel[sector.sector_id];
            if (!records) continue;

            for (const rec of records) {
                if (rec.turns_in_contact > maxTurnsContact) {
                    maxTurnsContact = rec.turns_in_contact;
                }
                if (rec.offensive_signs) {
                    hasOffensiveSigns = true;
                }
            }
        }

        // Confidence grows with contact time
        let newConf = prevConf + maxTurnsContact * CONFIDENCE_PER_TURN_CONTACT;
        if (hasOffensiveSigns) {
            newConf += OFFENSIVE_SIGNS_CONFIDENCE_BOOST;
        }

        // Clamp
        newConf = Math.min(newConf, hasOffensiveSigns ? 1.0 : MAX_PASSIVE_CONFIDENCE);
        newConf = Math.max(newConf, BASE_ZONE_CONFIDENCE);

        zoneConfidence[zone.zone_id] = newConf;
    }

    return {
        zone_confidence: zoneConfidence,
        offensive_signs: offensiveSigns,
        concentration_detected: concentrationDetected,
        last_updated_turn: turn,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Classify Sector Activity
// ═══════════════════════════════════════════════════════════════════════════

/**
 * For each sector, classify activity this turn based on casualties, territory changes,
 * and enemy intel records.
 */
function classifySectorActivity(
    briefing: CommanderBriefing,
    zones: ZoneAssessment[],
    previousState: CommanderState | null,
    turn: number,
): SectorActivityEntry[] {
    const entries: SectorActivityEntry[] = [];
    const previousOsidSets = buildPreviousOsidSets(previousState);

    // Parse intel data for enemy strength estimates
    const intelData = briefing.intel_data as {
        sector_intel?: Record<string, SectorIntelRecord[]>;
    } | null;
    const sectorIntel = intelData?.sector_intel ?? {};

    // Process sectors deterministically
    const sectors = [...briefing.sectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    for (const sector of sectors) {
        if (sector.corps_id !== briefing.corps_id) continue;

        // Estimate own casualties: sum personnel losses for brigades in this sector
        // Use a heuristic: count disrupted brigades as an activity signal
        let ownCasualties = 0;
        let disruptedCount = 0;
        for (const brigId of sector.assigned_brigade_ids) {
            const brigade = briefing.brigades.find(b => b.id === brigId);
            if (brigade?.disrupted_turns && brigade.disrupted_turns > 0) {
                disruptedCount++;
                ownCasualties += 50; // Disrupted brigades imply recent combat
            }
        }

        // Check for territory changes in this sector's OSIDs
        let osidsLost = 0;
        if (previousState) {
            for (const osid of sector.territory_osids) {
                // If this OSID was in our previous zones but isn't now, territory was lost
                for (const [, prevOsids] of previousOsidSets) {
                    if (prevOsids.has(osid)) {
                        // OSID still in our territory — not lost
                        break;
                    }
                }
            }
            // Check if any previous OSIDs for this sector are now missing
            for (const prevZone of previousState.zone_assessments) {
                for (const osid of prevZone.osids) {
                    if (sector.territory_osids.includes(osid)) continue;
                    // This OSID was in a previous zone — check if it's still in any current zone
                    const stillHeld = zones.some(z => z.osids.includes(osid));
                    if (!stillHeld) {
                        osidsLost++;
                    }
                }
            }
        }

        // Enemy strength estimate from intel records
        let enemyStrengthEstimate = 0;
        const records = sectorIntel[sector.sector_id];
        if (records) {
            for (const rec of records) {
                // Map strength category to a numeric estimate
                enemyStrengthEstimate += strengthCategoryToEstimate(rec.strength_category);
            }
        }

        // Classify activity
        let activity: SectorActivityEntry['activity'];
        if (osidsLost > 0) {
            activity = 'overrun';
        } else if (ownCasualties >= CONTESTED_CASUALTY_THRESHOLD || disruptedCount >= 3) {
            activity = 'contested';
        } else if (ownCasualties >= ACTIVE_CASUALTY_THRESHOLD || disruptedCount >= 2) {
            activity = 'active';
        } else if (ownCasualties >= SKIRMISH_CASUALTY_THRESHOLD || disruptedCount >= 1) {
            activity = 'skirmish';
        } else {
            activity = 'quiet';
        }

        entries.push({
            sector_id: sector.sector_id,
            turn,
            activity,
            enemy_strength_estimate: enemyStrengthEstimate,
            own_casualties: ownCasualties,
        });
    }

    return entries;
}

/**
 * Map SectorStrengthCategory to a numeric estimate for enemy strength.
 */
function strengthCategoryToEstimate(
    category: string,
): number {
    switch (category) {
        case 'fortress': return 4000;
        case 'dense': return 3000;
        case 'moderate': return 2000;
        case 'thin': return 1000;
        case 'unknown': return 500;
        default: return 500;
    }
}

/**
 * Build a map of zone_id -> Set<osid> from previous state for loss detection.
 */
function buildPreviousOsidSets(
    previousState: CommanderState | null,
): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    if (!previousState) return result;
    for (const zone of previousState.zone_assessments) {
        result.set(zone.zone_id, new Set(zone.osids));
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Reactive Stance Changes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute stance changes based on threats, intel, and officer personality.
 *
 * Rules:
 * - Enemy massing detected → 'fortify' (cautious) or 'active_defense' (aggressive)
 * - Under heavy attack → 'defend' or 'fortify'
 * - Quiet for 5+ turns → consider 'screening' to thin the line
 * - Officer personality modifies: aggressive prefers active_defense, cautious prefers fortify
 */
function computeStanceChanges(
    zones: ZoneAssessment[],
    threats: ThreatAssessment,
    intelPicture: IntelPicture,
    activityEntries: SectorActivityEntry[],
    previousState: CommanderState | null,
    personality: OfficerPersonality,
): Array<{ sector_id: string; new_stance: SectorStance; reason: string }> {
    const changes: Array<{ sector_id: string; new_stance: SectorStance; reason: string }> = [];

    // Build threat level lookup by zone
    const threatByZone = new Map<string, string>();
    for (const tz of threats.threatened_zones) {
        threatByZone.set(tz.zone_id, tz.threat_level);
    }

    // Build activity lookup by sector
    const activityBySector = new Map<string, SectorActivityEntry>();
    for (const entry of activityEntries) {
        activityBySector.set(entry.sector_id, entry);
    }

    // Build quiet-turns count from previous activity log
    const quietTurnsBySector = new Map<string, number>();
    if (previousState) {
        // Count consecutive quiet turns from the end of the log
        const logBySector = new Map<string, SectorActivityEntry[]>();
        for (const entry of previousState.sector_activity_log) {
            const existing = logBySector.get(entry.sector_id) ?? [];
            existing.push(entry);
            logBySector.set(entry.sector_id, existing);
        }
        for (const [sectorId, entries] of logBySector) {
            // Sort by turn descending to count consecutive quiet from most recent
            const sorted = [...entries].sort((a, b) => b.turn - a.turn);
            let quietCount = 0;
            for (const e of sorted) {
                if (e.activity === 'quiet') {
                    quietCount++;
                } else {
                    break;
                }
            }
            quietTurnsBySector.set(sectorId, quietCount);
        }
    }

    // Concentration-detected sectors from intel
    const concentrationSectors = new Set<string>();
    for (const [sectorId, detected] of Object.entries(intelPicture.concentration_detected)) {
        if (detected) concentrationSectors.add(sectorId);
    }

    // Map sectors to zones for threat lookup
    const sectorToZone = new Map<string, ZoneAssessment>();
    const sortedZones = [...zones].sort((a, b) => strictCompare(a.zone_id, b.zone_id));
    for (const zone of sortedZones) {
        // A sector belongs to a zone if they share OSIDs
        // For now, use zone's assigned_brigades to find relevant sectors
        // (sectors and zones are both keyed by corps territory)
    }

    // Process each sector with activity data
    const sortedSectorIds = [...activityBySector.keys()].sort(strictCompare);
    for (const sectorId of sortedSectorIds) {
        const activity = activityBySector.get(sectorId)!;
        const prevQuietTurns = quietTurnsBySector.get(sectorId) ?? 0;
        const totalQuiet = activity.activity === 'quiet' ? prevQuietTurns + 1 : 0;

        // Check if enemy concentration is detected on this sector
        const enemyMassing = concentrationSectors.has(sectorId);

        // Determine the recommended stance
        let newStance: SectorStance | null = null;
        let reason = '';

        if (activity.activity === 'overrun') {
            // Territory lost — fortify regardless of personality
            newStance = 'fortify';
            reason = 'territory overrun — maximum defensive posture';
        } else if (enemyMassing) {
            // Enemy concentration detected
            if (personality.aggression > 0.6) {
                newStance = 'active_defense';
                reason = 'enemy massing detected — aggressive commander prefers active defense';
            } else {
                newStance = 'fortify';
                reason = 'enemy massing detected — fortifying sector';
            }
        } else if (activity.activity === 'contested') {
            // Heavy combat
            if (personality.caution > 0.5) {
                newStance = 'fortify';
                reason = 'heavy combat — cautious commander fortifying';
            } else {
                newStance = 'defend';
                reason = 'heavy combat — holding the line';
            }
        } else if (activity.activity === 'active') {
            newStance = 'defend';
            reason = 'active enemy engagement — defending';
        } else if (totalQuiet >= QUIET_TURNS_FOR_SCREENING && personality.aggression > 0.4) {
            // Quiet sector — aggressive commanders thin the line to free reserves
            newStance = 'screening';
            reason = `quiet for ${totalQuiet} turns — thinning line to free reserves`;
        } else if (totalQuiet >= QUIET_TURNS_FOR_SCREENING && personality.caution <= 0.5) {
            // Even moderate commanders consider screening after prolonged quiet
            newStance = 'screening';
            reason = `quiet for ${totalQuiet} turns — screening posture`;
        }

        // Only emit a change if we have a recommendation
        if (newStance !== null) {
            changes.push({ sector_id: sectorId, new_stance: newStance, reason });
        }
    }

    return changes;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Reserve Shifting
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Shift reserves from quiet/surplus zones to threatened zones.
 *
 * Rules:
 * - Only shift from zones with surplus > 0
 * - Never shift from besieged zones
 * - Prefer shifting from same-corps zones (closest first)
 * - Aggressive commanders shift more readily
 */
function computeReserveShifts(
    zones: ZoneAssessment[],
    threats: ThreatAssessment,
    surplusPool: BrigadeEvaluation[],
    previousState: CommanderState | null,
    personality: OfficerPersonality,
): Array<{ brigade_id: FormationId; from_zone: ZoneId; to_zone: ZoneId; reason: string }> {
    const shifts: Array<{ brigade_id: FormationId; from_zone: ZoneId; to_zone: ZoneId; reason: string }> = [];

    // Identify zones that escalated in threat
    const previousThreatByZone = new Map<string, string>();
    if (previousState) {
        for (const tz of previousState.threat_assessment.threatened_zones) {
            previousThreatByZone.set(tz.zone_id, tz.threat_level);
        }
    }

    const THREAT_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

    // Find zones that escalated to high or critical
    const escalatedZones: ZoneAssessment[] = [];
    const sortedZones = [...zones].sort((a, b) => strictCompare(a.zone_id, b.zone_id));

    for (const zone of sortedZones) {
        const currentThreat = threats.threatened_zones.find(tz => tz.zone_id === zone.zone_id);
        if (!currentThreat) continue;

        const currentRank = THREAT_RANK[currentThreat.threat_level] ?? 0;
        const prevRank = THREAT_RANK[previousThreatByZone.get(zone.zone_id) ?? 'low'] ?? 0;

        // Zone escalated and is now high or critical
        if (currentRank > prevRank && currentRank >= 2) {
            escalatedZones.push(zone);
        }
    }

    if (escalatedZones.length === 0) return shifts;

    // Find donor zones: surplus > 0, not besieged
    const donorZones: ZoneAssessment[] = [];
    for (const zone of sortedZones) {
        if (zone.posture === 'besieged') continue;
        if (zone.surplus_brigades.length === 0) continue;

        // Don't strip zones that are themselves threatened
        const zoneThreat = threats.threatened_zones.find(tz => tz.zone_id === zone.zone_id);
        if (zoneThreat && THREAT_RANK[zoneThreat.threat_level] >= 2) continue;

        donorZones.push(zone);
    }

    // Build surplus brigade lookup by zone
    const surplusByZone = new Map<string, FormationId[]>();
    for (const zone of donorZones) {
        surplusByZone.set(zone.zone_id, [...zone.surplus_brigades]);
    }

    // For each escalated zone, pull reserves from donors
    // Aggressive commanders shift more readily — limit shifts for cautious commanders
    const maxShiftsPerZone = personality.aggression > 0.6 ? 3
        : personality.caution > 0.5 ? 1
        : 2;

    for (const targetZone of escalatedZones) {
        let shifted = 0;

        // Try donors sorted deterministically
        for (const donorZone of donorZones) {
            if (shifted >= maxShiftsPerZone) break;

            const available = surplusByZone.get(donorZone.zone_id);
            if (!available || available.length === 0) continue;

            // Take one brigade from this donor
            const brigadeId = available.shift()!;
            shifts.push({
                brigade_id: brigadeId,
                from_zone: donorZone.zone_id,
                to_zone: targetZone.zone_id,
                reason: `threat escalation in ${targetZone.zone_id} — shifting reserve from ${donorZone.zone_id}`,
            });
            shifted++;
        }
    }

    return shifts;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Plan Suspension
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check whether the current plan should be suspended.
 *
 * Suspend if:
 * - A zone the plan depends on (staging_zone) becomes threatened (high/critical)
 * - The corps lost 2+ brigades assigned to the plan during concentration
 */
function evaluatePlanSuspension(
    currentPlan: CommanderPlan | null,
    zones: ZoneAssessment[],
    threats: ThreatAssessment,
    previousState: CommanderState | null,
    _turn: number,
): { suspend_plan: boolean; suspend_reason?: string } {
    if (!currentPlan) return { suspend_plan: false };
    if (currentPlan.status === 'suspended' || currentPlan.status === 'abandoned') {
        return { suspend_plan: false };
    }

    // Check 1: Staging zone threatened
    const stagingThreat = threats.threatened_zones.find(
        tz => tz.zone_id === currentPlan.staging_zone,
    );
    if (stagingThreat && (stagingThreat.threat_level === 'high' || stagingThreat.threat_level === 'critical')) {
        return {
            suspend_plan: true,
            suspend_reason: `staging zone ${currentPlan.staging_zone} under ${stagingThreat.threat_level} threat`,
        };
    }

    // Check 2: Plan brigade losses during concentration
    if (currentPlan.status === 'concentrating' && previousState) {
        const planBrigades = new Set(currentPlan.assigned_brigades);
        let lostCount = 0;

        // Check which plan brigades are no longer in any zone (dissolved or lost)
        const allCurrentBrigades = new Set<string>();
        for (const zone of zones) {
            for (const brigId of zone.assigned_brigades) {
                allCurrentBrigades.add(brigId);
            }
        }

        for (const brigId of planBrigades) {
            if (!allCurrentBrigades.has(brigId)) {
                lostCount++;
            }
        }

        if (lostCount >= PLAN_SUSPENSION_LOSS_THRESHOLD) {
            return {
                suspend_plan: true,
                suspend_reason: `lost ${lostCount} plan brigades during concentration`,
            };
        }
    }

    // Check 3: Any target OSID of the plan now in a critical-threat zone
    for (const tz of threats.threatened_zones) {
        if (tz.threat_level !== 'critical') continue;
        const zone = zones.find(z => z.zone_id === tz.zone_id);
        if (!zone) continue;

        // If any of the plan's target OSIDs are now in a critically threatened zone
        // that means the enemy is pushing into our territory near the objective
        for (const targetOsid of currentPlan.target_osids) {
            if (zone.osids.includes(targetOsid)) {
                return {
                    suspend_plan: true,
                    suspend_reason: `target OSID ${targetOsid} in critically threatened zone ${zone.zone_id}`,
                };
            }
        }
    }

    return { suspend_plan: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Reinforcement Requests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build reinforcement requests to army HQ based on zone deficits and commitment ratios.
 *
 * Priority:
 * - deficit > 2 → critical
 * - commitment_ratio > 8 → high
 * - deficit 1-2 → medium
 * - otherwise no request
 */
function buildReinforcementRequests(
    zones: ZoneAssessment[],
): Array<{ zone_id: ZoneId; brigades_needed: number; priority: 'critical' | 'high' | 'medium' | 'low' }> {
    const requests: Array<{ zone_id: ZoneId; brigades_needed: number; priority: 'critical' | 'high' | 'medium' | 'low' }> = [];

    const sortedZones = [...zones].sort((a, b) => strictCompare(a.zone_id, b.zone_id));

    for (const zone of sortedZones) {
        if (zone.deficit <= 0 && zone.commitment_ratio <= HIGH_COMMITMENT_THRESHOLD) continue;

        let priority: 'critical' | 'high' | 'medium' | 'low';
        let brigadesNeeded: number;

        if (zone.deficit > CRITICAL_DEFICIT_THRESHOLD) {
            priority = 'critical';
            brigadesNeeded = zone.deficit;
        } else if (zone.commitment_ratio > HIGH_COMMITMENT_THRESHOLD) {
            priority = 'high';
            // Estimate brigades needed to bring commitment ratio to acceptable level
            // target: commitment_ratio ≈ 6 (MEDIUM_THREAT_COMMITMENT from assess.ts)
            const targetBrigades = Math.ceil(zone.front_edge_count / 6);
            brigadesNeeded = Math.max(1, targetBrigades - zone.assigned_brigades.length);
        } else if (zone.deficit > 0) {
            priority = 'medium';
            brigadesNeeded = zone.deficit;
        } else {
            continue;
        }

        requests.push({
            zone_id: zone.zone_id,
            brigades_needed: brigadesNeeded,
            priority,
        });
    }

    return requests;
}

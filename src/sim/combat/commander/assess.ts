/**
 * assess.ts — Main ASSESS phase orchestrator for v0.8 Corps Commander Intelligence.
 *
 * Runs the full ASSESS phase: zone detection + force evaluation + threat assessment.
 * Pure function — no mutations.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

import { strictCompare } from '../../../state/validateGameState.js';
import type {
    CommanderBriefing,
    CommanderState,
    ZoneAssessment,
    ZoneId,
    ForceAssessment,
    ThreatAssessment,
} from './commander_state.js';
import { detectZones } from './zone_detection.js';
import { evaluateCorpsForces } from './force_eval.js';

// ═══════════════════════════════════════════════════════════════════════════
// Threat level thresholds
// ═══════════════════════════════════════════════════════════════════════════

/** Deficit above which a zone is considered under high threat. */
const HIGH_THREAT_DEFICIT = 2;

/** Commitment ratio above which a zone is medium threat (overcommitted). */
const MEDIUM_THREAT_COMMITMENT = 6;

/** Commitment ratio above which a zone is low threat (stretched). */
const LOW_THREAT_COMMITMENT = 4;

// ═══════════════════════════════════════════════════════════════════════════
// assessSituation — main ASSESS orchestrator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the full ASSESS phase: zone detection + force evaluation + threat assessment.
 * Pure function — no mutations.
 */
export function assessSituation(
    briefing: CommanderBriefing,
): { zones: ZoneAssessment[]; forces: ForceAssessment; threats: ThreatAssessment } {
    // 1. Collect all corps territory OSIDs from sectors
    const corpsOsidSet = new Set<string>();
    const corpsSectors = briefing.sectors.filter(s => s.corps_id === briefing.corps_id);
    for (const sector of corpsSectors) {
        for (const osid of sector.territory_osids) {
            corpsOsidSet.add(osid);
        }
    }
    const corpsOsids = [...corpsOsidSet].sort(strictCompare);

    // Filter brigades to mutable array for detectZones
    const corpsBrigades = [...briefing.brigades].sort((a, b) => strictCompare(a.id, b.id));

    // 2. Detect zones from spatial context
    const zones = detectZones(
        briefing.corps_id,
        briefing.faction,
        corpsBrigades,
        corpsOsids,
        briefing.spatial,
        [...corpsSectors],
        briefing.ethnic_map,
        briefing.graph_analysis,
        new Set(briefing.must_hold_osids),
    );

    // 3. Evaluate forces
    const forces = evaluateCorpsForces(briefing.brigades, zones, briefing.supply_by_osid);

    // 4. Build concentration zone list from previous intel picture
    // concentration_detected is keyed by sector_id; map via osid overlap to zone_id.
    const concentrationZoneIds: ZoneId[] = [];
    const prevIntel = briefing.previous_state?.intel_picture ?? null;
    if (prevIntel) {
        // Build osid → zone_id reverse map
        const osidToZone = new Map<string, ZoneId>();
        for (const zone of zones) {
            for (const osid of zone.osids) {
                osidToZone.set(osid, zone.zone_id);
            }
        }
        const seenZones = new Set<ZoneId>();
        for (const [sectorId, detected] of Object.entries(prevIntel.concentration_detected).sort(
            (a, b) => strictCompare(a[0], b[0]),
        )) {
            if (!detected) continue;
            const sector = corpsSectors.find(s => s.sector_id === sectorId);
            if (!sector) continue;
            for (const osid of [...sector.territory_osids].sort(strictCompare)) {
                const zoneId = osidToZone.get(osid);
                if (zoneId && !seenZones.has(zoneId)) {
                    seenZones.add(zoneId);
                    concentrationZoneIds.push(zoneId);
                }
            }
        }
    }

    // 5. Assess threats
    const threats = assessThreats(zones, briefing.previous_state, briefing.turn, concentrationZoneIds);

    return { zones, forces, threats };
}

// ═══════════════════════════════════════════════════════════════════════════
// assessThreats — build threat assessment from zone state and history
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build threat assessment from zone analysis and previous state.
 * Basic version:
 * - deficit > 2 → 'high'
 * - OSIDs lost recently (from previous state) → 'critical'
 * - commitment_ratio > 6 → 'medium'
 * - commitment_ratio > 4 → 'low'
 * - otherwise → 'low'
 */
export function assessThreats(
    zones: ZoneAssessment[],
    previousState: CommanderState | null,
    turn: number,
    concentrationZoneIds: readonly ZoneId[] = [],
): ThreatAssessment {
    // Build set of previously held OSIDs per zone for loss detection
    const previousOsidsByZone = new Map<string, Set<string>>();
    if (previousState) {
        for (const prevZone of previousState.zone_assessments) {
            previousOsidsByZone.set(prevZone.zone_id, new Set(prevZone.osids));
        }
    }

    const threatenedZones: Array<{ zone_id: ZoneId; threat_level: 'low' | 'medium' | 'high' | 'critical' }> = [];
    const recentLosses: Array<{ zone_id: ZoneId; osids_lost: readonly string[]; turn: number }> = [];
    const enemyConcentrationZones: ZoneId[] = [...concentrationZoneIds].sort(strictCompare);

    let worstThreat: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Sort zones for deterministic iteration
    const sortedZones = [...zones].sort((a, b) => strictCompare(a.zone_id, b.zone_id));

    for (const zone of sortedZones) {
        let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

        // Check for OSID losses compared to previous state
        const currentOsids = new Set(zone.osids);
        let osidsLost: string[] = [];

        // Compare with closest matching previous zone (by overlap)
        if (previousState) {
            for (const prevZone of previousState.zone_assessments) {
                const prevOsids = previousOsidsByZone.get(prevZone.zone_id);
                if (!prevOsids) continue;

                // Find OSIDs that were in the previous zone but are no longer in any current zone
                const lost: string[] = [];
                for (const osid of [...prevOsids].sort(strictCompare)) {
                    if (!currentOsids.has(osid)) {
                        // Check if this OSID is in any current zone (it may have shifted)
                        const inAnyZone = zones.some(z => z.osids.includes(osid));
                        if (!inAnyZone) {
                            lost.push(osid);
                        }
                    }
                }

                if (lost.length > 0) {
                    osidsLost = lost;
                }
            }
        }

        if (osidsLost.length > 0) {
            threatLevel = 'critical';
            recentLosses.push({
                zone_id: zone.zone_id,
                osids_lost: osidsLost,
                turn,
            });
        } else if (zone.deficit > HIGH_THREAT_DEFICIT) {
            threatLevel = 'high';
        } else if (zone.commitment_ratio > MEDIUM_THREAT_COMMITMENT) {
            threatLevel = 'medium';
        } else if (zone.commitment_ratio > LOW_THREAT_COMMITMENT) {
            threatLevel = 'low';
        }

        threatenedZones.push({ zone_id: zone.zone_id, threat_level: threatLevel });

        // Track worst threat for overall pressure
        if (compareThreat(threatLevel, worstThreat) > 0) {
            worstThreat = threatLevel;
        }
    }

    // Map worst threat to overall pressure
    const overallPressure = mapThreatToPressure(worstThreat);

    return {
        threatened_zones: threatenedZones,
        enemy_concentration_zones: enemyConcentrationZones,
        recent_losses: recentLosses,
        overall_pressure: overallPressure,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

const THREAT_ORDER = { low: 0, medium: 1, high: 2, critical: 3 } as const;

/**
 * Compare two threat levels. Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareThreat(
    a: 'low' | 'medium' | 'high' | 'critical',
    b: 'low' | 'medium' | 'high' | 'critical',
): number {
    return THREAT_ORDER[a] - THREAT_ORDER[b];
}

/**
 * Map worst zone threat level to overall pressure category.
 */
function mapThreatToPressure(
    worstThreat: 'low' | 'medium' | 'high' | 'critical',
): 'low' | 'moderate' | 'heavy' | 'critical' {
    switch (worstThreat) {
        case 'low': return 'low';
        case 'medium': return 'moderate';
        case 'high': return 'heavy';
        case 'critical': return 'critical';
    }
}

/**
 * PREPARATION SUB-PHASE OWNER — called by canonical lifecycle owner (sector_offensive.ts)
 *
 * This file owns the preparation sub-phase within the 'planning' state of a CorpsOperation.
 * It does NOT own the broader operation lifecycle. All entry points are called from
 * sector_offensive.ts (advanceSectorOffensives), never directly from the pipeline.
 */

/**
 * Operation Preparation System — sub-state machine within the 'planning' phase.
 *
 * When a CorpsOperation enters planning, the preparation system drives it through:
 *   intel_gathering → force_staging → supply_check → assessment → ready
 *
 * The ops commander's personality (competence × aggressiveness) shapes thresholds,
 * tempo, and go/no-go recommendations. Probes can be ordered during intel_gathering
 * when confidence is below the commander's threshold.
 *
 * Pipeline position: runs inside advanceSectorOffensives() (step 590),
 * before the existing planning → execution transition check.
 *
 * Deterministic: no randomness, sorted iteration, all derived from state.
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    PreparationSubPhase,
    CommanderAssessment,
} from '../../state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../state/officer_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { FACTION_RECON_PROFILES } from './sector_intel_constants.js';
import { getEquipmentOffensivePriority } from './sector_offensive.js';
import { SYNC_WAIT_MAX_TURNS } from './army_hq_gathering_constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Probe combat power multiplier (probing, not breaking through). */
export const PROBE_FORCE_COMMITMENT_FACTOR = 0.4;

/** Max brigades that can participate in a probe. */
const PROBE_MAX_BRIGADES = 2;

/** Exhaustion cost added to corps when a probe completes. */
const PROBE_EXHAUSTION_COST = 5;

/** Max postponements before forced abort. */
const MAX_POSTPONEMENTS = 2;

/** Counter-probe: defender confidence boost when they detect an incoming probe. */
export const COUNTER_PROBE_CONFIDENCE_GAIN = 0.15;

/** Max sub-phase transitions allowed in a single tick (prevents infinite loops). */
const MAX_SUB_PHASE_ADVANCES = 5;

// ═══════════════════════════════════════════════════════════════════════════
// Commander personality formulas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intel confidence threshold — commander proceeds when confidence >= this value.
 * Elite offensive (5/5): 0.50. Defensive master (5/1): 0.74. Reckless (2/5): 0.38.
 */
export function getRequiredConfidence(competence: number, aggressiveness: number): number {
    return Math.max(0, Math.min(1, 0.6 - aggressiveness * 0.06 + competence * 0.04));
}

/**
 * Force ratio threshold — commander needs this ratio to proceed.
 * Elite offensive (5/5): 1.25. Defensive master (5/1): 1.65.
 */
export function getRequiredForceRatio(competence: number, aggressiveness: number): number {
    return Math.max(1.0, 1.5 - aggressiveness * 0.10 + competence * 0.05);
}

/**
 * Maximum preparation turns before forced decision.
 * Aggressiveness 5: 3 turns. Aggressiveness 1: 7 turns.
 */
export function getPreparationMaxTurns(aggressiveness: number): number {
    return Math.max(2, 8 - aggressiveness);
}

/**
 * Go/no-go assessment score threshold.
 * Aggressive commanders launch at lower scores.
 */
export function getGoThreshold(aggressiveness: number): number {
    return 0.7 - aggressiveness * 0.08;
}

// ═══════════════════════════════════════════════════════════════════════════
// Intel helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the best intel confidence for the enemy sector facing this operation's targets.
 * Reads from state.military.sector_intel using the operation's sector_id.
 */
export function getOperationIntelConfidence(
    state: GameState,
    op: CorpsOperation,
): number {
    if (!op.sector_id || !state.military.sector_intel) return 0;
    const records = state.military.sector_intel[op.sector_id];
    if (!records || records.length === 0) return 0;

    // Find the record facing the enemy sector that contains our objectives
    const objectives = new Set(op.objectives ?? []);
    if (objectives.size === 0 && op.axes) {
        for (const axis of op.axes) {
            for (const obj of axis.objectives) objectives.add(obj);
        }
    }

    if (objectives.size === 0) {
        return records.reduce((best, rec) => Math.max(best, rec.confidence), 0);
    }

    const objectiveEnemySectors = collectObjectiveEnemySectorIds(state, objectives);

    if (objectiveEnemySectors.size === 0) {
        // Objective-specific intel is only meaningful when we can actually map
        // the target OSIDs back to enemy sectors. Older or thinner state slices
        // may not carry that geometry, so fall back to the best facing-sector
        // record instead of treating the operation as having no usable intel.
        return records.reduce((best, rec) => Math.max(best, rec.confidence), 0);
    }

    let best = 0;
    for (const rec of records) {
        if (!objectiveEnemySectors.has(rec.enemy_sector_id)) continue;
        best = Math.max(best, rec.confidence);
    }

    if (best <= 0) {
        return records.reduce((fallback, rec) => Math.max(fallback, rec.confidence), 0);
    }

    return best;
}

function collectObjectiveEnemySectorIds(
    state: GameState,
    objectives: ReadonlySet<string>,
): Set<string> {
    const objectiveEnemySectors = new Set<string>();
    for (const objective of objectives) {
        const controller = state.political?.political_controllers?.[objective];
        if (!controller) continue;
        const sector = state.military.corps_front_sectors
            ? Object.values(state.military.corps_front_sectors).find(
                s => s.faction === controller && (s.territory_osids?.includes(objective)
                    || s.sub_segments.some(sub => sub.friendly_osids.includes(objective))),
            )
            : null;
        if (sector) objectiveEnemySectors.add(sector.sector_id);
    }
    return objectiveEnemySectors;
}

/**
 * Estimate force ratio based on intel confidence and competence.
 * High confidence → close to ground truth. Low confidence → inaccurate estimate.
 */
export function estimateForceRatio(
    state: GameState,
    op: CorpsOperation,
    competence: number,
    confidence: number,
): number {
    // Count own brigade strength
    let ownStrength = 0;
    for (const bid of op.participating_brigades) {
        const b = state.military.formations?.[bid];
        if (!b || b.status !== 'active') continue;
        ownStrength += b.personnel ?? 1000;
    }
    if (ownStrength === 0) return 0;

    const objectives = new Set(op.objectives ?? []);
    if (objectives.size === 0 && op.axes) {
        for (const axis of op.axes) {
            for (const obj of axis.objectives) objectives.add(obj);
        }
    }

    const objectiveEnemySectors = collectObjectiveEnemySectorIds(state, objectives);

    // Estimate enemy strength from sector data
    let enemyStrength = 0;
    if (op.sector_id && state.military.corps_front_sectors) {
        const sector = state.military.corps_front_sectors[op.sector_id];
        if (sector) {
            // Look at enemy sectors facing ours
            const intel = state.military.sector_intel?.[op.sector_id];
            if (intel) {
                for (const rec of intel) {
                    if (objectiveEnemySectors.size > 0 && !objectiveEnemySectors.has(rec.enemy_sector_id)) continue;
                    const enemySector = state.military.corps_front_sectors?.[rec.enemy_sector_id];
                    if (!enemySector) continue;
                    // Count enemy brigades in that sector
                    for (const bid of enemySector.assigned_brigade_ids ?? []) {
                        const b = state.military.formations?.[bid];
                        if (!b || b.status !== 'active') continue;
                        enemyStrength += b.personnel ?? 1000;
                    }
                }
            }
        }
    }

    if (enemyStrength === 0) return 3.0; // No known enemy → optimistic estimate

    const trueRatio = ownStrength / enemyStrength;

    // Apply estimation error based on confidence and competence
    // High confidence + high competence → accurate. Low → random-feeling but deterministic offset.
    const accuracyFactor = Math.min(1.0, confidence * 0.6 + competence * 0.08);
    // Bias: low accuracy overestimates (commanders tend to be optimistic about own strength)
    const bias = (1 - accuracyFactor) * 0.3;
    return trueRatio * (accuracyFactor + bias);
}

// ═══════════════════════════════════════════════════════════════════════════
// Probe selection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Select brigades for a probe action.
 * Prefers mechanized/motorized (recon capability), then by personnel desc.
 * Returns up to PROBE_MAX_BRIGADES.
 */
export function selectProbeBrigades(
    state: GameState,
    op: CorpsOperation,
): FormationId[] {
    const candidates: Array<{ id: FormationId; priority: number; personnel: number }> = [];

    for (const bid of op.participating_brigades) {
        const b = state.military.formations?.[bid];
        if (!b || b.status !== 'active') continue;
        if ((b.personnel ?? 0) < 400) continue; // Combat ineffective — can't probe
        if ((b.disrupted_turns ?? 0) > 0) continue; // Disrupted — can't probe

        const priority = getEquipmentOffensivePriority(b.equipment_class);
        candidates.push({ id: bid, priority, personnel: b.personnel ?? 1000 });
    }

    // Sort: equipment priority desc, then personnel desc, then id for determinism
    candidates.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (a.personnel !== b.personnel) return b.personnel - a.personnel;
        return strictCompare(a.id, b.id);
    });

    return candidates.slice(0, PROBE_MAX_BRIGADES).map(c => c.id);
}

/**
 * Find the best target OSID for a probe (first objective of the operation).
 */
export function getProbeTargetOsid(op: CorpsOperation): string | undefined {
    if (op.axes && op.axes.length > 0) {
        return op.axes[0]!.objectives[0];
    }
    return op.objectives?.[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// Preparation state machine
// ═══════════════════════════════════════════════════════════════════════════

/** Result of a single preparation tick. */
export interface PreparationTickResult {
    /** New sub-phase after this tick. */
    sub_phase: PreparationSubPhase;
    /** Whether preparation is complete (ready to transition to execution). */
    ready: boolean;
    /** Whether a probe was ordered this tick. */
    probe_ordered: boolean;
    /** Commander's assessment (only set during 'assessment' phase). */
    assessment?: CommanderAssessment;
    /** Intel confidence at this tick. */
    intel_confidence: number;
    /** Supply readiness at this tick. */
    supply_readiness: number;
    /** Estimated force ratio at this tick. */
    force_ratio_estimate: number;
    /** Whether the operation was aborted. */
    aborted: boolean;
}

/** Max turns to wait for assembly before forcing transition to supply_check. */
export const ASSEMBLY_TIMEOUT_TURNS = 5;

/** Fraction of participating brigades that must be assembled before proceeding. */
export const ASSEMBLY_THRESHOLD = 0.6;

/**
 * Count how many participating brigades are at or adjacent to the
 * operation's staging OSID or first objective's approach OSIDs.
 * Uses sector territory_osids + sub_segment friendly_osids as a proxy
 * for 1-hop adjacency (all OSIDs in the operational zone near staging).
 * Used during force_staging to ensure brigades have assembled before execution.
 */
function countAssembledBrigades(state: GameState, op: CorpsOperation, corpsId?: string): number {
    const formations = state.military.formations ?? {};
    const staging = op.staging_osid;
    if (!staging) return op.participating_brigades.length; // no staging = all assembled

    // Collect valid assembly positions: staging + first objective
    const assemblyOsids = new Set<string>([staging]);

    const firstObjective = op.axes?.[0]?.objectives?.[0]
        ?? op.objectives?.[op.current_objective_index ?? 0];
    if (firstObjective) assemblyOsids.add(firstObjective);

    // Expand with sector territory + sub-segment friendly OSIDs.
    // Sector territory_osids are all friendly OSIDs in the sector zone;
    // sub_segment friendly_osids are the front-line OSIDs adjacent to objectives.
    // A brigade at any of these is "assembled" for this operation.
    if (state.military.corps_front_sectors) {
        if (op.sector_id) {
            // Named sector: use it directly (commander-generated ops)
            const sector = state.military.corps_front_sectors[op.sector_id];
            if (sector) {
                for (const osid of sector.territory_osids ?? []) assemblyOsids.add(osid);
                for (const sub of sector.sub_segments ?? []) {
                    for (const osid of sub.friendly_osids) assemblyOsids.add(osid);
                }
            }
        } else if (corpsId) {
            // Pre-planned ops (no sector_id): expand to all sectors owned by this corps.
            // Brigades at any front OSID in their assigned corps sector count as assembled —
            // they are at attack position even if not at the staging OSID specifically.
            for (const sector of Object.values(state.military.corps_front_sectors).sort(
                (a, b) => strictCompare(a.sector_id, b.sector_id)
            )) {
                if (sector.corps_id !== corpsId) continue;
                for (const osid of sector.territory_osids ?? []) assemblyOsids.add(osid);
                for (const sub of sector.sub_segments ?? []) {
                    for (const osid of sub.friendly_osids) assemblyOsids.add(osid);
                }
            }
        }
    }

    let count = 0;
    for (const brigadeId of op.participating_brigades) {
        const brigade = formations[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const loc = brigade.location_osid;
        if (!loc) continue;
        if (assemblyOsids.has(loc)) {
            count++;
        }
    }
    return count;
}

/**
 * Get the ops commander data for an operation.
 * Returns null if no named commander assigned.
 */
function getOpsCommander(
    state: GameState,
    op: CorpsOperation,
): { data: NamedOfficer; os: NamedOfficerState } | null {
    if (!op.commander_officer_id) return null;
    const officerData = state.military.named_officer_data;
    const officers = state.military.named_officers;
    if (!officerData || !officers) return null;

    const data = officerData.find(o => o.id === op.commander_officer_id);
    const os = officers[op.commander_officer_id!];
    if (!data || !os) return null;
    return { data, os };
}

/**
 * Advance the preparation sub-phase for one tick.
 *
 * Called once per turn for each operation in 'planning' phase.
 * Returns the result describing what happened this tick.
 */
export function tickPreparation(
    state: GameState,
    op: CorpsOperation,
    corpsId: FormationId,
    faction: FactionId,
    supplyReadiness: number,
): PreparationTickResult {
    const commander = getOpsCommander(state, op);
    const competence = commander?.data.competence ?? 3;
    const aggressiveness = commander?.data.aggressiveness ?? 3;

    // Initialize preparation state if not yet set
    if (!op.preparation_sub_phase) {
        op.preparation_sub_phase = 'intel_gathering';
        op.preparation_turns_elapsed = 0;
        op.preparation_max_turns = getPreparationMaxTurns(aggressiveness);
        op.postponement_count = 0;
    }

    op.preparation_turns_elapsed = (op.preparation_turns_elapsed ?? 0) + 1;

    const confidence = getOperationIntelConfidence(state, op);
    const forceRatio = estimateForceRatio(state, op, competence, confidence);
    const requiredConfidence = getRequiredConfidence(competence, aggressiveness);
    const requiredForceRatio = getRequiredForceRatio(competence, aggressiveness);

    const result: PreparationTickResult = {
        sub_phase: op.preparation_sub_phase,
        ready: false,
        probe_ordered: false,
        intel_confidence: confidence,
        supply_readiness: supplyReadiness,
        force_ratio_estimate: forceRatio,
        aborted: false,
    };

    // Anti-paralysis: forced decision when max turns exceeded
    if ((op.preparation_turns_elapsed ?? 0) >= (op.preparation_max_turns ?? 5)) {
        if (aggressiveness >= 3) {
            // Aggressive commanders auto-launch
            op.preparation_sub_phase = 'ready';
            result.sub_phase = 'ready';
            result.ready = true;
            result.assessment = 'launch';
            op.commander_assessment = 'launch';
        } else {
            // Cautious commanders auto-abort
            result.sub_phase = op.preparation_sub_phase;
            result.assessment = 'abort';
            result.aborted = true;
            op.commander_assessment = 'abort';
        }
        op.intel_confidence_at_assessment = confidence;
        op.supply_readiness_at_assessment = supplyReadiness;
        op.force_ratio_estimate = forceRatio;
        return result;
    }

    // Sub-phase loop: allow multiple transitions in a single tick when conditions
    // are immediately met. A well-prepared operation (high intel, good force ratio,
    // adequate supply) can transit intel_gathering → ... → ready in one tick.
    // The loop breaks when a phase blocks (waiting for probe, insufficient intel, etc.)
    // or when the operation reaches 'ready' or is aborted. MAX_SUB_PHASE_ADVANCES
    // prevents infinite loops from logic bugs.
    for (let advances = 0; advances < MAX_SUB_PHASE_ADVANCES; advances++) {
        let advanced = false;

        switch (op.preparation_sub_phase) {
            case 'intel_gathering': {
                // Check if an active probe is pending resolution
                if (op.active_probe && !op.active_probe.resolved) {
                    result.sub_phase = 'intel_gathering';
                    return result;
                }

                // If probe just resolved, apply confidence gain
                if (op.active_probe?.resolved && op.active_probe.result_confidence_gain) {
                    op.active_probe = undefined; // Clear completed probe
                }

                // Re-read confidence after potential probe resolution
                const currentConfidence = getOperationIntelConfidence(state, op);
                result.intel_confidence = currentConfidence;

                if (currentConfidence >= requiredConfidence) {
                    op.preparation_sub_phase = 'force_staging';
                    result.sub_phase = 'force_staging';
                    advanced = true;
                } else {
                    // Intel insufficient — consider ordering a probe
                    if (!op.active_probe) {
                        const probeBrigades = selectProbeBrigades(state, op);
                        const probeTarget = getProbeTargetOsid(op);
                        if (probeBrigades.length > 0 && probeTarget) {
                            op.active_probe = {
                                target_osid: probeTarget,
                                brigade_ids: probeBrigades,
                                started_turn: state.meta?.turn ?? 0,
                                resolved: false,
                            };
                            result.probe_ordered = true;
                        }
                    }
                    result.sub_phase = 'intel_gathering';
                }
                break;
            }

            case 'force_staging': {
                // Check brigade assembly: what fraction of participating brigades
                // have arrived at the staging area (staging OSID, first objective,
                // or any sector territory/friendly OSID)?
                // Don't advance to supply_check until ASSEMBLY_THRESHOLD assembled
                // or ASSEMBLY_TIMEOUT_TURNS elapsed since preparation started.
                const assembled = countAssembledBrigades(state, op, corpsId);
                const assemblyFraction = op.participating_brigades.length > 0
                    ? assembled / op.participating_brigades.length
                    : 1.0;
                const assemblyReady = assemblyFraction >= ASSEMBLY_THRESHOLD;
                const assemblyTimeout = (op.preparation_turns_elapsed ?? 0) >= ASSEMBLY_TIMEOUT_TURNS;

                if (assemblyReady || assemblyTimeout) {
                    op.preparation_sub_phase = 'supply_check';
                    result.sub_phase = 'supply_check';
                    advanced = true;
                } else {
                    result.sub_phase = 'force_staging';
                }
                break;
            }

            case 'supply_check': {
                if (supplyReadiness >= 0.7 || (supplyReadiness >= 0.5 && aggressiveness >= 4)) {
                    op.preparation_sub_phase = 'assessment';
                    result.sub_phase = 'assessment';
                    advanced = true;
                } else {
                    result.sub_phase = 'supply_check';
                }
                break;
            }

            case 'assessment': {
                const confidenceMet = confidence >= requiredConfidence ? 1.0 : confidence / requiredConfidence;
                const forceRatioMet = forceRatio >= requiredForceRatio ? 1.0 : forceRatio / requiredForceRatio;
                const assessmentScore = confidenceMet * 0.4 + forceRatioMet * 0.3 + supplyReadiness * 0.3;
                const goThreshold = getGoThreshold(aggressiveness);

                op.intel_confidence_at_assessment = confidence;
                op.supply_readiness_at_assessment = supplyReadiness;
                op.force_ratio_estimate = forceRatio;

                if (assessmentScore >= goThreshold) {
                    op.preparation_sub_phase = 'ready';
                    op.commander_assessment = 'launch';
                    result.sub_phase = 'ready';
                    result.ready = true;
                    result.assessment = 'launch';
                } else if (assessmentScore >= goThreshold - 0.15 && (op.postponement_count ?? 0) < MAX_POSTPONEMENTS) {
                    op.preparation_sub_phase = 'intel_gathering';
                    op.postponement_count = (op.postponement_count ?? 0) + 1;
                    op.commander_assessment = 'postpone';
                    result.sub_phase = 'intel_gathering';
                    result.assessment = 'postpone';
                } else {
                    op.commander_assessment = 'abort';
                    result.assessment = 'abort';
                    result.aborted = true;
                }
                break;
            }

            case 'ready': {
                // Sync check: if part of a synchronized operation and not yet in window, wait
                if (op.sync_operation_name && op.sync_launch_after != null) {
                    const currentTurn = state.meta?.turn ?? 0;
                    if (currentTurn < op.sync_launch_after) {
                        op.preparation_sub_phase = 'waiting_for_sync';
                        result.sub_phase = 'waiting_for_sync';
                        result.ready = false;
                        break;
                    }
                }
                result.sub_phase = 'ready';
                result.ready = true;
                break;
            }

            case 'waiting_for_sync': {
                const currentTurn = state.meta?.turn ?? 0;
                const maxTurns = (op.preparation_max_turns ?? 5) + SYNC_WAIT_MAX_TURNS;
                // Anti-stall: force launch if waited too long
                if ((op.preparation_turns_elapsed ?? 0) > maxTurns) {
                    op.preparation_sub_phase = 'ready';
                    result.sub_phase = 'ready';
                    result.ready = true;
                    break;
                }
                // Launch once in sync window
                if (currentTurn >= (op.sync_launch_after ?? 0)) {
                    op.preparation_sub_phase = 'ready';
                    result.sub_phase = 'ready';
                    result.ready = true;
                    break;
                }
                // Still waiting
                result.sub_phase = 'waiting_for_sync';
                result.ready = false;
                break;
            }
        }

        // Stop looping if we didn't advance, or we've reached a terminal state
        if (!advanced || result.ready || result.aborted) break;
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Probe resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve a pending probe on an operation.
 * Called after combat resolution to mark probe as resolved and update intel.
 *
 * The probe's confidence gain comes from faction recon profiles.
 * Counter-probe: defender gets a confidence boost (they detected the probe).
 */
export function resolveActiveProbe(
    state: GameState,
    op: CorpsOperation,
    faction: FactionId,
    corpsId: FormationId,
): void {
    if (!op.active_probe || op.active_probe.resolved) return;

    const profile = FACTION_RECON_PROFILES[faction as NonNullable<FactionId>];
    if (!profile) return;

    const confidenceGain = profile.probe_confidence_gain;
    op.active_probe.resolved = true;
    op.active_probe.result_confidence_gain = confidenceGain;

    // Apply confidence boost to sector intel
    if (op.sector_id && state.military.sector_intel) {
        const records = state.military.sector_intel[op.sector_id];
        if (records) {
            for (const rec of records) {
                rec.confidence = Math.min(1.0, rec.confidence + confidenceGain);
            }
        }
    }

    // Counter-probe: defender detects the probing activity
    applyCounterProbeIntel(state, op);

    // Add exhaustion cost
    const cmd = state.military.corps_command?.[corpsId];
    if (cmd) {
        cmd.corps_exhaustion = Math.min(100, (cmd.corps_exhaustion ?? 0) + PROBE_EXHAUSTION_COST);
    }
}

/**
 * Counter-probe: when we probe an enemy, they detect our preparations.
 * Boosts the defender's intel confidence for the sector facing us.
 */
function applyCounterProbeIntel(state: GameState, op: CorpsOperation): void {
    if (!op.sector_id || !state.military.sector_intel || !state.military.corps_front_sectors) return;

    // Find the enemy sector(s) facing our operation sector
    const ourRecords = state.military.sector_intel[op.sector_id];
    if (!ourRecords) return;

    for (const ourRec of ourRecords) {
        // The enemy sector's intel about US should get a confidence boost
        const enemySectorId = ourRec.enemy_sector_id;
        const enemyIntel = state.military.sector_intel[enemySectorId];
        if (!enemyIntel) continue;

        // Find the record in the enemy's intel that faces our sector
        for (const enemyRec of enemyIntel) {
            if (enemyRec.enemy_sector_id === op.sector_id) {
                enemyRec.confidence = Math.min(1.0, enemyRec.confidence + COUNTER_PROBE_CONFIDENCE_GAIN);
                enemyRec.offensive_signs = true; // They know we're preparing
            }
        }
    }
}

/**
 * Check if any operation has a pending (unresolved) probe that should be
 * resolved this turn. Called during the probe resolution phase of
 * advanceSectorOffensives.
 */
export function hasUnresolvedProbe(op: CorpsOperation): boolean {
    return op.active_probe !== undefined && !op.active_probe.resolved;
}

/**
 * Auto-resolve a probe that didn't result in combat (e.g., no adjacent enemy,
 * probe brigades couldn't reach target). Gives partial confidence gain.
 */
export function autoResolveProbe(
    state: GameState,
    op: CorpsOperation,
    faction: FactionId,
): void {
    if (!op.active_probe || op.active_probe.resolved) return;

    const profile = FACTION_RECON_PROFILES[faction as NonNullable<FactionId>];
    if (!profile) return;

    // Partial gain — probe didn't make contact but observed from approach
    const partialGain = profile.probe_confidence_gain * 0.5;
    op.active_probe.resolved = true;
    op.active_probe.result_confidence_gain = partialGain;

    // Apply partial confidence boost
    if (op.sector_id && state.military.sector_intel) {
        const records = state.military.sector_intel[op.sector_id];
        if (records) {
            for (const rec of records) {
                rec.confidence = Math.min(1.0, rec.confidence + partialGain);
            }
        }
    }
}

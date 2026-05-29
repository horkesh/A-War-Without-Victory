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
 *
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical
 * DOMAIN:    Operation preparation sub-phase state machine
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Preparation sub-phase transitions: intel_gathering → force_staging →
 *            supply_check → assessment → ready
 * WRITES:    CorpsOperation preparation sub-state (via sector_offensive.ts caller)
 * READS:     CorpsOperation, GameState (supply, brigades, intel), officer personality
 * MUST NOT:  advance operation beyond planning phase; be called directly from pipeline
 *            (all entry points must flow through sector_offensive.ts)
 *
 * UPSTREAM:  sector_offensive.ts (advanceSectorOffensives calls this sub-phase)
 * DOWNSTREAM: sector_offensive.ts (reads ready state → planning → execution transition)
 *
 * TRUTH INVARIANTS:
 * - Sub-phase owner only — does NOT own the broader operation lifecycle
 * - Commander personality (competence × aggressiveness) shapes thresholds, not hardcoded values
 * - Deterministic: no randomness, sorted iteration, all derived from state
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    PreparationSubPhase,
    CommanderAssessment,
} from '../../state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../state/officer_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { FACTION_RECON_PROFILES } from './sector_intel_constants.js';
import {
    getEquipmentOffensivePriority,
    // LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: shared predicate +
    // approach-OSID collector are reused at the caller layer to gate the
    // committed-in-transit context override. Single source of truth — see
    // `sector_offensive_launch_helpers.ts` JSDoc on `isCommittedInTransitTo`.
    isCommittedInTransitTo,
    collectObjectiveApproachOsids,
} from './sector_offensive_launch_helpers.js';
import { SYNC_WAIT_MAX_TURNS } from './army_hq_gathering_constants.js';
// LANE-2026-05-02: estimateForceRatio defender-modifier integration
import { computeAttackerPower, rankDefendersByPower, getArtillerySuppression } from './combat_math.js';
// LANE-2026-05-02-DRINA: enclave-scoped defender aggregation
import { ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from './enclave_resilience.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
// ADR-0005 v2.2b: TG formation wiring at sub_phase='ready' transition. Flag-gated.
import { ENABLE_TG_FORMATION, getAnchorBrigade } from './tactical_group_config.js';
import { selectDonors } from './tactical_group_selection.js';
import { formTacticalGroup } from './tactical_group_lifecycle.js';

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

// LANE-2026-05-02-DRINA: helper — return the enclave that contains ALL of an
// operation's objectives, or null if no single enclave covers them. Faction-
// agnostic: iterates ENCLAVE_DEFINITIONS in canonical order. Used by
// estimateForceRatio to scope defender aggregation to enclave-interior brigades
// when the operation's objectives sit wholly inside one enclave.
function allObjectivesInOneEnclave(
    op: CorpsOperation,
): typeof ENCLAVE_DEFINITIONS[number] | null {
    const objectives = new Set<string>(op.objectives ?? []);
    if (op.axes) {
        for (const ax of op.axes) {
            for (const o of ax.objectives) objectives.add(o);
        }
    }
    if (objectives.size === 0) return null;
    for (const enclave of ENCLAVE_DEFINITIONS) {
        let allMatch = true;
        for (const obj of objectives) {
            if (!osidBelongsToEnclave(obj, enclave)) {
                allMatch = false;
                break;
            }
        }
        if (allMatch) return enclave;
    }
    return null;
}

/**
 * Estimate force ratio based on intel confidence and competence.
 * High confidence → close to ground truth. Low confidence → inaccurate estimate.
 *
 * LANE-2026-05-02: estimateForceRatio defender-modifier integration.
 * Now sums COMBAT POWER (computeAttackerPower / rankDefendersByPower) instead of
 * raw personnel — honors the same defender modifiers the resolver uses
 * (entrenchment, terrain, urban/forest, equipment, supply, posture, morale,
 * fatigue, officer, corps stance, home distance, disruption). Bilateral by
 * construction: faction-agnostic call shape. Threading: optional supplyByOsid /
 * terrainMultByOsid passed from war_phases.ts → advanceSectorOffensives →
 * tickPreparation. Backward-compatible: undefined → neutral 1.0 lookup.
 *
 * Sentinel decision (enemyStrength === 0):
 *   confidence >= 0.5 → 3.0 (confident "no known enemy" stays open-road)
 *   confidence  < 0.5 → 1.0 (blind belief becomes cautious)
 */
export function estimateForceRatio(
    state: GameState,
    op: CorpsOperation,
    competence: number,
    confidence: number,
    supplyByOsid?: SupplyStateByOsidReport | null, // LANE-2026-05-02
    terrainMultByOsid?: Record<string, number>, // LANE-2026-05-02
): number {
    // LANE-2026-05-02: collect attacker formations (active only) once for both
    // power summation and the artillery-suppression input to defender ranking.
    const attackerFormations: FormationState[] = [];
    for (const bid of op.participating_brigades) {
        const b = state.military.formations?.[bid];
        if (!b || b.status !== 'active') continue;
        attackerFormations.push(b);
    }
    if (attackerFormations.length === 0) return 0;

    const objectives = new Set(op.objectives ?? []);
    if (objectives.size === 0 && op.axes) {
        for (const axis of op.axes) {
            for (const obj of axis.objectives) objectives.add(obj);
        }
    }

    // LANE-2026-05-02: pick a single primary objective OSID for terrain/supply lookups.
    // Stable: lowest sorted objective string. Defender power is summed across the
    // facing enemy sector (covering multiple OSIDs); the primary OSID is the
    // representative for terrain/urban/forest cache lookups.
    const sortedObjectives = Array.from(objectives).sort(strictCompare);
    const primaryTargetOsid = sortedObjectives[0];

    // LANE-2026-05-02: backward-compatible neutral terrain lookup when caller
    // does not pass terrainMultByOsid. Matches combat_math.ts default.
    const terrainCache = terrainMultByOsid ?? {};
    const targetTerrainMult = primaryTargetOsid ? (terrainCache[primaryTargetOsid] ?? 1.0) : 1.0;

    // LANE-2026-05-02: sum attacker COMBAT POWER (override posture to 'attack' so
    // dig_in / defend brigades contribute their offensive value). Each brigade
    // gets supply/terrain/officer/morale/fatigue applied via combat_math.
    const attackerFaction: FactionId = attackerFormations[0]!.faction || 'RBiH';

    // LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: derive corps_id + faction
    // from the first attacker formation. CorpsOperation has no top-level
    // corps_id/faction fields; participants share a primary corps and faction
    // by op-architecture invariant, so the first attacker is canonical and
    // deterministic (op.participating_brigades is a catalog-ordered array).
    const attackerCorpsId = (attackerFormations[0]!.corps_id ?? '') as FormationId;

    // LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: build per-op relevance set
    // for committed-in-transit context override. A brigade is "committed-in-transit
    // toward a relevant destination" when its `brigade_movement_state.status ===
    // 'in_transit'` AND any of its `destination_sids` is in this relevance set.
    // Set composition: op.staging_osid + every axis.staging_osid + approach OSIDs
    // for current launch objectives across all axes (single-axis or multi-axis).
    // Faction-agnostic; deterministic — no Map iteration introduced, all sources
    // are catalog-ordered arrays + deterministic sub-segment lookups in
    // `collectObjectiveApproachOsids`.
    const relevanceOsids = new Set<string>();
    if (op.staging_osid) relevanceOsids.add(op.staging_osid);
    if (op.axes && op.axes.length > 0) {
        for (const ax of op.axes) {
            if (ax.staging_osid) relevanceOsids.add(ax.staging_osid);
            const currentObjective = ax.objectives[ax.current_objective_index ?? 0];
            if (typeof currentObjective === 'string' && currentObjective.length > 0
                && attackerCorpsId
            ) {
                const approach = collectObjectiveApproachOsids(
                    state,
                    attackerCorpsId,
                    attackerFaction,
                    [currentObjective],
                );
                for (const o of approach) relevanceOsids.add(o);
            }
        }
    } else if (attackerCorpsId) {
        const launchObjectives = op.objectives ?? [];
        if (launchObjectives.length > 0) {
            const approach = collectObjectiveApproachOsids(
                state,
                attackerCorpsId,
                attackerFaction,
                launchObjectives,
            );
            for (const o of approach) relevanceOsids.add(o);
        }
    }
    // LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: deterministic override
    // OSID selection — prefer op.staging_osid (canonical "where committed to
    // assemble"); else strictCompare-sorted first relevance OSID. Per
    // /determinism-auditor recommendation: avoids dependence on
    // `destination_sids[0]` semantics ("next hop" vs "final destination"), which
    // could brittle under future route planners.
    const sortedRelevance = Array.from(relevanceOsids).sort(strictCompare);
    const overrideOsid: string | undefined = op.staging_osid && relevanceOsids.has(op.staging_osid)
        ? op.staging_osid
        : sortedRelevance[0];

    let ownStrength = 0;
    for (const a of attackerFormations) {
        // LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: per-formation override
        // gated on the predecessor predicate. Brigades not in_transit toward a
        // relevant OSID get no override (default-undefined → byte-stable). The
        // caller restriction is intentional: only `estimateForceRatio` knows the
        // operation-relevance set; resolver/predictor/sector-rating evaluate
        // formations against their CURRENT physical location and must remain so.
        const useOverride = overrideOsid !== undefined
            && a.location_osid !== overrideOsid
            && isCommittedInTransitTo(state, a.id as FormationId, relevanceOsids);
        ownStrength += computeAttackerPower(
            state,
            a,
            supplyByOsid,
            'attack',
            targetTerrainMult,
            primaryTargetOsid,
            useOverride ? overrideOsid : undefined,
        );
    }
    if (ownStrength === 0) {
        // LANE-2026-05-02: every attacker had postureMult <= 0 OR base power 0.
        // Predictor cannot offer a meaningful ratio.
        return 0;
    }

    const objectiveEnemySectors = collectObjectiveEnemySectorIds(state, objectives);

    // LANE-2026-05-02: collect defender brigades from the facing enemy sector(s).
    const defenderFormations: FormationState[] = [];
    if (op.sector_id && state.military.corps_front_sectors) {
        const sector = state.military.corps_front_sectors[op.sector_id];
        if (sector) {
            const intel = state.military.sector_intel?.[op.sector_id];
            if (intel) {
                for (const rec of intel) {
                    if (objectiveEnemySectors.size > 0 && !objectiveEnemySectors.has(rec.enemy_sector_id)) continue;
                    const enemySector = state.military.corps_front_sectors?.[rec.enemy_sector_id];
                    if (!enemySector) continue;
                    for (const bid of enemySector.assigned_brigade_ids ?? []) {
                        const b = state.military.formations?.[bid];
                        if (!b || b.status !== 'active') continue;
                        defenderFormations.push(b);
                    }
                }
            }
        }
    }

    // LANE-2026-05-02-DRINA: enclave-scoped defender filter.
    // When all objectives target one enclave's interior, restrict defender
    // aggregation to formations physically inside the enclave. Mirrors the
    // historical reality that only enclave-interior brigades can defend the
    // enclave; outer-corps formations in the same sector cannot project power
    // across the encirclement ring. Faction-agnostic predicate; pre-fix the
    // entire facing corps was aggregated, drowning out the small enclave
    // garrison and producing fantasy-low ratios that said Krivaja-95 was
    // infeasible. Reverse-iteration splice preserves order for the
    // surviving (enclave-interior) defenders so deterministic ordering below
    // is unaffected.
    const enclaveScope = allObjectivesInOneEnclave(op);
    if (enclaveScope !== null) {
        for (let i = defenderFormations.length - 1; i >= 0; i--) {
            const loc = defenderFormations[i]!.location_osid;
            if (!loc || !osidBelongsToEnclave(loc, enclaveScope)) {
                defenderFormations.splice(i, 1);
            }
        }
    }

    // LANE-2026-05-02: deterministic ordering of defenders before passing to
    // rankDefendersByPower (which sorts by power desc internally; sort by id
    // first to make ties deterministic).
    defenderFormations.sort((a, b) => strictCompare(a.id, b.id));

    // LANE-2026-05-02: sentinel — no known defenders. Tighten the previous
    // unconditional 3.0 fantasy to confidence-gated honest estimate.
    if (defenderFormations.length === 0 || !primaryTargetOsid) {
        return confidence >= 0.5 ? 3.0 : 1.0;
    }

    // LANE-2026-05-02: rank defender power using shared combat_math.
    // computeDefenderPower honors entrenchment, urban/forest, supply, posture,
    // corps stance, terrain, equipment, morale, fatigue, officer, home distance.
    const artSuppression = getArtillerySuppression(attackerFormations, attackerFaction, state);
    const noEthnicBonus = (_d: FormationState) => 0; // ethnic composition not threaded; matches combat_predictor "no sector" path
    const { totalPower: enemyStrength } = rankDefendersByPower(
        defenderFormations,
        state,
        primaryTargetOsid,
        terrainCache,
        artSuppression,
        supplyByOsid,
        noEthnicBonus,
    );

    if (enemyStrength <= 0) {
        // LANE-2026-05-02: defenders present but power resolved to 0 (e.g. all in
        // terminal disruption + critical supply). Same sentinel rule: confidence
        // gate, not an unconditional optimistic 3.0.
        return confidence >= 0.5 ? 3.0 : 1.0;
    }

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
function countAssembledBrigades(state: GameState, op: CorpsOperation): number {
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
    // NOTE: Pre-planned ops (no sector_id) do NOT expand to all corps sectors —
    // that would cause premature force_staging advancement. Only staging + objective
    // OSIDs count; ASSEMBLY_TIMEOUT_TURNS (5) is the safety valve for late arrivals.
    if (state.military.corps_front_sectors && op.sector_id) {
        // Named sector: use it directly (commander-generated ops)
        const sector = state.military.corps_front_sectors[op.sector_id];
        if (sector) {
            for (const osid of sector.territory_osids ?? []) assemblyOsids.add(osid);
            for (const sub of sector.sub_segments ?? []) {
                for (const osid of sub.friendly_osids) assemblyOsids.add(osid);
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
 * ADR-0005 v2.2b: form Tactical Group(s) at the sub_phase='ready' transition.
 *
 * Fires from both first-arrival paths in tickPreparation: anti-paralysis force-launch
 * AND assessment go-decision. Re-entries from waiting_for_sync→ready are NOT
 * first arrivals (TG already formed at the prior assessment success) — they do
 * not call this helper.
 *
 * Multi-axis ops: one TG per axis (anchor = main_brigade or first assigned).
 * Legacy single-axis: one TG from participating_brigades[0] + op.staging_osid.
 *
 * Flag-off (default): early-return; byte-identical to pre-wiring.
 * Flag-on (v2.2b+): writes TG records under state.military.tactical_groups[id]
 * and sets donor.personnel_lent_by_tg[id] per Hard Invariant #1.
 *
 * v2.2c will split selectDonors to intel_gathering (caching to op.donor_pool)
 * once the 60% donation gate at assessment wires up. v2.2b skips that gate.
 */
function formTgsAtReadyTransition(
    state: GameState,
    op: CorpsOperation,
    currentTurn: number,
): void {
    if (!ENABLE_TG_FORMATION) return;
    if (op.axes && op.axes.length > 0) {
        for (const axis of op.axes) {
            const anchorId = getAnchorBrigade(axis);
            if (!anchorId) continue;
            const stagingOsid = axis.staging_osid ?? op.staging_osid;
            if (!stagingOsid) continue;
            const donors = selectDonors(state, {
                anchor_brigade_id: anchorId,
                staging_osid: stagingOsid,
            });
            formTacticalGroup(state, {
                op_id: op.name,
                anchor_brigade_id: anchorId,
                donors,
                current_turn: currentTurn,
            });
        }
        return;
    }
    if (op.participating_brigades.length === 0 || !op.staging_osid) return;
    const anchorId = op.participating_brigades[0];
    const donors = selectDonors(state, {
        anchor_brigade_id: anchorId,
        staging_osid: op.staging_osid,
    });
    formTacticalGroup(state, {
        op_id: op.name,
        anchor_brigade_id: anchorId,
        donors,
        current_turn: currentTurn,
    });
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
    supplyByOsid?: SupplyStateByOsidReport | null, // LANE-2026-05-02
    terrainMultByOsid?: Record<string, number>, // LANE-2026-05-02
): PreparationTickResult {
    const commander = getOpsCommander(state, op);
    const competence = commander?.data.competence ?? 3;
    const aggressiveness = commander?.data.aggressiveness ?? 3;

    // Initialize preparation state if not yet set
    if (!op.preparation_sub_phase) {
        op.preparation_sub_phase = 'intel_gathering';
        op.preparation_turns_elapsed = 0;
        // If the op definition specifies planning_duration, honour it as a minimum —
        // an aggressive commander cannot auto-launch before the planned window.
        const aggressivenessMaxTurns = getPreparationMaxTurns(aggressiveness);
        op.preparation_max_turns = op.planning_duration != null
            ? Math.max(aggressivenessMaxTurns, op.planning_duration)
            : aggressivenessMaxTurns;
        op.postponement_count = 0;
    }

    op.preparation_turns_elapsed = (op.preparation_turns_elapsed ?? 0) + 1;

    // Pre-planned ops bypass the preparation state machine — objectives, staging,
    // and timing are author-validated. Skip straight to 'ready' so the outer
    // planning_duration gate in sector_offensive.ts is the sole launch gate.
    if (op.is_pre_planned === true) {
        op.preparation_sub_phase = 'ready';
        op.commander_assessment = 'launch';
        return {
            sub_phase: 'ready',
            ready: true,
            probe_ordered: false,
            intel_confidence: getOperationIntelConfidence(state, op),
            supply_readiness: supplyReadiness,
            force_ratio_estimate: 1.0,
            aborted: false,
        };
    }

    const confidence = getOperationIntelConfidence(state, op);
    // LANE-2026-05-02: pass supplyByOsid + terrainMultByOsid for honest defender modifiers
    const forceRatio = estimateForceRatio(state, op, competence, confidence, supplyByOsid, terrainMultByOsid);
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
        if (aggressiveness >= 3 && supplyReadiness >= 0.3) {
            // Anti-paralysis respects supply floor — launching at critical supply guarantees ZEA
            op.preparation_sub_phase = 'ready';
            result.sub_phase = 'ready';
            result.ready = true;
            result.assessment = 'launch';
            op.commander_assessment = 'launch';
            // ADR-0005 v2.2b: form TG at first-arrival to sub_phase='ready'. Flag-gated.
            formTgsAtReadyTransition(state, op, state.meta?.turn ?? 0);
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
                const assembled = countAssembledBrigades(state, op);
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
                    // ADR-0005 v2.2b: form TG at first-arrival to sub_phase='ready'. Flag-gated.
                    formTgsAtReadyTransition(state, op, state.meta?.turn ?? 0);
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

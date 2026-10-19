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
    CorpsCommandState,
    CorpsOperation,
    OperationAxis,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    PreparationSubPhase,
    CommanderAssessment,
    TgFormationDeclineDetail,
    TgId,
    SectorIntelRecord,
} from '../../state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../state/officer_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { mayEliteJoinOperation } from './historical_elite_reservations.js';
import { FACTION_RECON_PROFILES } from './sector_intel_constants.js';
import { ensureCurrentSectorIntelRecord, stableSectorKey } from './sector_intel.js';
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
// ADR-0005 Phase 2: per-op donor policy classifier + cap.
import {
    ENABLE_TG_FORMATION,
    getAnchorBrigade,
    classifyOpDonorPolicy,
    donorCapForPolicy,
} from './tactical_group_config.js';
import {
    selectDonors,
    // ENGINE-HEALTH B3 (2026-09-19): donation readiness is a TG-FORMATION test owned by the
    // donor module. It used to veto the axis from `classifyAxisOpeningAttack`.
    tgDonationMeetsReadiness,
    tgDonationReadinessFraction,
    totalPledgedPersonnel,
} from './tactical_group_selection.js';
import { engageTacticalGroup, formTacticalGroup } from './tactical_group_lifecycle.js';
// REASON-CODE INSTRUMENTATION (topic `tg_formation`): env-gated, absent by default.
import {
    createSouthernMoveConfidenceLookupContext,
    emitLinkedPreparationProbeRecord,
    emitSouthernMoveConfidenceLookupRecord,
    emitMistralTgActivationRecord,
    emitSouthernMovePreparationRecord,
    isReasonCodeTopicEnabled,
    type SouthernMoveConfidenceLookupContext,
} from './reason_code_debug.js';
// ADR-0005 Phase 4: phantom-aware anchor resolution + dual-anchor de-confliction. Flag-gated.
import { resolveTgAnchor, collectActiveAnchorIds } from './tactical_group_anchor.js';
import { getReservedPrePlannedBrigadeIds } from './pre_planned_operations.js';
import { getStandingOgDefenseBrigadeIds } from './standing_og_defense.js';
import { buildProbeOperation } from './corps_operation_helpers.js';
// ADR-0006 Phase 3A: named TG commander + faction-asymmetric naming. Flag-gated (ENABLE_TG_FORMATION).
import { assignTacticalCommander } from './officer_system.js';
import { generateTacticalGroupName } from './tactical_group_naming.js';

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
type ConfidenceLookupCall = 'initial' | 'current' | 'pre_planned';
type OwnRecordSelectionMode = 'not_reached' | 'missing_sector_positional' | 'edgeless_positional' | 'stable' | 'unkeyed_fallback';

interface ConfidenceLookupCandidate {
    source_intel_key: string;
    enemy_sector_id: string;
    own_stable_key: string | null;
    enemy_stable_key: string | null;
    confidence: number;
    objective_match: boolean | null;
}

interface ConfidenceLookupTrace {
    context: SouthernMoveConfidenceLookupContext;
    lookup_call: ConfidenceLookupCall;
    own_record_selection_mode: OwnRecordSelectionMode;
    operation_sector_id: string | null;
    own_sector_id: string | null;
    own_sector_stable_key: string | null;
    objective_mappings: Array<{
        objective_osid: string;
        controller: string | null;
        sector_id: string | null;
        sector_stable_key: string | null;
    }>;
    candidates: ConfidenceLookupCandidate[];
}

function emitConfidenceLookupReturn(
    trace: ConfidenceLookupTrace | undefined,
    returnBranch: string,
    returnedConfidence: number,
): number {
    if (trace) {
        emitSouthernMoveConfidenceLookupRecord(trace.context, {
            event: 'confidence_lookup',
            lookup_call: trace.lookup_call,
            return_branch: returnBranch,
            own_record_selection_mode: trace.own_record_selection_mode,
            operation_sector_id: trace.operation_sector_id,
            own_sector_id: trace.own_sector_id,
            own_sector_stable_key: trace.own_sector_stable_key,
            objective_mappings: trace.objective_mappings,
            candidates: trace.candidates,
            returned_confidence: returnedConfidence,
        });
    }
    return returnedConfidence;
}

export function getOperationIntelConfidence(
    state: GameState,
    op: CorpsOperation,
    observerContext?: SouthernMoveConfidenceLookupContext,
    lookupCall: ConfidenceLookupCall = 'initial',
): number {
    const trace: ConfidenceLookupTrace | undefined = observerContext ? {
        context: observerContext,
        lookup_call: lookupCall,
        own_record_selection_mode: 'not_reached',
        operation_sector_id: op.sector_id ?? null,
        own_sector_id: op.sector_id ?? null,
        own_sector_stable_key: null,
        objective_mappings: [],
        candidates: [],
    } : undefined;
    if (!op.sector_id) return emitConfidenceLookupReturn(trace, 'missing_operation_sector', 0);
    if (!state.military.sector_intel) return emitConfidenceLookupReturn(trace, 'missing_sector_intel', 0);
    const records = getOperationSectorIntelRecords(state, op.sector_id, trace);
    if (records.length === 0) return emitConfidenceLookupReturn(trace, 'no_records', 0);

    // Find the record facing the enemy sector that contains our objectives
    const objectives = new Set(op.objectives ?? []);
    if (objectives.size === 0 && op.axes) {
        for (const axis of op.axes) {
            for (const obj of axis.objectives) objectives.add(obj);
        }
    }

    if (objectives.size === 0) {
        const best = records.reduce((value, rec) => Math.max(value, rec.confidence), 0);
        return emitConfidenceLookupReturn(trace, 'no_objectives_best', best);
    }

    const objectiveEnemySectors = collectObjectiveEnemySectorIds(state, objectives, trace);

    if (objectiveEnemySectors.size === 0) {
        // Objective-specific intel is only meaningful when we can actually map
        // the target OSIDs back to enemy sectors. Older or thinner state slices
        // may not carry that geometry, so fall back to the best facing-sector
        // record instead of treating the operation as having no usable intel.
        const best = records.reduce((value, rec) => Math.max(value, rec.confidence), 0);
        return emitConfidenceLookupReturn(trace, 'unmapped_objectives_best', best);
    }

    let best = 0;
    for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
        const rec = records[recordIndex]!;
        const matches = matchesObjectiveEnemySector(state, rec, objectiveEnemySectors);
        if (trace) trace.candidates[recordIndex]!.objective_match = matches;
        if (!matches) continue;
        best = Math.max(best, rec.confidence);
    }

    return emitConfidenceLookupReturn(trace, 'objective_filtered_best', best);
}

function appendConfidenceLookupCandidate(
    trace: ConfidenceLookupTrace | undefined,
    sourceIntelKey: string,
    rec: SectorIntelRecord,
): void {
    if (!trace) return;
    trace.candidates.push({
        source_intel_key: sourceIntelKey,
        enemy_sector_id: rec.enemy_sector_id,
        own_stable_key: rec.own_stable_key ?? null,
        enemy_stable_key: rec.enemy_stable_key ?? null,
        confidence: rec.confidence,
        objective_match: null,
    });
}

function getOperationSectorIntelRecords(
    state: GameState,
    sectorId: string,
    trace?: ConfidenceLookupTrace,
): SectorIntelRecord[] {
    const intel = state.military.sector_intel;
    if (!intel) return [];
    const sector = state.military.corps_front_sectors?.[sectorId];
    if (!sector || sector.edge_ids.length === 0) {
        if (trace) {
            trace.own_record_selection_mode = sector ? 'edgeless_positional' : 'missing_sector_positional';
            trace.own_sector_id = sector?.sector_id ?? null;
        }
        const positional = intel[sectorId] ?? [];
        for (const rec of positional) appendConfidenceLookupCandidate(trace, sectorId, rec);
        return positional;
    }

    const ownStable = stableSectorKey(sector);
    if (trace) {
        trace.own_sector_id = sector.sector_id;
        trace.own_sector_stable_key = ownStable;
    }
    const stableMatches: SectorIntelRecord[] = [];
    for (const key of Object.keys(intel).sort(strictCompare)) {
        for (const rec of intel[key] ?? []) {
            if (rec.own_stable_key === ownStable) {
                stableMatches.push(rec);
                appendConfidenceLookupCandidate(trace, key, rec);
            }
        }
    }
    if (stableMatches.length > 0) {
        if (trace) trace.own_record_selection_mode = 'stable';
        return stableMatches;
    }

    const positional = intel[sectorId] ?? [];
    const unkeyed = positional.filter(rec => rec.own_stable_key === undefined);
    if (trace) trace.own_record_selection_mode = 'unkeyed_fallback';
    for (const rec of unkeyed) appendConfidenceLookupCandidate(trace, sectorId, rec);
    return unkeyed;
}

function matchesObjectiveEnemySector(
    state: GameState,
    rec: SectorIntelRecord,
    sectorIds: ReadonlySet<string>,
): boolean {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return false;
    for (const sectorId of [...sectorIds].sort(strictCompare)) {
        const sector = sectors[sectorId];
        if (!sector || sector.edge_ids.length === 0) {
            if (rec.enemy_sector_id === sectorId) return true;
            continue;
        }
        if (rec.enemy_stable_key !== undefined) {
            if (rec.enemy_stable_key === stableSectorKey(sector)) return true;
        } else if (rec.enemy_sector_id === sectorId) {
            return true;
        }
    }
    return false;
}

function collectObjectiveEnemySectorIds(
    state: GameState,
    objectives: ReadonlySet<string>,
    trace?: ConfidenceLookupTrace,
): Set<string> {
    const objectiveEnemySectors = new Set<string>();
    for (const objective of objectives) {
        const controller = state.political?.political_controllers?.[objective];
        if (!controller) {
            if (trace) trace.objective_mappings.push({
                objective_osid: objective, controller: null, sector_id: null, sector_stable_key: null,
            });
            continue;
        }
        const sector = state.military.corps_front_sectors
            ? Object.values(state.military.corps_front_sectors).find(
                s => s.faction === controller && (s.territory_osids?.includes(objective)
                    || s.sub_segments.some(sub => sub.friendly_osids.includes(objective))),
            )
            : null;
        if (trace) trace.objective_mappings.push({
            objective_osid: objective,
            controller,
            sector_id: sector?.sector_id ?? null,
            sector_stable_key: sector ? stableSectorKey(sector) : null,
        });
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
                    const defenderIds = getStandingOgDefenseBrigadeIds(enemySector);
                    for (const bid of defenderIds) {
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
        if (!mayEliteJoinOperation(bid, state.meta.turn, op.name, op.started_turn)) continue;
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

/** Materialize an opted-in preparation request as a subordinate operation. */
export function createLinkedPreparationProbe(
    state: GameState,
    corpsId: FormationId,
    parent: CorpsOperation,
): CorpsOperation | null {
    if (parent.preparation_probe_delivery !== 'subordinate') return null;
    const cmd = state.military.corps_command?.[corpsId];
    const request = parent.active_probe;
    if (!cmd || !cmd.active_operations.includes(parent) || parent.phase !== 'planning') return null;
    if (!request || request.resolved) return null;
    if (cmd.active_operations.some((candidate) => {
        const link = candidate.preparation_probe_link;
        return link?.parent_operation_name === parent.name
            && link.parent_started_turn === parent.started_turn
            && link.request_started_turn === request.started_turn
            && link.target_osid === request.target_osid;
    })) return null;

    const selected = [...new Set(request.brigade_ids)].sort(strictCompare);
    if (selected.length === 0) return null;
    const parentParticipants = new Set(parent.participating_brigades);
    if (!selected.every((brigadeId) => parentParticipants.has(brigadeId))) return null;
    if (!selected.every((brigadeId) => state.military.formations?.[brigadeId]?.status === 'active')) return null;
    const minimumRemaining = Math.max(1, Math.trunc(parent.minimum_viable_participants ?? 2));
    const selectedSet = new Set(selected);
    const liveRemaining = parent.participating_brigades.filter((brigadeId) =>
        !selectedSet.has(brigadeId)
        && state.military.formations?.[brigadeId]?.status === 'active'
    ).length;
    if (liveRemaining < minimumRemaining) return null;

    const hasConflictingLiveCommitment = Object.keys(state.military.corps_command ?? {})
        .sort(strictCompare)
        .some((candidateCorpsId) => state.military.corps_command?.[candidateCorpsId]?.active_operations.some((candidate) =>
            candidate !== parent
            && (candidate.phase === 'planning' || candidate.phase === 'execution')
            && candidate.participating_brigades.some((brigadeId) => selectedSet.has(brigadeId))
        ) === true);
    if (hasConflictingLiveCommitment) return null;

    const sourceAxes = selected.map((brigadeId) => {
        const matches = (parent.axes ?? []).filter((axis) => axis.assigned_brigades.includes(brigadeId));
        if (matches.length !== 1) return null;
        return { brigade_id: brigadeId, axis_id: matches[0]!.axis_id };
    });
    if (sourceAxes.some((source) => source === null)) return null;

    const child = buildProbeOperation(
        corpsId,
        state.meta?.turn ?? 0,
        selected[0]!,
        parent.sector_id,
        [request.target_osid],
    );
    child.name = `Preparation Probe: ${parent.name}`;
    child.participating_brigades = selected;
    if (child.axes?.[0]) child.axes[0].assigned_brigades = selected;
    child.preparation_probe_link = {
        parent_operation_name: parent.name,
        parent_started_turn: parent.started_turn,
        request_started_turn: request.started_turn,
        target_osid: request.target_osid,
        source_axes: sourceAxes as NonNullable<CorpsOperation['preparation_probe_link']>['source_axes'],
    };

    parent.participating_brigades = parent.participating_brigades
        .filter((brigadeId) => !selectedSet.has(brigadeId))
        .sort(strictCompare);
    for (const axis of parent.axes ?? []) {
        axis.assigned_brigades = axis.assigned_brigades
            .filter((brigadeId) => !selectedSet.has(brigadeId))
            .sort(strictCompare);
    }
    cmd.active_operations.push(child);
    const faction = state.military.formations?.[corpsId]?.faction;
    emitLinkedPreparationProbeRecord(child, faction, corpsId, state.meta?.turn ?? 0, (receipt) => ({
        event: 'linked_probe_created',
        ...receipt,
    }));
    return child;
}

function findExactPreparationProbeParent(
    cmd: CorpsCommandState,
    child: CorpsOperation,
): CorpsOperation | null {
    const link = child.preparation_probe_link;
    if (!link) return null;
    return cmd.active_operations.find((candidate) =>
        candidate !== child
        && candidate.preparation_probe_delivery === 'subordinate'
        && candidate.name === link.parent_operation_name
        && candidate.started_turn === link.parent_started_turn
    ) ?? null;
}

function requestMatchesPreparationProbeLink(
    request: CorpsOperation['active_probe'],
    link: NonNullable<CorpsOperation['preparation_probe_link']>,
): boolean {
    return request !== undefined
        && request.started_turn === link.request_started_turn
        && request.target_osid === link.target_osid;
}

export type LinkedPreparationProbeSettlement =
    | 'not_linked'
    | 'already_restored'
    | 'parent_missing'
    | 'restored_real_contact'
    | 'restored_no_contact'
    | 'restored_no_opportunity';

/** Restore a subordinate probe's surviving formations before its parent resumes. */
export function settleLinkedPreparationProbeOnRecovery(
    state: GameState,
    corpsId: FormationId,
    child: CorpsOperation,
): LinkedPreparationProbeSettlement {
    const link = child.preparation_probe_link;
    if (!link) return 'not_linked';
    if (link.restored_to_parent === true) return 'already_restored';
    const cmd = state.military.corps_command?.[corpsId];
    const parent = cmd ? findExactPreparationProbeParent(cmd, child) : null;
    if (!cmd || !parent || parent.phase !== 'planning') return 'parent_missing';

    const sourceAxisIds = new Set((parent.axes ?? []).map((axis) => axis.axis_id));
    if (link.source_axes.some((source) => source.axis_id !== undefined && !sourceAxisIds.has(source.axis_id))) {
        return 'parent_missing';
    }
    const surviving = child.participating_brigades.filter((brigadeId) => {
        const formation = state.military.formations?.[brigadeId];
        if (!formation || formation.status !== 'active') return false;
        return !cmd.active_operations.some((candidate) =>
            candidate !== child
            && candidate !== parent
            && (candidate.phase === 'planning' || candidate.phase === 'execution')
            && candidate.participating_brigades.includes(brigadeId));
    }).sort(strictCompare);

    const faction = state.military.formations?.[corpsId]?.faction;
    let outcome: LinkedPreparationProbeSettlement = 'restored_real_contact';
    const linkedRequest = parent.active_probe;
    if (requestMatchesPreparationProbeLink(linkedRequest, link) && linkedRequest && !linkedRequest.resolved) {
        if (link.order_opportunity_turn !== undefined && faction) {
            autoResolveProbe(state, parent, faction, corpsId);
            outcome = 'restored_no_contact';
        } else {
            linkedRequest.resolved = true;
            linkedRequest.result_confidence_gain = 0;
            outcome = 'restored_no_opportunity';
        }
    }

    const survivorSet = new Set(surviving);
    parent.participating_brigades = [...new Set([
        ...parent.participating_brigades,
        ...surviving,
    ])].sort(strictCompare);
    for (const source of link.source_axes) {
        if (!survivorSet.has(source.brigade_id) || source.axis_id === undefined) continue;
        const axis = parent.axes?.find((candidate) => candidate.axis_id === source.axis_id);
        if (axis) axis.assigned_brigades = [...new Set([...axis.assigned_brigades, source.brigade_id])].sort(strictCompare);
    }
    if (outcome === 'restored_no_contact') {
        emitLinkedPreparationProbeRecord(child, faction, corpsId, state.meta?.turn ?? 0, (receipt) => ({
            event: 'probe_return',
            entrypoint: 'auto_probe',
            linked_probe_receipt: {
                ...receipt,
                terminal_reason: child.recovery_reason ?? 'probe_complete',
            },
        }));
    }
    emitLinkedPreparationProbeRecord(child, faction, corpsId, state.meta?.turn ?? 0, (receipt) => ({
        event: 'linked_probe_recovery',
        ...receipt,
        outcome,
        order_opportunity_turn: link.order_opportunity_turn ?? null,
    }));
    link.restored_to_parent = true;
    return outcome;
}

/** Record the exact ordinary attack-order opportunity for a subordinate probe. */
export function recordLinkedPreparationProbeOrderOpportunity(
    state: GameState,
    brigadeId: FormationId,
    targetOsid: string,
): boolean {
    for (const corpsId of Object.keys(state.military.corps_command ?? {}).sort(strictCompare)) {
        const cmd = state.military.corps_command?.[corpsId];
        if (!cmd) continue;
        for (const child of cmd.active_operations) {
            const link = child.preparation_probe_link;
            if (!link || child.phase !== 'execution' || link.target_osid !== targetOsid) continue;
            if (!child.participating_brigades.includes(brigadeId)) continue;
            const axis = child.axes?.find((candidate) => candidate.assigned_brigades.includes(brigadeId));
            if (!axis || axis.objectives[axis.current_objective_index ?? 0] !== targetOsid) continue;
            const parent = findExactPreparationProbeParent(cmd, child);
            const request = parent?.active_probe;
            if (!parent || !request || request.resolved || !requestMatchesPreparationProbeLink(request, link)) continue;
            if (!request.brigade_ids.includes(brigadeId)) continue;
            if (link.order_opportunity_turn === undefined) {
                link.order_opportunity_turn = state.meta?.turn ?? 0;
                const faction = state.military.formations?.[corpsId]?.faction;
                emitLinkedPreparationProbeRecord(child, faction, corpsId, state.meta?.turn ?? 0, (receipt) => ({
                    event: 'linked_probe_order_opportunity',
                    ...receipt,
                    brigade_ids: [brigadeId],
                    order_opportunity_turn: link.order_opportunity_turn,
                }));
            }
            return true;
        }
    }
    return false;
}

/** Apply a battle receipt only when it belongs to the exact subordinate request. */
export function resolveLinkedPreparationProbeBattle(
    state: GameState,
    corpsId: FormationId,
    child: CorpsOperation,
    targetOsid: string,
    contributingBrigadeIds: readonly FormationId[],
    _battleId: string,
): boolean {
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd || child.phase !== 'execution' || !child.preparation_probe_link) return false;
    const parent = findExactPreparationProbeParent(cmd, child);
    const request = parent?.active_probe;
    if (!parent || !request || !requestMatchesPreparationProbeLink(request, child.preparation_probe_link)
        || request.resolved || request.target_osid !== targetOsid) return false;
    const selected = new Set(request.brigade_ids);
    const childParticipants = new Set(child.participating_brigades);
    const contributors = [...contributingBrigadeIds]
        .filter((brigadeId) => selected.has(brigadeId) && childParticipants.has(brigadeId))
        .sort(strictCompare);
    if (contributors.length === 0) return false;
    const faction = state.military.formations?.[corpsId]?.faction;
    if (!faction) return false;
    child.preparation_probe_link.order_opportunity_turn ??= state.meta?.turn ?? 0;
    resolveActiveProbe(state, parent, faction, corpsId);
    emitLinkedPreparationProbeRecord(child, faction, corpsId, state.meta?.turn ?? 0, (receipt) => ({
        event: 'probe_return',
        entrypoint: 'real_probe',
        linked_probe_receipt: {
            ...receipt,
            battle_id: _battleId,
        },
    }));
    return true;
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
 * v2.2c #3 added the 60% donation-readiness gate at the opening-attack readiness
 * check (sector_offensive_launch_helpers.ts `classifyAxisOpeningAttack`) via a
 * recomputed selectDonors — no cached `op.donor_pool` field. This helper still
 * selects + forms at ready; selectDonors is deterministic, so the readiness-gate
 * pool and this formation pool agree for a given turn's state.
 */
/**
 * REASON-CODE INSTRUMENTATION (topic `tg_formation`) — ENGINE-HEALTH B3 (2026-09-19).
 *
 * Records WHY a Tactical Group augmentation was declined, on the axis (multi-axis ops) or
 * on the operation (legacy single-axis). This is the diagnostic that the retired
 * `insufficient_donation` launch blocker used to stand in for — except that a decline is
 * no longer an operation failure, so the record also states that the underlying operation
 * continues under ordinary readiness.
 *
 * Absent when the topic is off: `whenReasonCodeTopic` spreads an EMPTY object, so a
 * default run neither computes nor serializes anything and the save hash is unmoved. The
 * payload is a thunk for the same reason.
 */
function recordTgFormationDecline(
    target: { tg_formation_decline?: TgFormationDeclineDetail },
    anchorId: FormationId,
    anchorPersonnel: number,
    // `string`, not the narrower faction-id union — `FormationState.faction` is declared
    // `string`, and narrowing here would need a type assertion at both call sites
    // (a strict-null escape the inventory ratchet counts).
    faction: string | undefined,
    donors: ReadonlyArray<{ personnel_lent: number }>,
): void {
    // Direct gate rather than the `whenReasonCodeTopic` spread helper: that helper requires a
    // `Record<string, unknown>` payload, which an interface does not satisfy, so it would cost
    // the structural check. Same precedent as `AxisRejectionDetail` in
    // `sector_offensive_launch_helpers.ts`. When the topic is off nothing is computed and the
    // key stays ABSENT — not present-and-null — which is the byte-identity guarantee.
    if (!isReasonCodeTopicEnabled('tg_formation')) return;
    const fraction = tgDonationReadinessFraction(faction);
    const detail: TgFormationDeclineDetail = {
        declined: true,
        reason: donors.length === 0 ? 'no_eligible_donors' : 'donation_below_readiness',
        anchor_brigade_id: anchorId,
        anchor_personnel: anchorPersonnel,
        faction: faction ?? null,
        donor_count: donors.length,
        donated_personnel: totalPledgedPersonnel(donors),
        readiness_fraction: fraction,
        required_donation: fraction * anchorPersonnel,
        // The whole point of B3: declining the augmentation is not an operation failure.
        operation_remains_executable: true,
    };
    target.tg_formation_decline = detail;
}

/**
 * One axis's share of `formTgsAtReadyTransition` (behavior-preserving extraction): resolve the
 * anchor against the shared reservation set, claim it, pick donors around the axis staging OSID
 * and form the TG unless one already exists or the donor pool is inadequate.
 */
function formTgForSingleAxis(
    state: GameState,
    op: CorpsOperation,
    axis: OperationAxis,
    currentTurn: number,
    adjacency: Map<string, string[]> | undefined,
    reservedAnchors: Set<string>,
    maxDonors: number | undefined,
    observe?: (record: Record<string, unknown>) => void,
    donorObservation?: { corps_id: string; caller_stage: 'pre_results' | 'post_results' | 'direct' },
): TgId | null {
    const anchorId = resolveTgAnchor(state, axis, reservedAnchors);
    if (!anchorId) { observe?.({ kind: 'tg_inner_terminal', reason: 'no_anchor' }); return null; }
    reservedAnchors.add(anchorId); // claim it: a sibling axis must pick its next-best
    const stagingOsid = axis.staging_osid ?? op.staging_osid;
    if (!stagingOsid) { observe?.({ kind: 'tg_inner_terminal', reason: 'no_staging', anchor_id: anchorId }); return null; }
    // Idempotent: skip if a TG for this op+anchor already exists (the
    // sector_attack ready-path may form first; the canonical launch-site
    // call must not double-form).
    if (tgAlreadyExistsFor(state, op.name, anchorId)) { observe?.({ kind: 'tg_inner_terminal', reason: 'already_exists', anchor_id: anchorId, staging_osid: stagingOsid }); return null; }
    const donors = selectDonors(state, {
        anchor_brigade_id: anchorId,
        staging_osid: stagingOsid,
        army_hq_op_id: op.army_hq_op_id,
        adjacency,
        max_donors: maxDonors,
        observation: {
            caller_turn: currentTurn,
            operation_name: op.name,
            operation_id: donorObservation ? `${donorObservation.corps_id}:${op.name}:t${op.started_turn}` : null,
            axis_id: axis.axis_id,
            corps_id: donorObservation?.corps_id ?? null,
            caller_stage: donorObservation?.caller_stage ?? 'direct',
        },
    });
    // Codex P2 #46: a zero-donor anchor must NOT form a phantom TG (consuming TG
    // caps + identity/commander + TG-only dissolution/revert). With no donors the
    // intended behavior is the legacy lone-anchor (no-TG) attack, exactly as
    // flag-off: the op still launches via the sector/operation path with just the
    // anchor brigade. Skip TG formation for this axis.
    //
    // ENGINE-HEALTH B3 (2026-09-19): an INADEQUATE pool now takes the same exit as
    // an empty one. `tgDonationMeetsReadiness` is false for both, so a pool below
    // the faction's readiness fraction declines the augmentation instead of
    // refusing the operation — which is what the old `insufficient_donation` gate
    // in `classifyAxisOpeningAttack` did. `formTacticalGroup` is never reached, so
    // no donor personnel, equipment, cohesion bleed, cooldown or per-scenario
    // donation credit is consumed by a declined augmentation.
    const anchorPersonnel = state.military?.formations?.[anchorId]?.personnel ?? 0;
    const anchorFaction = state.military?.formations?.[anchorId]?.faction;
    if (!tgDonationMeetsReadiness(donors, anchorPersonnel, anchorFaction)) {
        recordTgFormationDecline(axis, anchorId, anchorPersonnel, anchorFaction, donors);
        observe?.({ kind: 'tg_inner_terminal', reason: donors.length === 0 ? 'no_eligible_donors' : 'donation_below_readiness', anchor_id: anchorId, staging_osid: stagingOsid, donor_count: donors.length, donated_personnel: totalPledgedPersonnel(donors), anchor_personnel: anchorPersonnel, anchor_faction: anchorFaction ?? null });
        return null;
    }
    const formed = formTacticalGroup(state, {
        op_id: op.name,
        anchor_brigade_id: anchorId,
        donors,
        current_turn: currentTurn,
        army_hq_op_id: op.army_hq_op_id,
    });
    if (!formed.tg_id) { observe?.({ kind: 'tg_inner_terminal', reason: 'formation_rejected', anchor_id: anchorId, staging_osid: stagingOsid, donor_count: donors.length }); return null; }
    applyTgIdentity(state, op, anchorId);
    observe?.({ kind: 'tg_inner_terminal', reason: 'formed', anchor_id: anchorId, staging_osid: stagingOsid, donor_count: donors.length, tg_id: formed.tg_id });
    return formed.tg_id;
}

/**
 * Form the TG for ONE axis at its own lawful transition (phase-gate activation). Same policy,
 * reservation and idempotence rules as the ready transition; never forms for a holding axis.
 *
 * Returns the id of the group this call actually formed, or null when nothing was formed
 * (formation disabled, no anchor, no/inadequate donors, already existing, rejected). The newly
 * formed group is ENGAGED here (existing anchor-location/engagement semantics via
 * `engageTacticalGroup`): activation happens after the operation entered execution, so the
 * original `markOperationExecuting` pass never saw it, and exhaustion considers engaged groups
 * only. ONLY that group is engaged — no sibling/unrelated group and no operation-wide pass.
 */
export function formTgForAxis(
    state: GameState,
    op: CorpsOperation,
    axis: OperationAxis,
    currentTurn: number,
    adjacency?: Map<string, string[]>,
    observation?: { corps_id: string; caller_stage: 'pre_results' | 'post_results' | 'direct' },
): TgId | null {
    const observe = isReasonCodeTopicEnabled('mistral_tg_activation');
    const emit = (record: Record<string, unknown>): void => emitMistralTgActivationRecord({
        turn: currentTurn, operation_name: op.name, axis_id: axis.axis_id,
        corps_id: observation?.corps_id ?? null,
        operation_id: observation ? `${observation.corps_id}:${op.name}:t${op.started_turn}` : null,
        caller_stage: observation?.caller_stage ?? 'direct', ...record,
    });
    if (observe) emit({ kind: 'tg_call_start', axis_status: axis.status, gate_phase: axis.late_phase?.phase ?? null });
    if (!ENABLE_TG_FORMATION) { if (observe) emit({ kind: 'tg_call_end', result: 'formation_disabled' }); return null; }
    if (axis.late_phase?.phase === 'holding') { if (observe) emit({ kind: 'tg_call_end', result: 'axis_holding' }); return null; }
    const policy = classifyOpDonorPolicy(op);
    if (policy === 'none') { if (observe) emit({ kind: 'tg_call_end', result: 'policy_none' }); return null; }
    const maxDonors = donorCapForPolicy(policy);
    const reservedAnchors = collectActiveAnchorIds(state);
    for (const id of getReservedPrePlannedBrigadeIds(currentTurn)) reservedAnchors.add(id);
    const formedId = formTgForSingleAxis(
        state, op, axis, currentTurn, adjacency, reservedAnchors, maxDonors,
        observe ? emit : undefined, observation,
    );
    if (formedId !== null && op.phase === 'execution') engageTacticalGroup(state, formedId);
    if (observe) emit({ kind: 'tg_call_end', result: formedId === null ? 'not_formed' : 'formed', tg_id: formedId });
    return formedId;
}

export function formTgsAtReadyTransition(
    state: GameState,
    op: CorpsOperation,
    currentTurn: number,
    adjacency?: Map<string, string[]>,
): void {
    if (!ENABLE_TG_FORMATION) return;

    // ADR-0005 Phase 2: classify the op by KIND → donor policy. `none` (probes /
    // feints / reorganization) forms NO TG (legacy anchor-only). `limited`
    // (emergency reactions) forms a TG with a capped donor pull. `full`
    // (offensives) uses the module default donor cap.
    const policy = classifyOpDonorPolicy(op);
    if (policy === 'none') return;
    const maxDonors = donorCapForPolicy(policy); // undefined for 'full' → module default

    // ADR-0005 Phase 4 — dual-anchor de-confliction (Fix 2). Seed the reservation set
    // with brigades already anchoring an active TG plus issue-#40 pre-planned reserves,
    // then add each anchor we pick this pass so sibling axes / later ops can't re-claim it.
    // resolveTgAnchor also drops phantom anchors (Fix 1): when a phantom outranks the
    // resident brigade it is skipped; an all-phantom axis (Op Prsten ilijas_ring) yields
    // null → no TG forms (legacy anchor-only path until a real VRS anchor is authored).
    const reservedAnchors = collectActiveAnchorIds(state);
    for (const id of getReservedPrePlannedBrigadeIds(currentTurn)) reservedAnchors.add(id);

    if (op.axes && op.axes.length > 0) {
        for (const axis of op.axes) {
            // Opt-in phase gate: a holding axis forms no TG (no donor pull, no spent TG budget) at
            // launch or at the preparation-ready transition; it forms its own TG exactly once at
            // activation (`formTgForAxis`). Axes without the opt-in take the unchanged path.
            if (axis.late_phase?.phase === 'holding') continue;
            formTgForSingleAxis(state, op, axis, currentTurn, adjacency, reservedAnchors, maxDonors);
        }
        return;
    }
    if (op.participating_brigades.length === 0 || !op.staging_osid) return;
    // Phase 4 (Fix 1/2): resolve a persistent, non-phantom, non-reserved anchor for the
    // legacy single-axis path too (treat participating_brigades as the candidate pool).
    const anchorId = resolveTgAnchor(
        state,
        { assigned_brigades: op.participating_brigades },
        reservedAnchors,
    );
    if (!anchorId) return;
    if (tgAlreadyExistsFor(state, op.name, anchorId)) return;
    const donors = selectDonors(state, {
        anchor_brigade_id: anchorId,
        staging_osid: op.staging_osid,
        army_hq_op_id: op.army_hq_op_id,
        adjacency,
        max_donors: maxDonors,
    });
    // Codex P2 #46: a zero-donor anchor must NOT form a phantom TG (consuming TG caps +
    // identity/commander + TG-only dissolution/revert). With no donors the intended
    // behavior is the legacy lone-anchor (no-TG) attack, exactly as flag-off: the op still
    // launches via the sector/operation path with just the anchor brigade. Skip TG formation.
    //
    // ENGINE-HEALTH B3 (2026-09-19): same exit for an inadequate pool. See the multi-axis
    // branch above for the full rationale.
    const anchorPersonnel = state.military?.formations?.[anchorId]?.personnel ?? 0;
    const anchorFaction = state.military?.formations?.[anchorId]?.faction;
    if (!tgDonationMeetsReadiness(donors, anchorPersonnel, anchorFaction)) {
        recordTgFormationDecline(op, anchorId, anchorPersonnel, anchorFaction, donors);
        return;
    }
    const formed = formTacticalGroup(state, {
        op_id: op.name,
        anchor_brigade_id: anchorId,
        donors,
        current_turn: currentTurn,
        army_hq_op_id: op.army_hq_op_id,
    });
    if (formed.tg_id) applyTgIdentity(state, op, anchorId);
}

/**
 * ADR-0006 Phase 3A — apply TG identity once a TG forms (FLAG-ON ONLY; caller is
 * already inside the ENABLE_TG_FORMATION gate of formTgsAtReadyTransition):
 *   1. Assign a named `tactical_commander` (anchor brigade's corps grade) to the op
 *      via `op.tg_commander_officer_id`. Its combat mod applies to the ANCHOR only
 *      (getThreeTierOfficerMod TG-anchor branch); donors keep their own corps mod.
 *   2. Populate the anchor sector's faction-asymmetric `display_name` (VRS geographic,
 *      ARBiH numbered, HVO operational zone) for the identity read-model.
 *
 * Deterministic: sorted iteration, pure name generation, no randomness/clock. Idempotent.
 */
function applyTgIdentity(state: GameState, op: CorpsOperation, anchorId: string): void {
    const anchor = state.military?.formations?.[anchorId];
    if (!anchor || !anchor.corps_id) return;
    const faction = anchor.faction;
    const corpsId = anchor.corps_id;

    // 1. Named tactical_commander for the anchor assault.
    assignTacticalCommander(state, op, corpsId, faction);

    // 2. Faction-asymmetric display name for the anchor's standing sector.
    const sectors = state.military?.corps_front_sectors;
    if (sectors) {
        // Deterministic ordinal: count this corps's active TGs (sorted) anchored elsewhere.
        const tgs = state.military?.tactical_groups ?? {};
        let ordinal = 0;
        for (const id of Object.keys(tgs).sort(strictCompare)) {
            if (tgs[id]?.corps_id === corpsId) ordinal += 1;
        }
        const name = generateTacticalGroupName({
            faction,
            corps_id: corpsId,
            anchor_osid: anchor.location_osid ?? op.staging_osid ?? corpsId,
            ordinal,
        });
        const sectorIds = Object.keys(sectors).sort(strictCompare);
        for (const sid of sectorIds) {
            const sector = sectors[sid];
            if (sector?.corps_id === corpsId && !sector.display_name) {
                sector.display_name = name;
                break;
            }
        }
    }
}

/**
 * Idempotency guard for TG formation: true if a TG already exists for this
 * operation + anchor. The TG id is `tg:<corps_id>:<op_id>:<anchor_brigade_id>`,
 * so we match by op_id + anchor (corps is derived from the anchor). Keeps the
 * canonical launch-site call from double-forming a TG the ready-path already made.
 */
function tgAlreadyExistsFor(state: GameState, opId: string, anchorId: string): boolean {
    const tgs = state.military?.tactical_groups;
    if (!tgs) return false;
    for (const id of Object.keys(tgs)) {
        const tg = tgs[id];
        if (tg.op_id === opId && tg.anchor_brigade_id === anchorId) return true;
    }
    return false;
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
    adjacency?: Map<string, string[]>,
    observerOperationIndex?: number,
): PreparationTickResult {
    const confidenceLookupContext = createSouthernMoveConfidenceLookupContext(
        op.name,
        faction,
        corpsId,
        state.meta?.turn ?? 0,
        observerOperationIndex,
        op.started_turn,
        op.phase_started_turn,
    );
    const commander = getOpsCommander(state, op);
    const competence = commander?.data.competence ?? 3;
    const aggressiveness = commander?.data.aggressiveness ?? 3;

    // Initialize preparation state if not yet set
    if (!op.preparation_sub_phase) {
        op.preparation_sub_phase = 'intel_gathering';
        op.preparation_turns_elapsed = 0;
        // If the op definition specifies planning_duration, preserve it as the full
        // march/preparation budget before the anti-paralysis timeout can fire.
        const aggressivenessMaxTurns = getPreparationMaxTurns(aggressiveness);
        op.preparation_max_turns = op.planning_duration != null
            ? Math.max(aggressivenessMaxTurns, op.planning_duration)
            : aggressivenessMaxTurns;
        op.postponement_count = 0;
    }

    op.preparation_turns_elapsed = (op.preparation_turns_elapsed ?? 0) + 1;

    // Pre-planned ops bypass the preparation state machine — objectives, staging,
    // and timing are author-validated. Skip straight to 'ready'; the outer lifecycle
    // owner still enforces one planning turn plus participant/opening-attack readiness.
    if (op.is_pre_planned === true) {
        op.preparation_sub_phase = 'ready';
        op.commander_assessment = 'launch';
        const prePlannedResult: PreparationTickResult = {
            sub_phase: 'ready',
            ready: true,
            probe_ordered: false,
            intel_confidence: getOperationIntelConfidence(state, op, confidenceLookupContext, 'pre_planned'),
            supply_readiness: supplyReadiness,
            force_ratio_estimate: 1.0,
            aborted: false,
        };
        emitSouthernMovePreparationRecord(op.name, faction, corpsId, state.meta?.turn ?? 0, () => ({
            event: 'tick_return',
            return_path: 'pre_planned',
            ...(observerOperationIndex === undefined ? {} : { operation_index: observerOperationIndex }),
            operation_started_turn: op.started_turn,
            operation_phase_started_turn: op.phase_started_turn,
            returned_intel_confidence: prePlannedResult.intel_confidence,
            returned_ready: prePlannedResult.ready,
            returned_aborted: prePlannedResult.aborted,
            turn: state.meta?.turn ?? 0,
        }));
        return prePlannedResult;
    }

    const confidence = getOperationIntelConfidence(state, op, confidenceLookupContext, 'initial');
    // LANE-2026-05-02: pass supplyByOsid + terrainMultByOsid for honest defender modifiers
    const forceRatio = estimateForceRatio(state, op, competence, confidence, supplyByOsid, terrainMultByOsid);
    const requiredConfidence = getRequiredConfidence(competence, aggressiveness);
    const requiredForceRatio = getRequiredForceRatio(competence, aggressiveness);
    let currentConfidenceReached: number | undefined;

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
            formTgsAtReadyTransition(state, op, state.meta?.turn ?? 0, adjacency);
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
        emitSouthernMovePreparationRecord(op.name, faction, corpsId, state.meta?.turn ?? 0, () => ({
            event: 'tick_return',
            return_path: result.aborted ? 'anti_paralysis_abort' : 'anti_paralysis_launch',
            ...(observerOperationIndex === undefined ? {} : { operation_index: observerOperationIndex }),
            operation_started_turn: op.started_turn,
            operation_phase_started_turn: op.phase_started_turn,
            initial_confidence: confidence,
            required_confidence: requiredConfidence,
            returned_intel_confidence: result.intel_confidence,
            returned_ready: result.ready,
            returned_aborted: result.aborted,
            turn: state.meta?.turn ?? 0,
        }));
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
                    emitSouthernMovePreparationRecord(op.name, faction, corpsId, state.meta?.turn ?? 0, () => ({
                        event: 'tick_return', return_path: 'pending_probe', turn: state.meta?.turn ?? 0,
                        ...(observerOperationIndex === undefined ? {} : { operation_index: observerOperationIndex }),
                        operation_started_turn: op.started_turn, operation_phase_started_turn: op.phase_started_turn,
                        initial_confidence: confidence, required_confidence: requiredConfidence,
                        returned_intel_confidence: result.intel_confidence, returned_ready: result.ready,
                        returned_aborted: result.aborted,
                    }));
                    return result;
                }

                // If probe just resolved, apply confidence gain
                if (op.active_probe?.resolved && op.active_probe.result_confidence_gain) {
                    op.active_probe = undefined; // Clear completed probe
                }

                // Re-read confidence after potential probe resolution
                const currentConfidence = getOperationIntelConfidence(state, op, confidenceLookupContext, 'current');
                currentConfidenceReached = currentConfidence;
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
                            if (op.preparation_probe_delivery === 'subordinate') {
                                const child = createLinkedPreparationProbe(state, corpsId, op);
                                result.probe_ordered = child !== null;
                                if (!child) {
                                    op.active_probe.resolved = true;
                                    op.active_probe.result_confidence_gain = 0;
                                }
                            } else {
                                result.probe_ordered = true;
                            }
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
                    formTgsAtReadyTransition(state, op, state.meta?.turn ?? 0, adjacency);
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

    emitSouthernMovePreparationRecord(op.name, faction, corpsId, state.meta?.turn ?? 0, () => ({
        event: 'tick_return',
        return_path: 'normal',
        ...(observerOperationIndex === undefined ? {} : { operation_index: observerOperationIndex }),
        operation_started_turn: op.started_turn,
        operation_phase_started_turn: op.phase_started_turn,
        initial_confidence: confidence,
        ...(currentConfidenceReached === undefined ? {} : { current_confidence: currentConfidenceReached }),
        required_confidence: requiredConfidence,
        returned_intel_confidence: result.intel_confidence,
        returned_ready: result.ready,
        returned_aborted: result.aborted,
        turn: state.meta?.turn ?? 0,
    }));
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
    const turn = state.meta?.turn ?? 0;
    if (!op.active_probe || op.active_probe.resolved) {
        emitSouthernMovePreparationRecord(op.name, faction, corpsId, turn, () => ({
            event: 'probe_return', entrypoint: 'real_probe', outcome: op.active_probe ? 'already_resolved' : 'no_pending_probe',
            operation_started_turn: op.started_turn, operation_phase_started_turn: op.phase_started_turn,
            write_count: 0, turn,
        }));
        return;
    }

    const profile = FACTION_RECON_PROFILES[faction as NonNullable<FactionId>];
    if (!profile) return;

    const confidenceGain = profile.probe_confidence_gain;
    op.active_probe.resolved = true;
    op.active_probe.result_confidence_gain = confidenceGain;

    // Apply confidence boost only to the current sector pair containing the probe target.
    let writeCount = 0;
    const pair = resolveCurrentProbeSectorPair(state, op);
    if (pair) {
        const rec = ensureCurrentSectorIntelRecord(state, pair.ownSectorId, pair.enemySectorId, turn);
        if (rec) {
            creditProbeRecord(state, op, faction, corpsId, 'real_probe', rec, confidenceGain);
            writeCount += 1;
        }
    }

    // Counter-probe: defender detects the probing activity
    if (pair) writeCount += applyCounterProbeIntel(state, op, faction, corpsId, pair);

    // Add exhaustion cost
    const cmd = state.military.corps_command?.[corpsId];
    if (cmd) {
        cmd.corps_exhaustion = Math.min(100, (cmd.corps_exhaustion ?? 0) + PROBE_EXHAUSTION_COST);
    }
    emitSouthernMovePreparationRecord(op.name, faction, corpsId, turn, () => ({
        event: 'probe_return', entrypoint: 'real_probe', outcome: writeCount > 0 ? 'resolved_with_writes' : 'resolved_no_credit',
        operation_started_turn: op.started_turn, operation_phase_started_turn: op.phase_started_turn,
        write_count: writeCount, turn,
    }));
}

/**
 * Counter-probe: when we probe an enemy, they detect our preparations.
 * Boosts the defender's intel confidence for the sector facing us.
 */
function applyCounterProbeIntel(
    state: GameState,
    op: CorpsOperation,
    faction: FactionId,
    corpsId: FormationId,
    pair: CurrentProbeSectorPair,
): number {
    const rec = ensureCurrentSectorIntelRecord(
        state,
        pair.enemySectorId,
        pair.ownSectorId,
        state.meta?.turn ?? 0,
    );
    if (!rec) return 0;
    creditProbeRecord(state, op, faction, corpsId, 'counter_probe', rec, COUNTER_PROBE_CONFIDENCE_GAIN);
    rec.offensive_signs = true;
    return 1;
}

interface CurrentProbeSectorPair {
    ownSectorId: string;
    enemySectorId: string;
}

function resolveCurrentProbeSectorPair(state: GameState, op: CorpsOperation): CurrentProbeSectorPair | null {
    const ownSectorId = op.sector_id;
    const targetOsid = op.active_probe?.target_osid;
    const sectors = state.military.corps_front_sectors;
    if (!ownSectorId || !targetOsid || !sectors) return null;
    const ownSector = sectors[ownSectorId];
    const controller = state.political?.political_controllers?.[targetOsid];
    if (!ownSector?.faction || !controller || ownSector.faction === controller) return null;

    const matches = Object.keys(sectors).sort(strictCompare).filter(sectorId => {
        const sector = sectors[sectorId]!;
        return sector.faction === controller
            && (sector.territory_osids?.includes(targetOsid)
                || sector.sub_segments.some(sub => sub.friendly_osids.includes(targetOsid)));
    });
    if (matches.length !== 1) return null;
    return { ownSectorId, enemySectorId: matches[0]! };
}

function creditProbeRecord(
    state: GameState,
    op: CorpsOperation,
    faction: FactionId,
    corpsId: FormationId,
    entrypoint: 'real_probe' | 'auto_probe' | 'counter_probe',
    rec: SectorIntelRecord,
    gain: number,
    observerOperationIndex?: number,
): void {
    const turn = state.meta?.turn ?? 0;
    const before = rec.confidence;
    const after = Math.min(1.0, before + gain);
    rec.confidence = after;
    emitSouthernMovePreparationRecord(op.name, faction, corpsId, turn, () => ({
        event: 'probe_write', entrypoint, turn,
        ...(observerOperationIndex === undefined ? {} : { operation_index: observerOperationIndex }),
        operation_started_turn: op.started_turn, operation_phase_started_turn: op.phase_started_turn,
        own_stable_key: rec.own_stable_key, enemy_stable_key: rec.enemy_stable_key,
        record_enemy_sector_id: rec.enemy_sector_id, before, gain, after,
        clamped: after < before + gain,
    }));
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
    corpsId?: FormationId,
    observerOperationIndex?: number,
): void {
    const selectedCorpsId = corpsId ?? '';
    const turn = state.meta?.turn ?? 0;
    if (!op.active_probe || op.active_probe.resolved) {
        emitSouthernMovePreparationRecord(op.name, faction, selectedCorpsId, turn, () => ({
            event: 'probe_return', entrypoint: 'auto_probe', outcome: op.active_probe ? 'already_resolved' : 'no_pending_probe',
            ...(observerOperationIndex === undefined ? {} : { operation_index: observerOperationIndex }),
            operation_started_turn: op.started_turn, operation_phase_started_turn: op.phase_started_turn,
            write_count: 0, turn,
        }));
        return;
    }

    const profile = FACTION_RECON_PROFILES[faction as NonNullable<FactionId>];
    if (!profile) return;

    // Partial gain — probe didn't make contact but observed from approach
    const partialGain = profile.probe_confidence_gain * 0.5;
    op.active_probe.resolved = true;
    op.active_probe.result_confidence_gain = partialGain;

    // Apply partial confidence boost only to the current sector pair containing the probe target.
    let writeCount = 0;
    const pair = resolveCurrentProbeSectorPair(state, op);
    if (pair) {
        const rec = ensureCurrentSectorIntelRecord(state, pair.ownSectorId, pair.enemySectorId, turn);
        if (rec) {
            creditProbeRecord(
                state, op, faction, selectedCorpsId, 'auto_probe', rec, partialGain, observerOperationIndex,
            );
            writeCount = 1;
        }
    }
    emitSouthernMovePreparationRecord(op.name, faction, selectedCorpsId, turn, () => ({
        event: 'probe_return', entrypoint: 'auto_probe', outcome: writeCount > 0 ? 'resolved_with_writes' : 'resolved_no_credit',
        ...(observerOperationIndex === undefined ? {} : { operation_index: observerOperationIndex }),
        operation_started_turn: op.started_turn, operation_phase_started_turn: op.phase_started_turn,
        write_count: writeCount, turn,
    }));
}

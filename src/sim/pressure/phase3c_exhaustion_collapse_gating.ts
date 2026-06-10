/**
 * Phase 3C: Exhaustion → Collapse Gating
 * 
 * Computes collapse eligibility only (domain gating), not collapse resolution.
 * Eligibility is driven by exhaustion + state coherence gates + suppression/immunity rules.
 * Eligibility is persistent (requires sustained conditions) and deterministic.
 * 
 * Feature-gated: ENABLE_PHASE3C_EXHAUSTION_COLLAPSE_GATING (default: false).
 */

import type { FrontEdge } from '../../map/front_edges.js';
import type { CollapseEligibilityState, FactionId, GameState, Tier1EntityEligibilityState } from '../../state/game_state.js';
import type { SupplyReachabilityOsidReport } from '../../state/supply_reachability_osid.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getEnablePhase3B } from './phase3b_pressure_exhaustion.js';
import { computePressureExposureByEntity, computePressureExposureByEntityOsid, type EntityId } from './pressure_exposure.js';


// Feature flag (OFF by default)
let _enablePhase3COverride: boolean | null = null;

export function getEnablePhase3C(): boolean {
    return _enablePhase3COverride !== null ? _enablePhase3COverride : false;
}

export function setEnablePhase3C(enable: boolean): void {
    _enablePhase3COverride = enable;
}

export function resetEnablePhase3C(): void {
    _enablePhase3COverride = null;
}

// Legacy const export for backward compatibility (uses getter)
export const ENABLE_PHASE3C_EXHAUSTION_COLLAPSE_GATING = false; // Default, but use getEnablePhase3C() for runtime value

/**
 * PHASE 3C CONSTANTS VERIFICATION FLAG
 *
 * TRUE as of the collapse Phase-I build: all constants below carry their
 * owner-RATIFIED Phase-I starting defaults (the placeholders are gone) and the
 * spatial gate is the real BFS-isolation implementation. The fail-fast throw is
 * removed. Phase 3C remains gated OFF at runtime (getEnablePhase3C() === false);
 * only the CLI audit harness flips the flag. Constants are tuned in Phase III
 * calibration; this flag asserts they are no longer unverified placeholders.
 *
 * Provenance: docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §3.
 * NOT canon citations — Engine Invariants §8 / Systems Manual §7.1–7.3 are prose-only
 * (frozen Appendix A/B/C numeric tables archived in the v0.4→v0.9 fold), so each value
 * is an owner/design decision with a proposed default.
 */
const PHASE3C_CONSTANTS_VERIFIED = true;

// Phase 3C Tier-0 constants — RATIFIED Phase-I defaults (spec §3).
const EXHAUSTION_THRESHOLD_AUTHORITY = 70; // spec C2 — keys collapse to the late-war exhaustion plateau (50 reached mid-war by static fronts → premature).
const EXHAUSTION_THRESHOLD_COHESION = 70;  // spec C3 — same band as authority; cohesion gate differentiates, not the threshold.
const EXHAUSTION_THRESHOLD_SPATIAL = 65;   // spec C4 — slightly lower: supply isolation historically precedes authority collapse (a pocket starves before its government dissolves).
const PERSISTENCE_REQUIRED_TURNS = 4;      // spec C5 — ≈ a month of sustained over-threshold exhaustion before eligibility (Engine Invariants §7 multi-turn persistence).

// Coherence gate thresholds — RATIFIED Phase-I defaults (spec §3).
const AUTHORITY_DEGRADATION_THRESHOLD = 30; // spec C6 — faction.profile.authority < 30 = institutional distress.
const COHESION_DEGRADATION_THRESHOLD = 30;  // spec C7 — formation ops.fatigue > 30, consistent with existing fatigue bands.
// spec C8 — SPATIAL_DEGRADATION_THRESHOLD removed: the old supply_sources.size/controlled.size
// ratio proxy was unsound. checkSpatialDegradation now uses the BFS SupplyReachabilityOsidReport
// (isolated_osids); a faction is spatially degraded when ≥ this fraction of its controlled OSIDs are isolated.
const SPATIAL_ISOLATION_FRACTION = 0.1; // spec C8 — ≥10% of controlled OSIDs BFS-isolated from supply = spatially degraded.

// Phase 3C Tier-1 constants — RATIFIED Phase-I defaults (spec §3).
// local_strain on [0,100]. With STRAIN_FRACTION=0.05, strain 40 = sustained high
// per-OSID pressure exposure over many turns. CONSISTENCY INVARIANT: these MUST equal
// Phase 3D STRAIN_THRESHOLD (C13==C9) so Tier-1-eligible OSIDs can produce non-zero severity.
const TIER1_AUTH_THRESHOLD = 40; // spec C9
const TIER1_COH_THRESHOLD = 40;  // spec C9
const TIER1_SPA_THRESHOLD = 40;  // spec C9
const TIER1_PERSIST_TURNS = 4;   // spec C10 — match C5 (Tier-1 not faster than Tier-0).
const STRAIN_FRACTION = 0.15;    // spec C11 (Phase IV-c Lever 1: 0.05→0.15) — ×3 accrual lifts max strain ~28.2→~84.6 so chronically-exposed OSIDs clear the real 55 severity floor (40 + SEVERITY_MIN 0.25 × range 60). A threshold drop alone is a no-op (SEVERITY_MIN scales with the range); magnitude is the honest lever.
const STRAIN_MAX = 100;          // spec C12 — clamp ceiling; identical to Phase 3D STRAIN_MAX.

export type CollapseDomain = 'authority' | 'cohesion' | 'spatial';

export interface Phase3CEligibilityResult {
    applied: boolean;
    reason_if_not_applied: string;
    stats: {
        // Tier-0 stats (faction-level)
        entities_evaluated: number;
        eligible_authority: number;
        eligible_cohesion: number;
        eligible_spatial: number;
        newly_eligible_authority: number;
        newly_eligible_cohesion: number;
        newly_eligible_spatial: number;
        suppressed_count: number;
        immune_count: number;
        // Tier-1 stats (entity-level)
        tier1?: {
            entities_evaluated: number;
            eligible_authority: number;
            eligible_cohesion: number;
            eligible_spatial: number;
            newly_eligible_authority: number;
            newly_eligible_cohesion: number;
            newly_eligible_spatial: number;
            suppressed_count: number;
            immune_count: number;
            top10_exposure_entities?: Array<{ entity_id: EntityId; exposure: number }>;
            max_exposure?: number;
            max_persistence_authority?: number;
            max_persistence_cohesion?: number;
            max_persistence_spatial?: number;
        };
    };
    eligibility?: Record<FactionId, CollapseEligibilityState>;
    tier1_eligibility?: Record<EntityId, Tier1EntityEligibilityState>;
}

/**
 * Get or initialize collapse eligibility state for a faction.
 */
function getOrInitEligibilityState(
    state: GameState,
    factionId: FactionId
): CollapseEligibilityState {
    if (!state.political.collapse_eligibility) {
        state.political.collapse_eligibility = {};
    }

    const existing = state.political.collapse_eligibility[factionId];
    if (existing) {
        return existing;
    }

    // Initialize new state
    const newState: CollapseEligibilityState = {
        eligible_authority: false,
        eligible_cohesion: false,
        eligible_spatial: false,
        persistence_authority: 0,
        persistence_cohesion: 0,
        persistence_spatial: 0,
        suppressed: false,
        immune: false,
        last_updated_turn: state.meta.turn
    };

    state.political.collapse_eligibility[factionId] = newState;
    return newState;
}

/**
 * Check if authority degradation exists (coherence gate).
 */
function checkAuthorityDegradation(state: GameState, factionId: FactionId): boolean {
    const faction = state.factions.find(f => f.id === factionId);
    if (!faction) return false;

    const authority = Number.isFinite(faction.profile?.authority) ? faction.profile.authority : 50;
    return authority < AUTHORITY_DEGRADATION_THRESHOLD;
}

/**
 * Check if cohesion degradation exists (coherence gate).
 * Simplified: check if formations have high fatigue or low readiness.
 */
function checkCohesionDegradation(state: GameState, factionId: FactionId): boolean {
    // Check formation fatigue/readiness
    const formations = Object.values(state.military.formations ?? {})
        .filter(f => f.faction === factionId && f.status === 'active');

    if (formations.length === 0) return false; // No formations = no cohesion to degrade

    // Check if any formation has high fatigue or low readiness
    for (const formation of formations) {
        const fatigue = formation.ops?.fatigue ?? 0;
        // Simplified: high fatigue indicates degradation
        if (fatigue > COHESION_DEGRADATION_THRESHOLD) {
            return true;
        }
    }

    return false;
}

/**
 * Check if spatial degradation exists (coherence gate) — REAL BFS implementation (spec C8).
 *
 * Replaces the old supply_sources.size/controlled.size ratio proxy (unsound — it never
 * measured reachability). Uses the already-computed BFS supply-reachability report
 * (`computeSupplyReachabilityOsid`, the same isolation BFS `isEnclaveContainable` reads):
 * a faction is spatially degraded when ≥ SPATIAL_ISOLATION_FRACTION (C8, 10%) of its
 * controlled OSIDs are listed as BFS-isolated from supply.
 *
 * §6 note (spec G3): for RBiH this will fire whenever the eastern enclaves are isolated
 * (i.e. ~always). That is historically defensible — a state losing its eastern pockets is
 * institutionally strained elsewhere — and is harmless because Phase 3D's G1 guard excludes
 * the enclave OSIDs themselves from the capacity_modifier write; only NON-enclave RBiH OSIDs
 * can receive modifiers.
 *
 * Determinism: reads only the deterministically-sorted report arrays; no RNG/clock.
 * If no report is available (e.g. operational data not loaded), returns false — conservative
 * (no spatial eligibility), never throws.
 */
function checkSpatialDegradation(
    state: GameState,
    factionId: FactionId,
    supplyReach: SupplyReachabilityOsidReport | undefined | null
): boolean {
    if (!supplyReach?.factions) return false;

    const facEntry = supplyReach.factions.find(f => f.faction_id === factionId);
    if (!facEntry) return false;

    const controlledCount = facEntry.controlled.length;
    if (controlledCount === 0) return false;

    const isolatedCount = facEntry.isolated_osids.length;
    return isolatedCount >= controlledCount * SPATIAL_ISOLATION_FRACTION;
}

/**
 * Check if faction is suppressed (temporary suppression rules).
 *
 * RATIFIED Phase-I decision (spec §1, §3): NO Tier-0 suppression for 1.0. The
 * state-machine hooks remain (suppression would pause persistence counters without
 * erasing exhaustion) but the rule set is intentionally empty. Returns false —
 * deterministic, no brake. A later phase may add minimal rules (e.g. suppression
 * during an active ceasefire) without touching the call sites.
 */
function checkSuppression(state: GameState, factionId: FactionId): boolean {
    return false;
}

/**
 * Check if faction is immune (immunity conditions).
 *
 * RATIFIED Phase-I decision (spec §1, §3): NO Tier-0 immunity for 1.0. Hook retained
 * (immunity would block eligibility even when conditions are met) but empty.
 */
function checkImmunity(state: GameState, factionId: FactionId): boolean {
    return false;
}

/**
 * Get or initialize Tier-1 eligibility state for an entity.
 */
function getOrInitTier1EligibilityState(
    state: GameState,
    entityId: EntityId
): Tier1EntityEligibilityState {
    if (!state.political.collapse_eligibility_tier1) {
        state.political.collapse_eligibility_tier1 = {};
    }

    const existing = state.political.collapse_eligibility_tier1[entityId];
    if (existing) {
        return existing;
    }

    // Initialize new state
    const newState: Tier1EntityEligibilityState = {
        domains: {
            authority: false,
            cohesion: false,
            spatial: false
        },
        persistence: {
            authority: 0,
            cohesion: 0,
            spatial: 0
        },
        suppressed: false,
        immune: false
    };

    state.political.collapse_eligibility_tier1[entityId] = newState;
    return newState;
}

/**
 * Get or initialize local strain state.
 */
function getOrInitLocalStrain(state: GameState): void {
    if (!state.political.local_strain) {
        state.political.local_strain = { by_entity: {} };
    }
}

/**
 * Update local strain for an entity based on pressure exposure.
 * Monotonic accumulator: strain = clamp(strain + exposure * STRAIN_FRACTION, 0, STRAIN_MAX)
 */
function updateLocalStrain(state: GameState, entityId: EntityId, exposure: number): number {
    getOrInitLocalStrain(state);

    const localStrain = state.political.local_strain;
    if (!localStrain) {
        throw new Error('Phase 3C local strain state failed to initialize');
    }
    const current = localStrain.by_entity[entityId] ?? 0;
    const increment = exposure * STRAIN_FRACTION;
    const newStrain = Math.min(Math.max(0, current + increment), STRAIN_MAX);

    localStrain.by_entity[entityId] = newStrain;
    return newStrain;
}

/**
 * Check if entity has local degradation (coherence gate for Tier-1).
 * Simplified: check if entity is in a degraded faction context.
 */
function checkTier1Degradation(
    state: GameState,
    entityId: EntityId,
    domain: CollapseDomain,
    factionId: FactionId,
    supplyReach: SupplyReachabilityOsidReport | undefined | null
): boolean {
    // For Tier-1, we use the faction-level degradation check as a proxy
    // This is conservative and avoids inventing new mechanics
    if (domain === 'authority') {
        return checkAuthorityDegradation(state, factionId);
    } else if (domain === 'cohesion') {
        return checkCohesionDegradation(state, factionId);
    } else if (domain === 'spatial') {
        return checkSpatialDegradation(state, factionId, supplyReach);
    }
    return false;
}

/**
 * Check if entity is suppressed (Tier-1).
 * RATIFIED Phase-I decision (spec §1): NO Tier-1 suppression for 1.0. Hook retained, empty.
 */
function checkTier1Suppression(state: GameState, entityId: EntityId): boolean {
    return false;
}

/**
 * Check if entity is immune (Tier-1).
 * RATIFIED Phase-I decision (spec §1): NO Tier-1 immunity for 1.0. Hook retained, empty.
 */
function checkTier1Immunity(state: GameState, entityId: EntityId): boolean {
    return false;
}

/**
 * Apply Phase 3C exhaustion → collapse eligibility gating.
 * 
 * Tier-0 (faction-level):
 * - Check exhaustion thresholds per domain
 * - Increment persistence counters if above threshold
 * - Reset persistence counters if below threshold
 * - Check coherence gates (degradation in supporting systems)
 * - Check suppression/immunity rules
 * - Set eligibility flags only if all conditions met
 * 
 * Tier-1 (entity-level):
 * - Compute pressure exposure per entity (settlement SID)
 * - Convert exposure to local strain (monotonic accumulator)
 * - Apply domain thresholds + coherence gates per entity
 * - Tier-0 gating: entity eligibility requires faction eligibility in that domain
 * - Update persistence counters per entity per domain
 * 
 * @param state Game state (mutated: collapse_eligibility and collapse_eligibility_tier1 state updated)
 * @param derivedFrontEdges Optional front edges for pressure exposure computation
 * @returns Result object with applied flag, reason if not applied, and stats
 */
export function applyPhase3CExhaustionCollapseGating(
    state: GameState,
    derivedFrontEdges?: FrontEdge[],
    supplyReach?: SupplyReachabilityOsidReport | null
): Phase3CEligibilityResult {
    // Feature gate check
    if (!getEnablePhase3C()) {
        return {
            applied: false,
            reason_if_not_applied: 'feature_flag_disabled',
            stats: {
                entities_evaluated: 0,
                eligible_authority: 0,
                eligible_cohesion: 0,
                eligible_spatial: 0,
                newly_eligible_authority: 0,
                newly_eligible_cohesion: 0,
                newly_eligible_spatial: 0,
                suppressed_count: 0,
                immune_count: 0
            }
        };
    }

    // SAFETY GUARD: defense-in-depth. PHASE3C_CONSTANTS_VERIFIED is now true (the
    // ratified Phase-I defaults replaced the placeholders + the spatial gate is real).
    // The guard is retained so that if a future edit ever re-introduces unverified
    // placeholders by flipping the flag back to false, Phase 3C fails fast rather than
    // silently simulating with bad constants. Deterministic; no RNG/clock.
    if (!PHASE3C_CONSTANTS_VERIFIED) {
        throw new Error(
            'Phase 3C FREEZE VIOLATION: Cannot execute Phase 3C with unverified constants. ' +
            'Set PHASE3C_CONSTANTS_VERIFIED = true only after the constants are ratified ' +
            '(see docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §3).'
        );
    }

    // Phase 3B prerequisite: if Phase 3B is disabled, Phase 3C should not apply
    if (!getEnablePhase3B()) {
        return {
            applied: false,
            reason_if_not_applied: 'phase3b_exhaustion_disabled',
            stats: {
                entities_evaluated: 0,
                eligible_authority: 0,
                eligible_cohesion: 0,
                eligible_spatial: 0,
                newly_eligible_authority: 0,
                newly_eligible_cohesion: 0,
                newly_eligible_spatial: 0,
                suppressed_count: 0,
                immune_count: 0
            }
        };
    }

    const factions = [...(state.factions ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    if (factions.length === 0) {
        return {
            applied: false,
            reason_if_not_applied: 'no_factions',
            stats: {
                entities_evaluated: 0,
                eligible_authority: 0,
                eligible_cohesion: 0,
                eligible_spatial: 0,
                newly_eligible_authority: 0,
                newly_eligible_cohesion: 0,
                newly_eligible_spatial: 0,
                suppressed_count: 0,
                immune_count: 0
            }
        };
    }

    const currentTurn = state.meta.turn;
    const eligibility: Record<FactionId, CollapseEligibilityState> = {};

    let eligibleAuthority = 0;
    let eligibleCohesion = 0;
    let eligibleSpatial = 0;
    let newlyEligibleAuthority = 0;
    let newlyEligibleCohesion = 0;
    let newlyEligibleSpatial = 0;
    let suppressedCount = 0;
    let immuneCount = 0;

    for (const faction of factions) {
        const factionId = faction.id;
        const eligibilityState = getOrInitEligibilityState(state, factionId);

        // Get current exhaustion.
        //
        // PHASE IV-a UNIT RECONCILIATION (2026-06-10) — the load-bearing fix.
        // The Tier-0 thresholds (EXHAUSTION_THRESHOLD_AUTHORITY/COHESION = 70, SPATIAL = 65,
        // E_collapse = 100) were authored on the engine's ORIGINAL 0..100 percentage
        // exhaustion scale (build spec §3 C2–C4: "70 keys collapse to the late-war exhaustion
        // plateau"; E_collapse=100 = "fully collapsed"). But `faction.profile.exhaustion` is the
        // legacy NORMALIZED 0..1 field — it plateaus at ~0.265 across a full 188w campaign, so
        // comparing it against 70 (a ~260× unit/scale mismatch) made Tier-0 unreachable and the
        // whole pipeline INERT (Phase III: 649→649 byte-identical).
        //
        // The field that actually carries the open-ended late-war exhaustion the constants
        // assume is `state.political.war_exhaustion` — which src/sim/combat/exhaustion.ts:113–124
        // documents was rescaled 100× (the original 0..100 percentage scale → 0..10000, cap
        // 10000) with EVERY downstream gate (WASH_COMBINED_EXHAUSTION, CEASEFIRE_*, combat tempo)
        // rescaled in lockstep. So `war_exhaustion / 100` recovers the original 0..100 scale —
        // exactly the scale these constants live on. It climbs through early-war and crosses 65
        // in early-mid 1993 (~w38–55), never in 1992, and saturates ~100 by ~w80, giving Tier-0
        // the intended "late-war exhaustion plateau" semantics. (Faction-level Tier-0 is a coarse
        // war-weariness gate; spatial/front discrimination is Tier-1 local_strain + coherence
        // gates — see checkSpatialDegradation.)
        //
        // HELD FOR OWNER (Phase IV re-floor): this is the deliberate first-fire reconciliation.
        const warExhaustionRaw = Number.isFinite(state.political?.war_exhaustion?.[factionId])
            ? (state.political.war_exhaustion as Record<FactionId, number>)[factionId]
            : 0;
        const exhaustion = warExhaustionRaw / 100; // 0..10000 (cap) → 0..100 percentage scale

        // Check suppression/immunity first
        const suppressed = checkSuppression(state, factionId);
        const immune = checkImmunity(state, factionId);

        if (suppressed) suppressedCount++;
        if (immune) immuneCount++;

        // Update suppression/immunity flags
        eligibilityState.suppressed = suppressed;
        eligibilityState.immune = immune;

        // If immune, skip eligibility evaluation (but still update state)
        if (immune) {
            eligibility[factionId] = eligibilityState;
            continue;
        }

        // Evaluate each domain independently
        // Authority domain
        {
            const wasEligible = eligibilityState.eligible_authority;
            if (exhaustion > EXHAUSTION_THRESHOLD_AUTHORITY) {
                if (!suppressed) {
                    eligibilityState.persistence_authority = eligibilityState.persistence_authority + 1;
                }
                if (eligibilityState.persistence_authority >= PERSISTENCE_REQUIRED_TURNS) {
                    const degradationExists = checkAuthorityDegradation(state, factionId);
                    if (degradationExists) {
                        eligibilityState.eligible_authority = true;
                        if (!wasEligible) newlyEligibleAuthority++;
                    } else {
                        eligibilityState.eligible_authority = false;
                    }
                } else {
                    eligibilityState.eligible_authority = false;
                }
            } else {
                eligibilityState.persistence_authority = 0;
                eligibilityState.eligible_authority = false;
            }
        }

        // Cohesion domain
        {
            const wasEligible = eligibilityState.eligible_cohesion;
            if (exhaustion > EXHAUSTION_THRESHOLD_COHESION) {
                if (!suppressed) {
                    eligibilityState.persistence_cohesion = eligibilityState.persistence_cohesion + 1;
                }
                if (eligibilityState.persistence_cohesion >= PERSISTENCE_REQUIRED_TURNS) {
                    const degradationExists = checkCohesionDegradation(state, factionId);
                    if (degradationExists) {
                        eligibilityState.eligible_cohesion = true;
                        if (!wasEligible) newlyEligibleCohesion++;
                    } else {
                        eligibilityState.eligible_cohesion = false;
                    }
                } else {
                    eligibilityState.eligible_cohesion = false;
                }
            } else {
                eligibilityState.persistence_cohesion = 0;
                eligibilityState.eligible_cohesion = false;
            }
        }

        // Spatial domain
        {
            const wasEligible = eligibilityState.eligible_spatial;
            if (exhaustion > EXHAUSTION_THRESHOLD_SPATIAL) {
                if (!suppressed) {
                    eligibilityState.persistence_spatial = eligibilityState.persistence_spatial + 1;
                }
                if (eligibilityState.persistence_spatial >= PERSISTENCE_REQUIRED_TURNS) {
                    const degradationExists = checkSpatialDegradation(state, factionId, supplyReach);
                    if (degradationExists) {
                        eligibilityState.eligible_spatial = true;
                        if (!wasEligible) newlyEligibleSpatial++;
                    } else {
                        eligibilityState.eligible_spatial = false;
                    }
                } else {
                    eligibilityState.eligible_spatial = false;
                }
            } else {
                eligibilityState.persistence_spatial = 0;
                eligibilityState.eligible_spatial = false;
            }
        }

        // Update counts
        if (eligibilityState.eligible_authority) eligibleAuthority++;
        if (eligibilityState.eligible_cohesion) eligibleCohesion++;
        if (eligibilityState.eligible_spatial) eligibleSpatial++;

        eligibilityState.last_updated_turn = currentTurn;
        eligibility[factionId] = eligibilityState;
    }

    // Tier-1: Per-entity localized eligibility
    const tier1Eligibility: Record<EntityId, Tier1EntityEligibilityState> = {};
    let tier1EntitiesEvaluated = 0;
    let tier1EligibleAuthority = 0;
    let tier1EligibleCohesion = 0;
    let tier1EligibleSpatial = 0;
    let tier1NewlyEligibleAuthority = 0;
    let tier1NewlyEligibleCohesion = 0;
    let tier1NewlyEligibleSpatial = 0;
    let tier1SuppressedCount = 0;
    let tier1ImmuneCount = 0;
    let maxExposure = 0;
    let maxPersistenceAuthority = 0;
    let maxPersistenceCohesion = 0;
    let maxPersistenceSpatial = 0;
    const exposureEntities: Array<{ entity_id: EntityId; exposure: number }> = [];

    // Compute pressure exposure per entity.
    // COLLAPSE PHASE IV-b D2 (scope §A.3 Option 2 + M1): in OSID-native scenarios the
    // settlement-level front_pressure is structurally empty (edge-universe mismatch),
    // so prefer the OSID exposure adapter when the live OSID front topology is
    // populated; else keep the settlement variant (harness/settlement-scenario path
    // byte-identical). Reached only via the existing collapse flags (3C gating runs
    // only when getEnablePhase3C() — defaults OFF), so the default path is inert.
    const exposureByEntity = (state.military.war_front_edges_osid?.length ?? 0) > 0
        ? computePressureExposureByEntityOsid(state)
        : computePressureExposureByEntity(state, derivedFrontEdges);

    // Build map of entity -> faction (for Tier-0 gating).
    //
    // COLLAPSE PHASE IV-d (sits on IV-c's STRAIN_FRACTION 0.15): in OSID-native 188w
    // runs `faction.areasOfResponsibility` is EMPTY at runtime — it is only populated by
    // applyControlFlipProposals when a front-breach FLIP is applied, whereas the historical
    // path establishes control via init/census + event control_changes. Empirically the
    // IV-c ON 188w final_save shows all 3 factions AoR len=0 while political_controllers
    // holds all 712 OSIDs. With the empty AoR map every entity hit `if(!factionId)
    // continue`, so Tier-1 never evaluated → Phase 3D inert despite max strain ~84.6.
    //
    // Reroute: derive each OSID-entity's faction from the live political_controllers map
    // (the canonical 712-OSID control surface, Engine Invariants §9.1), mirroring D2's
    // computePressureExposureByEntityOsid (which keys off political_controllers /
    // war_front_edges_osid). The local_strain.by_entity keys ARE OSIDs (D2 wire-in), so
    // map osid → political_controllers[osid] → factionId. AoR is kept as a fallback for
    // any entity not present in political_controllers (settlement-scenario / harness path).
    //
    // §6 NOTE: enclave OSIDs intentionally reach Tier-1 here (ratified #368 guard-by-
    // exclusion model lives at the Phase 3D WRITE / G1, not at this map). Behind the
    // existing collapse flags (3C runs only when getEnablePhase3C() — default OFF), so the
    // default / settlement path is unchanged. Deterministic: sorted OSID iteration via
    // strictCompare, no RNG/clock.
    const entityToFaction = new Map<EntityId, FactionId>();
    const politicalControllers = state.political?.political_controllers;
    if (politicalControllers && typeof politicalControllers === 'object') {
        const controlledOsids = Object.keys(politicalControllers).sort(strictCompare);
        for (const osid of controlledOsids) {
            const factionId = politicalControllers[osid];
            if (factionId) {
                entityToFaction.set(osid, factionId);
            }
        }
    }
    // Fallback: AoR-keyed entities (settlement-scenario / harness path, or OSIDs absent
    // from political_controllers). Does not overwrite a live political-control mapping.
    for (const faction of factions) {
        for (const sid of faction.areasOfResponsibility ?? []) {
            if (!entityToFaction.has(sid)) {
                entityToFaction.set(sid, faction.id);
            }
        }
    }

    // Evaluate Tier-1 eligibility per entity
    const entityIds = [...exposureByEntity.keys()].sort((a, b) => a.localeCompare(b));
    for (const entityId of entityIds) {
        const exposure = exposureByEntity.get(entityId) ?? 0;
        if (exposure > maxExposure) maxExposure = exposure;

        // Update local strain (monotonic accumulator)
        const strain = updateLocalStrain(state, entityId, exposure);

        // Get faction for this entity (for Tier-0 gating)
        const factionId = entityToFaction.get(entityId);
        if (!factionId) continue; // Skip entities not controlled by any faction

        // Get Tier-0 eligibility for this faction
        const tier0State = eligibility[factionId];
        if (!tier0State) continue; // Skip if Tier-0 not evaluated

        tier1EntitiesEvaluated++;

        // Get or initialize Tier-1 state
        const tier1State = getOrInitTier1EligibilityState(state, entityId);

        // Check suppression/immunity
        const suppressed = checkTier1Suppression(state, entityId);
        const immune = checkTier1Immunity(state, entityId);

        if (suppressed) tier1SuppressedCount++;
        if (immune) tier1ImmuneCount++;

        tier1State.suppressed = suppressed;
        tier1State.immune = immune;

        if (immune) {
            tier1Eligibility[entityId] = tier1State;
            continue;
        }

        // Evaluate each domain independently
        // Authority domain
        {
            const wasEligible = tier1State.domains.authority;
            const threshold = TIER1_AUTH_THRESHOLD;

            // Tier-0 precondition: faction must be eligible in this domain
            const tier0Allows = tier0State.eligible_authority;

            if (strain > threshold && tier0Allows) {
                if (!suppressed) {
                    tier1State.persistence.authority = tier1State.persistence.authority + 1;
                }
                if (tier1State.persistence.authority > maxPersistenceAuthority) {
                    maxPersistenceAuthority = tier1State.persistence.authority;
                }
                if (tier1State.persistence.authority >= TIER1_PERSIST_TURNS) {
                    const degradationExists = checkTier1Degradation(state, entityId, 'authority', factionId, supplyReach);
                    if (degradationExists) {
                        tier1State.domains.authority = true;
                        if (!wasEligible) tier1NewlyEligibleAuthority++;
                    } else {
                        tier1State.domains.authority = false;
                    }
                } else {
                    tier1State.domains.authority = false;
                }
            } else {
                tier1State.persistence.authority = 0;
                tier1State.domains.authority = false;
            }
        }

        // Cohesion domain
        {
            const wasEligible = tier1State.domains.cohesion;
            const threshold = TIER1_COH_THRESHOLD;

            const tier0Allows = tier0State.eligible_cohesion;

            if (strain > threshold && tier0Allows) {
                if (!suppressed) {
                    tier1State.persistence.cohesion = tier1State.persistence.cohesion + 1;
                }
                if (tier1State.persistence.cohesion > maxPersistenceCohesion) {
                    maxPersistenceCohesion = tier1State.persistence.cohesion;
                }
                if (tier1State.persistence.cohesion >= TIER1_PERSIST_TURNS) {
                    const degradationExists = checkTier1Degradation(state, entityId, 'cohesion', factionId, supplyReach);
                    if (degradationExists) {
                        tier1State.domains.cohesion = true;
                        if (!wasEligible) tier1NewlyEligibleCohesion++;
                    } else {
                        tier1State.domains.cohesion = false;
                    }
                } else {
                    tier1State.domains.cohesion = false;
                }
            } else {
                tier1State.persistence.cohesion = 0;
                tier1State.domains.cohesion = false;
            }
        }

        // Spatial domain
        {
            const wasEligible = tier1State.domains.spatial;
            const threshold = TIER1_SPA_THRESHOLD;

            const tier0Allows = tier0State.eligible_spatial;

            if (strain > threshold && tier0Allows) {
                if (!suppressed) {
                    tier1State.persistence.spatial = tier1State.persistence.spatial + 1;
                }
                if (tier1State.persistence.spatial > maxPersistenceSpatial) {
                    maxPersistenceSpatial = tier1State.persistence.spatial;
                }
                if (tier1State.persistence.spatial >= TIER1_PERSIST_TURNS) {
                    const degradationExists = checkTier1Degradation(state, entityId, 'spatial', factionId, supplyReach);
                    if (degradationExists) {
                        tier1State.domains.spatial = true;
                        if (!wasEligible) tier1NewlyEligibleSpatial++;
                    } else {
                        tier1State.domains.spatial = false;
                    }
                } else {
                    tier1State.domains.spatial = false;
                }
            } else {
                tier1State.persistence.spatial = 0;
                tier1State.domains.spatial = false;
            }
        }

        // Update counts
        if (tier1State.domains.authority) tier1EligibleAuthority++;
        if (tier1State.domains.cohesion) tier1EligibleCohesion++;
        if (tier1State.domains.spatial) tier1EligibleSpatial++;

        // Store exposure for top10 list
        if (exposure > 0) {
            exposureEntities.push({ entity_id: entityId, exposure });
        }

        tier1Eligibility[entityId] = tier1State;
    }

    // Sort exposure entities by exposure desc, then entity_id asc (deterministic)
    exposureEntities.sort((a, b) => {
        if (b.exposure !== a.exposure) return b.exposure - a.exposure;
        return a.entity_id.localeCompare(b.entity_id);
    });
    const top10Exposure = exposureEntities.slice(0, 10);

    return {
        applied: true,
        reason_if_not_applied: '',
        stats: {
            // Tier-0 stats
            entities_evaluated: factions.length,
            eligible_authority: eligibleAuthority,
            eligible_cohesion: eligibleCohesion,
            eligible_spatial: eligibleSpatial,
            newly_eligible_authority: newlyEligibleAuthority,
            newly_eligible_cohesion: newlyEligibleCohesion,
            newly_eligible_spatial: newlyEligibleSpatial,
            suppressed_count: suppressedCount,
            immune_count: immuneCount,
            // Tier-1 stats
            tier1: {
                entities_evaluated: tier1EntitiesEvaluated,
                eligible_authority: tier1EligibleAuthority,
                eligible_cohesion: tier1EligibleCohesion,
                eligible_spatial: tier1EligibleSpatial,
                newly_eligible_authority: tier1NewlyEligibleAuthority,
                newly_eligible_cohesion: tier1NewlyEligibleCohesion,
                newly_eligible_spatial: tier1NewlyEligibleSpatial,
                suppressed_count: tier1SuppressedCount,
                immune_count: tier1ImmuneCount,
                top10_exposure_entities: top10Exposure,
                max_exposure: maxExposure,
                max_persistence_authority: maxPersistenceAuthority,
                max_persistence_cohesion: maxPersistenceCohesion,
                max_persistence_spatial: maxPersistenceSpatial
            }
        },
        eligibility,
        tier1_eligibility: tier1Eligibility
    };
}

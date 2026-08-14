/**
 * Phase 3D: Collapse Resolution
 * 
 * Applies irreversible degradation effects (negative-sum) based on Phase 3C Tier-1 eligibility.
 * Deterministic, localized outcomes driven by Tier-1 eligibility + local_strain. Persistence
 * is consumed UPSTREAM in Phase 3C (TIER1_PERSIST_TURNS, spec C10) as the eligibility gate;
 * 3D reads only the eligibility verdict it produces, never the counter itself.
 * 
 * Phase 3D does NOT:
 * - Create map geometry or rewire contact graph
 * - Create "victory states" or hard-code historical outcomes
 * - Change Phase 3A pressure conservation or Phase 3B exhaustion accrual
 * - Use randomness (all thresholds and ordering are deterministic)
 * 
 * Feature-gated: ENABLE_PHASE3D_COLLAPSE_RESOLUTION (default: false).
 */

import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { CollapseDomain } from '../pressure/phase3c_exhaustion_collapse_gating.js';
import { getEnablePhase3C } from '../pressure/phase3c_exhaustion_collapse_gating.js';
import type { EntityId } from '../pressure/pressure_exposure.js';
import { getEnclaveDefForOsid } from '../combat/enclave_resilience.js';


// Feature flag (OFF by default)
let _enablePhase3DOverride: boolean | null = null;

export function getEnablePhase3D(): boolean {
    return _enablePhase3DOverride !== null ? _enablePhase3DOverride : false;
}

export function setEnablePhase3D(enable: boolean): void {
    _enablePhase3DOverride = enable;
}

export function resetEnablePhase3D(): void {
    _enablePhase3DOverride = null;
}

// Legacy const export for backward compatibility (uses getter)
export const ENABLE_PHASE3D_COLLAPSE_RESOLUTION = false; // Default, but use getEnablePhase3D() for runtime value

// Phase 3D severity computation constants.
// RATIFIED Phase-I starting defaults — owner-ratified per
// docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §3.
// NOT canon citations: Engine Invariants §8 / Systems Manual §7.1–7.3 are prose-only
// (the frozen Appendix A/B/C numeric tables were archived in the v0.4→v0.9 fold), so
// each value is an owner/design decision with a proposed default tuned in Phase III.
const STRAIN_THRESHOLD = 40; // spec C13 — MUST equal Phase 3C TIER1_*_THRESHOLD (C9). Consistency invariant C13==C9.
const STRAIN_MAX = 100;      // spec C12 — clamp ceiling; identical to Phase 3C STRAIN_MAX.
const SEVERITY_MIN = 0.25;   // spec C14 — floor below which no damage applies (enforces delayed/contingent collapse).

// Phase 3D impact constants — RATIFIED Phase-I defaults (spec §3).
// These control how much collapse damage degrades capacity multipliers.
// Chronic-not-catastrophic (Systems Manual §7.2): at full damage authority/cohesion
// capacity → 0.7 (−30%), supply → 0.6 (−40%, the most historically load-bearing —
// siege starvation). All ∈ (0,1) so multipliers stay in [0,1] even at damage=1.
const AUTHORITY_IMPACT = 0.3; // spec C15 — authority_mult = 1 - AUTHORITY_IMPACT * damage.authority
const COHESION_IMPACT = 0.3;  // spec C16 — cohesion_mult = 1 - COHESION_IMPACT * damage.cohesion
const SPATIAL_IMPACT = 0.4;   // spec C17 — supply_mult = 1 - SPATIAL_IMPACT * damage.spatial
// pressure_cap_mult uses conservative combination of all three domains

/**
 * §6 GUARD G1 — protected-enclave predicate (RATIFIED — owner + /historian + Pyrrhic
 * §6 panel, packet #368; G3 signed off, zero blockers).
 *
 * Spec: docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §4.3.
 *
 * Identifies EVERY enclave OSID from `getEnclaveDefForOsid` (`ENCLAVE_DEFINITIONS` in
 * enclave_resilience.ts) — 6 RBiH (Srebrenica, Žepa, Goražde, Bihać pocket, Sarajevo,
 * Teočak) + 3 HRHB (kiseljak, lasva_valley, zepce); no RS enclaves exist. These are the
 * OSIDs MOST likely to register Tier-1 spatial/authority strain (isolated + supply-fragile),
 * and the genocide-rupture floor (`srebrenica_genocide_1995`, turn ≥ 160) is a §6 invariant.
 *
 * The predicate is enforced at THREE sites: the PRIMARY chokepoint in
 * getOrInitCollapseDamage (keeps the OSID out of collapse_damage.by_entity → blocks the
 * recompute path AND the loss_of_control will_not_recover marking), a loop-skip before
 * updateCapacityModifiers (keeps the OSID out of capacity_modifiers), and a
 * defense-in-depth check inside recomputePhase3DCapacityModifiersFromDamage. Together
 * the enclave is provably absent from BOTH maps on the PRODUCTION path → no OWN-OSID
 * collapse effect on any §6 OSID. Two documented gaps sit outside that proof, neither
 * reaching a combat path: the CLI audit harness makes one unguarded direct write that
 * bypasses the chokepoint, and G1 does not neutralize a protected OSID's EDGES. Both
 * are detailed on getOrInitCollapseDamage below.
 *
 * Phase 3D never flips `political_controllers`; the only §6 risk is INDIRECT
 * ACCELERATION (a degraded supply_mult softening a defender so a scripted fall lands
 * before turn 160 → rupture fails to record). With G1, fall timing is driven exclusively
 * by event-owned enclave receipts. Krivaja-95 / Stupčanica-95 remain chronology/AAR
 * context gated on those receipts; they are not the fall-delivery mechanism.
 *
 * Broad PREFIX exclusion of Bihać + Sarajevo is the ratified first-build choice (panel
 * O-4 = confirm-broad). Velika Kladuša (`op:velika_kladusa:*`) is the top "relax-later
 * with evidence" candidate (real Abdić / AP Zapadna Bosna territorial movement) — see
 * build spec.
 */
function isPhase3DEnclaveGuarded(osid: EntityId): boolean {
    // ALL enclaves (panel O-1 = include-HRHB): 6 RBiH (Srebrenica/Žepa/Goražde/Bihać/
    // Sarajevo/Teočak) + 3 HRHB (kiseljak/lasva_valley/zepce). No RS enclaves exist.
    // HRHB pockets are the same besieged-holdout mechanical class; an RBiH-only exemption
    // would seed a faction-asymmetric collapse distortion into the later re-floor.
    // Broad-now / narrow-later is the safe direction.
    return getEnclaveDefForOsid(osid) !== null;
}

export interface Phase3DCollapseResolutionResult {
    applied: boolean;
    reason_if_not_applied: string;
    stats: {
        entities_evaluated: number;
        collapses_applied_count: number;
        collapses_max_severity: number;
        /** §6 GUARD G1: count of enclave OSIDs whose capacity_modifier write was withheld. */
        enclave_guarded_count: number;
        damage_sum_by_domain: {
            authority: number;
            cohesion: number;
            spatial: number;
        };
    };
    applied_events?: Array<{
        sid: string;
        domain: CollapseDomain;
        severity: number;
        /** §6 GUARD G1: true when this OSID is a guarded RBiH enclave (capacity_modifier NOT written). */
        enclave_guarded: boolean;
        effects: {
            damage_before: number;
            damage_after: number;
            authority_mult: number;
            cohesion_mult: number;
            supply_mult: number;
            pressure_cap_mult: number;
        };
    }>;
}

/**
 * Get or initialize collapse damage state for an entity.
 *
 * §6 GUARD G1 (RATIFIED — owner + /historian + Pyrrhic §6 panel, packet #368).
 * Spec: docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §4.3.
 *
 * This is the SOLE production write site for `collapse_damage.by_entity` (panel
 * grep-verified). Guarding it here is the single chokepoint: for any protected enclave
 * OSID we return a DETACHED zero-damage object WITHOUT writing it to state, so the OSID
 * is provably ABSENT from collapse_damage.by_entity. That absence transitively guarantees:
 *   • the capacity_modifier derivation never runs for it (updateCapacityModifiers is
 *     only called on the returned object's owner in the resolution loop, which skips it),
 *   • recomputePhase3DCapacityModifiersFromDamage() iterates collapse_damage.by_entity →
 *     never sees the OSID, and
 *   • loss_of_control_trends.ts:133 `will_not_recover = !!collapse_damage.by_entity[sid]`
 *     stays false (presence ALONE, even at damage 0, would trip it — hence the guard
 *     must prevent the ENTRY, not just zero the values).
 *
 * HARNESS BYPASS (correction, 2026-08-13 — the previous text claimed the opposite):
 * guarding this chokepoint does NOT make the CLI harness seed path honor the guard.
 * `phase3abc_audit_harness.ts:1193` (seedPhase3DDamage) assigns
 * `state.political.collapse_damage.by_entity[sid0] = {...}` DIRECTLY and never calls
 * this function, so the guard cannot see it. What that path does still get is the
 * defense-in-depth check inside recomputePhase3DCapacityModifiersFromDamage, which it
 * calls on the next line — so no enclave capacity_modifier can be derived. The
 * UNGUARDED residue is the collapse_damage ENTRY itself: presence alone sets
 * `will_not_recover` (loss_of_control_trends.ts:133), so if `sid0` ever resolved to an
 * enclave OSID the harness would mark a §6 OSID unrecoverable. It seeds exactly one SID
 * — `nodes_sorted[0]`, the lexicographically-first node of its synthetic BFS graph —
 * which is why this is latent rather than live. This is harness-only: no production
 * path writes by_entity except through this function.
 *
 * ── THE §6 CLAIM ────────────────────────────────────────────────────────────
 * Exactly ONE collapse consumer reaches combat, and it is own-OSID-only:
 *
 *     src/sim/combat/attack_resolution_osid.ts:867
 *     defenderPower *= getCollapseDefenderMultiplier(state, targetOsid)
 *
 * It reads `capacity_modifiers.by_sid[targetOsid].supply_mult` with a floor of
 * COLLAPSE_DEFENDER_FLOOR = 0.6 and performs NO edge read
 * (src/sim/collapse/capacity_modifiers.ts:79-86). G1 keeps enclaves out of `by_sid`, so it
 * returns 1.0 on every §6 OSID. Landed by Phase IV-e, PR #398 / 03eb82c4e.
 *
 * That single sentence — "one combat consumer, own-OSID-only, enclave-safe by G1" — is the
 * load-bearing §6 property, and it is now ENFORCED, not asserted:
 *
 *     tests/collapse_consumer_manifest.test.ts
 *
 * THE CONSUMER INVENTORY LIVES THERE, NOT HERE. That test freezes the complete set of
 * modules importing `capacity_modifiers` (with each one's classification) and asserts that
 * nothing under `src/sim/combat/` touches `getEdgeCapacityMultiplier`. Read it for the
 * current consumer list; add a consumer and it fails until you classify it.
 *
 * DO NOT RESTATE THAT INVENTORY IN THIS COMMENT. It used to live here and was WRONG THREE
 * TIMES — each revision written carefully by a competent reviewer and each still wrong:
 * (1) "all consumers report-only/scaffolding" (the combat consumer had already landed);
 * (2) corrected to name it, but still understated the others; (3) "both edge consumers are
 * real state effects, NOT reports" (true of front_pressure, false of formation_fatigue,
 * which terminates in reporters). The failure was structural — prose describing five files
 * across three directories cannot stay true as they move — so the fix was to delete the
 * prose, not to write a fourth careful version. The manifest test's own docblock records
 * its honest limits; it is an import scan, so do not over-trust it either.
 *
 * EDGE-MULTIPLIER RESIDUAL (red-team #2 — still open, Phase-III review item):
 * getEdgeCapacityMultiplier() returns min(mult_a, mult_b), so an edge between a protected
 * OSID and a COLLAPSED non-protected neighbor carries the collapsed value. G1 is
 * own-OSID-only and does NOT neutralize that edge, so a §6 OSID's EDGES can still be
 * degraded through whichever edge consumers the manifest currently lists. What bounds this
 * is scope, not inertness: no EDGE consumer feeds attack-launch or defender-strength, so
 * the residual cannot accelerate an enclave's fall — the §6 risk G1 exists to prevent. Do
 * not restate this residual as "inert"; it is live-but-out-of-scope, and it becomes a §6
 * blocker the moment an edge multiplier reaches a combat path. That moment is exactly what
 * the manifest test's "no edge multiplier reaches combat" case is there to catch.
 */
function getOrInitCollapseDamage(
    state: GameState,
    entityId: EntityId
): { authority: number; cohesion: number; spatial: number } {
    // §6 GUARD G1: protected enclave OSID → detached zero object, never written to state.
    if (isPhase3DEnclaveGuarded(entityId)) {
        return { authority: 0, cohesion: 0, spatial: 0 };
    }

    if (!state.political.collapse_damage) {
        state.political.collapse_damage = { by_entity: {} };
    }

    const existing = state.political.collapse_damage.by_entity[entityId];
    if (existing) {
        return existing;
    }

    // Initialize new damage track (all zeros)
    const newDamage = {
        authority: 0,
        cohesion: 0,
        spatial: 0
    };

    state.political.collapse_damage.by_entity[entityId] = newDamage;
    return newDamage;
}

/**
 * Get or initialize capacity modifiers state for an entity.
 */
function getOrInitCapacityModifiers(
    state: GameState,
    entityId: EntityId
): { authority_mult: number; cohesion_mult: number; supply_mult: number; pressure_cap_mult: number } {
    if (!state.political.capacity_modifiers) {
        state.political.capacity_modifiers = { by_sid: {} };
    }

    const existing = state.political.capacity_modifiers.by_sid[entityId];
    if (existing) {
        return existing;
    }

    // Initialize new modifiers (all 1.0 = no reduction)
    const newModifiers = {
        authority_mult: 1.0,
        cohesion_mult: 1.0,
        supply_mult: 1.0,
        pressure_cap_mult: 1.0
    };

    state.political.capacity_modifiers.by_sid[entityId] = newModifiers;
    return newModifiers;
}

/**
 * Compute deterministic severity from local_strain.
 * Returns severity in [0,1] or 0 if below threshold.
 *
 * STRAIN-ONLY BY SPEC. The ratified 3D transform is
 * `severity = clamp((strain − STRAIN_THRESHOLD)/(STRAIN_MAX − STRAIN_THRESHOLD), 0, 1)`,
 * zeroed below SEVERITY_MIN — docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md
 * §2 (Phase 3D "Transform" row). There is no persistence term in it, and no canon
 * requires one: Engine Invariants §8 / Systems Manual §7.1–7.3 are prose-only.
 *
 * A `persistence` parameter WAS accepted here and never referenced in the body. It has
 * been removed rather than wired up, for three reasons:
 *   1. Persistence is already consumed, upstream and as a GATE. Phase 3C requires
 *      `persistence ≥ TIER1_PERSIST_TURNS` (4, spec C10) before an OSID is Tier-1
 *      eligible at all. Chronic strain therefore already decides WHETHER collapse
 *      applies; the spec deliberately does not also let it decide how hard.
 *   2. Duration is already inside `strain`. `local_strain` is a monotonic accumulator
 *      (`clamp(strain + exposure × STRAIN_FRACTION, 0, STRAIN_MAX)`, 3C:290-301), so a
 *      chronically-exposed OSID reaches a HIGHER strain and thus a higher severity by
 *      construction. Multiplying by persistence as well would double-count the same
 *      elapsed-turns signal.
 *   3. Any curve chosen for it would be invented, not derived — a railroad. Damage is
 *      monotonic (`max(prev, severity)`), so chronic exposure already ratchets.
 * If a future calibration packet wants persistence to shape magnitude, that is a
 * spec change to the §2 transform, not a silent restoration of this parameter.
 */
function computeSeverity(
    localStrain: number
): number {
    // Severity is based on how far above threshold the strain is
    if (localStrain < STRAIN_THRESHOLD) {
        return 0;
    }

    // Normalize: S_raw = (strain - threshold) / (max - threshold)
    const strainRange = STRAIN_MAX - STRAIN_THRESHOLD;
    if (strainRange <= 0) {
        return 0;
    }

    const sRaw = (localStrain - STRAIN_THRESHOLD) / strainRange;
    const s = Math.max(0, Math.min(1, sRaw)); // clamp to [0,1]

    // Apply minimum severity threshold
    if (s < SEVERITY_MIN) {
        return 0;
    }

    return s;
}

/**
 * Update capacity modifiers from collapse damage.
 * Modifiers are derived deterministically from damage tracks.
 */
function updateCapacityModifiers(
    state: GameState,
    entityId: EntityId,
    damage: { authority: number; cohesion: number; spatial: number }
): void {
    const modifiers = getOrInitCapacityModifiers(state, entityId);

    // Derive multipliers from damage (monotonic reduction)
    modifiers.authority_mult = Math.max(0, Math.min(1, 1 - AUTHORITY_IMPACT * damage.authority));
    modifiers.cohesion_mult = Math.max(0, Math.min(1, 1 - COHESION_IMPACT * damage.cohesion));
    modifiers.supply_mult = Math.max(0, Math.min(1, 1 - SPATIAL_IMPACT * damage.spatial));

    // Pressure cap multiplier uses conservative combination (minimum of all three)
    // This ensures that any domain collapse reduces pressure generation capacity
    modifiers.pressure_cap_mult = Math.min(
        modifiers.authority_mult,
        modifiers.cohesion_mult,
        modifiers.supply_mult
    );
}

/**
 * Recompute Phase 3D capacity modifiers from existing collapse_damage.
 * This is used by tooling/harnesses (e.g., test seeding) and is deterministic.
 *
 * NOTE: This does NOT change any Phase 3D formulas; it applies the same derivation
 * as the Phase 3D resolution step uses.
 */
export function recomputePhase3DCapacityModifiersFromDamage(state: GameState): void {
    const byEntity = state.political.collapse_damage?.by_entity;
    if (!byEntity || typeof byEntity !== 'object') return;
    const entityIds = Object.keys(byEntity).sort(strictCompare);
    for (const entityId of entityIds) {
        const damage = byEntity[entityId];
        if (!damage || typeof damage !== 'object') continue;
        // §6 GUARD G1 (defense-in-depth): never derive a capacity_modifier for an RBiH
        // enclave OSID, even via the harness/seed recompute path. The primary guard at
        // the live Phase 3D write site already prevents a protected OSID from ever
        // receiving a collapse_damage entry, so this branch is normally moot — but it
        // keeps the recompute helper correct in isolation (e.g. if a test seeds
        // collapse_damage directly), so NO code path can produce an enclave modifier.
        if (isPhase3DEnclaveGuarded(entityId)) continue;
        updateCapacityModifiers(state, entityId, {
            authority: Number.isFinite(damage.authority) ? damage.authority : 0,
            cohesion: Number.isFinite(damage.cohesion) ? damage.cohesion : 0,
            spatial: Number.isFinite(damage.spatial) ? damage.spatial : 0
        });
    }
}

/**
 * Apply Phase 3D collapse resolution.
 * 
 * For each entity (settlement SID) with Tier-1 eligibility in a domain:
 * - Compute severity from local_strain (persistence already gated eligibility in 3C)
 * - Apply monotonic collapse damage (max of current and new severity)
 * - Update capacity modifiers derived from damage
 * 
 * @param state Game state (mutated: collapse_damage and capacity_modifiers updated)
 * @returns Result object with applied flag, reason if not applied, and stats
 */
export function applyPhase3DCollapseResolution(
    state: GameState
): Phase3DCollapseResolutionResult {
    // Feature gate check
    if (!getEnablePhase3D()) {
        return {
            applied: false,
            reason_if_not_applied: 'feature_flag_disabled',
            stats: {
                entities_evaluated: 0,
                collapses_applied_count: 0,
                collapses_max_severity: 0,
                enclave_guarded_count: 0,
                damage_sum_by_domain: {
                    authority: 0,
                    cohesion: 0,
                    spatial: 0
                }
            }
        };
    }

    // Phase 3C prerequisite: if Phase 3C is disabled, Phase 3D should not apply
    if (!getEnablePhase3C()) {
        return {
            applied: false,
            reason_if_not_applied: 'phase3c_eligibility_disabled',
            stats: {
                entities_evaluated: 0,
                collapses_applied_count: 0,
                collapses_max_severity: 0,
                enclave_guarded_count: 0,
                damage_sum_by_domain: {
                    authority: 0,
                    cohesion: 0,
                    spatial: 0
                }
            }
        };
    }

    // Check if Tier-1 eligibility state exists
    if (!state.political.collapse_eligibility_tier1 || Object.keys(state.political.collapse_eligibility_tier1).length === 0) {
        return {
            applied: false,
            reason_if_not_applied: 'no_tier1_eligibility_state',
            stats: {
                entities_evaluated: 0,
                collapses_applied_count: 0,
                collapses_max_severity: 0,
                enclave_guarded_count: 0,
                damage_sum_by_domain: {
                    authority: 0,
                    cohesion: 0,
                    spatial: 0
                }
            }
        };
    }

    // Check if local_strain state exists
    if (!state.political.local_strain || !state.political.local_strain.by_entity) {
        return {
            applied: false,
            reason_if_not_applied: 'no_local_strain_state',
            stats: {
                entities_evaluated: 0,
                collapses_applied_count: 0,
                collapses_max_severity: 0,
                enclave_guarded_count: 0,
                damage_sum_by_domain: {
                    authority: 0,
                    cohesion: 0,
                    spatial: 0
                }
            }
        };
    }

    const tier1Eligibility = state.political.collapse_eligibility_tier1;
    const localStrain = state.political.local_strain.by_entity;

    let entitiesEvaluated = 0;
    let collapsesAppliedCount = 0;
    let collapsesMaxSeverity = 0;
    const damageSumByDomain = {
        authority: 0,
        cohesion: 0,
        spatial: 0
    };
    let enclaveGuardedCount = 0;
    const appliedEvents: Array<{
        sid: string;
        domain: CollapseDomain;
        severity: number;
        enclave_guarded: boolean;
        effects: {
            damage_before: number;
            damage_after: number;
            authority_mult: number;
            cohesion_mult: number;
            supply_mult: number;
            pressure_cap_mult: number;
        };
    }> = [];

    // Process all entities with Tier-1 eligibility
    const entityIds = Object.keys(tier1Eligibility).sort(strictCompare);

    for (const entityId of entityIds) {
        const tier1State = tier1Eligibility[entityId];
        if (!tier1State) continue;

        // §6 GUARD G1 (RATIFIED — owner + /historian + Pyrrhic §6 panel #368).
        // Skip a protected enclave OSID (ALL enclaves — see isPhase3DEnclaveGuarded)
        // ENTIRELY before any capacity_modifier is written. This pairs with the PRIMARY
        // guard at the collapse_damage chokepoint (getOrInitCollapseDamage): the chokepoint
        // keeps the OSID out of collapse_damage.by_entity (→ no recompute, no
        // will_not_recover marking); this loop-skip keeps it out of capacity_modifiers.
        // Together: the enclave is provably absent from BOTH maps. Damage is NOT accumulated
        // for guarded OSIDs (a will_not_recover false-positive on a §6 enclave is not worth a
        // diagnostic). Fall timing is driven solely by event-owned enclave receipts.
        // Krivaja-95 / Stupčanica-95 are chronology/AAR context gated on those receipts,
        // not the fall-delivery mechanism.
        if (isPhase3DEnclaveGuarded(entityId)) {
            // Count once per guarded OSID that WOULD have collapsed in ≥1 domain.
            let wouldCollapse = false;
            for (const domain of ['authority', 'cohesion', 'spatial'] as CollapseDomain[]) {
                if (!tier1State.domains[domain]) continue;
                if (computeSeverity(localStrain[entityId] ?? 0) > 0) {
                    wouldCollapse = true;
                    break;
                }
            }
            if (wouldCollapse) enclaveGuardedCount++;
            continue;
        }

        const strain = localStrain[entityId] ?? 0;

        // Evaluate each domain independently
        const domains: CollapseDomain[] = ['authority', 'cohesion', 'spatial'];

        for (const domain of domains) {
            // Check if entity is eligible in this domain
            const isEligible = tier1State.domains[domain];
            if (!isEligible) continue;

            entitiesEvaluated++;

            // Compute severity. Strain-only by spec §2 — persistence is the 3C
            // eligibility gate already passed above, not a magnitude term (see
            // computeSeverity).
            const severity = computeSeverity(strain);
            if (severity <= 0) continue; // Below threshold, skip

            // Get current damage (non-enclave OSIDs only — enclaves short-circuited above)
            const damage = getOrInitCollapseDamage(state, entityId);
            const damageBefore = damage[domain];

            // Apply monotonic damage (max of current and new severity).
            const damageAfter = Math.max(damageBefore, severity);
            damage[domain] = damageAfter;

            // Update capacity modifiers derived from damage.
            updateCapacityModifiers(state, entityId, damage);
            const modifiers = getOrInitCapacityModifiers(state, entityId);

            // Record event
            appliedEvents.push({
                sid: entityId,
                domain,
                severity,
                enclave_guarded: false,
                effects: {
                    damage_before: damageBefore,
                    damage_after: damageAfter,
                    authority_mult: modifiers.authority_mult,
                    cohesion_mult: modifiers.cohesion_mult,
                    supply_mult: modifiers.supply_mult,
                    pressure_cap_mult: modifiers.pressure_cap_mult
                }
            });

            // Update stats
            collapsesAppliedCount++;
            if (severity > collapsesMaxSeverity) {
                collapsesMaxSeverity = severity;
            }
            damageSumByDomain[domain] += damageAfter;
        }
    }

    // Sort events by entity ID, then domain (deterministic ordering)
    appliedEvents.sort((a, b) => {
        if (a.sid !== b.sid) {
            return strictCompare(a.sid, b.sid);
        }
        const domainOrder: Record<CollapseDomain, number> = { authority: 0, cohesion: 1, spatial: 2 };
        return domainOrder[a.domain] - domainOrder[b.domain];
    });

    return {
        applied: true,
        reason_if_not_applied: '',
        stats: {
            entities_evaluated: entitiesEvaluated,
            collapses_applied_count: collapsesAppliedCount,
            collapses_max_severity: collapsesMaxSeverity,
            enclave_guarded_count: enclaveGuardedCount,
            damage_sum_by_domain: damageSumByDomain
        },
        applied_events: appliedEvents.length > 0 ? appliedEvents : undefined
    };
}

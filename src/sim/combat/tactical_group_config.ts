/**
 * Tactical Group (TG) feature flags and configuration constants.
 *
 * Implements the staged rollout from ADR-0005 (docs/20_engineering/ADR/
 * ADR-0005-tactical-groups-as-primary-ops-path.md). Canonical OG entity is
 * described in Rulebook v0.9.0 §5.7 and Systems Manual v0.9.0 §6.3.
 *
 * Umbrella flag (ENABLE_TACTICAL_GROUPS): when true, the opening-attack
 * readiness gate examines only the axis's anchor brigade (main_brigade)
 * instead of iterating every assigned brigade. Non-anchor brigades become
 * "donor candidates" — present in the participating list (so MIN_OPERATION_
 * PARTICIPANTS gating still passes) but not required to be adjacent to the
 * objective for the op to launch.
 *
 * Sub-flags gate behavior progression per ADR-0005 §Phased Rollout:
 *   - ENABLE_TG_FORMATION       → v2.0/v2.2 → TG records populated, donors
 *                                 contribute to combat power synthesis
 *   - ENABLE_TG_COMBAT_SYNTHESIS → v2.2 → donors contribute to tg.personnel/
 *                                 equipment; battle uses TG snapshot; donors
 *                                 absorb 50% of casualties pro-rata
 *   - ENABLE_TG_COHESION_BLEED  → v2.3 → donor cohesion bleed formula
 *                                 (donated_fraction × (1 + hops × 0.15) × 15)
 *                                 + cooldown enforcement
 *
 * All flags default false. The v34 migration ships the TG/Army-HQ Records empty.
 * NOTE: serializeState does NOT strip empty Records (it only skips undefined), so the
 * v34 scaffold DOES change the serialized hash vs pre-v34 (40w a969d44719aaa40e →
 * 78e231e35b08cf53) — it is calibration-neutral, not byte-identical. With every flag
 * off the hash holds steady AT the v34 baseline (78e231e35b08cf53). Sub-flag activation
 * is the calibration-shift gate.
 */
export const ENABLE_TACTICAL_GROUPS = false;

/** v2.0/v2.2 sub-flag: TG entity formation + combat power synthesis. */
export const ENABLE_TG_FORMATION = false;

/** v2.2 sub-flag: donor contribution to combat power + casualty distribution. */
export const ENABLE_TG_COMBAT_SYNTHESIS = false;

/** v2.3 sub-flag: Pyrrhic dampener (donor cohesion bleed + cooldown enforcement). */
export const ENABLE_TG_COHESION_BLEED = false;

/**
 * v2.3 sub-flag: 8-turn cohesion-recovery LOCK for TG donors (ADR-0005 §Pyrrhic cost
 * "locked 8 turns"). When on, `formTacticalGroup` sets
 * `donor.tg_recovery_suppressed_until_turn = formed_on_turn + TG_RECOVERY_SUPPRESSION_TURNS`
 * on each donor, and `cohesion_drift.ts` zeroes positive ambient drift for that donor
 * while the lock is active (never clamps below the faction floor). This is the regular-TG
 * counterpart to the Army-HQ recovery suppression — the consumer branch in cohesion_drift
 * is widened to fire under either flag.
 *
 * Flag-off (default): the field is never written, so the cohesion_drift suppression branch
 * can never fire and `tg_recovery_suppressed_until_turn` stays omitted (omitEmpty-safe
 * optional scalar on FormationState). Goal: both gold hashes hold byte-identical
 * (40w 78e231e35b08cf53, 188w 940251e4acaff3d4).
 */
export const ENABLE_TG_RECOVERY_SUPPRESSION = false;

/** v2.3 cohesion-recovery LOCK duration (ADR-0005 §Pyrrhic cost: donors "locked 8 turns"). */
export const TG_RECOVERY_SUPPRESSION_TURNS = 8;

/**
 * ARBiH OG→Division promotion (ADR-0006 historical reorganization). When true, a RBiH
 * (ARBiH) standing OG that has anchored a sustained number of Tactical Group formations
 * is PROMOTED into a permanent Division — an IDENTITY / COMMAND-ECHELON re-badge of the
 * SAME brigades that already exist. Historian basis: 2nd Corps Tuzla promoted 1st OG→21st
 * Division and 5th OG→25th Division. This is faction-specific to ARBiH; VRS geographic OGs
 * and HVO operational zones never promote.
 *
 * CRITICAL INVARIANT (Engine Invariants — NO permanent force inflation): promotion spawns
 * NO new brigades and adds NO personnel/equipment. It updates the standing OG's display
 * identity ("N. OG (Place)" → "{N+20}. Division" / historically-mapped number) and records
 * a one-way promotion entry. Brigade counts, personnel, equipment, and sector geometry are
 * untouched.
 *
 * When false (default): the promotion war-phase step early-returns before any read/write,
 * formTacticalGroup never increments the per-corps formation counter, and no og_promotions
 * record is written. Schema stays v34 (both fields are optional + omitEmpty-safe). Goal:
 * 40w final_state_hash `78e231e35b08cf53` byte-identical with this flag off.
 */
export const ENABLE_TG_OG_PROMOTION = false;

/**
 * Promotion criterion (deterministic, RBiH-only): a corps's standing OG is promoted once it
 * has anchored at least this many Tactical Group formations (the per-corps `tg_formations_by_corps`
 * counter). Each TG formation is a launched offensive anchored by that OG, so the counter is a
 * pure-state proxy for sustained longevity + operational success. Promotion is one-way (no demotion).
 * Tunable per calibration; gated by ENABLE_TG_OG_PROMOTION.
 */
export const PROMOTION_TG_FORMATION_THRESHOLD = 3;

/**
 * Historian-confirmed ARBiH OG→Division number map (2nd Corps Tuzla). Keys are
 * "<corps_id>:<og_ordinal>"; values are the canonical promoted Division number.
 * 2nd Corps: 1st OG → 21st Division, 5th OG → 25th Division. When a (corps, ordinal)
 * pair is absent, the default rule applies: promoted Division number = og_ordinal + 20.
 */
export const ARBIH_OG_TO_DIVISION_NUMBER: Readonly<Record<string, number>> = {
    'arbih_2nd_corps:1': 21,
    'arbih_2nd_corps:5': 25,
};

/** Default OG→Division number offset when no historical mapping exists (N. OG → {N+20}. Division). */
export const OG_TO_DIVISION_DEFAULT_OFFSET = 20;

/**
 * v3.0 flag: Army HQ Operations (faction-wide cross-corps offensives — Krivaja-95,
 * Farz 95 pattern). ADR-0005 §Army HQ Operations + §Phased Rollout v3.0.
 *
 * When false (default): the `inject-army-hq-operations` war-phase step is fully inert
 * (early-returns before any read/write), `isEligibleDonor` keeps the exact same-corps
 * filter, and the Phase D recovery-suppression branch never fires. Schema stays v34
 * (all Army HQ fields already present + omitEmpty-safe). Goal: 40w final_state_hash
 * `78e231e35b08cf53` byte-identical with this flag off.
 */
export const ENABLE_TG_ARMY_HQ_OPS = false;

/**
 * v3.0 Army HQ frequency gate (ADR-0005 §Constants reference + §Army HQ Operations).
 * Both gated by ENABLE_TG_ARMY_HQ_OPS; inert when the flag is off.
 */

/** Max Army HQ ops a faction may launch within one scenario-year bucket (Historian peak ceiling). */
export const MAX_ARMY_HQ_OPS_PER_FACTION_PER_YEAR = 2;

/** Minimum turn spacing between consecutive Army HQ ops for the same faction (1 year). */
export const ARMY_HQ_OP_COOLDOWN_TURNS = 52;

/**
 * While a faction's Army HQ op is planning/executing (and for 4 turns after it enters recovering),
 * that faction's MAX_CONCURRENT_TGS_PER_FACTION is reduced by this amount (ADR §Army HQ Operations
 * Pyrrhic cost #1). Forces other ops to go quiet during the major effort. Gated by
 * ENABLE_TG_ARMY_HQ_OPS at the enforcement site.
 */
export const ARMY_HQ_TG_CAP_REDUCTION = 2;

/**
 * Phase 1 donor-model fidelity constants (ADR-0005 §Distance falloff, §Constants
 * reference, §Cross-corps donor permission, §Army HQ Operations). These bound the
 * full donor model; they only take effect inside the flag-gated TG formation path
 * (ENABLE_TG_FORMATION / ENABLE_TG_ARMY_HQ_OPS), so flag-off remains byte-identical.
 */

/** Hard BFS-hop ceiling: donors farther than this from the staging OSID are skipped. */
export const MAX_OG_DONOR_DISTANCE = 6;

/** Per-hop distance falloff applied to a donor's contribution (ADR §Distance falloff). */
export const TG_DISTANCE_FALLOFF_PER_HOP = 0.15;

/** Floor on the distance-falloff factor — even a far donor lends at least this fraction-scale. */
export const TG_DISTANCE_FALLOFF_FLOOR = 0.10;

/** Equipment falloff is intentionally harsher than personnel (ADR §Distance falloff): heavy
 *  weapons rarely travel piecemeal. donation_equip = floor(donor.equipment × factor × 0.5). */
export const TG_EQUIPMENT_FALLOFF_MULT = 0.5;

/**
 * Max simultaneously-active TGs a single faction may field (ADR §Constants reference). Enforced
 * at TG formation; candidate TGs beyond the cap are rejected with a deterministic tie-break.
 */
export const MAX_CONCURRENT_TGS_PER_FACTION = 4;

/** Max simultaneously-active TGs a single corps may anchor (ADR §Constants reference). */
export const MAX_TGS_PER_CORPS = 2;

/**
 * Per-kind minimum residual personnel after a donation (ADR §Constants reference / §Distance
 * falloff). A donor whose post-donation strength would fall below its kind floor is ineligible.
 * Motorized 1000, light infantry 600, militia 400; default 800 for unclassified brigades.
 */
export const MIN_BRIGADE_PERSONNEL_AFTER_DONATION_BY_KIND: Readonly<Record<string, number>> = {
    motorized: 1000,
    light_infantry: 600,
    militia: 400,
};
export const MIN_BRIGADE_PERSONNEL_AFTER_DONATION_DEFAULT = 800;

/**
 * v2.3 Pyrrhic dampener constants (ADR-0005 §Pyrrhic cost + §Phased Rollout v2.3).
 * All gated by ENABLE_TG_COHESION_BLEED; inert when the flag is off.
 */

/** Base cohesion-bleed scalar in the donor-cohesion-loss formula (ADR §Pyrrhic cost):
 *  loss = donated_fraction × (1 + bfs_hops × TG_BLEED_HOPS_FACTOR) × TG_COHESION_BLEED_BASE × hqMult. */
export const TG_COHESION_BLEED_BASE = 15;

/** Per-hop amplification of the distance penalty in the cohesion-bleed formula. */
export const TG_BLEED_HOPS_FACTOR = 0.15;

/** Army HQ ops double donor cohesion bleed (ADR §Constants reference / §Army HQ Operations). */
export const ARMY_HQ_COHESION_BLEED_MULT = 2.0;

/**
 * Per-scenario donation cap (ADR §Schema "Anti-fire-hose"). A brigade may donate to at most
 * this many TGs over an entire scenario; at/above the cap it is excluded from donor selection.
 *
 * Chosen value: 3. The schema doc-comment floats "max 6"; we pick the tighter 3 because the
 * Pyrrhic intent (ADR §Pyrrhic cost) is to make donation a scarce strategic resource and the
 * per-faction concurrent caps (4 TGs/faction, 2/corps) already bound simultaneous load. 3
 * lifetime donations per brigade across a 40-188w scenario keeps reserve-doctrine pressure
 * meaningful without starving mid-campaign ops. Tunable per calibration.
 */
export const MAX_DONATIONS_PER_SCENARIO = 3;

/**
 * v2.2c #3 donation-readiness gate (ADR-0005 §Op lifecycle integration). The
 * anchor's pledged donors must contribute at least this fraction of the anchor's
 * personnel for the op to clear the opening-attack readiness gate; otherwise it is
 * a lone-anchor suicide attack and the axis is blocked (`insufficient_donation`).
 * Only enforced when ENABLE_TG_FORMATION is on (donors only exist then).
 */
export const DONATION_READINESS_FRACTION = 0.6;

/**
 * Phase 1.6 HVO Mistral-2 westward-reach lever (operations-expert, 2026-05-30).
 *
 * MEASURED PROBLEM (TG v2.2-core flag-ON, after the Phase 1.5 donor-gate fix): the 188w
 * residual regression vs the flag-OFF engine concentrates in the 1995 Mistral-2 / Maestral
 * SW Dinaric belt — HVO (HRHB) cedes Šipovo / Kupres / Bosansko Grahovo / Glamoč / Drvar to
 * RS that the flag-OFF engine captured. ROOT CAUSE (diagnosis cause a + b): the HVO Mistral
 * axes are hosted on the Livno-area corps (`hvo_tomislavgrad`) and stage at op:livno:* for a
 * long WESTWARD reach into Drvar/Grahovo. A handful of HVO donors ARE eligible (so the
 * Phase-1.5 zero-donor fallback does NOT apply), but BFS distance-falloff over that long
 * westward axis (TG_DISTANCE_FALLOFF_PER_HOP) cuts their `personnel_lent` below the 60%
 * DONATION_READINESS_FRACTION → the gate blocks the axis with `insufficient_donation`. The
 * flag-OFF engine has no such gate, so the op launches and the historical capture lands.
 *
 * DOCTRINE: the historical Mistral 2 spearhead was the Croatian Army (HV) 4th Guards + OG West
 * crossing the border as the main effort — territorially absorbed into the HVO anchor brigades
 * (the OOB carries no separate HV corps). The HVO westward thrust was therefore NOT contingent
 * on mustering full LOCAL donor mass; the readiness floor that fits a self-supplied ARBiH corps
 * over-constrains the HV-backed HVO axis. We relax the readiness fraction for HRHB-faction axes
 * only — a corps/faction-specific reach lever, NOT a new global gate or distance cap. It does
 * NOT inflate force (the anchor + whatever donors qualify still fight at their real strength);
 * it only stops the gate from CANCELLING an axis the flag-off engine would have prosecuted.
 *
 * Flag-on-only: only consulted inside the ENABLE_TG_FORMATION donation-readiness branch, so
 * flag-off stays byte-identical (40w e6b5187eaf320c57). Tunable per calibration.
 */
export const DONATION_READINESS_FRACTION_HRHB = 0.25;

/**
 * ADR-0005 Phase 2 (§"Migration of existing pre-planned ops" / §"Bot AI ops"):
 * per-operation donor policy. Classifies an operation by KIND into how it forms
 * its Tactical Group:
 *
 *   - `full`    — offensive operations. Form a TG and pull donors per the full
 *                 Phase-1 model (up to MAX_DONORS_PER_TG, distance falloff, etc.).
 *                 Covers pre-planned / triggered / sector-offensive / Army-HQ ops.
 *   - `limited` — emergency defensive-reaction ops. Form a TG but cap the donor
 *                 pull (anchor + at most TG_LIMITED_POLICY_MAX_DONORS donors).
 *   - `none`    — probes / feints / reorganization. Low-commitment by design;
 *                 no TG is formed (legacy anchor-only behaviour).
 */
export type OpKindDonorPolicy = 'full' | 'limited' | 'none';

/**
 * Donor cap for the `limited` policy (ADR §"Bot AI ops": emergency ops use
 * `limited` with max 2 donors). The `full` policy is bounded by the selection
 * module's own MAX_DONORS_PER_TG; `none` forms no TG at all.
 */
export const TG_LIMITED_POLICY_MAX_DONORS = 2;

/**
 * Pure classifier: map an operation's KIND to its donor policy. Keys off the
 * EXISTING `CorpsOperation.type` discriminant (+ the `is_emergency` flag); does
 * NOT invent new op kinds. Deterministic and side-effect-free.
 *
 *   sector_attack / general_offensive          → 'full'   (offensive)
 *   strategic_defense OR is_emergency === true  → 'limited' (emergency reaction)
 *   probe / feint / reorganization              → 'none'   (low-commitment)
 *
 * An explicit `op.op_kind_donor_policy` on the operation overrides the derived
 * value (lets scenario authors / future callers pin a policy); when absent the
 * kind-derived default is returned.
 */
export function classifyOpDonorPolicy(op: {
    type?: 'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization' | 'feint' | 'probe';
    is_emergency?: boolean;
    op_kind_donor_policy?: OpKindDonorPolicy;
}): OpKindDonorPolicy {
    if (op.op_kind_donor_policy != null) return op.op_kind_donor_policy;
    if (op.is_emergency === true) return 'limited';
    switch (op.type) {
        case 'sector_attack':
        case 'general_offensive':
            return 'full';
        case 'strategic_defense':
            return 'limited';
        case 'probe':
        case 'feint':
        case 'reorganization':
            return 'none';
        default:
            // Unknown / unset kind: treat as offensive (the primary ops path).
            return 'full';
    }
}

/** Donor cap implied by a policy. `none` → 0 (no TG); `limited` → capped; `full` → undefined (module default). */
export function donorCapForPolicy(policy: OpKindDonorPolicy): number | undefined {
    if (policy === 'none') return 0;
    if (policy === 'limited') return TG_LIMITED_POLICY_MAX_DONORS;
    return undefined;
}

/**
 * Resolve the anchor brigade for an axis under TG semantics.
 *
 * Honors the canonical `main_brigade` if already assigned by
 * `assignBrigadeRoles` (highest basePower with deterministic tiebreak).
 * Falls back to first assigned brigade for legacy axes that predate
 * the main/support split.
 *
 * Returns undefined only when the axis has zero assigned brigades —
 * caller should treat that as a malformed axis.
 */
export function getAnchorBrigade(axis: {
    main_brigade?: string;
    assigned_brigades: readonly string[];
}): string | undefined {
    if (axis.main_brigade) return axis.main_brigade;
    return axis.assigned_brigades[0];
}

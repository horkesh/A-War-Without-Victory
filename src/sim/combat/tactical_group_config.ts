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

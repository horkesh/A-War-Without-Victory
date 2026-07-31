/**
 * Event family branch-tag vocabulary.
 *
 * Phase B substrate locked from
 * docs/40_reports/research/20260527_EVENT_FAMILY_BRANCH_TAG_VOCABULARY.md.
 *
 * Tags within each section are sorted lexicographically (strictCompare ASCII)
 * and are unique across the whole catalog. Composite tags are computed at
 * trigger evaluation time via existing `and`/`or`/`not` composite conditions —
 * they MUST NOT appear as `sets_flags` keys (loader rejects).
 *
 * Determinism: this module performs a one-time invariant check on import that
 * asserts duplicate-free union across sections. Throwing on import is
 * deliberate — a duplicated tag anywhere in this file is a build break.
 *
 * Phase B Sub-slice B1: schema-only. No evaluator change. Vocabulary is
 * consumed by `event_loader.ts` (`branch_tag` validation) and surfaced by
 * taxonomy diagnostics in later sub-slices.
 */

function strictCompare(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/** RS family branch tags. Sorted lexicographically. */
export const RS_BRANCH_TAGS = [
    'rs_aggressive',
    'rs_all_six',
    'rs_assembly_accept_rejection',
    'rs_assembly_override',
    'rs_belgrade_defiant',
    'rs_belgrade_negotiate',
    'rs_belgrade_pale_acknowledge',
    'rs_belgrade_pale_resist',
    'rs_camps_cooperate',
    'rs_camps_deny',
    'rs_camps_obstruct',
    'rs_dayton_accept',
    'rs_dayton_hardline',
    'rs_deliberate_force_absorb',
    'rs_deliberate_force_withdraw',
    'rs_holbrooke_comply',
    'rs_holbrooke_defy',
    'rs_hostage_maintain',
    'rs_hostage_release_gradual',
    'rs_mladic_back_down',
    'rs_mladic_remove',
    'rs_owen_stoltenberg_acknowledge',
    'rs_owen_stoltenberg_resist',
    'rs_paramilitary_allow',
    'rs_paramilitary_ask',
    'rs_paramilitary_deny',
    'rs_selective',
    'rs_vopp_accept_plan',
    'rs_vopp_accept_rejection',
    'rs_vopp_override_assembly',
] as const;

/** RBiH family branch tags. Sorted lexicographically. */
export const RBIH_BRANCH_TAGS = [
    'rbih_abdic_accept_ceasefire',
    'rbih_abdic_consolidate_defend',
    'rbih_abdic_press_offensive',
    'rbih_abdic_seek_negotiation',
    'rbih_bosniak',
    'rbih_civic',
    'rbih_dayton_accept',
    'rbih_dayton_hardline',
    'rbih_federation_full_integration',
    'rbih_federation_parallel_commands',
    'rbih_federation_refuse_integration',
    'rbih_federation_selective_integration',
    'rbih_nato_comply',
    'rbih_nato_defy',
    'rbih_owen_stoltenberg_accept_for_optics',
    'rbih_owen_stoltenberg_accept_sincerely',
    'rbih_owen_stoltenberg_reject_via_assembly',
    'rbih_paramilitary_allow',
    'rbih_paramilitary_ask',
    'rbih_paramilitary_deny',
    'rbih_pragmatic',
    'rbih_srebrenica_comply_fully',
    'rbih_srebrenica_hide_weapons',
    'rbih_srebrenica_refuse',
    'rbih_vopp_accept',
    'rbih_vopp_reject',
    'rbih_washington_accept',
    'rbih_washington_reluctant',
] as const;

/** HRHB family branch tags. Sorted lexicographically. */
export const HRHB_BRANCH_TAGS = [
    'hrhb_alliance_sustained',
    'hrhb_camps_cooperate',
    'hrhb_camps_deny',
    'hrhb_camps_obstruct',
    'hrhb_central_bosnia_ceasefire',
    'hrhb_central_bosnia_war',
    'hrhb_croat_republic',
    'hrhb_dayton_accept',
    'hrhb_dayton_hardline',
    'hrhb_federation_coordinate',
    'hrhb_federation_full_integration',
    'hrhb_federation_parallel_commands',
    'hrhb_federation_parallel_institutions',
    'hrhb_federation_refuse_integration',
    'hrhb_federation_selective_integration',
    'hrhb_friction_collapse',
    'hrhb_hv_support_declined',
    'hrhb_hv_support_full',
    'hrhb_hv_support_limited',
    // ── Jul–Sep 1992 summer content (calibration-inert; gated on hrhb_political_goal) ──
    'hrhb_hzhb_dual_track_institutions',
    'hrhb_hzhb_formalize_institutions',
    'hrhb_hzhb_minimal_entity',
    'hrhb_jajce_early_withdrawal',
    'hrhb_jajce_maintain_joint_defense',
    'hrhb_jajce_separate_command',
    'hrhb_posavina_counterattack_brod',
    'hrhb_posavina_hold_orasje',
    'hrhb_posavina_reduce_commitment',
    'hrhb_strategic_ambiguity',
    'hrhb_summer_accept_local_consolidation',
    'hrhb_summer_discipline_commanders',
    'hrhb_summer_negotiate_arms_sharing',
    'hrhb_united_front',
    'hrhb_vopp_acknowledge',
    'hrhb_vopp_resist',
    'hrhb_washington_accept',
    'hrhb_washington_reluctant',
    'hrhb_zagreb_assert_autonomy',
    'hrhb_zagreb_ceasefire_acknowledge',
    'hrhb_zagreb_ceasefire_resist',
    'hrhb_zagreb_deepen_channel',
    'hrhb_zagreb_diversify_supply',
] as const;

/** Carrier flags (non-branch identifiers that appear in flag-condition trees). */
export const CARRIER_FLAGS = [
    'bihac_5th_corps_1994_response',
    'hrhb_1992_cooperation_state',
    'hrhb_federation_integration_carrier',
    'hrhb_hv_support_carrier',
    'rbih_abdic_relationship',
    'rbih_federation_integration_carrier',
] as const;

/** Composite diplomacy tags. Composite tags MUST be assembled at trigger time
 *  via `and`/`or`/`not` composite conditions — they may never appear as
 *  `sets_flags` keys. Sub-tags listed in the worksheet are documented inline. */
export const COMPOSITE_TAGS = [
    'diplomacy_dayton',
    'diplomacy_holbrooke_halt',
    'diplomacy_london_rejected',
    'diplomacy_london_subscribed',
    'diplomacy_owen_stoltenberg',
    'diplomacy_un_safe_areas',
    'diplomacy_vance_owen',
    'diplomacy_washington',
] as const;

/** Union of every legal branch / carrier / composite tag string.
 *  Loader-side membership test for `EventResponseOption.branch_tag`. */
export const ALL_BRANCH_TAGS: ReadonlySet<string> = new Set<string>([
    ...RS_BRANCH_TAGS,
    ...RBIH_BRANCH_TAGS,
    ...HRHB_BRANCH_TAGS,
    ...CARRIER_FLAGS,
    ...COMPOSITE_TAGS,
]);

/** Composite-tag set for quick rejection of meta-flag writers. */
export const COMPOSITE_TAG_SET: ReadonlySet<string> = new Set<string>(COMPOSITE_TAGS);

/**
 * Sensitive-history family slugs whose runtime enabling is prohibited per
 * v1.3 packet §3.6 (Ring-3 enabling rejection) and Phase B Test Plan gate 14.
 *
 * Conservative implementation: matches both the test-plan canonical slugs
 * (`H5`, `h8_mostar_bridge`, `un_safe_area_enforcement`, `rs_drina_campaign`)
 * and the worksheet-derived slugs (`rs_drina_campaign_tempo`,
 * `rs_camp_exposure_response`, `hrhb_camp_exposure`,
 * `hrhb_detention_camp_exposure`, `un_safe_area_enforcement`,
 * `un_hostage_crisis_1995`). The list is exact-match; loader also accepts
 * prefix matches via {@link isRing3SensitiveFamily}.
 */
export const RING3_SENSITIVE_FAMILIES: readonly string[] = [
    'H5',
    'h5_croat_bosniak_war_atrocities',
    'h8_mostar_bridge',
    'hrhb_camp_exposure',
    'hrhb_detention_camp_exposure',
    'hrhb_mostar_bridge_destruction_1993',
    'rs_camp_exposure_response',
    'rs_drina_campaign',
    'rs_drina_campaign_tempo',
    'un_safe_area_enforcement',
] as const;

const RING3_SENSITIVE_PREFIXES: readonly string[] = [
    'h5_',
    'hrhb_camp_exposure',
    'hrhb_detention_camp_',
    'rs_camp_exposure',
    'rs_drina_campaign',
    'un_hostage_',
    'un_safe_area_',
];

/**
 * True when `family` falls inside the Ring-3 sensitive-history set per
 * packet §3.6 / test plan §3.6 gates 14, 18.
 *
 * Exact-match list + a small prefix set covers both test-plan canonical
 * slugs and worksheet-derived slugs.
 */
export function isRing3SensitiveFamily(family: string | undefined): boolean {
    if (!family) return false;
    for (const slug of RING3_SENSITIVE_FAMILIES) {
        if (family === slug) return true;
    }
    for (const prefix of RING3_SENSITIVE_PREFIXES) {
        if (family.startsWith(prefix)) return true;
    }
    return false;
}

/**
 * True when `family` identifies the camp-exposure option-set freeze rows per
 * test plan gate 2 (R4 / H6). The option-set freeze applies to:
 *   - event id `concentration_camps_revealed_1992` (R4)
 *   - `family: 'rs_camp_exposure_response'` (R4 worksheet slug)
 *   - `family: 'hrhb_camp_exposure'` / `hrhb_detention_camp_exposure` (H6)
 *   - event ids beginning with `hvo_detention_camps_` (test-plan literal)
 */
export function isCampExposureFamily(family: string | undefined): boolean {
    if (!family) return false;
    return (
        family === 'rs_camp_exposure_response' ||
        family === 'hrhb_camp_exposure' ||
        family === 'hrhb_detention_camp_exposure'
    );
}

// ─── Module-level invariant: duplicate-free union across sections. ─────────
// Phase B Test Plan gate 5 (vocabulary arrays unique catalog-wide) is enforced
// here so that any later mutation to one of the arrays that introduces a
// collision fails at import time. Iteration is deterministic via
// strictCompare-sorted section composition.
(function assertUniqueAcrossSections(): void {
    const sections: Array<{ name: string; tags: readonly string[] }> = [
        { name: 'RS_BRANCH_TAGS', tags: RS_BRANCH_TAGS },
        { name: 'RBIH_BRANCH_TAGS', tags: RBIH_BRANCH_TAGS },
        { name: 'HRHB_BRANCH_TAGS', tags: HRHB_BRANCH_TAGS },
        { name: 'CARRIER_FLAGS', tags: CARRIER_FLAGS },
        { name: 'COMPOSITE_TAGS', tags: COMPOSITE_TAGS },
    ];
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const section of sections) {
        for (const tag of section.tags) {
            const prior = seen.get(tag);
            if (prior !== undefined) {
                collisions.push(`${tag} (${prior} & ${section.name})`);
            } else {
                seen.set(tag, section.name);
            }
        }
        // Per-section ordering invariant: lexicographic via strictCompare.
        const sorted = [...section.tags].sort(strictCompare);
        for (let i = 0; i < section.tags.length; i++) {
            if (section.tags[i] !== sorted[i]) {
                throw new Error(
                    `event_families.ts: ${section.name} not sorted by strictCompare at index ${i}: ` +
                    `got '${section.tags[i]}', expected '${sorted[i]}'`,
                );
            }
        }
    }
    if (collisions.length > 0) {
        collisions.sort(strictCompare);
        throw new Error(
            `event_families.ts: duplicate branch-tag(s) across sections: ${collisions.join(', ')}`,
        );
    }
})();

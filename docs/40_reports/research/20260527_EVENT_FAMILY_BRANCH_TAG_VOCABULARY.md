# Event Family Branch-Tag Vocabulary

**Date:** 2026-05-27
**Status:** Phase A stub — extracted from Wave 1 + Wave 2 worksheets by Game Designer review.
**Locks into:** `src/sim/events/event_families.ts` in Phase B per v1.3 packet §2.2.
**Owner:** Game Designer (vocabulary) + Technical Architect (Phase B file).

## Purpose

Single source of truth for branch-tag string vocabulary. Authored options in `data/scenarios/events/*.json` must use a tag from this list. Downstream events that gate on a branch use `trigger.condition: { type: 'flag_equals', flag: '<family_id>', value: '<branch_tag>' }`. Locking the vocabulary at Phase A prevents tag drift across the remaining 39 Wave 2 worksheets.

## RS Family

- `rs_aggressive` (R1 counterfactual)
- `rs_all_six` (R1 historical default)
- `rs_assembly_accept_rejection`
- `rs_assembly_override`
- `rs_belgrade_defiant`
- `rs_belgrade_negotiate`
- `rs_belgrade_pale_acknowledge`
- `rs_belgrade_pale_resist`
- `rs_camps_cooperate`
- `rs_camps_deny`
- `rs_camps_obstruct`
- `rs_dayton_accept`
- `rs_dayton_hardline`
- `rs_deliberate_force_absorb`
- `rs_deliberate_force_withdraw`
- `rs_holbrooke_comply`
- `rs_holbrooke_defy`
- `rs_hostage_maintain`
- `rs_hostage_release_gradual`
- `rs_mladic_back_down`
- `rs_mladic_remove`
- `rs_owen_stoltenberg_acknowledge`
- `rs_owen_stoltenberg_resist`
- `rs_paramilitary_allow` (R2 historical default)
- `rs_paramilitary_ask` (R2 counterfactual)
- `rs_paramilitary_deny` (R2 counterfactual)
- `rs_selective` (R1 counterfactual)
- `rs_vopp_accept_plan`
- `rs_vopp_accept_rejection`
- `rs_vopp_override_assembly`

## RBiH Family

- `rbih_abdic_accept_ceasefire`
- `rbih_abdic_consolidate_defend`
- `rbih_abdic_press_offensive`
- `rbih_abdic_seek_negotiation`
- `rbih_bosniak` (B1 counterfactual)
- `rbih_civic` (B1 historical default)
- `rbih_dayton_accept`
- `rbih_dayton_hardline`
- `rbih_nato_comply`
- `rbih_nato_defy`
- `rbih_owen_stoltenberg_accept_for_optics`
- `rbih_owen_stoltenberg_accept_sincerely`
- `rbih_owen_stoltenberg_reject_via_assembly`
- `rbih_paramilitary_allow` (B2 counterfactual — bounded by paramilitary_sweep engine)
- `rbih_paramilitary_ask` (B2 counterfactual)
- `rbih_paramilitary_deny` (B2 historical default)
- `rbih_pragmatic` (B1 counterfactual — Phase D cost floor required)
- `rbih_srebrenica_comply_fully`
- `rbih_srebrenica_hide_weapons`
- `rbih_srebrenica_refuse`
- `rbih_vopp_accept` (B3 historical default)
- `rbih_vopp_reject` (B3 counterfactual)
- `rbih_washington_accept`
- `rbih_washington_reluctant`

## HRHB Family

- `hrhb_alliance_sustained` (H1a counterfactual)
- `hrhb_camps_cooperate`
- `hrhb_camps_deny`
- `hrhb_camps_obstruct`
- `hrhb_central_bosnia_ceasefire` (H2 counterfactual)
- `hrhb_central_bosnia_war` (H2 historical default)
- `hrhb_croat_republic` (H1 historical default)
- `hrhb_dayton_accept`
- `hrhb_dayton_hardline`
- `hrhb_federation_coordinate`
- `hrhb_federation_full_integration`
- `hrhb_federation_parallel_institutions`
- `hrhb_friction_collapse` (H1a historical default)
- `hrhb_hv_support_declined`
- `hrhb_hv_support_full`
- `hrhb_hv_support_limited`
- `hrhb_strategic_ambiguity` (H1 counterfactual — Phase D cost floor required)
- `hrhb_united_front` (H1 counterfactual — Phase D cost floor required)
- `hrhb_vopp_acknowledge`
- `hrhb_vopp_resist`
- `hrhb_washington_accept`
- `hrhb_washington_reluctant`
- `hrhb_zagreb_ceasefire_acknowledge`
- `hrhb_zagreb_ceasefire_resist`

## Carrier Flags

- `bihac_5th_corps_1994_response`
- `hrhb_hv_support_carrier`
- `rbih_abdic_relationship`

## Cross-Faction Diplomacy

- `diplomacy_dayton` — composite, sub-tags TBD per the corresponding worksheet's §3 matrix.
- `diplomacy_holbrooke_halt` — composite, sub-tags TBD per the corresponding worksheet's §3 matrix.
- `diplomacy_london_subscribed` (X1 historical default — `accept_principles`)
- `diplomacy_london_rejected` (X1 counterfactual — `reject`, Phase D Packet 6)
- `diplomacy_owen_stoltenberg` — composite, sub-tags: `owen_stoltenberg_rejected_by_rbih_assembly`, `owen_stoltenberg_rbih_unified_reject`, `owen_stoltenberg_implemented` (BLOCKED until Gate §6 sign-off), `owen_stoltenberg_multilaterally_rejected`, `owen_stoltenberg_hrhb_defects`
- `diplomacy_un_safe_areas` — composite, sub-tags TBD per the corresponding worksheet's §3 matrix.
- `diplomacy_vance_owen` — composite, sub-tags: `vance_owen_rejected_by_rs`, `vance_owen_implemented`, `vance_owen_multilaterally_rejected`, `vance_owen_hrhb_defects`
- `diplomacy_washington` — composite, sub-tags TBD per the corresponding worksheet's §3 matrix.

## Composite Tags vs Branch Tags

Composite tags (`diplomacy_*`) are **computed** at downstream trigger evaluation by reading multiple per-faction flags together. They are distinct from primitive `branch_tag` values. The Phase B `event_families.ts` schema should reserve a separate `composite_tag` slot to keep the two separate.

## Reserved Slot — Wave 2 (CLOSED)

Wave 2 closed 2026-05-27. Primitive branch tags + carrier flags + composite-tag scaffolding above represent the union of Wave 1 + Wave 2 worksheet output. Phase B implementation may now lock the final TypeScript file.

## Lock Rules (Determinism Auditor Wave 2)

1. One tag per line within each section.
2. Tags within each section sorted lexicographically (`strictCompare` ASCII).
3. Phase B `event_families.ts` must export each section as a frozen `as const` tuple, never `Object.keys` of a literal.
4. Phase B unit test must assert `[...TAGS].sort(strictCompare).join() === TAGS.join()` and that every tag is unique catalog-wide.

## References

- Game Designer Wave 1 + Wave 2 review (extraction).
- Determinism Auditor Wave 2 review (lock rules).
- v1.3 packet `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` §2.2.
- Foundational packet `docs/40_reports/proposals/20260527_EVENT_FOUNDATIONAL_DECISIONS_PACKET.md` label taxonomy.

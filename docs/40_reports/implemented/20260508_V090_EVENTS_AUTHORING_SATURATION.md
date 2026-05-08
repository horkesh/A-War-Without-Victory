# LANE-NIGHTSHIFT-V090-EVENTS-AUTHORING-SATURATION — Closeout

**Date:** 2026-05-08
**Status:** CLOSED-FOR-V0.9.0 — events-authoring surface declared saturated at 121 events
**Plan reference:** `docs/plans/2026-04-14-v090-consequence-system-refresh-plan.md`
**Predecessor lane:** Wave 17 at `6fa3c707` (121 events) — saturation note in closeout flagged Wave 18 as an "honest assessment turn"
**Scope:** docs-only. No code, no engine/sim/test touch. Ring 1; no §6 surface.

---

## 1. Catalog state at saturation

Catalog stands at **121 events** in `data/scenarios/events/consequences.json` after Wave 17 (`6fa3c707`).

Per-wave breakdown (cumulative count after each wave):

| Wave / Lane | Events shipped | Cumulative | Anchor commit |
|-------------|----------------|------------|---------------|
| Pre-Wave-4 baseline (early v0.9.0 substrate + Mission D + R2-2) | 18 | 18 | — |
| Wave 4 | 10 | 28 | `013bd633` |
| Wave 5 | 7 | 35 | `1f7b6282` |
| Equipment-Quality-Modifier substrate event | 1 | (folded into 35) | `658241df` |
| Wave 6 / Wave 7 | 0 (perf + trajectory lanes; no consequences.json touch) | 35 | — |
| Wave 8 | 6 | 65 (\*) | `940e92b3` |
| Wave 9 (lost-and-redo) | 6 | 71 | `6c39b6a8` |
| Wave 10 | 6 | 77 | `d59abaa4` |
| Wave 11 | 6 | 83 | `c406fd9c` |
| Wave 12 | 6 | 89 | `cea53cb1` |
| Wave 13 | 6 | 95 | `47ef3788` |
| Wave 14 | 6 | 101 | `8d6bdd87` |
| Wave 15 | 6 | 107 | `e43c4abc` |
| Wave 16 | 6 | 113 | `7ad31214` |
| Wave 17 | 8 | **121** | `6fa3c707` |

(\*) Wave 8 closeout reconciles "Wave-5-lineage 35" with the actual JSON top-level array length of **59** (pre-Wave-4 baseline events were larger than the authoring-lineage subset). Net: 17 distinct authoring waves contributing to consequences.json, with the v0.9.0 nightshift authoring waves running Wave 4 through Wave 17.

Cross-cutting distribution across the 121-event catalog:

- **responding_faction:** RBiH 50 / RS 36 / HRHB 29 / 6 faction-agnostic (no responder).
- **Decision events** (`requires_player_response: true`): 5 (Wave 4 + Wave 5 precedent — `csq_separate_peace_overture`, `csq_patron_recovery_offer`, `csq_tripartite_federation_overture`, `csq_partition_referendum_proposal`, `csq_third_party_mediation_offered`).
- **category split:** diplomatic 42 / military 29 / political 25 / economic 12 / humanitarian 11 / command 2.
- **turn_min buckets:** <30: 11 / 30-39: 10 / 40-49: 7 / 50-59: 18 / 60-69: 20 / 70-79: 18 / 80-89: 13 / 90+: 24. **21 events have turn_min < 40** (in-40w-window); the remaining 100 are mid-to-late-war by construction.
- **top condition types** (predicate kinds in use): `and` (102), `flag_not_set` (81), `flag_at_least` (80), `flag_equals` (22), `dimension_above` (19), `morale_average_below` (18), `patron_pressure_above` (16), `supply_below` (14), `alliance_above` (13), `dimension_below` (11), `territory_loss_window` (9), `war_crimes_above` (4), `paramilitary_mode_equals` (4), `alliance_below` (4), `territory_percentage` (3), `displaced_in_aggregate` (2), `enclave_supply_status` (1), `enclave_resilience_aggregate` (1), `metric_compare_factions` (1), `alliance_drift` (1).
- **top effect kinds:** `cost_ledger_annotation` (96 — on nearly every event; the canonical reckoning surface), `cohesion_change` (54), `recruitment_modifier` (46), `equipment_quality_modifier` (20), `supply_delta` (19), `morale_change` (17), `negotiation_capital` (14), `alliance_lock` (13), `patron_pressure` (11), `aggression_modifier` (8), `bot_priority_shift` (4), `doctrine_constraint` (3), `alliance_change` (2), `humanitarian_impact` (1), `guerrilla_threat` (1).

## 2. Closed triads

Faction-symmetric triads completed across Waves 4-17 (per Wave-17 closeout's mirror-gap audit):

- **Spring-thaw-supply-recovery triad** — RBiH + RS at Wave-16, HRHB at Wave-17. **COMPLETE.**
- **Equipment-quality-recovery streak triad** — RBiH at Wave-16, RS + HRHB at Wave-17. **COMPLETE.**
- **Grain-corridor-reopened triad** — RBiH at Wave-3, RS + HRHB at Wave-17. **COMPLETE.**
- **Arms-pipeline-disrupted triad** — RS at Wave-5, RBiH + HRHB at Wave-17. **COMPLETE.**
- **Negotiating-capital-recovery triad** — RBiH + RS + HRHB at Wave-16. **COMPLETE.**
- **Demobilization-pressure-wave triad** — RS at Wave-3, RBiH + HRHB at Wave-15. **COMPLETE.**
- **Paramilitary-refusal-streak triad** — RBiH at Wave-14, HRHB + RS at Wave-15. **COMPLETE.**
- **Industrial-conscription-wave triad** — RBiH at Wave-3, RS + HRHB at Wave-15. **COMPLETE.**
- **Truce-streak triad** — RBiH at Wave-13, HRHB + RS at Wave-14. **COMPLETE.**
- **Mediator-engagement-streak triad** — RBiH at Wave-13, HRHB + RS at Wave-14. **COMPLETE.**
- **Back-channel-communication triad** — RBiH at Wave-4, HRHB at Wave-13, RS at Wave-14. **COMPLETE.**
- **Demographic-strain triad** — completed at Wave-13 (Wave-12 had HRHB; Wave-13 added RS).
- **War-exhaustion-high-streak triad** — RBiH at Wave-8, RS at Wave-9-redo, HRHB at Wave-11. **COMPLETE.**
- **Supply-corridor-chronic-strain triad** — RBiH at Wave-11, RS at Wave-9-redo, HRHB at Wave-10. **COMPLETE.**
- **Winter-supply-attrition triad** — RS at Wave-8, RBiH at Wave-9-redo, HRHB at Wave-10. **COMPLETE.**
- **Doctrine-modernization triad** — RBiH at Wave-10, HRHB at Wave-11; RS-side covered by `csq_doctrine_drift` chain at Wave-10/11. **COMPLETE.**
- **Post-Dayton train-and-equip triad** — RBiH at Wave-10, HRHB at Wave-11; RS-side covered by `csq_post_cease_fire_recruitment_decline` chain at Wave-9-redo/Wave-11. **COMPLETE.**

## 3. Open asymmetries

After Wave 17, the entire mirror-gap audit reduces to a **single specifically-named outstanding event**:

- **`csq_captured_equipment_windfall_HRHB`** — would close the captured-equipment-windfall triad (RBiH at Wave-5; RS at Wave-17; HRHB still open).

**Why it isn't worth a Wave 18 just for it:**

A Wave 18 spun up to ship one event would carry the full per-wave overhead: lane spec, audit-gate test file (loader + per-event predicate + faction-agnostic + condition-kind + effect-kind audits), historical-anchor sourcing, closeout report, ledger entry. Across Waves 13-17 the marginal yield-per-overhead has been monotonically declining (Wave 13-16 each shipped 6 events; Wave 17 stretched to 8 with mixed handoff + mirror-gap closure). A solo-event lane is ~120 lines of test scaffolding for a single faction-mirror that adds zero new mechanic, no new historical lens, no new substrate consumption. The honest accounting is: ship `csq_captured_equipment_windfall_HRHB` as a one-line addition the next time `consequences.json` is touched for any other reason (Cost Ledger authoring, dynamic-essay carry-in, scenario rebalance), rather than as a standalone wave.

## 4. STOP-gated themes (deferred — substrate-first authoring required)

Themes flagged across multiple wave closeouts as blocked on missing substrate:

- **`csq_doctrine_drift_RS`** — needs prior `corps_reorganization_active_RS` or `doctrine_reform_initiated_RS` progenitor flag-substrate authored. Wave-13 / Wave-14 / Wave-15 / Wave-16 / Wave-17 carry-over.
- **`csq_third_party_arms_channel_RS`** — needs Belgrade-pipeline-attenuation progenitor (the RS-axis equivalent of the Iran-channel substrate that fed `csq_third_party_arms_channel` and `csq_iran_arms_channel_attenuation` chains). Wave-13 / Wave-14 / Wave-15 / Wave-16 / Wave-17 carry-over.
- **Civilian / refugee dimension events using ghost observer flags** — `winter_held_through_turn`, `corridor_blocked_through_turn`, `arms_embargo_compliant_through_turn`, `political_unity_held_through_turn` exist as ghost entries in `data/codex/ghost_entries/` but no first-class event has yet been authored that consumes them. Requires a verified-ghost-substrate audit lane before content authoring. Wave-15 / Wave-16 / Wave-17 carry-over.
- **Faction-symmetric supply-corridor health streak events** — corridor_open / closed streak triggers using a `morale_low_streak`-style streak counter. Streak-counter substrate exists but the corridor variant requires a small substrate audit (which corridor-state field is the canonical streak observer?). Wave-15 / Wave-16 / Wave-17 carry-over.
- **Atrocity-as-tactic events** — blocked by `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` Ring-2 / §6 boundaries. Every wave since Wave 4 has explicitly excluded these, per Sensitive-history compliance assertions. They are not authoring debt for v0.9.0; they require a separate gate-resolved design lane.
- **Bot-AI-mode-dependent events that branch on offensive paramilitary mode** — adjacent to the §6 boundary. Wave 14/15 explicitly rejected reading `paramilitary_mode_equals('offensive')` as a precondition (only `'rear_pocket'` — the recovery / refusal stance — is consumed). Promotion of offensive-mode predicates into events would require a §6 sign-off concurrent with the SRK siege defender / atrocity-tactic work flagged in v0.9.7+.
- **No-new-condition-kinds / no-new-effect-kinds STOP rule** — every wave since the Equipment-Quality-Modifier substrate at `658241df` has held the line that introducing a new union member of `EventEffect` or `EventCondition` requires its own substrate audit lane first, not a content-authoring wave. Audit tests in every wave's lane suite enforce this. The remaining authoring debt for v0.9.0 lies entirely within the existing whitelist of kinds.

## 5. Verdict

**Events-authoring portion of v0.9.0 is CLOSED-FOR-V0.9.0 at 121 events.**

The reasoning, in plain accounting:

1. All 17 named cross-faction triads I could locate across Wave 4-17 closeouts are **complete**.
2. The mirror-gap audit reduces to **one specifically-named open event** that does not justify a dedicated wave.
3. STOP-gated themes are blocked on substrate or §6 design work, not on authoring effort.
4. The full whitelist of condition kinds (20 kinds in active use) and effect kinds (15 kinds in active use) is well-exercised; no kind-shaped gaps remain that aren't STOP-gated.
5. Per-wave marginal yield has been declining since Wave 13; saturation framing matches the actual signal.

**Where the remaining authoring work goes:**

- Net-new authoring deferred to **v0.9.1+** where the dynamic-essay engine + Cost Ledger full-prosecutorial authoring naturally re-open `consequences.json` for non-mirror reasons, and `csq_captured_equipment_windfall_HRHB` can be folded in as a one-line addition.
- Substrate-first themes (RS doctrine drift, RS Belgrade-pipeline channel, ghost-flag civilian dimension events, corridor health streaks) carry forward as a single backlog block in the consequence-system refresh plan.
- §6-gated themes (atrocity-as-tactic, offensive paramilitary-mode predicates) carry forward to **v1.0 final QA pass** alongside the SRK siege defender Phase 1 work that is already deferred to v0.9.7+ pending §6 sign-off + canon §6.10 amendment.

The **Cost Ledger full prosecutorial authoring** portion of v0.9.0 (per `docs/plans/2026-03-26-cost-ledger-template-format.md`) is **separate** from events-authoring and remains open. That is the binding constraint on full v0.9.0 closure, not divergence-event count.

## 6. Cross-cutting analysis

A few patterns across the 121-event catalog worth flagging for v0.9.1+ planners:

- **Faction-cost-share imbalance.** RBiH 50 / RS 36 / HRHB 29 / 6 faction-agnostic. RBiH carries 41% of the catalog; HRHB 24%. This reflects the historical asymmetry (RBiH is the protagonist faction and the war's strategic spine) more than an authoring bias — every faction-mirror lane explicitly checked for triadic coverage, and the 17 closed triads are evenly distributed. The residual RBiH overweight comes from RBiH-axis events that have no historical mirror (e.g. Bosniak-state-identity 1992 events, ARBiH-revival cluster, post-Dayton train-and-equip pulls). HRHB underweight is partly because HVO is structurally the smallest faction (corps + AoR scope) and partly because the HRHB-RBiH war transition only opens a subset of consequence-relevant flags.
- **Decision-event sparsity.** Only 5 of 121 events (4.1%) are player-decision events (`requires_player_response: true`). The Wave 4 + Wave 5 precedent established the pattern but subsequent waves have leaned heavily on ambient consequence-firing rather than player-prompted choice. If v0.9.1's dynamic-essay work wants additional player-agency surfaces inside the consequence layer, this is an authoring gap (separate from mirror-gaps; not a Wave 18 candidate).
- **Condition-kind utilization is healthy but lopsided.** `and` + `flag_not_set` + `flag_at_least` cover most predicates (3 of 4 kinds account for 263 of ~430 condition-node uses by my walker). The longer-tail kinds (`enclave_supply_status`, `enclave_resilience_aggregate`, `metric_compare_factions`, `alliance_drift`) are each used by exactly one event — these are not under-used by accident; they are §6-adjacent or strict-aggregate reads that the Ring-1 authoring track has correctly stayed away from. The `metric_compare_factions` and `alliance_drift` kinds are candidates for a substrate audit if v0.9.1 wants to broaden cross-faction-comparison events.
- **Effect-kind concentration.** `cost_ledger_annotation` lands on 96 of 121 events (79%). This is exactly the canonical-reckoning-surface contract every wave's Sensitive-history compliance asserts, and is the structural reason the Cost Ledger full prosecutorial authoring is the binding constraint on v0.9.0 closure rather than divergence-event count: the events ARE the prosecutorial surface, but the readers are not all authored yet.
- **turn_min distribution** is mid-to-late-war heavy by design. Only 21 of 121 events fire in the 40w window; this is exactly why every wave since Wave 8 has reported "40w hash byte-stable to baseline" without compromising calibration sensitivity. Wave 17's `final_state_hash: 86ebf26ae0271465` matches the post-D-CONTENT baseline; events authored under this lane do not perturb 40w calibration.
- **No ZoC / AoR / paint-anchor / political_controllers / OOB / FORAWWV touch across all 17 waves.** Audit tests in every wave's lane suite enforce this. The 121-event catalog is structurally a Ring-1 / no-§6 surface, by construction, and is the canonical proof point that the Sensitive-history design gate's "atrocity representation" boundary can hold under sustained authoring pressure.

---

## Files changed (this lane)

| Path | Change |
|------|--------|
| `docs/40_reports/implemented/20260508_V090_EVENTS_AUTHORING_SATURATION.md` | new — this file |
| `docs/plans/MASTER_ROADMAP.md` | edit — v0.9.0 entry amended with events-authoring CLOSED 2026-05-08 line |

## Boundaries respected

- Docs-only lane. No code, sim, engine, scenario, OOB, paint-anchor, political_controllers, FORAWWV, rupture, enclave_resilience, or §6 surface touched.
- Ring 1; no §6 boundary crossed.
- No `consequences.json` mutation in this lane.
- No new condition or effect kinds proposed. STOP rule respected.
- Determinism preserved by construction (no code change).

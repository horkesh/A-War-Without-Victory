# Event Family Worksheet — H9: HRHB Washington Agreement Acceptance (March 1994)

**Date:** 2026-05-27
**Family ID:** H9
**Faction scope:** HRHB (responding faction); cross-faction visibility to RBiH and Zagreb patron
**Source tier:** `agreement_text` (Washington Agreement, 18 March 1994; Vienna Framework Agreement, 26 March 1994) corroborated by `icty_icj_un` (Prlić et al. IT-04-74-T chronology Vol. 3 §§120-200) and `balkan_battlegrounds` (BB Vol. II pp. 451-455, operational context for the cease-fire and Federation framework)
**Sensitive-history ring:** **none** for the acceptance decision itself. The decision is diplomatic; the downstream Croat-Bosniak war chain (H2, H5, H6, H8) that the Washington Agreement closes is Ring 1/2 but is handled exclusively via mechanical foreclosure (war chain no longer triggered), not authorial sensitive-history authoring.
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The **Washington Agreement** of **18 March 1994** ended the Croat-Bosniak war and established the **Federation of Bosnia and Herzegovina**. The agreement was signed in Washington, D.C. by:

- Krešimir Zubak (HRHB side, replacing Mate Boban after Boban's removal under U.S. pressure earlier in March 1994)
- Haris Silajdžić (Prime Minister of the Republic of Bosnia and Herzegovina, RBiH side)
- Franjo Tuđman (President of the Republic of Croatia, as patron-guarantor for the HRHB side)
- Alija Izetbegović (President of the Republic of Bosnia and Herzegovina, as patron-guarantor for the RBiH side)
- Warren Christopher (U.S. Secretary of State, as facilitator)

The agreement was followed on **26 March 1994** by the **Vienna Framework Agreement** detailing the constitutional structure of the Federation (cantons, presidency rotation, parliamentary structure) and a **Preliminary Agreement Concerning the Establishment of a Confederation between the Federation of Bosnia and Herzegovina and the Republic of Croatia**, signed concurrently in Washington.

Documented in:

- **Washington Agreement text** (18 March 1994) — Articles I-IX establishing the Federation as a constituent unit of the Republic of Bosnia and Herzegovina, cantonal structure, joint Federation Army from HVO and ARBiH units, and ceasefire effective from the date of signature.
- **Vienna Framework Agreement** (26 March 1994) — constitutional detail of the cantonal system, mixed/Croat/Bosniak cantons enumerated; HVO and ARBiH command-integration timetable.
- **Prlić et al. IT-04-74-T Trial Judgment** (29 May 2013) Vol. 3 §§120-200 reconstructs the HZ HB / HR HB Presidency-level deliberations preceding the agreement, the U.S. pressure (Charles Redman, Peter Galbraith) that produced Boban's removal and Zubak's elevation in early March 1994, and the Tuđman Presidential Transcripts of February-March 1994 documenting Zagreb's calculation that continued Croat-Bosniak war was untenable in the face of U.S. sanctions threats against Croatia.
- **Prlić Trial Judgment Vol. 1 §§556-590** documents HR HB institutional continuity (proclaimed 28 August 1993) that the agreement formally suspended without abolishing — a structural ambiguity that returned in the Dayton phase.
- **Balkan Battlegrounds Vol. II pp. 451-455** frames Washington as **externally imposed** under U.S. coercion, **not** as organic Croat-Bosniak reconciliation. BB stresses (a) the U.S. sanctions threat against Croatia as the operative lever, (b) the persistence of HRHB military and political institutions inside the Federation framework, and (c) the slow and uneven implementation of the joint Federation Army, citing the continued operation of separate HVO and ARBiH command chains throughout 1994.

The **historical actor** — the HR HB Presidency under Krešimir Zubak in March 1994, acting under direct Zagreb pressure transmitted by Tuđman — **accepted** the Washington framework. This is the documented historical fact. **Acceptance was reluctant** in tone (BB Vol. II p. 451 frames it as "an unhappy peace dictated from Washington"), but the formal act of signing and the immediate cease-fire that followed are not in dispute.

The Tuđman tape transcripts admitted at Prlić (Trial Judgment Vol. 3 §§120-200) record Tuđman instructing Boban (and after Boban's removal, Zubak) that **the choice was Washington acceptance or loss of Zagreb's logistical backing**. The HV-HVO supply, fuel, and officer-secondment pipeline that had sustained HZ HB / HR HB since 1992 (Prlić Trial Judgment Vol. 2 §§220-260) was the lever: U.S. sanctions on Croatia would have collapsed it.

## 2. Defensible Historical/Default Option

- **Label:** `accept` — Sign the Washington Agreement; commit publicly to the Federation framework; begin HVO-ARBiH command integration; accept HR HB institutional suspension in favor of the Federation cantonal system.
- **Rationale:** This is the documented historical choice of the HR HB Presidency in March 1994. The Washington Agreement was signed; the cease-fire held; the Federation was constituted. Subsequent operational realignment (joint HVO-ARBiH operations against the VRS in 1994-1995, Bihać relief, the southern front, Operation Maestral / Maestral 2 / Storm participation) flows from this acceptance. **`accept` is the historical-default label per packet §4 H9 row** ("Washington Agreement acceptance (HRHB side) — agreement; BB II — `accept` — `reluctant`").
- **Citation:** Washington Agreement text (18 March 1994); Vienna Framework Agreement (26 March 1994); Prlić et al. IT-04-74-T Trial Judgment Vol. 3 §§120-200, Vol. 1 §§556-590; BB Vol. II pp. 451-455; Tuđman Presidential Transcripts February-March 1994 (admitted at Prlić).

**Cross-row alignment:** This worksheet sits opposite the existing `washington_agreement_1994` row in `data/scenarios/events/war_1994.json` (responding faction: **RBiH**, B10 family). H9 is the **HRHB-side companion row**; both faction-decisions resolve the same diplomatic event from their respective Presidency perspectives. Phase D should consider whether H9 is authored as a **distinct event id** (e.g., `washington_agreement_acceptance_1994_hrhb`) firing in the same turn as the RBiH-side row, or whether the existing row is restructured to dual-fire to both factions. Recommend the former: separate ids preserve `responding_faction: 'HRHB'` and let the historical-default `accept` carry HRHB-specific dimension shifts that the RBiH-side row does not. Defer to Technical Architect.

## 3. Proposed Counterfactual Options

### Option: `reluctant`

- **Label:** `reluctant` — Sign the Washington Agreement under protest; maintain HR HB parallel institutions in Mostar; slow-walk command integration; preserve HVO autonomy inside the Federation framework.
- **Historical analogy:** BB Vol. II pp. 451-455 explicitly characterizes the historical posture as **reluctant acceptance**. The HR HB Presidency retained Mostar as its institutional center after Washington; HR HB legislative organs continued meeting through 1994-1995; the HVO command chain remained operationally distinct from the ARBiH command chain (Prlić Trial Judgment Vol. 3 §§201-260). Counterfactually, `reluctant` makes the documented foot-dragging the **player-visible posture** rather than a uniform `accept` that papers over institutional continuity.
- **Design provenance:** `agreement_text` + `balkan_battlegrounds` — the option is **historically attested as a posture** but per Foundational Decisions Packet ruling the binary `accept` / `reluctant` framing treats `accept` as the AWWV historical default and `reluctant` as a counterfactual nuance authoring the player-visible institutional drag. Phase A worksheet recommends preserving this framing per packet §4 H9 row.
- **Sensitive-history check:** Confirmed — `reluctant` authorizes no atrocity, no detention, no cleansing. The institutional foot-dragging is diplomatic-only; the cease-fire still holds (no new central-Bosnia war chain authorization). Phase D should explicitly forbid `reluctant` from re-opening `csq_hvo_central_bosnia_offensive_1993` or any H2/H5/H6/H8 row via `enables_events_runtime` — per packet §3.6 sensitive-history clause.
- **Cost floor (Phase D required):** `patron_confidence: -8` (Zagreb reads continued HR HB parallel-institution-building as friction with the U.S.-imposed framework), `alliance_lock` ceiling reduction on the RBiH-HRHB alliance (cap at ~0.65 instead of the `accept` ceiling of 0.85), `internal_cohesion: +5` HRHB (HR HB institutional base preserved). Phase D scenario testing must verify `reluctant` does not trivially dominate `accept` — the patron cost and the alliance-ceiling cost should make `accept` the dominant choice under historical-bot calibration.

## 4. Material Effects (per packet §3.3)

The H9 row is **not yet authored** in `data/scenarios/events/*.json` (only the RBiH-responding `washington_agreement_1994` exists). Phase D will author this row. Field recommendations:

- **`sets_flags`** (NEW, Phase D):
  - `accept`: `hrhb_washington_acceptance: 'accept'`, `hrhb_federation_integration: 'committed'`, `hvo_arbih_war_active: false` (mirrors RBiH-side flag clearing)
  - `reluctant`: `hrhb_washington_acceptance: 'reluctant'`, `hrhb_federation_integration: 'foot_dragging'`, `hvo_arbih_war_active: false`
- **`effects[]`** (Phase D author):
  - `accept`: `alliance_change: +0.5` (Federation alliance with RBiH), `morale_change HRHB: +5`, `cohesion_change HRHB: +10`, `supply_delta HRHB: +8` (U.S. / Croat supply pipeline opens, no longer threatened by sanctions).
  - `reluctant`: `alliance_change: +0.25`, `morale_change HRHB: 0`, `cohesion_change HRHB: +5`, `supply_delta HRHB: +3`.
- **`dimension_shifts[]`** (Phase D author):
  - `accept` HRHB: `international_standing: +20` (Washington framing as constructive), `military_credibility: +5`, `internal_cohesion: -5` (HR HB institutional base strains under Federation framework). Zagreb-patron: `patron_confidence: +15` (Zagreb credit-claims the agreement).
  - `reluctant` HRHB: `international_standing: +10`, `military_credibility: 0`, `internal_cohesion: +5`. Zagreb-patron: `patron_confidence: -8`.
- **`enables_events_runtime`** (NEW, Phase D):
  - `accept`: opens H10 `hrhb_federation_military_integration_1994` (per H10 worksheet), opens `csq_federation_joint_offensive_1994` (already in catalog as `future_consequences` opener from `washington_agreement_1994` `accept`), opens H11 `hv_expeditionary_support_1995` reachability (per H11 worksheet — sustained Federation alliance is the precondition for HV expeditionary deployment in support of HRHB).
  - `reluctant`: opens H10 (federation integration still proceeds, but with `hrhb_federation_integration: 'foot_dragging'` flag downstream events can gate against), opens H11 with same flag carried forward. Does **not** open `csq_federation_joint_offensive_1994` (foot-dragging suppresses early joint operations).
- **`closes_events_runtime`** (NEW, Phase D):
  - `accept`: closes `csq_hvo_central_bosnia_offensive_1993` (war chain definitively ended), closes any pending H2 continuation / re-escalation row that has not yet fired. Does **not** close H5/H6/H8 directly — those rows have already fired (or not) on their own triggers earlier in the run; per Gate §1.5 #11 their status is already determined at March 1994.
  - `reluctant`: closes `csq_hvo_central_bosnia_offensive_1993` (war chain still ends — `reluctant` is a posture toward the *peace*, not a continuation of *war*). Does **not** close H5/H6/H8 directly for the same reason.
- **`branch_tag`** (per packet §2.2 vocabulary; new tags required):
  - `accept` → `hrhb_washington_accept`
  - `reluctant` → `hrhb_washington_reluctant`
- **`trigger.condition`** (Phase D author): `turn_min: 102, turn_max: 102` (matching existing `washington_agreement_1994` row); `requires_events: ['croat_bosniak_war_begins_1993']`; recommend additional `requires_player_response: true`, `responding_faction: 'HRHB'`, `bot_response_logic: 'historical'`, `historical_default_response_id: 'accept'`.

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `accept`:**
  - `hrhb_federation_military_integration_1994` (H10 — see H10 worksheet)
  - `csq_federation_joint_offensive_1994` (already in catalog)
  - `hv_expeditionary_support_1995` reachability (H11 — see H11 worksheet)
  - Sets precondition flag for H10 / H11 `requires_enabled` gating
- **Opens (eligibility) — `reluctant`:**
  - `hrhb_federation_military_integration_1994` (H10) — fires but with foot-dragging flag carried
  - `hv_expeditionary_support_1995` reachability (H11)
  - Does **not** open `csq_federation_joint_offensive_1994`
- **Closes (eligibility):**
  - `accept` → closes `csq_hvo_central_bosnia_offensive_1993`, any pending H2 re-escalation
  - `reluctant` → closes `csq_hvo_central_bosnia_offensive_1993`, any pending H2 re-escalation
- **Branch-tag vocabulary** (additions to `event_families.ts`): extend `hrhb_alliance` family (or new `hrhb_washington` family — recommend extending `hrhb_alliance` to keep H1 / H1a / H9 / H10 in one family); add `hrhb_washington_accept` / `hrhb_washington_reluctant` tags.

## 6. Modal Source Notes

> "On 18 March 1994 the Croatian Republic of Herzeg-Bosnia under Krešimir Zubak signed the Washington Agreement, ending the Croat-Bosniak war and constituting the Federation of Bosnia and Herzegovina; the Vienna Framework Agreement of 26 March 1994 set the cantonal structure. Acceptance was historically reluctant — driven by U.S. sanctions threats against Croatia and transmitted to HR HB by Tuđman — per Washington Agreement text (18 March 1994), Vienna Framework (26 March 1994), ICTY Prlić IT-04-74 Vol. 3 §§120-200, and BB Vol. II pp. 451-455." (compress to ≤2-sentence modal length in Phase D.)

## 7. Open Questions

1. **Single dual-faction row vs. paired single-faction rows.** Existing `washington_agreement_1994` is RBiH-responding (B10). H9 is HRHB-responding. Phase D options: (a) author H9 as `washington_agreement_acceptance_1994_hrhb`, firing same turn; (b) restructure existing row to dual-fire. Recommend (a) for clarity, separate `historical_default_response_id`, separate dimension shifts. Defer to Technical Architect + Game Designer.
2. **Cost floor for `reluctant`.** Per packet §3.6 and the H1 / B6 precedent: Phase D should specify a `patron_confidence: -8` floor plus the alliance-ceiling cap. Phase D scenario testing must verify `reluctant` does not dominate `accept` under historical-bot calibration. Defer to Game Designer.
3. **HR HB institutional continuity carrier flag.** Per Prlić Vol. 3 the HR HB parallel institutions persisted through 1994-1995 and reemerged in Dayton. Phase D may need a `hrhb_parallel_institutions_active` boolean flag (set true by `reluctant`, false by `accept`) for downstream H12 (HRHB Dayton acceptance) and H13 (third-entity counterfactual) rows to gate on. Defer to Historian + Game Designer in Wave 2.
4. **Interaction with H7 (Zagreb orders HRHB ceasefire 1994).** H7 historically precedes the Washington signing — Tuđman's order on Boban / Zubak in February-March 1994 is the Zagreb-side decision row. Phase D sequencing: H7 fires first (turn ~98-100), sets `zagreb_orders_washington_compliance: true` flag, which becomes a prerequisite for H9 `accept` to be the historical default. If H7 player counterfactually `resist_patron`s, H9 historical-default candidate shifts to `reluctant` or `refuse` (new option). Defer to Game Designer.

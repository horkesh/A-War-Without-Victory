# Event Family Worksheet — X1: London Conference 1992

**Date:** 2026-05-27
**Family ID:** X1
**Faction scope:** cross-faction
**Source tier:** `agreement_text` (London Principles + Statement of Principles, 26-27 Aug 1992) corroborated by `icty_icj_un` (UN S/24795; Karadžić IT-95-5/18-T)
**Sensitive-history ring:** none (diplomatic-process row; outcomes already-occurred atrocities are Ring 2 in essays/codex)
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The London Conference on the Former Yugoslavia convened 26-27 August 1992, co-chaired by the European Community (Lord Carrington's successor Lord Owen) and the United Nations (Cyrus Vance), under UN/EC joint sponsorship. The conference produced a "Statement of Principles" and "Programme of Action on Humanitarian Issues" subscribed to by all parties present, including the Government of the Republic of Bosnia and Herzegovina (Izetbegović delegation), the Bosnian Serb leadership (Karadžić), the Bosnian Croat leadership, and the Federal Republic of Yugoslavia (Milošević / Panić). The Principles enumerated cessation of fighting, non-recognition of acquisitions by force, return of refugees, dismantling of detention camps, placement of heavy weapons under international supervision, and continued political negotiations through the standing International Conference on the Former Yugoslavia (ICFY) in Geneva. The signed conclusions were circulated as UN Security Council document **S/24795** (2 September 1992) (UN Secretariat transmission).

Karadžić personally signed on behalf of the self-proclaimed Republika Srpska delegation. The ICTY judgment in *Prosecutor v. Karadžić* (IT-95-5/18-T, 24 March 2016) discusses the London Conference signature in the context of the gap between Karadžić's diplomatic undertakings and the simultaneous prosecution of the cleansing campaign and camp system (Karadžić Trial Judgment, vol. I §§3324-3340 on the diplomatic record alongside the JCE findings; vol. III on the Six Strategic Goals adopted at the 12 May 1992 Bosnian Serb Assembly preceding London).

Operational implementation collapsed within weeks: the heavy-weapons placement schedule was not honored on the RS side, camps were not dismantled on the timetable agreed, and fighting continued. The conference's institutional legacy was the Geneva ICFY framework that produced Vance-Owen (Jan 1993) and Owen-Stoltenberg (Aug-Sep 1993). London is therefore properly modeled as a **diplomatic-process trigger**, not a peace-implementation outcome.

## 2. Defensible Historical/Default Option

- **Label:** `accept_principles`
- **Rationale:** All three Bosnian factions (RBiH, RS, HRHB via Croat delegation) subscribed to the Statement of Principles at London on 26-27 August 1992. Acceptance — not rejection — is the historically defensible default for every faction. Subsequent non-implementation belongs to follow-on rows (R4 camp exposure, R5 Belgrade pressure, peace-plan rows R6/B3/H3, etc.), not to a counterfactual London-rejection branch. Per packet §4 X1, this label is mandated.
- **Citation:** UN S/24795 (London Conference Statement of Principles, 2 Sept 1992); Karadžić IT-95-5/18-T Trial Judgment vol. I §§3324-3340.

## 3. Proposed Counterfactual Options

### Option: `accept`
- **Label:** `accept` (already in packet §4 X1)
- **Historical analogy:** This is a thinner-commitment variant of the historical default — the faction subscribes without the symbolic full-principles framing (less rhetorical capital staked). Plausible under reading where any Bosnian-Serb delegation might have signed only the Programme of Action on Humanitarian Issues while reserving on the political-status principles, or where the RBiH delegation could have signed reluctantly without the civic-state framing the Izetbegović delegation actually adopted.
- **Design provenance:** Counterfactual hypothesis — there is no source documenting a partial-signature scenario at London. Provenance is design-level differentiation between rhetorical commitment levels, useful as a dimension-shift dampener relative to the historical default.
- **Sensitive-history check:** Confirmed — option authorizes no atrocity, no camp, no cleansing, no hostage-taking, no civilian-targeting. Diplomatic-process branching only.

### Option: `reject` (NOT AUTHORED — see §7 Open Questions)
- Phase A worksheet does not propose `reject` because no faction historically rejected the London Principles outright on the floor. Authoring `reject` as a counterfactual would require an entry in the `csq_*` register with explicit `design_counterfactual` tier per packet §5. Defer to Game Designer.

## 4. Material Effects (per packet §3.3)

Per packet §4 X1: `dimension_shifts`. London is a process-opener, not a material-flip event.

- **`sets_flags`** (per faction option resolution): `london_principles_signed: <faction_label>` where label is `'accept_principles'` or `'accept'`. Faction-specific because each faction's delegation signed separately.
- **`dimension_shifts`** (recommended ranges for Phase D author):
  - On `accept_principles`: `international_standing: +1` (subscribing in good faith), `internal_cohesion: 0` (no domestic cost at the Aug 1992 conjuncture for any faction), `diplomatic_capital: +1`.
  - On `accept`: `international_standing: 0` (subscription noted but unenthusiastic), `diplomatic_capital: 0`.
- **`enables_events_runtime`** (downstream eligibility opens):
  - `vance_owen_engagement_1993` (pending — refers to future X2; corresponds to per-faction R6 / B3 / H3 rows)
  - `belgrade_embargo_rs_1994` (pending — refers to future R8; the diplomatic-process trail that leads to the Aug 1994 embargo runs through ICFY which London inaugurated)
- **`closes_events_runtime`**: none. Acceptance of London does not foreclose subsequent peace-plan engagement; rejection counterfactuals would, but rejection is not authored at this stage.
- **`effects[]`**: none required. The branch-tag does the work; downstream rows carry their own effects.

## 5. Downstream Opens/Closes

- **Opens (eligibility):**
  - `vance_owen_plan_engagement_1993` (composite X2; pending until X2 / R6 / B3 / H3 worksheets confirm event ids)
  - `concentration_camps_revealed_1992` follow-on response window (per R4 — already authored; London's camp-dismantlement clause increases pressure salience)
- **Closes (eligibility):** none in Phase A.
- **Branch-tag:** `diplomacy_london_subscribed` (vocabulary slot under `diplomacy_*` per packet §2.2). The `branch_tag` value distinguishes `accept_principles` (full subscription) from `accept` (thinner subscription) via `sets_flags` value, not via separate branch tags.

## 6. Modal Source Notes

> "All three Bosnian parties signed the London Statement of Principles, 26-27 Aug 1992 (UN S/24795). The principles were not implemented on the ground; the conference launched the Geneva ICFY track that produced Vance-Owen and Owen-Stoltenberg. ICTY Karadžić IT-95-5/18-T documents the gap between RS diplomatic signature and parallel cleansing." (≤2 sentences after compression.)

## 7. Open Questions

1. **Should `reject` be authored as a counterfactual option for any faction?** Not historically grounded; would require `design_counterfactual` source tier and explicit Game Designer approval per packet §5 + Foundational §2. Recommend Phase D defer until X2/X3 worksheets settle whether ICFY-track rejection has a coherent place in the branch graph.
2. **Per-faction option asymmetry.** The packet treats X1 as a single cross-faction row. Real-world London had three separate delegations signing. Phase D may need to author X1 as three rows (one per responding faction) or as a single row with faction-keyed `sets_flags`. Recommend faction-keyed flags (`london_principles_signed_rbih`, `london_principles_signed_rs`, `london_principles_signed_hrhb`) under one event row, resolved by three sequential `responding_faction` decisions. Defer to Game Designer + Technical Architect.
3. **Programme of Action on Humanitarian Issues** has independent legal weight in the camp-exposure track (R4). Phase D should confirm whether X1 acceptance materially shifts R4 evaluator weights, or whether R4 stays freestanding. Recommend freestanding R4 to keep the camp-exposure row self-contained.

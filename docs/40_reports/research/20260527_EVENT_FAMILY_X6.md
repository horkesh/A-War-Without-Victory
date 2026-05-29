# Event Family Worksheet — X6: NATO Escalation (Deny Flight → Deliberate Force)

**Date:** 2026-05-27
**Family ID:** X6
**Faction scope:** cross-faction — exogenous NATO/UN actor; engine-driven gating (no player decision at the family level per packet §4 X6)
**Source tier:** `icty_icj_un` (UN Security Council resolutions; NATO operational record summarized in UN reports) corroborated by `agreement_text` (UN-NATO MOU on close air support 1993) and by `balkan_battlegrounds` (BB1 p.532 index references "NATO" entries at BB1 pp. 423, 431-432, 454-455, 463; BB2 p.424 NATO reference)
**Sensitive-history ring:** Ring 1 (engine-consequence row; UN safe-area enforcement and air-strike compliance are already governed by the existing engine surface; X6 documents the consequence chain rather than authoring a player decision)
**Status:** Draft for Phase A review. Authored per Game Designer Wave 1 review as an engine-driven gating composite with no player decision at the family level. Per-faction decision interactions live on adjacent rows (R12 RS hostage crisis, R13 RS Deliberate Force compliance, B9 RBiH NATO ultimatum compliance) which retain their own player-decision authoring.

## 1. Cited Historical Narrative

The NATO escalation chain spanned **Operation Deny Flight (12 April 1993 – 20 December 1995)** and **Operation Deliberate Force (30 August – 14 September 1995)**, framed by a sequence of UN Security Council resolutions that progressively authorized military enforcement of UN protection mandates over Bosnian airspace and safe areas. The chain is canonically authored as a sequence of engine-driven gates because the NATO/UN actors are exogenous to the three playable factions and their decisions are not player decisions; the player's interaction is with the downstream consequences (offensive_ops_suppression, equipment_quality_modifier, narrative pressure on adjacent faction decisions).

**Phase 1 — No-Fly Zone authorization (Oct 1992):** UN Security Council Resolution 781 (9 October 1992) established a ban on military flights in Bosnian airspace. Initial monitoring by NATO AWACS without enforcement authority. UNSCR 786 (10 November 1992) extended monitoring.

**Phase 2 — Deny Flight enforcement (April 1993 onward):** UN Security Council Resolution 816 (31 March 1993) authorized enforcement of the no-fly zone "by all necessary measures" under Chapter VII. NATO launched Operation Deny Flight on **12 April 1993**, providing armed enforcement of the no-fly zone. UNSCR 836 (4 June 1993) authorized NATO to provide close air support (CAS) to UNPROFOR in defense of UN-declared safe areas (Srebrenica, Žepa, Goražde, Bihać, Sarajevo, Tuzla — designated under UNSCR 819 and UNSCR 824, April-May 1993).

**Phase 3 — First combat engagements (1994):** On **28 February 1994** NATO F-16s shot down four Bosnian Serb J-21 Jastreb aircraft over Banja Luka — the first combat engagement in NATO's history. This is the existing `nato_shoots_down_planes_1994` event in `war_1994.json`. Following the **5 February 1994 Markale market massacre in Sarajevo**, NATO issued the **9 February 1994 Sarajevo Heavy Weapons Exclusion Zone (HWEZ) ultimatum** demanding withdrawal of Bosnian Serb heavy weapons (≥82mm) within 20 km of Sarajevo by 20 February 1994 — the existing `nato_ultimatum_sarajevo_1994` event in `war_1994.json`. Limited CAS strikes against Bosnian Serb targets occurred at Goražde (10-11 and 16 April 1994) and Sarajevo (5 August 1994).

**Phase 4 — Hostage crisis suspension (May-June 1995):** Following limited NATO strikes on Bosnian Serb ammunition dumps at Pale (25-26 May 1995), the Bosnian Serb Army seized **377 UNPROFOR personnel and military observers as hostages**, holding them at Bosnian Serb military targets (ammunition depots, Pale parliament building, the bridges of Pale and Ilijaš) as human shields. Hostages were released in phases between 2 June and 18 June 1995 after FRY-mediated negotiations. The hostage crisis is the existing `un_hostage_crisis_1995` event in `war_1995.json`. Air strikes were de facto suspended during the hostage period. The corresponding faction-decision is R12 (RS hostage crisis response) which retains its own player-decision authoring.

**Phase 5 — Srebrenica fall and Deliberate Force trigger (July-August 1995):** Srebrenica fell to the VRS Drina Corps on **11 July 1995**; Žepa fell **25 July 1995**. The **28 August 1995 Markale market massacre (second)** killed 43 in Sarajevo; on **30 August 1995** NATO launched **Operation Deliberate Force** — a sustained air campaign against Bosnian Serb military infrastructure (command and control, air defense, ammunition storage, lines of communication) lasting until **14 September 1995**. The operation flew over 3,500 sorties and conducted ~750 strike missions over its 12 active days. UNSCR 1004 (12 July 1995) and the **London Conference 21 July 1995** (UK-French-US foreign ministers) authorized the escalated response framework. The existing `nato_deliberate_force_1995` event in `war_1995.json` is the runtime anchor. The corresponding RS faction-decision is R13 (RS Deliberate Force compliance — `withdraw_heavy_weapons` vs. `absorb_strikes_hold_position`).

**Phase 6 — Compliance and de-escalation (September 1995):** Holbrooke shuttle diplomacy combined with Deliberate Force pressure produced the **14 September 1995 Patriarch Pavle agreement** (Holbrooke / Milošević / Karadžić / Mladić) committing the Bosnian Serb side to heavy-weapons withdrawal from the Sarajevo HWEZ; air strikes suspended on 14 Sep, formally ended on 20 Sep 1995. UNSCR 1031 (15 December 1995) terminated Deny Flight following Dayton. The compliance branch is R13 historical default `withdraw_heavy_weapons`.

The Karadžić IT-95-5/18-T Trial Judgment vols. III and IV cover the NATO escalation chain in its strategic context, including the hostage-crisis as part of the JCE evidentiary record. UN reports (S/1995/444 on Srebrenica safe-area events, S/1995/1031 on Dayton implementation, and the formal UN-NATO MOU communications) document the legal authorization sequence. BB1 p.532 index lists "NATO" references at pp. 423, 431-432, 454-455, 463 covering the operational chronology. BB2 p.424 references NATO in the 1995 campaign context.

## 2. Defensible Historical/Default Option (Engine-Driven Gating, No Family-Level Player Decision)

X6 is an **engine-driven gating composite**, not a faction-keyed decision row. Per packet §4 X6 explicit framing ("composite — engine-driven gating") and per Game Designer Wave 1 review, X6 does not author a player decision at the family level. Instead, the chain is realized through:

- **Existing engine surfaces:** `state.military.offensive_ops_suppressions` (already wired per packet §1 baseline), `state.military.equipment_quality_modifiers` (already wired per packet §1 baseline), `state.military.event_flags` (already wired).
- **Existing event rows that are not faction-decision rows:** `nato_shoots_down_planes_1994` (consequence/notification), `nato_ultimatum_sarajevo_1994` (consequence/notification with RBiH compliance decision B9 split out), `nato_deliberate_force_1995` (consequence/notification with RS compliance decision R13 split out), `un_hostage_crisis_1995` (consequence/notification with RS decision R12 split out).
- **Adjacent per-faction decision rows that retain player decisions:** R12 (RS hostage crisis), R13 (RS Deliberate Force compliance), B9 (RBiH NATO HWEZ compliance). These rows are authored on their own worksheets in Wave 2.

X6 worksheet therefore documents the **consequence chain** that NATO escalation produces in state, plus the cross-references to the adjacent faction-decision rows that materially interact with it. There is no "X6 historical default option" — the historical default is the engine-driven chronological progression conditional on the upstream state predicates (Markale massacres, safe-area conditions, hostage taking, etc.).

- **Combined citation:** UN Security Council Resolutions 781, 786, 816, 819, 824, 836, 1004, 1031; NATO Operation Deny Flight (12 April 1993 – 20 December 1995); NATO Operation Deliberate Force (30 August – 14 September 1995); UN S/1995/444 (Srebrenica); London Conference 21 July 1995; Karadžić IT-95-5/18-T Trial Judgment vols. III-IV; BB1 pp. 423, 431-432, 454-455, 463; BB2 p.424.

## 3. Proposed Counterfactual Options (Not Authored at X6 Level)

Per packet §4 X6 framing, X6 does not author counterfactuals at the family level. The plausible counterfactuals live on the adjacent faction-decision rows:

- **R12 counterfactual `maintain_hostages`:** Already inventoried under R12 in the v1.3 packet, with Ring 1/2 framing (response to existing state of hostage-taking, not authorization of new hostage-taking — per packet §3.6).
- **R13 counterfactual `absorb_strikes_hold_position`:** Already inventoried under R13. Material effect: `equipment_quality_modifier` degradation through extended Deliberate Force exposure; potential `offensive_ops_suppression` extension; downstream Dayton acceptance becomes more constrained.
- **B9 counterfactual `defy_ultimatum_hwez`:** Already inventoried under B9. (Note: B9 corresponds to the RBiH-side decision on the Feb 1994 HWEZ ultimatum, not an RS decision. RBiH compliance is the historical posture.)

X6 worksheet does not duplicate these counterfactuals; it documents the consequence chain they slot into.

- **Design provenance:** X6 is canonically an engine-driven row per packet §4. Authoring a "X6 family-level player decision" would either (a) collapse three distinct faction-decision rows (R12, R13, B9) into one, violating the per-faction event-shape rule from Wave 1, or (b) author a meta-decision for the NATO/UN actor, which is not a playable faction. Both are out of scope per packet §3.5 and §4.
- **Sensitive-history check:** Ring 1 — engine consequence. No new option authorized at X6 level; the existing engine surface and adjacent faction rows govern all material consequences. No rupture predicates implicated at X6 (rupture predicates bind on emergent state conditions; X6 documents the consequence wiring, not the predicates themselves).

## 4. Material Effects (per packet §3.3) — Consequence Chain Documented, Not Authored at X6 Level

X6 does not author effects at the family level. The consequence chain is realized through existing engine surfaces and existing event rows. This section documents the chain for Phase D wiring of the adjacent faction-decision rows (R12, R13, B9) and for the existing event rows (`nato_*`, `un_hostage_crisis_1995`, `deliberate_force_rs_compliance_1995`).

### Consequence chain (engine-driven, per packet §1 baseline)

- **Phase 1-2 (Deny Flight authorization → enforcement):**
  - Engine sets `state.military.offensive_ops_suppressions[<rs_air_combat>]` — RS air assets become operationally constrained per UNSCR 816. Already an engine-level mechanism, not a new authoring artifact.
  - No `dimension_shifts` at family level; per-faction shifts (e.g., RS `international_standing` adjustments) happen on adjacent rows that read the NATO-active flag.

- **Phase 3 (First combat engagements, Feb 1994):**
  - `nato_shoots_down_planes_1994` (existing event in `war_1994.json`) fires as a consequence/notification when the trigger conditions (turn ≥w90 corresponding to late Feb 1994 plus state predicates) are met. Effect: `offensive_ops_suppression` extended; `equipment_quality_modifier` on RS air assets degraded; flag `nato_combat_enforcement_active: true` written.
  - `nato_ultimatum_sarajevo_1994` (existing event) fires post-Markale as a consequence/notification; RBiH-side compliance decision B9 fires as a player-decision row with its own options.

- **Phase 4 (Hostage crisis, May-June 1995):**
  - `un_hostage_crisis_1995` (existing event) fires as a player-decision row for RS (R12). Historical default `release_gradually`; counterfactual `maintain_hostages` carries Ring 1/2 framing.
  - During hostage state, engine de facto suspends NATO CAS authorization via flag `nato_strikes_suspended_hostages: true` (engine writes; no faction can author this flag directly).

- **Phase 5 (Deliberate Force, Aug-Sep 1995):**
  - `nato_deliberate_force_1995` (existing event in `war_1995.json`) fires as a consequence/notification when upstream predicates are satisfied (Srebrenica fell, second Markale, hostages released). Effect: `state.military.offensive_ops_suppressions[<rs_offensive_ops>]` (heavy suppression on RS offensive operations during the campaign window); `equipment_quality_modifiers[<rs_command_control>]` (degradation of RS C2 infrastructure); flag `nato_deliberate_force_occurred: true` written.
  - Adjacent RS compliance decision: `deliberate_force_rs_compliance_1995` (existing event in `war_1995.json`; corresponds to R13). Player-decision row with `withdraw_heavy_weapons` (historical) vs. `absorb_strikes_hold_position` (counterfactual). Counterfactual extends the suppression window and degrades RS equipment further.

- **Phase 6 (Compliance + Dayton):**
  - On R13 `withdraw_heavy_weapons`, engine clears `offensive_ops_suppressions[<rs_offensive_ops>]` after the campaign window, leaving residual `equipment_quality_modifier` degradation; Dayton entry conditions (X9) become reachable.
  - On R13 `absorb_strikes_hold_position`, suppressions extended; Dayton entry conditions still eventually reachable (Holbrooke shuttle is independent of R13 outcome) but with deeper RS damage.

### Flag substrate (per packet §1 baseline)

- `nato_combat_enforcement_active: true` — set by Phase 3 event(s); read by adjacent faction rows for RS `international_standing` and recruitment shifts.
- `nato_strikes_suspended_hostages: true` — set by Phase 4 hostage state; cleared on R12 resolution.
- `nato_deliberate_force_occurred: true` — set by Phase 5 event firing. Already referenced in `consequences.json` (`csq_alternative_nato_trigger_1995`).
- `nato_deliberate_force_alt_path: true` — already in `consequences.json` for the counterfactual-trigger path (e.g., Deliberate Force triggered by alternative predicate than the historical Markale-2 + Srebrenica-fall composite).

### What X6 does NOT author

- No new `EventDefinition` rows.
- No new `EventResponseOption` rows.
- No new `enables_events_runtime` / `closes_events_runtime` arrays.
- No new flags. X6 is documentation of the chain that other rows realize.

## 5. Downstream Opens/Closes (Consequence Chain Endpoints)

- **Opens (eligibility):**
  - Adjacent faction-decision rows: R12, R13, B9 (each gated by its own upstream predicates documented on its own worksheet).
  - Dayton entry conditions (X9 — reachable through both R13 historical and counterfactual paths, with different state cost).
  - `csq_early_nato_threshold_1994` (existing consequences-family row referenced via `early_nato_threshold_1994` flag).
  - `csq_alternative_nato_trigger_1995` (existing consequences-family row referenced via `nato_deliberate_force_alt_path` flag).
- **Closes (eligibility):**
  - X6 itself closes nothing at the family level. Adjacent rows may foreclose specific downstream predicates (e.g., R13 counterfactual extends suppression window).
- **Branch-tag:** `intervention_nato` (per packet §2.2 vocabulary slot `intervention_nato`). X6 itself does not produce sub-tags; sub-tags are produced by the adjacent faction-decision rows (R12, R13, B9) and by the existing consequences-family rows.

## 6. Modal Source Notes

X6 does not produce a player-facing modal at the family level (engine-driven gating). The existing event rows (`nato_shoots_down_planes_1994`, `nato_ultimatum_sarajevo_1994`, `un_hostage_crisis_1995`, `nato_deliberate_force_1995`, `deliberate_force_rs_compliance_1995`) carry their own modal source notes per their authored row content. The X6 worksheet provides the canonical chronology and citation backbone for those rows.

For the adjacent faction-decision rows (R12, R13, B9) the modal source notes will be authored on the per-row worksheets in Wave 2 and Phase D.

> Cross-reference modal text for R13 (Deliberate Force compliance): "NATO Operation Deliberate Force (30 Aug – 14 Sep 1995) conducted sustained air strikes on Bosnian Serb military infrastructure following the second Markale market massacre (28 Aug 1995) and the fall of Srebrenica (11 Jul 1995) and Žepa (25 Jul 1995). The Patriarch Pavle agreement of 14 Sep 1995 ended the campaign on Bosnian Serb compliance with heavy-weapons withdrawal from Sarajevo HWEZ (Karadžić IT-95-5/18-T vols. III-IV; UN S/1995/444)."

## 7. Open Questions

1. **No player decision at family level — confirmed authoring shape.** Resolved per Game Designer Wave 1 review: X6 is engine-driven gating; no player decision is authored at the X6 family level. Per-faction decision interactions live on R12, R13, B9 rows. X6 worksheet documents the consequence chain for Phase D wiring of those adjacent rows.
2. **Existing event rows are not duplicated by X6.** The catalog already contains `nato_shoots_down_planes_1994`, `nato_ultimatum_sarajevo_1994`, `un_hostage_crisis_1995`, `nato_deliberate_force_1995`, `deliberate_force_rs_compliance_1995`. X6 treats these as the runtime instruments and provides the chronology/citation backbone. Phase D should not author new NATO/UN events at X6 — extensions belong on the adjacent faction-decision rows (R12, R13, B9) per Wave 2 worksheets.
3. **`offensive_ops_suppressions` and `equipment_quality_modifier` magnitudes.** Phase D wiring of R13 `absorb_strikes_hold_position` counterfactual needs Game Designer + Modern Wargame Expert sign-off on the magnitude of additional suppression and equipment degradation relative to historical `withdraw_heavy_weapons`. The historical path produces residual equipment degradation; the counterfactual must produce a strictly deeper degradation to make the historical default rational under bot calibration. Defer magnitude calibration to Phase C/D.
4. **Hostage crisis sensitive-history framing.** Per packet §3.6, `un_hostage_crisis_1995 → maintain_hostages` is a response-to-existing-state crisis (RS already took the hostages historically; player decision is whether to release or hold), not authorization of new hostage-taking. The existing R12 framing must preserve this distinction; the counterfactual is not authoring new sensitive acts, only changing the duration / consequence of an existing one. Re-confirm with Historian + Game Designer in Phase D.
5. **Composite NATO-active flag predicates.** Adjacent faction rows that read `nato_combat_enforcement_active: true` (1994+) or `nato_deliberate_force_occurred: true` (Aug 1995+) need clear documentation of which flag is the gate for which predicate. Phase D should author a flag-state diagram in `event_taxonomy_report.ts` output covering the NATO chain. Defer to Technical Architect + diagnostics owner.
6. **UNPROFOR / safe-area framework relationship to X6.** Packet §4 X7 (UN safe-areas system) is the adjacent engine-driven row covering UNSCR 819/824/836 safe-area declarations. X6 (NATO action) and X7 (safe-area framework) are tightly coupled — NATO CAS authorization under UNSCR 836 binds to the safe-area declarations under UNSCR 819/824. Phase D wiring should treat X6 and X7 as coordinated engine-driven gating without authoring overlap. Defer to Game Designer + Technical Architect for X6/X7 boundary clarification.

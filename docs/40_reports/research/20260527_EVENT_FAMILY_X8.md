# Event Family Worksheet — X8: Holbrooke / 51:49 Halt (Oct 1995)

**Date:** 2026-05-27
**Family ID:** X8
**Faction scope:** cross-faction (composite — RS comply + Federation `comply` vs `push_further`)
**Source tier:** `agreement_text` + `corroborated_participant` (Holbrooke memoir *To End a War*; UN S/1995/999; BB Vol. II Ch. 15) corroborated by `icty_icj_un` (Karadžić IT-95-5/18-T)
**Sensitive-history ring:** none (diplomatic-process row; no atrocity, camp, or civilian-targeting content)
**Status:** Draft for Phase A review. **Author with `A (live-state gated per Foundational packet)` discipline — see §3 caveat and §7 open questions.**

## 1. Cited Historical Narrative

In early October 1995, the combined Federation (ARBiH 5th Corps from the Bihać pocket + ARBiH 7th Corps from central Bosnia + HV/HVO from the southwest) was advancing rapidly into RS-held western Bosnia following the success of Operations Storm (4-7 Aug 1995, HV in Krajina) and Mistral 2 (8-15 Sep 1995, HV/HVO in southwestern Bosnia), under cover of NATO's Operation Deliberate Force air campaign (30 Aug - 14 Sep 1995). The advance had taken Drvar, Bosansko Grahovo, Glamoč, Šipovo, Jajce, Donji Vakuf, Mrkonjić Grad, and was within ~25 km of Banja Luka, the RS political-military capital. (BB Vol. II Ch. 15, pp. 503-548; Karadžić IT-95-5/18-T Trial Judgment vol. III §§5876-5910 on RS battlefield collapse Sep-Oct 1995.)

US envoy Richard Holbrooke, leading the Dayton shuttle since August 1995, intervened on **5 October 1995** in Belgrade and Sarajevo to halt the Federation advance. His framing in *To End a War* (1998, pp. 192-208) was twofold: (a) further Federation gains beyond ~51% of pre-war Bosnia territory would jeopardize the Contact Group's `51:49` partition framework that had been the negotiated baseline since July 1994; (b) taking Banja Luka risked a humanitarian catastrophe with 200,000+ Serb civilians fleeing, triggering Belgrade re-entry and possibly collapsing the Dayton track entirely. (Holbrooke 1998, pp. 192-208; UN S/1995/999 covers the October ceasefire transmission framework; BB Vol. II Ch. 15.)

The Federation accepted the halt. A **general ceasefire** took effect on **12 October 1995** (some sources cite 10 October as the agreement date and 12 October as the effective date). The Bosnian Serb side complied because the alternative was continued collapse — by early October, RS forces had already accepted the post-Deliberate Force heavy-weapons withdrawal (R13 historical `withdraw_heavy_weapons`) and Belgrade had cut RS supply since the August 1994 embargo (R8 historical `negotiate`). RS compliance with the halt was the rational outcome of multiple prior compliances, not a fresh decision on this row — packet §4 R14 marks RS Holbrooke / Belgrade channel as `comply_with_belgrade` (already wired as the R14 historical default). The X8 family's *new* decision content sits on the **Federation side**, where the existing event row `us_halts_federation_advance_1995` (war_1995.json) authors `comply` / `push_further` as historical default vs counterfactual. (Holbrooke 1998 pp. 192-208; BB Vol. II Ch. 15 pp. 536-548; UN S/1995/999.)

Holbrooke's framing of Banja Luka risk and the 51:49 line is the diplomatic-narrative substrate. **Whether the simulation's October 1995 game-state actually realized Banja Luka reach, 51:49 territorial percentages, or the specific captures Holbrooke described is a live-state-engine matter, not a historical assertion.** Per Foundational packet, the X8 row carries `A (live-state gated)` source priority for this reason: the underlying agreement-text record is Tier A, but any modal copy or downstream effect that *asserts* Banja Luka reach or 51:49 realization must be gated on engine-state predicates that the 188-week scenario proof confirms — not on calendar turn alone.

## 2. Defensible Historical/Default Option (Composite Framing)

X8 is a **composite**, not a single-decision row in the X2/X3 mold. The historical default is the joint outcome:

- **RS (R14) historical default:** `comply_with_belgrade` (already at R13/R14 — packet §4 R14 marks `comply_with_belgrade` as historical default). RS compliance with the October ceasefire is overdetermined by prior compliance with Deliberate Force heavy-weapons withdrawal (R13) and the Belgrade embargo negotiation (R8). No fresh decision content at the X8-Federation moment.
- **Federation/RBiH historical default:** `comply` (already authored on `us_halts_federation_advance_1995` row, war_1995.json:1277). RBiH historically accepted the halt on Holbrooke's framing of Banja Luka risk and the 51:49 line.
- **HRHB:** packet §4 does not place HRHB as a separate X8 decision row. HRHB participation in the October ceasefire was via the Washington Agreement / Federation framework (X5 / H9). H7 (Zagreb orders HRHB ceasefire 1994) is the upstream HRHB-side authority-channel row; HRHB October 1995 compliance flows through that channel under Tudjman direction. Phase D may or may not author a separate HRHB-side X8 row; recommend rolling HRHB compliance into the Federation `comply` resolution via responding_faction handling on `us_halts_federation_advance_1995`.

- **Citation:** Holbrooke 1998 *To End a War* pp. 192-208; UN S/1995/999 (October 1995 ICFY/Contact Group transmission); BB Vol. II Ch. 15 pp. 536-548; Karadžić IT-95-5/18-T Trial Judgment vol. III §§5876-5910.

## 3. Proposed Counterfactual Options (Composite Branch Flow)

X8 does not author a fourth options set. Per packet §4 X8: historical/default `comply` + counterfactual `push_further`. The composite framing reads three flags (R14 + B-Federation X8 response + H7 upstream) together.

### Composite outcome matrix

| RS (R14) | RBiH / Federation X8 | HRHB upstream (H7) | Composite branch | Branch tag |
|---|---|---|---|---|
| `comply_with_belgrade` | `comply` | `acknowledge_pressure` | **Historical**: October 1995 ceasefire takes effect; Dayton track opens; advance halts on whatever line the engine state shows at halt-fire. | `holbrooke_halt_accepted` |
| `comply_with_belgrade` | `push_further` | `acknowledge_pressure` | **Counterfactual A**: Federation defies Washington and presses past the halt-fire moment. Patron pressure on RBiH spikes; international standing collapses; Dayton track at risk; RS may exploit US-RBiH friction to delay further compliance. Live-state-gated whether actual battlefield gain is possible. | `holbrooke_halt_rejected_by_federation` |
| `defy_us_framework` | `comply` | `acknowledge_pressure` | **Counterfactual B**: Pale defies Belgrade and the US framework, refusing the ceasefire. Federation accepts the halt unilaterally; RS continues operations; RS supply chain collapses faster; live-state-gated whether RS can sustain. | `holbrooke_halt_rejected_by_rs` |
| `defy_us_framework` | `push_further` | `acknowledge_pressure` | **Counterfactual C**: Both sides defy the halt. War continues through Dayton window. Likely path: NATO re-escalates; Banja Luka risk and Belgrade re-entry both materialize. | `holbrooke_halt_collapses` |
| `comply_with_belgrade` | `comply` | `resist_patron` | **Counterfactual D**: HRHB defies Zagreb on the ceasefire. Patron-pressure on HRHB intensifies; Federation cohesion strained at the moment of negotiation-pivot; alliance_lock damaged. Live-state-gated whether HVO can sustain independent advance. | `holbrooke_halt_hrhb_defects` |

- **Historical analogy (counterfactual A):** Plausible at the contingency level — Holbrooke himself recorded that Izetbegović considered pushing further (Holbrooke 1998 pp. 199-203). The decision was politically narrow. The historical bot calibration row stays on `comply`.
- **Historical analogy (counterfactual B):** Plausible but less politically close — Karadžić-Mladić by October 1995 lacked operational means to defy. Documented as RS internal-debate trace in Karadžić IT-95-5/18-T vol. III.
- **Design provenance:** All counterfactuals are defensible hypotheses, not likelihood claims. Historical bot calibration follows the historical row (`comply_with_belgrade` / `comply` / `acknowledge_pressure`).
- **Sensitive-history check:**
  - Counterfactuals A, B, D — confirmed clear of Ring 1/2/3 violations. No atrocity, camp, cleansing, hostage, or civilian-targeting authorization.
  - Counterfactual C (`holbrooke_halt_collapses`) — sensitive only insofar as continued combat near Banja Luka could trigger civilian-displacement modeling on the RS Serb-civilian side. This is engine-driven displacement, not authored civilian-targeting, and is consistent with REAL_WAR_MASTER framing. No Ring rule violation; flag for Narrative Designer review on Codex / Chronicle prose so the Banja Luka civilian-displacement scenario is not framed as a player-rewarded "exodus lever."
- **Live-state-gate constraint (REPEATED):** No modal copy, no `effects[]`, no `effect.text`, no `notifications_to_other_factions` body on any counterfactual may *assert* Banja Luka capture, 51:49 realization, or specific RS-held OSID reach. The Holbrooke memoir framing is *narrative substrate*; the engine state at fire-time determines what is true on the map. Phase D authoring must follow Foundational packet line 58 verbatim: "Runtime text must not assert captures, 51/49 realization, or Banja Luka reach unless state predicates prove it."

## 4. Material Effects (per packet §3.3)

Effects flow through three separate decision rows (R14 + the existing `us_halts_federation_advance_1995` Federation row + H7-upstream HRHB compliance posture). X8 itself does not author effects directly.

### Per-faction row effects (referenced from R14, existing `us_halts_federation_advance_1995`, and H7)

- **R14 `comply_with_belgrade` (historical):**
  - `sets_flags`: `rs_holbrooke_response: 'comply_with_belgrade'`
  - `dimension_shifts`: `patron_pressure: -1` (Belgrade leverage spent; RS yielded), `international_standing: +1` (RS compliance reduces sanctions risk at the negotiation pivot), `internal_cohesion: -1` (Pale-Mladić split tension — see R11)
  - `enables_events_runtime`: `dayton_talks_begin_1995` (already authored)
  - `closes_events_runtime`: `csq_prolonged_war_track` (pending — refers to counterfactual consequences family)

- **`us_halts_federation_advance_1995` `comply` (historical — already authored):**
  - Already wired: dimension_shifts `international_standing: +10`, `negotiating_leverage: +10`; `morale_change: -3`; `aggression_modifier: -0.2` for 12 turns on both RBiH and HRHB; `sets_flags: advance_halted: true`
  - Recommended Phase F addition: `enables_events_runtime: ['dayton_talks_begin_1995']` (already gated via `requires_events`); `closes_events_runtime: []` (the `push_further` counterfactual closes the Dayton track, not `comply`)

- **`us_halts_federation_advance_1995` `push_further` (counterfactual — already authored):**
  - Already wired: `morale_change: +5`; `negotiation_capital -20`; `patron_pressure +15`; dimension_shifts `international_standing: -15`, `territorial_legitimacy: +10`; `aggression_affinity: 0.8`; `risk_level: 0.9`
  - Recommended Phase F addition: `closes_events_runtime: ['dayton_talks_begin_1995', 'dayton_signed_1995']` (the counterfactual forecloses the Dayton track as authored). **GATE CHECK:** Phase D author must verify that this closure is correct — historically Dayton talks did begin despite Holbrooke pressure pivots; the `push_further` counterfactual closure assumes Banja Luka push collapses Dayton, which is a Holbrooke-memoir claim, not a documented counterfactual outcome. Recommend Game Designer review whether `push_further` *delays* rather than *forecloses* Dayton.

- **H7 `acknowledge_pressure` (historical — upstream from X8):**
  - Already framing in packet §4 H7 — `comply_with_belgrade`-equivalent on the Zagreb-HRHB channel.
  - No new effects on X8; H7 historical resolution is the precondition that allows HRHB Federation participation in the X8 halt without HRHB-specific decision content.

### Composite branch-tag derivation

When `rs_holbrooke_response: 'comply_with_belgrade'` AND `us_halts_federation_advance_1995 = comply` AND `hrhb_zagreb_ceasefire_response: 'acknowledge_pressure'` (historical row), the composite tag `holbrooke_halt_accepted` is derived. Downstream events (X9 Dayton entry conditions, R15 RS Dayton acceptance, B13 RBiH Dayton acceptance, H12 HRHB Dayton acceptance) gate on this composite via `trigger.condition.flag_equals` reading the three flags together.

When the composite resolves to `holbrooke_halt_rejected_by_federation` (counterfactual A), the X9 Dayton-entry-conditions composite is **delayed** (not necessarily foreclosed — see §7 open question 2). When the composite resolves to `holbrooke_halt_collapses` (counterfactual C), the X9 Dayton-entry-conditions composite is foreclosed and the war continues into the December 1995 window via a `csq_*` consequence row.

## 5. Downstream Opens/Closes

- **Opens (eligibility):**
  - `dayton_talks_begin_1995` (already authored; already gated on `federation_ground_offensive_1995`)
  - `dayton_signed_1995` (already authored; gates on `dayton_talks_begin_1995`)
  - `ceasefire_1995` (already authored; gates on `federation_ground_offensive_1995`)
- **Closes (eligibility):**
  - Historical composite: none in Phase A.
  - Counterfactual A `holbrooke_halt_rejected_by_federation`: candidate closure of `dayton_talks_begin_1995` *or* delay-only — defer to Game Designer (Open Question 2).
  - Counterfactual C `holbrooke_halt_collapses`: candidate closure of `dayton_talks_begin_1995`, `dayton_signed_1995`, `ceasefire_1995`; would open a `csq_prolonged_war_track` consequences-family row (pending).
- **Branch-tag:** `diplomacy_holbrooke_halt` (proposed new vocabulary slot). Sub-tags per composite outcome as listed in §3 matrix. Phase A worksheet locks this into the branch-tag vocabulary file.

## 6. Modal Source Notes

> "On 5 October 1995, US envoy Richard Holbrooke pressed the Federation to halt its northwestern advance to preserve the Contact Group 51:49 territorial framework and to avoid a Banja Luka humanitarian and diplomatic crisis. The ceasefire took effect 12 October 1995; the Dayton talks opened later that month (Holbrooke 1998 pp. 192-208; UN S/1995/999; BB Vol. II Ch. 15 pp. 536-548)." (≤2 sentences after compression.)

**LIVE-STATE GATE for modal copy:** The historical-context paragraph above is acceptable as *background narration* citing Holbrooke's framing. Any forward-looking modal phrasing — describing what the player's halt or push-further would mean *for the player's current game state* — must use phrasing like "preserve current territorial gains," "continue the northwestern offensive at the cost of US backing," etc., NOT "secure Banja Luka," "complete the 51:49 line," or "consolidate the western pocket." The current event-row text on `us_halts_federation_advance_1995` (`"...take Banja Luka and negotiate from maximum strength..."`) already brushes this line; Phase D Holbrooke-row revision should be reviewed for live-state-gate compliance.

## 7. Open Questions

1. **LIVE-STATE GATE RECAP (REQUIRED).** Per Foundational packet, X8 carries `A (live-state gated)` source priority. The Holbrooke memoir + UN + BB framing of Banja Luka risk and 51:49 line is **diplomatic-narrative substrate**, not an assertion of game-state truth. Any modal copy, `effect.text`, `effects[]`, `dimension_shifts`, or `notifications_to_other_factions` body must NOT assert (a) Federation captures specific RS-held OSIDs through Phase F authoring, (b) the 51:49 territorial percentage has been realized in the current scenario state, or (c) Banja Luka is within Federation reach. Forward-looking modal phrasing must remain agnostic to current game-state and reference only the *diplomatic decision* (halt vs push) and its *political-cost trade-off* (US backing, patron pressure, dimension shifts). Phase D authoring must wire a focused 188-week scenario proof gate before any Phase F X8 commit. **This recap is non-negotiable — Foundational packet line 58 is the authority.**
2. **`push_further` closure semantics: foreclose vs delay.** The existing `us_halts_federation_advance_1995 → push_further` counterfactual is currently authored with `risk_level: 0.9` and dimension-shift damage but no `closes_events_runtime` arrays. The X8 worksheet recommends adding closures, but historical analysis suggests `push_further` more plausibly *delays* Dayton rather than *forecloses* it (Dayton would still be the international pivot after a Banja Luka collapse — Holbrooke pp. 199-203 is ambiguous). Recommend Game Designer + Historian decide between (a) close `dayton_talks_begin_1995` outright, (b) push `dayton_talks_begin_1995` `turn_min` forward by a turn delta, or (c) gate Dayton on a counterfactual `csq_prolonged_war_track` resolution. Defer.
3. **HRHB-side authoring at X8.** Packet §4 X8 does not explicitly carve HRHB as a separate decision row. H7 (Zagreb orders HRHB ceasefire 1994) is the authority-channel substrate. Phase D may need a faction-keyed HRHB compliance decision at the X8 moment if HRHB autonomy on the October 1995 ceasefire is design-relevant. Recommend faction-keyed `sets_flags` on the existing `us_halts_federation_advance_1995` row rather than a separate row. Defer to Game Designer.
4. **Composite tag derivation: engine read-time vs writer materialization.** Same question as X7. Recommend on-read derivation in `getX8CompositeState()` reading R14 + `us_halts_federation_advance_1995` response + H7 flags together. Defer to Technical Architect.
5. **Counterfactual C civilian-displacement narrative.** If `holbrooke_halt_collapses` fires and the Federation continues advancing on Banja Luka, engine-driven civilian displacement modeling may produce a 200,000+ Serb-civilian outflow. The Codex / Chronicle / Cost Ledger narration of this outcome must avoid framing the displacement as a player-rewarded "exodus lever" per Ring 2 narrative discipline. Defer to Narrative Designer for Phase F.

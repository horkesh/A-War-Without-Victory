# Event Family Worksheet — B12: RBiH Reintegration of Serb / Croat Minorities in ARBiH

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_minority_reintegration` (matches §4.2 row B12 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Tier B — `balkan_battlegrounds` + `corroborated_participant` (Divjak record) plus `icty_icj_un` (UN A/54/549) corroboration.
**Sensitive ring:** None at the family level. Recruitment / retention mechanic; no atrocity surface engaged. Downstream Cost Ledger and Codex framing must use historical voice per B1 §6 considerations.
**Existing catalog row:** No standalone authored row. B12 is a downstream consequence of B1 = `civic` and lives in recruitment / retention engine state plus narrative metadata referenced by `csq_minority_defections_1992`, `csq_civic_identity_consolidation_1993`, and adjacent rows.
**Follow-on of:** B1 (`rbih_state_identity` = `civic`). Per packet §4.2 row B12: "follow-on of B1 civic". No new historical decision row at the family level — this is a downstream consequence.

---

## 1. Family Classification

Per packet §4.2 row B12, B12 is a **follow-on of B1 civic**. The row is `n/a` for counterfactual options and `n/a` for "historical/default candidate" — meaning B12 is not a player-facing decision but a recruitment / retention consequence chain that becomes active when B1 resolves as `civic` (the historical default) and reduces when B1 resolves as `bosniak_national` (counterfactual).

**There is no new historical decision row at the B12 family level.** Phase A's job for B12 is to document the historical record of Serb and Croat minority participation in ARBiH, identify the engine surfaces that already deliver the consequence (recruitment_modifier, retention semantics, ARBiH composition diagnostics), and propose Phase D scaffolding to wire B1's flag write to those surfaces with auditable provenance.

This worksheet does not propose elevating B12 to a player-facing decision. The historical Sarajevo Presidency did not "decide" reintegration as a separable act distinct from the civic platform; reintegration was the operational expression of the civic platform B1 records. Authoring B12 as a decision would create a fake-flexibility surface (player asked to "approve" a consequence of an earlier already-made decision) and would mis-frame the relationship between the civic platform and ARBiH composition.

---

## 2. Historical Narrative

### 2.1 ARBiH composition baseline

ARBiH formed in April-May 1992 from integration of TO units, civilian police, and emergent armed formations. Its composition through 1992-1995 reflected the civic platform B1 records as historical default. The widely-cited approximate composition figures for June 1992 are **70% Bosniak, 18% Croat, 12% Serb** (cited in B1 worksheet §1; original figure attributed to ARBiH Main Staff records and reproduced in Balkan Battlegrounds Vol. I).

These figures evolved through the war. By late 1993 and into 1994, after the Croat-Bosniak war (H5 chain) and the formal separation of HVO from ARBiH integration plans, the Croat percentage fell. Serb retention in ARBiH was more sustained — the Independent 81st Division at Goražde retained Serb soldiers throughout the war (Goražde-defender corrections, memory record), and the Sarajevo-area defense continued to include Serb officers and soldiers through 1995.

### 2.2 Divjak record (corroborated participant)

General **Jovan Divjak** is the canonical corroborated-participant evidence that the civic platform was operationally real. Divjak — a Serb general — served as deputy commander of the ARBiH Main Staff from 1992 through the end of the war, sustained service through Sarajevo's siege, and his on-record account of ARBiH composition and the Sarajevo defense is corroborated by BB I/II, by Karadžić TJ narrative cross-references, and by the UN Secretary-General's investigative reporting. Divjak's "flower arrangement" phrasing about the Sarajevo defense — his characterization that the multi-ethnic ARBiH at Sarajevo was a deliberate political choice, not a coincidence — is the canonical participant evidence that B12's reintegration mechanic was historical reality, not retrospective construction.

Divjak is not a unique example. Other named Serb and Croat ARBiH officers documented in BB and ICTY records include officers in the 1st Corps (Sarajevo) and the Goražde defense; Croat officers and soldiers served throughout 1st and 7th Corps; the El Mujahid detachment's integration into 3rd Corps is a separate (non-minority) integration story documented in Hadžihasanović and Kubura TJ. The Divjak record is the *highest-visibility* corroborated participant, not the *only* one.

### 2.3 UN A/54/549 corroboration

The UN Secretary-General's report on Srebrenica, **A/54/549** (15 November 1999), describes Sarajevo's 1992-1995 posture in terms that presume — and document — ARBiH's multi-ethnic composition as a constitutive feature of the Republic's defense. The report's framing of the diplomatic and military posture of the Sarajevo government, particularly through the Srebrenica enclave chronology, references the civic-republican baseline that B1 records and that B12's reintegration mechanic operationalizes.

A/54/549 does not provide specific composition percentages but does corroborate the policy-level characterization that minority retention in ARBiH was a deliberate and sustained feature of Sarajevo's posture, contrasted with the explicitly ethnic-national framing of RS / VRS and the Croat-national framing of HRHB / HVO institutional bases.

### 2.4 Counterfactual: B1 = bosniak_national

If B1 resolves as `bosniak_national` (the counterfactual narrower-national framing), the historical analogy that grounds B12 narrows. The historical record contains no example of an ARBiH that successfully retained Serb and Croat soldiers in significant numbers under an explicitly Bosniak-national platform — the platform's *avowal* of narrower ethnic identification is precisely what would have triggered the minority defections that `csq_minority_defections_1992` models. Phase D wiring must therefore make B12's reintegration *yield* asymmetric on B1's branch flag: full effect on `civic`, partial effect on `pragmatic` (the unavowed hybrid), minimal-or-negative effect on `bosniak_national`.

### 2.5 Historical outcome

ARBiH retained meaningful Serb and Croat participation throughout 1992-1995, with the Sarajevo and Goražde defenses as the highest-visibility evidentiary anchors. The composition shifted through the war but the civic-republican baseline was sustained as Sarajevo's diplomatic posture through Dayton.

---

## 3. Defensible Historical Default

Because B12 is a **follow-on of B1 civic** rather than a player decision, the "historical default" framing applies to the *engine-driven downstream state* that activates once B1 resolves as `civic`.

**Label:** Engine-driven follow-on (no `Historical default` modal label applies — B12 is not a player-facing decision).
**Provenance:** Tier B + Tier A corroboration. ARBiH composition figures (BB I), Divjak record (corroborated participant), UN A/54/549, with Karadžić TJ paras. 32 / 48 / 50 narrating the civic platform that B1 records.

`Blocked` does not apply.

### 3.1 Why B12 is not a player-facing decision

Phase A explicitly affirms packet §4.2 row B12's `follow-on of B1 civic` framing. Elevating B12 to a player-facing decision would:
- Create a fake-flexibility surface ("approve reintegration?") whose answer is determined by B1's already-resolved value.
- Mis-frame minority retention as a *separable* policy when it was the operational expression of B1's civic platform.
- Risk a counterfactual that the historical record cannot ground (a B1 = `civic` Sarajevo that then "decides against" minority retention has no historical analogy and would invent a posture neither faction adopted).

Phase A's recommendation: B12 stays a downstream consequence row family, not a decision family.

---

## 4. Counterfactual Options

Per packet §4.2 row B12, counterfactual options are `n/a`. There is no player-facing alternative authored.

The branching that *does* occur at B12 happens via B1's branch flag:
- B1 = `civic` → B12 follow-on activates at full yield (Divjak-grounded baseline).
- B1 = `pragmatic` → B12 follow-on activates at reduced yield (the unavowed hybrid retains some minority participation but with reduced cohesion).
- B1 = `bosniak_national` → B12 follow-on activates at minimal-or-negative yield; `csq_minority_defections_1992` becomes eligible per B1 §5 runtime causality.

This is not a counterfactual *at B12* — it is B12 reading B1's flag and scaling its effect accordingly.

---

## 5. Material Effects (per §3.3 of the Runtime Semantics Packet)

### 5.1 No existing authored row

There is no standalone B12 row in `data/scenarios/events/*.json`. Minority retention consequences are currently delivered through:
- B1's authored material consequences (cohesion shifts, recruitment modifiers per Phase D additions in B1 worksheet §4.2).
- `csq_minority_defections_1992` (presentation metadata referenced from B1's `future_consequences[]` on the `bosniak_national` branch).
- `csq_civic_identity_consolidation_1993` (presentation metadata referenced from B1's `civic` branch).
- Engine-side recruitment / retention state that consumes the B1 flag through any Phase D wiring.

### 5.2 Phase D additions (deferred — proposals only)

These are *proposals* for Phase D authoring; nothing is being changed by this worksheet.

- **Option A (recommended): Engine-driven follow-on, no new event row.** B1's flag write (`rbih_state_identity = 'civic' | 'bosniak_national' | 'pragmatic'`) becomes the substrate for an engine-side `recruitment_modifier` and `retention_modifier` on ARBiH minority composition. No new JSON row. B12 lives entirely in the engine-side downstream behavior triggered by B1's flag.
- **Option B (alternate): Author B12 Codex / Records visibility rows.** A *set* of presentation-only rows that fire conditionally on B1's branch flag and write Codex / Records text (e.g. `arbih_multiethnic_composition_documented_1993` on `civic`; the existing `csq_minority_defections_1992` already partly covers the `bosniak_national` branch). Flag-gated `trigger.condition`. No player response required.
- **Option C (do both):** Engine-side follow-on per Option A plus Codex visibility per Option B. Phase A recommends this combination if Phase D has the authoring budget.

Material effects (regardless of Option A/B/C):
- `recruitment_modifier(RBiH, minority_baseline, +)` on B1 = `civic` — sustains the Divjak-grounded composition baseline.
- `recruitment_modifier(RBiH, minority_baseline, neutral or modest +)` on B1 = `pragmatic` — partial sustainment.
- `recruitment_modifier(RBiH, minority_baseline, -)` on B1 = `bosniak_national` — defection / non-retention dominates.
- `retention_modifier(RBiH, serb_croat_officers, +)` on B1 = `civic` — Divjak-class officer retention.
- `cohesion_change(RBiH, +)` on B1 = `civic` reinforcing the civic platform's operational reality.
- Optionally `dimension_shift(RBiH, internal_cohesion, +small)` on the visibility row, reinforcing B1's authored `internal cohesion -5` on `civic` (which Phase D may wish to reconsider given B12's positive grounding).

No new `effect.kind` is required for Option A. Option B requires only existing presentation `effects`.

### 5.3 Calibration constraint

Phase D must not allow B12's positive yield on `civic` to flip the net incentive structure of B1 such that `civic` becomes a dominance-risk option versus `pragmatic` or `bosniak_national`. B1's existing authoring has `civic` at +15 international_standing / -5 internal_cohesion / +10 negotiating_leverage; if B12 adds a recruitment_modifier and retention bonus, the net `civic` position must still be defensibly historical (high international standing, moderate internal cohesion) rather than overwhelmingly dominant. Game Designer to calibrate.

---

## 6. Runtime Causality Targets (per §3.3)

Because B12 is a follow-on rather than a decision, runtime causality applies asymmetrically:

| Trigger | Action | Branch flag substrate |
| --- | --- | --- |
| B1 resolves as `civic` | Engine-side: recruitment_modifier +, retention_modifier +, optionally enable B12 Codex visibility row(s) | `event_flags.rbih_state_identity = 'civic'` |
| B1 resolves as `pragmatic` | Engine-side: partial recruitment / retention; optionally enable a "civic in name only" visibility row | `event_flags.rbih_state_identity = 'pragmatic'` |
| B1 resolves as `bosniak_national` | Engine-side: recruitment_modifier -, retention_modifier -; `csq_minority_defections_1992` becomes eligible per B1 §5 | `event_flags.rbih_state_identity = 'bosniak_national'` |

There is no `closes_events_runtime` candidate for B12. B12 *consumes* B1's flag write; it does not produce its own flag for downstream events to consume.

Note (per B1 worksheet §5): "B1 should not directly `closes_events_runtime` B12 (minority retention) or other reintegration chains. Minority retention emerges from the flag-gated downstream rows above plus engine-driven recruitment/retention shifts, not from a direct close on B1." This worksheet affirms that boundary — B12 lives downstream of B1's flag substrate, not as a row that B1 directly opens or closes.

---

## 7. Sensitive-History Ring (per Gate §1)

- **Family ring:** None at the option level. B12 is a recruitment / retention mechanic, not an atrocity authorization.
- **Downstream ring concerns:** Phase D copy on the `bosniak_national` branch must not frame minority outflow as advantageous for RBiH (Gate §3 #5 — atrocity-efficiency prohibition by analogy). Counterfactual register applies per B1 §6: if `bosniak_national` triggers ahistorical minority outflow, narration is historical-voice recording, not celebratory or minimizing. Phase D copy on the `civic` branch must not frame minority retention as a "diversity bonus" or optimization lever — the Divjak record is canonical participant evidence, not a game-mechanical reward.
- **Gate §3 paramilitary surface:** Not engaged.
- **Gate §4 Cost Ledger wording:** Endgame narration tied to B12 should reference the civic-republican baseline by historical voice (BB I + Divjak + UN A/54/549) rather than as a tactical achievement. Narrative Designer in Phase D.

---

## 8. Citations and Sources

### Tier A — icty_icj_un
- **UN A/54/549** (Secretary-General's report on Srebrenica, 15 November 1999) — §§ on Sarajevo's 1992-1995 posture corroborating the civic-republican baseline that grounds ARBiH multi-ethnic composition.
- **Karadžić Trial Judgement** (ICTY IT-95-5/18-T, 24 March 2016), paras. 32, 48, 50 — civic-republican platform contrasted with SDS partition platform (cross-reference from B1 worksheet §7).

### Tier B — balkan_battlegrounds and corroborated_participant
- **Balkan Battlegrounds Vol. I** — ARBiH June 1992 composition figures (~70% Bosniak / 18% Croat / 12% Serb). Exact page citation needs Balkan Battlegrounds extractor confirmation (carried forward from B1 worksheet §8 open question 4).
- **Balkan Battlegrounds Vol. II** — Federation-era ARBiH composition continuity through 1994-1995, particularly 1st Corps (Sarajevo) and Goražde defense.
- **General Jovan Divjak** — on-record corroborated participant. ARBiH Main Staff deputy commander, Serb officer, sustained ARBiH service April 1992 – Dayton. Canonical "flower arrangement" framing of Sarajevo's multi-ethnic defense. Corroborated by BB I/II and Karadžić TJ narrative cross-references.
- **Independent 81st Division (Goražde)** — defender-correction record in MEMORY.md identifies the unit as the Goražde defender (not the 5th Corps as misattributed in earlier engine seeds); the unit's Serb retention is documented in BB II and in ICTY narrative on the Goražde enclave.

### Canonical references
- **`data/scenarios/events/war_1992.json` → `rbih_state_identity`** — B1's row. B12's flag substrate is `event_flags.rbih_state_identity`.
- **B1 worksheet §5** — runtime causality framing for the minority-retention chain. B1 explicitly defers B12 wiring to B12's own worksheet (this one).

### Forbidden
- Wikipedia is not cited as a primary source per Gate §6 and Foundational packet §5.
- Anecdotal participant accounts without corroboration are not cited. The Divjak record is cited because it is corroborated by BB I/II and Karadžić TJ; uncorroborated memoirs are excluded.

---

## 9. Open Questions for Canon Compliance / Game Designer Review

1. **Author B12 as Codex rows or leave it engine-side?** Phase A's recommendation is Option C (engine-side follow-on plus Codex visibility rows), but Game Designer + Product Manager should confirm authoring budget for Phase E (RBiH state identity / reintegration branch per packet §6 Phase E). If only one option ships, Option A (engine-side only) is the minimum viable interpretation of packet §4.2 row B12's `follow-on of B1 civic` framing.
2. **Recruitment / retention engine surface.** Phase A proposes `recruitment_modifier` and `retention_modifier` reading B1's flag. Confirm that these are existing engine state (or `effect.kind` already in the packet's authorized list) rather than net-new surfaces. Technical Architect / Gameplay Programmer ruling needed.
3. **Calibration ceiling on `civic`.** B12's positive yield on `civic` must not flip B1's net incentive structure into a dominance-risk shape (per §5.3). Game Designer must lock the yield values such that `civic` remains historically defensible without becoming a strictly dominant option versus `pragmatic` / `bosniak_national`.
4. **ARBiH composition exact-page citations from BB I.** Carried forward from B1 §8 open question 4. The 70/18/12 figures need exact BB I page references from the Balkan Battlegrounds extractor before Phase D / Phase E authoring. The Historian should not pre-commit to specific page numbers without extractor confirmation.
5. **Coordination with B7 (Sarajevo siege response) and B8 (RBiH-Abdić relationship).** Both are downstream of B1 + B12 (see packet §6 Phase E goal: "Wire B1 (state identity) to B12 (minority retention) and B7/B8 (enclave / Abdic) where defensible"). Phase E author should ensure B12's engine surface does not conflict with B7's enclave-resilience surface or B8's APWB alliance surface.
6. **Composition diagnostic exposure.** Should the ARBiH composition figures be exposed to the player through a Codex entry, a Records page, or an in-modal text-only reference on B1? Phase A defers to UI/UX Developer + Narrative Designer in Phase E.

---

## 10. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B12 of the runtime-semantics packet as `follow-on of B1 civic`.
- [x] Historical narrative documented with Tier A + Tier B citations (UN A/54/549, Karadžić TJ, BB I + II, Divjak corroborated-participant record, Independent 81st Division Goražde).
- [x] No new historical decision row proposed at the family level — affirmed packet §4.2 row B12 framing.
- [x] No counterfactual options proposed (B12 reads B1's branch flag rather than offering its own).
- [x] Material effects mapped to §3.3; Phase D / Phase E options A/B/C proposed.
- [x] Runtime causality framed as B1-flag-gated downstream; no new `closes_events_runtime` proposed; B1 explicitly does not directly `enables_events_runtime` B12 (boundary affirmed from B1 §5).
- [x] Sensitive ring: none at family level. Modal copy register preserved per B1 §6 considerations and Gate §3 #5 (atrocity-efficiency prohibition by analogy applies to the `bosniak_national` minority-outflow framing).
- [x] Coordination noted with B7, B8, and Phase E goals.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

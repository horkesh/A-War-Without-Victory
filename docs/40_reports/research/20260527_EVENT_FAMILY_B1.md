# Event Family Worksheet — B1: RBiH State Identity (1992)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_state_identity` (matches §4.2 row B1 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Mixed — `icty_icj_un` for state-continuity context, `balkan_battlegrounds` + `corroborated_participant` for ARBiH composition.
**Sensitive ring:** None at the option level. Downstream consequences may touch minority retention; those rows carry their own ring classification.
**Existing catalog row:** `data/scenarios/events/war_1992.json` → `rbih_state_identity` (do not edit in this slice).

---

## 1. Historical Narrative

Between the 1 March 1992 independence referendum (boycotted by the SDS) and the 6 April 1992 European Community recognition, the Sarajevo Presidency under Alija Izetbegović inherited the SR Bosnia and Herzegovina state apparatus and the dominant political question of what kind of republic it would defend. The platform debated through April and May 1992 — drafted in continuity with the 1990 multi-party Presidency and ratified de facto when defensive mobilization began — framed the Republic of Bosnia and Herzegovina as a multi-ethnic civic state in which Bosniak, Croat, and Serb citizens held equal status. The ICTY, summarizing the prewar and early-war record in *Prosecutor v. Karadžić* (IT-95-5/18-T) and again in the ICJ's *Application of the Genocide Convention (Bosnia and Herzegovina v. Serbia and Montenegro)* (Judgment, 26 February 2007), treats the civic-republican framing as the documented Sarajevo position against the SDS partition platform.

The civic platform was contested inside SDA from the outset. A nationally narrower current — visible in the 1970 Islamic Declaration, in wartime SDA internal debates, and reconstructed in Western academic commentary corroborated by ICTY case law — pressed for a more explicitly Bosniak-national framing of the war effort. Izetbegović's documented public stance through 1992 stayed civic; the *Karadžić* Trial Judgement summarizes the SDA's official wartime platform as defending the constitutional Republic against partition, not as a Bosniak-national project (Karadžić TJ paras. 32, 48, 50).

The civic claim was not abstract. ARBiH's June 1992 composition — recorded in Balkan Battlegrounds Vol. I and corroborated by Jovan Divjak's on-record participant account (a Serb general serving as deputy commander of ARBiH's Main Staff) — was approximately 70% Bosniak, 18% Croat, 12% Serb. Divjak's well-known "flower arrangement" phrasing about the Sarajevo defense and his continued ARBiH service through the war are the canonical corroborated-participant evidence that the civic framing was operationally real, not merely rhetorical, in 1992. The UN Secretary-General's 1999 Srebrenica report (A/54/549) inherits this characterization when describing pre-1993 Sarajevo's diplomatic and military posture.

**Historical outcome:** civic platform adopted, defended publicly throughout 1992, and held as Sarajevo's diplomatic baseline through Geneva, Vance-Owen, Owen-Stoltenberg, Washington, and Dayton.

---

## 2. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id (matches existing JSON):** `civic`.
**Defensibility:** Tier B (`balkan_battlegrounds` + corroborated participant) with Tier A (`icty_icj_un`) context. Karadžić TJ paras. 32, 48, 50 fix the platform; ARBiH composition + Divjak fix operational reality; ICJ 2007 confirms the state-continuity framing.

`Blocked` does not apply — the historical default is well-sourced and not a Ring 3 surface.

---

## 3. Counterfactual Options

Two counterfactual options, both already authored in the existing JSON row. Both are `design_counterfactual` at the option-design level but each has a documented historical current to draw on. Neither asks the player to authorize abuse; both are political/identity framings.

| Option id | Label | Provenance | Tier |
| --- | --- | --- | --- |
| `bosniak_national` | Bosniak national state | Historical current inside SDA (1970 Islamic Declaration, wartime SDA internal debates, ICTY narrative of SDA platform tensions). The counterfactual is: Sarajevo formally adopts the narrower national framing in May 1992 instead of holding the civic line. | C (counterfactual with Tier A/B analogy) |
| `pragmatic` | Civic in word, Bosniak in deed | No clean historical exemplar of a *publicly avowed* hybrid; the design counterfactual models a posture observable in some wartime SDA institution-building decisions but never declared as policy. Honest label: `Counterfactual staff path` if elevated; currently authored as a third response without an explicit `historical_marker`. | C |

The existing JSON row labels only `civic` with `historical_marker: 'historical_default'`. The two counterfactuals lack `historical_marker` fields; Phase A's recommendation is to add `historical_marker: 'counterfactual'` to both during the Phase D authoring slice (out of scope for this worksheet).

**Cost floor (Phase D required) — `pragmatic`:** Phase D authoring MUST include either a `negotiating_leverage` dimension penalty or a `recruitment_modifier` ceiling that prevents `pragmatic` from dominating `civic` across morale + cohesion + international_standing simultaneously. Per Game Designer Wave 1 review: "currently net-positive on three axes with no offsetting cost — this is dominance-risk." Recommended starting calibrations: `negotiating_leverage: -10` (Sarajevo's hybrid posture is read by ICFY Co-Chairmen as incoherent, reducing leverage at Geneva/New York), OR `recruitment_modifier: 0.85x` (the unavowed Bosniak-in-deed posture partially deters Serb and Croat reservist retention without the cohesion gain that an avowed `bosniak_national` line yields). Final values gated by Phase D scenario testing.

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

The existing JSON row already carries material consequences sufficient for the modal-readiness gate. This worksheet inventories them and flags Phase D additions.

### 4.1 Already authored (no change in Phase A)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` | `future_consequences[]` |
| --- | --- | --- | --- | --- |
| `civic` | `morale_change(RBiH, +3)` | `rbih_state_identity: 'civic'` | int'l standing +15, internal cohesion -5, negotiating leverage +10 | `csq_civic_identity_consolidation_1993` (conditional) |
| `bosniak_national` | `morale_change(RBiH, +5)`, `alliance_change(-0.1)` | `rbih_state_identity: 'bosniak_national'` | internal cohesion +15, int'l standing -20, negotiating leverage -10 | `csq_minority_defections_1992`, `csq_bosniak_unity_1993`, `csq_international_disillusionment_1993` (all conditional) |
| `pragmatic` | `morale_change(RBiH, +2)` | `rbih_state_identity: 'pragmatic'` | internal cohesion +5, int'l standing +5 | `csq_pragmatic_coalition_1993` (conditional) |

### 4.2 Phase D additions (deferred — proposed only)

These are *proposals* for Phase D authoring; nothing is being changed by this worksheet.

- Add `recruitment_modifier(RBiH)` on `bosniak_national` reflecting the loss of Serb/Croat reservists (corroborated by ARBiH composition + Divjak record).
- Add `branch_tag: 'rbih_civic' | 'rbih_bosniak' | 'rbih_pragmatic'` per §2.2 once `event_families.ts` vocabulary lands in Phase B.
- The downstream consequence rows (`csq_minority_defections_1992`, `csq_bosniak_unity_1993`, `csq_international_disillusionment_1993`, `csq_pragmatic_coalition_1993`, `csq_civic_identity_consolidation_1993`) currently fire from presentation metadata only. Phase D may promote them via `enables_events_runtime` keyed off `event_flags.rbih_state_identity` equal to the option's `sets_flags` value, per §3.3.

No new `effect.kind` is required.

---

## 5. Runtime Causality Targets (per §3.3)

This worksheet *proposes* the following Phase D wiring; it does not author it. All targets are events that currently exist as presentation `opens_events` references in the JSON row's `future_consequences[]` blocks (loader-validated dangling-ref check).

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate (§3.3) |
| --- | --- | --- | --- |
| `civic` | `csq_civic_identity_consolidation_1993` | (none) — civic does not foreclose Bosniak or pragmatic downstream rows; those rows are gated by their own `trigger.condition: flag_equals rbih_state_identity = bosniak_national` / `pragmatic` and will simply never become eligible | `event_flags.rbih_state_identity = 'civic'` |
| `bosniak_national` | `csq_minority_defections_1992`, `csq_bosniak_unity_1993`, `csq_international_disillusionment_1993` | (none — symmetric reason) | `event_flags.rbih_state_identity = 'bosniak_national'` |
| `pragmatic` | `csq_pragmatic_coalition_1993` | (none — symmetric reason) | `event_flags.rbih_state_identity = 'pragmatic'` |

Phase D author must verify each downstream row's `trigger.condition` uses `flag_equals` against `rbih_state_identity` and matches the option's `sets_flags` value (§3.3 alignment rule).

Note: B1 should not directly `closes_events_runtime` B12 (minority retention) or other reintegration chains. Minority retention emerges from the flag-gated downstream rows above plus engine-driven recruitment/retention shifts, not from a direct close on B1.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Option-level ring:** None. All three options are political/identity framings; none authorizes any sensitive act.
- **Downstream ring concerns:** `csq_minority_defections_1992` may touch displacement-adjacent state. If Phase D wiring writes effects that reduce minority recruitment, those effects must remain in Ring 1 modeled-mechanically state (recruitment modifier, dimension shift); no new prose may frame minority loss as advantageous for RBiH (Gate §3 #5 — atrocity-efficiency prohibition by analogy). Counterfactual register applies (§5 of the Gate): if `bosniak_national` triggers ahistorical minority outflow, narration is historical-voice recording, not celebratory or minimizing.
- **Gate §3 paramilitary surface:** Not engaged. B1 does not authorize war crimes. The only player-facing war-crime authorization surface remains `paramilitary_policy` (B2's domain).

---

## 7. Citations and Sources

### Tier A (`icty_icj_un`)
- **Karadžić Trial Judgement** (ICTY IT-95-5/18-T, 24 March 2016), paras. 32, 48, 50 — Sarajevo Presidency civic-republican platform vs. SDS partition platform.
- **ICJ, *Application of the Genocide Convention (Bosnia and Herzegovina v. Serbia and Montenegro)*** (Judgment, 26 February 2007), §§ Historical Background — state-continuity framing of the Republic of Bosnia and Herzegovina and recognition timeline.
- **UN A/54/549** (Secretary-General's report on Srebrenica, 15 November 1999), §§ on 1992 Sarajevo posture — corroborating the civic baseline through international diplomatic interactions.

### Tier B (`balkan_battlegrounds`, `corroborated_participant`)
- **Balkan Battlegrounds Vol. I** — ARBiH June 1992 composition figures; platform debate operational context. Citation forms: BB I p.6-8 (peace-plan diplomatic context); BB I pp. covering ARBiH formation chapters for composition (Historian: confirm exact pages from KB before Phase D authoring).
- **Jovan Divjak** — on-record participant: ARBiH Main Staff deputy commander, Serb officer, sustained ARBiH service 1992-1995. Corroborated by BB I/II and Karadžić TJ narrative cross-references.

### Tier C
- No design-counterfactual sources beyond what is needed for `pragmatic` provenance (see §3).

### Forbidden
- Wikipedia is not cited as a primary source per Gate §6 and Foundational packet §5. Tier B is sufficient for ARBiH composition.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **`pragmatic` historical_marker.** The third option currently lacks a `historical_marker`. Phase D proposal is `counterfactual`. Game Designer to confirm whether `pragmatic` should instead be elevated to `staff_recommendation` (no design provenance for a *declared* hybrid posture) or stay an unmarked counterfactual.
2. **Branch-tag vocabulary.** Should the three tags be `rbih_civic` / `rbih_bosniak` / `rbih_pragmatic`, or should `pragmatic` be folded under one of the other two for branch-state purposes? Canon Compliance to rule before `event_families.ts` is authored.
3. **B1 → B12 wiring.** B12 (minority retention) is currently described in the inventory as "follow-on of B1 civic." Phase A recommends that B12 stays a flag-gated downstream event rather than a direct `enables_events_runtime` target from B1, but this needs Game Designer confirmation when B12's own worksheet is authored.
4. **ARBiH composition page citations.** BB I exact-page citations for the 70/18/12 composition figures need confirmation from the Balkan Battlegrounds extractor before Phase D authoring. The current row's `historical_source` field cites the figure without a page number; Phase D should tighten this.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B1 of the runtime-semantics packet.
- [x] Historical default identified with Tier A/B citations.
- [x] Counterfactual options inventoried with provenance.
- [x] Material effects mapped to §3.3.
- [x] Runtime causality targets proposed (Phase D-deferred).
- [x] Sensitive ring classified at option and downstream levels.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

# Event Family Worksheet — B6: Bihać 5th Corps Offensive (1994)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `bihac_5th_corps_offensive_1994` (matches §4.2 row B6 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5 / Source Standards):** Tier B primary — Balkan Battlegrounds Vol. II is acceptable for operational chronology, control, and campaign context. Tier A corroboration where the row touches the Abdić / APWB political-fracture record.
**Sensitive ring:** None at the option level. Operational/posture decision; no atrocity authorization surface engaged. Downstream APWB rupture has its own authoring track (B8).
**Existing catalog row:** referenced by packet §4.2 B6; B6 is currently a Phase A authoring candidate (status to be confirmed by Phase D author in `data/scenarios/events/war_1994.json`).

---

## 1. Historical Narrative

By summer 1994 the **ARBiH 5th Corps**, under General Atif Dudaković and headquartered in Bihać, occupied a paradoxical strategic position. On one hand, the Bihać pocket — the northwestern ARBiH enclave covering Bihać, Cazin, and Bosanska Krupa — was the most isolated ARBiH formation in the country, cut off from the main ARBiH theatre by RS (Banja Luka VRS) territory to the east and by RSK (Krajina Serb) territory to the west, supplied only through the **RSK-controlled UNPROFOR corridor** and the Croat HVO. On the other hand, the 5th Corps was militarily intact, well-organized, and through 1993–1994 grew into one of the most combat-effective ARBiH formations relative to its enemies' local capability (BB II coverage of the Bihać pocket chronology).

The Bihać political position was complicated by the **Fiket Abdić split**. Abdić, a popular Cazin-Bosanska Krajina politician and former member of the RBiH Presidency, had on **27 September 1993** declared the **Autonomous Province of Western Bosnia (APWB / Autonomna Pokrajina Zapadna Bosna)** with its centre at Velika Kladuša, in defiance of the Sarajevo Presidency and in functional cooperation with the RS and RSK leadership. The 5th Corps' loyalty to Sarajevo made it the principal ARBiH counter-force against APWB. The political position of the 5th Corps in 1994 was therefore not just operational — it was the principal armed expression of the Sarajevo line against an internal Bosniak political fracture.

In the **summer-autumn 1994** window the 5th Corps undertook a **major offensive** against both APWB to the north (Velika Kladuša theatre) and VRS positions on the eastern/southern perimeter of the pocket. The offensive's high-water mark came in late October 1994, when 5th Corps forces — pushing into Grabež and toward Bosanska Krupa, while simultaneously overrunning APWB-held Velika Kladuša — sent Abdić's forces and Bosniak civilian sympathizers across the border into RSK territory in flight (BB II Bihać 1994 chronology, roughly BB II pp. 406-417 region).

The offensive provoked a strong VRS / RSK / "APWB" counter-attack in **November–December 1994**, with VRS forces under General Manojlo Milovanović and RSK forces under General Mile Mrkšić jointly pressing the 5th Corps back from its advance. The counter-offensive nearly broke the Bihać pocket; Abdić's APWB was restored to Velika Kladuša. The crisis was contained only by **NATO air action** (combat-air-patrol expansion under UNSCR 958 of 19 November 1994, NATO Operation Deny Flight engagement, and limited close-air-support on 21 November 1994 against Udbina airfield).

**Historical outcome (RBiH):** `press_offensive` — the 5th Corps did press the 1994 offensive despite its isolated and politically fractured position, achieved a deep advance, was then largely rolled back by the joint counter-attack, and survived only via NATO intervention. The offensive's strategic value lay primarily in eliminating (briefly) the APWB rear threat and in catalyzing the international decision tree that would lead to Operation Storm (August 1995) and Operation Mistral / Sana (September 1995) the following year.

---

## 2. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id:** `press_offensive`.
**Defensibility:** Tier B (BB II) with Tier A corroboration (UN-record on the Bihać November 1994 crisis: UNSCR 958, NATO/UN coordination on the November 21 Udbina close-air-support action). The October 1994 5th Corps advance and the November–December 1994 counter-attack are documented in BB II's dedicated Bihać 1994 coverage (roughly BB II pp. 406-417 region; Phase D to tighten exact citations).

`Blocked` does not apply at the historical-default level.

---

## 3. Counterfactual Options

Three counterfactual options. All are `design_counterfactual` at the option-design level. Two of the three (`consolidate_defend` and `accept_ceasefire_terms`) carry a **Phase D-required cost floor** per Game Designer Wave 1 review on packet v1.1 edit 13 — the cost floor reflects the political position of the 5th Corps as the principal armed expression of the Sarajevo line against the Abdić/APWB split. Without a cost floor, the counterfactuals would trivially dominate `press_offensive` (cheaper supply, cheaper morale, no rollback risk) — see §3.6 boundary concern in §8 Open Question 1.

| Option id | Label | Provenance | Tier |
| --- | --- | --- | --- |
| `consolidate_defend` | Hold the perimeter; do not press into Grabež or against APWB | Counterfactual reflecting a defensive-only 5th Corps posture in 1994. Historical analogy: the 5th Corps' actual 1993 posture (pre-APWB-declaration) was substantially more defensive; the counterfactual asks whether a return to that posture in 1994 — post-APWB-declaration — was viable. **Phase D cost floor required.** | C |
| `seek_negotiation` | Open direct talks with APWB and indirect talks with RS/RSK on a Bihać-pocket ceasefire | Counterfactual without a clean historical exemplar at the 5th Corps level. Sarajevo-Pale negotiation channels existed at the federal level; a Bihać-pocket-local ceasefire was not seriously pursued by the Sarajevo Presidency or by Dudaković. The counterfactual draws on the broader 1994 ceasefire-attempt pattern (Carter Christmas truce of 23 December 1994 came too late and at a federal level). | C |
| `accept_ceasefire_terms` | Accept the November/December 1994 ceasefire on the counter-attackers' terms (territorial concession to APWB at Velika Kladuša; halt of all 5th Corps offensive operations) | Counterfactual at the moment of the November–December 1994 crisis. The historical record (BB II) treats the crisis as resolved by NATO intervention, not by accepted ceasefire terms; the counterfactual asks whether the 5th Corps survives the crisis by political concession instead of by air-power escalation. **Phase D cost floor required.** | C |

### 3.1 Phase D cost floor (required per packet v1.1 edit 13 / Game Designer Wave 1)

Per Game Designer Wave 1 review on packet v1.1 edit 13:

> "R7 worksheet must specify counterfactual cost floor preventing `override_assembly` from dominating the historical default; **B6 worksheet must specify alliance_lock or recruitment cost preventing `accept_ceasefire_terms` / `consolidate_defend` from trivially dominating `press_offensive`.**"

Phase A recommends the following cost floors. Final values gated by Phase D scenario testing.

**Option `consolidate_defend` cost floor:**
- `alliance_lock(RBiH-APWB-tolerated): -10` — a defensive-only 5th Corps posture is read by APWB as Sarajevo tolerating the APWB existence; this softens the Sarajevo line on the internal Bosniak fracture and reduces the political-cost-of-defection for other potential Abdić-style splits later (the cost floor is recruitment-bleed via APWB-style alternative loyalty).
- `recruitment_modifier(RBiH 5th Corps): 0.90x` — defensive-only posture without an APWB liquidation reduces 5th Corps political momentum and recruit-flow; the 5th Corps' actual 1994 recruitment was driven in part by the offensive-momentum narrative against APWB.
- Net effect: `consolidate_defend` survives the immediate-1994 counter-attack with lower casualties, but pays the cost via APWB persistence and weakened 5th Corps political-recruit posture going into 1995.

**Option `accept_ceasefire_terms` cost floor:**
- `alliance_lock(RBiH-APWB-recognized): -20` — accepting a ceasefire that cedes Velika Kladuša to APWB amounts to functional recognition of the APWB split; this is the most-expensive cost on the alliance/internal-cohesion axis the packet allows for a non-Ring-3 row.
- `recruitment_modifier(RBiH 5th Corps): 0.80x` — accepting ceasefire terms on the counter-attackers' terms is read by the 5th Corps cadres as a Sarajevo betrayal at the moment of crisis; recruitment and retention drop sharply for the remainder of 1994 and into 1995.
- `internal_cohesion(RBiH): -10` — the Sarajevo Presidency loses standing with its non-Bihać corps for accepting an internal-fracture-recognizing ceasefire.
- Net effect: `accept_ceasefire_terms` survives the immediate-1994 crisis with no NATO escalation, but pays the cost via permanent APWB legitimization, sharply weakened 5th Corps capability going into Operation Storm 1995, and federation-level cohesion damage.

**Option `seek_negotiation`** does not require a cost floor per the v1.1 edit-13 directive (the edit names only `accept_ceasefire_terms` and `consolidate_defend`). However Phase D should consider a smaller cost — `alliance_lock(RBiH-APWB-tolerated): -5`, `negotiating_leverage: -3` — because *seeking* talks at the 5th Corps level (without accepting terms) signals to APWB and RS that Sarajevo's military pressure is conditional. Game Designer to rule.

### 3.2 Effect-direction discipline

No option may carry a "prevent rollback" or "prevent 5th Corps collapse" framing as a rewarded outcome. The 5th Corps' historical near-collapse in November–December 1994 was a real cost of the historical `press_offensive` decision; counterfactual options should not be framed as averting that cost without paying their own.

No new ruptures are added. No row authorizes any sensitive act.

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

B6 is a Phase A authoring candidate; this worksheet inventories the proposed Phase D shape.

### 4.1 Proposed Phase D authoring

| Option | `effects[]` (proposed) | `sets_flags` (proposed) | `dimension_shifts` (proposed) | `future_consequences[]` (proposed) |
| --- | --- | --- | --- | --- |
| `press_offensive` | `supply_drain(RBiH 5th Corps, +)`, `morale_change(RBiH 5th Corps, +5)` (offensive-momentum), then on counter-attack: `casualty(RBiH 5th Corps, +)` | `bihac_5th_corps_1994_response: 'press_offensive'` | internal_cohesion +5 (APWB liquidation), international_standing +2 (NATO engagement consequence), negotiating_leverage +2 | opens `csq_apwb_resurgence_1994` (counter-attack restored APWB to Velika Kladuša); opens NATO/Operation Deny Flight engagement track |
| `consolidate_defend` | `supply_drain(RBiH 5th Corps, 0)`, `morale_change(RBiH 5th Corps, -2)` | `bihac_5th_corps_1994_response: 'consolidate_defend'` | per §3.1 cost floor: `alliance_lock(RBiH-APWB-tolerated): -10`, `recruitment_modifier(RBiH 5th Corps): 0.90x`, internal_cohesion +2, international_standing 0 | opens `csq_apwb_persistence_1994` (APWB survives intact through 1994-1995) |
| `seek_negotiation` | `negotiating_leverage(RBiH, -3)` | `bihac_5th_corps_1994_response: 'seek_negotiation'` | per §3.1 (smaller cost floor): `alliance_lock(RBiH-APWB-tolerated): -5`, internal_cohesion 0, international_standing -1 | opens `csq_bihac_ceasefire_attempt_1994` (talks open, no resolution) |
| `accept_ceasefire_terms` | `casualty(RBiH 5th Corps, 0)` (crisis averted), `morale_change(RBiH 5th Corps, -10)` (betrayal read) | `bihac_5th_corps_1994_response: 'accept_ceasefire_terms'` | per §3.1 cost floor: `alliance_lock(RBiH-APWB-recognized): -20`, `recruitment_modifier(RBiH 5th Corps): 0.80x`, internal_cohesion -10, international_standing -3, negotiating_leverage -5 | opens `csq_apwb_legitimization_1994`; forecloses 5th Corps role in Operation Storm 1995 (capability too degraded) |

### 4.2 Branch substrate

- `branch_tag` per `event_families.ts` vocabulary stub (B6 not yet on the stub — Wave 2 extension): proposed primitive flag substrate is `bihac_5th_corps_1994_response` valued by the option id.
- No new `effect.kind` is required. `alliance_lock` and `recruitment_modifier` already exist in the catalog effects vocabulary.

---

## 5. Runtime Causality Targets (per §3.3)

This worksheet *proposes* the following Phase D wiring; it does not author it.

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate |
| --- | --- | --- | --- |
| `press_offensive` | `csq_apwb_resurgence_1994`, NATO engagement track | (none) | `event_flags.bihac_5th_corps_1994_response = 'press_offensive'` |
| `consolidate_defend` | `csq_apwb_persistence_1994` | (none — Phase D should not close 1995 Storm cooperation by direct row close; let capability degradation be the structural effect) | `event_flags.bihac_5th_corps_1994_response = 'consolidate_defend'` |
| `seek_negotiation` | `csq_bihac_ceasefire_attempt_1994` | (none) | `event_flags.bihac_5th_corps_1994_response = 'seek_negotiation'` |
| `accept_ceasefire_terms` | `csq_apwb_legitimization_1994` | (Phase D Game Designer review — may close `bihac_5th_corps_storm_1995_cooperation` row if such a row is authored) | `event_flags.bihac_5th_corps_1994_response = 'accept_ceasefire_terms'` |

Phase D author must verify each downstream row's `trigger.condition` uses `flag_equals` against `bihac_5th_corps_1994_response` per §3.3 alignment rule.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Option-level ring:** None. All four options are operational/posture decisions; none authorizes any sensitive act.
- **Downstream ring concerns:** None directly. The Abdić / APWB rupture predicate is authored under B8 (`abdic_apwb` row); B6's branches affect APWB's *persistence* but do not author the *initial split* (which was September 1993, upstream of B6).
- **Gate §3 paramilitary surface:** Not engaged. The 5th Corps operated as a regular ARBiH formation; no paramilitary authorization is on the table.
- **Counterfactual-register narration (Gate §5):** All non-historical options must be narrated as historical-voice recording of an ahistorical 5th Corps posture decision. Particular care for `accept_ceasefire_terms`: the modal text must not minimize the structural cost (APWB legitimization, 5th Corps capability degradation, federation-level cohesion damage) or frame the choice as humanitarian. The cost floor in §3.1 is what makes the modal narration honest.

---

## 7. Citations and Sources

### Tier B primary (BB)
- **Balkan Battlegrounds Vol. II** — Bihać pocket 1994 operational chronology, including the 5th Corps summer-autumn 1994 offensive, the October 1994 high-water mark, the November-December 1994 counter-attack, and the APWB / Velika Kladuša theatre. Roughly **BB II pp. 406-417 region** (Phase D to tighten exact citations via the Balkan Battlegrounds extractor).
- **Balkan Battlegrounds Vol. II** — Abdić / APWB declaration of 27 September 1993 and APWB military operations through 1994-1995 (cazin / velika_kladusa narrative confirmed in `data/derived/knowledge_base/balkan_battlegrounds/extractions/20260224_HISTORIAN_BASELINE_CONTROL_START_20W_52W.md`).

### Tier A corroboration (`icty_icj_un` / UN-record)
- **UNSCR 958** (19 November 1994) — extension of NATO close-air-support authority to cover the Bihać safe area; documents the international-engagement decision tree triggered by the November 1994 crisis.
- **NATO operation records** for the 21 November 1994 Udbina airfield close-air-support action — corroborated by UN-record and BB II.
- ***Prosecutor v. Karadžić*** (ICTY IT-95-5/18-T) Trial Judgement — references the Bihać 1994 crisis as part of the VRS-RS strategic chronology; not the foundational citation for B6 but corroborates the joint VRS-RSK-APWB counter-attack record.

### Tier C
- No design-counterfactual sources beyond what is needed for the operational analogies in §3.

### Forbidden
- Wikipedia is not cited as a primary source per Gate §6 and Foundational packet §5.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **§3.6 boundary concern: counterfactual dominance.** Per packet v1.1 edit 13, the cost floor on `consolidate_defend` and `accept_ceasefire_terms` is mandatory. Phase A's recommended starting calibrations (§3.1) need Game Designer ratification. The structural reading is: the offensive's *political* value (eliminating APWB rear threat; preserving the Sarajevo line against an internal Bosniak split) is at least as decisive as its *operational* value (advance into Grabež); the cost floor must reflect that political-cost-of-not-pressing, not just an operational-cost-of-defending. Game Designer to rule on the magnitudes.
2. **B6 → B8 (Abdić / APWB) coupling.** B8 in the packet inventory is "follow-on of abdic_apwb / abdic_karadzic_pact" with no separate authoring. B6's branches change APWB *persistence* (resurgence, persistence, legitimization, or liquidation-and-resurgence-via-counter-attack); B8's downstream `csq_alliance_holds` chain should branch on B6's flag. Phase D author must align B6's `sets_flags` keys with B8's expected reads.
3. **B6 → X4 (Contact Group 51/49) coupling.** The Contact Group Plan (July 1994) preceded the 5th Corps offensive (summer-autumn 1994). The reverse coupling — B6's outcome affecting X4 acceptance — does not apply. But the forward coupling — B6's `accept_ceasefire_terms` foreclosing some Contact Group / Washington / Storm cooperation — is in scope for Phase D. Game Designer to rule on which downstream rows close.
4. **5th Corps participation in Operation Storm 1995 (B6 → 1995 operations).** Per `accept_ceasefire_terms` cost floor: 5th Corps capability is too degraded to participate meaningfully in the late-July / August 1995 western offensive (Operation Storm coordinated with HV through the Split agreement). Phase D should consider whether to author this as a flag-gated `closes_events_runtime` on a `bihac_5th_corps_storm_1995_cooperation` row, or to leave it as engine-driven (degraded recruitment + degraded morale = reduced operational capability via existing combat engine surfaces). Phase A recommendation: prefer engine-driven; avoid direct row close.
5. **BB II exact page citations.** BB II pp. 406-417 region is Phase A's working citation for the Bihać 1994 chronology. Phase D should tighten via the Balkan Battlegrounds extractor.
6. **Historical-marker assignment.** Phase D should add `historical_marker: 'historical_default'` to `press_offensive` and `historical_marker: 'counterfactual'` to the other three options. Game Designer to confirm.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B6 of the runtime-semantics packet.
- [x] Historical default identified with Tier B citations (BB II Bihać 1994 chronology) and Tier A corroboration (UNSCR 958, NATO 21 Nov 1994 records).
- [x] Counterfactual options inventoried with provenance (§3).
- [x] **Cost floor specified per packet v1.1 edit 13 (§3.1):** `consolidate_defend` carries `alliance_lock(-10)` + `recruitment_modifier(0.90x)`; `accept_ceasefire_terms` carries `alliance_lock(-20)` + `recruitment_modifier(0.80x)` + `internal_cohesion(-10)`; `seek_negotiation` carries a smaller advisory cost.
- [x] Material effects mapped to §3.3.
- [x] Runtime causality targets proposed (Phase D-deferred).
- [x] Sensitive ring classified as None at option and downstream levels.
- [x] Open questions surfaced for Canon Compliance / Game Designer, including the §3.6 cost-floor magnitudes (Open Question 1) and the B6→B8 / B6→X4 / B6→Storm-1995 coupling questions.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

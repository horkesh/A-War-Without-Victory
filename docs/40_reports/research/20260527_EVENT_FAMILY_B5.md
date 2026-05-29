# Event Family Worksheet — B5: Srebrenica Demilitarization (April-May 1993)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `srebrenica_demilitarization_1993` (matches §4.2 row B5 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5 / Source Standards):** Tier A required — Srebrenica and safe-area rows must cite ICTY Krstić / Karadžić / Mladić, UN resolutions/reports; BB operational context where relevant.
**Sensitive ring:** **Ring 1/2** per packet §4.2 B5. The row sits on the Srebrenica safe-area substrate that culminates in the 1995 rupture; option authoring is structurally constrained by the Sensitive-History Design Gate.
**Existing catalog row:** `data/scenarios/events/war_1993.json` → `srebrenica_demilitarization_1993` (see §8 for confirmation of authored vs un-authored state; do not edit in this slice).

---

## 1. Historical Narrative

In the late winter and early spring of 1993, Bosnian Serb (VRS) forces under General Ratko Mladić pressed offensives against the ARBiH-held Drina enclaves of eastern Bosnia. Cerska and Konjević Polje fell in February–March 1993; thousands of displaced Bosniaks fled into the Srebrenica enclave under deteriorating conditions. The UN Protection Force (UNPROFOR) commander in Bosnia and Herzegovina, French General Philippe Morillon, travelled to Srebrenica on **11 March 1993** and famously declared that the town was under UN protection, refusing to leave the enclave for several days under public pressure from the besieged civilian population. Morillon's visit and subsequent diplomatic activity contributed to the UN Security Council's adoption of **UNSCR 819 (16 April 1993)**, which declared Srebrenica "a safe area which should be free from any armed attack or any other hostile act".

In the immediate aftermath of UNSCR 819, ARBiH and VRS representatives — under UN-brokered terms — signed two successive **demilitarization agreements**:

- **18 April 1993** at Sarajevo airport: initial agreement covering Srebrenica, requiring weapons handover by ARBiH defenders inside the enclave to UN custody.
- **8 May 1993**: extension agreement covering Žepa, with broadly similar demilitarization provisions.

Compliance was partial. Both UN-record assessments and subsequent tribunal findings characterize the implementation as **nominal**: a quantity of heavy weapons was nominally surrendered to UNPROFOR custody (in some cases inoperable equipment), while combat-effective small arms and individual weapons were broadly **retained or concealed** by the 28th Division of ARBiH (the renamed Srebrenica-area formation) within the enclave. This pattern of partial/nominal compliance is documented in the UN Secretary-General's authoritative 1999 report on Srebrenica, **UN A/54/549 (15 November 1999)**, particularly §§ covering 1993 demilitarization implementation. The ICTY's *Prosecutor v. Krstić* Trial Judgement (**IT-98-33-T, 2 August 2001**) — the foundational genocide judgement on Srebrenica — describes the same demilitarization-compliance posture in its 1993 background narrative as context for the 1995 fall.

The historical posture for the RBiH defenders, given the VRS pressure on the enclave and the absence of any plausible UN guarantee of armed protection that did not require ARBiH continued combat capability, was **`hide_weapons`** — nominal compliance with UNPROFOR custody, retention of combat-effective small arms by the 28th Division for self-defence. This is the documented historical pattern per UN A/54/549 and Krstić TJ.

**Historical outcome (RBiH):** `hide_weapons` — partial/nominal compliance with the 18 April / 8 May 1993 demilitarization agreements.

---

## 2. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id:** `hide_weapons`.
**Defensibility:** Tier A. UN A/54/549 §§ on 1993 demilitarization implementation; Krstić TJ (IT-98-33-T) §§ on 1993 background. UNSCR 819 and the 18 April / 8 May 1993 demilitarization agreements provide the framing record; UN A/54/549 and Krstić TJ provide the compliance-posture assessment.

`Blocked` does not apply at the historical-default level. **Per the Foundational packet `srebrenica_demilitarization_1993` ruling:** *"Historical/default path is partial or nominal compliance such as `hide_weapons`, not full compliance. Avoid any 'prevent genocide' reward framing."* This worksheet treats that ruling as binding.

### 2.1 Foundational packet ruling (reproduced verbatim)

> | `srebrenica_demilitarization_1993` | Historical/default path is partial or nominal compliance such as `hide_weapons`, not full compliance. Avoid any "prevent genocide" reward framing. |

The ruling has two binding implications for B5:
1. `comply_fully` may not be authored as the historical default.
2. No option's narrative or effects may reward the player for "preventing genocide" via any branch. Genocide-rupture eligibility is a discrete state-condition predicate (Gate §2 criterion-3), not a player-rewarded outcome (Gate §1 Ring 3 #10).

---

## 3. Counterfactual Options

Two counterfactual options. Both are `design_counterfactual` at the option-design level; each engages the Ring 1/2 substrate and requires careful narrative and effects authoring per the Foundational ruling.

| Option id | Label | Provenance | Tier |
| --- | --- | --- | --- |
| `comply_fully` | Surrender all weapons to UNPROFOR custody as agreed | Historical counterfactual reflecting the UN-record framing of what *full* compliance with the 18 April 1993 agreement would have required. Documented in UN A/54/549 as the *non*-implemented track. The counterfactual is: ARBiH 28th Division surrenders combat-effective small arms in addition to the nominal heavy-weapons handover. | C (design counterfactual with Tier A analogy) |
| `refuse` | Refuse the demilitarization agreement and maintain full armed defence posture | Counterfactual reflecting an alternative ARBiH posture: refuse the UN-brokered terms, accept that the enclave is not a "safe area" in the UN-protected sense, retain full combat capability under siege. No documented Sarajevo-level support for this posture in the historical record; the counterfactual draws on internal ARBiH 2nd Corps debate currents about enclave-supply versus enclave-evacuation that surface in BB II coverage of the 1993 Drina campaign. | C |

### 3.1 Cost-floor and effects-framing constraints

Per the Foundational ruling, neither counterfactual may be framed as a "prevent-genocide" reward. The Phase D authoring must satisfy:

- `comply_fully`: must not reduce or close the `srebrenica_falls_1995` / `srebrenica_genocide_1995` rupture predicate by player choice in a way the modal narrates as preventative. The historically-documented effect of *fuller* compliance, per UN A/54/549, is *increased* enclave vulnerability (no combat-effective defence inside the perimeter when UNPROFOR's protective capability proved hollow). Phase D should author `enclave_resilience(srebrenica): -` as the realistic effect, *not* `enclave_resilience(srebrenica): +`. The counterfactual is one of *honouring an agreement that proved insufficient*, not one of *trading defence for protection*.
- `refuse`: must not place the player in the position of authorizing prolonged siege casualties as an optimization lever. The counterfactual reads as ARBiH retaining combat capability at the cost of UN safe-area legitimacy. Effect direction: `enclave_resilience(srebrenica): +` (modest), `international_standing: -` (UN safe-area framework repudiated), `negotiating_leverage: -`.
- `hide_weapons` (historical default): per packet §4.2 B5, the effect is "enclave resilience, supply" — i.e. the historical posture preserves *some* defensive capability while accepting *some* supply-corridor leverage from the UN safe-area framework. This middle path is precisely why it was the chosen historical posture.

No option may carry a `prevent_genocide` flag, dimension, or modifier of any kind.

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

B5 currently exists as a catalog row; this worksheet inventories the proposed Phase D shape (does not author it).

### 4.1 Proposed Phase D authoring

| Option | `effects[]` (proposed) | `sets_flags` (proposed) | `dimension_shifts` (proposed) | `future_consequences[]` (proposed) |
| --- | --- | --- | --- | --- |
| `hide_weapons` | `enclave_resilience(srebrenica, +modest)`, `supply_corridor(srebrenica, +)` (via UN safe-area framework partial honouring) | `srebrenica_demilitarization_response: 'hide_weapons'` | international_standing -1 (partial-compliance read as bad faith by ICFY observers), internal cohesion 0 | enclave-fate chain remains live (Srebrenica enclave forms, holds 1993-1995, 1995 rupture predicate eligible) |
| `comply_fully` | `enclave_resilience(srebrenica, -)`, `supply_corridor(srebrenica, +)` (full UN framework leverage) | `srebrenica_demilitarization_response: 'comply_fully'` | international_standing +1, negotiating_leverage +1, internal cohesion -2 (28th Division command friction) | enclave more vulnerable to early VRS escalation; supply-corridor framework intact |
| `refuse` | `enclave_resilience(srebrenica, +)`, `supply_corridor(srebrenica, -)` (UN safe-area framework repudiated) | `srebrenica_demilitarization_response: 'refuse'` | international_standing -2, negotiating_leverage -2, internal cohesion +1 | UN safe-area framework foreclosed for Srebrenica; enclave on independent-defence track |

### 4.2 Branch substrate

- `branch_tag` per `event_families.ts` vocabulary stub (B5 not yet on the stub — Wave 2 extension): proposed primitive flag substrate is `srebrenica_demilitarization_response` valued by the option id.
- No new `effect.kind` is required. Phase D may need to wire `enclave_resilience` and `supply_corridor` against existing engine-level enclave-state surfaces (Technical Architect coordination needed).

---

## 5. Runtime Causality Targets (per §3.3)

This worksheet *proposes* the following Phase D wiring; it does not author it.

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate |
| --- | --- | --- | --- |
| `hide_weapons` | (none; historical track remains live for all downstream Srebrenica rows) | (none) | `event_flags.srebrenica_demilitarization_response = 'hide_weapons'` |
| `comply_fully` | (none; enclave more vulnerable but Srebrenica chain remains live) | (none — Phase D MUST NOT close `srebrenica_falls_1995` or `srebrenica_genocide_1995` via this branch) | `event_flags.srebrenica_demilitarization_response = 'comply_fully'` |
| `refuse` | `csq_srebrenica_un_framework_collapse_1993` (proposed counterfactual chain) | UN safe-area framework downstream rows for Srebrenica specifically (Phase D Game Designer review) | `event_flags.srebrenica_demilitarization_response = 'refuse'` |

**Critical constraint:** No option may `closes_events_runtime: ['srebrenica_genocide_1995']`. The rupture predicate is engine-state-driven (Gate §2 criterion-3); player choice on B5 must not foreclose the rupture by direct close. This is the operative reading of the Foundational ruling's "Avoid any 'prevent genocide' reward framing" — the foreclosure must emerge from changed state, never from a B5 option's closes-list.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Option-level ring:** Ring 1/2 across all three options. Srebrenica is the central Ring 1 substrate of the entire game; B5 is the 1993 root of the 1995 rupture chain.
- **Atrocity-authorization surface:** Not engaged. The player chooses a *compliance posture* with a UN demilitarization agreement, not an atrocity, not a siege intensity, not a civilian-targeting decision. The 1993 demilitarization decision is properly a Ring 1/2 *posture* row, not a Ring 3 *act* row.
- **Counterfactual-register narration (Gate §5):** All non-historical options must be narrated as historical-voice recording of an ahistorical compliance posture. Particular care for `comply_fully`: the modal text must not imply the choice averts the 1995 rupture; the historical record (UN A/54/549) explicitly documents that *fuller* compliance would have *increased* enclave vulnerability under conditions of insufficient UN protective force.
- **Rupture-foreclosure prohibition:** Per §5 above, no option may directly close the 1995 rupture. The Foundational ruling's "no prevent-genocide reward framing" is the operative governing rule.
- **Drina enclaves cross-row interaction:** B4 `accept_*` counterfactuals (Owen-Stoltenberg) could in principle transfer Srebrenica to RS by treaty in Sep-Oct 1993, foreclosing the rupture via the "enclave never formed" branch (X3 §3 sensitive-history check). That foreclosure path is *not* a B5 effect; B5's player choice does not author the X3 treaty-cession path.

---

## 7. Citations and Sources

### Tier A (`icty_icj_un` / UN-record)
- ***Prosecutor v. Krstić*** (ICTY IT-98-33-T) Trial Judgement, 2 August 2001 — foundational genocide judgement; 1993 background narrative covers the demilitarization-compliance posture as context for the 1995 fall.
- **UNSCR 819** (16 April 1993) — declares Srebrenica a "safe area which should be free from any armed attack or any other hostile act".
- **UN A/54/549** (Secretary-General's report on the fall of Srebrenica, 15 November 1999) — authoritative UN assessment; §§ on 1993 demilitarization implementation document the partial/nominal compliance pattern.
- **Demilitarization Agreement of 18 April 1993** (Sarajevo airport, UN-brokered) and **Demilitarization Agreement of 8 May 1993** (Žepa extension) — agreement-text record. ICTY exhibits reference both; UN A/54/549 narrates both.

### Tier B (BB)
- **Balkan Battlegrounds Vol. I** — Drina-campaign operational context for the late-winter / early-spring 1993 VRS pressure on the enclave (Morillon-visit-era pages roughly BB I p.194 region; specific page citations to be confirmed by BB extractor before Phase D authoring).
- **Morillon's visit to Srebrenica** (11 March 1993) — documented in BB I and corroborated in UN A/54/549 §§ on the road to UNSCR 819.

### Forbidden
- Wikipedia is not cited as a primary source per Gate §6 and Foundational packet §5.
- No "prevent-genocide" framing source. Per Foundational ruling, no source may be cited to justify a counterfactual reward for averting the 1995 rupture by 1993 player choice.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **Existing catalog row state.** B5 is referenced in the Foundational packet as having an existing or planned catalog row. Phase D author should confirm `data/scenarios/events/war_1993.json` row state and historical_marker assignments before authoring. If the row already exists with `historical_default_response_id`, the historical default must read `hide_weapons`.
2. **`comply_fully` effect direction (negative resilience).** Phase A reading: full compliance *reduces* enclave defensive capability — this is the operatively documented record (UN A/54/549). The counterfactual modal narrative must not imply that this option averts the 1995 fall; it could in principle have *accelerated* a 1993-1994 fall under unchanged VRS pressure. Game Designer to confirm authoring of `enclave_resilience: -` on `comply_fully`.
3. **§3.6 boundary concerns (Canon Compliance review).** The rupture-foreclosure-by-state-change versus rupture-foreclosure-by-row-close distinction is the central §3.6 question for B5. Phase A reading: B5 options must *never* close 1995 Srebrenica rupture rows directly; the rupture predicate is engine-state-driven (Gate §2 criterion-3) and may become unreachable only via state changes (e.g., enclave not formed because B4 treaty-cession path was taken, or 28th Division integrity falls in 1994 from `comply_fully` cascade). Canon Compliance to confirm this reading is binding for Phase D.
4. **BB page citations for Morillon visit and 1993 demilitarization.** BB I exact-page citations need confirmation from the Balkan Battlegrounds extractor before Phase D authoring. Current Phase A reading places Morillon-era coverage roughly at BB I p.194 region; Phase D should tighten.
5. **B5 → B7 (Sarajevo siege response) interaction.** Packet §4.2 B7 is "follow-on — currently engine-driven". B5 sits at the Drina-enclaves substrate, not the Sarajevo siege substrate, so cross-row coupling is limited. Confirm no incidental coupling exists.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B5 of the runtime-semantics packet.
- [x] Foundational packet ruling reproduced verbatim and treated as binding (§2.1).
- [x] Historical default identified with Tier A citations (UN A/54/549, Krstić TJ IT-98-33-T, UNSCR 819, 18 Apr / 8 May 1993 agreements).
- [x] Counterfactual options inventoried with provenance and effect-direction constraints (§3.1).
- [x] Material effects mapped to §3.3 (proposed; no `prevent_genocide` framing).
- [x] Runtime causality targets proposed with explicit rupture-foreclosure prohibition (§5).
- [x] Sensitive ring classified at Ring 1/2 per packet; no atrocity-authorization surface engaged.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

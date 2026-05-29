# Event Family Worksheet — B9: RBiH NATO Ultimatum Compliance (Sarajevo HWEZ, Feb 1994)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_nato_ultimatum_compliance` (matches §4.2 row B9 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Tier A — `icty_icj_un` + `agreement_text` (NATO North Atlantic Council decision of 9 February 1994, UNSCR 836, ICTY Mladić Trial Judgement).
**Sensitive ring:** **Ring 1.** Modeled-mechanically (enclave resilience, dimension shifts, siege-end conditions). No new player-facing atrocity surface.
**Existing catalog row:** `nato_ultimatum_sarajevo_1994` (`data/scenarios/events/war_1994.json:119`). Note: the **existing row is RS-facing** with response options `comply_withdraw_hwez` / `defy_ultimatum_hwez` — the RS decides whether to withdraw heavy weapons. **The B9 family is RBiH-facing**: RBiH's posture *toward* NATO's enforcement action. This is a near-name collision and is resolved in §1.

**Per packet §4.2:** historical default `comply_withdraw_hwez`; counterfactual `defy_ultimatum_hwez`. Phase A reading of these labels in the *RBiH-facing* sense: see §1.3.

---

## 1. Historical Narrative

### 1.1 The 5 February 1994 Markale market shelling

On 5 February 1994, a 120mm mortar shell struck the Markale open-air market in Sarajevo, killing 68 civilians and wounding ~140 — the single deadliest incident of the siege to that date. The *Galić* Trial Judgement (ICTY IT-98-29, 5 December 2003) and the UN A/54/549 record fix the attribution to a position controlled by the Sarajevo-Romanija Corps of the VRS. The atrocity catalysed Western political and military pressure on the VRS in ways that the cumulative siege had not.

### 1.2 The NATO ultimatum (9 February 1994)

On 9 February 1994, the **North Atlantic Council** issued the ultimatum: all heavy weapons of any party within a 20-kilometre exclusion zone around Sarajevo must be withdrawn (or placed under UNPROFOR control at designated collection points) by 0001Z on 21 February 1994, or face NATO air strikes. The ultimatum was operationalized under existing UNSCR 836 authority (4 June 1993, authorizing UNPROFOR use of force in support of the safe-areas regime).

Critically, the **heavy-weapons exclusion zone (HWEZ)** applied to *all parties* — VRS and ARBiH alike. RBiH was therefore not merely the beneficiary of NATO action against RS; RBiH was *also* subject to the same withdrawal demand for any ARBiH heavy weapons inside the 20km perimeter.

### 1.3 RBiH posture — the historical default

**Historical default: `comply_withdraw_hwez` (RBiH-facing reading).**

In RBiH-facing terms, "comply" means: Sarajevo accepts the HWEZ regime, hands over or withdraws any ARBiH heavy weapons in the 20km zone, cooperates with UNPROFOR collection-point inventories, and publicly supports NATO's enforcement against the VRS.

This was the documented Sarajevo posture. Izetbegović and the Presidency framed the ultimatum as long-overdue Western action, accepted the symmetric application to ARBiH (which had relatively few heavy weapons inside the perimeter to surrender — the asymmetry of the situation meant RBiH bore little material cost), and supported subsequent NATO action. UN records (Sec-Gen reports on UNPROFOR / S/1994/300 series) document RBiH cooperation with HWEZ inspections. The 12 February 1994 "first day without a casualty since April 1992" was politically owned by Sarajevo as vindication of the NATO-enforcement posture.

### 1.4 Counterfactual — `defy_ultimatum_hwez` (RBiH-facing)

**Counterfactual: `defy_ultimatum_hwez` (RBiH-facing reading).**

In RBiH-facing terms, "defy" means: Sarajevo publicly objects to the symmetric framing (the equivalence of victim and aggressor in HWEZ application), refuses ARBiH heavy-weapon withdrawal, or signals lack of confidence in NATO enforcement. The historical record contains traces of this current — public RBiH statements protesting the symmetric framing as morally equivalencing — but the Presidency did not act on it. Sarajevo complied.

The counterfactual is defensible as a *posture-of-protest* counterfactual: RBiH refuses HWEZ compliance for ARBiH while still benefiting from NATO action against the VRS. This is politically and diplomatically risky (it would jeopardize Western support and the federation track) but it is not implausible given the RBiH internal debate at the time (Assembly members and some commanders publicly questioned the symmetric framing).

### 1.5 The near-name collision with the RS-facing row

The existing JSON row `nato_ultimatum_sarajevo_1994` uses identical option ids — `comply_withdraw_hwez` / `defy_ultimatum_hwez` — for the **VRS** decision. The B9 family in the packet uses the same ids for the **RBiH** decision.

**Phase A resolution:** Phase D authoring must namespace the option ids to prevent collision. Recommended naming:

- Existing RS-facing row keeps `comply_withdraw_hwez` / `defy_ultimatum_hwez` (already authored; do not rename).
- B9 RBiH-facing row, if authored in Phase D, uses `rbih_comply_hwez_regime` / `rbih_defy_hwez_regime` (or equivalent unambiguous namespacing).

The branch-flag substrate must also be distinct: `sarajevo_hwez_complied` (set by RS) is *not* `event_flags.rbih_nato_ultimatum = 'comply'` (set by RBiH). Both flags can be true simultaneously without contradiction.

### 1.6 Historical outcome

The VRS complied (`sarajevo_hwez_complied` historically true). RBiH complied (B9 historical default fires `rbih_comply_hwez_regime`). The HWEZ regime held through 1994; the *de facto* end of heavy-weapon shelling of Sarajevo civilians was achieved between 21 February 1994 and the August 1995 Markale II attack which re-triggered NATO escalation (Operation Deliberate Force).

---

## 2. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id (Phase D-deferred naming):** `rbih_comply_hwez_regime` (provisional; final id to be ruled by Game Designer at Phase D authoring to ensure no collision with the existing RS-facing row).
**Defensibility:** Tier A. UN Sec-Gen reports document Sarajevo's HWEZ cooperation; NATO North Atlantic Council decision text of 9 February 1994; ICTY Mladić TJ §§ on NATO involvement; subsequent UNSCRs.

`Blocked` does not apply.

---

## 3. Counterfactual Options

One counterfactual.

| Option id (provisional) | Label | Provenance | Tier |
| --- | --- | --- | --- |
| `rbih_defy_hwez_regime` | Refuse symmetric application; protest HWEZ to ARBiH | RBiH Assembly debate currents (1994) on the moral-equivalence framing of HWEZ. Documented in UN A/54/549 §§ on diplomatic friction and in subsequent academic / ICTY narrative of Sarajevo's relationship with UNPROFOR. The Presidency did not act on it; the counterfactual is a posture-of-protest, not an unsourced invention. | C (design counterfactual with Tier A analogue) |

### 3.1 Cost floor (Phase D required)

The counterfactual `rbih_defy_hwez_regime` must carry a meaningful cost. Recommended Phase D shape:

- `negotiating_leverage(RBiH) -10` — Sarajevo's protest is read by ICFY Co-Chairmen and Washington as obstructing the only effective Western coercion against RS.
- `patron_pressure(RBiH) +10` (negative for player; US/EC pressure increases).
- `international_standing(RBiH) -8` — modest but visible.
- *No* dimension boost on `internal_cohesion` that exceeds the international cost floor. The Presidency's documented record was that defiance would have been internally popular short-term and structurally damaging mid-term; modal copy must reflect this without dominating.
- *No* `morale_change` boost large enough to flip the option into net-positive.

The cost floor must prevent `rbih_defy_hwez_regime` from trivially dominating `rbih_comply_hwez_regime` on aggregate. Per Game Designer Wave 1 review pattern (B1 cost-floor discipline).

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

### 4.1 Existing row (RS-facing — do not modify in B9 Phase D)

`nato_ultimatum_sarajevo_1994` (war_1994.json:119) is RS-facing. Its material effects (RS dimension shifts on international_standing / patron_confidence / military_credibility, sets_flags sarajevo_hwez_complied | sarajevo_hwez_defied) are unchanged by B9.

### 4.2 Phase D additions for the B9 RBiH-facing row (proposals only)

If Phase D authors a separate RBiH-facing decision event (a new event id, e.g. `rbih_nato_ultimatum_response_1994`, triggered by the same Markale catalyst and operating in parallel to the existing RS-facing row):

| Option | `effects[]` | `sets_flags` | `dimension_shifts` | `future_consequences[]` |
| --- | --- | --- | --- | --- |
| `rbih_comply_hwez_regime` | (modest) `morale_change(RBiH, +2)` — civilian relief; narrative | `rbih_nato_ultimatum: 'comply'` | `RBiH.negotiating_leverage: +8`, `RBiH.international_standing: +5` | opens NATO escalation track visibility (B11/federation precursors via flag substrate) |
| `rbih_defy_hwez_regime` | (none on the decision; protest is rhetorical) | `rbih_nato_ultimatum: 'defy'` | `RBiH.negotiating_leverage: -10`, `RBiH.patron_pressure: +10`, `RBiH.international_standing: -8` | opens csq_western_skepticism (Phase D may author); narrows federation-track precursors |

### 4.3 Forbidden effect shapes

- No `control_change` on this family. Siege relief is an engine consequence of HWEZ + federation offensive, not a B9 lever.
- No "atrocity-efficiency" framing; Markale is the catalyst, not a player resource.
- No `effects` that scale or continue an existing sensitive act per Runtime Semantics §3.6.

---

## 5. Runtime Causality Targets (per §3.3)

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate |
| --- | --- | --- | --- |
| `rbih_comply_hwez_regime` | (Phase D: NATO escalation track readiness rows; federation-precursor visibility) | (Phase D: may close `csq_western_skepticism` (if authored) when comply path taken) | `event_flags.rbih_nato_ultimatum = 'comply'` |
| `rbih_defy_hwez_regime` | (Phase D: `csq_western_skepticism` if authored) | (Phase D: may close federation-precursor readiness rows; Game Designer to confirm — federation was still achieved despite RBiH friction, so closure should be soft) | `event_flags.rbih_nato_ultimatum = 'defy'` |

Note on closes: per packet §4.2 row B9, "closes RS siege escalation." Phase A reading: this closure operates through the *RS-side* row's `sarajevo_hwez_complied` flag plus the engine's siege-end conditions, not through the B9 RBiH-side row. The B9 family contributes by setting the diplomatic conditions; the closure itself fires from R13 (Deliberate Force compliance) and the federation-offensive readiness path. Do not author a direct B9 → siege-escalation close.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Family ring:** **Ring 1.** All material effects are mechanical (dimension shifts, supply, enclave resilience). No atrocity authorization surface.
- **Atrocity-efficiency prohibition (Gate §3 #5):** Not engaged at the option level. Markale is the trigger context, not a player resource; modal copy must follow Gate §4 wording.
- **Gate §3 paramilitary surface:** Not engaged.
- **Gate §4 wording constraints:** Modal copy must use "Markale market shelling, 5 February 1994, 68 civilians killed" with historical voice. No euphemism. No framing of NATO action as a "win" — historical voice records the diplomatic and military fact.
- **Gate §6 sign-off:** Not required at Phase A. Required if Phase D's authoring touches the existing RS-facing row's structure (which it should not — the B9 row is a *new* RBiH-facing decision parallel to the existing RS one).

---

## 7. Citations and Sources

### Tier A (`icty_icj_un`, `agreement_text`, NATO record)
- **NATO North Atlantic Council decision, 9 February 1994** — heavy-weapons exclusion zone ultimatum, published in NATO Final Communiqué and referenced in UN S/1994/154 and subsequent UNPROFOR Sec-Gen reports.
- **UNSCR 836** (4 June 1993) — authorizes UNPROFOR use of force in support of safe areas, including Sarajevo. Provides the legal basis NATO acted on.
- **UNSCR 824** (6 May 1993) — declares Sarajevo a safe area.
- **UN A/54/549** (Secretary-General's report on Srebrenica, 15 November 1999), §§ on the Sarajevo HWEZ regime and the relationship between safe-areas declaration and NATO enforcement.
- **UN Secretary-General reports on UNPROFOR** (S/1994/300 series and subsequent) — document HWEZ compliance / verification and RBiH cooperation.
- **Galić Trial Judgement** (ICTY IT-98-29, 5 December 2003) and **Galić Appeal Judgement** (30 November 2006) — fix Markale 5 February 1994 attribution to SRK/VRS positions.
- **Mladić Trial Judgement** (ICTY IT-09-92-T, 22 November 2017) — SRK siege as JCE instrument; NATO-enforcement context.
- **Dragomir Milošević Trial Judgement** (ICTY IT-98-29/1, 12 December 2007) — successor SRK command and 1994 siege intensification context.
- **Karadžić Trial Judgement** (ICTY IT-95-5/18-T, 24 March 2016) — Sarajevo siege at RS leadership level; HWEZ as turning point.

### Tier B (`balkan_battlegrounds`)
- **Balkan Battlegrounds Vol. II** — Sarajevo siege operational chronology around the HWEZ window. Historian to confirm exact pages from KB before Phase D authoring.

### Engine / catalog source
- **`data/scenarios/events/war_1994.json:119`** — existing `nato_ultimatum_sarajevo_1994` (RS-facing). Do not modify in B9 Phase D.

### Canon source
- **`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §4** — wording constraints for Markale citation.

### Forbidden
- Wikipedia not cited as primary.
- BB aggregate troop figures not used.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **Phase D authoring scope — separate row vs. extension.** Should B9 ship as a *new* RBiH-facing decision event paralleling the existing RS-facing `nato_ultimatum_sarajevo_1994`, or should the existing row gain RBiH-faction response options? Phase A recommends a *separate row* (cleaner namespacing, no duplicate-response complexity, easier bot calibration). **Game Designer to rule.**

2. **Option id namespacing.** Phase A recommends `rbih_comply_hwez_regime` / `rbih_defy_hwez_regime` to prevent collision with the existing RS-side `comply_withdraw_hwez` / `defy_ultimatum_hwez`. The packet uses the colliding labels (presumably as shorthand). **Canon Compliance to rule on final naming.**

3. **Branch-tag vocabulary.** Phase A proposes adding `rbih_nato_comply` / `rbih_nato_defy` to the branch-tag vocabulary stub. This is **not** yet listed in `20260527_EVENT_FAMILY_BRANCH_TAG_VOCABULARY.md`. Add in Phase B / Wave 2 closure.

4. **Federation-precursor closure.** Phase A reads the `defy` option as *not* directly closing federation precursors — federation was historically achieved (Washington Agreement, March 1994) despite occasional RBiH-Western friction. The packet text ("closes RS siege escalation") refers to the RS-side row's flag operating through R13. **Game Designer + Canon Compliance to confirm B9 does not directly close federation precursors.**

5. **`csq_western_skepticism` authoring.** Phase A flags this as a Phase D consequence-row candidate for the defy branch. Naming TBD; canon compliance review when consequence-row Phase D wave runs.

6. **Bot calibration.** Under `bot_response_logic: 'historical'`, RBiH bot must pick `rbih_comply_hwez_regime`. Verify historical-bot calibration after Phase D authoring.

7. **Markale narration.** Modal copy for the B9 row (if authored) must cite Markale precisely (5 February 1994, 68 killed, ICTY Galić attribution). Narrative-designer to commission copy under Gate §4 constraints in Phase D.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B9 of the runtime-semantics packet.
- [x] Markale 5 February 1994 + NATO NAC 9 February 1994 + 21 February 1994 deadline fixed with Tier-A citations.
- [x] Historical default identified as `rbih_comply_hwez_regime` (provisional id; namespacing flagged).
- [x] Counterfactual `rbih_defy_hwez_regime` inventoried with Assembly-debate provenance.
- [x] Cost-floor recommendations specified (negotiating_leverage, patron_pressure, international_standing).
- [x] Material effects mapped to §3.3; forbidden shapes documented.
- [x] Runtime causality targets proposed (Phase D-deferred).
- [x] Near-name collision with existing RS-facing row `nato_ultimatum_sarajevo_1994` identified and resolution proposed.
- [x] Sensitive ring fixed at Ring 1; Gate §4 wording constraints on Markale citation noted.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

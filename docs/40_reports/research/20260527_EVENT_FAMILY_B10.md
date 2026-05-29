# Event Family Worksheet — B10: RBiH Washington Agreement Acceptance (1994)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_washington_agreement` (matches §4.2 row B10 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Tier A required — `agreement_text` (Washington Agreement) plus `balkan_battlegrounds` (BB Vol. II) and `icty_icj_un` (Prlić TJ) corroboration.
**Sensitive ring:** None at the option level. Diplomatic-acceptance decision; closes the Croat-Bosniak war narrative but does not authorize any sensitive act.
**Existing catalog row:** `data/scenarios/events/war_1994.json` → `washington_agreement_1994` (do not edit in this slice).

---

## 1. Historical Narrative

The Washington Agreement was the US-brokered settlement that ended the Croat-Bosniak war and established the Federation of Bosnia and Herzegovina as a Bosniak-Croat federal arrangement with a special confederal relationship to the Republic of Croatia.

### 1.1 Signing chronology

The agreement was negotiated through a compressed February-March 1994 window under direct US (Christopher / Galbraith / Redman) and German pressure, with Tudjman's Zagreb leveraged into HRHB compliance and Sarajevo's Presidency under cumulative diplomatic, military-balance, and humanitarian strain.

- **18 February 1994:** Preliminary framework agreed in Washington under Charles Redman's mediation.
- **1 March 1994:** The principal Washington Agreement text — political framework establishing the Bosnian Federation and the confederal relationship with Croatia — signed in the United States by Croatian Foreign Minister Mate Granić, Republic of Bosnia and Herzegovina Prime Minister Haris Silajdžić, and HRHB representative Krešimir Zubak. Balkan Battlegrounds Vol. II p. 451 fixes this date as the canonical signing.
- **12 March 1994:** The "Split agreement" — military provisions — signed by the ARBiH and HVO army commanders, elaborating the conversion of ARBiH and HVO into the cooperating "Federation Army" (Vojska Federacije / VF). BB II p. 451 explicit.
- **18 March 1994:** Formal Washington Agreement signing ceremony at the White House. Izetbegović, Tudjman, Silajdžić, Granić, and Zubak signed before President Clinton; the constitution of the Federation of Bosnia and Herzegovina was formally adopted. This is the canonical date used in subsequent UN and ICTY narrative; the agreement text is referenced as the "Washington Agreement of 18 March 1994" in *Prosecutor v. Prlić et al.* (IT-04-74) and in subsequent Federation constitutional documentation.

### 1.2 Acceptance posture

BB II p. 451 frames Sarajevo's acceptance precisely: a treaty "essentially imposed from outside" with "no fundamental stake in the long-term success of the newborn Bosnian Federation," signed because the Presidency "had to seem to be agreeable to maintain the support of the international community" and, more decisively, because acceptance "allowed the ARBiH to end its desperate two-front war and concentrate on the crucial conflict with its Bosnian Serb foes." The acceptance was real and operationally consequential — UNPROFOR took on cease-fire monitoring across Mostar, Vitez, Gornji Vakuf, Prozor, Konjic, and Jablanica within days (BB II p. 451) — but the political stake was instrumental rather than ideological.

ICTY *Prosecutor v. Prlić et al.* Trial Judgement (IT-04-74, 29 May 2013) treats the Washington Agreement as the diplomatic terminus of the Croat-Bosniak conflict and the foundation for the Federation's subsequent joint operations against the VRS, while documenting that detention-camp and atrocity exposure on the HRHB side continued through tribunal track even after the agreement's signing.

### 1.3 Historical outcome

Acceptance, formalized 18 March 1994, sustained as Sarajevo's diplomatic baseline through Contact Group (51:49), Dayton, and post-Dayton Federation implementation. The acceptance was *reluctant* in the documented sense BB II uses ("no fundamental stake"; "had to seem to be agreeable"); it was not enthusiastic federation-building but pragmatic exit from a two-front war.

---

## 2. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id (matches existing JSON):** `accept`.
**Defensibility:** Tier A. Washington Agreement text (18 March 1994 White House signing); BB II p. 451 fixing the 1 March / 12 March / Federation framework; Prlić TJ for ICTY narrative cross-reference; the existing JSON row already pins `historical_default_response_id: 'accept'` with `historical_marker: 'historical_default'`.

`Blocked` does not apply — this is a Tier A diplomatic decision with no atrocity surface engaged.

---

## 3. Counterfactual Options

One counterfactual, already authored in the JSON row.

| Option id | Label | Provenance | Tier |
| --- | --- | --- | --- |
| `reluctant` | Accept with Reservations | Counterfactual at the option-design level but with strong historical analogy: BB II p. 451 explicitly characterizes Sarajevo's posture as one of public-facing acceptance paired with private wariness ("keep one eye on each other"; "no fundamental stake"). The counterfactual splits this single historical posture into two visible options — full embrace versus signing-with-reservations — so the player can vote the same direction the historical Presidency did but at a different volume. Both still accept; the historical outcome is preserved at the row level. | C (counterfactual with Tier A/B analogy) |

Per packet §4.2 row B10, `reluctant` is the *only* counterfactual ("`reluctant` (still accepted historically; 'reluctant' framing per Foundational packet)"). There is no `reject` option for B10 — rejection of Washington is not authored as a counterfactual at this row because Tudjman's Zagreb leverage on HRHB and US Lift-and-Strike conditionality on Sarajevo made unilateral RBiH rejection of the framework historically unreachable from the 1 March / 18 March decision window. (A `reject` counterfactual *could* be argued from the earlier Gornji Vakuf / Mostar war-continuation current, but Phase A reads the packet's row as deliberate: B10 is the *acceptance* decision, not the *reject Washington entirely* decision.)

The existing JSON row already labels `accept` with `historical_marker: 'historical_default'`. The `reluctant` option lacks an explicit `historical_marker`; Phase A's recommendation is to add `historical_marker: 'counterfactual'` (or, if Game Designer prefers, a new `historical_marker: 'historical_alternate_volume'` to capture that `reluctant` is the same historical *direction* as `accept` but at a different posture).

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

The existing JSON row already carries material consequences sufficient for the modal-readiness gate. This worksheet inventories them and proposes Phase D additions.

### 4.1 Already authored (no change in Phase A)

| Option | Top-level `effect` | `effects[]` | `historical_marker` |
| --- | --- | --- | --- |
| (row-level) | `alliance_change(+0.8)` | `morale_change(RBiH, +5)`, `morale_change(HRHB, +8)`, `cohesion_change(HRHB, +15)`, `cohesion_change(RBiH, +5)`, narrative text | n/a |
| `accept` | n/a | `negotiation_capital(RBiH, international_credibility, +15)`, `supply_delta(RBiH, +10)` | `historical_default` |
| `reluctant` | n/a | `negotiation_capital(RBiH, international_credibility, +5)` | (none authored) |

The row also writes `notifications_to_other_factions` keyed by the response id, providing per-option RS and HRHB-facing copy. This is presentation-layer material and does not need Phase A action.

### 4.2 Phase D additions (deferred — proposals only)

These are *proposals* for Phase D authoring; nothing is being changed by this worksheet.

- Add `sets_flags: { rbih_washington_agreement: 'accept' }` and `sets_flags: { rbih_washington_agreement: 'reluctant' }` to provide the branch-flag substrate for downstream events (per §2.2 / §3.3 of the v1.3 packet).
- Add `branch_tag: 'rbih_washington_accept' | 'rbih_washington_reluctant'` once the branch-tag vocabulary stub locks. Note: the existing vocabulary stub at `docs/40_reports/research/20260527_EVENT_FAMILY_BRANCH_TAG_VOCABULARY.md` does **not** yet include B10 tags; Phase A recommends adding `rbih_washington_accept` and `rbih_washington_reluctant` to the RBiH section of that file in a follow-up edit (or letting the X5 composite worksheet add them).
- Add `alliance_lock` as a material effect floor per packet §4.2 row B10 ("alliance_lock (floor), dimension shifts, recruitment"). The existing row uses `alliance_change(+0.8)` rather than a hard floor; Phase D should consider whether to convert this to an `alliance_lock(RBiH-HRHB, minimum: <value>)` semantics so post-Washington diplomatic events cannot drop the alliance below the floor.
- Add `recruitment_modifier(RBiH, modest +)` on `accept` reflecting the supply-pipeline reopening (BB II p. 451 narrates Croatian supply lines reopening to ARBiH after Washington); ensure modifier is small enough that `accept` does not become a dominance-risk option versus `reluctant`. Game Designer to calibrate.
- Add `future_consequences[]` entries naming the visible downstream branches:
  - On `accept`: opens federation track (B11), federation military integration readiness, joint offensive readiness; references X5 composite.
  - On `reluctant`: opens same downstream rows but with `negotiation_capital` and `recruitment_modifier` reduced; visible Codex / Records framing that the alliance was signed under reservations.

No new `effect.kind` is required.

---

## 5. Runtime Causality Targets (per §3.3)

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate (§3.3) |
| --- | --- | --- | --- |
| `accept` | B11 (Federation military integration), federation joint-offensive readiness events, X5 composite gates | Croat-Bosniak war chains (H2 / H5 / H6 narrative continuations) where they remain reachable from non-B10 paths — direct close is appropriate per packet §4.2 row B10 ("closes Croat-Bosniak war chains") | `event_flags.rbih_washington_agreement = 'accept'` |
| `reluctant` | B11 (Federation military integration — same downstream, flag-gated), federation joint-offensive readiness with reduced effect floors | Same Croat-Bosniak war chain closures as `accept` — both options accept the agreement, so both close the war chains | `event_flags.rbih_washington_agreement = 'reluctant'` |

Both options share the same `closes_events_runtime[]` because both are forms of acceptance. The downstream divergence lives in dimension-shift and recruitment magnitudes, not in which events become unreachable. This is consistent with packet §4.2's "follow-on of B10" wording for B11 — B11 inherits the flag-substrate from B10 regardless of whether B10 resolved as `accept` or `reluctant`.

Phase D must verify each downstream row's `trigger.condition` uses `flag_equals` against `rbih_washington_agreement` (for visibility gating) or remains live-state-gated (for joint-offensive readiness) per §3.3 alignment rule.

Coordination note: X5 (Washington Agreement overall composite, packet §4.4) is the cross-faction gate that reads B10 + H9 together. B10's worksheet does not author X5; the X5 worksheet (Phase F) coordinates the composite eligibility chain.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Option-level ring:** None. Both `accept` and `reluctant` are diplomatic acceptance postures. Neither authorizes any sensitive act.
- **Downstream ring concerns:** The agreement *ends* the Croat-Bosniak war but does not retroactively resolve the atrocity-exposure rows (H5, H6, H8 narrative continuations). Phase D copy must not frame Washington as having "resolved" or "settled" the prior atrocities — the tribunal track for HRHB detention camps continues regardless. The existing JSON `source_note` correctly captures this ("not immediate reconciliation"); Phase D should preserve this register.
- **Gate §3 paramilitary surface:** Not engaged.
- **Gate §4 Cost Ledger wording:** Endgame narration tied to this branch must avoid framing Washington as a moral settlement. BB II's "imperfect peace and an uneasy alliance" register is the canonical historian voice. Narrative Designer in Phase D.

---

## 7. Citations and Sources

### Tier A — agreement_text and icty_icj_un
- **Washington Agreement, signed 1 March 1994 (preliminary) and 18 March 1994 (formal White House ceremony)** — political framework establishing the Federation of Bosnia and Herzegovina and confederal relationship with Croatia. Signed by Izetbegović (BiH), Tudjman (Croatia), Silajdžić (BiH PM), Granić (Croatia FM), Zubak (HRHB) at the White House on 18 March 1994 before President Clinton. Canonical text reference.
- **Split Agreement, 12 March 1994** — military provisions, signed by ARBiH and HVO army commanders. Elaborates the "Federation Army" (Vojska Federacije) structure. BB II p. 451 explicit.
- **Prlić et al. Trial Judgement** (ICTY IT-04-74, 29 May 2013) — Washington Agreement framed as the diplomatic terminus of the Croat-Bosniak conflict; continued tribunal track for HRHB detention exposure.

### Tier B — balkan_battlegrounds
- **Balkan Battlegrounds Vol. II, p. 451** — canonical operational and political characterization of the Washington Agreement. "A temporary convergence of three self-interests, codified in a treaty essentially imposed from outside"; Sarajevo's instrumental acceptance ("had to seem to be agreeable"; "allowed the ARBiH to end its desperate two-front war"); UNPROFOR cease-fire monitoring across Mostar, Vitez, Gornji Vakuf, Prozor, Konjic, Jablanica.
- **Balkan Battlegrounds Vol. II** — broader Federation context and 1994-1995 joint offensive narrative.

### Canonical row reference
- **`data/scenarios/events/war_1994.json` → `washington_agreement_1994`** — existing authored row. `historical_default_response_id: 'accept'`; `historical_source: "Balkan Battlegrounds Vol. II p.451; Washington Agreement text, Mar. 18 1994; ICTY Prlic Trial Judgment (IT-04-74-T)."` This worksheet preserves and extends the existing source citation.

### Forbidden
- Wikipedia is not cited as a primary source per Gate §6 and Foundational packet §5.
- Post-agreement press commentary is not cited as primary; agreement text and ICTY narrative are.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **`reluctant` historical_marker.** Phase A's recommendation is `historical_marker: 'counterfactual'`, but `reluctant` is genuinely the same historical *direction* as `accept` per BB II p. 451. Game Designer to confirm whether a new marker (`historical_alternate_volume` or similar) is warranted to capture "same direction, different posture" semantics. **Decision: use existing `counterfactual` marker.** Do not add a 6th label to the Foundational packet taxonomy. Capture "same direction, different posture" through `dimension_shifts` magnitude differentiation on the option; the composite-tag substrate (X5 sub-tags) already encodes the gradient at downstream evaluation. Per Game Designer Wave 2 review.
2. **`alliance_lock` floor vs `alliance_change` delta.** The existing row uses `alliance_change(+0.8)`. Packet §4.2 specifies `alliance_lock (floor)`. Phase D must decide whether to convert (one-time delta vs persistent floor) and what the floor value should be. Likely floor: enough to prevent later events from dropping RBiH-HRHB alliance below a "post-Washington baseline" without an explicit rupture event.
3. **`reject` option absence.** Phase A reads packet §4.2 row B10 as deliberate in offering only `accept` / `reluctant` (no `reject`). Confirm: is unilateral RBiH rejection of Washington truly unreachable, or should a `reject` counterfactual be added under `Counterfactual staff path` label? Phase A's reading is that the packet's `reluctant` is the intended counterfactual register.
4. **Branch-tag vocabulary update.** The existing `BRANCH_TAG_VOCABULARY.md` stub does not include B10 tags. Phase A recommends adding `rbih_washington_accept` and `rbih_washington_reluctant` to that file. Coordinate with X5 worksheet (Phase F) to avoid tag drift.
5. **18 March vs 1 March anchor date.** BB II p. 451 cites 1 March 1994; the existing JSON row cites "Mar. 18 1994"; the formal White House ceremony was 18 March. Phase D should preserve both dates in `historical_source` for evidentiary completeness.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B10 of the runtime-semantics packet.
- [x] Historical default identified with Tier A citations (agreement text 18 March 1994, BB II p. 451, Prlić TJ).
- [x] Counterfactual `reluctant` inventoried with BB II p. 451 provenance.
- [x] Material effects mapped to §3.3; Phase D additions proposed (sets_flags, branch_tag, alliance_lock, recruitment_modifier, future_consequences).
- [x] Runtime causality targets proposed (Phase D-deferred; coordinated with X5 composite in Phase F).
- [x] Sensitive ring: none. Modal copy register preserved per existing source_note.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

# Event Family Worksheet — B3: RBiH Vance-Owen Acceptance (1993)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_vance_owen_acceptance` (matches §4.2 row B3 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Tier A required — `agreement_text` plus `icty_icj_un` / UN-record corroboration.
**Sensitive ring:** None. Diplomatic acceptance decision; no atrocity authorization surface engaged.
**Existing catalog row:** `data/scenarios/events/war_1993.json` → `vance_owen_plan_1993` (do not edit in this slice).

---

## 1. Historical Narrative

The Vance-Owen Peace Plan (VOPP) was presented by the Co-Chairmen of the International Conference on the Former Yugoslavia, Cyrus Vance (UN) and Lord Owen (EC), in successive drafts from late October 1992 through early 1993. The plan divided the Republic of Bosnia and Herzegovina into ten semi-autonomous provinces along ethnic-geographic criteria, with a weak central government. The full VOPP textual record is captured in UN documents S/25221 (29 January 1993), S/25403 (12 March 1993), and **S/25479 (8 April 1993)** transmitting the complete plan to the Security Council, and is referenced by UNSCR 820 (17 April 1993) imposing strengthened sanctions on the Federal Republic of Yugoslavia for RS non-compliance with the framework.

### 1.1 Acceptance chronology

- **2 January 1993, Geneva:** First substantive negotiation round. HRHB (Boban) accepted the plan in principle. ARBiH/Presidency (Izetbegović) raised constitutional and territorial objections; RS (Karadžić) rejected outright.
- **30 January 1993, Geneva:** Izetbegović signed three of the four VOPP documents (the constitutional principles and the agreement on cessation of hostilities), withholding signature on the provincial map; HRHB signed all four; RS signed none.
- **3 March 1993, New York:** Izetbegović signed the provincial map under heavy US/EC pressure, with reservations.
- **25 March 1993, Athens:** Izetbegović signed the full VOPP package at the conclusion of the Athens summit convened by Greek Prime Minister Mitsotakis. **This is the canonical "RBiH acceptance" event date.** HRHB and the FRY government (Milošević) also signed; Karadžić signed conditionally on Pale Assembly ratification.
- **5-6 May 1993, Pale:** RS Assembly rejected the VOPP. RS subsequent referendum (15-16 May 1993) confirmed the rejection. Sanctions under UNSCR 820 had already taken effect; UNSCR 824 (6 May 1993) declared Srebrenica and five other locations safe areas in the immediate aftermath.

The acceptance was, in Izetbegović's documented public framing and in subsequent UN/ICTY narrative, *reluctant* and *under pressure* — not endorsement of partition along ethnic lines, but acquiescence to the best available diplomatic instrument given Sarajevo's military position in early 1993 (Cerska / Konjević Polje pocket collapses, Srebrenica enclave under siege, central Bosnia ARBiH-HVO conflict opening).

### 1.2 The historical default

**`accept`** — sourced to:
- The 25 March 1993 Athens signature (canonical signing date).
- UN S/25479 transmitting the agreed text.
- UNSCR 820 of 17 April 1993 referencing the agreed framework and imposing sanctions on the non-accepting party.
- *Prosecutor v. Karadžić* Trial Judgement (IT-95-5/18-T) §§ on the VOPP-rejection narrative — fixes RS as the *non*-accepting party, implicitly fixing RBiH (and HRHB) as accepting.
- *Prosecutor v. Prlić et al.* Trial Judgement (IT-04-74) §§ on Croat-Bosniak relations through the VOPP — narrates HRHB-RBiH frictions over the *implementation* of the accepted plan, again fixing acceptance as the RBiH baseline.

The Foundational packet §"Sensitive-History Rulings" does not gate VOPP rows; the catalog already authors this row with `historical_default_response_id: 'accept'` and `historical_marker: 'historical_default'` on the `accept` option.

---

## 2. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id (matches existing JSON):** `accept`.
**Defensibility:** Tier A. Agreement text (UN S/25479), UN Security Council action (UNSCR 820), ICTY narrative cross-references (Karadžić TJ, Prlić TJ). The 25 March 1993 Athens signature is the canonical evidentiary anchor.

`Blocked` does not apply.

---

## 3. Counterfactual Options

One counterfactual, already authored in the JSON row.

| Option id | Label | Provenance | Tier |
| --- | --- | --- | --- |
| `reject` | Reject the Vance-Owen Plan | Counterfactual reflecting RBiH Assembly debate currents and patron-pressure dynamics. The historical Sarajevo Presidency *did* deliberate rejection. The Presidency's signature was contested in the RBiH Assembly (Presidency vs. Assembly tension recurred more clearly with Owen-Stoltenberg in September 1993 per B4); the VOPP record shows Izetbegović withholding signature on the map on 30 January and accepting only under cumulative US/EC pressure between January and March. The counterfactual is: Sarajevo holds the rejection line through Athens. | C (design counterfactual with Tier A analogy) |

The existing JSON row lacks an explicit `historical_marker: 'counterfactual'` on the `reject` option. Phase D should add it.

### 3.1 RBiH Assembly debate context

The wartime Assembly of the Republic of Bosnia and Herzegovina was the constitutional body capable of overriding or ratifying Presidency-level diplomatic acts. The Assembly's documented posture through 1993 grew more skeptical of externally drafted partition frameworks as the central-Bosnia war with HVO escalated. By Owen-Stoltenberg (September 1993), the Assembly's role was decisive — the Presidency narrowly accepted on 20 September 1993; the Assembly rejected outright on 29 September 1993 (cite UN S/26486 for the negotiation record). The B3 counterfactual `reject` projects this Assembly-led rejection pattern back onto the VOPP decision window.

### 3.2 Patron pressure dynamics

Sarajevo's primary patron pressure was from the US (Christopher / Clinton administration in transition; deferred Lift-and-Strike commitment) and the EC Co-Chairmen (Owen / Vance). Iran and Saudi Arabia were diplomatic-rhetorical patrons but not the dominant pressure on the VOPP decision. The historical `accept` outcome reflects the US/EC patron weight; the counterfactual `reject` would model Sarajevo defying that weight.

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

The existing JSON row already carries material consequences. This worksheet inventories them and proposes Phase D additions.

### 4.1 Already authored (no change in Phase A)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` | `future_consequences[]` |
| --- | --- | --- | --- | --- |
| `accept` | `negotiation_capital(RBiH, international_credibility, +10)`, `patron_pressure(RBiH, -5)` | (none authored) | (none authored as dimension_shifts) | (none authored in the existing row) |
| `reject` | `negotiation_capital(RBiH, international_credibility, -10)`, `morale_change(RBiH, +3)` | (none authored) | (none authored) | (none authored) |

The existing row uses `effects[]` of kind `negotiation_capital` and `patron_pressure` directly rather than `dimension_shifts`. The Foundational packet's "Material Consequence Minimum" is satisfied. No `future_consequences` are currently authored.

### 4.2 Phase D additions (deferred — proposals only)

- Add `sets_flags: { rbih_vance_owen: 'accept' }` and `sets_flags: { rbih_vance_owen: 'reject' }` to provide the branch-flag substrate for downstream events.
- Add `future_consequences[]` entries naming the visible downstream branches:
  - On `accept`: opens Owen-Stoltenberg / Washington track visibility (per packet §4.4 X3, X5 composites and §4.2 B4, B10).
  - On `reject`: opens csq_international_disillusionment_1993 (if not already opened by another path); narrows Owen-Stoltenberg engagement framing.
- Add `historical_marker: 'counterfactual'` on `reject`.
- Add `branch_tag: 'rbih_vopp_accept'` / `'rbih_vopp_reject'` per §2.2 once `event_families.ts` lands in Phase B.
- Phase D may add a `recruitment_modifier(RBiH, modest +)` on `reject` reflecting the morale-of-defiance current; magnitude must be small enough that it does not flip `reject` into a net-positive option (would violate the historical default's status; Game Designer to confirm).

No new `effect.kind` is required.

---

## 5. Runtime Causality Targets (per §3.3)

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate |
| --- | --- | --- | --- |
| `accept` | (Phase D: Owen-Stoltenberg visibility / B4 row, Washington track / B10 reachability through flag-gating) | (none — does not foreclose `reject`-downstream rows directly; those rows are flag-gated and simply will not become eligible) | `event_flags.rbih_vance_owen = 'accept'` |
| `reject` | (Phase D: csq_international_disillusionment_1993 if not already opened by another driver; modified Owen-Stoltenberg framing) | (Phase D: may close direct Washington-track acceptance precursors; Game Designer + Canon Compliance to rule — Washington was accepted historically *despite* what happened to VOPP, so closing it would overclaim) | `event_flags.rbih_vance_owen = 'reject'` |

Note: the existing JSON row predates the Runtime Semantics Packet substrate. Phase D must add the flag write before runtime causality wiring is added; today there is no `sets_flags` write on this row, so no flag-gated downstream eligibility is possible.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Family ring:** None. VOPP acceptance is a diplomatic decision; no atrocity surface is authorized by either option.
- **Downstream ring concerns:** The plan's provincial map carved RBiH territory in ways that *would have* legitimized territorial outcomes produced by ethnic cleansing. The Foundational packet (§"Sensitive-History Rulings") does not gate VOPP rows; the existing row's source note ("does not present the plan as a moral settlement or a delivered peace") is the authored modal disclaimer. Phase D copy should retain this register; no celebratory framing of the plan as "peace."
- **Gate §3 paramilitary surface:** Not engaged.
- **Gate §4 Cost Ledger wording:** Any endgame narration tied to this branch must use historical voice and avoid framing the VOPP as "the peace that could have been" — that framing minimizes the partition basis of the plan. Narrative Designer in Phase D.

---

## 7. Citations and Sources

### Tier A — agreement_text and icty_icj_un
- **UN S/25479** (8 April 1993) — Co-Chairmen's letter to the Security Council transmitting the agreed Vance-Owen Peace Plan in full. Canonical text reference.
- **UN S/25221** (29 January 1993) — earlier draft transmission.
- **UN S/25403** (12 March 1993) — interim transmission.
- **UNSCR 820** (17 April 1993) — Security Council action on VOPP-context sanctions against the non-accepting party (FRY).
- **UNSCR 824** (6 May 1993) — safe-areas resolution declared in the immediate post-Athens, pre-Pale-rejection / post-Pale-rejection window.
- **Karadžić Trial Judgement** (ICTY IT-95-5/18-T, 24 March 2016) §§ on VOPP rejection — RS Assembly process, Pale referendum, Karadžić conditional signature.
- **Prlić et al. Trial Judgement** (ICTY IT-04-74, 29 May 2013) §§ on Croat-Bosniak relations through the VOPP window — HRHB acceptance and provincial-map implementation frictions.

### Tier B — balkan_battlegrounds
- **Balkan Battlegrounds Vol. I, pp. 6-8** — peace-plan diplomatic context (the catalog row already cites this).
- **Balkan Battlegrounds Vol. II** — central-Bosnia war operational context informing the patron-pressure calculus.

### Canonical row reference
- **`data/scenarios/events/war_1993.json` → `vance_owen_plan_1993`** — existing authored row. The catalog already pins `historical_default_response_id: 'accept'` and `historical_source: "Balkan Battlegrounds Vol. I pp.6-8; UN S/25479; UNSCR 820."` This worksheet preserves and extends the existing source citation.

### Forbidden
- Wikipedia is not cited as a primary source.
- Vance-Owen-era press commentary is not cited as primary; agreement texts and ICTY narrative are.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **Phase D edits to existing row.** This row is already in the catalog with `historical_default_response_id: 'accept'`. Phase D must add `sets_flags`, `future_consequences[]`, `historical_marker: 'counterfactual'` on `reject`, and (when Phase B lands) `branch_tag`. Coordinate with whichever wave of Phase D edits VOPP — likely Phase F (peace-plan branches) per packet §6.
2. **`reject` closure on Washington track.** Washington was accepted historically *despite* VOPP collapse. Phase A's reading is that `reject` should **not** `closes_events_runtime` Washington-precursor rows — Washington's downstream eligibility should remain reachable from the `reject` branch through a different path (e.g. continued ARBiH-HVO conflict pressure → US-brokered ceasefire). Game Designer + Canon Compliance to confirm.
3. **Patron-pressure magnitude.** The existing row uses `patron_pressure(RBiH, -5)` on `accept`. Phase D may wish to reconsider sign convention — a *historical* acceptance under patron pressure should arguably *increase* patron alignment / *decrease* friction. Game Designer to rule on whether the current effect direction is correct.
4. **Composite cross-faction coordination.** X2 (Vance-Owen overall composite) coordinates B3 with R6 (RS Assembly rejects) and H3 (HRHB acceptance under pressure). Phase F worksheet for X2 must lock the composite eligibility chain; B3's worksheet does not author it.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B3 of the runtime-semantics packet.
- [x] Historical default identified with Tier A citations (UN S/25479, UNSCR 820, ICTY).
- [x] Athens 25 March 1993 signature cited as canonical anchor.
- [x] Counterfactual `reject` inventoried with RBiH Assembly + patron pressure provenance.
- [x] Material effects mapped to §3.3; Phase D additions proposed.
- [x] Runtime causality targets proposed (Phase D-deferred; coordinated with X2 composite in Phase F).
- [x] Sensitive ring: none. Modal-copy disclaimer framing preserved per existing row's source note.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

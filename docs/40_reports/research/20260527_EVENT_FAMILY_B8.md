# Event Family Worksheet — B8: RBiH-Abdić Relationship

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_abdic_relationship` (matches §4.2 row B8 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5):** Tier A/B — UN safe-area / Bihać-pocket records and *Abdić* ICTY pre-trial materials (Tier A); Balkan Battlegrounds Vol. II for operational chronology of the APWB conflict (Tier B).
**Sensitive ring:** None at the family level. Downstream "Cleansing Day" / Velika Kladuša column return rows (1995) are Ring 1/2 territory and are gated by their own ICTY-sourced authoring; B8 itself authorizes no atrocity.
**Existing catalog rows:** `abdic_apwb_declared_1993` (turn 77, war_1993.json) and `abdic_karadzic_pact_1993` (turn 80-83, war_1993.json). Downstream: `csq_bihac_pocket_collapses_1994` (consequences.json, gated by `requires_events: ['abdic_karadzic_pact_1993']`). The csq_alliance_holds slot referenced in the packet is `csq_alliance_holds_past_w35` (consequences.json:1424) — RBiH-HRHB alliance, not RBiH-Abdić; the packet's "csq_alliance_holds" reference is a near-name; see §5.
**Per packet §4.2:** "follow-on of abdic_apwb / abdic_karadzic_pact" — engine-driven event chain; no player-decision row at the family level (counterfactual column: n/a).

---

## 1. Historical Narrative

### 1.1 Abdić and the Bihać pocket

Fikret Abdić, a Bosniak businessman and director of the Agrokomerc agro-industrial combine in Velika Kladuša, won more votes than Alija Izetbegović in the November 1990 multi-party elections for the seven-member State Presidency of SR Bosnia and Herzegovina (in the joint-list count). He ceded the rotating presidency post to Izetbegović but retained a seat. Through 1991-1992, Abdić remained inside the SDA orbit but with documented disagreements over war policy, accepting peace plans Izetbegović rejected and maintaining commercial ties across the Una-Sana economic region (including with Belgrade and Knin).

The Bihać pocket — a roughly 1,800 km² area in north-western Bosnia comprising Bihać, Cazin, Velika Kladuša, Bosanska Krupa, Bužim, and parts of Bosanski Petrovac — was encircled from June 1992 by VRS units (2nd Krajina Corps and elements of the 1st Krajina Corps) and Republic of Serbian Krajina (RSK) forces to the west. The pocket's military defense was conducted by the ARBiH 5th Corps, commanded from October 1992 by Brigadier (later Major General) Atif Dudaković.

### 1.2 APWB declaration (27 September 1993)

On 27 September 1993, Abdić declared the **Autonomous Province of Western Bosnia (APWB / *Autonomna Pokrajina Zapadna Bosna*)** centered on Velika Kladuša. The declaration followed his rejection of the Sarajevo Presidency's positions during the Geneva and HMS *Invincible* negotiations (the Owen-Stoltenberg Plan window — see B4) and his public framing of his municipality as a separate political-economic entity within Bosnia. He was supported by a portion of the Velika Kladuša / Cazin Krajina population whose economic interests had been built around Agrokomerc's pre-war cross-border trade.

UN Security Council records and UNPROFOR reports through autumn 1993 characterize the APWB declaration as the opening of an internal front inside the pocket: 5th Corps now faced VRS to the south and east, RSK to the west, and Abdić's "National Defence" militia (NOZB — *Narodna obrana Zapadne Bosne*) to the north around Velika Kladuša. Balkan Battlegrounds Vol. II treats this as the canonical operational watershed for the pocket's 1993-1995 trajectory.

### 1.3 Abdić-Karadžić pact (22 October 1993)

On 22 October 1993, Abdić signed a declaration with RS President Radovan Karadžić formally recognizing the APWB's sovereignty and committing the VRS to non-aggression, joint defense coordination, and logistical support — including arms and ammunition supplies routed through the RSK. A parallel agreement with the RSK leadership (Goran Hadžić; later Milan Martić) consolidated the three-way encirclement of 5th Corps. The pact is documented in UN records of the Bihać-pocket safe-area regime (UNSCR 824, UNSCR 836) and in subsequent ICTY filings against Abdić in Croatian and Bosnian courts. (Abdić was tried in Croatia, convicted of war crimes in 2002 — Karlovac County Court; 20-year sentence reduced on appeal to 15 years.)

### 1.4 Operational consequences through 1994-1995

- **November 1993 – August 1994.** 5th Corps fought a defensive war on three fronts. Sarajevo's documented posture was non-recognition of APWB plus military operations to clear the Velika Kladuša / Cazin sector. Operation *Tigar* (March 1994) and Operation *Spider* / *Pauk* (the RS-RSK-APWB combined counter-offensive, summer-autumn 1994) defined the operational rhythm.
- **August 1994.** 5th Corps cleared Velika Kladuša; Abdić and ~30,000 APWB supporters fled to RSK-held territory (Kupljensko / Turanj refugee camps).
- **November 1994 – December 1994.** RS-RSK-APWB *Operacija Pauk* counter-offensive recovered most of the APWB territory. UN reports document the pocket's near-collapse in late November 1994.
- **August 1995.** Operation *Storm* (Croatian army offensive against RSK) collapsed RSK; the Bihać siege effectively ended in the same window. Abdić's column returned to Velika Kladuša briefly; the post-Storm clearance of remaining APWB units is operationally folded into the 5th Corps' final 1995 campaign.

### 1.5 The "n/a counterfactual" framing

The packet classifies B8 as "follow-on of abdic_apwb / abdic_karadzic_pact" with n/a counterfactual. Phase A reading: this is correct because the *RBiH-side decision* is not a single player-facing fork. Sarajevo's posture toward Abdić was consistent throughout — political non-recognition, military operations as 5th Corps capacity allowed, no negotiated re-incorporation while Abdić remained on Karadžić-aligned terms. The variation in outcomes was driven by 5th Corps tempo, RS/RSK support intensity, and Bihać pocket supply, not by Sarajevo electing among posture options.

What B8 *does* author at the runtime-semantics level is the dimension-shift and consequence chain triggered when `abdic_apwb_declared_1993` and `abdic_karadzic_pact_1993` fire — and a possible `csq_alliance_holds` slot if Sarajevo's Bihać-pocket diplomatic posture *succeeds in keeping the APWB internal front from materializing* (counter-historical).

---

## 2. Defensible Historical Default

**Per packet §4.2:** no historical-default *option* exists at the B8 family level because no player-facing family-level decision is authored. The historical trajectory is:

- `abdic_apwb_declared_1993` fires turn 77 (engine).
- `abdic_karadzic_pact_1993` fires turn 80-83 if `abdic_apwb_declared_1993` has occurred.
- Dimension shifts and material effects compound through 1993-1995 (5th Corps supply, RBiH internal cohesion, RS territorial legitimacy).
- `csq_bihac_pocket_collapses_1994` is *conditionally* available (requires `abdic_karadzic_pact_1993` + morale-average + critical-supply), modeling the counter-historical pocket collapse.

**Engine-driven baseline:** Sarajevo refuses to recognize APWB, conducts 5th Corps clearance operations as capacity allows, prosecutes Abdić in absentia after the war. This baseline is the *absence* of a counterfactual override.

**`Blocked` does not apply.**

---

## 3. Counterfactual Options

**Per packet §4.2:** "n/a" counterfactual column. Phase A confirms: no family-level counterfactual *option set* is proposed.

### 3.1 Hypothetical counterfactuals tested

| Hypothetical | Why it fails |
| --- | --- |
| "Sarajevo grants Abdić provincial autonomy in 1993." | No Tier-A historical analogue. Izetbegović's documented record is consistent rejection. Would also corrode B1 civic-platform coherence (granting one Bosniak warlord ethnic-territorial autonomy is *not* the civic state). |
| "Sarajevo negotiates Abdić back into the SDA orbit in late 1993." | No Tier-A or Tier-B source supports this. Abdić's commitments to Karadžić and the RSK by October 1993 closed the door. |
| "Sarajevo launches 5th Corps clearance earlier (Q4 1993 instead of Q1 1994)." | Already engine-modeled via 5th Corps operations; not a family-level decision. |
| "Sarajevo accepts a UN-brokered tripartite truce in Bihać pocket." | UN attempted this in spring 1994; the historical outcome was Sarajevo non-recognition of APWB as a negotiating party. Counter-factual variant has no Tier-A source. |

### 3.2 The single defensible counterfactual slot — `csq_alliance_holds` analogue

The packet's §4.2 row B8 lists "csq_alliance_holds" among the material effects/downstreams. Phase A reading: this is **not** the same `csq_alliance_holds_past_w35` row already authored in consequences.json (that row is RBiH-HRHB alliance). The B8 slot would be a *new* consequence row — call it `csq_apwb_rupture_averted_1993` — that fires if `abdic_apwb_declared_1993` *does not* fire by a specified turn, modeling the counter-historical absence of an APWB internal front. The trigger would be engine-state-gated (RBiH internal cohesion above threshold, 5th Corps supply above threshold, no Abdić defection flag set), not a player decision.

Phase A recommends Phase D author this row as a *consequence* (not a decision row), naming it explicitly to avoid the near-name collision with `csq_alliance_holds_past_w35`. Final name to be ruled by Canon Compliance + Game Designer when the Phase D wave includes consequence rows.

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

### 4.1 Already authored (no change in Phase A)

| Row | `effects[]` | `dimension_shifts` | `sets_flags` |
| --- | --- | --- | --- |
| `abdic_apwb_declared_1993` | `morale_change(RBiH, -5)`, narrative | (none authored) | (none authored) |
| `abdic_karadzic_pact_1993` | `morale_change(RBiH, -3)`, `morale_change(RS, +2)`, `supply_delta(RS, +3)`, narrative | `RBiH.internal_cohesion: -10`, `RS.territorial_legitimacy: +5` | (none authored) |
| `csq_bihac_pocket_collapses_1994` | `morale_change(RBiH, -8)`, `cost_ledger_annotation` | `RS.territorial_legitimacy: +10`, `RBiH.military_credibility: -15` | (none authored) |

### 4.2 Phase D additions (proposals only)

- Add `sets_flags: { rbih_abdic_relationship: 'internal_front_active' }` to `abdic_apwb_declared_1993` so downstream flag-gating becomes possible.
- Add `sets_flags: { rbih_abdic_relationship: 'three_way_encirclement' }` to `abdic_karadzic_pact_1993` (transitions the flag).
- Author `csq_apwb_rupture_averted_1993` as a counter-historical consequence row (Phase D / Phase E) gated by engine state.
- No new `effect.kind` required.

### 4.3 Forbidden effect shapes

- No `control_change` effect on Bihać-pocket OSIDs from this family. Pocket OSID flips are 5th Corps operational outcomes, not B8 decisions.
- No "atrocity-efficiency" framing in any narrative copy. The Velika Kladuša 1994 clearance generated documented allegations; modal copy and consequence narration must follow Gate §4 wording constraints (historical voice, no celebration of clearance, no "demographic shift" euphemism).

---

## 5. Runtime Causality Targets (per §3.3)

| Driver | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate |
| --- | --- | --- | --- |
| `abdic_apwb_declared_1993` | `abdic_karadzic_pact_1993` (already gated via `requires_events`; promotion to runtime-array is Phase D optional) | (none) | `event_flags.rbih_abdic_relationship = 'internal_front_active'` |
| `abdic_karadzic_pact_1993` | `csq_bihac_pocket_collapses_1994` (already gated via `requires_events`; runtime promotion optional) | (Phase D: may close any counter-historical APWB-averted rows) | `event_flags.rbih_abdic_relationship = 'three_way_encirclement'` |
| counter-historical absence (engine-state gated) | `csq_apwb_rupture_averted_1993` (Phase D author) | (none) | `event_flags.rbih_abdic_relationship = 'unified'` (engine-set on absence-of-declaration turn window) |

Note: the existing rows use `requires_events` (presentation-layer / loader-validated dangling-ref). The Runtime Semantics packet §3.3 promotes these to `requires_enabled` + runtime arrays. Phase D wave for B8 should add runtime arrays to mirror the existing presentation gates, without altering historical eligibility.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Family ring at the decision level:** None (no decision authored).
- **Family ring at the consequence level:** Ring 1/2 risk on Velika Kladuša 1994 clearance narration and Kupljensko refugee column. Existing rows do not narrate the August 1994 clearance in atrocity terms; if Phase D adds a consequence row covering the clearance, it must cite ICTY/HRW/HJPC sources and follow Gate §4 wording constraints.
- **Atrocity-efficiency prohibition (Gate §3 #5):** Not engaged at the family level.
- **Gate §3 paramilitary surface:** Not engaged (5th Corps operations are regular ARBiH command, not paramilitary).
- **Gate §6 sign-off:** Not required at Phase A for B8. Required if Phase D authors a Velika Kladuša 1994 clearance consequence row with atrocity content.

---

## 7. Citations and Sources

### Tier A (`icty_icj_un` / UN safe-areas record)
- **UN A/54/549** (Secretary-General's report on Srebrenica, 15 November 1999), §§ on Bihać safe-area context — UN-record framing of the pocket's diplomatic and military situation.
- **UNSCR 824** (6 May 1993) — declares Bihać a safe area; provides the international legal frame in which APWB declaration occurred.
- **UNSCR 836** (4 June 1993) — strengthens safe-area regime, including authorization of UNPROFOR use of force in Bihać.
- **UNSCR 900** (4 March 1994) and subsequent Bihać-specific resolutions — UN record of the pocket's 1994 crisis.
- **UN S/1994/674** (Final Report of the Commission of Experts, 27 May 1994), Annex VI and Annex VII — UN factual narrative on the Bihać pocket and APWB.
- **Karlovac County Court (Croatia), *State Prosecutor v. Fikret Abdić*** (verdict 31 July 2002) — domestic Croatian war-crimes conviction of Abdić for crimes against APWB-detained prisoners. Appellate reduction to 15 years. Provides the formal legal characterization of APWB conduct.

### Tier B (`balkan_battlegrounds`, `corroborated_participant`)
- **Balkan Battlegrounds Vol. II** — Bihać pocket chapter; APWB declaration; Operations *Tigar*, *Pauk*, and the 1994-1995 trajectory. Historian to confirm exact pages from KB before Phase D authoring.
- **Atif Dudaković, on-record participant** — 5th Corps commander; sustained ARBiH service through the pocket's defense. Corroborated by BB II and UN records.

### Canon source
- **`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`** — Gate §4 wording constraints apply if Phase D narrates Velika Kladuša 1994 clearance.

### Engine / catalog source
- **`data/scenarios/events/war_1993.json`** rows `abdic_apwb_declared_1993` (line 2642) and `abdic_karadzic_pact_1993` (line 2714).
- **`data/scenarios/events/consequences.json`** row `csq_bihac_pocket_collapses_1994` (line 299).

### Forbidden
- Wikipedia not cited as primary.
- Abdić's own post-war memoir / political statements not cited as Tier-A (would require corroboration).

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **`csq_alliance_holds` slot disambiguation.** Packet §4.2 row B8 cites "csq_alliance_holds" as a downstream slot. The existing `csq_alliance_holds_past_w35` (consequences.json:1424) is RBiH-HRHB, not RBiH-Abdić. Phase A reading: B8's slot is a *new* row, recommended name `csq_apwb_rupture_averted_1993`. **Canon Compliance to rule on name; Game Designer to rule on whether the row authors in Phase D or defers.**

2. **APWB rupture opening.** Packet §4.2 says B8 "opens APWB rupture." Phase A reading: this opening is *engine-driven* via the existing `requires_events` chain (`abdic_apwb_declared_1993` → `abdic_karadzic_pact_1993` → `csq_bihac_pocket_collapses_1994`). No new player-facing row is needed; the runtime-semantics packet additions promote the existing chain from presentation-gates to runtime-arrays. Confirm.

3. **Velika Kladuša 1994 clearance narration.** If Phase D adds a consequence row covering the 5th Corps clearance of Velika Kladuša (August 1994) and the Kupljensko refugee column, that row falls under Gate §4 wording constraints and may require Gate §6 sign-off. Phase A recommends *not* authoring this row at the B8 family level; it belongs to a 5th Corps operational arc (potentially a separate B6 cluster row). Coordinate with B6 worksheet authoring.

4. **Branch-tag vocabulary.** The vocabulary stub lists no B8 entries currently. If Phase D authors `csq_apwb_rupture_averted_1993`, the corresponding branch-flag substrate value (`event_flags.rbih_abdic_relationship`) should be added — values `internal_front_active`, `three_way_encirclement`, `unified`. Confirm with Technical Architect when `event_families.ts` lands in Phase B.

5. **Bot calibration.** Under `bot_response_logic: 'historical'`, RBiH bot has no decision row to evaluate (B8 has no player-facing decision); the historical trajectory plays out via engine-driven triggers. Confirm calibration baseline reflects this once any Phase D runtime-array promotions land.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B8 of the runtime-semantics packet.
- [x] Historical narrative cited to Tier A/B (UN records, UNSCRs 824/836/900, Karlovac verdict 2002, BB II).
- [x] APWB declaration (27 Sept 1993) and Abdić-Karadžić pact (22 Oct 1993) dates fixed.
- [x] No family-level player decision row — confirmed and justified.
- [x] Counterfactual hypotheticals tested against defensibility and rejected with reasons.
- [x] Existing engine rows inventoried with dimension shifts.
- [x] Runtime causality targets proposed (Phase D-deferred; runtime-array promotion of existing `requires_events` chain).
- [x] Sensitive ring fixed at None at family level; Ring 1/2 risk flagged on potential Velika Kladuša narration.
- [x] `csq_alliance_holds` near-name collision identified and resolution proposed (`csq_apwb_rupture_averted_1993`).
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

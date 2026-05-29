# Event Family Worksheet — H2: Gornji Vakuf Clashes 1993

**Date:** 2026-05-27
**Family ID:** H2
**Faction scope:** HRHB (responding faction); cross-faction visibility to RBiH and RS
**Source tier:** `icty_icj_un` (Prlić et al. IT-04-74; Blaškić IT-95-14-T; Kordić IT-95-14/2-T) corroborated by `balkan_battlegrounds` (BB Vol. II, pp. 448, 452, operational chronology)
**Sensitive-history ring:** **Ring 1/2 — sensitive boundary.** The Gornji Vakuf operations of January 1993 included documented attacks on Bosniak villages (Dusina, Bistrica, Ždrimci, and others) with civilian casualties prosecuted under ICTY indictments. Option set must not authorize new atrocities under packet §3.6. `escalate` describes the **historical local-escalation posture** (reinforcement of HVO operational presence) and **does not authorize** any specific incident; specific atrocities remain engine-driven via existing combat / paramilitary systems and Ring 1/2 narrative essays.
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The Gornji Vakuf clashes of January 1993 are the **first sustained large-scale HVO-ARBiH armed confrontation** of the Croat-Bosniak war, predating the Lašva-valley campaign of April 1993 (Ahmići, Vitez, Busovača, Kiseljak) by approximately three months. Documented in:

- **Prlić et al. IT-04-74-T Trial Judgment** (29 May 2013) Vol. 2 §§221-310 reconstructs the Gornji Vakuf (Uskoplje) operations of January 1993 in detail: HVO ultimatum to ARBiH 4th Corps units demanding subordination to HVO command per the Vance-Owen Provincial Province 10 territorial framework, ARBiH refusal, HVO offensive 11-15 January 1993, ARBiH counter-resistance, and the local battle's failure to produce HVO operational control of the town. The Trial Chamber found that the HVO offensive included attacks on Bosniak-majority villages in the surrounding area (Dusina, Bistrica, Ždrimci, Hrasnica, Uzričje, Duša) with civilian casualties and forced displacement. The Trial Chamber treated these attacks as evidence of the JCE territorial-cleansing pattern; specific killings at Duša and elsewhere are individuated in the judgment.
- **Blaškić IT-95-14-T Trial Judgment** (3 March 2000) §§161-220 frames the Gornji Vakuf operations within the Operative Zone Central Bosnia institutional history and the cascade of January-April 1993 HVO operations.
- **Kordić IT-95-14/2-T Trial Judgment** (26 February 2001) §§560-650 includes Gornji Vakuf as part of the broader Croat-Bosniak war initial-phase chronology preceding Lašva valley.
- **Balkan Battlegrounds Vol. II pp. 448, 452** (cited in the existing `gornji_vakuf_clashes_1993` event's `historical_source`) provides BB operational chronology: HVO Tomislavgrad-Rama operational direction; ARBiH 317th Mountain Brigade and elements of 305th Brigade defending; clashes 11-25 January with periodic local cease-fires; the Vance-Owen provincial map used as territorial pretext.

The **historical actor** — HZ HB Presidency and HVO command in the January 1993 window — pursued the **escalation posture**: reinforcement, refusal to withdraw, repeated attempts to enforce the HVO ultimatum, and continuation of operations through the local cease-fires. Local cease-fires were signed and broken; Prlić Trial Judgment Vol. 2 §§280-310 documents the breakdown of the 13 January UNPROFOR-mediated cease-fire within 48 hours.

The **historical default for H2 is therefore `escalate`** in the sense of the **operational-command posture**: reinforce, maintain HVO presence, refuse ARBiH command, continue operations. This is **distinct from authorization of specific atrocities** — the Duša/Bistrica/Ždrimci attacks emerged from the operational tempo and the JCE structural framework, not from a discrete Presidency-level "attack these villages" instruction. The ICTY found JCE liability at the structural / contributory level (Prlić Trial Judgment Vol. 4 §§44-67; Appeals Judgment §§601-650), not as a single-event discrete command.

This Ring 1/2 distinction is load-bearing: the AWWV `escalate` option describes the historically-documented operational posture; the specific atrocity outcomes (civilian deaths, forced displacement at Duša and surrounding villages) are Ring 1 mechanical consequences of the resulting combat and the existing paramilitary / displacement / war-crimes-counter systems, plus Ring 2 narrative essays. The player does not author the atrocity; the player authors the operational posture, and the atrocity emerges from the war (per Gate §1 Ring 1 framing).

## 2. Defensible Historical/Default Option

- **Label:** `escalate` — Reinforce HVO presence at Gornji Vakuf; maintain the operational push; treat the Vance-Owen provincial framework as binding on ARBiH command-subordination.
- **Rationale:** This describes the **historically-documented operational posture** of HZ HB / HVO command in January 1993. Reinforcement, refusal of withdrawal, and continuation through local cease-fires are matters of operational fact in Prlić Vol. 2, Blaškić §§161-220, and BB II pp. 448-452. **`escalate` is the historical-default label per packet §4 H2 row.** It does not authorize specific atrocities; it authorizes the operational tempo from which the atrocities emerged within existing engine systems.
- **Citation:** Prlić et al. IT-04-74-T Trial Judgment Vol. 2 §§221-310 and Vol. 4 §§44-67; Prlić Appeals Judgment §§601-650; Blaškić Trial Judgment §§161-220; Kordić Trial Judgment §§560-650; BB Vol. II pp. 448, 452.

**Ring 1/2 boundary note:** The existing `gornji_vakuf_clashes_1993` event in `data/scenarios/events/war_1993.json` already authors `escalate` as `historical_default` with `effects: [alliance_change -0.2, morale_change HRHB +3]` and **no atrocity-authorizing effect**. The current authoring respects the boundary. Phase D should retain this shape and add runtime-causality fields **without** introducing new effects that would amount to authorizing specific civilian attacks. Per packet §3.6: a response option that extends, continues, or scales a sensitive-history act already in state is rejected; the `paramilitary_policy` field is the only player-authorized war-crime surface, and H2 must not encroach on it.

## 3. Proposed Counterfactual Options

### Option: `negotiate`
- **Label:** `negotiate` — Pursue a local cease-fire; pull back HVO units from contested positions; defer the provincial command-subordination dispute to higher-level Vance-Owen negotiations.
- **Historical analogy:** Multiple local cease-fires **were** signed in January 1993 (notably the 13 January UNPROFOR-mediated cease-fire). The historical record shows these collapsed within hours-to-days because the underlying HVO ultimatum was not withdrawn. Counterfactually, a sustained `negotiate` posture would require the HVO ultimatum itself to be withdrawn — a Presidency-level decision that BB II and Prlić document as not occurring. The branch counterfactually models the Presidency choosing to honor the cease-fire by withdrawing the underlying ultimatum.
- **Design provenance:** `design_counterfactual` — the historical record is unambiguous that the HZ HB Presidency did not withdraw the ultimatum. Provenance is grounded in (a) the existence and signing of local cease-fires (Prlić Vol. 2 §§280-310), (b) the Mostar 1992 precedent of HZ HB Presidency-level command discipline (when prioritized), and (c) the broader counterfactual that the Croat-Bosniak war was avoidable at multiple decision points.
- **Sensitive-history check:** Confirmed — `negotiate` authorizes no atrocity, no detention, no displacement, no civilian targeting. It is a de-escalation branch. By foreclosing the operational tempo, it indirectly suppresses the conditions under which the Duša / Bistrica / Ždrimci attacks emerged; the foreclosure is mechanical (the trigger for the central-Bosnia war chain does not satisfy) not authorial (no Ring 1 row is directly closed via author intent).

## 4. Material Effects (per packet §3.3)

The row is already authored. Phase D will add runtime-causality fields. Field recommendations:

- **`sets_flags`** (NEW, Phase D adds to existing authoring):
  - `escalate`: `central_bosnia_war_posture: 'escalation'`, `hvo_arbih_war_active: true`
  - `negotiate`: `central_bosnia_war_posture: 'local_ceasefire'`, `hvo_arbih_war_active: false`
- **`effects[]`** (already authored, retain):
  - `escalate`: `alliance_change: -0.2`, `morale_change HRHB: +3`. **No atrocity-authorizing effect added.**
  - `negotiate`: `alliance_change: -0.05`, `morale_change HRHB: -2`. **No atrocity-authorizing effect.**
- **`dimension_shifts[]`** (recommended additions for Phase D author):
  - `escalate` HRHB: `patron_confidence: +5` (Zagreb reads escalation as commitment to HZ HB project), `international_standing: -8` (Western capitals visibility increases), `military_credibility: +3` (operational decisiveness), `internal_cohesion: -3` (HVO units in Mostar-defense mold strained).
  - `negotiate` HRHB: `patron_confidence: -10` (Zagreb reads as non-alignment), `international_standing: +5`, `military_credibility: -5` (ultimatum visibly retracted), `internal_cohesion: 0`. RBiH: `internal_cohesion: +5` (joint front salvaged).
- **`enables_events_runtime`** (NEW):
  - `escalate`: opens `csq_hvo_central_bosnia_offensive_1993` (already in catalog; runtime open documents the causal chain). Does **not** directly open Ahmići / Stupni Do / Mostar-bridge specific rows — those are Ring 1/2 narrative essays + engine-driven consequence rows that fire on their own mechanical conditions (paramilitary sweep, displacement triggers, combat outcome) within the broader war state, per Gate §3 and packet §3.6's no-leverification rule.
  - `negotiate`: opens no new events. Preserves optionality for `washington_agreement_acceptance_1994` (H9) and federation-track downstream.
- **`closes_events_runtime`** (NEW):
  - `escalate`: closes none directly; the central-Bosnia war chain is now active and runs its course via existing systems.
  - `negotiate`: closes `csq_hvo_central_bosnia_offensive_1993` (counterfactual foreclosure of the war chain). Does **not** close Ahmići / Stupni Do / Mostar-bridge directly — by suppressing the war chain at its trigger, the downstream rupture rows mechanically do not fire (Gate §1.5 #11 emergent satisfaction; counterfactual silence is canonically correct).
- **`branch_tag`** (per packet §2.2 vocabulary; reuse `hrhb_alliance` family or new `hrhb_central_bosnia` family — recommend new for clarity):
  - `escalate` → `hrhb_central_bosnia_war`
  - `negotiate` → `hrhb_central_bosnia_ceasefire`
- **`trigger.condition`** (already authored): `alliance_below 0.45`, turn 35-60. Retain. Phase D may add prerequisite gate `requires_enabled: true` keyed off H1a `local_friction_emerges` if the H1a worksheet's `enables_events_runtime` arrangement passes Canon Compliance review.

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `escalate`:**
  - `csq_hvo_central_bosnia_offensive_1993` (already in catalog)
  - Mechanically (not author-opened) raises probability of Ring 1/2 incident rows firing via combat-outcome / paramilitary-sweep / displacement triggers — these remain consequence-driven per Gate §1.5 #11.
- **Opens (eligibility) — `negotiate`:**
  - No direct new opens. Preserves H9 / X5 reachability.
- **Closes (eligibility) — `negotiate`:**
  - `csq_hvo_central_bosnia_offensive_1993` (direct foreclosure)
  - Indirect mechanical foreclosure of downstream Ring 1/2 rows via the central-Bosnia war chain not activating (no atrocity row is directly author-closed)
- **Branch-tag vocabulary** (additions to `event_families.ts`): new `hrhb_central_bosnia` family; `hrhb_central_bosnia_war` / `hrhb_central_bosnia_ceasefire` tags.

## 6. Modal Source Notes

> "On 11-25 January 1993 HVO units besieged Gornji Vakuf (Uskoplje) to enforce HVO command-subordination of ARBiH 4th Corps under the Vance-Owen provincial framework; local cease-fires collapsed within days. ICTY Prlić IT-04-74 (Vol. 2 §§221-310; Vol. 4 §§44-67 on JCE), Blaškić IT-95-14-T (§§161-220), and Kordić IT-95-14/2-T (§§560-650) document the operations and the contemporaneous civilian-targeting attacks at Duša and surrounding villages; BB Vol. II pp. 448, 452 provide operational chronology." (compressed to ≤2-sentence modal length in Phase D.)

## 7. Open Questions

1. **Ring 1/2 boundary verification — `escalate` effects.** Phase D loader test must verify that `escalate`'s effects list contains **no** `paramilitary_policy` write, no `control_change` of the affected villages (which would author rather than emerge the territorial outcome), no `displacement_*` write, and no `war_crimes_events` increment that bypasses paramilitary / combat systems. Per packet §3.6: this is the continuation-of-act overlap clause from v1.1 Edit 5 — Phase B loader test must reject any future H2 amendment that would scale or authorize the sensitive acts already emerging from the war.
2. **Closes-events scope — `negotiate`.** Per Gate §1.5 #11 the foreclosure should be mechanical (trigger-condition unsatisfied) rather than authorial direct-close of Ring 1/2 rows. The `closes_events_runtime: [csq_hvo_central_bosnia_offensive_1993]` recommendation directly closes only the policy-level consequence row, not the Ring 1/2 incident events. Defer to Canon Compliance Reviewer for final verification.
3. **Cost floor for `negotiate`.** Per packet §3.6 (no calendar-only foreclosure) and the R7/B6/H1/H1a precedent: Phase D should specify a `patron_confidence: -10` minimum and a `military_credibility: -5` reflecting Zagreb's documented response to HVO command pull-backs (Prlić Vol. 2 §§280-310 on Zagreb pressure during the cease-fire windows). Defer to Game Designer.
4. **Trigger-prerequisite on H1a.** The current `gornji_vakuf_clashes_1993` trigger is `alliance_below 0.45` plus turn range — i.e., emergent on the alliance state set by H1 / H1a outcomes. Phase D should confirm whether adding an explicit `requires_enabled: true` prerequisite gated by H1a is helpful or whether the alliance-floor trigger is sufficient. Recommend the alliance-floor trigger remain authoritative (it is the mechanical predicate per Gate §1.5 #11) and that H1a runtime-causality `enables_events_runtime: [gornji_vakuf_clashes_1993]` be **documentary** (records the causal link in `event_causality_log`) rather than a hard gate. Defer to Technical Architect.

# Event Family Worksheet — B2: RBiH Paramilitary Policy

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_paramilitary_policy` (matches §4.2 row B2 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`; mirrors R2 in shape per Foundational packet §"Sensitive-History Rulings").
**Source tier (per §5):** Tier A required — `icty_icj_un` for the discipline comparison; the Gate is the canon-bound source for the option set.
**Sensitive ring:** **Ring 1.** Canon-bound option set per `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §3.
**Existing catalog row:** No standalone authored row yet (the paramilitary surface is currently modeled as `state.military.paramilitary_policy: 'always_allow' | 'always_deny' | 'ask'` on game state, not as a player-facing decision event). Phase D may author the decision event; this worksheet sets the boundary.
**Mirrors:** R2 (RS paramilitary policy in war); the engine field and option vocabulary are shared, faction-keyed.

---

## 1. Canon-Bound Source for the Option Set

This worksheet's authoring rules are **not negotiable** at the option-set level. Per `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §3:

> The `paramilitary_policy` field on `GameState` (`'always_allow' | 'always_deny' | 'ask'`) is the **only** player-facing surface that authorizes war crimes. This is deliberate.

The option set is therefore bounded to exactly three values: `always_allow`, `ask`, `always_deny`. The Gate further prohibits expanding the surface (Gate §3 "What it must never become"):

- No "level of brutality" slider with five or ten positions.
- No "paramilitary doctrine" submenu with specialized unit types.
- No optimization surface for choosing target populations.
- No risk/reward tooltip framing atrocity as a trade.

The engine field is documented at `src/state/game_state.ts` line 1908: `paramilitary_policy?: 'always_allow' | 'always_deny' | 'ask';`. The Phase D player-facing decision event must write this exact field with exactly these three values. Any expansion is rejected by the Gate without further review.

---

## 2. Historical Narrative

ARBiH paramilitary discipline relative to RS and HRHB is documented across the ICTY record and the UN Secretary-General's investigative reporting.

### 2.1 ARBiH discipline baseline

ARBiH formed in April-May 1992 by integration of TO units, civilian police, and emergent armed formations including the Patriotic League and (briefly) the Green Berets. The Sarajevo Presidency's documented policy from mid-1992 onward was integration of irregular formations into the regular chain of command; high-profile cases include the disarming and absorption of independent Sarajevo-area units in late 1993 (the operations against Caco Topalović's 10th Mountain Brigade and Celo Delalić's 9th Mountain Brigade, October 1993) and the integration trajectory of the 7th Muslim Brigade and the El Mujahid detachment, both of which operated under ARBiH chain of command after their integration even where their operational conduct generated separate ICTY findings.

ARBiH did produce atrocities — Grabovica, Uždol, Kazani-area killings, and the El Mujahid-linked detentions — and individual ARBiH commanders were convicted at ICTY (Hadžihasanović and Kubura, IT-01-47, command responsibility for the 7th Muslim Brigade and 3rd Corps detentions; Orić, IT-03-68, ultimately acquitted on command responsibility). The discipline finding is therefore *relative*, not absolute: ARBiH atrocities were prosecuted as deviations from a chain-of-command structure that did intervene against irregulars, in contrast to the RS and HRHB records where paramilitary deployment was a sustained instrument of policy.

### 2.2 RS comparator

RS paramilitary policy in 1992 is documented in *Prosecutor v. Stakić* (IT-97-24), *Prosecutor v. Brđanin* (IT-99-36), *Prosecutor v. Tadić* (IT-94-1), and *Prosecutor v. Karadžić* (IT-95-5/18-T) as systematic tolerance of and coordination with Arkan's Tigers, Šešelj's White Eagles, and locally-raised paramilitaries through the Crisis Staffs and the Ministry of Internal Affairs. UN A/54/549 §§ Historical Context and the UN Commission of Experts Final Report (S/1994/674) corroborate the policy-level characterization. The historical default for RS is `always_allow` per packet §4.1 row R2.

### 2.3 HRHB comparator

HRHB paramilitary deployment is documented in *Prosecutor v. Prlić et al.* (IT-04-74) and *Prosecutor v. Naletilić & Martinović* (IT-98-34) as sustained policy-level use of irregular formations (the Convicts Battalion / KB under Naletilić; HOS structures before integration; ATG-type units), with the JCE finding in Prlić establishing that paramilitary use was integral to the HRHB political-territorial project. The historical default for HRHB is `always_allow`.

### 2.4 Historical default for RBiH

**`always_deny`.** Sourced to the ARBiH chain-of-command discipline record above. The historical Sarajevo posture was integration of irregulars into the regular army with prosecution of those who refused; Sarajevo did not maintain a *separate* paramilitary track parallel to ARBiH the way Pale and Mostar did. The `always_deny` label captures this *as the policy stance toward maintaining a parallel paramilitary track*, not as a claim that ARBiH committed no atrocities — those atrocities are recorded in Ring 2 (essays + ICTY citations) regardless and increment the `war_crimes_events` counter through existing engine mechanics whenever they occur.

---

## 3. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id:** `always_deny`.
**Defensibility:** Tier A. ICTY Hadžihasanović/Kubura (chain-of-command findings against ARBiH commanders, showing that ARBiH chain of command did exist and was prosecuted), Karadžić TJ (comparative narrative on Sarajevo state institutions), and UN A/54/549 §§ on Sarajevo posture sustain the finding. The relative-discipline framing is the canonical historian position, not a contested counterfactual.

`Blocked` does not apply.

---

## 4. Counterfactual Options

Two counterfactuals, both bounded by the Gate §3 option-set canon.

| Option id | Label | Provenance | Tier | Notes |
| --- | --- | --- | --- | --- |
| `ask` | Per-request review | Design counterfactual reflecting a hybrid posture not historically chosen by Sarajevo. Engine default for the field is `ask` per the Gate; the Phase D event must label this option `counterfactual` for RBiH because the historical posture was systemic denial, not per-request review. | C (design counterfactual with Gate §3 UI rule) | The Gate's UI rule (§3) requires per-request modals with civilian casualty projection, war-crime increment, and standing impact; no rounded numbers, no military-necessity framing. |
| `always_allow` | Tolerate parallel paramilitaries | Counterfactual. No defensible historical sourcing for an RBiH `always_allow` policy. The counterfactual cost floor must be steep — Phase D worksheet must include an `aggression_modifier`, ICTY-exposure flag, and international standing penalty at least as severe as the historical RS condemnation arc (Gate §3 #5 — no atrocity-efficiency surface). | C | This option is constrained but **not forbidden** — the Gate permits the player to take a non-historical war-crime authorization stance and bear its consequences. Forbidden would be option *expansion* (slider, doctrine submenu, targeting). |

The Gate's §3 prohibition on framing this as a trade applies to *the modal copy and the UI representation*, not to the underlying material effects. Material effects must be honest and severe for `always_allow`; modal copy must not say "+5% territorial efficiency, -3% standing." It must say "civilian casualties: N; war-crime events incremented; international standing reduced; ICTY-exposure flag set."

---

## 5. Material Effects (per §3.3 of the Runtime Semantics Packet)

The engine field `state.military.paramilitary_policy` is the canonical state write. The Phase D event must produce this write plus material consequences that match the option.

### 5.1 Proposed effects per option (Phase D-deferred — proposals only)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` | `future_consequences[]` |
| --- | --- | --- | --- | --- |
| `always_deny` | (none — denial is the absence of authorization, not a positive material write) | `paramilitary_policy: 'always_deny'`; engine-level `state.military.paramilitary_policy = 'always_deny'` | `RBiH.international_standing: +5` (modest; the floor was historical), `RBiH.internal_cohesion: -3` (reflecting the Caco/Celo October 1993-style integration friction) | `csq_paramilitary_authorization_refused` (per §4.2 row B2 inventory) — flag-gated downstream rows reflecting consistent posture |
| `ask` | (none on the decision; per-request modals carry their own effects through existing `paramilitary_sweep` engine path) | `paramilitary_policy: 'ask'`; engine `state.military.paramilitary_policy = 'ask'` | (none on the decision) | (none — per-request decisions are the consequence) |
| `always_allow` | `aggression_modifier(RBiH, +)` (specific magnitude TBD by Game Designer; bot priority shift toward paramilitary deployment); ICTY-exposure flag write | `paramilitary_policy: 'always_allow'` | `RBiH.international_standing: -25` (floor at least as severe as historical RS arc per §4 inventory; Game Designer to confirm exact magnitude in Phase D), `RBiH.negotiating_leverage: -15`, `RBiH.internal_cohesion: 0` or modest negative (no morale "boost" for atrocity per Gate §3 #5) | `csq_paramilitary_authorization_granted_rbih` (Phase D may need to author this row to mirror R2's downstream); `csq_international_disillusionment_1993` (already exists) reachable via flag substrate |

### 5.2 Forbidden effect shapes (per Gate §3 #4, #5)

- No positive morale, recruitment, or aggression effect that exceeds the international-standing penalty on `always_allow` (no net positive material outcome from atrocity authorization).
- No `control_change` effect anywhere in this family (Gate §6 escalation; Sensitive-History Gate sign-off required).
- No `effects` that scale, continue, or optimize an existing sensitive act per Runtime Semantics packet §3.6 (continuation-of-act clause).

### 5.3 War-crimes counter

`war_crimes_events` increments are produced by the existing `paramilitary_sweep` engine path on each capture, **not by this decision event**. The decision event sets the *policy*; the engine produces the counter consequences. This separation is canonical (Gate §1 Ring 1 — `FactionCapital.war_crimes_events` increments with every paramilitary capture).

---

## 6. Runtime Causality Targets (per §3.3)

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate |
| --- | --- | --- | --- |
| `always_deny` | `csq_paramilitary_authorization_refused` | (none — does not foreclose `csq_paramilitary_authorization_granted_rbih`; that row is flag-gated and simply will not become eligible) | `event_flags.rbih_paramilitary_policy = 'always_deny'` (and engine field write) |
| `ask` | (none on the decision; per-request modals are the chain) | (none) | `event_flags.rbih_paramilitary_policy = 'ask'` |
| `always_allow` | `csq_paramilitary_authorization_granted_rbih` (Phase D may author), `csq_international_disillusionment_1993` (flag-gated) | (none — the close on reintegration paths emerges from the standing penalty and downstream flags, not from a direct close on B2) | `event_flags.rbih_paramilitary_policy = 'always_allow'` |

Note: Phase D must verify each downstream row's `trigger.condition` aligns with the flag write per §3.3, and that no Ring-3 atrocity row appears in any `enables_events_runtime` (loader rejection per Runtime Semantics §3.6).

---

## 7. Sensitive-History Ring (per Gate §1)

- **Family ring:** **Ring 1.** The paramilitary surface is Ring-1 modeled-mechanically state.
- **Option-level ring constraints:**
  - `always_deny`: No sensitive content. Modal copy should not frame the choice as moral superiority — historical voice, third-person, per Gate §4 wording constraints.
  - `ask`: No sensitive content at the decision level; per-request modals carry the sensitive content under Gate §3's UI rule.
  - `always_allow`: Sensitive at the consequence level. Modal copy must follow Gate §4 — no euphemisms ("ethnic cleansing" if applicable, not "demographic shift"), no minimization, no trade-style framing.
- **Gate §3 exhaustive prohibitions to enforce in Phase D:**
  - No slider expansion of the option set.
  - No doctrine submenu after authorization.
  - No targeting UI ("which populations").
  - No risk/reward tooltip on `always_allow`.
- **Gate §6 sign-off chain for Phase D authoring of this row:** `/game-designer` + `/ui-ux-developer` + **user review before implementation** (Gate §6 row "Change to paramilitary policy surface"). This worksheet does *not* approve Phase D authoring; it documents the bounds.

---

## 8. Citations and Sources

### Tier A (`icty_icj_un`) — required for Ring 1
- **Hadžihasanović & Kubura Trial Judgement** (ICTY IT-01-47, 15 March 2006) — ARBiH 3rd Corps and 7th Muslim Brigade command-responsibility findings; corroborates ARBiH chain of command and its disciplinary reach.
- **Orić Trial and Appeal Judgements** (ICTY IT-03-68, 30 June 2006 / 3 July 2008) — Srebrenica enclave ARBiH commander; ultimate acquittal on command responsibility cited as relevant to the comparative discipline frame.
- **Karadžić Trial Judgement** (ICTY IT-95-5/18-T, 24 March 2016) — comparative narrative on Sarajevo state institutions and chain of command.
- **Stakić Trial Judgement** (ICTY IT-97-24, 31 July 2003) and **Brđanin Trial Judgement** (ICTY IT-99-36, 1 September 2004) — RS comparator: paramilitary tolerance as policy.
- **Tadić Trial Judgement** (ICTY IT-94-1, 7 May 1997) — earliest ICTY finding on Prijedor / Omarska paramilitary deployment under RS authority.
- **Prlić et al. Trial and Appeal Judgements** (ICTY IT-04-74, 29 May 2013 / 29 November 2017) — HRHB comparator: paramilitary use as JCE instrument.
- **Naletilić & Martinović Trial Judgement** (ICTY IT-98-34, 31 March 2003) — HRHB Convicts Battalion (KB) findings.
- **UN A/54/549** (Secretary-General's report on Srebrenica, 15 November 1999) — Sarajevo posture and chain-of-command institutional context.
- **UN S/1994/674** (Final Report of the Commission of Experts established pursuant to UNSCR 780, 27 May 1994), Annex III.A "Special Forces" — comprehensive paramilitary inventory across all three factions.

### Canon source
- **`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §3** — option-set canon. Cited here as the binding source for the three-value vocabulary and the prohibition on expansion. This is canon-bound, not negotiable at the Phase A research level.

### Engine source
- **`src/state/game_state.ts` line 1908** — `paramilitary_policy?: 'always_allow' | 'always_deny' | 'ask';` — the canonical state field this family writes.

### Tier B
- **Balkan Battlegrounds Vol. I** — Caco / Celo October 1993 disarming operations narrative; ARBiH integration trajectory. Historian to confirm exact pages from KB before Phase D authoring.

### Forbidden
- Wikipedia is not cited as a primary source.
- BB aggregate troop strengths are unreliable per skill brief; not used in this worksheet.

---

## 9. Open Questions for Canon Compliance / Game Designer Review

1. **Phase D authoring scope.** Does B2 ship as a standalone player-facing decision event (turn 2-5, mirroring B1's window), or does it remain a scenario-setup field with no in-game event? Game Designer to rule. Gate §6 requires user review before implementation regardless.
2. **`always_allow` magnitude floors.** Exact dimension-shift magnitudes for the counterfactual `always_allow` option need Game Designer confirmation. Phase A's recommendation: international standing penalty at least equal to the historical RS condemnation arc cumulative effect at the matching point in the timeline.
3. **`csq_paramilitary_authorization_granted_rbih` authoring.** Does Phase D author a new downstream consequence row, or does `always_allow` route through an existing csq_* row? Canon Compliance to rule.
4. **Bot calibration.** RBiH bot under `bot_response_logic: 'historical'` must pick `always_deny`. Verify presidential-acceptance probe coverage post-authoring (Phase D); the historical default must reach the bot calibration baseline.
5. **Modal copy.** Phase D must commission narrative-designer copy under Gate §4 wording constraints. This worksheet does not draft copy; it sets the constraints.

---

## 10. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B2 of the runtime-semantics packet.
- [x] Option set canon-bound to Gate §3 three-value vocabulary; no expansion.
- [x] Historical default identified with Tier A citations.
- [x] Counterfactual options inventoried with constraints.
- [x] Material effects mapped to §3.3 with forbidden shapes documented.
- [x] Runtime causality targets proposed (Phase D-deferred).
- [x] Sensitive ring fixed at Ring 1; Gate §6 sign-off chain noted.
- [x] Engine field (`src/state/game_state.ts:1908`) cited as canonical state target.
- [x] Open questions surfaced for Canon Compliance / Game Designer / user review.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.

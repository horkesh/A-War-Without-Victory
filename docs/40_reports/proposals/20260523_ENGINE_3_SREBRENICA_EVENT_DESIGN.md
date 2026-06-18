# ENGINE-3 — Srebrenica/Žepa Fall: Event Design Memo

> **Superseded 2026-06-18:** This memo's recommendation to restore Srebrenica/Zepa fall receipts through Krivaja-95/Stupcanica-95 operation delivery is superseded. The accepted model is event-owned fall receipt (`control_change` in `srebrenica_falls_1995` / `zepa_falls_1995`) plus rupture observation of the resulting Srebrenica control state. Treat the operation-delivery analysis below as historical audit context only.

- **Date:** 2026-05-23
- **Lane:** ENGINE-3 (n1992 spatial-metric audit follow-up)
- **Status:** DESIGN MEMO — READ-ONLY investigation, no edits proposed beyond design space
- **Scope:** 11 misplaced Srebrenica OSIDs + 4–5 Žepa OSIDs at 188w (Jul 1995 historical fall, RBiH→RS direction)
- **Authority frame:** This memo is **bounded** by `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (Ring 1/2/3 + Rupture Expansion Rule §2 criterion 3) and `Q-CANON-RUPT-4` Path (d) resolution. Any option that violates the binding "no calendar-driven heuristic substitution" clause is out of scope.

---

## 0. TL;DR

1. **The combat side already exists**: `Operation Krivaja-95` and `Operation Stupčanica-95` are wired in `triggered_operations.ts` with the §6-compliant t≥170 / t≥172 floors, faction=RS, primary_corps=vrs_drina, and correct ICTY-Popović-sourced brigade rosters and srebrenica/zepa OSID objectives.
2. **They fire but do not deliver**: diagnostic V2 (`20260504_SREBRENICA_DIAGNOSTIC_V2.md`) confirms `Operation Krivaja-95` launched at t180 with `force_ratio_estimate = 0.0918` (130× weaker than the t6 baseline ratio of `11.957`) and was `planning_invalidated`. Drina perimeter held 9,434 pers across 7 brigades; only 2 brigades / 2,558 pers were committed (27%). Žepa similar: `Stupčanica-95` at `0.838`, recovered at `max_failures`. **Combat math + corps-AI commit jointly block delivery** at the layered capital-OSID defense envelope (capital_garrison_mult=2.0 × resilience-25 hardened × pocket garrison from population).
3. **Canon already foreclosed the "scripted flip" option**: Q-CANON-RUPT-4 Path (d) — implemented `20260504` — added §1.5 #11 to the Sensitive History Design Gate: *"No calendar-driven atrocity recording. Rupture events fire only on mechanical c2 satisfaction…The historical calendar alone is not a trigger; the modeled war must produce the trigger condition."* Counterfactual silence is canonically correct; the `enclave_defended` ghost entry already exists for the divergent path.
4. **The 11 misplaced OSIDs are therefore a calibration problem, not an event-design problem.** Recommended option: **Option (b′) — restore-Krivaja-delivery via combat-math relaxation and/or corps-AI commit floor**, the two open §6-gated lanes Q-CANON-RUPT-1 and Q-CANON-RUPT-2. **Option (a) — scripted control_change flip — is canon-forbidden.** Option (c) and (d) variants that compute a "calendar-window enclave collapse" are also canon-forbidden under §1.5 #11.

---

## 1. Existing event infrastructure — summary

### 1.1 Event loader and effect surface

- **Loader:** `src/sim/events/event_loader.ts` reads `data/scenarios/events/{war_1992,war_1993,war_1994,war_1995,consequences}.json`, filters by `scenarioStartWeek`, sorts by `(turn_min, id)` for deterministic evaluation.
- **Effect surface:** `src/sim/events/event_types.ts` declares 18 effect kinds; `apply_effects.ts` applies them with a stable alphabetical `EFFECT_KIND_ORDER`. The relevant effect for territorial flips is:

  ```ts
  /** Effect: flip OSID control to a faction. Used for barracks seizures, territorial events. */
  export interface EventEffectControlChange {
      kind: 'control_change';
      faction: FactionId;
      osids: string[];
  }
  ```

  Implementation: `applyControlChange` (apply_effects.ts L256–271) sets `political_controllers[osid] = faction` and pushes a `ControlEvent` with `mechanism: 'event'` into `state.political.control_events`. This is the same mutator path used by `Op Storm`, `Washington Agreement`, `Operation Circle` (Gorazde consolidation), and the Brčanska Malta barracks seizure (war_1992.json L636).

### 1.2 Existing csq_* / war_* events that mutate political_controllers

A grep across `data/scenarios/events/` returns at least three event templates already using `control_change`:

| Event | File | Direction | OSIDs flipped |
|---|---|---|---|
| `brcanska_malta_ambush_1992` | war_1992.json L636 | JNA→RBiH | `op:tuzla:simin_han_2` (barracks complex) |
| `operation_circle_1992` (Gorazde) | war_1992.json L1635 | RS→RBiH | `op:gorazde:{glamoc,kamen,sopotnica}` |
| (Federation post-Washington consolidation events, op_storm, etc.) | consequences.json | various | various |

The `control_change` effect kind is a **first-class, well-trodden path**. A scripted Srebrenica/Žepa flip would not require new infrastructure.

### 1.3 Existing Srebrenica/Žepa narrative events

`data/scenarios/events/war_1995.json` already carries the full Srebrenica narrative arc:

- `srebrenica_falls_1995` (id=L298): trigger `turn_min: 160, turn_max: 185, phase: war`, conditions `srebrenica_enclave_formed && srebrenica_demilitarized`, pressure-system `base_rate: 1, threshold: 8`. Effects: `humanitarian_impact` (RS war_crimes +5), `morale_change` (RBiH −15), `negotiation_capital` (RS international_credibility −30), `patron_pressure` (RS +20), `narrative`. **No `control_change` effect — flag/narrative only.**
- `zepa_falls_1995` (id=L383): trigger `turn_min: 160, turn_max: 190, requires_events: ['srebrenica_falls_1995']`. Same shape — no `control_change`.

These were authored as Ring-2 narrative shells that *react to* a mechanically-produced enclave fall (or, in the actual run, fire on flag+turn conditions even when the OSIDs have not flipped). They do not themselves flip OSIDs.

### 1.4 Rupture consequence wiring (Ring-2 → Ring-1 verdict bridge)

`src/sim/negotiation/rupture_consequences.ts` evaluates the `srebrenica_genocide_1995` rupture and gates on three preconditions:
1. `event_flags.srebrenica_enclave_formed === true` (c1)
2. `political_controllers['op:srebrenica:srebrenica_2'] === 'RS'` (c2)
3. `turn >= 140` (c3)

The c2 predicate is the binding "modeled war must produce the fall" hook. Per the §6-gated Q-CANON-RUPT-4 Path (d) clause (§1.5 #11): **scripted OSID flips that satisfy c2 by event mechanism rather than combat would qualify as "calendar-driven atrocity recording" and are explicitly forbidden in canon.**

---

## 2. Current Krivaja-95 / Stupčanica-95 op state

### 2.1 Op definitions — verified present and canonical

`src/sim/combat/triggered_operations.ts` L340–476 carries both ops as fully-specified `TriggeredOperationDefinition` records:

**Operation Krivaja-95:**
- `faction: 'RS'`, `primary_corps: 'vrs_drina'`, `staging_osid: 'op:bratunac:bratunac_2'`, `planning_duration: 3`, `min_attack_outcome: 'repulsed'`
- `trigger: (_state, turn) => turn >= 170` (was 168; bumped 2026-05-06 in `KRIVAJA_95_T168_FLOOR_FIX` for §6 compliance)
- **Brigades (per ICTY Popović §244 + §245 fn 757 + §247):** `rs_1st_zvornik`, `rs_1st_bratunac`, `rs_1st_milii`, `rs_5th_podrinje`, `rs_skelani_battalion` — 5 brigades, faithfully sourced from the Drina Corps Preparatory Order No. 1 of 2 July 1995
- **Objectives (5 OSIDs that flipped RBiH→RS between apr1995 and oct1995 painted truth):** `donji_potocari_2`, `srebrenica_2`, `bostahovine_2`, `milacevici`, `suceska`

**Operation Stupčanica-95:**
- `faction: 'RS'`, `primary_corps: 'vrs_drina'`, `staging_osid: 'op:vlasenica:grabovica'`, `planning_duration: 3`
- `trigger: (_state, turn) => turn >= 172`
- Brigades: `rs_1st_vlasenica`, `rs_1st_milii`, `rs_1st_podrinje` (3 brigades)
- Objective: `op:rogatica:zepa_2` (single OSID — the only Žepa-area OSID that flipped RBiH→RS in this op per painted truth)

These are **not a Wave-31 watched_operations.json fossil** but live, tested catalog entries. (Confirmed: `tests/krivaja_roster_and_prestage.test.ts`, `tests/krivaja_brigade_lifecycle_diagnostic.test.ts`, `tests/krivaja_stupcanica_milii_double_roster_audit.test.ts`, `tests/krivaja_roster_phase_1.test.ts`, `tests/krivaja_roster_phase_1_5_shape_de_epsilon.test.ts` — all GREEN as of latest implemented manifests.)

### 2.2 What the op does at runtime — diagnostic V2 evidence

From `docs/40_reports/audits/20260504_SREBRENICA_DIAGNOSTIC_V2.md` against the 188w `n1623` (and consistent with the latest n1992 reading per ENGINE-3 prompt):

| Operation | Start turn | force_ratio_estimate | Initial pers | Targeted enclave OSIDs | Outcome |
|---|---:|---:|---:|---|---|
| Operation Podrinje Sweep | t6 | **11.957** | 7,963 | brezovice_2 (peripheral) | failure / planning_invalidated |
| Operation Cerska-Kamenica | t40 | **0.5999** | 3,810 | brezovice_2, radovcici, sulice_2 | failure / planning_invalidated |
| Operation Stupčanica-95 (Žepa) | t172 | **0.8376** | 5,957 | op:rogatica:zepa_2 | failure / max_failures |
| Operation Krivaja-95 | t180 | **0.0918** | 2,558 | srebrenica_2 + 4 pocket OSIDs | failure / planning_invalidated |

**Drina perimeter at t188:** 9,434 RS pers across 7 brigades (5 combat-capable). Krivaja-95 actually drew **2 brigades / 2,558 pers** at launch — **27% of available perimeter pers, 29% of formations**. The corps-AI commit is the V2-quantified "class (c)" gap. The combat-math envelope is the V2-quantified "class (d)" gap. **Both gaps are §6-gated open lanes (Q-CANON-RUPT-1, Q-CANON-RUPT-2)** — the recommendation paragraph in `20260504_Q_CANON_RUPT_4_PATH_D_RESOLUTION.md §3` is binding: *"the V2-quantified gap between corps-AI commit and predictor envelope is a calibration problem for the modeled war, not a justification for bypassing the modeled war."*

### 2.3 Why the predictor reads 0.092

Concentration ratios at t188 (extended tracer in V2 report):

| Pair | Attacker pers | Defender pers | Raw ratio |
|---|---:|---:|---:|
| Drina perimeter / pocket | 9,434 | 3,000 | 3.14× |
| Drina perimeter / capital only | 9,434 | 600 | 15.72× |
| Drina perimeter / Žepa capital | 9,434 | 286 | 32.99× |

Even **32.99× raw concentration** at Žepa produces predictor `0.838` — sub-parity. The capital-OSID stack (`CAPITAL_GARRISON_MULT=2.0` × `getEnclaveDefenseBonus` 1.0+resilience×0.02 × `HARDENING_DEFENSE_BONUS` at isolation≥hardening threshold × pocket-garrison-from-population) dominates over force concentration at this envelope. The predictor is reading the layered defense correctly; the rupture cannot fire under any plausible *unforced* corps-AI commit at the current canon-permitted combat-math envelope.

---

## 3. Design options — scored

The prompt enumerates four options. I evaluate each against (i) canon compliance under SENSITIVE_HISTORY_DESIGN_GATE §1.5 #11 / §2 criterion 3, (ii) ENGINE-3 spatial-metric repair (the n1992 11+5 OSID misplacement), (iii) historical fidelity (modeled war must produce the historically-attested outcome), (iv) loss-of-agency cost (alternate-history simulation), (v) implementation cost, (vi) tests / verification effort.

### Option (a) — Scripted `csq_srebrenica_fall` event flipping OSIDs directly

**Mechanism:** Add a new event `csq_srebrenica_fall_1995` to `data/scenarios/events/war_1995.json` (or `consequences.json`):
```jsonc
{
  "id": "csq_srebrenica_fall_1995",
  "title": "Srebrenica Safe Area Overrun",
  "trigger": { "turn_min": 169, "turn_max": 169, "phase": "war",
               "requires_events": ["srebrenica_falls_1995"] },
  "once": true,
  "effect": {
    "kind": "control_change",
    "faction": "RS",
    "osids": [ "op:srebrenica:srebrenica_2",
               "op:srebrenica:donji_potocari_2",
               "op:srebrenica:bostahovine_2",
               "op:srebrenica:milacevici",
               "op:srebrenica:suceska", … ]
  }
}
```
Symmetric `csq_zepa_fall_1995` keyed on `requires_events: ['zepa_falls_1995']`.

| Axis | Score | Notes |
|---|---|---|
| Canon (§1.5 #11) | **FAIL** | This is the textbook "calendar-driven atrocity recording" Path (d) explicitly outlawed in §1.5 #11. The event-mechanism flip would satisfy c2 of `evaluateRuptureConsequences` *without* the modeled war producing the fall — the exact condition the rupture-expansion rule §2 criterion 3 binds against. |
| ENGINE-3 fix | ✓ | 11 + 5 OSIDs flip deterministically at the historical turn |
| Historical fidelity | partial | Outcome matches; mechanism does not (no combat) |
| Loss of agency | **HIGH** | Removes the "what if Srebrenica defenders held" branch entirely. A player who has poured resources into Tuzla / 2nd Corps relief still sees Srebrenica flip on the calendar. The ahistorical `enclave_defended` ghost entry never fires. |
| Implementation | trivial | ~30 lines of JSON, no engine work |
| Verification | trivial | `tests/rupture_consequences.test.ts` (18 tests) would need a new assertion that c2 satisfied by event-mechanism produces rupture (currently asserts c2 satisfied by combat) |
| **Verdict** | **REJECT — canon-forbidden.** | |

### Option (b) — Pre-planned op for VRS Drina Corps (status check + uplift)

**Mechanism:** The ops already exist (§2.1). What's missing is *delivery*. Two sub-options:

**(b.0) Verify-only — no engine change.** Run the diagnostic suite, confirm that ops fire but `planning_invalidated`/`max_failures` repeatedly. ENGINE-3 outcome: 11+5 OSIDs remain misplaced.

**(b′) Restore delivery via the two §6-gated lanes:**
- **Q-CANON-RUPT-1 (corps-AI commit floor):** raise the Drina Corps commit to ≥5/7 perimeter formations and ≥7,000 pers for Krivaja-95 (matches V2 floor estimate from ICTY Popović §244's eight-brigade preparatory list). Implementation surface: `bot_corps_directives.ts` + `sector_offensive.ts` brigade-eligibility predicate, gated on `operation_name === 'Operation Krivaja-95' || 'Operation Stupčanica-95'`. Mechanism remains a generic "operation_minimum_commit" knob, faction-symmetric.
- **Q-CANON-RUPT-2 (combat-math envelope):** revisit `CAPITAL_GARRISON_MULT`, `getEnclaveDefenseBonus` scaling, or pocket-garrison-from-population for the Srebrenica/Žepa resilience-25/20 hardened envelope. Surfaces in `enclave_resilience.ts`, `combat_predictor.ts`, `combat_math.ts`. Not a script — a calibration of existing constants.

| Axis | Score | Notes |
|---|---|---|
| Canon (§1.5 #11) | ✓ | The combat-math / corps-AI lanes are the canonical surface — the modeled war produces the fall through emergent combat. The recommendation paragraph in Q-CANON-RUPT-4 Path (d) §3 explicitly identifies these as "the next surface, separately gated." |
| ENGINE-3 fix | conditional ✓ | Outcome depends on Q-CANON-RUPT-1/-2 sign-off + implementation; if both succeed, the 11+5 OSIDs flip through combat at the historically-correct turn ±2 |
| Historical fidelity | ✓✓ | Outcome and mechanism both match. Krivaja-95 with 5–8 brigades in opening assault matches ICTY Popović §244 / §247 |
| Loss of agency | **LOW** | The branch survives. A player who reinforces Srebrenica heavily can defend the enclave; the rupture remains silent under §5 ghost-entry register. |
| Implementation | medium | Q-CANON-RUPT-1: ~50–100 lines (operation-minimum-commit predicate + tests). Q-CANON-RUPT-2: depends on chosen path (constant tweak, structural change to `getEnclaveDefenseBonus`, or pocket-garrison-from-population reweighting). Both require §6 sign-off chain (`/historian` + `/war-or-game` + `/game-designer`) |
| Verification | medium | 40w hash byte-identity preserved (t≤40 unaffected); 188w hash shifts as ops actually deliver; existing rupture / krivaja tests need expansion to assert delivery |
| **Verdict** | **RECOMMENDED.** | |

### Option (c) — Enclave-resilience-collapse trigger

**Mechanism:** Add to `enclave_resilience.ts` (or a new step in `war_phases.ts`): when an enclave's resilience drops below a threshold AND an attacker is besieging AND turn ≥ some floor, flip all its OSIDs to the attacker's faction. ~50 lines, faction-symmetric.

| Axis | Score | Notes |
|---|---|---|
| Canon (§1.5 #11) | **FAIL** | If "drops below threshold" can be satisfied by passive supply decay rather than by enemy combat producing the flip, this is functionally equivalent to (a) — a non-combat OSID flip that satisfies c2. The `srebrenica_genocide_1995` rupture would then fire from a mechanism that bypasses combat. **This is the heuristic-substitution path §2 criterion 3 explicitly outlaws.** |
| ENGINE-3 fix | ✓ if threshold tuned to fire ~t169–172 | But the threshold tuning is itself a calendar heuristic |
| Historical fidelity | partial | Mechanism is supply-driven, not combat-driven; ahistorical for Srebrenica (which fell from VRS assault, not from supply collapse — the enclave was supplied throughout) |
| Loss of agency | medium | Could be tunable, but the canon-forbidden path makes this moot |
| Implementation | medium | ~50 lines + supply integration |
| Verification | medium | Multiple invariant tests would need to assert "enclave fall flips OSIDs" — directly contradicting `rupture_silence_when_defended.test.ts` |
| **Verdict** | **REJECT — canon-forbidden under §1.5 #11.** If reframed as "rupture/resilience reads from combat-produced flip" it collapses into Option (b′) without the engine surface. |

### Option (d) — Hybrid (enclave-collapse trigger + pre-planned Op)

**Mechanism:** (c) + (b) layered. Op fires; if op fails to deliver, the resilience-collapse trigger fires to "ensure VRS launches the assault" (per the prompt phrasing).

| Axis | Score | Notes |
|---|---|---|
| Canon (§1.5 #11) | **FAIL** | Inherits the (c) canon failure. If the resilience-collapse trigger is a fallback that fires when the op fails, it is by definition a calendar-driven heuristic substitution for c2. **Forbidden.** |
| ENGINE-3 fix | ✓ | Belt-and-braces — definitely flips the OSIDs |
| Historical fidelity | mixed | The op path is faithful; the fallback path is not |
| Loss of agency | **HIGHEST** | The fallback removes branchpoints regardless of what the player does in the modeled war |
| Implementation | high | All of (b′) + all of (c) |
| Verification | high | Multiple competing invariants |
| **Verdict** | **REJECT — canon-forbidden.** |

### Summary table

| Option | Canon (§1.5 #11) | ENGINE-3 fix | Historical fidelity | Agency | Cost | Verdict |
|---|---|---|---|---|---|---|
| (a) Scripted control_change | ✗ FAIL | ✓ | partial | LOST | trivial | **REJECT** |
| (b.0) Verify only | ✓ | ✗ | n/a | n/a | none | partial — diagnostic only |
| (b′) Restore Krivaja delivery via Q-CANON-RUPT-1/-2 | ✓ | conditional ✓ | ✓✓ | preserved | medium | **RECOMMEND** |
| (c) Enclave-resilience-collapse | ✗ FAIL | ✓ | partial | medium | medium | **REJECT** |
| (d) Hybrid | ✗ FAIL | ✓ | mixed | LOST | high | **REJECT** |

---

## 4. Recommendation — Option (b′)

**Recommended path:** **Option (b′) — restore Krivaja-95 / Stupčanica-95 delivery through the two open §6-gated lanes Q-CANON-RUPT-1 (corps-AI commit floor) and Q-CANON-RUPT-2 (combat-math envelope at the capital-OSID hardened-resilience-25 stack).**

### 4.1 Rationale

1. **Canon binds.** The Sensitive History Design Gate §1.5 #11, ratified through Q-CANON-RUPT-4 Path (d) on 2026-05-04, explicitly rules out calendar-driven OSID flips for the Srebrenica rupture. Options (a), (c), and (d) all violate this clause. `tests/rupture_silence_when_defended.test.ts` (4 tests) already pin this invariant in the regression suite.
2. **The combat-side machinery is already in place.** Krivaja-95 and Stupčanica-95 are not Wave-31 fossils — they are live, ICTY-sourced, §6-floor-compliant triggered ops with verified brigade rosters, OSID objectives, and staging. Five test files exercise them. The failure mode is not "op missing" but "op fires and cannot deliver."
3. **The two §6-gated lanes are pre-identified.** The recommendation paragraph in `20260504_Q_CANON_RUPT_4_PATH_D_RESOLUTION.md §3` names exactly these two surfaces as the next legal step. The V2 audit quantified both gaps numerically (Drina commit: 27% pers / 29% formations vs. plausible floor of 5/7 / 7,000 pers; predictor envelope: 0.092 ratio at canon-permitted layered defense). The roadmap is clear; what's missing is the §6 sign-off and implementation.
4. **Agency is preserved.** Under Option (b′), a player who reinforces Srebrenica (extra brigades airlifted in, supply tunneled through, etc.) can in principle hold the enclave — the c2 condition stays unsatisfied, the rupture stays silent, and the `enclave_defended` ghost entry fires instead. This is the canonical "modeled war produces the outcome" stance.
5. **ENGINE-3 spatial metric is a downstream consequence.** The 11+5 misplaced OSIDs at 188w are not the *problem* — they are the *symptom* of Q-CANON-RUPT-1 / -2 being open. Fixing the spatial metric directly (via Option a/c/d) trades a 1.5% area-metric improvement for a canon violation that would force-revert `rupture_silence_when_defended.test.ts`.

### 4.2 Concrete next steps (sketch only — out of memo scope)

1. **§6 sign-off chain** (`/historian` + `/war-or-game` + `/game-designer` + user) on Q-CANON-RUPT-1 floor: "Drina Corps Krivaja-95 commit ≥5/7 perimeter formations and ≥7,000 pers" or equivalent.
2. **§6 sign-off chain** on Q-CANON-RUPT-2 envelope: choose between (i) lower `CAPITAL_GARRISON_MULT` for resilience-25-and-below capitals, (ii) reweight pocket-garrison-from-population for capital OSIDs already inside an enclave (avoid double-counting), (iii) admit the predictor's 0.092 is correct and the failure is upstream — corps-AI must commit *more* to overcome it.
3. **Implementation** of whichever §6-signed-off path lands: surface is `bot_corps_directives.ts` + `operation_preparation.ts` for (1), or `enclave_resilience.ts` + `combat_predictor.ts` + `combat_math.ts` for (2).
4. **Regression matrix:** 40w hash byte-identity preserved (t≤40 unaffected by either lane); 188w hash shifts as ops deliver; expand `tests/krivaja_roster_*` + `tests/rupture_consequences.test.ts` to assert delivery; preserve `tests/rupture_silence_when_defended.test.ts` (counterfactual-silence path remains valid).

### 4.3 Fallback if §6 sign-off blocks both Q-CANON-RUPT-1 and -2

If the user, `/historian`, `/war-or-game`, or `/game-designer` chain blocks both engine lanes, the canon answer is **Option (b.0) — Verify only**. The 11+5 misplaced OSIDs remain misplaced; the spatial metric carries a documented gap; the `enclave_defended` ghost entry fires under §5 counterfactual register. This is canonically correct under §1.5 #11 — counterfactual silence is the expected outcome when the modeled war does not produce the fall. No event-design lane should be opened to "fix" the spatial metric at the cost of the canon clause.

---

## 5. ICTY / historical anchors

Sources cited in `triggered_operations.ts` L340–476 and `rupture_consequences.ts` align with:

- **ICTY Popović IT-05-88-T Trial Judgment §244** — Drina Corps Preparatory Order No. 1 of 2 July 1995, addressed to Zvornik, Birac, Romanija, Vlasenica, Podrinje, Bratunac, Milici, Skelani brigades.
- **ICTY Popović §245 fn 757** — Bratunac Brigade Potočari-blocking task; Zvornik Brigade battalion attack axis Zeleni Jadar–Pusmulići–Bojna–Srebrenica.
- **ICTY Popović §247** — TG-1 commanded by Pandurević (Zvornik Brigade); opening assault 6 July 1995 0400 hrs.
- **ICTY Popović §249** — TG-1 left Standard Barracks Zvornik 4 July, arrived Zeleni Jadar 5 July.
- **ICTY Krstić IT-98-33-T §§122–123** — Krivaja-95 STRATEGIC OBJECTIVES (split enclaves; reduce to urban cores). Note: Krstić §123 does *not* name brigades or attack axes — that's Popović.
- **ICTY Krstić §§23–27** — Halilović-Mladić Agreement (8 May 1993, Srebrenica demilitarization), cited in `srebrenica_demilitarization_1993` event.
- **BB2 p.611** — Stupčanica-95 (Žepa) operation, July 14–25 1995.
- **ICJ 2007 Genocide Convention case (Bosnia v. Serbia)** — genocide declaration for Srebrenica.

All historical anchors are already wired in the codebase; the recommendation does not add new historical claims.

---

## 6. Memo size

```
$ wc -c docs/40_reports/proposals/20260523_ENGINE_3_SREBRENICA_EVENT_DESIGN.md
~17 KB
```

(See REPORTBACK §e for verified size.)

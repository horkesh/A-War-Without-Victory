# v0.8.2 Phase 2 — Political Event Decision Engine

**Date:** 2026-04-05
**Type:** Implementation — v0.8.2 Political Leader Bot Phase 2
**Phase in series:** 2 of 7
**Status:** ACCEPTED
**Baseline:** 2520/2520 vitest, tsc clean (Phase 1 close)
**Verification:** tsc clean, 44/44 political suite, 2546/2546 full vitest

---

## Purpose

Phase 1 established the static personality profiles and the per-turn situational assessment function (`computePoliticalAssessment`). Phase 2 wires those outputs into an actual decision — bot factions now make personality-weighted event choices rather than defaulting to the first or historical option.

The separation between v0.8.1 (military command chain) and v0.8.2 (political leadership layer) is architecturally intentional. Corps commanders reason about operations; political leaders reason about war continuation, patron relationships, war crimes tolerance, and strategic pivots. `scorePoliticalOption` is the function that encodes those different decision calculi.

Phase 2 is the first phase in v0.8.2 that produces behavioral change: RS, RBiH, and HRHB bots will now respond differently to the same event depending on their faction's personality profile and current situational assessment. The scenario hash changes.

---

## Deliverables

### 1. `scorePoliticalOption(option, respondingFaction, assessment, personality)`

Pure function. Takes a single candidate event option and returns a numeric score. All four inputs are explicit — no hidden GameState reads, no closures over engine state.

The function is the mechanism by which personality shapes decisions: the same option scores differently for RS (high `territorial_ambition`, low `international_legitimacy_weight`) vs RBiH (high `international_legitimacy_weight`, survival-oriented). The 4-component score is additive:

```
score = dimensionScore + riskScore + aggressionScore + patronScore
```

See scoring formula section below.

---

### 2. `pickPoliticalResponse(options, respondingFaction, assessment, personality)`

Pure function. Scores all candidate options via `scorePoliticalOption`, selects the highest. Tie-breaks by `option.id` lexicographic ascending (deterministic). Throws on empty options array — fast-fail is preferable to silently returning undefined.

Contract (honoring Phase 1 design contract):
- Requires `PoliticalAssessment` as an explicit parameter — no hidden GameState reads.
- When `PoliticalAssessment` is not available, callers fall back to `pickBotResponseV1` — never silently degrade.
- Returns the winning `EventOption` directly.

---

### 3. Dispatch in `evaluate_events.ts`

`POLITICAL_LOGICS` set defined at module scope:

```ts
const POLITICAL_LOGICS = new Set(['strategic_weighted', 'capital_based', 'capital_weighted']);
```

Routing logic:
- `respondingFaction` derived from `dimension_shifts[0].faction` (first shift entry).
- If `event.bot_response_logic` is in `POLITICAL_LOGICS` → compute assessment, get personality, call `pickPoliticalResponse`.
- All other logic types → `pickBotResponseV1` fallback. Legacy fallback preserved; no existing events are broken.

---

### 4. Event Upgrades

Two events upgraded from `historical` to `strategic_weighted` with Historian-verified option annotations:

| Event ID | Old Logic | New Logic | Historian Verdict |
|---|---|---|---|
| `srebrenica_demilitarization_1993` | `historical` | `strategic_weighted` | VERIFIED. RS response is historically attested — reject demilitarization. `aggression_affinity` and `risk_level` added to all 3 options. |
| `concentration_camps_revealed_1992` | `historical` | `strategic_weighted` | VERIFIED. `deny` as RS response confirmed by ICTY (IT-95-5/18, Karadzic). Option metadata added. |

---

## Scoring Formula

Four additive components. All inputs are bounded; output is unbounded but typically in [-2, +2] range.

### Component 1 — dimensionScore

```
dimensionScore = sum over dimension_shifts:
  shift.magnitude × personality[shift.dimension + '_weight']
```

Where `personality[shift.dimension + '_weight']` maps shift dimensions to the relevant personality weight field. For example, a shift on `territorial_control` maps to `personality.territorial_ambition`. Unmapped dimension keys contribute 0.

Rationale: an option that shifts `territorial_control` by +0.3 is worth more to RS (`territorial_ambition = 0.90`) than to RBiH (`territorial_ambition = 0.50`).

---

### Component 2 — riskScore

```
riskScore = (personality.risk_tolerance - option.risk_level) × 0.3
```

Where `option.risk_level` is a 0–1 scalar on the event option (how risky is this choice). Positive when personality tolerance exceeds option risk; negative when the option is riskier than the faction is comfortable with.

Rationale: RS commanders historically accepted high operational risk (siege tactics, corridor gambles). RBiH accepted diplomatic risk but not military exposure from weakness.

---

### Component 3 — aggressionScore

```
blended_score = assessment.situation_score × (1 - assessment.situation_weight)
             + personality.war_continuation_weight × assessment.situation_weight

aggressionScore = option.aggression_affinity × blended_score × 0.4
```

`blended_score` is the same situation-weighted blend used in `computeSituationWeight`. It represents how "aggressive" the faction's disposition is at this moment — personality-heavy early, situation-heavy late.

`option.aggression_affinity` is a [-1, +1] scalar on the event option: +1 for militarily aggressive choices (reject, mobilize, attack), -1 for conciliatory ones (comply, negotiate, withdraw), 0 for neutral.

Rationale: a faction in a strong position (high `situation_score`) with aggressive personality (`war_continuation_weight = 0.85`) will heavily favor options with positive `aggression_affinity`.

---

### Component 4 — patronScore

```
patronScore = assessment.patron_confidence × personality.patron_dependence
            × sign(option.aggression_affinity) × 0.25
```

Where `sign()` returns +1 for `aggression_affinity > 0`, -1 for < 0, 0 for 0.

Rationale: patron pressure pulls toward conciliation. A faction with high `patron_dependence` (HRHB = 0.80) and high `patron_confidence` is steered toward the less aggressive option by its patron relationship. When patron confidence is low (patron pulling away), this component weakens.

---

## Event Upgrades Detail

### `srebrenica_demilitarization_1993`

| Option ID | aggression_affinity | risk_level | Historian note |
|---|---|---|---|
| `comply_fully` | -1.0 | 0.2 | Low risk, conciliation. UNPROFOR-adjacent path. |
| `partial_compliance` | 0.0 | 0.4 | Delay tactic; historically RS preferred this early. |
| `reject_demilitarization` | 1.0 | 0.7 | High-risk defiance; eventual RS posture at Srebrenica. |

### `concentration_camps_revealed_1992`

| Option ID | aggression_affinity | risk_level | Historian note |
|---|---|---|---|
| `deny` | 0.5 | 0.6 | RS response — ICTY-confirmed (Karadzic press denials). Moderate aggression; credibility cost accepted. |
| `acknowledge_investigate` | -0.5 | 0.3 | Diplomatic concession path. |
| `deflect_blame` | 0.2 | 0.5 | Partial denial with scapegoating; lower commitment than outright deny. |

---

## Historian Corrections

The following proposed values or directions were reviewed against ICTY primary sources:

| Item | Proposed | Decision | Basis |
|---|---|---|---|
| `hide_weapons` option: `military_credibility +3` | Add effect | REJECTED | Effect is mislabeled and unnecessary. `comply_fully` penalty of −10 already creates sufficient differential between options. Adding a spurious +3 to `hide_weapons` would misrepresent the actual credibility impact of weapons concealment. |
| `concentration_camps_revealed_1992` — `deny` as RS response | Verify | VERIFIED | ICTY Case IT-95-5/18 (Karadzic): systematic denial of camp existence documented as leadership-directed response to international media exposure. ICTY also establishes knowledge at leadership level, making `deny` the historically accurate bot choice for RS. |
| `srebrenica_demilitarization_1993` upgrade | Verify | VERIFIED | RS rejection of full demilitarization is historically attested across Drina Corps operational records and Karadzic directives (ICTY: IT-98-33, Krstic). `strategic_weighted` routing produces correct RS behavior without hardcoding the `reject` outcome. |

---

## Known Phase 3 Debt

| Item | Description | Recommended Phase |
|---|---|---|
| RBiH posture inversion | `strategic_posture_review_rbih` inverts historical behavior: RBiH bot will seek negotiation when militarily weak (low `blended_score`), but Izetbegovic historically resisted partition from weakness, leaning on international legitimacy rather than concession. The `patron_pressure` signal (patron phone calls, external pressure events) is the correct driver for RBiH conciliation — not `blended_score` position. Fix: add a RBiH-specific modifier in `scorePoliticalOption` that weights `international_legitimacy_weight × (1 - situation_score)` positively for defiant/hold-out options when militarily weak. | Phase 3 |
| `respondingFaction` schema hardening | `respondingFaction` is currently derived from `dimension_shifts[0].faction`, which is a soft convention, not a schema contract. If an event has no `dimension_shifts` or has shifts without faction attribution, the derivation silently returns undefined and the political path is skipped. Phase 3 should add `responding_faction` as an explicit optional field on `EventDefinition` with a typed fallback chain. | Phase 3 |
| `combat_effective_brigades` GameState field | `computePoliticalAssessment` uses `military.formations` iteration to proxy force readiness. This iterates all formations including inactive ones if the formation model gains inactive states. Phase 3 should add `combat_effective_brigades: number` as a first-class field on the relevant GameState slice, computed during the brigade-readiness phase, and consumed directly by the assessment function. | Phase 3 |
| `territory_trend` blindspot | `computePoliticalAssessment` uses live `political_controllers` count for `territory_control_ratio`. It has no awareness of the direction of change (gaining/losing territory). A political leader's decision calculus is shaped by trend, not just position. Phase 3 should add a `territory_trend` (e.g. week-over-week delta) to `PoliticalAssessment`, derived from `turn_summaries` if available. | Phase 3 |

---

## Canon Compliance

Review completed before implementation. All 10 checks passed. No blocking violations.

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. `scorePoliticalOption` and `pickPoliticalResponse` are pure functions. Tie-break by `option.id` lexicographic ascending — deterministic. |
| GameState as single source of truth | PASS | Political path reads GameState only to compute `PoliticalAssessment` (already established in Phase 1). No new direct reads inside decision functions. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only. `respondingFaction` derivation validated against canonical IDs at call site. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant to this phase. |
| Historical claims sourced | PASS | ICTY verdicts cited for both upgraded events. Historian sign-off documented above. |
| No `Math.random()` | PASS | Tie-break is lexicographic, not random. |
| Legacy fallback preserved | PASS | `pickBotResponseV1` remains default for all non-political logic types. |
| `pickPoliticalResponse` explicit parameter contract | PASS | `PoliticalAssessment` required as explicit parameter — no hidden GameState reads inside picker. Honors Phase 1 design contract. |
| Empty options guard | PASS | `pickPoliticalResponse` throws on empty options array. |

**Status: GO.** All 10 checks pass. No blockers.

---

## Phase 3 Recommended Lane

**v0.8.2 Phase 3 — Patron Pressure and RBiH Posture Correction**

Primary deliverables:
1. RBiH-specific `scorePoliticalOption` modifier: `international_legitimacy_weight × (1 - situation_score)` adds positive weight to hold-out/defiant options when militarily weak. Corrects the posture inversion identified above.
2. `responding_faction` as explicit optional field on `EventDefinition` — typed fallback chain replaces the soft `dimension_shifts[0].faction` convention.
3. `combat_effective_brigades` as a first-class GameState field consumed by `computePoliticalAssessment`.
4. Patron phone call events (Milosevic/Zagreb pressure): `patron_pressure` dimension shifts wired to `patron_confidence` in assessment.

Gate: Phase 2 closed and on `main` (now closed).

---

## Files

| File | Change |
|---|---|
| `src/sim/political/political_event_decision.ts` | New file (~99 lines). Contains `scorePoliticalOption` + `pickPoliticalResponse`. |
| `tests/sim/political/political_event_decision.test.ts` | New file. 22 tests. |
| `src/sim/events/evaluate_events.ts` | Modified: `POLITICAL_LOGICS` set at module scope; `respondingFaction` from `dimension_shifts[0].faction`; political dispatch path for scoped logics; `pickBotResponseV1` fallback preserved for all other types. |
| `data/scenarios/events/war_1993.json` | Modified: `srebrenica_demilitarization_1993` bot_response_logic `historical`→`strategic_weighted`; `aggression_affinity`/`risk_level` added to 3 options. |
| `data/scenarios/events/war_1992.json` | Modified: `concentration_camps_revealed_1992` bot_response_logic `historical`→`strategic_weighted`; option metadata added. |

---

## Tests

22 tests in `tests/sim/political/political_event_decision.test.ts`:

| Category | Count | Coverage |
|---|---|---|
| `scorePoliticalOption` — dimensionScore | 4 | RS scores territorial options higher than RBiH; RBiH scores legitimacy options higher; zero magnitude shifts contribute zero; unmapped dimension keys contribute zero |
| `scorePoliticalOption` — riskScore | 3 | High-risk option penalized for low-tolerance personality; low-risk option preferred; risk component scales with tolerance gap |
| `scorePoliticalOption` — aggressionScore | 4 | RS favors aggressive options from strong position; RBiH favors conciliatory from weak position; neutral options score 0; blended_score is situation-weighted |
| `scorePoliticalOption` — patronScore | 3 | High patron_dependence + high patron_confidence steers toward conciliation; low patron_confidence weakens patron component; zero aggression_affinity → zero patron contribution |
| `pickPoliticalResponse` contract | 5 | Returns highest-scoring option; ties broken by id lexicographic ascending; throws on empty options; deterministic for identical inputs; correct option returned for RS vs RBiH on same event |
| Dispatch integration | 3 | `strategic_weighted` routes to political path; `historical` remains on `pickBotResponseV1`; `capital_based` routes to political path |

---

## Verification Results

- `npx tsc --noEmit`: clean
- Political suite: 44/44 (22 Phase 1 + 22 Phase 2)
- `npm run test:vitest`: 2546/2546 full vitest

---

## Key Finding

The scoring formula is correct for RS and HRHB under Phase 2. The RS `reject_demilitarization` path in `srebrenica_demilitarization_1993` now emerges naturally from personality weights without being hardcoded — RS's `territorial_ambition = 0.90` and `war_continuation_weight = 0.85` produce a strong positive score for high-`aggression_affinity` options even from a moderately weak `situation_score`. This is the correct emergent behavior.

The RBiH posture inversion is the one confirmed debt: the `blended_score` aggressionScore component penalizes RBiH defiance when militarily weak, which misrepresents Izetbegovic's documented strategy of maintaining sovereignty claims from weakness. This is documented as Phase 3 debt and is non-blocking — the two upgraded events (`srebrenica_demilitarization_1993`, `concentration_camps_revealed_1992`) are both RS-responding events where the inversion does not apply.

---

## Deferred to Later Phases

| Item | Target |
|---|---|
| RBiH posture correction (patron_pressure as primary driver, not blended_score) | Phase 3 |
| `responding_faction` field on `EventDefinition` schema | Phase 3 |
| `combat_effective_brigades` first-class GameState field | Phase 3 |
| `territory_trend` in `PoliticalAssessment` | Phase 3 |
| Patron phone call events (Milosevic/Zagreb pressure calls) | Phase 3 |
| ICTY-sourced dialogue for key decision events | Phase 3 |
| Event trigger integration in turn pipeline | Phase 4 |
| Post-1993 patron confidence decay (RS: Milosevic divergence) | Phase 5+ |
| UI surface for political decision events | v0.9+ |

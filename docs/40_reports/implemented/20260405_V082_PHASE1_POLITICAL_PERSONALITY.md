# v0.8.2 Phase 1 — Political Personality Framework

**Date:** 2026-04-05
**Type:** Implementation — v0.8.2 Political Leader Bot Phase 1
**Phase in series:** 1 of 7
**Status:** ACCEPTED
**Baseline:** 2520/2520 vitest, tsc clean
**Verification:** tsc clean, 2520/2520 vitest (176 files)

---

## Purpose

v0.8.2 introduces a political leader bot engine: faction-specific non-player presidents (Karadzic, Izetbegovic, Boban) who respond to battlefield events, patron pressure, and strategic shifts via a structured decision framework. Phase 1 establishes the type foundation and pure-function assessment layer that all subsequent phases will consume.

The separation between the military command chain (v0.8.1 commander maturity) and the political leadership layer (v0.8.2) is architecturally intentional. Corps commanders reason about operations; political leaders reason about war continuation, patron relationships, war crimes tolerance, and strategic pivots. These are distinct decision domains with distinct consumers.

Phase 1 delivers the static personality profiles and the per-turn situational assessment function. It introduces no behavioral change — no GameState writes, no engine wiring — so the baseline scenario hash is unchanged. Phase 2 will build the decision engine that consumes these outputs.

---

## Deliverables

### 1. PoliticalPersonality Interface

`PoliticalPersonality` is the faction-level static profile used by the political bot engine. It is distinct from `PoliticalLeaderProfile`, which is per-leader scenario data (name, faction, historical role). `PoliticalPersonality` encodes the decision-weights that shape how a faction's political bot evaluates options:

| Field | Type | Purpose |
|---|---|---|
| `faction` | `FactionId` | Owning faction |
| `archetype` | string | Descriptive label (e.g. `'expansionist_nationalist'`) |
| `war_continuation_weight` | number | How strongly the bot favors continuing war vs negotiating |
| `civilian_cost_tolerance` | number | Threshold before civilian casualties affect decisions |
| `war_crimes_tolerance` | number | ICTY-grounded; affects option scoring for atrocity-adjacent directives |
| `patron_dependence` | number | Sensitivity to patron pressure signals |
| `international_legitimacy_weight` | number | Value placed on international standing vs battlefield gain |
| `territorial_ambition` | number | Weight on territorial control in option scoring |

---

### 2. PoliticalAssessment Interface

`PoliticalAssessment` is the per-turn situational read derived from `GameState` for a given faction. It is a plain data object — no methods, no side effects. It is computed once per turn per faction and passed explicitly to decision functions.

| Field | Type | Source |
|---|---|---|
| `faction` | `FactionId` | Parameter |
| `war_week` | number | `state.turn` |
| `situation_score` | number 0–1 | Composite: territory + force ratio + exhaustion |
| `patron_confidence` | number 0–1 | `patron_relationships[faction].confidence` or default |
| `exhaustion_pressure` | number 0–1 | `war_exhaustion / 1000` clamped |
| `recent_losses` | number | Turn summary casualties (last turn) |
| `territory_control_ratio` | number | Owned OSIDs / total OSIDs |
| `has_international_pressure` | boolean | `strategic_dimensions.international_pressure > 0.5` |
| `situation_weight` | number | `computeSituationWeight(warWeek, personality)` |

---

### 3. POLITICAL_PERSONALITIES Constant

Three Historian-verified faction profiles, keyed by `FactionId`:

#### RS — Karadzic (expansionist_nationalist)

| Parameter | Value | Basis |
|---|---|---|
| `war_continuation_weight` | 0.85 | RS strategic posture: consolidate gains, resist partition |
| `civilian_cost_tolerance` | 0.70 | Documented acceptance of siege/bombardment as policy |
| `war_crimes_tolerance` | 0.70 | ICTY: 4 JCEs, Directive 7, Sarajevo/Srebrenica |
| `patron_dependence` | 0.55 | Serbia relationship: supportive but not controlling in 1992 |
| `international_legitimacy_weight` | 0.20 | Consistent rejection of international frameworks |
| `territorial_ambition` | 0.90 | Six Strategic Goals: explicit territorial maximalism |

#### RBiH — Izetbegovic (survival_internationalist)

| Parameter | Value | Basis |
|---|---|---|
| `war_continuation_weight` | 0.60 | Survival imperative, but consistent pursuit of negotiated settlement |
| `civilian_cost_tolerance` | 0.30 | International legitimacy strategy requires civilian protection framing |
| `war_crimes_tolerance` | 0.10 | Hard floor — ICTY: no leadership-directed JCE found |
| `patron_dependence` | 0.45 | US/Turkey/Iran: material dependence but independent political voice |
| `international_legitimacy_weight` | 0.80 | Core strategy: force international intervention through visibility |
| `territorial_ambition` | 0.50 | Defense of recognized borders, not expansion |

#### HRHB — Boban (opportunist_patron_dependent)

| Parameter | Value | Basis |
|---|---|---|
| `war_continuation_weight` | 0.70 | HZ HB project requires territorial consolidation |
| `civilian_cost_tolerance` | 0.60 | Ethnic cleansing as instrument of demographic engineering |
| `war_crimes_tolerance` | 0.55 | Raised from initial plan value of 0.40 — see Historian Corrections |
| `patron_dependence` | 0.80 | Tudjman/Zagreb relationship: HVO structurally dependent |
| `international_legitimacy_weight` | 0.35 | International pressure moderated by Croatian state cover |
| `territorial_ambition` | 0.75 | Explicit HZ HB borders, Mostar as capital |

---

### 4. getPoliticalPersonality(faction)

Typed accessor returning `PoliticalPersonality` for a given `FactionId`. Throws a descriptive error on unknown faction — fast-fail is preferable to silently returning undefined and producing corrupt downstream scores.

---

### 5. computeSituationWeight(warWeek, personality)

Pure linear decay function: returns a weight in [0.4, 0.7] that scales how strongly a personality's weights influence option scoring relative to the raw situation score.

- War week 0: returns 0.7 (personality dominates — early war, ideology unchallenged)
- War week 120: returns 0.4 (situation dominates — late war, exhaustion overrides ideology)
- Clamps at both ends; deterministic

Rationale: early-war decisions are ideology-driven (Karadzic's Six Goals, Izetbegovic's sovereignty framing). Late-war decisions are forced by material reality (exhaustion, losses, patron fatigue). The decay captures this empirical pattern without hardcoding it to specific turns.

---

### 6. computePoliticalAssessment(state, faction, personality)

Pure function. Reads from `GameState` — no writes. Returns `PoliticalAssessment`.

Inputs consumed:
- `state.turn` → `war_week`
- `state.strategic_dimensions` → `has_international_pressure` (`international_pressure > 0.5`)
- `state.patron_relationships[faction]` → `patron_confidence` (defaults to 0.5 if missing)
- `state.war_exhaustion` → `exhaustion_pressure` (clamped 0–1 at /1000)
- `state.turn_summaries` (last entry) → `recent_losses` (attacker + defender casualties)
- `political_controllers` count → `territory_control_ratio`
- `military.formations` (combat-effective brigades) → contributes to `situation_score`

`situation_score` composite: weighted average of territory ratio (0.40), force readiness proxy (0.35), and inverted exhaustion (0.25). Returns a 0–1 scalar representing "how well is this faction doing right now."

---

## Phase 1 Scope

| Item | In scope | Out of scope |
|---|---|---|
| `PoliticalPersonality` interface | Yes | |
| `PoliticalAssessment` interface | Yes | |
| `POLITICAL_PERSONALITIES` constant (3 factions) | Yes | |
| `getPoliticalPersonality()` accessor | Yes | |
| `computeSituationWeight()` pure function | Yes | |
| `computePoliticalAssessment()` pure function | Yes | |
| GameState wiring (`political_leaders` field) | | Deferred Phase 2 |
| `PoliticalEventDecisionEngine` | | Deferred Phase 2 |
| `scorePoliticalOption()` | | Deferred Phase 2 |
| `pickPoliticalResponse()` | | Deferred Phase 2 |
| Patron phone call event text | | Deferred Phase 3 |
| ICTY dialogue sourcing | | Deferred Phase 3 |
| Event trigger integration | | Deferred Phase 4+ |

---

## Historian Corrections

The following values were adjusted from the initial plan parameters based on Historian review of ICTY primary sources:

| Faction | Parameter | Plan value | Accepted value | Basis |
|---|---|---|---|---|
| HRHB | `war_crimes_tolerance` | 0.40 | **0.55** | Prlic et al. (IT-04-74): systematic HVO ethnic cleansing policy in Central Bosnia and Herzegovina established as JCE. Kordic and Cerkez (IT-95-14/2): Blaskic-level command responsibility for Ahmici and broader CB campaign. The plan's 0.40 understated leadership-level tolerance. |
| RBiH | `war_crimes_tolerance` | 0.15 | **0.10 (hard floor)** | ICTY found no leadership-directed JCE for ARBiH command. The floor is enforced in `computePoliticalAssessment` — `situation_score` cannot raise it. Isolated unit-level violations exist in the record but do not constitute a leadership policy. |
| RS | `patron_confidence` weight | not specified | **0.20** | Historian note: Milosevic–Karadzic relationship in 1992 was supportive but not controlling; documented divergence by 1993 (Vance-Owen). A 0.20 weight is 1992-accurate. Phase 2 should implement post-1993 decay of this weight. |

---

## Canon Compliance

Review completed before implementation. No blocking violations found.

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. All functions are pure. |
| GameState as single source of truth | PASS | Assessment reads state; no writes. Wiring deferred to Phase 2. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only — validated in `getPoliticalPersonality` throw path. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant to this phase. |
| Historical claims sourced | CONDITIONAL | ICTY verdicts cited as primary source. Historian sign-off on three corrections above. |

**Status: CONDITIONAL-GO.** No blockers. Forward-looking risks documented below for Phase 2 handoff.

---

## Forward Risks (Phase 2 Items)

These are not bugs in Phase 1. They are integration contracts that Phase 2 must honor:

| Risk | Location | Required action |
|---|---|---|
| `combat_effective_brigades` field contract | `computePoliticalAssessment` force-ratio derivation | Phase 2 implementer must verify `military.formations` iteration yields correct combat-effective count. If field shape changes, assessment force-ratio proxy degrades silently. |
| `formations` iteration breadth | `computePoliticalAssessment` | Current pass counts all formations regardless of activation state. Phase 2 should guard on `is_active` or equivalent if the formation model gains inactive states. |
| `territory_snapshot` field | `computePoliticalAssessment` | Currently uses live `political_controllers` count. If a turn-snapshot field is added to GameState, this should switch to snapshot for consistency with turn-boundary semantics. |
| `humanitarian_standing` dimension key | `computePoliticalAssessment` | `strategic_dimensions` currently has `international_pressure`. If a `humanitarian_standing` key is added in a future strategic dimensions expansion, the `has_international_pressure` derivation should incorporate it. |
| `political_leaders` GameState field | Not yet in state | Phase 2 must add `political_leaders: Record<FactionId, PoliticalLeaderState>` to `src/state/game_state.ts` and populate it in the scenario runner. This is the only write surface needed for Phase 2. |

---

## Phase 2 Design Contract

Established in `political_personality.ts` file header and reproduced here for Phase 2 implementer reference:

- `pickPoliticalResponse` (Phase 2 task 2.2) **MUST** require `PoliticalAssessment` as an explicit parameter — no hidden side effects, no GameState reads inside the picker.
- When `PoliticalAssessment` is not available (e.g. pre-Phase-2 paths), fall back to `pickBotResponseV1` — never silently degrade.
- `scorePoliticalOption` takes `(option, assessment, personality)` — all three explicit, no closures over GameState.
- The assessment is computed once per turn per faction, outside the decision engine, and passed in. This keeps the decision engine a pure transformation function.

---

## Files

| File | Change |
|---|---|
| `src/sim/political/political_personality.ts` | New file (~380 lines). Contains all interfaces, constant, and functions listed above. |
| `tests/sim/political/political_personality.test.ts` | New file. 22 tests. |

---

## Tests

22 tests in `tests/sim/political/political_personality.test.ts`:

| Category | Count | Coverage |
|---|---|---|
| `getPoliticalPersonality` accessor | 4 | Returns correct profile for RS/RBiH/HRHB; throws on unknown faction; canonical faction IDs only |
| `POLITICAL_PERSONALITIES` value checks | 6 | RS `war_crimes_tolerance` ≥ 0.65; RBiH hard floor at 0.10; HRHB `war_crimes_tolerance` ≥ 0.50; RS `territorial_ambition` ≥ 0.85; RBiH `international_legitimacy_weight` ≥ 0.75; HRHB `patron_dependence` ≥ 0.75 |
| `computeSituationWeight` | 4 | Week 0 returns ~0.7; week 120 returns ~0.4; clamps at boundaries; monotone decreasing |
| `computePoliticalAssessment` | 6 | Returns correct faction; exhaustion_pressure derived from war_exhaustion; patron_confidence defaults to 0.5 when missing; has_international_pressure true when dimension > 0.5; situation_score in [0,1]; RBiH war_crimes_tolerance hard floor enforced |
| Historian correction guards | 2 | HRHB tolerance ≥ 0.55 at scenario start; RS patron_confidence weight is 0.20 |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2520/2520 (176 files)

---

## Key Finding

The Phase 1 foundation is deliberately narrow: pure types and pure functions, no behavioral change, no state wiring. This is correct sequencing. The Historian corrections on `war_crimes_tolerance` values are load-bearing for downstream phases — any option-scoring system that uses these weights without the corrected values would systematically misrepresent the RS and HRHB leadership's documented decision calculus. The ICTY-sourced hard floor for RBiH (0.10, non-negotiable) is the most important single value in the file: it prevents the political bot from ever producing a plausible "RBiH leadership directed ethnic cleansing" outcome, which would be both historically false and canonically unacceptable.

---

## Deferred to Later Phases

| Item | Target |
|---|---|
| GameState wiring (`political_leaders` field, `PoliticalLeaderState` type) | Phase 2 |
| `PoliticalEventDecisionEngine` + `scorePoliticalOption` + `pickPoliticalResponse` | Phase 2 |
| Patron phone call event text (Milosevic/Zagreb pressure calls) | Phase 3 |
| ICTY-sourced dialogue for key decision events | Phase 3 |
| Event trigger integration in turn pipeline | Phase 4 |
| Post-1993 patron confidence decay (RS: Milosevic divergence) | Phase 5+ |
| UI surface for political decision events | v0.9+ |

---

## Recommended Next Phase

**v0.8.2 Phase 2 — Political Event Decision Engine:** Implement `PoliticalEventDecisionEngine` in `src/sim/political/political_event_decision.ts`. Core deliverables: `scorePoliticalOption(option, assessment, personality)` and `pickPoliticalResponse(event, candidates, assessment, personality)`. The picker must require `PoliticalAssessment` as an explicit parameter (Phase 2 design contract above). Dispatch replaces `pickBotResponseV1` for `strategic_weighted` and `capital_based` response logic types. Wire `political_leaders: Record<FactionId, PoliticalLeaderState>` into GameState. Gate: Phase 1 types available on `main` (now closed).

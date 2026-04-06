# v0.8.3 Phase 1 — Order Interpretation Engine (Stance)

**Date:** 2026-04-06
**Type:** Feature
**Phase in series:** 1 of N (v0.8.3 not yet scoped to N phases)
**Status:** ACCEPTED
**Baseline:** 2684/2684 vitest, tsc clean (Phase 7 / v0.8.2 close)
**Verification:** tsc clean, 2696/2696 vitest (187 files), 12 new tests

---

## Purpose

v0.8.3 Phase 1 lays the deterministic engine foundation for order interpretation — the layer between player intent and military execution that v0.8.3 owns. Phase 1 scope: stance interpretation only.

IPC wiring (Phase 2), pipeline decay step (Phase 3), and UI (Phase 4) are explicitly deferred.

Key context: the existing `warlord_friction.ts` fires stochastic rolls but its effects (`ignored_stance`, `unauthorized_op`) are never applied downstream — this is known design debt, documented but not fixed in Phase 1. The new engine replaces stochastic roll-per-turn with deterministic score-per-order: the same officer receiving the same order always produces the same result. The `reliabilityModifier` parameter slot (passes `0.0` in Phase 1) is the warlord foundations seam that Phase 3 will populate from `political_reliability`.

---

## Deliverables

### 1. Type Additions (`officer_types.ts`)

**File:** `src/state/officer_types.ts`

| Addition | Detail |
|---|---|
| `OfficerEventType` extended | +5 values: `order_pushback`, `order_modified`, `order_refused`, `order_exceeded`, `officer_relieved` (2 were pre-existing stubs; all 5 now formally defined with JSDoc) |
| `OrderSnapshot` interface | NEW. Captures a before/after snapshot of any order for player notification: `order_type` (`'stance_change' \| 'operation_launch' \| 'operation_halt' \| 'brigade_reassign'`), `corps_id`, optional `stance`, `operation_name`, `objectives[]`, `delay_turns` |
| `PendingOfficerEvent` extended | +5 optional fields: `original_order?: OrderSnapshot`, `interpreted_order?: OrderSnapshot`, `reason?: string`, `overridable?: boolean`, `override_action?: string` |
| `NamedOfficerState` extended | +3 optional fields: `override_count?: number`, `last_override_turn?: number`, `cowed_until_turn?: number` |

All additions are optional — fully backward compatible with all existing officer state in save files and tests.

---

### 2. State Addition (`game_state.ts`)

**File:** `src/state/game_state.ts`

`player_ordered_stance?: string | null` added to `CorpsCommandState`. This field records the last stance the player explicitly ordered for a corps, independent of the effective stance the corps commander executed. Phase 2 IPC wiring will set this field when the player issues a stance order; the interpretation engine reads it when evaluating overrides.

---

### 3. Order Interpretation Engine (`order_interpretation.ts`)

**File:** `src/sim/combat/order_interpretation.ts` (NEW — 588 lines)

Deterministic compliance score engine. No `Math.random()`, no `Date.now()`. All behavior is pure functions of officer traits and order parameters.

**Stance rank mapping:**

| Stance | Rank |
|---|---|
| `defensive` | 0 |
| `reorganize` | 0.5 |
| `balanced` | 1 |
| `offensive` | 2 |

**Preferred stance derivation:**
- `aggressiveness >= 4` → `'offensive'`
- `aggressiveness === 3` → `'balanced'`
- `aggressiveness <= 2` → `'defensive'`

**Compliance score formula:**
```
gap = abs(orderedRank - preferredRank)
if gap === 0: score = 1.0  (always comply with an aligned order)
baseCompliance = 0.45 + competence × 0.10   (comp=1 → 0.55; comp=5 → 0.95)
gapPenalty = gap × 0.25
score = clamp(0.0, 1.0, baseCompliance − gapPenalty + reliabilityModifier)
```

The `reliabilityModifier` parameter slot accepts `0.0` in Phase 1. Phase 3 will populate it from `political_reliability` as part of the warlord foundations pass.

**Compliance thresholds:**

| Score range | Result | Behavior |
|---|---|---|
| score ≥ 0.80 | `full` | Executes ordered stance without comment |
| 0.50 ≤ score < 0.80 | `modified` | Executes ordered stance; officer grumbles (event emitted) |
| 0.25 ≤ score < 0.50 | `partial` | Shifts one step toward preferred stance; event emitted |
| score < 0.25 | `refused` | Reverts to preferred stance; event emitted |

**Cowed mechanic:** If the player overrides an officer's interpretation twice within 8 turns (`COWED_OVERRIDE_WINDOW`), the officer becomes cowed for 8 turns (`COWED_DURATION`). While cowed, `computeInterpretation` returns `null` — the officer fast-paths to full compliance without scoring. Override count resets to 0 on cowing.

**Acting commander fast-path:** An officer with `acting_commander: true` always fast-paths to full compliance. No scoring, no events. Acting commanders have no standing to object.

**Patron directive ceiling check:** If `war_timeline.patron_directives` contains an active directive for the officer's faction with a `stance_ceiling`, the effective stance is capped at the ceiling rank after scoring. This prevents patron-restrained factions from executing above their sanctioned posture even when a high-competence commander would comply.

**Functions exported:**

| Function | Purpose |
|---|---|
| `interpretStanceOrder(state, corpsId, orderedStance)` | Main entry point. Scores compliance, determines effective stance, emits `PendingOfficerEvent` on non-full compliance, mutates `state.military.pending_officer_events`. Returns `InterpretationResult`. |
| `previewInterpretation(state, corpsId, orderedStance)` | Read-only variant. Calls `computeInterpretation` but does NOT push any event to state. Safe for UI preview before player commits. Returns `InterpretationPreview`. |
| `overrideInterpretation(state, corpsId, eventId)` | Increments officer `override_count`, sets `last_override_turn`, checks cowed condition, marks event acknowledged. Restoring the original order to `CorpsCommandState` is an IPC concern deferred to Phase 2. |
| `relieveOfficer(state, officerId, corpsId)` | Retires officer, finds best reserve replacement (home_corps priority → tier priority → competence → lexicographic), sets `acting_commander: true` on replacement, emits `officer_relieved` event. Returns `ReliefResult` with `morale_hit` for caller to apply. |

**Constants defined (Phase 2/3 seams, defined here to document eventual bounds):**

- `CAUTIOUS_EXTRA_PREP_TURNS` — per-aggressiveness extra prep turns for cautious officers (Phase 2)
- `MAX_BONUS_OBJECTIVES = 2` — max bonus objectives aggressive officers can add (Phase 2)
- `AGGRESSIVE_HALT_DELAY = 2` — turns of delayed halt for aggressive officers (Phase 2)
- `HALT_DELAY_MOMENTUM_THRESHOLD = 2` — momentum threshold to trigger halt delay (Phase 2)

---

### 4. Dudakovic Data Fix (`apr1992_officers.json`)

**File:** `data/scenarios/officers/apr1992_officers.json`

Atif Dudakovic (`rbih_5th_corps_commander`): `aggressiveness` corrected **5 → 4**.

**Source:** Historian verification 2026-04-06. Dudakovic's maximum-aggression rating was unwarranted. The Bihac encirclement was structural isolation — the 5th Corps was surrounded in a geographic pocket and its operational posture was constrained by supply lines and defensive perimeter, not driven by personal offensive aggression. Aggressiveness 4 (`offensive` preferred stance) correctly models an attack-willing commander operating under structural constraints, rather than a maximum-aggression outlier.

With this fix, Dudakovic has `preferred_stance = 'offensive'` (aggressiveness 4 → threshold ≥4 → offensive) and will still interpret offensive orders as full compliance. His compliance score on defensive orders falls to `baseCompliance = 0.85 − 0.50 = 0.35` (partial, not refusal), correctly modelling a commander who can be ordered to defend but will push back.

---

### 5. Warlord Friction Comment Fix (`warlord_friction.ts`)

**File:** `src/sim/combat/warlord_friction.ts`

Comment corrected: `"Cerić"` → `"Čelo (Ramiz Dedić)"`. The previous comment attributed the warlord friction archetype to the wrong figure. Ramiz Delalić "Čelo" is the historically documented ARBiH warlord figure in the Sarajevo area. The comment is documentation-only; no logic changed.

---

### 6. Tests (`order_interpretation.test.ts`)

**File:** `tests/sim/combat/order_interpretation.test.ts` (NEW — 383 lines, 12 tests)

**Group 1 — Compliance categories (4 tests):**
- Test 1: Aligned order (agg=4, ordered=offensive → gap=0 → score=1.0) → full compliance, no event emitted
- Test 2: Mild mismatch, high competence (comp=4, agg=4, ordered=defensive, gap=2 → score=0.35 → partial) → effective=reorganize, `order_pushback` event
- Test 3: Severe mismatch, low competence (comp=2, agg=1, ordered=offensive, gap=2 → score=0.15 → refused) → effective=defensive, `order_refused` event
- Test 4: Moderate mismatch (comp=3, agg=3, ordered=offensive, gap=1 → score=0.50 → modified) → effective=offensive (officer grumbles but executes), `order_modified` event

**Group 2 — Special cases (4 tests):**
- Test 5: Acting commander always complies — severe mismatch suppressed by `acting_commander: true`
- Test 6: Cowed officer always complies — `cowed_until_turn=10, turn=5` → full compliance, no event
- Test 7: No assigned commander → full compliance with ordered stance, no event
- Test 8: Event fields verified — `event_id`, `type`, `original_order.stance`, `interpreted_order.stance`, `reason`, `overridable`, `override_action`, `acknowledged`, `faction`, `officer_id`, and presence in `state.military.pending_officer_events`

**Group 3 — Override and cowed mechanic (2 tests):**
- Test 9: `overrideInterpretation` increments `override_count` to 1, sets `last_override_turn`, marks event acknowledged
- Test 10: Cowed mechanic — second override within window (`override_count=1, last_override_turn=4, current=6, window=8`) → `cowed_until_turn=14`, `override_count=0`

**Group 4 — Preview and determinism (2 tests):**
- Test 11: `previewInterpretation` matches `interpretStanceOrder` compliance and effective_stance, and emits zero events on the preview state
- Test 12: Determinism — identical inputs on two separate state instances produce identical compliance, effective_stance, reason, and each state contains exactly one event

---

## Phase 1 Debt Register

| Item | Description | Recommended Lane |
|---|---|---|
| IPC wiring | `overrideInterpretation` handles officer state but does not restore `original_order.stance` to `CorpsCommandState`. `relieve-officer` IPC handler not wired. `preview-order-interpretation` IPC handler not wired. `stage-corps-stance-order` does not call `interpretStanceOrder`. | Phase 2 |
| `halt_delay_turns_remaining` field | State field for aggressive officer halt delay not yet added to `CorpsCommandState`. | Phase 2 |
| `interpretOperationLaunch` | Cautious officers: extra preparation turns. Aggressive officers: bonus objectives added. Not yet implemented. | Phase 2 |
| `interpretOperationHalt` | Aggressive officers with momentum: halt delayed by `AGGRESSIVE_HALT_DELAY` turns. Not yet implemented. | Phase 2 |
| Decay pipeline step | No `decay-officer-interpretation-state` step in `war_phases.ts` to tick down `cowed_until_turn`, expire stale events, etc. | Phase 3 |
| `reliabilityModifier` population | `reliabilityModifier=0.0` is hardcoded in `interpretStanceOrder`. Phase 3 will read from `officer.political_reliability` to translate warlord friction signals into the deterministic scoring path. | Phase 3 |
| UI | `OrderInterpretationPanel` (event notification), OOB tooltip (compliance preview), personality icons in corps panel — all deferred. | Phase 4 |
| Warlord friction dead effects | `warlord_friction.ts` fires stochastic rolls; `ignored_stance` and `unauthorized_op` effects are never applied downstream. Pre-existing design debt. Tracked but not fixed in Phase 1. The Phase 3 `reliabilityModifier` pass will eventually supersede the stochastic path. | Phase 3+ |
| `relieveOfficer()` tests | No integration tests for the relieve officer pathway — Phase 2 will add them when the IPC handler wires it. | Phase 2 |

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. All scoring is pure arithmetic over officer traits. Tie-breaks are lexicographic on stance names. |
| GameState as single source of truth | PASS | `interpretStanceOrder` reads from `state.military.named_officers`, `state.military.named_officer_data`, `state.meta.turn`. Writes only to `state.military.pending_officer_events`. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only. `data.faction` typed as `FactionId`. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant. |
| Backward compatibility | PASS | All type additions are optional fields. All new `NamedOfficerState` fields are `undefined` by default. Existing save files and scenarios load without modification. |
| Read-only preview | PASS | `previewInterpretation` calls `computeInterpretation` (pure) and does not push any event to state. Verified by Test 11. |
| Officers data fix sourced | PASS | Dudakovic aggressiveness correction attributed to Historian verification 2026-04-06 with rationale. |

**Status: GO.** All checks pass. No blockers.

---

## Files Changed

| File | Change |
|---|---|
| `src/state/officer_types.ts` | +5 `OfficerEventType` values, `OrderSnapshot` interface (NEW), +5 optional `PendingOfficerEvent` fields, +3 optional `NamedOfficerState` fields |
| `src/state/game_state.ts` | `player_ordered_stance?: string \| null` added to `CorpsCommandState` |
| `src/sim/combat/order_interpretation.ts` | NEW — deterministic stance interpretation engine (588 lines) |
| `data/scenarios/officers/apr1992_officers.json` | Dudakovic `aggressiveness` 5 → 4 (Historian-verified) |
| `src/sim/combat/warlord_friction.ts` | Comment fix: `"Cerić"` → `"Čelo (Ramiz Dedić)"` |
| `tests/sim/combat/order_interpretation.test.ts` | NEW — 12 unit tests (383 lines) |

---

## Tests

12 new tests across 1 file:

| File | Count | Coverage |
|---|---|---|
| `tests/sim/combat/order_interpretation.test.ts` | 12 | Group 1: compliance categories (full/partial/refused/modified including score arithmetic). Group 2: special cases (acting commander, cowed officer, no commander, full event field verification). Group 3: override count increment + cowed mechanic trigger. Group 4: preview read-only contract + determinism (identical inputs → identical outputs across independent state instances). |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2696/2696 (187 files, 12 new tests pass)
- `npm run desktop:map:build`: clean (✓ built in 8.05s; chunk size warning is pre-existing)

---

## Recommended Phase 2 Lane

**IPC wiring.** `stage-corps-stance-order` IPC handler calls `interpretStanceOrder`, stores result, applies `effective_stance` to `CorpsCommandState`. New handlers: `override-officer-interpretation` (calls `overrideInterpretation`, restores `original_order.stance`), `relieve-officer` (calls `relieveOfficer`, applies morale penalty to formation), `preview-order-interpretation` (calls `previewInterpretation`, returns `InterpretationPreview` without state mutation).

Add `interpretOperationLaunch` (cautious officer prep extension, aggressive officer bonus objectives) and `halt_delay_turns_remaining` field to `CorpsCommandState`.

Add integration tests for `relieveOfficer` end-to-end when IPC wires it.
